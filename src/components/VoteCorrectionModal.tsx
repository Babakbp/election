import React, { useState } from 'react';
import { Candidate, Operator } from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';

interface VoteCorrectionModalProps {
  candidate: Candidate;
  currentOperator: Operator;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (candidateId: string, decrementCount: number, reason: string) => void;
}

const PRESET_REASONS = [
  'خطای اپراتور در فشردن دکمه (ثبت مضاعف غیرعمدی)',
  'تصمیم هیئت نظارت: برگه رأی مخدوش و فاقد مهر قانونی تشخیص داده شد',
  'اصلاح شمارش پس از بازخوانی تعرفه توسط ناظران',
  'خطای ثبت سیستمی در قرائت نامزد مشابه',
  'درخواست بازشماری بر اساس اعتراض کتبی نماینده نامزد',
  'سایر دلایل رسمی مصوب جلسه',
];

export const VoteCorrectionModal: React.FC<VoteCorrectionModalProps> = ({
  candidate,
  currentOperator,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [decrementAmount, setDecrementAmount] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [detailedReason, setDetailedReason] = useState<string>('');
  const [supervisorConfirmed, setSupervisorConfirmed] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorConfirmed) {
      setErrorText('تأییدیه حضور ناظر و قبول مسئولیت اصلاح الزامی است.');
      return;
    }
    const fullReason = detailedReason.trim()
      ? `${selectedPreset} - توضیح تکمیلی: ${detailedReason.trim()}`
      : selectedPreset;

    if (!fullReason || fullReason.length < 5) {
      setErrorText('لطفاً دلیل موجه و کامل برای کاهش آرا وارد نمایید.');
      return;
    }

    if (decrementAmount <= 0) {
      setErrorText('مقدار کاهش باید حداقل ۱ رأی باشد.');
      return;
    }

    if (decrementAmount > candidate.votes) {
      setErrorText(`نمی‌توان بیش از کل آرای ثبت‌شده (${toPersianDigits(candidate.votes)}) رأی کسر کرد.`);
      return;
    }

    onConfirm(candidate.id, decrementAmount, fullReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 border-2 border-red-500/60 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-red-300">اصلاح و کاهش رسمی آرا</h3>
              <p className="text-xs text-slate-400">ثبت رویداد اصلاحی در دفتر کل ممیزی غیرقابل حذف</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Candidate Summary */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <img 
              src={candidate.avatarUrl} 
              alt={candidate.name} 
              className="w-14 h-14 rounded-full object-cover border-2 border-red-400/50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100">{candidate.name}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-700 text-amber-300 rounded-full font-mono">
                  کد {toPersianDigits(candidate.candidateNumber)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{candidate.affiliation}</p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-slate-300">
                  آرای کنونی: <strong className="text-emerald-400 font-mono text-sm">{toPersianDigits(candidate.votes)}</strong>
                </span>
                <span className="text-slate-300">
                  پس از کسر: <strong className="text-amber-400 font-mono text-sm">
                    {toPersianDigits(Math.max(0, candidate.votes - decrementAmount))}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Amount to decrease */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              تعداد آرای کاهشی (مقدار اصلاح):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 5, 10].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  disabled={amt > candidate.votes}
                  onClick={() => setDecrementAmount(amt)}
                  className={`py-2 px-3 rounded-lg border text-sm font-semibold transition flex items-center justify-center gap-1 ${
                    decrementAmount === amt
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-900/40'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <span>{toPersianDigits(amt)}-</span>
                  <span className="text-xs">رأی</span>
                </button>
              ))}
            </div>
            {candidate.votes > 10 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">یا مقدار دلخواه:</span>
                <input
                  type="number"
                  min="1"
                  max={candidate.votes}
                  value={decrementAmount}
                  onChange={(e) => setDecrementAmount(Math.max(1, Math.min(candidate.votes, Number(e.target.value) || 1)))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white w-24 text-center font-mono focus:border-red-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              علت الزامی اصلاح و کسر رأی: <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 focus:border-red-500 outline-none"
            >
              {PRESET_REASONS.map((reason, idx) => (
                <option key={idx} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              شرح دقیق و شماره صورتجلسه/تعرفه معترض‌عنه (اختیاری اما توصیه شده):
            </label>
            <textarea
              rows={2}
              value={detailedReason}
              onChange={(e) => setDetailedReason(e.target.value)}
              placeholder="مثال: برگه رأی شماره ۷۸ به دلیل داشتن دو علامت همزمان باطل و از آمار نامزد کسر گردید."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-red-500 outline-none resize-none"
            />
          </div>

          {/* Audit Notice & Operator Accountability */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>هشدار امنیت و شفافیت انتخابات</span>
            </div>
            <p className="text-amber-300/90 leading-relaxed">
              این عملیات بلافاصله با هویت اپراتور جاری 
              (<strong className="text-white">{currentOperator.name}</strong>)
              و شناسه زمان دقیق به عنوان یک رکورد اصلاحی ثبت خواهد شد و حذف یا محو آن به هیچ وجه ممکن نیست.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={supervisorConfirmed}
              onChange={(e) => setSupervisorConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-red-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs text-slate-300 leading-normal">
              با حضور و تایید ناظران شعبه، صحت این اصلاح را تایید می‌کنم و مسئولیت ثبت این رکورد کاهشی را می‌پذیرم.
            </span>
          </label>

          {errorText && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 p-2 rounded-lg">
              {errorText}
            </p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!supervisorConfirmed}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-red-700/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>ثبت رسمی کسر {toPersianDigits(decrementAmount)} رأی</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
