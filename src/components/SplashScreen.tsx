import React, { useState } from 'react';
import { Feather } from 'lucide-react';

export function SplashScreen() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="h-dvh w-full bg-[#F6F5F0] dark:bg-[#0F1311] flex flex-col items-center justify-between px-6 py-12 pt-safe pb-safe">
      <div />

      <div className="flex flex-col items-center text-center animate-m3-screen">
        <div className="w-24 h-24 rounded-[28px] overflow-hidden shadow-lg shadow-[#1E4D3B]/15 bg-[#1E4D3B] flex items-center justify-center mb-6">
          {!imgFailed ? (
            <img
              src="/pwa-192x192.png"
              alt="Sobdosuddhi 1.0 লোগো"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Feather className="w-11 h-11 text-[#F8F7F4]" />
          )}
        </div>

        <h1 className="font-literary text-3xl font-bold tracking-tight text-[#1C211E] dark:text-[#ECEBE6] mb-2">
          Sobdosuddhi 1.0
        </h1>
        <p className="text-sm text-[#1E4D3B] dark:text-[#7CD0AE] font-medium max-w-xs">
          বাংলা লেখার নির্ভরযোগ্য প্রুফরিডার।
        </p>
      </div>

      {/* Subtle Material 3 Loading Indicator */}
      <div className="w-full max-w-[180px] flex flex-col items-center gap-3">
        <div className="w-full h-1 rounded-full bg-[#E3E0D6] dark:bg-[#232B26] overflow-hidden">
          <div className="h-full w-1/2 bg-[#1E4D3B] dark:bg-[#5CB490] rounded-full animate-pulse" />
        </div>
        <span className="text-[11px] text-[#757E78] dark:text-[#7E8982] tabular-nums">
          সংস্করণ ১.০.০
        </span>
      </div>
    </div>
  );
}
