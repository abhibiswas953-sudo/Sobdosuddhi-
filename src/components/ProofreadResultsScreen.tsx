import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  CheckCheck,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Info,
  Download,
  Share2,
} from 'lucide-react';
import type {
  EditorFontSize,
  IssueSeverity,
  ManuscriptCategory,
  ProofreadIssue,
} from '../types';
import { computeWordDiff, toBengaliDigits } from '../lib/bengali';
import { exportToDocx, exportToPdf, exportToTxt, shareManuscript } from '../lib/exportUtils';

type ResultsTab = 'suggestions' | 'annotated' | 'compare';

interface ProofreadResultsScreenProps {
  title: string;
  category: ManuscriptCategory;
  originalText: string;
  content: string;
  issues: ProofreadIssue[];
  summary: string;
  fontSize: EditorFontSize;
  isLocked: boolean;
  onBackToEditor: () => void;
  onAcceptIssue: (id: string) => void;
  onRejectIssue: (id: string) => void;
  onAcceptAll: () => void;
  onRestoreOriginal: () => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FONT_SIZE_CLASSES: Record<EditorFontSize, string> = {
  sm: 'text-[15px] leading-[1.9]',
  md: 'text-[17px] leading-[2.0]',
  lg: 'text-[19px] leading-[2.05]',
  xl: 'text-[21px] leading-[2.1]',
};

const SEVERITY_META: Record<
  IssueSeverity,
  {
    label: string;
    textClass: string;
    markClass: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  definite: {
    label: 'নিশ্চিত ভুল',
    textClass: 'text-red-700 dark:text-red-400',
    markClass: 'mark-definite',
    icon: AlertCircle,
  },
  warning: {
    label: 'সম্ভাব্য সমস্যা',
    textClass: 'text-amber-700 dark:text-amber-400',
    markClass: 'mark-warning',
    icon: AlertTriangle,
  },
  style: {
    label: 'শৈলীগত পরামর্শ',
    textClass: 'text-blue-700 dark:text-blue-400',
    markClass: 'mark-style',
    icon: Info,
  },
};

export function ProofreadResultsScreen({
  title,
  category,
  originalText,
  content,
  issues,
  summary,
  fontSize,
  isLocked,
  onBackToEditor,
  onAcceptIssue,
  onRejectIssue,
  onAcceptAll,
  onRestoreOriginal,
  onNotify,
}: ProofreadResultsScreenProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('suggestions');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);

  const pendingCount = useMemo(
    () => issues.filter((i) => i.status === 'pending').length,
    [issues]
  );
  const acceptedCount = useMemo(
    () => issues.filter((i) => i.status === 'accepted').length,
    [issues]
  );

  // Build highlighted text marking pending errors AND accepted corrections separately
  const highlightedSegments = useMemo(() => {
    if (!content) return [];

    interface Span {
      start: number;
      end: number;
      type: 'error' | 'corrected';
      issue: ProofreadIssue;
    }

    const spans: Span[] = [];

    for (const iss of issues) {
      if (iss.status === 'pending') {
        const idx = content.indexOf(iss.original);
        if (idx !== -1) {
          const end = idx + iss.original.length;
          if (!spans.some((s) => !(end <= s.start || idx >= s.end))) {
            spans.push({ start: idx, end, type: 'error', issue: iss });
          }
        }
      } else if (iss.status === 'accepted' && iss.suggestion.trim()) {
        const idx = content.indexOf(iss.suggestion);
        if (idx !== -1) {
          const end = idx + iss.suggestion.length;
          if (!spans.some((s) => !(end <= s.start || idx >= s.end))) {
            spans.push({ start: idx, end, type: 'corrected', issue: iss });
          }
        }
      }
    }

    spans.sort((a, b) => a.start - b.start);

    const nodes: Array<{
      key: string;
      text: string;
      type?: 'error' | 'corrected';
      issue?: ProofreadIssue;
    }> = [];
    let cursor = 0;

    for (const sp of spans) {
      if (sp.start > cursor) {
        nodes.push({ key: `t_${cursor}`, text: content.slice(cursor, sp.start) });
      }
      nodes.push({
        key: `${sp.type}_${sp.issue.id}`,
        text: content.slice(sp.start, sp.end),
        type: sp.type,
        issue: sp.issue,
      });
      cursor = sp.end;
    }
    if (cursor < content.length) {
      nodes.push({ key: `t_${cursor}`, text: content.slice(cursor) });
    }
    return nodes;
  }, [content, issues]);

  const diffTokens = useMemo(
    () => computeWordDiff(originalText || content, content),
    [originalText, content]
  );

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null;

  return (
    <div className="flex flex-col h-full">
      {/* Native Android Material 3 Top App Bar */}
      <header className="shrink-0 h-14 px-2 sm:px-4 pt-safe bg-[#F6F5F0]/95 dark:bg-[#0F1311]/95 backdrop-blur-md border-b border-[#E7E4DC] dark:border-[#202723] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={onBackToEditor}
            aria-label="সম্পাদকে ফিরুন"
            className="w-11 h-11 rounded-full flex items-center justify-center text-[#1C211E] dark:text-[#ECEBE6] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6] truncate">
              প্রুফরিডিং ফলাফল
            </h1>
            <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F] truncate tabular-nums">
              {toBengaliDigits(pendingCount)}টি বাকি · {toBengaliDigits(acceptedCount)}টি গৃহীত
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowExportSheet(true)}
          className="min-h-[38px] px-3.5 rounded-full bg-[#E3EFE9] dark:bg-[#1E332A] text-[#1E4D3B] dark:text-[#7CD0AE] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>এক্সপোর্ট</span>
        </button>
      </header>

      {/* Segmented View Tabs */}
      <div className="shrink-0 px-4 sm:px-6 pt-3 pb-2 max-w-4xl w-full mx-auto">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#ECEAE2] dark:bg-[#1B211E]">
          {(
            [
              { id: 'suggestions', label: `পরামর্শ (${toBengaliDigits(issues.length)})` },
              { id: 'annotated', label: 'চিহ্নিত লেখা' },
              { id: 'compare', label: 'মূল বনাম সংশোধিত' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[38px] px-2 rounded-xl text-xs font-semibold transition-colors truncate tabular-nums ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#2A342F] text-[#1E4D3B] dark:text-[#7CD0AE] shadow-2xs'
                  : 'text-[#5A635D] dark:text-[#9BA69F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 app-scroll px-4 sm:px-6 py-3 pb-36 lg:pb-24">
        <div className="max-w-4xl mx-auto space-y-4 animate-m3-screen">
          {summary && (
            <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-4 text-xs sm:text-sm text-[#47504A] dark:text-[#B4BEB8] leading-relaxed">
              {summary}
            </div>
          )}

          {/* TAB 1: Dedicated Suggestion Cards */}
          {activeTab === 'suggestions' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-10 text-center space-y-2">
                  <p className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                    কোনো ত্রুটি শনাক্ত হয়নি
                  </p>
                  <p className="text-xs text-[#5A635D] dark:text-[#9BA69F]">
                    আপনার পান্ডুলিপিটি বানান ও ব্যাকরণের দিক থেকে চমৎকার রয়েছে।
                  </p>
                </div>
              ) : (
                issues.map((iss) => {
                  const meta = SEVERITY_META[iss.severity];
                  const Icon = meta.icon;
                  const resolved = iss.status !== 'pending';
                  return (
                    <div
                      key={iss.id}
                      className={`rounded-2xl bg-white dark:bg-[#171C19] border p-4 space-y-3 transition-opacity ${
                        resolved
                          ? 'border-[#ECEAE2] dark:border-[#222A25] opacity-65'
                          : 'border-[#E2DFD6] dark:border-[#2A332D]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${meta.textClass}`} />
                          <span className={`font-semibold truncate ${meta.textClass}`}>
                            {meta.label}
                          </span>
                          <span className="text-[#9BA39E]">·</span>
                          <span className="text-[#5A635D] dark:text-[#9BA69F] truncate">
                            {iss.category}
                          </span>
                        </div>
                        {resolved && (
                          <span className="text-[11px] font-semibold text-[#1E4D3B] dark:text-[#7CD0AE] shrink-0">
                            {iss.status === 'accepted' ? 'গৃহীত' : 'বাতিল'}
                          </span>
                        )}
                      </div>

                      {/* Incorrect vs Corrected Highlighted Separately */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 px-3.5 py-2.5">
                          <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mb-0.5">
                            ভুল / মূল অংশ
                          </p>
                          <p className="font-literary text-sm font-semibold text-red-800 dark:text-red-300 line-through select-text">
                            {iss.original}
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 px-3.5 py-2.5">
                          <p className="text-[11px] text-[#1E4D3B]/80 dark:text-[#7CD0AE]/80 mb-0.5">
                            প্রস্তাবিত শুদ্ধ রূপ
                          </p>
                          <p className="font-literary text-sm font-bold text-[#163B2D] dark:text-[#86D5B4] select-text">
                            {iss.suggestion}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#47504A] dark:text-[#B4BEB8] leading-relaxed">
                        {iss.explanation}
                      </p>

                      {!resolved && !isLocked && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onAcceptIssue(iss.id)}
                            className="flex-1 min-h-[42px] rounded-xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                          >
                            <Check className="w-4 h-4" />
                            <span>সংশোধন গ্রহণ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectIssue(iss.id)}
                            className="flex-1 min-h-[42px] rounded-xl border border-[#DCD8CE] dark:border-[#2E3732] text-[#47504A] dark:text-[#B4BEB8] text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                          >
                            <X className="w-4 h-4" />
                            <span>বাতিল করুন</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Highlighted Manuscript View */}
          {activeTab === 'annotated' && (
            <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 sm:p-7 space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#5A635D] dark:text-[#9BA69F] pb-3 border-b border-[#EFECE5] dark:border-[#232B26]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-red-600 inline-block" />
                  <span>ভুল শব্দ</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
                  <span>সম্ভাব্য সমস্যা</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-blue-600 inline-block" />
                  <span>শৈলীগত</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#1E4D3B] dark:bg-[#5CB490] inline-block" />
                  <span>গৃহীত সংশোধন</span>
                </span>
              </div>

              <div
                className={`font-literary whitespace-pre-wrap select-text text-[#1C211E] dark:text-[#ECEBE6] ${FONT_SIZE_CLASSES[fontSize]}`}
              >
                {highlightedSegments.map((seg) => {
                  if (seg.type === 'error' && seg.issue) {
                    const meta = SEVERITY_META[seg.issue.severity];
                    return (
                      <mark
                        key={seg.key}
                        onClick={() => setSelectedIssueId(seg.issue!.id)}
                        className={`bg-transparent text-inherit ${meta.markClass}`}
                      >
                        {seg.text}
                      </mark>
                    );
                  }
                  if (seg.type === 'corrected' && seg.issue) {
                    return (
                      <mark
                        key={seg.key}
                        onClick={() => setSelectedIssueId(seg.issue!.id)}
                        className="bg-transparent text-inherit mark-corrected"
                      >
                        {seg.text}
                      </mark>
                    );
                  }
                  return <React.Fragment key={seg.key}>{seg.text}</React.Fragment>;
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Original vs Corrected Comparison */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 sm:p-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFECE5] dark:border-[#232B26]">
                  <h2 className="font-literary text-sm font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                    সম্মিলিত তুলনা
                  </h2>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 line-through">
                      মূল অংশ
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300">
                      সংশোধিত
                    </span>
                  </div>
                </div>

                {originalText === content ? (
                  <p className="text-xs text-[#5A635D] dark:text-[#9BA69F] py-6 text-center">
                    এখনো কোনো সংশোধন প্রয়োগ করা হয়নি। পরামর্শ গ্রহণ করলে এখানে পরিবর্তন দেখাবে।
                  </p>
                ) : (
                  <div
                    className={`font-literary whitespace-pre-wrap select-text text-[#1C211E] dark:text-[#ECEBE6] ${FONT_SIZE_CLASSES[fontSize]}`}
                  >
                    {diffTokens.map((tok, i) => {
                      if (tok.type === 'removed') {
                        return (
                          <del
                            key={i}
                            className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 px-1 rounded mx-0.5"
                          >
                            {tok.value}
                          </del>
                        );
                      }
                      if (tok.type === 'added') {
                        return (
                          <ins
                            key={i}
                            className="no-underline bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 px-1 rounded mx-0.5 font-semibold"
                          >
                            {tok.value}
                          </ins>
                        );
                      }
                      return <React.Fragment key={i}>{tok.value}</React.Fragment>;
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-4 space-y-2">
                  <p className="text-xs font-bold text-[#5A635D] dark:text-[#9BA69F]">
                    মূল পান্ডুলিপি (অপরিবর্তিত)
                  </p>
                  <div className="font-literary text-sm leading-[1.9] whitespace-pre-wrap text-[#47504A] dark:text-[#B4BEB8] max-h-72 overflow-y-auto select-text">
                    {originalText || content}
                  </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-4 space-y-2">
                  <p className="text-xs font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
                    সংশোধিত পান্ডুলিপি
                  </p>
                  <div className="font-literary text-sm leading-[1.9] whitespace-pre-wrap text-[#1C211E] dark:text-[#ECEBE6] max-h-72 overflow-y-auto select-text">
                    {content}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Thumb-Zone Results Action Bar */}
      {!isLocked && (
        <div className="shrink-0 px-4 py-3 pb-20 lg:pb-4 bg-gradient-to-t from-[#F6F5F0] via-[#F6F5F0]/95 to-transparent dark:from-[#0F1311] dark:via-[#0F1311]/95">
          <div className="max-w-4xl mx-auto flex items-center gap-2.5">
            <button
              type="button"
              disabled={pendingCount === 0}
              onClick={onAcceptAll}
              className="flex-1 min-h-[48px] px-4 rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-45"
            >
              <CheckCheck className="w-4 h-4" />
              <span>সব গ্রহণ ({toBengaliDigits(pendingCount)})</span>
            </button>

            <button
              type="button"
              disabled={originalText === content}
              onClick={() => setConfirmRestore(true)}
              className="min-h-[48px] px-4 rounded-2xl bg-white dark:bg-[#1B221E] border border-[#DCD8CE] dark:border-[#2E3832] text-[#47504A] dark:text-[#B4BEB8] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>মূল লেখা ফিরিয়ে আনুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Tapped Highlight Detail Bottom Sheet */}
      {selectedIssue && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedIssueId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-3.5"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
                {selectedIssue.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIssueId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5A635D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="font-literary text-red-700 dark:text-red-400 line-through">
                {selectedIssue.original}
              </p>
              <p className="font-literary font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
                {selectedIssue.suggestion}
              </p>
            </div>
            <p className="text-xs text-[#47504A] dark:text-[#B4BEB8] leading-relaxed">
              {selectedIssue.explanation}
            </p>
            {selectedIssue.status === 'pending' && !isLocked && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onAcceptIssue(selectedIssue.id);
                    setSelectedIssueId(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-[#1E4D3B] text-white text-xs font-semibold"
                >
                  সংশোধন গ্রহণ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRejectIssue(selectedIssue.id);
                    setSelectedIssueId(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl border border-[#DCD8CE] dark:border-[#2E3732] text-xs font-semibold"
                >
                  বাতিল
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore Original Confirmation Dialog */}
      {confirmRestore && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setConfirmRestore(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-4"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto sm:hidden" />
            <h3 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
              মূল লেখা ফিরিয়ে আনবেন?
            </h3>
            <p className="text-xs sm:text-sm text-[#5A635D] dark:text-[#9BA69F] leading-relaxed">
              গৃহীত সকল সংশোধন বাতিল হয়ে পান্ডুলিপিটি পূর্বের মূল অবস্থায় ফিরে যাবে।
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRestore(false)}
                className="flex-1 min-h-[44px] rounded-2xl border border-[#DCD8CE] dark:border-[#2E3732] text-sm font-medium"
              >
                থাক
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestoreOriginal();
                  setConfirmRestore(false);
                }}
                className="flex-1 min-h-[44px] rounded-2xl bg-[#1E4D3B] text-white text-sm font-semibold"
              >
                হ্যাঁ, ফিরিয়ে আনুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Bottom Sheet */}
      {showExportSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowExportSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-2"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6] px-1 pb-2">
              সংশোধিত পান্ডুলিপি এক্সপোর্ট
            </h3>
            <button
              type="button"
              onClick={async () => {
                setShowExportSheet(false);
                try {
                  await exportToDocx(title, category, content);
                  onNotify('DOCX ডাউনলোড হয়েছে।', 'success');
                } catch (err) {
                  onNotify(err instanceof Error ? err.message : 'DOCX ব্যর্থ।', 'error');
                }
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-sm font-semibold"
            >
              <span>DOCX ডাউনলোড</span>
              <span className="text-xs text-[#1E4D3B] dark:text-[#7CD0AE]">.docx</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                exportToPdf(title, category, content);
                onNotify('PDF প্রিন্ট/সংরক্ষণ খোলা হয়েছে।', 'info');
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-sm font-semibold"
            >
              <span>PDF সংরক্ষণ</span>
              <span className="text-xs text-[#1E4D3B] dark:text-[#7CD0AE]">.pdf</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExportSheet(false);
                exportToTxt(title, content);
                onNotify('TXT ডাউনলোড হয়েছে।', 'success');
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center justify-between text-sm font-semibold"
            >
              <span>TXT ডাউনলোড</span>
              <span className="text-xs text-[#1E4D3B] dark:text-[#7CD0AE]">.txt</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowExportSheet(false);
                try {
                  const res = await shareManuscript(title, content);
                  onNotify(res === 'shared' ? 'শেয়ার হয়েছে।' : 'কপি হয়েছে।', 'success');
                } catch {
                  // aborted
                }
              }}
              className="w-full min-h-[48px] px-4 rounded-2xl hover:bg-[#F6F5F0] dark:hover:bg-[#1F2722] flex items-center gap-2.5 text-sm font-semibold"
            >
              <Share2 className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
              <span>শেয়ার করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
