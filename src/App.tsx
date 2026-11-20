import React, { useEffect, useState, useCallback } from 'react';
import {
  Home,
  PenSquare,
  FolderOpen,
  History,
  Settings,
  WifiOff,
  MailCheck,
  Feather,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { EditorScreen } from './components/EditorScreen';
import { ProofreadResultsScreen } from './components/ProofreadResultsScreen';
import { MyManuscriptsScreen } from './components/MyManuscriptsScreen';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  createManuscript,
  createRevisionSnapshot,
  deleteManuscript,
  saveManuscript,
  subscribeUserManuscripts,
} from './lib/firestoreService';
import { toBengaliDigits } from './lib/bengali';
import {
  BLUEPRINT_LIMITS,
  type AppView,
  type EditorFontSize,
  type Manuscript,
  type ManuscriptCategory,
  type ManuscriptStatus,
  type ProofreadIssue,
} from './types';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface EditorUndoEntry {
  content: string;
  issues: ProofreadIssue[];
}

const FONT_SIZE_KEY = 'sobdosuddhi_font_size';

function SobdosuddhiNativeApp() {
  const {
    user,
    profile,
    authReady,
    darkMode,
    toggleDarkMode,
    resendVerificationEmail,
    refreshUserVerification,
  } = useAuth();
  const isOnline = useOnlineStatus();

  // Branded splash delay on cold app open
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 850);
    return () => clearTimeout(t);
  }, []);

  const [view, setView] = useState<AppView>('home');
  const [fontSize, setFontSize] = useState<EditorFontSize>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY) as EditorFontSize | null;
      return saved && ['sm', 'md', 'lg', 'xl'].includes(saved) ? saved : 'md';
    } catch {
      return 'md';
    }
  });

  const handleFontSizeChange = (size: EditorFontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem(FONT_SIZE_KEY, size);
    } catch {
      // ignore storage errors
    }
  };

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loadingManuscripts, setLoadingManuscripts] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Active editor & results working state
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('নতুন পান্ডুলিপি');
  const [category, setCategory] = useState<ManuscriptCategory>('গল্প');
  const [originalText, setOriginalText] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [issues, setIssues] = useState<ProofreadIssue[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [status, setStatus] = useState<ManuscriptStatus>('খসড়া');
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [openUploadPickerOnMount, setOpenUploadPickerOnMount] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<EditorUndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<EditorUndoEntry[]>([]);
  const [dirty, setDirty] = useState<boolean>(false);
  const [proofreading, setProofreading] = useState<boolean>(false);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now();
      setToast({ id, message, type });
      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 3600);
    },
    []
  );

  // Android back-button / browser popstate handling
  const navigateTo = useCallback((nextView: AppView) => {
    setView((prev) => {
      if (prev !== nextView) {
        try {
          window.history.pushState({ view: nextView }, '');
        } catch {
          // ignore
        }
      }
      return nextView;
    });
  }, []);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const target = (e.state as { view?: AppView } | null)?.view;
      if (target) {
        setView(target);
      } else {
        setView((curr) => (curr === 'results' ? 'editor' : 'home'));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Subscribe to owner's private manuscripts
  useEffect(() => {
    if (!authReady || !user) {
      setManuscripts([]);
      setLoadingManuscripts(false);
      return;
    }
    setLoadingManuscripts(true);
    const unsub = subscribeUserManuscripts(
      user.uid,
      (items) => {
        setManuscripts(items);
        setLoadingManuscripts(false);
      },
      (err) => {
        setLoadingManuscripts(false);
        if (err.message.includes('Quota exceeded')) {
          notify('আজকের ডাটাবেস সীমা পূর্ণ হয়েছে। আগামীকাল চেষ্টা করুন।', 'error');
        }
      }
    );
    return () => unsub();
  }, [authReady, user, notify]);

  const canSyncCloud = Boolean(user?.emailVerified);
  const autoSaveEnabled = profile?.autoSave ?? true;

  const pushUndo = useCallback((prevContent: string, prevIssues: ProofreadIssue[]) => {
    setUndoStack((s) => [...s.slice(-39), { content: prevContent, issues: prevIssues }]);
    setRedoStack([]);
  }, []);

  const persistCurrentManuscript = useCallback(
    async (
      silent = false,
      overrides?: {
        content?: string;
        originalText?: string;
        issues?: ProofreadIssue[];
        status?: ManuscriptStatus;
        title?: string;
        category?: ManuscriptCategory;
        sourceFileName?: string;
      }
    ): Promise<string | null> => {
      if (!user || !canSyncCloud || status === 'সুরক্ষিত') return docId;
      const nextContent = overrides?.content ?? content;
      const nextOriginal = overrides?.originalText ?? (originalText || nextContent);
      const nextIssues = overrides?.issues ?? issues;
      const nextStatus = overrides?.status ?? status;
      const nextTitle = (overrides?.title ?? title).trim() || 'শিরোনামহীন পান্ডুলিপি';
      const nextCat = overrides?.category ?? category;
      const nextFile = overrides?.sourceFileName ?? sourceFileName;

      try {
        let savedId = docId;
        if (!savedId) {
          savedId = await createManuscript(user.uid, {
            title: nextTitle,
            category: nextCat,
            content: nextContent,
            originalText: nextOriginal,
            sourceFileName: nextFile,
          });
          if (nextIssues.length > 0 || nextStatus !== 'খসড়া') {
            await saveManuscript(savedId, {
              title: nextTitle,
              category: nextCat,
              originalText: nextOriginal,
              content: nextContent,
              issues: nextIssues,
              status: nextStatus,
              sourceFileName: nextFile,
            });
          }
          setDocId(savedId);
        } else {
          await saveManuscript(savedId, {
            title: nextTitle,
            category: nextCat,
            originalText: nextOriginal,
            content: nextContent,
            issues: nextIssues,
            status: nextStatus,
            sourceFileName: nextFile,
          });
        }
        if (!originalText && nextContent) {
          setOriginalText(nextContent);
        }
        setDirty(false);
        if (!silent) {
          notify('পান্ডুলিপি সংরক্ষিত হয়েছে।', 'success');
        }
        return savedId;
      } catch (err) {
        if (!silent) {
          notify(err instanceof Error ? err.message : 'সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
        }
        return docId;
      }
    },
    [
      user,
      canSyncCloud,
      status,
      docId,
      content,
      originalText,
      issues,
      title,
      category,
      sourceFileName,
      notify,
    ]
  );

  // Automatic save debounce
  useEffect(() => {
    if (!autoSaveEnabled || !dirty || !canSyncCloud || status === 'সুরক্ষিত') return;
    if (!content.trim() && !title.trim()) return;
    const t = setTimeout(() => {
      void persistCurrentManuscript(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [autoSaveEnabled, dirty, canSyncCloud, status, content, title, persistCurrentManuscript]);

  const handleStartNewManuscript = (initial?: {
    title?: string;
    category?: ManuscriptCategory;
    content?: string;
    openUploadPicker?: boolean;
  }) => {
    setDocId(null);
    setTitle(initial?.title ?? 'নতুন পান্ডুলিপি');
    setCategory(initial?.category ?? 'গল্প');
    setOriginalText(initial?.content ?? '');
    setContent(initial?.content ?? '');
    setIssues([]);
    setAiSummary('');
    setStatus('খসড়া');
    setSourceFileName('');
    setUndoStack([]);
    setRedoStack([]);
    setDirty(Boolean(initial?.content));
    setOpenUploadPickerOnMount(Boolean(initial?.openUploadPicker));
    navigateTo('editor');
  };

  const handleOpenManuscript = (ms: Manuscript) => {
    setDocId(ms.id);
    setTitle(ms.title);
    setCategory(ms.category);
    setOriginalText(ms.originalText || ms.content);
    setContent(ms.content);
    setIssues(ms.issues || []);
    setAiSummary('');
    setStatus(ms.status);
    setSourceFileName(ms.sourceFileName || '');
    setUndoStack([]);
    setRedoStack([]);
    setDirty(false);
    setOpenUploadPickerOnMount(false);
    navigateTo('editor');
  };

  const handleRenameManuscript = async (ms: Manuscript, newTitle: string) => {
    await saveManuscript(ms.id, {
      title: newTitle,
      category: ms.category,
      originalText: ms.originalText || ms.content,
      content: ms.content,
      issues: ms.issues,
      status: ms.status,
      sourceFileName: ms.sourceFileName,
    });
    if (docId === ms.id) {
      setTitle(newTitle);
    }
  };

  const handleDeleteManuscript = async (id: string) => {
    try {
      await deleteManuscript(id);
      if (docId === id) {
        setDocId(null);
      }
      notify('পান্ডুলিপিটি মুছে ফেলা হয়েছে।', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'মুছে ফেলা যায়নি।', 'error');
    }
  };

  const handleRunProofread = async () => {
    if (!isOnline) {
      notify('এআই প্রুফরিডিংয়ের জন্য ইন্টারনেট সংযোগ প্রয়োজন।', 'error');
      return;
    }
    if (!content.trim()) {
      notify('প্রুফরিড করার জন্য আগে বাংলা লেখা দিন।', 'error');
      return;
    }

    setProofreading(true);
    try {
      const res = await fetch('/api/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          category: category === 'কবিতা' ? 'বাংলা কবিতা' : 'বাংলা গল্প ও উপন্যাস',
          preferences: {
            spellingStandard: profile?.spellingStandard ?? 'bangla_academy',
            literaryStrictness: profile?.literaryStrictness ?? 'balanced',
            preservePoeticLicense: profile?.preservePoeticLicense ?? true,
            preserveRegionalDialects: profile?.preserveRegionalDialects ?? true,
          },
        }),
      });
      const data = (await res.json()) as {
        summary?: string;
        issues?: ProofreadIssue[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'এআই প্রুফরিডিং ব্যর্থ হয়েছে।');
      }

      const incoming = (data.issues || []).map((iss) => ({
        ...iss,
        status: 'pending' as const,
      }));
      const preservedOriginal = originalText || content;
      setOriginalText(preservedOriginal);
      setIssues(incoming);
      setAiSummary(data.summary || '');
      setStatus('প্রুফরিড সম্পন্ন');
      setDirty(true);

      const savedId = await persistCurrentManuscript(true, {
        originalText: preservedOriginal,
        content,
        issues: incoming,
        status: 'প্রুফরিড সম্পন্ন',
      });

      if (savedId && user && canSyncCloud) {
        await createRevisionSnapshot(user.uid, savedId, {
          chapterTitle: category === 'কবিতা' ? 'বাংলা কবিতা' : 'বাংলা গল্প ও উপন্যাস',
          originalText: preservedOriginal,
          correctedText: content,
          issuesCount: incoming.length,
          acceptedCount: 0,
          rejectedCount: 0,
          note:
            data.summary ||
            `মোট ${toBengaliDigits(incoming.length)}টি পরামর্শ শনাক্ত করা হয়েছে।`,
        });
      }

      notify(
        incoming.length > 0
          ? `মোট ${toBengaliDigits(incoming.length)}টি পরামর্শ পাওয়া গেছে।`
          : 'কোনো ভুল পাওয়া যায়নি!',
        'success'
      );
      navigateTo('results');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'প্রুফরিডিং সম্পন্ন করা যায়নি।', 'error');
    } finally {
      setProofreading(false);
    }
  };

  const handleAcceptIssue = (id: string) => {
    const target = issues.find((i) => i.id === id);
    if (!target || target.status !== 'pending') return;
    const idx = content.indexOf(target.original);
    pushUndo(content, issues);
    if (idx !== -1) {
      const nextContent =
        content.slice(0, idx) + target.suggestion + content.slice(idx + target.original.length);
      setContent(nextContent);
    }
    setIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'accepted' } : item))
    );
    setDirty(true);
  };

  const handleRejectIssue = (id: string) => {
    pushUndo(content, issues);
    setIssues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );
    setDirty(true);
  };

  const handleAcceptAll = () => {
    const pending = issues.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;
    pushUndo(content, issues);
    let nextContent = content;
    for (const iss of pending) {
      const idx = nextContent.indexOf(iss.original);
      if (idx !== -1) {
        nextContent =
          nextContent.slice(0, idx) + iss.suggestion + nextContent.slice(idx + iss.original.length);
      }
    }
    setContent(nextContent);
    setIssues((prev) =>
      prev.map((item) => (item.status === 'pending' ? { ...item, status: 'accepted' } : item))
    );
    setDirty(true);
    notify(`${toBengaliDigits(pending.length)}টি সংশোধন গ্রহণ করা হয়েছে।`, 'success');
  };

  const handleRestoreOriginal = () => {
    if (!originalText) return;
    pushUndo(content, issues);
    setContent(originalText);
    setIssues((prev) => prev.map((item) => ({ ...item, status: 'pending' })));
    setDirty(true);
    notify('মূল পান্ডুলিপি ফিরিয়ে আনা হয়েছে।', 'info');
  };

  // Show premium Splash Screen while initializing
  if (!authReady || !splashDone) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  const authorName =
    profile?.displayName || user.displayName || user.email?.split('@')[0] || 'লেখক';

  const bottomNavItems: {
    id: AppView;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'হোম', icon: Home },
    { id: 'editor', label: 'নতুন লেখা', icon: PenSquare },
    { id: 'manuscripts', label: 'আমার পান্ডুলিপি', icon: FolderOpen },
    { id: 'history', label: 'ইতিহাস', icon: History },
    { id: 'settings', label: 'সেটিংস', icon: Settings },
  ];

  const activeNavId: AppView = view === 'results' ? 'editor' : view;

  return (
    <div className="h-dvh w-full bg-[#F6F5F0] dark:bg-[#0F1311] text-[#1C211E] dark:text-[#ECEBE6] flex flex-col lg:flex-row overflow-hidden">
      {/* Desktop Material 3 Compact Navigation Rail (Native Tablet/Desktop App Style, NOT a Website Sidebar) */}
      <aside className="hidden lg:flex w-[88px] shrink-0 bg-[#EFECE5] dark:bg-[#141916] border-r border-[#E2DFD6] dark:border-[#222A25] flex-col items-center py-5 justify-between">
        <div className="flex flex-col items-center gap-6 w-full px-2">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            title="Sobdosuddhi 1.0"
            className="w-11 h-11 rounded-2xl overflow-hidden bg-[#1E4D3B] flex items-center justify-center shadow-xs"
          >
            <img
              src="/pwa-192x192.png"
              alt="Sobdosuddhi 1.0"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>

          <nav className="flex flex-col items-center gap-2 w-full">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'editor' && view !== 'editor' && view !== 'results') {
                      setOpenUploadPickerOnMount(false);
                    }
                    navigateTo(item.id);
                  }}
                  className="w-full flex flex-col items-center gap-1 py-1.5 group"
                >
                  <span
                    className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-[#C9E2D7] dark:bg-[#1F3A2E] text-[#163B2D] dark:text-[#86D5B4]'
                        : 'text-[#525B55] dark:text-[#96A19A] group-hover:bg-[#E4E0D6] dark:group-hover:bg-[#1E2521]'
                    }`}
                  >
                    <Icon className="w-[19px] h-[19px]" />
                  </span>
                  <span
                    className={`text-[10px] leading-tight text-center px-0.5 ${
                      active
                        ? 'font-bold text-[#163B2D] dark:text-[#86D5B4]'
                        : 'font-medium text-[#5A635D] dark:text-[#8E9992]'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="w-9 h-9 rounded-full bg-[#1E4D3B] text-white text-xs font-bold flex items-center justify-center">
          {authorName.charAt(0)}
        </div>
      </aside>

      {/* Main Native Screen Viewport */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden">
        {/* Offline Connectivity Bar */}
        {!isOnline && (
          <div className="shrink-0 bg-amber-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>অফলাইন মোড — সংরক্ষিত লেখা পড়া ও সম্পাদনা করা যাবে</span>
          </div>
        )}

        {/* Email Verification Notice if unverified */}
        {!canSyncCloud && (
          <div className="shrink-0 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900 px-4 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-1.5 truncate">
              <MailCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ক্লাউড সংরক্ষণের জন্য ইমেইল যাচাই করুন</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await resendVerificationEmail();
                    notify('যাচাই লিংক পাঠানো হয়েছে।', 'success');
                  } catch {
                    notify('কিছুক্ষণ পর চেষ্টা করুন।', 'error');
                  }
                }}
                className="underline font-semibold"
              >
                লিংক পাঠান
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await refreshUserVerification();
                  notify(ok ? 'ইমেইল যাচাই সম্পন্ন!' : 'এখনো যাচাইকৃত নয়।', ok ? 'success' : 'info');
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-900 text-white font-semibold"
              >
                রিফ্রেশ
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {view === 'home' && (
            <HomeScreen
              authorName={authorName}
              manuscripts={manuscripts}
              loading={loadingManuscripts}
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              onNewManuscript={handleStartNewManuscript}
              onOpenManuscript={handleOpenManuscript}
              onNavigate={navigateTo}
            />
          )}

          {view === 'editor' && (
            <EditorScreen
              docId={docId}
              title={title}
              category={category}
              content={content}
              originalText={originalText}
              issues={issues}
              status={status}
              sourceFileName={sourceFileName}
              fontSize={fontSize}
              autoSaveEnabled={autoSaveEnabled}
              canSyncCloud={canSyncCloud}
              openUploadPickerOnMount={openUploadPickerOnMount}
              proofreading={proofreading}
              onBack={() => navigateTo('home')}
              onChangeTitle={(t) => {
                setTitle(t);
                setDirty(true);
              }}
              onChangeCategory={(c) => {
                setCategory(c);
                setDirty(true);
              }}
              onChangeContent={(nextText, forceUndo) => {
                const clamped = nextText.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
                if (!originalText && clamped.trim()) {
                  setOriginalText(clamped);
                }
                if (forceUndo || Math.abs(clamped.length - content.length) >= 12) {
                  pushUndo(content, issues);
                }
                setContent(clamped);
                setDirty(true);
              }}
              onFileImported={(imported) => {
                pushUndo(content, issues);
                setContent(imported.text);
                setOriginalText(imported.text);
                setIssues([]);
                if (!title.trim() || title === 'নতুন পান্ডুলিপি') {
                  setTitle(imported.title);
                }
                setSourceFileName(imported.fileName);
                setOpenUploadPickerOnMount(false);
                setDirty(true);
              }}
              onRemoveFile={() => {
                setSourceFileName('');
                setOpenUploadPickerOnMount(false);
                setDirty(true);
              }}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onUndo={() => {
                if (undoStack.length === 0) return;
                const prev = undoStack[undoStack.length - 1];
                setRedoStack((r) => [...r, { content, issues }]);
                setUndoStack((u) => u.slice(0, -1));
                setContent(prev.content);
                setIssues(prev.issues);
                setDirty(true);
              }}
              onRedo={() => {
                if (redoStack.length === 0) return;
                const next = redoStack[redoStack.length - 1];
                setUndoStack((u) => [...u, { content, issues }]);
                setRedoStack((r) => r.slice(0, -1));
                setContent(next.content);
                setIssues(next.issues);
                setDirty(true);
              }}
              onSaveNow={async (silent) => {
                await persistCurrentManuscript(silent);
              }}
              onRunProofread={handleRunProofread}
              onOpenResults={() => navigateTo('results')}
              onNotify={notify}
            />
          )}

          {view === 'results' && (
            <ProofreadResultsScreen
              title={title}
              category={category}
              originalText={originalText || content}
              content={content}
              issues={issues}
              summary={aiSummary}
              fontSize={fontSize}
              isLocked={status === 'সুরক্ষিত'}
              onBackToEditor={() => navigateTo('editor')}
              onAcceptIssue={handleAcceptIssue}
              onRejectIssue={handleRejectIssue}
              onAcceptAll={handleAcceptAll}
              onRestoreOriginal={handleRestoreOriginal}
              onNotify={notify}
            />
          )}

          {view === 'manuscripts' && (
            <MyManuscriptsScreen
              manuscripts={manuscripts}
              loading={loadingManuscripts}
              onNewManuscript={() => handleStartNewManuscript()}
              onOpenManuscript={handleOpenManuscript}
              onRenameManuscript={handleRenameManuscript}
              onDeleteManuscript={handleDeleteManuscript}
              onNotify={notify}
            />
          )}

          {view === 'history' && (
            <HistoryView
              uid={user.uid}
              manuscripts={manuscripts}
              onOpenManuscript={handleOpenManuscript}
              onNotify={notify}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              fontSize={fontSize}
              onChangeFontSize={handleFontSizeChange}
              onNotify={notify}
            />
          )}
        </div>
      </main>

      {/* Fixed Native Android Material Design 3 Bottom Navigation Bar (5 Tabs) */}
      <nav
        aria-label="মূল নেভিগেশন"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F5]/95 dark:bg-[#141916]/95 backdrop-blur-md border-t border-[#E4E1D8] dark:border-[#232B26] pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeNavId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'editor' && view !== 'editor' && view !== 'results') {
                    setOpenUploadPickerOnMount(false);
                  }
                  navigateTo(item.id);
                }}
                className="flex flex-col items-center justify-center gap-1 min-h-[48px] active:scale-95 transition-transform"
              >
                <span
                  className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                    active
                      ? 'bg-[#CFE6DC] dark:bg-[#1F3A2E] text-[#163B2D] dark:text-[#86D5B4]'
                      : 'text-[#5A635D] dark:text-[#96A19A]'
                  }`}
                >
                  <Icon className="w-[19px] h-[19px]" />
                </span>
                <span
                  className={`text-[10px] leading-none truncate max-w-full px-0.5 ${
                    active
                      ? 'font-bold text-[#163B2D] dark:text-[#86D5B4]'
                      : 'font-medium text-[#5A635D] dark:text-[#8E9992]'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Android Material 3 Snackbar Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md px-4 py-3 rounded-2xl text-xs font-medium shadow-xl flex items-center gap-2 animate-m3-sheet ${
            toast.type === 'error'
              ? 'bg-red-700 text-white'
              : toast.type === 'success'
                ? 'bg-[#163B2D] dark:bg-[#2A6850] text-white'
                : 'bg-[#1C211E] dark:bg-[#ECEBE6] text-white dark:text-[#1C211E]'
          }`}
        >
          <Feather className="w-3.5 h-3.5 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SobdosuddhiNativeApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
