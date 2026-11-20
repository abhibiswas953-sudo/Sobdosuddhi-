import React, { useState } from 'react';
import {
  Save,
  LogOut,
  KeyRound,
  Moon,
  Sun,
  ShieldCheck,
  Info,
  Mail,
  ChevronRight,
  X,
  Type as TypeIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { EditorFontSize, LiteraryStrictness, SpellingStandard } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  fontSize: EditorFontSize;
  onChangeFontSize: (size: EditorFontSize) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type InfoSheetType = 'privacy' | 'about' | 'contact' | null;

export function SettingsView({ fontSize, onChangeFontSize, onNotify }: SettingsViewProps) {
  const { user, profile, darkMode, toggleDarkMode, updatePreferences, resetPassword, signOut } =
    useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [spellingStandard, setSpellingStandard] = useState<SpellingStandard>(
    profile?.spellingStandard || 'bangla_academy'
  );
  const [literaryStrictness, setLiteraryStrictness] = useState<LiteraryStrictness>(
    profile?.literaryStrictness || 'balanced'
  );
  const [preservePoeticLicense, setPreservePoeticLicense] = useState<boolean>(
    profile?.preservePoeticLicense ?? true
  );
  const [preserveRegionalDialects, setPreserveRegionalDialects] = useState<boolean>(
    profile?.preserveRegionalDialects ?? true
  );
  const [autoSave, setAutoSave] = useState<boolean>(profile?.autoSave ?? true);
  const [saving, setSaving] = useState(false);
  const [infoSheet, setInfoSheet] = useState<InfoSheetType>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePreferences({
        displayName: displayName.trim() || 'লেখক',
        spellingStandard,
        literaryStrictness,
        preservePoeticLicense,
        preserveRegionalDialects,
        autoSave,
        darkMode,
      });
      onNotify('সেটিংস সংরক্ষিত হয়েছে।', 'success');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'সেটিংস সংরক্ষণ করা যায়নি।', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      onNotify('পাসওয়ার্ড পরিবর্তনের লিংক আপনার ইমেইলে পাঠানো হয়েছে।', 'success');
    } catch {
      onNotify('পাসওয়ার্ড রিসেট ইমেইল পাঠাতে সমস্যা হয়েছে।', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Native Android Top App Bar */}
      <header className="shrink-0 h-14 px-4 sm:px-6 pt-safe bg-[#F6F5F0]/90 dark:bg-[#0F1311]/90 backdrop-blur-md border-b border-[#E7E4DC]/80 dark:border-[#202723] flex items-center justify-between">
        <h1 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
          সেটিংস
        </h1>
        <span className="text-xs text-[#6B746E] dark:text-[#8E9992] tabular-nums">v1.0.0</span>
      </header>

      <div className="flex-1 app-scroll px-4 sm:px-6 py-4 pb-24 lg:pb-8">
        <form
          onSubmit={handleSaveSettings}
          className="max-w-3xl mx-auto space-y-5 animate-m3-screen"
        >
          {/* Install App Card (if not standalone) */}
          <PWAInstallButton />

          {/* Appearance & Font Size */}
          <section className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 space-y-5">
            <h2 className="text-xs font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
              প্রদর্শন ও ফন্ট
            </h2>

            {/* Dark / Light Mode */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F2F0E9] dark:bg-[#202723] flex items-center justify-center text-[#1E4D3B] dark:text-[#7CD0AE]">
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                    {darkMode ? 'ডার্ক মোড চালু' : 'লাইট মোড চালু'}
                  </p>
                  <p className="text-[11px] text-[#6B746E] dark:text-[#8E9992]">
                    রাতের পড়ার জন্য চোখের আরামদায়ক থিম
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`w-13 h-8 rounded-full p-1 transition-colors ${
                  darkMode ? 'bg-[#1E4D3B]' : 'bg-[#D6D3C9]'
                }`}
                aria-label="থিম পরিবর্তন করুন"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-xs transition-transform ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Font Size Adjustment */}
            <div className="pt-4 border-t border-[#F0EDE6] dark:border-[#232B26] space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                <TypeIcon className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
                <span>সম্পাদকের বাংলা ফন্টের আকার</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#F2F0E9] dark:bg-[#1E2521]">
                {(
                  [
                    { id: 'sm', label: 'ছোট' },
                    { id: 'md', label: 'স্বাভাবিক' },
                    { id: 'lg', label: 'বড়' },
                    { id: 'xl', label: 'অতি বড়' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeFontSize(opt.id)}
                    className={`min-h-[38px] rounded-xl text-xs font-semibold transition-colors ${
                      fontSize === opt.id
                        ? 'bg-white dark:bg-[#2A342F] text-[#1E4D3B] dark:text-[#7CD0AE] shadow-2xs'
                        : 'text-[#5A635D] dark:text-[#9BA69F]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0EDE6] dark:border-[#232B26] flex items-center justify-between text-xs text-[#5A635D] dark:text-[#9BA69F]">
              <span>ইন্টারফেস ভাষা</span>
              <span className="font-semibold text-[#1C211E] dark:text-[#ECEBE6]">বাংলা (নির্ধারিত)</span>
            </div>
          </section>

          {/* Bengali Proofreading Rules */}
          <section className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
              বাংলা প্রুফরিডিং পছন্দ
            </h2>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#47504A] dark:text-[#B4BEB8]">
                মানক বাংলা বানান রীতি
              </label>
              <select
                value={spellingStandard}
                onChange={(e) => setSpellingStandard(e.target.value as SpellingStandard)}
                className="w-full min-h-[46px] px-3.5 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] text-sm focus:outline-none focus:border-[#1E4D3B]"
              >
                <option value="bangla_academy">বাংলা একাডেমি আধুনিক বানান (ঢাকা)</option>
                <option value="paschimbanga_academy">পশ্চিমবঙ্গ বাংলা আকাদেমি বানান (কলকাতা)</option>
                <option value="rabindrik_sahitya">চিরায়ত ও রাবীন্দ্রিক সাহিত্য বানান</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#47504A] dark:text-[#B4BEB8]">
                পরামর্শের গভীরতা
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F2F0E9] dark:bg-[#1E2521]">
                {(
                  [
                    { id: 'conservative', label: 'সংরক্ষণশীল' },
                    { id: 'balanced', label: 'ভারসাম্যপূর্ণ' },
                    { id: 'thorough', label: 'নিবিড়' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLiteraryStrictness(opt.id)}
                    className={`min-h-[38px] rounded-xl text-xs font-semibold transition-colors ${
                      literaryStrictness === opt.id
                        ? 'bg-white dark:bg-[#2A342F] text-[#1E4D3B] dark:text-[#7CD0AE] shadow-2xs'
                        : 'text-[#5A635D] dark:text-[#9BA69F]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-[#1C211E] dark:text-[#ECEBE6]">
                  কবিতার ছন্দ ও কাব্যিক স্বাধীনতা সংরক্ষণ
                </span>
                <input
                  type="checkbox"
                  checked={preservePoeticLicense}
                  onChange={(e) => setPreservePoeticLicense(e.target.checked)}
                  className="w-4 h-4 accent-[#1E4D3B]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-[#1C211E] dark:text-[#ECEBE6]">
                  আঞ্চলিক ও কথ্য বাংলা সংরক্ষণ
                </span>
                <input
                  type="checkbox"
                  checked={preserveRegionalDialects}
                  onChange={(e) => setPreserveRegionalDialects(e.target.checked)}
                  className="w-4 h-4 accent-[#1E4D3B]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-[#1C211E] dark:text-[#ECEBE6]">
                  স্বয়ংক্রিয় সংরক্ষণ (Auto-save)
                </span>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="w-4 h-4 accent-[#1E4D3B]"
                />
              </label>
            </div>
          </section>

          {/* Account Settings */}
          <section className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#1E4D3B] dark:text-[#7CD0AE]">
              অ্যাকাউন্ট সেটিংস
            </h2>

            <div className="space-y-3 select-text">
              <div>
                <label className="block text-xs text-[#5A635D] dark:text-[#9BA69F] mb-1">
                  লেখক নাম
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] text-sm focus:outline-none focus:border-[#1E4D3B]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5A635D] dark:text-[#9BA69F] mb-1">
                  ইমেইল
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full min-h-[44px] px-3.5 rounded-2xl bg-[#EFECE5] dark:bg-[#141916] text-xs text-[#6B746E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>

            <div className="flex items-center gap-2 pt-1">
              {user?.providerData.some((p) => p.providerId === 'password') && (
                <button
                  type="button"
                  onClick={() => void handlePasswordReset()}
                  className="flex-1 min-h-[44px] rounded-2xl border border-[#DCD8CE] dark:border-[#2E3732] text-xs font-semibold text-[#47504A] dark:text-[#B4BEB8] inline-flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>পাসওয়ার্ড পরিবর্তন</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex-1 min-h-[44px] rounded-2xl border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-700 dark:text-red-400 inline-flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            </div>
          </section>

          {/* App Information, Privacy Policy & Support */}
          <section className="rounded-3xl bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] divide-y divide-[#F0EDE6] dark:divide-[#232B26] overflow-hidden">
            <button
              type="button"
              onClick={() => setInfoSheet('privacy')}
              className="w-full min-h-[54px] px-5 flex items-center justify-between text-left hover:bg-[#FAF9F6] dark:hover:bg-[#1D2420]"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-[#1C211E] dark:text-[#ECEBE6]">
                <ShieldCheck className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
                <span>গোপনীয়তা নীতি (Privacy Policy)</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#8A948E]" />
            </button>

            <button
              type="button"
              onClick={() => setInfoSheet('about')}
              className="w-full min-h-[54px] px-5 flex items-center justify-between text-left hover:bg-[#FAF9F6] dark:hover:bg-[#1D2420]"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-[#1C211E] dark:text-[#ECEBE6]">
                <Info className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
                <span>অ্যাপ সম্পর্কে</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#8A948E]" />
            </button>

            <button
              type="button"
              onClick={() => setInfoSheet('contact')}
              className="w-full min-h-[54px] px-5 flex items-center justify-between text-left hover:bg-[#FAF9F6] dark:hover:bg-[#1D2420]"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-[#1C211E] dark:text-[#ECEBE6]">
                <Mail className="w-4 h-4 text-[#1E4D3B] dark:text-[#7CD0AE]" />
                <span>যোগাযোগ ও সহায়তা</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#8A948E]" />
            </button>

            <div className="min-h-[50px] px-5 flex items-center justify-between text-xs text-[#6B746E] dark:text-[#8E9992] tabular-nums">
              <span>অ্যাপ সংস্করণ</span>
              <span className="font-semibold text-[#1C211E] dark:text-[#ECEBE6]">
                Sobdosuddhi 1.0 (1.0.0)
              </span>
            </div>
          </section>
        </form>
      </div>

      {/* Material 3 Information Bottom Sheet */}
      {infoSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInfoSheet(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#171C19] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet space-y-4"
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                {infoSheet === 'privacy' && 'গোপনীয়তা নীতি'}
                {infoSheet === 'about' && 'Sobdosuddhi 1.0 সম্পর্কে'}
                {infoSheet === 'contact' && 'যোগাযোগ ও সহায়তা'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoSheet(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A635D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {infoSheet === 'privacy' && (
              <div className="text-xs sm:text-sm text-[#47504A] dark:text-[#B4BEB8] space-y-2.5 leading-relaxed">
                <p>
                  আপনার প্রতিটি বাংলা পান্ডুলিপি, কবিতা, গল্প ও উপন্যাস সম্পূর্ণভাবে আপনার ব্যক্তিগত
                  অ্যাকাউন্টে সুরক্ষিত থাকে। অন্য কোনো ব্যবহারকারী আপনার লেখা দেখতে পারেন না।
                </p>
                <p>
                  এআই প্রুফরিডিংয়ের সময় লেখাটি কেবল সুরক্ষিত সার্ভার সংযোগের মাধ্যমে বিশ্লেষণ করা হয়
                  এবং আপনার অনুমতি ছাড়া কখনোই মূল পান্ডুলিপি পরিবর্তন করা হয় না।
                </p>
              </div>
            )}

            {infoSheet === 'about' && (
              <div className="text-xs sm:text-sm text-[#47504A] dark:text-[#B4BEB8] space-y-2.5 leading-relaxed">
                <p className="font-literary font-semibold text-[#1E4D3B] dark:text-[#7CD0AE]">
                  Sobdosuddhi 1.0 — বাংলা লেখার নির্ভরযোগ্য প্রুফরিডার।
                </p>
                <p>
                  বাংলা কবি, গল্পকার, ঔপন্যাসিক ও সম্পাদকদের জন্য নির্মিত আধুনিক প্রুফরিডিং
                  অ্যাপ্লিকেশন। সংস্করণ: ১.০.০ (Package ID: com.sobdosuddhi.app)।
                </p>
              </div>
            )}

            {infoSheet === 'contact' && (
              <div className="text-xs sm:text-sm text-[#47504A] dark:text-[#B4BEB8] space-y-2.5 leading-relaxed">
                <p>
                  যেকোনো কারিগরি সহায়তা, পরামর্শ বা বাংলা বানান সংক্রান্ত মতামতের জন্য আমাদের সাথে
                  যোগাযোগ করুন:
                </p>
                <p className="font-semibold text-[#1C211E] dark:text-[#ECEBE6] select-text">
                  ইমেইল: support@sobdosuddhi.app
                </p>
                <p className="text-xs text-[#6B746E] dark:text-[#8E9992]">
                  আমরা সাধারণত ২৪ কর্মঘণ্টার মধ্যে উত্তর দিয়ে থাকি।
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setInfoSheet(null)}
              className="w-full min-h-[44px] rounded-2xl bg-[#1E4D3B] text-white text-sm font-semibold"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
