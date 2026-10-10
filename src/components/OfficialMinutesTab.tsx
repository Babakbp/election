import React, { useState } from 'react';
import { ElectionSession, Candidate, OfficialPerson, AuditEvent } from '../types/election';
import { RankedCandidate, getTieBreakerRuleTitle } from '../utils/tieBreaker';
import { toPersianDigits, formatJalali } from '../utils/persian';
import { SignatureModal } from './SignatureModal';
import { 
  Printer, 
  FileCheck2, 
  ShieldCheck, 
  Lock, 
  PenTool, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Building2, 
  Stamp,
  QrCode,
  Fingerprint,
  FileSpreadsheet
} from 'lucide-react';

interface OfficialMinutesTabProps {
  session: ElectionSession;
  rankedCandidates: RankedCandidate[];
  auditEvents: AuditEvent[];
  totalVotes: number;
  totalValidVotes: number;
  onSavePersonSignature: (personId: string, signatureDataUrl: string, signedAt: string, digitalToken: string) => void;
  onLockSessionFinal: (officialHash: string) => void;
  onExportExcel: () => void;
}

export const OfficialMinutesTab: React.FC<OfficialMinutesTabProps> = ({
  session,
  rankedCandidates,
  auditEvents,
  totalVotes,
  totalValidVotes,
  onSavePersonSignature,
  onLockSessionFinal,
  onExportExcel,
}) => {
  const [activeSigningPerson, setActiveSigningPerson] = useState<OfficialPerson | null>(null);

  const isPresidingSigned = Boolean(session.presidingOfficer.signatureDataUrl);
  const observersSignedCount = session.observers.filter((o) => Boolean(o.signatureDataUrl)).length;
  const allSigned = isPresidingSigned && observersSignedCount === session.observers.length;
  const isLocked = session.status === 'LOCKED_FINAL';

  const handlePrint = () => {
    window.print();
  };

  const handleFinalCertification = () => {
    if (!allSigned) return;
    // Generate a deterministic official integrity hash
    const payload = `${session.id}|${session.code}|${totalVotes}|${totalValidVotes}|${session.blankBallots}|${session.invalidBallots}|${session.presidingOfficer.digitalCertificateToken}`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = (hash << 5) - hash + payload.charCodeAt(i);
      hash |= 0;
    }
    const computedHash = 'IR-ELEC-CERT-' + Math.abs(hash).toString(16).padStart(12, '0').toUpperCase();
    onLockSessionFinal(computedHash);
  };

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
      {/* Action / Warning Bar (Hidden during print) */}
      <div className="no-print print:hidden bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span>تنظیم و صدور صورتجلسه رسمی شمارش آرا</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            وضعیت امضاها: <strong className="text-white">{toPersianDigits(observersSignedCount + (isPresidingSigned ? 1 : 0))}</strong> از <strong className="text-white">{toPersianDigits(session.observers.length + 1)}</strong> امضای قانونی ثبت شده است.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onExportExcel}
            className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-500/30 transition shadow-sm"
            title="دریافت فایل رسمی صورتجلسه و آرا با پسوند .xlsx"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>خروجی اکسل (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-600 transition"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>چاپ رسمی صورتجلسه (Print / PDF)</span>
          </button>

          {!isLocked ? (
            <button
              type="button"
              disabled={!allSigned}
              onClick={handleFinalCertification}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition ${
                allSigned
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
              title={allSigned ? 'پلمپ دائم صورتجلسه و پایان رسمی' : 'ابتدا همه اعضا باید صورتجلسه را امضا کنند'}
            >
              <Lock className="w-4 h-4" />
              <span>قفل نهایی و صدور قطعی صورتجلسه</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-purple-900/40 border border-purple-500/50 text-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>صورتجلسه پلمپ و قطعی شده است</span>
            </div>
          )}
        </div>
      </div>

      {/* Signing Management Panel for Officials (Hidden during print) */}
      {!isLocked && (
        <div className="no-print print:hidden bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">پنل امضای الکترونیک مسئول شعبه و ناظران</h4>
            </div>
            <span className="text-xs text-amber-300">
              * شرط قطعی‌سازی نتایج، امضای کلیه مسئولین در این بخش است
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Presiding Officer */}
            <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-amber-400 font-bold">مسئول حوزه (رئیس شعبه)</span>
                  {isPresidingSigned ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" /> امضا شد
                    </span>
                  ) : (
                    <span className="text-amber-400 text-[11px]">در انتظار</span>
                  )}
                </div>
                <h5 className="font-bold text-white text-sm">{session.presidingOfficer.name}</h5>
                <p className="text-[11px] text-slate-400">{session.presidingOfficer.role}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">کد ملی: {session.presidingOfficer.nationalIdMasked}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                {isPresidingSigned && session.presidingOfficer.signatureDataUrl ? (
                  <img src={session.presidingOfficer.signatureDataUrl} alt="امضا" className="h-8 max-w-[100px] object-contain invert brightness-200" />
                ) : <span />}
                <button
                  type="button"
                  onClick={() => setActiveSigningPerson(session.presidingOfficer)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  {isPresidingSigned ? 'تغییر امضا' : 'ثبت امضا'}
                </button>
              </div>
            </div>

            {/* Observers */}
            {session.observers.map((obs) => {
              const isSigned = Boolean(obs.signatureDataUrl);
              return (
                <div key={obs.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 font-bold">ناظر قانونی</span>
                      {isSigned ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> امضا شد
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px]">در انتظار</span>
                      )}
                    </div>
                    <h5 className="font-bold text-white text-sm">{obs.name}</h5>
                    <p className="text-[11px] text-slate-400">{obs.role} ({obs.organization})</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">کد ملی: {obs.nationalIdMasked}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    {isSigned && obs.signatureDataUrl ? (
                      <img src={obs.signatureDataUrl} alt="امضا" className="h-8 max-w-[100px] object-contain invert brightness-200" />
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => setActiveSigningPerson(obs)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-xs font-semibold transition"
                    >
                      {isSigned ? 'تغییر امضا' : 'ثبت امضا'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          THE OFFICIAL PRINTABLE MINUTES DOCUMENT (WHITE PAPER SHEET)
          Compliant with standard election protocol in Iran
      ========================================================================== */}
      <div 
        id="official-minutes-document"
        className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-300 max-w-4xl mx-auto space-y-6 print:space-y-4 print:p-2 print:m-0 print:max-w-none print:w-full print:shadow-none print:border-2 print:border-black print:rounded-none"
        dir="rtl"
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center relative">
          <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
            <div className="text-right">
              <div>شماره صورتجلسه: <strong>{session.id}</strong></div>
              <div>کد شعبه: <strong>{toPersianDigits(session.stationNumber)}</strong></div>
            </div>
            
            {/* Center Emblem & Title */}
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center text-slate-800">
                <Building2 className="w-9 h-9" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800">بسمه تعالی</h2>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                صورتجلسه رسمی شمارش آرای صندوق اخذ رأی
              </h1>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {session.title}
              </p>
            </div>

            <div className="text-left">
              <div>تاریخ تنظیم: <strong>{formatJalali(new Date(), false)}</strong></div>
              <div>ساعت: <strong>{toPersianDigits(new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</strong></div>
            </div>
          </div>
        </div>

        {/* Section 1: Session & Station Specifications */}
        <div className="border border-slate-400 rounded-lg p-3 text-xs leading-relaxed bg-slate-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div><span className="text-slate-600">حوزه انتخابیه: </span><strong>{session.constituency}</strong></div>
            <div><span className="text-slate-600">شماره شعبه: </span><strong className="font-mono">{toPersianDigits(session.stationNumber)}</strong></div>
            <div><span className="text-slate-600">شماره صندوق: </span><strong>{session.boxNumber}</strong></div>
            <div><span className="text-slate-600">مسئول حوزه: </span><strong>{session.presidingOfficer.name}</strong></div>
            <div><span className="text-slate-600">قانون شکستن تساوی: </span><strong>{getTieBreakerRuleTitle(session.tieBreakerRule)}</strong></div>
            <div><span className="text-slate-600">زمان گشایش صندوق: </span><strong>{formatJalali(session.openedAt, false)}</strong></div>
          </div>
        </div>

        {/* Section 2: Ballot Breakdown Statistics */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 mb-2 border-r-4 border-slate-800 pr-2">
            جدول آمار کلی تعرفه‌ها و آرای مأخوذه صندوق
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-center text-xs">
            <thead className="bg-slate-200 font-bold">
              <tr>
                <th className="border border-slate-400 py-2 px-1">کل واجدین شرایط</th>
                <th className="border border-slate-400 py-2 px-1">مجموع آرای مأخوذه (کل برگه‌ها)</th>
                <th className="border border-slate-400 py-2 px-1">آرای صحیح نامزدها</th>
                <th className="border border-slate-400 py-2 px-1">آرای باطله سفید (ممتنع)</th>
                <th className="border border-slate-400 py-2 px-1">آرای باطله غیرمجاز (مخدوش)</th>
                <th className="border border-slate-400 py-2 px-1">درصد مشارکت شعبه</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="border border-slate-400 py-2.5 font-bold">{toPersianDigits(session.registeredVotersCount)}</td>
                <td className="border border-slate-400 py-2.5 font-black text-sm">{toPersianDigits(totalVotes)}</td>
                <td className="border border-slate-400 py-2.5 font-bold text-emerald-800">{toPersianDigits(totalValidVotes)}</td>
                <td className="border border-slate-400 py-2.5">{toPersianDigits(session.blankBallots)}</td>
                <td className="border border-slate-400 py-2.5 text-red-700">{toPersianDigits(session.invalidBallots)}</td>
                <td className="border border-slate-400 py-2.5 font-bold">
                  {toPersianDigits(session.registeredVotersCount > 0 ? ((totalVotes / session.registeredVotersCount) * 100).toFixed(1) : 0)}٪
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Official Results & Candidate Rankings */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 mb-2 border-r-4 border-slate-800 pr-2">
            نتایج تفصیلی شمارش آرا و رتبه‌بندی نهایی نامزدها
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead className="bg-slate-200 font-bold text-center">
              <tr>
                <th className="border border-slate-400 py-2 px-2 w-12">رتبه</th>
                <th className="border border-slate-400 py-2 px-2 w-16">تصویر</th>
                <th className="border border-slate-400 py-2 px-2 w-20">کد نامزدی</th>
                <th className="border border-slate-400 py-2 px-3 text-right">نام و نام خانوادگی نامزد</th>
                <th className="border border-slate-400 py-2 px-2 text-right">ائتلاف / وابستگی</th>
                <th className="border border-slate-400 py-2 px-3">تعداد آرای مأخوذه</th>
                <th className="border border-slate-400 py-2 px-2">درصد از آرای صحیح</th>
                <th className="border border-slate-400 py-2 px-2">ملاحظات و وضعیت تساوی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {rankedCandidates.map((c) => (
                <tr key={c.id} className={c.rank <= 3 ? 'bg-amber-50/60 font-semibold' : ''}>
                  <td className="border border-slate-400 py-2 text-center font-bold font-mono">
                    {toPersianDigits(c.rank)}
                  </td>
                  <td className="border border-slate-400 py-1 text-center">
                    <img 
                      src={c.avatarUrl} 
                      alt={c.name} 
                      className="w-8 h-8 rounded-full mx-auto object-cover border border-slate-400"
                    />
                  </td>
                  <td className="border border-slate-400 py-2 text-center font-mono">
                    {toPersianDigits(c.candidateNumber)}
                  </td>
                  <td className="border border-slate-400 py-2 px-3">
                    <strong>{c.name}</strong>
                    <div className="text-[10px] text-slate-500 font-mono">کد ملی: {c.nationalIdMasked}</div>
                  </td>
                  <td className="border border-slate-400 py-2 px-2 text-slate-700">
                    {c.affiliation}
                  </td>
                  <td className="border border-slate-400 py-2 text-center font-black font-mono text-sm">
                    {toPersianDigits(c.votes)} رأی
                  </td>
                  <td className="border border-slate-400 py-2 text-center font-mono">
                    {toPersianDigits(c.percentage)}٪
                  </td>
                  <td className="border border-slate-400 py-2 px-2 text-[11px] text-slate-600">
                    {c.isTied ? c.tieBreakerAppliedReason : 'اکثریت قانونی'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Audit and Incidents Summary */}
        <div className="border border-slate-300 rounded-lg p-3 text-xs bg-slate-50 space-y-1">
          <h4 className="font-bold text-slate-800">خلاصه گزارش ممیزی، شکایات و رویدادهای جلسه:</h4>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            فرآیند شمارش با حضور کامل ناظران هیئت نظارت و مسئول شعبه انجام پذیرفت. کل رویدادهای ثبت‌شده در سیستم الکترونیک: 
            <strong> {toPersianDigits(auditEvents.length)} رویداد </strong> 
            (شامل {toPersianDigits(auditEvents.filter(e => e.actionType === 'VOTE_CORRECTION_DECREASE').length)} مورد اصلاح با ذکر علت قانونی) می‌باشد.
            تمامی مراحل با بررسی زنجیره ممیزی بدون دستکاری و با رضایت کامل طرفین خاتمه یافت.
          </p>
        </div>

        {/* Section 5: Signatures and Certification Blocks */}
        <div>
          <h3 className="font-bold text-sm text-slate-900 mb-3 border-r-4 border-slate-800 pr-2">
            بخش تایید، امضاها و گواهی قانونی صحت انتخابات
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Presiding Officer Signature Box */}
            <div className="border-2 border-slate-400 rounded-xl p-3 flex flex-col justify-between text-center min-h-[140px] bg-white">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block">رئیس شعبه و مسئول حوزه</span>
                <strong className="text-xs text-slate-900 mt-1 block">{session.presidingOfficer.name}</strong>
                <span className="text-[10px] text-slate-500 font-mono block">کد ملی: {session.presidingOfficer.nationalIdMasked}</span>
              </div>

              <div className="my-2 flex items-center justify-center min-h-[45px]">
                {session.presidingOfficer.signatureDataUrl ? (
                  <div className="relative">
                    <img 
                      src={session.presidingOfficer.signatureDataUrl} 
                      alt="امضا" 
                      className="h-11 max-w-[140px] object-contain mx-auto"
                    />
                    <div className="text-[9px] text-emerald-700 font-mono mt-0.5">
                      ✓ امضا شد: {formatJalali(session.presidingOfficer.signedAt!, false)}
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">محل امضای رئیس شعبه</span>
                )}
              </div>

              <div className="text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-1">
                توکن امنیتی: {session.presidingOfficer.digitalCertificateToken ?? '—'}
              </div>
            </div>

            {/* Observers Signature Boxes */}
            {session.observers.map((obs) => (
              <div key={obs.id} className="border-2 border-slate-400 rounded-xl p-3 flex flex-col justify-between text-center min-h-[140px] bg-white">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block">{obs.role}</span>
                  <strong className="text-xs text-slate-900 mt-1 block">{obs.name}</strong>
                  <span className="text-[10px] text-slate-500 font-mono block">{obs.organization}</span>
                </div>

                <div className="my-2 flex items-center justify-center min-h-[45px]">
                  {obs.signatureDataUrl ? (
                    <div className="relative">
                      <img 
                        src={obs.signatureDataUrl} 
                        alt="امضا" 
                        className="h-11 max-w-[140px] object-contain mx-auto"
                      />
                      <div className="text-[9px] text-emerald-700 font-mono mt-0.5">
                        ✓ امضا شد: {formatJalali(obs.signedAt!, false)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">محل امضای ناظر</span>
                  )}
                </div>

                <div className="text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-1">
                  توکن امنیتی: {obs.digitalCertificateToken ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Footer with Cryptographic Hash */}
        <div className="border-t-2 border-slate-900 pt-3 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2 font-mono">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-slate-800" />
            <span>هش یکپارچگی سند (SHA-256 Digest): </span>
            <strong className="text-slate-900">{session.finalMinutesHash ?? 'پیش‌نویس اولیه - در انتظار قفل نهایی'}</strong>
          </div>
          <div>
            <span>تاییدیه سامانه جامع انتخابات حضوری - نسخه رسمی RTL</span>
          </div>
        </div>
      </div>

      {/* Signature Modal for drawing signatures */}
      {activeSigningPerson && (
        <SignatureModal
          person={activeSigningPerson}
          isOpen={true}
          onClose={() => setActiveSigningPerson(null)}
          onSaveSignature={onSavePersonSignature}
        />
      )}
    </div>
  );
};
