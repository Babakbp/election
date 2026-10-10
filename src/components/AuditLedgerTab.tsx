import React, { useState } from 'react';
import { AuditEvent, Operator } from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { exportAuditLogsToExcel } from '../utils/export';
import { 
  ShieldCheck, 
  RotateCcw, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Hash, 
  User, 
  FileText
} from 'lucide-react';

interface AuditLedgerTabProps {
  auditEvents: AuditEvent[];
  currentOperator: Operator;
  sessionTitle: string;
  isLocked: boolean;
  onRollbackEvent: (eventToRollback: AuditEvent, rollbackReason: string) => void;
}

export const AuditLedgerTab: React.FC<AuditLedgerTabProps> = ({
  auditEvents,
  currentOperator,
  sessionTitle,
  isLocked,
  onRollbackEvent,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEventForRollback, setSelectedEventForRollback] = useState<AuditEvent | null>(null);
  const [rollbackReason, setRollbackReason] = useState<string>('');
  const [rollbackError, setRollbackError] = useState<string>('');

  const filteredEvents = auditEvents.filter((e) => {
    if (filterType !== 'ALL' && e.actionType !== filterType) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchCandidate = e.candidateName?.toLowerCase().includes(term);
      const matchOperator = e.operatorName.toLowerCase().includes(term);
      const matchReason = e.reason.toLowerCase().includes(term);
      const matchId = e.id.toLowerCase().includes(term);
      return matchCandidate || matchOperator || matchReason || matchId;
    }
    return true;
  });

  const handleConfirmRollback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForRollback) return;
    if (!rollbackReason.trim() || rollbackReason.length < 5) {
      setRollbackError('ورود دلیل رسمی برای لغو و بازگشت عملیات الزامی است.');
      return;
    }
    onRollbackEvent(selectedEventForRollback, rollbackReason.trim());
    setSelectedEventForRollback(null);
    setRollbackReason('');
    setRollbackError('');
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'VOTE_INCREMENT':
        return {
          label: 'افزایش رأی',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'VOTE_CORRECTION_DECREASE':
        return {
          label: 'کاهش / اصلاح آرا',
          color: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
      case 'ROLLBACK':
        return {
          label: 'لغو رویداد معکوس',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'INITIAL_SEAL':
        return {
          label: 'پلمپ و بازرسی اولیه',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
      case 'LOCK_SESSION':
        return {
          label: 'قفل نهایی جلسه',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };
      case 'SIGNATURE_RECORDED':
        return {
          label: 'امضای ناظر / مسئول',
          color: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
        };
      case 'CANDIDATE_PHOTO_UPDATED':
        return {
          label: 'تنظیم عکس پرتره',
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        };
      default:
        return {
          label: type,
          color: 'bg-slate-700 text-slate-300 border-slate-600',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Integrity banner */}
      <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">دفتر کل ممیزی و ردگیری رویدادها (Tamper-Evident Ledger)</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                ۱۰۰٪ یکپارچه و معتبر
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              تمام افزایش‌ها، کاهش‌ها و اقدامات با امضای اپراتور، مهر زمانی، مقادیر قبل/بعد و هش زنجیره‌ای رمزنگاری ذخیره می‌شوند. هیچ داده‌ای به صورت خاموش یا پنهان قابل ویرایش نیست.
            </p>
          </div>
        </div>

        <button
          onClick={() => exportAuditLogsToExcel(auditEvents, sessionTitle)}
          className="self-start md:self-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-600 transition flex-shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>دانلود دفتر وقایع (.xlsx)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در اپراتور، نامزد، دلیل یا شناسه..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="ALL">همه انواع رویدادها</option>
            <option value="VOTE_INCREMENT">فقط افزایش آرا</option>
            <option value="VOTE_CORRECTION_DECREASE">فقط کاهش / اصلاح آرا</option>
            <option value="ROLLBACK">فقط لغوها و بازگشت‌ها</option>
            <option value="SIGNATURE_RECORDED">امضاها و مصوبات</option>
          </select>
        </div>
      </div>

      {/* Events Table / Timeline List */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 font-medium">
              <tr>
                <th className="py-3 px-4">شناسه و زمان</th>
                <th className="py-3 px-4">اپراتور و نقش</th>
                <th className="py-3 px-4">نوع عملیات</th>
                <th className="py-3 px-4">نامزد و کد</th>
                <th className="py-3 px-4">تغییر آرا (قبل ⬅ بعد)</th>
                <th className="py-3 px-4">دلیل موجه ثبت شده</th>
                <th className="py-3 px-4">هش یکپارچگی</th>
                <th className="py-3 px-4 text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-200">
              {filteredEvents.map((evt) => {
                const badge = getActionBadge(evt.actionType);
                const canRollback = !isLocked && (evt.actionType === 'VOTE_INCREMENT' || evt.actionType === 'VOTE_CORRECTION_DECREASE') && !evt.isRollback;

                return (
                  <tr key={evt.id} className="hover:bg-slate-700/40 transition">
                    {/* ID & Time */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-200">{evt.id}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{evt.persianTimestamp}</div>
                    </td>

                    {/* Operator */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{evt.operatorName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{evt.operatorRole}</div>
                    </td>

                    {/* Action Type */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-lg border text-[11px] font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Candidate */}
                    <td className="py-3 px-4">
                      {evt.candidateName ? (
                        <div>
                          <span className="font-medium text-white">{evt.candidateName}</span>
                          {evt.candidateNumber && (
                            <span className="font-mono text-amber-300 text-[11px] mr-1">
                              (کد {toPersianDigits(evt.candidateNumber)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Change Before/After */}
                    <td className="py-3 px-4 font-mono">
                      {evt.delta !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{toPersianDigits(evt.previousValue)}</span>
                          <span className="text-slate-600">⬅</span>
                          <span className="font-bold text-white">{toPersianDigits(evt.newValue)}</span>
                          <span className={`text-[11px] px-1.5 py-0.2 rounded font-bold ${
                            evt.delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {evt.delta > 0 ? `+${toPersianDigits(evt.delta)}` : toPersianDigits(evt.delta)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">{evt.newValue ?? '—'}</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2" title={evt.reason}>
                        {evt.reason}
                      </p>
                      {evt.rollbackOfEventId && (
                        <span className="text-[10px] text-amber-400 mt-0.5 block font-mono">
                          ابطال رویداد: {evt.rollbackOfEventId}
                        </span>
                      )}
                    </td>

                    {/* Hash */}
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500" title={evt.hash}>
                      {evt.hash.slice(0, 10)}...
                    </td>

                    {/* Rollback action */}
                    <td className="py-3 px-4 text-center">
                      {canRollback ? (
                        <button
                          type="button"
                          onClick={() => setSelectedEventForRollback(evt)}
                          title="لغو این عملیات بدون پاک کردن ردپای رویداد قبلی"
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-medium flex items-center gap-1 transition mx-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>لغو ثبت</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px]">غیرقابل ابطال</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            هیچ رویدادی مطابق با فیلتر انتخابی یافت نشد.
          </div>
        )}
      </div>

      {/* Rollback Modal */}
      {selectedEventForRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-md w-full text-slate-100 shadow-2xl p-6 space-y-4"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-base text-white">لغو رسمی عملیات {selectedEventForRollback.id}</h4>
                <p className="text-xs text-slate-400">ثبت رویداد معکوس بدون حذف رویداد اولیه</p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
              <div><strong>نامزد:</strong> {selectedEventForRollback.candidateName}</div>
              <div><strong>عملیات قبلی:</strong> {selectedEventForRollback.delta && selectedEventForRollback.delta > 0 ? `+${toPersianDigits(selectedEventForRollback.delta)} رأی` : `${toPersianDigits(selectedEventForRollback.delta)} رأی`}</div>
              <div><strong>علت قبلی:</strong> {selectedEventForRollback.reason}</div>
            </div>

            <form onSubmit={handleConfirmRollback} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  علت رسمی ابطال و بازگشت آرا: <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  placeholder="مثال: لغو به درخواست هیئت نظارت پس از بررسی مجدد تعرفه شماره ۳۴..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
              </div>

              {rollbackError && (
                <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800">
                  {rollbackError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEventForRollback(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ثبت قطعی لغو در دفتر ممیزی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
