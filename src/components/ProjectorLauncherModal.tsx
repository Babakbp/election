import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Monitor, 
  AlertTriangle, 
  Tv, 
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { getProjectorUrl } from '../utils/projectorLink';

interface ProjectorLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  wasBlocked?: boolean;
  onSelectStationRole?: (role: 'master' | 'projector') => void;
  onOpenProjectorModal?: () => void;
}

export const ProjectorLauncherModal: React.FC<ProjectorLauncherModalProps> = ({
  isOpen,
  onClose,
  wasBlocked = false,
  onSelectStationRole,
  onOpenProjectorModal,
}) => {
  const [copied, setCopied] = useState(false);
  const projectorUrl = getProjectorUrl();

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = projectorUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">راه‌اندازی صفحه پروژکتور سالن</h3>
              <p className="text-xs text-slate-400 mt-0.5">تفکیک نمایشگر سالن از مانیتور کاربری اپراتور</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Popup Blocked Alert (User Requested) */}
        {wasBlocked && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <strong className="text-amber-300 font-bold block text-sm">
                مرورگر شما از باز شدن خودکار پنجره جدید (Pop-up) جلوگیری کرد!
              </strong>
              <p className="leading-relaxed text-slate-300">
                تنظیمات امنیتی مرورگر (Chrome / Edge / Firefox) باز شدن خودکار صفحات جدید را مسدود کرده است. از دکمه‌های زیر برای دسترسی مستقیم استفاده فرمایید:
              </p>
            </div>
          </div>
        )}

        {/* Primary Action 1: Native HTML Anchor Link (Browsers do NOT block native clicks) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">۱</span>
            <span>روش مستقیم: کلیک بر روی پیوند باز کردن در تب/پنجره جدید</span>
          </span>
          <a
            href={projectorUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(onClose, 500)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-400/40 group active:scale-98"
          >
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>کلیک کنید تا صفحه پروژکتور در تب جدید باز شود</span>
          </a>
          <p className="text-[11px] text-slate-400 px-1">
            با کلیک روی این دکمه، صفحه پروژکتور مستقیماً در تب دوم باز شده و مرورگر آن را مسدود نخواهد کرد.
          </p>
        </div>

        {/* Primary Action 2: Copy Link */}
        <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[11px] font-black">۲</span>
            <span>روش کپی آدرس: باز کردن در مانیتور یا پنجره دیگر پروژکتور</span>
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 truncate text-left" dir="ltr">
              {projectorUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد!' : 'کپی آدرس'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            می‌توانید این آدرس را در تب یا پنجره جدید مرورگر Paste کنید و آن را روی صفحه ویدئو پروژکتور قرار دهید.
          </p>
        </div>

        {/* Alternative Actions: In-tab options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Switch current tab to projector */}
          {onSelectStationRole && (
            <button
              type="button"
              onClick={() => {
                onSelectStationRole('projector');
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-right space-y-1 transition group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>تبدیل همین تب به پروژکتور</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                کل سیستم در همین صفحه به حالت تمام‌صفحه پروژکتور درمی‌آید (بدون نیاز به پنجره جدید).
              </p>
            </button>
          )}

          {/* In-app modal preview */}
          {onOpenProjectorModal && (
            <button
              type="button"
              onClick={() => {
                onOpenProjectorModal();
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-right space-y-1 transition group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                <Tv className="w-4 h-4 text-indigo-400" />
                <span>پیش‌نمایش روی همین صفحه</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                پروژکتور به صورت پنجره روی صفحه باز می‌شود تا ظاهر و عملکرد آن را امتحان کنید.
              </p>
            </button>
          )}
        </div>

        {/* How to Allow Popups in Browser Guide */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
            <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>آموزش رفع دائمی مسدودی پاپ‌آپ (Pop-up) در مرورگر:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed pr-1">
            <li>در نوار آدرس بالای مرورگر (سمت راست یا چپ URL)، روی علامت <strong className="text-white">پاپ‌آپ مسدود شده (Pop-up blocked)</strong> یا آیکون تنظیمات سایت کلیک کنید.</li>
            <li>گزینه <strong className="text-emerald-400">«Always allow pop-ups and redirects from this site»</strong> (همیشه مجاز باشد) را تیک بزنید.</li>
            <li>روی دکمه <strong className="text-white">Done</strong> کلیک کنید. از این پس پروژکتور با یک کلیک باز خواهد شد.</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
