import type { ChapterSegment, ManuscriptCategory } from '../types';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(input: number | string): string {
  const str = typeof input === 'number' ? input.toLocaleString('en-US') : String(input);
  return str.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

export function formatBengaliDate(date: Date | null | undefined): string {
  if (!date) return 'এখনই';
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return toBengaliDigits(date.toLocaleDateString());
  }
}

export function formatBengaliDateTime(date: Date | null | undefined): string {
  if (!date) return 'এখনই';
  try {
    return new Intl.DateTimeFormat('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return toBengaliDigits(date.toLocaleString());
  }
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

const CHAPTER_HEADING_REGEX = /^(?:#{1,3}\s+|(?:অধ্যায়|অধ্যায়|পর্ব|পরিচ্ছেদ|খণ্ড)\s*[০-৯0-9]*[:।\-—]?\s*).+/;

export function parseChapters(text: string): ChapterSegment[] {
  if (!text) return [];
  const lines = text.split('\n');
  const markers: { title: string; offset: number }[] = [];

  let offset = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= 120 && CHAPTER_HEADING_REGEX.test(trimmed)) {
      markers.push({
        title: trimmed.replace(/^#+\s*/, ''),
        offset,
      });
    }
    offset += line.length + 1;
  }

  if (markers.length === 0) {
    return [
      {
        id: 'chap_0',
        index: 0,
        title: 'সম্পূর্ণ পান্ডুলিপি',
        startOffset: 0,
        endOffset: text.length,
        text,
        wordCount: countWords(text),
      },
    ];
  }

  const segments: ChapterSegment[] = [];

  // If there is prologue text before first chapter marker
  if (markers[0].offset > 0) {
    const introText = text.slice(0, markers[0].offset);
    if (introText.trim().length > 0) {
      segments.push({
        id: 'chap_intro',
        index: 0,
        title: 'সূচনা অংশ',
        startOffset: 0,
        endOffset: markers[0].offset,
        text: introText,
        wordCount: countWords(introText),
      });
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].offset;
    const end = i + 1 < markers.length ? markers[i + 1].offset : text.length;
    const slice = text.slice(start, end);
    segments.push({
      id: `chap_${i + 1}`,
      index: segments.length,
      title: markers[i].title,
      startOffset: start,
      endOffset: end,
      text: slice,
      wordCount: countWords(slice),
    });
  }

  return segments;
}

export interface DiffToken {
  type: 'equal' | 'removed' | 'added';
  value: string;
}

// Word/whitespace-preserving LCS diff for clean Bengali Original vs Corrected comparison
export function computeWordDiff(original: string, corrected: string): DiffToken[] {
  if (original === corrected) {
    return original ? [{ type: 'equal', value: original }] : [];
  }

  const a = original.split(/(\s+)/);
  const b = corrected.split(/(\s+)/);

  // Guard for very large texts: fall back to line-level diff to keep UI instant
  if (a.length * b.length > 250000) {
    const aLines = original.split('\n');
    const bLines = corrected.split('\n');
    const maxLen = Math.max(aLines.length, bLines.length);
    const tokens: DiffToken[] = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = aLines[i];
      const l2 = bLines[i];
      if (l1 === l2 && l1 !== undefined) {
        tokens.push({ type: 'equal', value: l1 + (i < maxLen - 1 ? '\n' : '') });
      } else {
        if (l1 !== undefined) {
          tokens.push({ type: 'removed', value: l1 + '\n' });
        }
        if (l2 !== undefined) {
          tokens.push({ type: 'added', value: l2 + (i < maxLen - 1 ? '\n' : '') });
        }
      }
    }
    return tokens;
  }

  const m = a.length;
  const n = b.length;
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = 0;
  let j = 0;

  const pushToken = (type: DiffToken['type'], value: string) => {
    if (!value) return;
    const prev = result[result.length - 1];
    if (prev && prev.type === type) {
      prev.value += value;
    } else {
      result.push({ type, value });
    }
  };

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      pushToken('equal', a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushToken('removed', a[i]);
      i++;
    } else {
      pushToken('added', b[j]);
      j++;
    }
  }

  while (i < m) {
    pushToken('removed', a[i++]);
  }
  while (j < n) {
    pushToken('added', b[j++]);
  }

  return result;
}

export interface SampleManuscript {
  title: string;
  category: ManuscriptCategory;
  content: string;
}

export const SAMPLE_MANUSCRIPTS: SampleManuscript[] = [
  {
    title: 'বর্ষার সন্ধ্যায় বারান্দা',
    category: 'গল্প',
    content: `অধ্যায় ১: মেঘলা দুপুর

বিকালের আলো তখনো পুরপুরি নিভে যায়নি। জানালার কাঁচে ফোঁটা ফোঁটা বৃস্টি জমে শহরের সব আলোকে ঝাপসা করে দিচ্ছিল। নীলিমা চায়ের কাপটা টেবিলের ওপর রেখে অনেকক্ষন চুপ করে বসে রইল।

এই বাড়িটাতে ওরা এসেছে প্রায় ছয় বছর হল, তবুও এখনো বর্ষার দিনে পুরনো বারান্দার গন্ধটা ওকে অদ্ভুতভাবে ফিরিয়ে নিয়ে যায় সেই মফস্বলের দুপুরে। মা বলতেন, "মানুষের মন বড়ই অদ্ভুত রে, যা ছেড়ে আসে তা-ই বারবার খুঁজে ফিরে।"

অধ্যায় ২: পুরোনো চিঠি

আলমারির ওপরের তাক থেকে হলদে হয়ে যাওয়া একটা খাম নামিয়ে আনল সে। ভেতরে মাত্র দুটো পাতা, কিন্তু অক্ষরগুলো আজও কি সজীব! সে ধীরে ধীরে পড়তে শুরু করল, বাইরে তখন ঝমঝমিয়ে বর্ষা নেমেছে।`,
  },
  {
    title: 'নদী ও নিঃশব্দতা',
    category: 'কবিতা',
    content: `সন্ধ্যার নদীতে ভাসে একলা প্রদীপের ছায়া,
জলের কিনারে জমে অচেনা মায়া।
তুমি কি শোননি কভু বাতাসের গুঞ্জরন,
নিঃস্তব্ধ আকাশে জাগে বিষন্ন মন।

আঁধারের বুক চিরে ভেসে আসে দূর পাল,
সময়ের স্রোতে হারায় যত চেনা কাল।
তবুও হৃদয় কোণে জ্বলে থাকে ক্ষীণ আলো,
বেঁচে থাকার গল্পটা আজও লাগে বড় ভালো।`,
  },
  {
    title: 'আধুনিক বাংলা সাহিত্যে মুদ্রণ ও সম্পাদনা',
    category: 'প্রবন্ধ',
    content: `বাংলা সাহিত্যের দীর্ঘ ইতিহাসে পান্ডুলিপি সম্পাদনা ও প্রুফরিডিংয়ের ভূমিকা অপরিসীম। একটি উৎকৃষ্ট রচনাও শুধুমাত্র বানান ভুল কিংবা অযত্নশীল মুদ্রনপ্রমাদের কারণে পাঠকের কাছে তার আবেদন হারাতে পারে।

তবে সাহিত্য সম্পাদনার কাজটি কেবল যান্ত্রিক ব্যাকরণ প্রয়োগ নয়। একজন দক্ষ সম্পাদক জানেন যে কবিতার ছন্দ, আঞ্চলিক সংলাপ এবং লেখকের নিজস্ব বাচনভঙ্গি অক্ষুন্ন রেখেই ভাষার শুদ্ধতা নিশ্চিত করতে হয়।`,
  },
];
