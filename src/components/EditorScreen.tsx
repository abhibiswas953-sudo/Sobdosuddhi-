import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Upload,
  FileText,
  X,
  Search,
  Replace,
  Copy,
  Share2,
  Download,
  Feather,
  Loader2,
  CheckCircle2,
  Sparkles,
  Save,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  PRIMARY_WRITING_MODES,
  type EditorFontSize,
  type ManuscriptCategory,
  type ManuscriptStatus,
  type ProofreadIssue,
} from '../types';
import { countParagraphs, countWords, toBengaliDigits } from '../lib/bengali';
import { exportToDocx, exportToPdf, exportToTxt, shareManuscript } from '../lib/exportUtils';

interface EditorScreenProps {
  docId: string | null;
  title: string;
  category: ManuscriptCategory;
  content: string;
  originalText: string;
  issues: ProofreadIssue[];
  status: ManuscriptStatus;
  sourceFileName: string;
  fontSize: EditorFontSize;
  autoSaveEnabled: boolean;
  canSyncCloud: boolean;
  openUploadPickerOnMount?: boolean;
  proofreading: boolean;
  onBack: () => void;
  onChangeTitle: (title: string) => void;
  onChangeCategory: (category: ManuscriptCategory) => void;
  onChangeContent: (nextContent: string, pushUndo?: boolean) => void;
  onFileImported: (data: {
    title: string;
    fileName: string;
    fileSize: number;
    text: string;
  }) => void;
  onRemoveFile: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveNow: (silent?: boolean) => Promise<void>;
  onRunProofread: () => Promise<void>;
  onOpenResults: () => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FONT_SIZE_CLASSES: Record<EditorFontSize, string> = {
  sm: 'text-[15px] leading-[1.85]',
  md: 'text-[17px] leading-[1.95]',
  lg: 'text-[19px] leading-[2.05]',
  xl: 'text-[22px] leading-[2.1]',
};

function formatBytesBengali(bytes: number): string {
  if (!bytes || bytes <= 0) return '০ KB';
  if (bytes < 1024) return `${toBengaliDigits(bytes)} B`;
  if (bytes < 1024 * 1024) return `${toBengaliDigits((bytes / 1024).toFixed(1))} KB`;
  return `${toBengaliDigits((bytes / (1024 * 1024)).toFixed(2))} MB`;
}

export function EditorScreen({
  title,
  category,
  content,
  issues,
  status,
  sourceFileName,
  fontSize,
  autoSaveEnabled,
  canSyncCloud,
  openUploadPickerOnMount,
  proofreading,
  onBack,
  onChangeTitle,
  onChangeCategory,
  onChangeContent,
  onFileImported,
  onRemoveFile,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveNow,
  onRunProofread,
  onOpenResults,
  onNotify,
}: EditorScreenProps) {
  const isLocked = status === 'সুরক্ষিত';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // Upload state
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(sourceFileName ? { name: sourceFileName, size: 0 } : null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Export & Action Bottom Sheet
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (sourceFileName) {
      setSelectedFileMeta((prev) =>
        prev && prev.name === sourceFileName ? prev : { name: sourceFileName, size: 0 }
      );
    } else {
      setSelectedFileMeta(null);
    }
  }, [sourceFileName]);

  useEffect(() => {
    if (openUploadPickerOnMount && fileInputRef.current && !isLocked) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [openUploadPickerOnMount, isLocked]);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = content.length;
  const paragraphCount = useMemo(() => countParagraphs(content), [content]);
  const pendingCount = useMemo(
    () => issues.filter((i) => i.status === 'pending').length,
    [issues]
  );

  const findMatchCount = useMemo(() => {
    const q = findText.trim();
    if (!q || !content) return 0;
    let count = 0;
    let idx = 0;
    while ((idx = content.indexOf(q, idx)) !== -1) {
      count++;
      idx += q.length;
    }
    return count;
  }, [content, findText]);

  const handleFileSelect = (file: File) => {
    setUploadError('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['docx', 'doc', 'pdf', 'txt'].includes(ext)) {
      const msg = 'শুধুমাত্র DOCX, DOC, PDF অথবা TXT ফাইল নির্বাচন করুন।';
      setUploadError(msg);
      onNotify(msg, 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      const msg = 'ফাইলের আকার ১৫ MB-এর বেশি হতে পারবে না।';
      setUploadError(msg);
      onNotify(msg, 'error');
      return;
    }

    setSelectedFileMeta({ name: file.name, size: file.size });
    setUploading(true);
    setUploadProgress(5);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(85, Math.round((ev.loaded / ev.total) * 85));
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(100);
      try {
        const data = JSON.parse(xhr.responseText || '{}') as {
          title?: string;
          fileName?: string;
          fileSize?: number;
          text?: string;
          truncated?: boolean;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300) {
          onFileImported({
            title: data.title || file.name.replace(/\.[^.]+$/, ''),
            fileName: data.fileName || file.name,
            fileSize: data.fileSize || file.size,
            text: data.text || '',
          });
          onNotify(
            data.truncated
              ? `"${file.name}" লোড হয়েছে (প্রথম ১,০০,০০০ অক্ষর)।`
              : `"${file.name}" সফলভাবে যুক্ত হয়েছে।`,
            'success'
          );
        } else {
          const errMsg = data.error || 'ফাইল প্রক্রিয়া করতে সমস্যা হয়েছে।';
          setUploadError(errMsg);
          onNotify(errMsg, 'error');
        }
      } catch {
        const errMsg = 'সার্ভারের উত্তর পড়া যায়নি। আবার চেষ্টা করুন।';
        setUploadError(errMsg);
        onNotify(errMsg, 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.onerror = () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      const errMsg = 'ইন্টারনেট সংযোগের অভাবে ফাইল আপলোড ব্যর্থ হয়েছে।';
      setUploadError(errMsg);
      onNotify(errMsg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.onabort = () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setSelectedFileMeta(null);
      onNotify('ফাইল আপলোড বাতিল করা হয়েছে।', 'info');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    xhr.open('POST', '/api/manuscripts/parse-file');
    xhr.send(formData);
  };

  const handleCancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFileMeta(null);
    setUploadError('');
    setUploadProgress(0);
    onRemoveFile();
    onNotify('নির্বাচিত ফাইলটি সরানো হয়েছে।', 'info');
  };

  const handleReplaceOne = () => {
    if (!findText || isLocked) return;
    const idx = content.indexOf(findText);
    if (idx === -1) {
      onNotify('খোঁজা শব্দটি পাওয়া যায়নি।', 'info');
      return;
    }
    const next = content.slice(0, idx) + replaceText + content.slice(idx + findText.length);
    onChangeContent(next, true);
    onNotify('একটি অংশ প্রতিস্থাপন করা হয়েছে।', 'success');
  };

  const handleReplaceAll = () => {
    if (!findText || isLocked) return;
    if (!content.includes(findText)) {
      onNotify('খোঁজা শব্দটি পাওয়া যায়নি।', 'info');
      return;
    }
    const count = findMatchCount;
    const next = content.split(findText).join(replaceText);
    onChangeContent(next, true);
    onNotify(`${toBengaliDigits(count)}টি অংশ প্রতিস্থাপন করা হয়েছে।`, 'success');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onNotify('সম্পূর্ণ লেখা ক্লিপবোর্ডে কপি হয়েছে।', 'success');
    } catch {
      onNotify('কপি করা যায়নি।', 'error');
    }
  };

  const handleShare = async () => {
    if (!content.trim()) {
      onNotify('শেয়ার করার মতো কোনো লেখা নেই।', 'info');
      return;
    }
    try {
      const outcome = await shareManuscript(title, content);
      onNotify(
        outcome === 'shared' ? 'পান্ডুলিপি শেয়ার করা হয়েছে।' : 'লেখা ক্লিপবোর্ডে কপি হয়েছে।',
        'success'
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onNotify('শেয়ার করতে সমস্যা হয়েছে।', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Native Android Material 3 Top App Bar */}
      <header className="shrink-0 h-14 px-2 sm:px-4 pt-safe bg-[#F6F5F0]/95 dark:bg-[#0F1311]/95 backdrop-blur-md border-b border-[#E7E4DC] dark:border-[#202723] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="পিছনে যান"
            className="w-11 h-11 rounded-full flex items-center justify-center text-[#1C211E] dark:text-[#ECEBE6] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={title}
            disabled={isLocked}
            onChange={(e) => onChangeTitle(e.target.value.slice(0, BLUEPRINT_LIMITS.TITLE_MAX))}
            placeholder="পান্ডুলিপির শিরোনাম..."
            aria-label="পান্ডুলিপির শিরোনাম"
            className="font-literary text-base sm:text-lg font-bold bg-transparent text-[#1C211E] dark:text-[#ECEBE6] focus:outline-none min-w-0 flex-1 truncate select-text"
          />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={!canUndo || isLocked}
            onClick={onUndo}
            aria-label="পূর্বাবস্থা (Undo)"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canRedo || isLocked}
            onClick={onRedo}
            aria-label="পুনরায় (Redo)"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] disabled:opacity-30"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowFindReplace((s) => !s)}
            aria-label="খুঁজুন ও প্রতিস্থাপন"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              showFindReplace
                ? 'bg-[#E3EFE9] dark:bg-[#1E332A] text-[#1E4D3B] dark:text-[#7CD0AE]'
                : 'text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowExportSheet(true)}
            aria-label="এক্সপোর্ট ও শেয়ার"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521]"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Collapsible Find & Replace Bar */}
      {showFindReplace && (
        <div className="shrink-0 bg-white dark:bg-[#171C19] border-b border-[#E6E3DA] dark:border-[#262E29] px-4 py-3 animate-m3-screen select-text">
          <div className="max-w-3xl mx-auto space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#757E78] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="খুঁজুন..."
                  className="w-full min-h-[42px] pl-9 pr-14 rounded-xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] text-xs focus:outline-none focus:border-[#1E4D3B]"
                />
                {findText && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#5A635D] dark:text-[#9BA69F] tabular-nums">
                    {toBengaliDigits(findMatchCount)}টি
                  </span>
                )}
              </div>

              <div className="relative">
                <Replace className="w-3.5 h-3.5 text-[#757E78] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="প্রতিস্থাপন করুন..."
                  className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] text-xs focus:outline-none focus:border-[#1E4D3B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!findText || isLocked}
                  onClick={handleReplaceOne}
                  className="min-h-[36px] px-3.5 rounded-xl bg-[#E3EFE9] dark:bg-[#1E332A] text-[#1E4D3B] dark:text-[#7CD0AE] text-xs font-semibold disabled:opacity-40"
                >
                  একটি বদলান
                </button>
                <button
                  type="button"
                  disabled={!findText || isLocked}
                  onClick={handleReplaceAll}
                  className="min-h-[36px] px-3.5 rounded-xl bg-[#1E4D3B] text-white text-xs font-semibold disabled:opacity-40"
                >
                  সব বদলান
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                className="text-xs text-[#6B746E] px-2 py-1"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Scrollable Editor Canvas */}
      <div className="flex-1 app-scroll px-4 sm:px-6 py-4 pb-36 lg:pb-24">
        <div className="max-w-3xl mx-auto space-y-4 animate-m3-screen">
          {/* Two Primary Writing Category Selector + File Upload Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#ECEAE2] dark:bg-[#1B211E]">
              {PRIMARY_WRITING_MODES.map((mode) => {
                const active =
                  (mode.category === 'কবিতা' && category === 'কবিতা') ||
                  (mode.category !== 'কবিতা' && category !== 'কবিতা');
                return (
                  <button
                    key={mode.label}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onChangeCategory(mode.category)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#2A342F] text-[#1E4D3B] dark:text-[#7CD0AE] shadow-2xs'
                        : 'text-[#5A635D] dark:text-[#9BA69F]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <button
                type="button"
                disabled={uploading || isLocked}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-[#171C19] border border-[#E2DFD6] dark:border-[#2A332D] text-xs font-semibold text-[#1C211E] dark:text-[#ECEBE6] inline-flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-[#1E4D3B] dark:text-[#7CD0AE]" />
                <span>DOCX / PDF / TXT</span>
              </button>

              {canSyncCloud && !isLocked && (
                <button
                  type="button"
                  disabled={savingManual}
                  onClick={async () => {
                    setSavingManual(true);
                    try {
                      await onSaveNow(false);
                    } finally {
                      setSavingManual(false);
                    }
                  }}
                  aria-label="সংরক্ষণ করুন"
                  className="w-10 h-10 rounded-xl bg-white dark:bg-[#171C19] border border-[#E2DFD6] dark:border-[#2A332D] flex items-center justify-center text-[#1E4D3B] dark:text-[#7CD0AE] active:scale-95 transition-transform"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Android File Upload Status / Progress Card */}
          {(uploading || selectedFileMeta || uploadError) && (
            <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-3.5 space-y-2.5">
              {selectedFileMeta && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF3EE] dark:bg-[#1C2E25] text-[#1E4D3B] dark:text-[#7CD0AE] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                        {selectedFileMeta.name}
                      </p>
                      <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992] tabular-nums">
                        {uploading
                          ? `আপলোড হচ্ছে... ${toBengaliDigits(uploadProgress)}%`
                          : selectedFileMeta.size > 0
                            ? `${formatBytesBengali(selectedFileMeta.size)} · প্রস্তুত`
                            : 'আমদানিকৃত ফাইল'}
                      </p>
                    </div>
                  </div>

                  {uploading ? (
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="min-h-[36px] px-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-semibold shrink-0"
                    >
                      বাতিল
                    </button>
                  ) : (
                    !isLocked && (
                      <button
                        type="button"
                        onClick={handleRemoveSelectedFile}
                        aria-label="ফাইল সরান"
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B746E] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              )}

              {uploading && (
                <div className="w-full h-1.5 rounded-full bg-[#ECEAE2] dark:bg-[#232B26] overflow-hidden">
                  <div
                    className="h-full bg-[#1E4D3B] dark:bg-[#5CB490] rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                  {uploadError}
                </p>
              )}
            </div>
          )}

          {/* Proofreading Ready Banner (when results exist) */}
          {issues.length > 0 && (
            <button
              type="button"
              onClick={onOpenResults}
              className="w-full rounded-2xl bg-[#E8F2ED] dark:bg-[#192D24] border border-[#CBE0D5] dark:border-[#264637] px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2.5 text-left min-w-0">
                <CheckCircle2 className="w-5 h-5 text-[#1E4D3B] dark:text-[#7CD0AE] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#163B2D] dark:text-[#BCE6D5]">
                    প্রুফরিডিং ফলাফল প্রস্তুত ({toBengaliDigits(issues.length)}টি পরামর্শ)
                  </p>
                  <p className="text-[11px] text-[#356350] dark:text-[#86C7AC] tabular-nums">
                    {toBengaliDigits(pendingCount)}টি এখনো পর্যালোচনা বাকি
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#1E4D3B] dark:text-[#7CD0AE] inline-flex items-center gap-1 shrink-0">
                <Eye className="w-3.5 h-3.5" />
                <span>দেখুন</span>
              </span>
            </button>
          )}

          {/* Bengali Unicode Text Editor Surface */}
          <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 sm:p-7 shadow-2xs select-text">
            <textarea
              value={content}
              disabled={isLocked}
              onChange={(e) => onChangeContent(e.target.value)}
              spellCheck={false}
              placeholder={
                category === 'কবিতা'
                  ? 'এখানে আপনার বাংলা কবিতা লিখুন বা পেস্ট করুন...\n\nআপনার ছন্দ, চিত্রকল্প ও পঙ্‌ক্তি বিন্যাস অক্ষুণ্ণ রেখেই প্রুফরিড করা হবে।'
                  : 'এখানে আপনার বাংলা গল্প বা উপন্যাস লিখুন বা পেস্ট করুন...\n\nঅথবা উপরের বোতাম থেকে DOCX, DOC, PDF বা TXT ফাইল আপলোড করুন।'
              }
              className={`w-full min-h-[46vh] resize-none bg-transparent font-literary text-[#1C211E] dark:text-[#ECEBE6] placeholder:text-[#9AA39D] dark:placeholder:text-[#5E6963] focus:outline-none ${FONT_SIZE_CLASSES[fontSize]}`}
            />

            {/* Compact Live Word / Char / Paragraph Counter Strip */}
            <div className="mt-4 pt-3 border-t border-[#F0EDE6] dark:border-[#232B26] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B746E] dark:text-[#8E9992] tabular-nums select-none">
              <div className="flex items-center gap-2">
                <span>{toBengaliDigits(wordCount)} শব্দ</span>
                <span aria-hidden="true">·</span>
                <span>{toBengaliDigits(charCount)} অক্ষর</span>
                <span aria-hidden="true">·</span>
                <span>{toBengaliDigits(paragraphCount)} অনুচ্ছেদ</span>
              </div>
              <div className="flex items-center gap-3">
                {autoSaveEnabled && canSyncCloud && (
                  <span className="text-[#1E4D3B] dark:text-[#7CD0AE]">স্বয়ংক্রিয় সংরক্ষণ চালু</span>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyText()}
                  className="inline-flex items-center gap-1 text-[#47504A] dark:text-[#B4BEB8] font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Thumb-Zone Material 3 Primary Action Bar */}
      <div className="shrink-0 px-4 py-3 pb-20 lg:pb-4 bg-gradient-to-t from-[#F6F5F0] via-[#F6F5F0]/95 to-transparent dark:from-[#0F1311] dark:via-[#0F1311]/95">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <button
            type="button"
            disabled={proofreading || isLocked || !content.trim()}
            onClick={() => void onRunProofread()}
            className="flex-1 min-h-[50px] px-5 rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-sm font-semibold shadow-md shadow-[#1E4D3B]/20 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {proofreading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>এআই প্রুফরিড চলছে...</span>
              </>
            ) : (
              <>
                <Feather className="w-4 h-4" />
                <span>এআই প্রুফরিড করুন</span>
              </>
            )}
          </button>

          {issues.length > 0 && (
            <button
              type="button"
              onClick={onOpenResults}
              className="min-h-[50px] px-4 rounded-2xl bg-white dark:bg-[#1B221E] border border-[#D8D4C9] dark:border-[#2E3832] text-[#1E4D3B] dark:text-[#7CD0AE] text-xs font-semibold inline-flex items-center gap-1.5 active:scale-[0.98] transition-transform whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>ফলাফল ({toBengaliDigits(pendingCount)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Material 3 Export & Share Bottom Sheet */}
      {showExportSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowExportSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-2"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between px-1 pb-2">
              <h3 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                এক্সপোর্ট ও শেয়ার করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowExportSheet(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A635D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                setShowExportSheet(false);
                try {
                  await exportToDocx(title, category, content);
                  onNotify('DOCX ফাইল ডাউনলোড হয়েছে।', 'success');
                } catch (err) {
                  onNotify(err instanceof Error ? err.message : 'DOCX তৈরি ব্যর্থ।', 'error');
                }
              }}
              className="w-full min-h-[52px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                  DOCX ডকুমেন্ট সংরক্ষণ
                </p>
                <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992]">
                  মাইক্রোসফট ওয়ার্ড ও প্রকাশনার উপযোগী
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1E4D3B] dark:text-[#7CD0AE]">.docx</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                exportToPdf(title, category, content);
                onNotify('PDF সংরক্ষণ প্রিভিউ খোলা হয়েছে।', 'info');
              }}
              className="w-full min-h-[52px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                  PDF ফাইল সংরক্ষণ
                </p>
                <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992]">
                  নিখুঁত বাংলা যুক্তাক্ষরসহ প্রিন্ট-রেডি PDF
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1E4D3B] dark:text-[#7CD0AE]">.pdf</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                exportToTxt(title, content);
                onNotify('TXT ফাইল ডাউনলোড হয়েছে।', 'success');
              }}
              className="w-full min-h-[52px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                  TXT টেক্সট ফাইল
                </p>
                <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992]">
                  ইউনিকোড প্লেইন টেক্সট ফরম্যাট
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1E4D3B] dark:text-[#7CD0AE]">.txt</span>
            </button>

            <div className="my-1 border-t border-[#ECEAE2] dark:border-[#262E29]" />

            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                void handleShare();
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center gap-3 text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]"
            >
              <Share2 className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
              <span>অন্যান্য অ্যাপে শেয়ার করুন</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                void handleCopyText();
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center gap-3 text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]"
            >
              <Copy className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
              <span>সম্পূর্ণ লেখা কপি করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
