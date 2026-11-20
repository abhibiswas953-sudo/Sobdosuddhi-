import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleTap = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleTap()}
        className={
          compact
            ? 'min-h-[40px] px-3 py-1.5 rounded-full bg-[#E3EFE9] dark:bg-[#1E332A] text-[#1E4D3B] dark:text-[#86D5B4] text-xs font-semibold inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform whitespace-nowrap shrink-0'
            : 'w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#1E4D3B] hover:bg-[#163B2D] dark:bg-[#2E7358] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform'
        }
      >
        <Smartphone className="w-4 h-4 shrink-0" />
        <span>{compact ? 'ইনস্টল' : 'অ্যাপ হিসেবে ইনস্টল করুন'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#181D1A] rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl animate-m3-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-[#D8D4C9] dark:bg-[#323C36] rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-literary text-lg font-bold text-[#1C211E] dark:text-[#ECEBE6]">
                ফোনে Sobdosuddhi 1.0 ইনস্টল করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A635D] hover:bg-[#EFECE5] dark:hover:bg-[#242C27]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="text-sm text-[#47504A] dark:text-[#B4BEB8] space-y-2.5 leading-relaxed list-decimal list-inside">
                <li>Safari ব্রাউজারের নিচে থাকা <strong>Share</strong> আইকনে ট্যাপ করুন।</li>
                <li>নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।</li>
                <li>উপরের ডানদিকে <strong>Add</strong> ট্যাপ করলে এটি নেটিভ অ্যাপ হিসেবে যুক্ত হবে।</li>
              </ol>
            ) : (
              <ol className="text-sm text-[#47504A] dark:text-[#B4BEB8] space-y-2.5 leading-relaxed list-decimal list-inside">
                <li>আপনার Android Chrome ব্রাউজারের উপরের ডানদিকে <strong>⋮ মেনু</strong> ট্যাপ করুন।</li>
                <li><strong>Install app</strong> অথবা <strong>Add to Home screen</strong> নির্বাচন করুন।</li>
                <li>ইনস্টল সম্পন্ন হলে হোম স্ক্রিন থেকে কোনো ব্রাউজার বার ছাড়াই সরাসরি অ্যাপ হিসেবে ব্যবহার করতে পারবেন।</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[46px] rounded-2xl bg-[#1E4D3B] text-white text-sm font-medium active:scale-[0.98] transition-transform"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}
    </>
  );
}
