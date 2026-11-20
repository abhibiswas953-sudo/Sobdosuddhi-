import React, { useMemo, useState } from 'react';
import {
  FilePlus2,
  Feather,
  BookOpen,
  Upload,
  ChevronRight,
  History,
  FolderOpen,
  Moon,
  Sun,
  FileText,
} from 'lucide-react';
import {
  formatCategoryDisplay,
  type AppView,
  type Manuscript,
  type ManuscriptCategory,
} from '../types';
import { formatBengaliDate, SAMPLE_MANUSCRIPTS, toBengaliDigits } from '../lib/bengali';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeScreenProps {
  authorName: string;
  manuscripts: Manuscript[];
  loading: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNewManuscript: (initial?: {
    title?: string;
    category?: ManuscriptCategory;
    content?: string;
    openUploadPicker?: boolean;
  }) => void;
  onOpenManuscript: (ms: Manuscript) => void;
  onNavigate: (view: AppView) => void;
}

function getBengaliGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'শুভ সকাল';
  if (hour < 17) return 'শুভ দুপুর';
  if (hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

export function HomeScreen({
  authorName,
  manuscripts,
  loading,
  darkMode,
  onToggleDarkMode,
  onNewManuscript,
  onOpenManuscript,
  onNavigate,
}: HomeScreenProps) {
  const [iconErr, setIconErr] = useState(false);

  const stats = useMemo(() => {
    return {
      totalManuscripts: manuscripts.length,
      totalWords: manuscripts.reduce((acc, m) => acc + (m.wordCount || 0), 0),
      totalErrors: manuscripts.reduce((acc, m) => acc + (m.errorsFound || 0), 0),
      totalResolved: manuscripts.reduce((acc, m) => acc + (m.errorsResolved || 0), 0),
    };
  }, [manuscripts]);

  const recentManuscripts = useMemo(() => manuscripts.slice(0, 5), [manuscripts]);

  return (
    <div className="flex flex-col h-full">
      {/* Compact Native Android Material 3 Top App Bar (56px) */}
      <header className="shrink-0 h-14 px-4 sm:px-6 pt-safe bg-[#F6F5F0]/90 dark:bg-[#0F1311]/90 backdrop-blur-md border-b border-[#E7E4DC]/80 dark:border-[#202723] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#1E4D3B] flex items-center justify-center shrink-0 shadow-2xs">
            {!iconErr ? (
              <img
                src="/pwa-192x192.png"
                alt="Sobdosuddhi 1.0"
                onError={() => setIconErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Feather className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-literary text-lg font-bold tracking-tight text-[#1C211E] dark:text-[#ECEBE6] truncate">
            Sobdosuddhi 1.0
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'আলো মোড' : 'ডার্ক মোড'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] active:scale-95 transition-transform"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Scrollable Native App Body */}
      <div className="flex-1 app-scroll px-4 sm:px-6 py-5 pb-24 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-m3-screen">
          {/* Material 3 Primary Greeting & Action Card */}
          <section className="rounded-3xl bg-[#1E4D3B] dark:bg-[#1A3E30] text-[#F8F7F4] p-5 sm:p-6 shadow-sm">
            <p className="text-xs text-[#BCE0D1] font-medium">{getBengaliGreeting()}</p>
            <h1 className="font-literary text-2xl sm:text-[1.75rem] font-bold mt-0.5 leading-snug">
              {authorName}
            </h1>
            <p className="text-xs sm:text-sm text-[#D7EAE2] mt-1 leading-relaxed">
              বাংলা লেখার নির্ভরযোগ্য প্রুফরিডার। আপনার পান্ডুলিপি নির্ভুল করুন।
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNewManuscript({ category: 'গল্প' })}
                className="flex-1 sm:flex-none min-h-[46px] px-5 rounded-2xl bg-[#F8F7F4] text-[#163B2D] font-semibold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform whitespace-nowrap"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>নতুন পান্ডুলিপি</span>
              </button>

              <button
                type="button"
                onClick={() => onNewManuscript({ category: 'গল্প', openUploadPicker: true })}
                className="flex-1 sm:flex-none min-h-[46px] px-4 rounded-2xl bg-white/14 hover:bg-white/20 text-[#F8F7F4] font-medium text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>ফাইল আপলোড</span>
              </button>
            </div>
          </section>

          {/* Quick Proofreading Tools (2 Primary Writing Categories) */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#47504A] dark:text-[#B4BEB8] px-1">
              দ্রুত প্রুফরিডিং টুলস
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  onNewManuscript({
                    title: 'নতুন কবিতা',
                    category: 'কবিতা',
                  })
                }
                className="text-left p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] hover:border-[#1E4D3B] dark:hover:border-[#5CB490] active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E8F2ED] dark:bg-[#1C3027] text-[#1E4D3B] dark:text-[#7CD0AE] flex items-center justify-center mb-3">
                  <Feather className="w-5 h-5" />
                </div>
                <p className="font-literary text-sm sm:text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                  বাংলা কবিতা
                </p>
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F] mt-1 leading-snug">
                  ছন্দ ও চিত্রকল্প অক্ষুণ্ণ রেখে প্রুফরিড
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onNewManuscript({
                    title: 'নতুন গল্প ও উপন্যাস',
                    category: 'গল্প',
                  })
                }
                className="text-left p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] hover:border-[#1E4D3B] dark:hover:border-[#5CB490] active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F3EFE4] dark:bg-[#2A271E] text-[#7A5E2B] dark:text-[#D9B87A] flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="font-literary text-sm sm:text-base font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                  বাংলা গল্প ও উপন্যাস
                </p>
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F] mt-1 leading-snug">
                  বানান, ব্যাকরণ ও বাক্যগঠন যাচাই
                </p>
              </button>
            </div>
          </section>

          {/* Usage Statistics (Compact 4-tile Grid) */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#47504A] dark:text-[#B4BEB8] px-1">
              ব্যবহারের পরিসংখ্যান
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29]">
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F]">সংরক্ষিত পান্ডুলিপি</p>
                <p className="font-literary text-2xl font-bold text-[#1C211E] dark:text-[#ECEBE6] tabular-nums mt-1">
                  {toBengaliDigits(stats.totalManuscripts)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29]">
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F]">মোট শব্দ</p>
                <p className="font-literary text-2xl font-bold text-[#1C211E] dark:text-[#ECEBE6] tabular-nums mt-1">
                  {toBengaliDigits(stats.totalWords)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29]">
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F]">শনাক্তকৃত ত্রুটি</p>
                <p className="font-literary text-2xl font-bold text-[#1C211E] dark:text-[#ECEBE6] tabular-nums mt-1">
                  {toBengaliDigits(stats.totalErrors)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29]">
                <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F]">সংশোধিত</p>
                <p className="font-literary text-2xl font-bold text-[#1E4D3B] dark:text-[#7CD0AE] tabular-nums mt-1">
                  {toBengaliDigits(stats.totalResolved)}
                </p>
              </div>
            </div>
          </section>

          {/* Shortcut Tiles: Saved Manuscripts & Proofreading History */}
          <section className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('manuscripts')}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen className="w-5 h-5 text-[#1E4D3B] dark:text-[#7CD0AE] shrink-0" />
                <span className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                  আমার পান্ডুলিপি
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A948E] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 min-w-0">
                <History className="w-5 h-5 text-[#1E4D3B] dark:text-[#7CD0AE] shrink-0" />
                <span className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                  প্রুফরিডিং ইতিহাস
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8A948E] shrink-0" />
            </button>
          </section>

          {/* Recent Documents */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#47504A] dark:text-[#B4BEB8]">
                সাম্প্রতিক নথিপত্র
              </h2>
              {manuscripts.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('manuscripts')}
                  className="text-xs font-semibold text-[#1E4D3B] dark:text-[#7CD0AE]"
                >
                  সব দেখুন
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="h-[68px] rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] animate-pulse"
                  />
                ))}
              </div>
            ) : recentManuscripts.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 space-y-4">
                <p className="text-xs text-[#5A635D] dark:text-[#9BA69F]">
                  এখনো কোনো পান্ডুলিপি সংরক্ষিত নেই। নিচের নমুনা লেখা দিয়ে সরাসরি পরীক্ষা করুন:
                </p>
                <div className="space-y-2">
                  {SAMPLE_MANUSCRIPTS.slice(0, 2).map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() =>
                        onNewManuscript({
                          title: s.title,
                          category: s.category,
                          content: s.content,
                        })
                      }
                      className="w-full min-h-[56px] px-4 py-3 rounded-xl bg-[#F6F5F0] dark:bg-[#1D2420] flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
                    >
                      <div className="text-left min-w-0">
                        <p className="font-literary text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[#5A635D] dark:text-[#9BA69F]">
                          নমুনা · {formatCategoryDisplay(s.category)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] divide-y divide-[#EFECE5] dark:divide-[#232B26] overflow-hidden">
                {recentManuscripts.map((ms) => (
                  <button
                    key={ms.id}
                    type="button"
                    onClick={() => onOpenManuscript(ms)}
                    className="w-full min-h-[68px] px-4 py-3.5 flex items-center gap-3.5 hover:bg-[#FAF9F6] dark:hover:bg-[#1D2420] active:bg-[#F2F0E9] dark:active:bg-[#232B26] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EBF3EE] dark:bg-[#1C2E25] text-[#1E4D3B] dark:text-[#7CD0AE] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-literary text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6] truncate">
                        {ms.title}
                      </p>
                      <p className="text-xs text-[#6B746E] dark:text-[#8E9992] truncate tabular-nums mt-0.5">
                        {formatCategoryDisplay(ms.category)} · {toBengaliDigits(ms.wordCount)} শব্দ ·{' '}
                        {formatBengaliDate(ms.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8A948E] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
