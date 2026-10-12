import React, { useState } from 'react';
import { 
  getMachineHardwareId, 
  activateLicense, 
  CREATOR_NAME, 
  CREATOR_EMAIL 
} from '../utils/license';
import { 
  ShieldAlert, 
  Key, 
  Copy, 
  Check, 
  Mail, 
  X, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  actionTitle?: string;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  actionTitle = 'تعریف و مدیریت نامزدهای رسمی',
}) => {
  const [hardwareId] = useState(() => getMachineHardwareId());
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [copiedHw, setCopiedHw] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleCopyHw = () => {
    navigator.clipboard.writeText(hardwareId);
    setCopiedHw(true);
    setTimeout(() => setCopiedHw(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!licenseKeyInput.trim()) {
      setErrorMessage('لطفاً کلید لایسنس دریافت شده از سازنده را وارد فرمایید.');
      return;
    }

    const success = await activateLicense(licenseKeyInput.trim(), 'کاربر رسمی سامانه');
    if (success) {
      setSuccessMessage('لایسنس رسمی با موفقیت فعال شد! دسترسی کامل به تعریف نامزدها برقرار گردید.');
      setTimeout(() => {
        onActivated();
        onClose();
      }, 1200);
    } else {
      setErrorMessage('کلید لایسنس نامعتبر است یا مختص به سخت‌افزار این رایانه نمی‌باشد. لطفاً شماره سریال را به سازنده ارسال فرمایید.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col p-5 space-y-4 shadow-2xl text-slate-100 overflow-y-auto my-auto" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                فعال‌سازی نسخه رسمی و لایسنس سامانه
              </h3>
              <p className="text-xs text-amber-300 mt-0.5">
                قابلیت «{actionTitle}» نیازمند لایسنس معتبر است
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo explanation */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed space-y-2 text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>شما در حال حاضر از نسخه آزمایشی (دمو رایگان) استفاده می‌نمایید.</span>
          </div>
          <p className="text-slate-400 leading-normal">
            در نسخه دمو، می‌توانید با نامزدهای نمونه آزمایشی کار کرده و فرآیند شمارش، ثبت بارکدخوان، پروژکتور سالن و چاپ را تست فرمایید. 
            اما جهت <strong>ثبت نامزدهای واقعی، ویرایش و برگزاری انتخابات رسمی</strong>، نرم‌افزار نیازمند ثبت کلید لایسنس می‌باشد.
          </p>
        </div>

        {/* Machine Hardware ID Box */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>شماره سریال کامپیوتر شما:</span>
            </span>
            <span className="text-[10px] text-slate-400">شناسه سخت‌افزاری اختصاصی</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-emerald-400 font-black text-sm select-all text-center">
              {hardwareId}
            </div>

            <button
              type="button"
              onClick={handleCopyHw}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-600 transition"
              title="کپی شماره سریال"
            >
              {copiedHw ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedHw ? 'کپی شد' : 'کپی'}</span>
            </button>
          </div>

          {/* Contact Details */}
          <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-400">طراح و سازنده: </span>
              <strong className="text-white font-bold">{CREATOR_NAME}</strong>
            </div>

            <a
              href={`mailto:${CREATOR_EMAIL}?subject=درخواست%20کلید%20لایسنس%20نرم‌افزار%20شمارش%20آرا&body=با%20سلام%0Aشماره%20سریال%20کامپیوتر%20من:%0A${hardwareId}`}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg text-[11px] font-bold border border-indigo-500/40 flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>ارسال سریال به {CREATOR_EMAIL}</span>
            </a>
          </div>
        </div>

        {/* License Input Form */}
        <form onSubmit={handleActivate} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              کلید لایسنس دریافت شده از سازنده:
            </label>
            <input
              type="text"
              required
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              placeholder="مثال: BBP-XXXXX-YYYYY-ZZZZZ-WWWWW"
              className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:font-sans placeholder-slate-500 outline-none transition"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>فعال‌سازی رسمی و شروع کار</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
