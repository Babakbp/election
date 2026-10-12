import React, { useState } from 'react';
import { verifyAppPassword, unlockApp, CREATOR_NAME, CREATOR_EMAIL } from '../utils/license';
import { Lock, Unlock, KeyRound, AlertCircle, Building2 } from 'lucide-react';

interface AppLockScreenModalProps {
  isLocked: boolean;
  onUnlocked: () => void;
  sessionTitle?: string;
}

export const AppLockScreenModal: React.FC<AppLockScreenModalProps> = ({
  isLocked,
  onUnlocked,
  sessionTitle = 'سامانه جامع مدیریت و شمارش انتخابات حضوری',
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAppPassword(passwordInput)) {
      unlockApp();
      setErrorMsg('');
      setPasswordInput('');
      onUnlocked();
    } else {
      setErrorMsg('رمز عبور مدیر نادرست است.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4 select-none no-print" dir="rtl">
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0,transparent_70%)] pointer-events-none" />

      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-black text-white">{sessionTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">
            سامانه با رمز عبور قفل شده است؛ لطفاً جهت ادامه، رمز مدیر را وارد فرمایید
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 text-xs">
          <div>
            <div className="relative">
              <input
                type="password"
                autoFocus
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="رمز عبور مدیر سامانه..."
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-center text-sm font-mono text-white outline-none transition placeholder:font-sans placeholder-slate-500"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition active:scale-98"
          >
            <Unlock className="w-4 h-4" />
            <span>بازگشایی و ورود به سامانه</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
          طراح و سازنده: {CREATOR_NAME} • {CREATOR_EMAIL}
        </div>
      </div>
    </div>
  );
};
