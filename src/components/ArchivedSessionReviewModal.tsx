import React, { useState } from 'react';
import { ArchivedSession } from '../types/election';
import { toPersianDigits, formatJalali } from '../utils/persian';
import { rankCandidates } from '../utils/tieBreaker';
import { exportElectionToExcel } from '../utils/export';
import { saveBackupToFolderOrDownload, updateArchivedSessionNotes } from '../utils/fileBackupStorage';
import { 
  X, 
  Archive, 
  Download, 
  FileSpreadsheet, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Vote, 
  ScrollText, 
  Calendar, 
  Building2, 
  Clock, 
  Printer,
  Edit3,
  Save,
  AlertCircle
} from 'lucide-react';

interface ArchivedSessionReviewModalProps {
  archive: ArchivedSession | null;
  isOpen: boolean;
  onClose: () => void;
  onRestoreAsActive: (archive: ArchivedSession) => void;
}

export const ArchivedSessionReviewModal: React.FC<ArchivedSessionReviewModalProps> = ({
  archive,
  isOpen,
  onClose,
  onRestoreAsActive,
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'CANDIDATES' | 'SIGNATURES' | 'AUDIT'>('SUMMARY');
  const [notes, setNotes] = useState(archive?.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  if (!isOpen || !archive) return null;

  const { session, candidates, auditEvents, operators, totalVotes, integrityChecksum } = archive;
  const totalValidVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const ranked = rankCandidates(candidates, session.tieBreakerRule, totalValidVotes);

  // Main seats: 5, alternate: 2 by default
  const mainSeatsCount = 5;
  const alternateSeatsCount = 2;

  const handleExportExcel = () => {
    exportElectionToExcel(session, ranked, totalVotes, totalValidVotes);
  };

  const handleDownloadBackup = async () => {
    await saveBackupToFolderOrDownload({
      session,
      candidates,
      auditEvents,
      operators,
      voters: archive.voters,
      notes,
    }, `بایگانی_${archive.session.title}`);
  };

  const handleSaveNotes = () => {
    updateArchivedSessionNotes(archive.id, notes);
    setIsEditingNotes(false);
    setSaveSuccessMsg('یادداشت بایگانی با موفقیت ذخیره شد.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-2xl flex-shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg text-white">
                  بازبینی جلسه بایگانی‌شده: {session.title}
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  سند نهایی و مختومه
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>حوزه: {session.constituency}</span>
                </span>
                <span>•</span>
                <span>شعبه: <strong className="text-emerald-300">{toPersianDigits(session.stationNumber)}</strong></span>
                <span>•</span>
                <span>صندوق: {session.boxNumber}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>تاریخ بایگانی: {archive.persianArchivedDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {/* Inner Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SUMMARY'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>خلاصه و آمار کل</span>
            </button>

            <button
              onClick={() => setActiveTab('CANDIDATES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'CANDIDATES'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>رتبه‌بندی نامزدها ({toPersianDigits(candidates.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('SIGNATURES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SIGNATURES'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>امضاهای رسمی ({toPersianDigits(session.observers.length + 1)})</span>
            </button>

            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'AUDIT'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>دفتر کل وقایع ({toPersianDigits(auditEvents.length)})</span>
            </button>
          </div>

          {/* Quick Exports and Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="خروجی کامل اکسل این جلسه"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>خروجی اکسل</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="دانلود فایل پشتیبان مستقل این جلسه"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>فایل JSON</span>
            </button>

            {!confirmRestore ? (
              <button
                onClick={() => setConfirmRestore(true)}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="بازگردانی این جلسه به عنوان جلسه جاری"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>بارگذاری به عنوان جلسه فعال</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-950/40 p-1 rounded-xl border border-amber-800">
                <span className="text-[11px] text-amber-300 px-1">اطمینان دارید؟</span>
                <button
                  onClick={() => {
                    onRestoreAsActive(archive);
                    onClose();
                  }}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold"
                >
                  بله، بارگذاری شود
                </button>
                <button
                  onClick={() => setConfirmRestore(false)}
                  className="px-1.5 py-1 text-slate-400 hover:text-white text-[11px]"
                >
                  انصراف
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: SUMMARY */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">کل تعرفه‌های مصرف‌شده</span>
                  <div className="text-2xl font-black text-white font-mono">
                    {toPersianDigits(totalVotes)}
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-1 block">۱۰۰٪ تعرفه‌ها</span>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">آرای صحیح مأخوذه</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {toPersianDigits(totalValidVotes)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {totalVotes > 0 ? toPersianDigits(((totalValidVotes / totalVotes) * 100).toFixed(1)) : '۰'}٪ از کل آرا
                  </span>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">آرای باطله سفید (ممتنع)</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {toPersianDigits(session.blankBallots)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">بدون نام کاندیدا</span>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">آرای باطله غیرمجاز</span>
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {toPersianDigits(session.invalidBallots)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">مخدوش / خط‌خورده</span>
                </div>
              </div>

              {/* Integrity & Archive Meta */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block">هش اعتبارسنجی تمامیت سند (SHA-256):</span>
                  <code className="text-xs text-purple-300 font-mono bg-purple-950/30 px-2 py-1 rounded border border-purple-800/40 break-all select-all">
                    {integrityChecksum}
                  </code>
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-400 block">پوشه ذخیره پشتیبان:</span>
                  <span className="text-xs text-emerald-300 font-mono">
                    {archive.backupPath || 'پوشه پیش‌فرض رایانه'}
                  </span>
                </div>
              </div>

              {/* Notes section */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>یادداشت‌ها و شماره اندیکاتور بایگانی</span>
                  </h4>
                  {!isEditingNotes ? (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش یادداشت</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره تغییرات</span>
                    </button>
                  )}
                </div>

                {saveSuccessMsg && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800 text-xs">
                    {saveSuccessMsg}
                  </div>
                )}

                {!isEditingNotes ? (
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {notes || 'یادداشتی برای این بایگانی ثبت نشده است.'}
                  </p>
                ) : (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-purple-500/50 rounded-xl p-3 text-xs text-white focus:outline-none"
                    placeholder="شماره بایگانی، نام تحویل‌گیرنده صندوق یا نکات مهم جلسه را در اینجا ثبت کنید..."
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATES RANKING */}
          {activeTab === 'CANDIDATES' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">رتبه</th>
                      <th className="p-3 font-semibold">کد</th>
                      <th className="p-3 font-semibold">نام و نام خانوادگی</th>
                      <th className="p-3 font-semibold">ائتلاف / جناح</th>
                      <th className="p-3 font-semibold">تعداد آرا</th>
                      <th className="p-3 font-semibold">درصد از آرای صحیح</th>
                      <th className="p-3 font-semibold">وضعیت قبولی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ranked.map((c, idx) => {
                      const isMainSeat = idx < mainSeatsCount;
                      const isAlternate = idx >= mainSeatsCount && idx < mainSeatsCount + alternateSeatsCount;
                      const pct = totalValidVotes > 0 ? ((c.votes / totalValidVotes) * 100).toFixed(1) : '۰';

                      return (
                        <tr 
                          key={c.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isMainSeat ? 'bg-emerald-950/10' : isAlternate ? 'bg-blue-950/10' : ''
                          }`}
                        >
                          <td className="p-3 font-bold font-mono">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {toPersianDigits(c.candidateNumber)}
                          </td>
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">
                                {c.name[0]}
                              </div>
                            )}
                            <span>{c.name}</span>
                          </td>
                          <td className="p-3 text-slate-400">
                            {c.affiliation || 'مستقل'}
                          </td>
                          <td className="p-3 font-bold font-mono text-emerald-400 text-sm">
                            {toPersianDigits(c.votes)}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {toPersianDigits(pct)}٪
                          </td>
                          <td className="p-3">
                            {isMainSeat ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                منتخب اصلی (کرسی {toPersianDigits(idx + 1)})
                              </span>
                            ) : isAlternate ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                عضو علی‌البدل
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                عدم کسب حدنصاب
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNATURES */}
          {activeTab === 'SIGNATURES' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Presiding Officer */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-amber-400 font-bold block mb-1">
                      مسئول حوزه (رئیس شعبه)
                    </span>
                    <h5 className="font-bold text-sm text-white">
                      {session.presidingOfficer.name}
                    </h5>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {session.presidingOfficer.organization || 'سازمان ناظر'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                    {session.presidingOfficer.signatureDataUrl ? (
                      <div className="bg-white rounded-xl p-2 inline-block shadow-sm">
                        <img 
                          src={session.presidingOfficer.signatureDataUrl} 
                          alt="امضا" 
                          className="h-16 w-36 object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-400 font-bold">✓ امضا تایید شده الکترونیکی</span>
                    )}
                    {session.presidingOfficer.signedAt && (
                      <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                        {toPersianDigits(session.presidingOfficer.signedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Observers */}
                {session.observers.map((obs) => (
                  <div key={obs.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-emerald-400 font-bold block mb-1">
                        {obs.role || 'ناظر رسمی'}
                      </span>
                      <h5 className="font-bold text-sm text-white">
                        {obs.name}
                      </h5>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {obs.organization || 'هیئت نظارت'}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                      {obs.signatureDataUrl ? (
                        <div className="bg-white rounded-xl p-2 inline-block shadow-sm">
                          <img 
                            src={obs.signatureDataUrl} 
                            alt="امضا" 
                            className="h-16 w-36 object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold">✓ امضا تایید شده الکترونیکی</span>
                      )}
                      {obs.signedAt && (
                        <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                          {toPersianDigits(obs.signedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-3">
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {auditEvents.map((evt) => (
                  <div 
                    key={evt.id}
                    className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          #{toPersianDigits(evt.eventIdNumber)}
                        </span>
                        <span className="font-bold text-slate-200">
                          {evt.reason || evt.actionType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        توسط: {evt.operatorName} ({evt.operatorRole})
                      </span>
                    </div>

                    <div className="text-left font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {evt.persianTimestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>پرونده انتخابات مختومه و غیرقابل تغییر در بایگانی محلی</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition"
            >
              بستن پنجره
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
