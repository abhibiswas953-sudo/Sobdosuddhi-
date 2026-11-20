import React, { useMemo, useState } from 'react';
import {
  Search,
  ArrowUpDown,
  FileText,
  Pencil,
  Trash2,
  Share2,
  Plus,
  X,
  FolderOpen,
} from 'lucide-react';
import {
  formatCategoryDisplay,
  type Manuscript,
  type ManuscriptCategory,
} from '../types';
import { formatBengaliDate, toBengaliDigits } from '../lib/bengali';
import { shareManuscript } from '../lib/exportUtils';

interface MyManuscriptsScreenProps {
  manuscripts: Manuscript[];
  loading: boolean;
  onNewManuscript: () => void;
  onOpenManuscript: (ms: Manuscript) => void;
  onRenameManuscript: (ms: Manuscript, newTitle: string) => Promise<void>;
  onDeleteManuscript: (id: string) => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type LibraryFilter = 'সব' | 'কবিতা' | 'গদ্য';

export function MyManuscriptsScreen({
  manuscripts,
  loading,
  onNewManuscript,
  onOpenManuscript,
  onRenameManuscript,
  onDeleteManuscript,
  onNotify,
}: MyManuscriptsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('সব');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const [renameTarget, setRenameTarget] = useState<Manuscript | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Manuscript | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleManuscripts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = manuscripts.filter((m) => {
      const catOk =
        filter === 'সব' ||
        (filter === 'কবিতা' && m.category === 'কবিতা') ||
        (filter === 'গদ্য' && m.category !== 'কবিতা');
      const searchOk =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        formatCategoryDisplay(m.category).toLowerCase().includes(q);
      return catOk && searchOk;
    });

    return [...filtered].sort((a, b) => {
      const tA = a.updatedAt ? a.updatedAt.getTime() : 0;
      const tB = b.updatedAt ? b.updatedAt.getTime() : 0;
      return sortNewestFirst ? tB - tA : tA - tB;
    });
  }, [manuscripts, searchQuery, filter, sortNewestFirst]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await onRenameManuscript(renameTarget, renameValue.trim());
      setRenameTarget(null);
      onNotify('পান্ডুলিপির নাম পরিবর্তন করা হয়েছে।', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'নাম পরিবর্তন ব্যর্থ হয়েছে।', 'error');
    } finally {
      setRenaming(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteManuscript(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async (ms: Manuscript) => {
    try {
      const outcome = await shareManuscript(ms.title, ms.content);
      onNotify(
        outcome === 'shared' ? 'পান্ডুলিপি শেয়ার করা হয়েছে।' : 'পান্ডুলিপি ক্লিপবোর্ডে কপি হয়েছে।',
        'success'
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onNotify('শেয়ার করতে সমস্যা হয়েছে।', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Native Android Top App Bar */}
      <header className="shrink-0 h-14 px-4 sm:px-6 pt-safe bg-[#F6F5F0]/90 dark:bg-[#0F1311]/90 backdrop-blur-md border-b border-[#E7E4DC]/80 dark:border-[#202723] flex items-center justify-between gap-3">
        <h1 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6] truncate">
          আমার পান্ডুলিপি
        </h1>
        <button
          type="button"
          onClick={() => setSortNewestFirst((s) => !s)}
          className="min-h-[40px] px-3 rounded-full bg-white dark:bg-[#171C19] border border-[#E2DFD6] dark:border-[#2A332D] text-xs font-medium text-[#1C211E] dark:text-[#ECEBE6] inline-flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#1E4D3B] dark:text-[#7CD0AE]" />
          <span>{sortNewestFirst ? 'নতুন আগে' : 'পুরোনো আগে'}</span>
        </button>
      </header>

      {/* Search & Filter Bar */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2 max-w-4xl w-full mx-auto space-y-3">
        <div className="relative select-text">
          <Search className="w-4 h-4 text-[#757E78] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সংরক্ষিত পান্ডুলিপি খুঁজুন..."
            className="w-full min-h-[46px] pl-11 pr-10 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] text-sm focus:outline-none focus:border-[#1E4D3B] dark:focus:border-[#5CB490]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-9 h-9 rounded-full flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-[#757E78]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'সব', label: 'সব পান্ডুলিপি' },
              { id: 'কবিতা', label: 'বাংলা কবিতা' },
              { id: 'গদ্য', label: 'বাংলা গল্প ও উপন্যাস' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`min-h-[38px] px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filter === chip.id
                  ? 'bg-[#1E4D3B] dark:bg-[#2E7358] text-white'
                  : 'bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] text-[#47504A] dark:text-[#B4BEB8]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manuscripts List */}
      <div className="flex-1 app-scroll px-4 sm:px-6 py-3 pb-28 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-3 animate-m3-screen">
          {loading ? (
            [1, 2, 3, 4].map((k) => (
              <div
                key={k}
                className="h-28 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] animate-pulse"
              />
            ))
          ) : visibleManuscripts.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-10 text-center space-y-3">
              <FolderOpen className="w-9 h-9 text-[#9BA39E] mx-auto" />
              <p className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                কোনো পান্ডুলিপি পাওয়া যায়নি
              </p>
              <p className="text-xs text-[#5A635D] dark:text-[#9BA69F]">
                নতুন বাংলা কবিতা, গল্প বা উপন্যাস লিখুন অথবা ডিভাইস থেকে ফাইল আপলোড করুন।
              </p>
              <button
                type="button"
                onClick={onNewManuscript}
                className="mt-2 min-h-[44px] px-5 rounded-2xl bg-[#1E4D3B] text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন লেখা শুরু করুন</span>
              </button>
            </div>
          ) : (
            visibleManuscripts.map((ms) => (
              <div
                key={ms.id}
                onClick={() => onOpenManuscript(ms)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenManuscript(ms);
                  }
                }}
                className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-4 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF3EE] dark:bg-[#1C2E25] text-[#1E4D3B] dark:text-[#7CD0AE] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-literary text-base font-bold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                      {ms.title}
                    </h3>
                    <p className="font-literary text-xs text-[#5A635D] dark:text-[#9BA69F] line-clamp-2 mt-1 leading-relaxed">
                      {ms.content.trim() || 'কোনো লেখা এখনো যুক্ত করা হয়নি...'}
                    </p>
                    <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992] mt-2 tabular-nums">
                      {formatCategoryDisplay(ms.category as ManuscriptCategory)} ·{' '}
                      {toBengaliDigits(ms.wordCount)} শব্দ ·{' '}
                      {toBengaliDigits(ms.errorsFound)} পরামর্শ · {formatBengaliDate(ms.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Touch-Friendly Native Card Action Row */}
                <div
                  className="mt-3 pt-2.5 border-t border-[#F0EDE6] dark:border-[#232B26] flex items-center justify-end gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ms.status !== 'সুরক্ষিত' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget(ms);
                        setRenameValue(ms.title);
                      }}
                      className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#F2F0E9] dark:hover:bg-[#222A25] inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>নাম বদলান</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleShare(ms)}
                    className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#F2F0E9] dark:hover:bg-[#222A25] inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>শেয়ার</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ms)}
                    className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Material 3 Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={onNewManuscript}
        aria-label="নতুন পান্ডুলিপি তৈরি করুন"
        className="fixed bottom-20 lg:bottom-7 right-5 z-30 h-14 px-5 rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white shadow-lg shadow-[#1E4D3B]/30 inline-flex items-center gap-2 font-semibold text-sm active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        <span>নতুন</span>
      </button>

      {/* Rename Modal Dialog */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setRenameTarget(null)}
        >
          <form
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-4"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto sm:hidden" />
            <h3 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
              পান্ডুলিপির নাম পরিবর্তন
            </h3>
            <input
              type="text"
              autoFocus
              maxLength={200}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="নতুন শিরোনাম লিখুন"
              className="w-full min-h-[48px] px-4 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] text-sm select-text focus:outline-none focus:border-[#1E4D3B]"
            />
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="flex-1 min-h-[46px] rounded-2xl border border-[#DCD8CE] dark:border-[#2E3732] text-sm font-medium text-[#47504A] dark:text-[#B4BEB8]"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={renaming || !renameValue.trim()}
                className="flex-1 min-h-[46px] rounded-2xl bg-[#1E4D3B] text-white text-sm font-semibold disabled:opacity-60"
              >
                {renaming ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-4"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto sm:hidden" />
            <h3 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
              পান্ডুলিপি মুছে ফেলবেন?
            </h3>
            <p className="text-sm text-[#5A635D] dark:text-[#9BA69F] leading-relaxed">
              “{deleteTarget.title}” স্থায়ীভাবে মুছে যাবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[46px] rounded-2xl border border-[#DCD8CE] dark:border-[#2E3732] text-sm font-medium text-[#47504A] dark:text-[#B4BEB8]"
              >
                থাক
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="flex-1 min-h-[46px] rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'মুছা হচ্ছে...' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
