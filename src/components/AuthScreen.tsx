import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Moon, Sun, Feather } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

type AuthMode = 'login' | 'register' | 'reset';

function mapAuthErrorToBengali(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। পুনরায় যাচাই করুন।';
    case 'auth/email-already-in-use':
      return 'এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।';
    case 'auth/weak-password':
      return 'কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
    case 'auth/invalid-email':
      return 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।';
    case 'auth/popup-closed-by-user':
      return 'গুগল সাইন-ইন বাতিল করা হয়েছে। আবার চেষ্টা করুন।';
    case 'auth/operation-not-allowed':
      return 'ইমেইল লগইন চালু করতে Firebase Console > Authentication > Sign-in method থেকে Email/Password সক্রিয় করুন, অথবা গুগল দিয়ে প্রবেশ করুন।';
    case 'auth/too-many-requests':
      return 'অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে স্থগিত। কিছুক্ষণ পর চেষ্টা করুন।';
    default:
      return 'অ্যাকাউন্ট প্রবেশে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
  }
}

export function AuthScreen() {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    darkMode,
    toggleDarkMode,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [iconError, setIconError] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(mapAuthErrorToBengali(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার ইমেইল লিখুন।');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!password) {
          setErrorMsg('অনুগ্রহ করে পাসওয়ার্ড লিখুন।');
          setLoading(false);
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('অনুগ্রহ করে আপনার নাম লিখুন।');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
          setLoading(false);
          return;
        }
        await registerWithEmail(name, email, password);
      } else {
        await resetPassword(email);
        setSuccessMsg('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।');
      }
    } catch (err) {
      setErrorMsg(mapAuthErrorToBengali(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh w-full bg-[#F6F5F0] dark:bg-[#0F1311] text-[#1C211E] dark:text-[#ECEBE6] flex flex-col overflow-hidden">
      {/* Native App Top Utility Strip */}
      <div className="shrink-0 h-14 px-4 pt-safe flex items-center justify-between">
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'আলো মোড' : 'ডার্ক মোড'}
          className="w-11 h-11 rounded-full flex items-center justify-center text-[#47504A] dark:text-[#B4BEB8] hover:bg-[#EAE7DF] dark:hover:bg-[#1E2521] active:scale-95 transition-transform"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Centered Material 3 Native Sign-In Screen */}
      <div className="flex-1 app-scroll px-5 pb-8 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto animate-m3-screen">
          {/* App Identity Header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-[#1E4D3B]/15 bg-[#1E4D3B] flex items-center justify-center mb-4">
              {!iconError ? (
                <img
                  src="/pwa-192x192.png"
                  alt="Sobdosuddhi 1.0"
                  onError={() => setIconError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Feather className="w-8 h-8 text-[#F8F7F4]" />
              )}
            </div>
            <h1 className="font-literary text-2xl font-bold tracking-tight text-[#1C211E] dark:text-[#ECEBE6]">
              Sobdosuddhi 1.0
            </h1>
            <p className="text-xs text-[#1E4D3B] dark:text-[#7CD0AE] font-medium mt-1">
              বাংলা লেখার নির্ভরযোগ্য প্রুফরিডার।
            </p>
          </div>

          {/* Material 3 Surface Card */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E6E3DA] dark:border-[#262E29] rounded-3xl p-6 shadow-xs space-y-5">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F2F0E9] dark:bg-[#1E2521]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
                  mode === 'login' || mode === 'reset'
                    ? 'bg-white dark:bg-[#2A342F] text-[#1C211E] dark:text-[#ECEBE6] shadow-2xs'
                    : 'text-[#5A635D] dark:text-[#9BA69F]'
                }`}
              >
                লগইন
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`min-h-[40px] rounded-xl text-xs font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#2A342F] text-[#1C211E] dark:text-[#ECEBE6] shadow-2xs'
                    : 'text-[#5A635D] dark:text-[#9BA69F]'
                }`}
              >
                নতুন অ্যাকাউন্ট
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 text-xs text-red-800 dark:text-red-300 leading-relaxed"
              >
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                role="status"
                className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed"
              >
                {successMsg}
              </div>
            )}

            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={loading}
                  className="w-full min-h-[48px] flex items-center justify-center gap-3 px-4 rounded-2xl bg-[#F6F5F0] dark:bg-[#202723] hover:bg-[#ECEAE2] dark:hover:bg-[#28312C] border border-[#E2DFD6] dark:border-[#2E3832] text-sm font-semibold text-[#1C211E] dark:text-[#ECEBE6] active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>গুগল দিয়ে প্রবেশ করুন</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#ECEAE2] dark:border-[#262E29]" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="px-3 bg-white dark:bg-[#171C19] text-[#757E78] dark:text-[#8E9992]">
                      অথবা ইমেইল
                    </span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 select-text">
              {mode === 'register' && (
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#757E78] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="আপনার লেখক নাম"
                    maxLength={120}
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] focus:outline-none focus:border-[#1E4D3B] dark:focus:border-[#5CB490] text-sm"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="w-4 h-4 text-[#757E78] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ইমেইল ঠিকানা"
                  autoComplete="email"
                  className="w-full min-h-[48px] pl-11 pr-4 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] focus:outline-none focus:border-[#1E4D3B] dark:focus:border-[#5CB490] text-sm"
                />
              </div>

              {mode !== 'reset' && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#757E78] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full min-h-[48px] pl-11 pr-4 rounded-2xl bg-[#F6F5F0] dark:bg-[#111513] border border-[#E2DFD6] dark:border-[#2A332D] focus:outline-none focus:border-[#1E4D3B] dark:focus:border-[#5CB490] text-sm"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-[#1E4D3B] dark:text-[#7CD0AE] font-medium py-1"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <span>
                  {loading
                    ? 'অপেক্ষা করুন...'
                    : mode === 'login'
                      ? 'প্রবেশ করুন'
                      : mode === 'register'
                        ? 'অ্যাকাউন্ট তৈরি করুন'
                        : 'রিসেট লিংক পাঠান'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full min-h-[44px] text-xs font-medium text-[#5A635D] dark:text-[#9BA69F]"
                >
                  লগইনে ফিরে যান
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
