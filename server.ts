import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const MAX_TEXT_LENGTH = 100000;

// CORS headers so native Android Flutter client (com.sobdosuddhi.app) can access backend endpoints securely
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

// File upload validator (DOCX, DOC, PDF, TXT only, max 15 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ext === '.docx' || ext === '.doc' || ext === '.pdf' || ext === '.txt';
    if (!allowedExt) {
      cb(new Error('শুধুমাত্র DOCX, DOC, PDF অথবা TXT ফাইল আপলোড করা যাবে।'));
      return;
    }
    cb(null, true);
  },
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Best-effort Bengali/Unicode text extractor for legacy binary .doc files
 * (Word 97-2003 stores Unicode Bengali as UTF-16LE sequences inside WordDocument stream).
 */
function extractTextFromLegacyDoc(buffer: Buffer): string {
  // First check if it's actually RTF or plain text saved with .doc extension
  const headerStr = buffer.subarray(0, 16).toString('utf8');
  if (headerStr.startsWith('{\\rtf')) {
    return buffer
      .toString('utf8')
      .replace(/\\[a-z]+\d*\s?/gi, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract UTF-16LE runs containing Bengali (U+0980..U+09FF) and common punctuation/ASCII
  const utf16 = buffer.toString('utf16le');
  const runs = utf16.match(/[\u0980-\u09FF\u200C\u200D।॥০-৯a-zA-Z0-9.,!?;:'"()\-\s]{8,}/g);
  if (runs && runs.length > 0) {
    const bengaliRuns = runs.filter((r) => /[\u0980-\u09FF]/.test(r));
    const chosen = bengaliRuns.length > 0 ? bengaliRuns : runs;
    return chosen
      .map((s) => s.replace(/\r/g, '\n').trim())
      .filter((s) => s.length >= 2)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Fallback UTF-8 scan
  const utf8Text = buffer
    .toString('utf8')
    .replace(/[^\u0980-\u09FF\u200C\u200D।॥০-৯a-zA-Z0-9.,!?;:'"()\-\n ]/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
  return utf8Text;
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Sobdosuddhi 1.0', version: '1.0.0' });
});

// Secure DOCX, DOC, PDF & TXT file parser endpoint
app.post('/api/manuscripts/parse-file', (req: Request, res: Response) => {
  upload.single('file')(req, res, async (uploadErr: unknown) => {
    if (uploadErr) {
      const msg =
        uploadErr instanceof Error
          ? uploadErr.message
          : 'ফাইল আপলোড করতে সমস্যা হয়েছে।';
      res.status(400).json({ error: msg });
      return;
    }

    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      res.status(400).json({ error: 'কোনো বৈধ ফাইল পাওয়া যায়নি।' });
      return;
    }

    let originalName = file.originalname || 'পান্ডুলিপি.txt';
    try {
      const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
      if (!decoded.includes('\uFFFD')) {
        originalName = decoded;
      }
    } catch {
      // keep originalName
    }

    const ext = path.extname(originalName).toLowerCase();
    const baseTitle = path.basename(originalName, ext).trim() || 'নতুন পান্ডুলিপি';

    try {
      let extractedText = '';

      if (ext === '.docx') {
        const isZip =
          file.buffer.length >= 4 &&
          file.buffer[0] === 0x50 &&
          file.buffer[1] === 0x4b &&
          file.buffer[2] === 0x03 &&
          file.buffer[3] === 0x04;
        if (!isZip) {
          res.status(400).json({ error: 'আপলোডকৃত .docx ফাইলটি বৈধ নয় বা ক্ষতিগ্রস্ত।' });
          return;
        }
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = (result.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      } else if (ext === '.pdf') {
        const isPdf =
          file.buffer.length >= 4 &&
          file.buffer[0] === 0x25 && // %
          file.buffer[1] === 0x50 && // P
          file.buffer[2] === 0x44 && // D
          file.buffer[3] === 0x46;   // F
        if (!isPdf) {
          res.status(400).json({ error: 'আপলোডকৃত .pdf ফাইলটি বৈধ নয় বা ক্ষতিগ্রস্ত।' });
          return;
        }
        const parser = new PDFParse({ data: file.buffer });
        try {
          const pdfResult = await parser.getText();
          extractedText = (pdfResult.text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        } finally {
          await parser.destroy().catch(() => {});
        }
        if (!extractedText.trim()) {
          res.status(422).json({
            error:
              'এই PDF ফাইলে পাঠযোগ্য ইউনিকোড বাংলা টেক্সট পাওয়া যায়নি (সম্ভবত স্ক্যান করা ছবি)। অনুগ্রহ করে ইউনিকোড PDF বা DOCX ফাইল দিন।',
          });
          return;
        }
      } else if (ext === '.doc') {
        // Check if renamed DOCX zip
        const isZip =
          file.buffer.length >= 4 &&
          file.buffer[0] === 0x50 &&
          file.buffer[1] === 0x4b &&
          file.buffer[2] === 0x03 &&
          file.buffer[3] === 0x04;
        if (isZip) {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = (result.value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        } else {
          extractedText = extractTextFromLegacyDoc(file.buffer);
          if (!extractedText.trim()) {
            res.status(422).json({
              error:
                'পুরোনো .doc ফাইলটি থেকে বাংলা লেখা উদ্ধার করা যায়নি। অনুগ্রহ করে ফাইলটি .docx অথবা .txt ফরম্যাটে সংরক্ষণ করে আপলোড করুন।',
            });
            return;
          }
        }
      } else if (ext === '.txt') {
        extractedText = file.buffer
          .toString('utf8')
          .replace(/^\uFEFF/, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');
      } else {
        res.status(400).json({ error: 'শুধুমাত্র DOCX, DOC, PDF এবং TXT ফাইল সমর্থিত।' });
        return;
      }

      const trimmedText = extractedText.trimEnd();
      let truncated = false;
      let safeText = trimmedText;
      if (safeText.length > MAX_TEXT_LENGTH) {
        safeText = safeText.slice(0, MAX_TEXT_LENGTH);
        truncated = true;
      }

      res.json({
        title: baseTitle.slice(0, 200),
        fileName: originalName.slice(0, 255),
        fileSize: file.size,
        text: safeText,
        wordCount: countWords(safeText),
        charCount: safeText.length,
        truncated,
      });
    } catch (err) {
      console.error('File parse error:', err);
      res.status(500).json({ error: 'ফাইল থেকে বাংলা পাঠ্য উদ্ধার করতে সমস্যা হয়েছে।' });
    }
  });
});

interface ProofreadRequestBody {
  text?: string;
  category?: string;
  chapterTitle?: string;
  preferences?: {
    spellingStandard?: 'bangla_academy' | 'paschimbanga_academy' | 'rabindrik_sahitya';
    literaryStrictness?: 'conservative' | 'balanced' | 'thorough';
    preservePoeticLicense?: boolean;
    preserveRegionalDialects?: boolean;
  };
}

// AI Bengali Literary Proofreading Endpoint
app.post('/api/proofread', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as ProofreadRequestBody;
    const rawText = typeof body.text === 'string' ? body.text : '';
    const rawCategory = typeof body.category === 'string' ? body.category : 'বাংলা গল্প ও উপন্যাস';
    const isPoetry = rawCategory.includes('কবিতা');
    const displayCategory = isPoetry ? 'বাংলা কবিতা' : 'বাংলা গল্প ও উপন্যাস';
    const chapterTitle = typeof body.chapterTitle === 'string' ? body.chapterTitle : '';
    const prefs = body.preferences || {};

    if (!rawText.trim()) {
      res.status(400).json({ error: 'প্রুফরিডিংয়ের জন্য অন্তত কিছু বাংলা লেখা দিন।' });
      return;
    }

    if (rawText.length > 45000) {
      res.status(400).json({
        error: 'একবারে সর্বাধিক ৪৫,০০০ অক্ষর প্রুফরিড করা যাবে। বড় পান্ডুলিপি অংশে ভাগ করে প্রুফরিড করুন।',
      });
      return;
    }

    const ai = getGeminiClient();

    const spellingMap: Record<string, string> = {
      bangla_academy: 'বাংলা একাডেমি আধুনিক বাংলা বানান অভিধান (ঢাকা)',
      paschimbanga_academy: 'পশ্চিমবঙ্গ বাংলা আকাদেমি বানান বিধি (কলকাতা)',
      rabindrik_sahitya: 'চিরায়ত ও রাবীন্দ্রিক সাহিত্য বানান রীতি',
    };
    const strictnessMap: Record<string, string> = {
      conservative:
        'সংরক্ষণশীল (শুধুমাত্র নিশ্চিত বানান, যুক্তাক্ষর, কার-ফলা, টাইপিং ও স্পষ্ট ব্যাকরণগত ভুল ধরুন)',
      balanced:
        'ভারসাম্যপূর্ণ (বানান-ব্যাকরণের পাশাপাশি প্রয়োজনীয় বিরামচিহ্ন ও পরিমিত শৈলীগত পরামর্শ দিন)',
      thorough:
        'নিবিড় সম্পাদনা (বানান, যুক্তাক্ষর, কার-ফলা, বিরামচিহ্ন, বাক্যগঠন, পুনরাবৃত্তি, অপ্রয়োজনীয় শব্দ ও অসংলগ্ন বাক্য সূক্ষ্মভাবে পরীক্ষা করুন, তবে লেখকের কণ্ঠস্বর বজায় রাখুন)',
    };

    const spellingDesc =
      spellingMap[prefs.spellingStandard || 'bangla_academy'] || spellingMap.bangla_academy;
    const strictnessDesc =
      strictnessMap[prefs.literaryStrictness || 'balanced'] || strictnessMap.balanced;

    const genreInstruction = isPoetry
      ? `বিশেষ নির্দেশনা (বাংলা কবিতা):
- কখনোই কবির মৌলিক কণ্ঠস্বর, কাব্যিক চিত্রকল্প, রূপক, উপমা, ছন্দ, মাত্রা, অন্ত্যমিল, পঙ্‌ক্তি বিরতি (line breaks) কিংবা অভিপ্রেত অর্থ বদলাবেন না।
- কবিতা পুনর্লিখন করবেন না; কেবল নিশ্চিত বানান, যুক্তাক্ষর, কার-ফলা, টাইপিং ভুল বা প্রাসঙ্গিক পরামর্শ বিনয়ের সাথে উপস্থাপন করুন।`
      : `বিশেষ নির্দেশনা (বাংলা গল্প ও উপন্যাস):
- লেখকের নিজস্ব গদ্যশৈলী, বর্ণনাভঙ্গি ও সংলাপের স্বাভাবিকতা বজায় রেখে ব্যাকরণগত ও ভাষাগত উন্নতির পরামর্শ দিন।
- সংলাপে ব্যবহৃত আঞ্চলিক বা কথ্য বাংলাকে অকারণে ভুল হিসেবে ধরবেন না।`;

    const systemInstruction = `আপনি "Sobdosuddhi 1.0"-এর প্রধান বাংলা সাহিত্য সম্পাদক ও নির্ভরযোগ্য প্রুফরিডার। আপনি প্রমিত বাংলা ব্যাকরণ, বানানবিধি, যুক্তাক্ষর, কার ও ফলা, বিরামচিহ্ন, বাক্যগঠন এবং বাংলা সাহিত্যের নান্দনিকতায় পারদর্শী।

বর্তমান লেখার ধরন: ${displayCategory}${chapterTitle ? ` (${chapterTitle})` : ''}
অনুসরণীয় বানানরীতি: ${spellingDesc}
সম্পাদনার মাত্রা: ${strictnessDesc}
কাব্যিক স্বাধীনতা সংরক্ষণ: ${prefs.preservePoeticLicense !== false ? 'সর্বোচ্চ অগ্রাধিকার' : 'মধ্যম'}
আঞ্চলিক ও কথ্য বাংলা সংরক্ষণ: ${prefs.preserveRegionalDialects !== false ? 'সর্বোচ্চ অগ্রাধিকার' : 'সীমিত'}

${genreInstruction}

শনাক্তযোগ্য ত্রুটির শ্রেণি (শুধুমাত্র এই ১০টি নামের একটি ব্যবহার করুন):
- বানান ভুল
- যুক্তাক্ষরের ভুল
- কার ও ফলা ব্যবহারের ভুল
- বিরামচিহ্নের ভুল
- বাক্য গঠনের সমস্যা
- ব্যাকরণগত ভুল
- অপ্রয়োজনীয় শব্দ
- পুনরাবৃত্ত শব্দ
- অসংলগ্ন বাক্য
- টাইপিং ভুল

গুরুত্বের স্তর (severity):
- "definite": নিশ্চিত বানান ভুল, যুক্তাক্ষরের ভুল, কার ও ফলা ব্যবহারের ভুল, টাইপিং ভুল বা স্পষ্ট ব্যাকরণগত ভুল।
- "warning": বিরামচিহ্নের ভুল, বাক্য গঠনের সমস্যা বা অসংলগ্ন বাক্য।
- "style": অপ্রয়োজনীয় শব্দ, পুনরাবৃত্ত শব্দ বা ঐচ্ছিক ভাষাগত পরামর্শ।

গুরুত্বপূর্ণ ফরম্যাট নির্দেশনা:
- প্রতিটি সমস্যার "original" অংশটি মূল পান্ডুলিপিতে যেভাবে আছে ঠিক হুবহু (exact verbatim substring) হতে হবে।
- "suggestion" অংশে শুধুমাত্র সেই "original" অংশের প্রতিস্থাপিত শুদ্ধ রূপ দিন।
- "explanation" অবশ্যই প্রাঞ্জল, সংক্ষিপ্ত ও বিনয়ী বাংলায় লিখুন।
- কোনো ভুল না থাকলে খালি issues অ্যারে রিটার্ন করুন এবং summary-তে প্রশংসাসূচক বাংলা মন্তব্য দিন।`;

    const prompt = `নিচের বাংলা পান্ডুলিপিটি (${displayCategory}) যত্নসহকারে প্রুফরিড করুন এবং প্রতিটি শনাক্তকৃত ত্রুটি বা পরামর্শ নির্ধারিত JSON কাঠামোতে প্রদান করুন।

--- পান্ডুলিপির শুরু ---
${rawText}
--- পান্ডুলিপির শেষ ---`;

    let lastError: unknown = null;
    let rawJsonText = '';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: 'সম্পূর্ণ পান্ডুলিপির ওপর ১-২ বাক্যে গঠনমূলক বাংলা সম্পাদকীয় মন্তব্য।',
                },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: {
                        type: Type.STRING,
                        description: 'মূল পান্ডুলিপি থেকে হুবহু নেওয়া ভুল শব্দ বা সংক্ষিপ্ত অংশ।',
                      },
                      suggestion: {
                        type: Type.STRING,
                        description: 'উক্ত অংশের প্রস্তাবিত শুদ্ধ প্রতিস্থাপন।',
                      },
                      category: {
                        type: Type.STRING,
                        description: 'নির্ধারিত ১০টি বাংলা ত্রুটি শ্রেণির একটি।',
                      },
                      severity: {
                        type: Type.STRING,
                        description: 'definite, warning অথবা style।',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'ত্রুটি ও সংশোধনের কারণ বাংলায় সংক্ষিপ্ত ব্যাখ্যা।',
                      },
                      contextSnippet: {
                        type: Type.STRING,
                        description: 'ত্রুটিটির আশেপাশের সংক্ষিপ্ত বাক্যাংশ।',
                      },
                    },
                    required: ['original', 'suggestion', 'category', 'severity', 'explanation'],
                  },
                },
              },
              required: ['summary', 'issues'],
            },
          },
        });

        rawJsonText = (response.text ?? '').trim();
        if (rawJsonText) break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('429') || msg.includes('503') || msg.includes('500')) {
          await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }

    if (!rawJsonText) {
      const errMsg = lastError instanceof Error ? lastError.message : 'অজানা ত্রুটি';
      console.error('Gemini proofread error:', errMsg);
      if (errMsg.includes('API_KEY') || errMsg.includes('403') || errMsg.includes('400')) {
        res.status(502).json({
          error:
            'এআই পরিষেবার সংযোগে অনুমোদনজনিত ত্রুটি হয়েছে। অনুগ্রহ করে Settings > Secrets প্যানেলে API কী পরীক্ষা করুন।',
        });
        return;
      }
      res.status(502).json({
        error: 'এআই প্রুফরিডিং সম্পন্ন করতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
      });
      return;
    }

    interface RawIssue {
      original?: string;
      suggestion?: string;
      category?: string;
      severity?: string;
      explanation?: string;
      contextSnippet?: string;
    }

    const parsed = JSON.parse(rawJsonText) as {
      summary?: string;
      issues?: RawIssue[];
    };

    const allowedCategories = new Set([
      'বানান ভুল',
      'যুক্তাক্ষরের ভুল',
      'কার ও ফলা ব্যবহারের ভুল',
      'বিরামচিহ্নের ভুল',
      'বাক্য গঠনের সমস্যা',
      'ব্যাকরণগত ভুল',
      'অপ্রয়োজনীয় শব্দ',
      'পুনরাবৃত্ত শব্দ',
      'অসংলগ্ন বাক্য',
      'টাইপিং ভুল',
    ]);

    const normalizedIssues = (Array.isArray(parsed.issues) ? parsed.issues : [])
      .filter(
        (item) =>
          item &&
          typeof item.original === 'string' &&
          item.original.trim().length > 0 &&
          typeof item.suggestion === 'string' &&
          item.original !== item.suggestion &&
          rawText.includes(item.original)
      )
      .slice(0, 180)
      .map((item, idx) => {
        const sev =
          item.severity === 'definite' ||
          item.severity === 'warning' ||
          item.severity === 'style'
            ? item.severity
            : 'warning';
        const cat =
          item.category && allowedCategories.has(item.category)
            ? item.category
            : sev === 'definite'
              ? 'বানান ভুল'
              : sev === 'warning'
                ? 'বিরামচিহ্নের ভুল'
                : 'অসংলগ্ন বাক্য';

        return {
          id: `iss_${Date.now()}_${idx}`,
          original: item.original!.slice(0, 500),
          suggestion: item.suggestion!.slice(0, 500),
          category: cat,
          severity: sev as 'definite' | 'warning' | 'style',
          explanation: (
            item.explanation || 'প্রমিত বাংলা রীতি অনুযায়ী এই সংশোধনটি প্রস্তাব করা হলো।'
          ).slice(0, 600),
          contextSnippet: (item.contextSnippet || item.original || '').slice(0, 240),
          status: 'pending' as const,
        };
      });

    res.json({
      summary:
        parsed.summary ||
        (normalizedIssues.length > 0
          ? `পান্ডুলিপিতে মোট ${normalizedIssues.length}টি পর্যালোচনাযোগ্য অংশ পাওয়া গেছে।`
          : 'পান্ডুলিপিটি চমৎকার ও নির্ভুল রয়েছে; উল্লেখযোগ্য কোনো ত্রুটি পাওয়া যায়নি।'),
      issues: normalizedIssues,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_API_KEY_MISSING') {
      res.status(503).json({
        error: 'সার্ভারে GEMINI_API_KEY কনফিগার করা নেই। Settings > Secrets প্যানেল পরীক্ষা করুন।',
      });
      return;
    }
    console.error('Proofread endpoint failure:', err);
    res.status(500).json({ error: 'প্রুফরিডিং প্রক্রিয়ায় অপ্রত্যাশিত ত্রুটি ঘটেছে।' });
  }
});

// Export Manuscript as Unicode-safe DOCX
app.post('/api/export/docx', async (req: Request, res: Response) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : 'পান্ডুলিপি';
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';

    if (!content.trim()) {
      res.status(400).json({ error: 'এক্সপোর্ট করার মতো কোনো লেখা নেই।' });
      return;
    }

    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const paragraphs: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: title,
            font: 'Noto Serif Bengali',
            size: 36,
            bold: true,
            color: '1F2421',
          }),
        ],
      }),
    ];

    if (category) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: `${category} · Sobdosuddhi 1.0`,
              font: 'Noto Serif Bengali',
              size: 20,
              color: '5A655E',
            }),
          ],
        })
      );
    }

    for (const line of lines) {
      const trimmed = line.trim();
      const isChapterHeading =
        /^(অধ্যায়|অধ্যায়|পর্ব|পরিচ্ছেদ|খণ্ড|#)\s*/.test(trimmed) && trimmed.length <= 120;

      if (trimmed.length === 0) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: '' })],
          })
        );
      } else if (isChapterHeading) {
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 140 },
            children: [
              new TextRun({
                text: trimmed.replace(/^#+\s*/, ''),
                font: 'Noto Serif Bengali',
                size: 28,
                bold: true,
                color: '1E4D3B',
              }),
            ],
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 160, line: 340 },
            children: [
              new TextRun({
                text: line,
                font: 'Noto Serif Bengali',
                size: 24,
                color: '1F2421',
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      creator: 'Sobdosuddhi 1.0',
      title,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeFileName = encodeURIComponent(`${title}.docx`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="manuscript.docx"; filename*=UTF-8''${safeFileName}`
    );
    res.send(buffer);
  } catch (err) {
    console.error('DOCX export error:', err);
    res.status(500).json({ error: 'DOCX ফাইল তৈরি করতে সমস্যা হয়েছে।' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sobdosuddhi 1.0 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
