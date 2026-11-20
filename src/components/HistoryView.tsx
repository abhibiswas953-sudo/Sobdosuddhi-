import React, { useEffect, useState } from 'react';
import { History, Download, Eye, X, FileText, ChevronRight } from 'lucide-react';
import type { Manuscript, ProofreadRevision } from '../types';
import { fetchAllRevisionsForUser } from '../lib/firestoreService';
import { formatBengaliDateTime, toBengaliDigits } from '../lib/bengali';
import { exportToTxt } from '../lib/exportUtils';

interface HistoryViewProps {
  uid: string;
  manuscripts: Manuscript[];
  onOpenManuscript: (ms: Manuscript) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function HistoryView({
  uid,
  manuscripts,
  onOpenManuscript,
  onNotify,
}: HistoryViewProps) {
  const [revisions, setRevisions] = useState<ProofreadRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevision, setSelectedRevision] = useState<ProofreadRevision | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchAllRevisionsForUser(uid, manuscripts);
        if (active) setRevisions(list);
      } catch (err) {
        console.error('History load error:', err);
        if (active) {
          onNotify('প্রুফরিডিং ইতিহাস লোড করতে সমস্যা হয়েছে।', 'error');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [uid, manuscripts, onNotify]);

  return (
    <div className="flex flex-col h-full">
      {/* Native Android Top App Bar */}
      <header className="shrink-0 h-14 px-4 sm:px-6 pt-safe bg-[#F6F5F0]/90 dark:bg-[#0F1311]/90 backdrop-blur-md border-b border-[#E7E4DC]/80 dark:border-[#202723] flex items-center justify-between">
        <h1 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
          প্রুফরিডিং ইতিহাস
        </h1>
        <span className="text-xs text-[#6B746E] dark:text-[#8E9992] tabular-nums">
          {toBengaliDigits(revisions.length)}টি সংস্করণ
        </span>
      </header>

      <div className="flex-1 app-scroll px-4 sm:px-6 py-4 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-3 animate-m3-screen">
          {loading ? (
            [1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-24 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] animate-pulse"
              />
            ))
          ) : revisions.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-10 text-center space-y-2.5">
              <History className="w-9 h-9 text-[#9BA39E] mx-auto" />
              <h2 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                এখনো কোনো প্রুফরিডিং ইতিহাস নেই
              </h2>
              <p className="text-xs text-[#5A635D] dark:text-[#9BA69F] leading-relaxed">
                যেকোনো পান্ডুলিপিতে এআই প্রুফরিড চালালে প্রতিটি সংস্করণ স্বয়ংক্রিয়ভাবে এখানে জমা হবে।
              </p>
            </div>
          ) : (
            revisions.map((rev) => {
              const parentMs = manuscripts.find((m) => m.id === rev.manuscriptId);
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-4 space-y-2.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF3EE] dark:bg-[#1C2E25] text-[#1E4D3B] dark:text-[#7CD0AE] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-literary text-sm sm:text-base font-bold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                        {rev.manuscriptTitle || 'পান্ডুলিপি'}
                      </h3>
                      <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992] tabular-nums mt-0.5">
                        {formatBengaliDateTime(rev.createdAt)} · {toBengaliDigits(rev.wordCount)} শব্দ
                        · {toBengaliDigits(rev.issuesCount)} পরামর্শ
                      </p>
                      {rev.note && (
                        <p className="text-xs text-[#47504A] dark:text-[#B4BEB8] mt-1.5 line-clamp-2 leading-relaxed">
                          {rev.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0EDE6] dark:border-[#232B26] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRevision(rev)}
                      className="min-h-[36px] px-3 rounded-xl text-xs font-semibold text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#F2F0E9] dark:hover:bg-[#222A25] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>পড়ুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportToTxt(
                          rev.manuscriptTitle || 'পান্ডুলিপি',
                          rev.correctedText,
                          'সংস্করণ'
                        );
                        onNotify('TXT ডাউনলোড হয়েছে।', 'success');
                      }}
                      className="min-h-[36px] px-3 rounded-xl text-xs font-semibold text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#F2F0E9] dark:hover:bg-[#222A25] inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ডাউনলোড</span>
                    </button>

                    {parentMs && (
                      <button
                        type="button"
                        onClick={() => onOpenManuscript(parentMs)}
                        className="min-h-[36px] px-3 rounded-xl bg-[#E3EFE9] dark:bg-[#1E332A] text-[#1E4D3B] dark:text-[#7CD0AE] text-xs font-semibold inline-flex items-center gap-0.5"
                      >
                        <span>খুলুন</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Material 3 Bottom Sheet Preview */}
      {selectedRevision && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedRevision(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[85dvh] bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-m3-sheet"
          >
            <div className="pt-3 px-5 pb-3 border-b border-[#EFECE5] dark:border-[#232B26] shrink-0">
              <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                    {selectedRevision.manuscriptTitle}
                  </h3>
                  <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992] tabular-nums">
                    {formatBengaliDateTime(selectedRevision.createdAt)} ·{' '}
                    {toBengaliDigits(selectedRevision.wordCount)} শব্দ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRevision(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A635D]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 app-scroll p-5 select-text">
              <div className="font-literary text-base leading-[1.95] whitespace-pre-wrap text-[#1C211E] dark:text-[#ECEBE6]">
                {selectedRevision.correctedText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
