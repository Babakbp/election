import React, { useState } from 'react';
import { ElectionSession, OfficialPerson, AuditEvent, ElectedRole } from '../types/election';
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
  Building2, 
  Fingerprint,
  FileSpreadsheet,
  Users,
  UserCheck,
  Award,
  Settings2,
  RotateCcw
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
  onUpdateCandidateElectedRoles?: (
    roles: Record<string, ElectedRole>,
    principalCount: number,
    alternateCount: number
  ) => void;
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
  onUpdateCandidateElectedRoles,
}) => {
  const [activeSigningPerson, setActiveSigningPerson] = useState<OfficialPerson | null>(null);

  // Principal and Alternate seat count configuration
  const [principalSeats, setPrincipalSeats] = useState<number>(() => session.principalSeatsCount ?? 5);
  const [alternateSeats, setAlternateSeats] = useState<number>(() => session.alternateSeatsCount ?? 2);
  const [candidateRoles, setCandidateRoles] = useState<Record<string, ElectedRole>>(() => {
    if (session.candidateElectedRoles) return session.candidateElectedRoles;
    const initial: Record<string, ElectedRole> = {};
    const pCount = session.principalSeatsCount ?? 5;
    const aCount = session.alternateSeatsCount ?? 2;
    rankedCandidates.forEach((c, index) => {
      if (index < pCount) {
        initial[c.id] = 'PRINCIPAL';
      } else if (index < pCount + aCount) {
        initial[c.id] = 'ALTERNATE';
      } else {
        initial[c.id] = 'NONE';
      }
    });
    return initial;
  });

  const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(() => session.status !== 'LOCKED_FINAL');

  const getCandidateElectedRole = (candId: string, index: number): ElectedRole => {
    if (candidateRoles[candId]) return candidateRoles[candId];
    if (index < principalSeats) return 'PRINCIPAL';
    if (index < principalSeats + alternateSeats) return 'ALTERNATE';
    return 'NONE';
  };

  const handleRoleChange = (candId: string, role: ElectedRole) => {
    if (session.status === 'LOCKED_FINAL') return;
    const nextRoles = { ...candidateRoles, [candId]: role };
    setCandidateRoles(nextRoles);
    if (onUpdateCandidateElectedRoles) {
      onUpdateCandidateElectedRoles(nextRoles, principalSeats, alternateSeats);
    }
  };

  const handleAutoAssignRoles = () => {
    if (session.status === 'LOCKED_FINAL') return;
    const autoRoles: Record<string, ElectedRole> = {};
    rankedCandidates.forEach((c, index) => {
      if (index < principalSeats) {
        autoRoles[c.id] = 'PRINCIPAL';
      } else if (index < principalSeats + alternateSeats) {
        autoRoles[c.id] = 'ALTERNATE';
      } else {
        autoRoles[c.id] = 'NONE';
      }
    });
    setCandidateRoles(autoRoles);
    if (onUpdateCandidateElectedRoles) {
      onUpdateCandidateElectedRoles(autoRoles, principalSeats, alternateSeats);
    }
  };

  const handlePrincipalSeatsChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(val, rankedCandidates.length));
    setPrincipalSeats(safeVal);
    // Recalculate auto assignment
    const autoRoles: Record<string, ElectedRole> = {};
    rankedCandidates.forEach((c, index) => {
      if (index < safeVal) {
        autoRoles[c.id] = 'PRINCIPAL';
      } else if (index < safeVal + alternateSeats) {
        autoRoles[c.id] = 'ALTERNATE';
      } else {
        autoRoles[c.id] = 'NONE';
      }
    });
    setCandidateRoles(autoRoles);
    if (onUpdateCandidateElectedRoles) {
      onUpdateCandidateElectedRoles(autoRoles, safeVal, alternateSeats);
    }
  };

  const handleAlternateSeatsChange = (val: number) => {
    const safeVal = Math.max(0, Math.min(val, Math.max(0, rankedCandidates.length - principalSeats)));
    setAlternateSeats(safeVal);
    const autoRoles: Record<string, ElectedRole> = {};
    rankedCandidates.forEach((c, index) => {
      if (index < principalSeats) {
        autoRoles[c.id] = 'PRINCIPAL';
      } else if (index < principalSeats + safeVal) {
        autoRoles[c.id] = 'ALTERNATE';
      } else {
        autoRoles[c.id] = 'NONE';
      }
    });
    setCandidateRoles(autoRoles);
    if (onUpdateCandidateElectedRoles) {
      onUpdateCandidateElectedRoles(autoRoles, principalSeats, safeVal);
    }
  };

  const principalCandidates = rankedCandidates.filter((c, idx) => getCandidateElectedRole(c.id, idx) === 'PRINCIPAL');
  const alternateCandidates = rankedCandidates.filter((c, idx) => getCandidateElectedRole(c.id, idx) === 'ALTERNATE');

  const isPresidingSigned = Boolean(session.presidingOfficer.signatureDataUrl);
  const observersSignedCount = session.observers.filter((o) => Boolean(o.signatureDataUrl)).length;
  const allSigned = isPresidingSigned && observersSignedCount === session.observers.length;
  const isLocked = session.status === 'LOCKED_FINAL';

  const isMultiPage = rankedCandidates.length > 5;
  const totalPages = isMultiPage ? 2 : 1;

  const handlePrint = () => {
    window.print();
  };

  const handleFinalCertification = () => {
    if (!allSigned) return;
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
            onClick={() => setIsRoleEditorOpen((prev) => !prev)}
            className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/40 transition shadow-sm"
            title="تعیین و تغییر اعضای اصلی و علی‌البدل منتخب"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>تعیین اعضای اصلی و علی‌البدل</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 font-mono text-[10px] text-white">
              {toPersianDigits(principalCandidates.length)}+{toPersianDigits(alternateCandidates.length)}
            </span>
          </button>

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

      {/* Role Assignment Management Panel (Hidden in print) */}
      {isRoleEditorOpen && !isLocked && (
        <div className="no-print print:hidden bg-slate-800/95 border-2 border-indigo-500/60 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  تعیین و تنظیم وضعیت منتخبین: اعضای اصلی و علی‌البدل
                </h4>
                <p className="text-xs text-slate-400">
                  تعداد کرسی‌ها را مشخص کنید یا برای هر کاندیدا وضعیت دلخواه را انتخاب نمایید (در صورتجلسه رسمی منعکس می‌شود).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoAssignRoles}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
              title="تخصیص مجدد اعضای اصلی و علی‌البدل بر اساس رتبه آرا"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>اعمال خودکار بر اساس بالاترین آرا</span>
            </button>
          </div>

          {/* Seat Counts Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/80">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-emerald-300">تعداد اعضای اصلی هیئت / شورا:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={rankedCandidates.length}
                  value={principalSeats}
                  onChange={(e) => handlePrincipalSeatsChange(parseInt(e.target.value, 10) || 1)}
                  className="w-16 bg-slate-950 border border-emerald-500/60 rounded-lg px-2 py-1 text-center font-mono font-bold text-sm text-emerald-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400">نفر</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-blue-300">تعداد اعضای علی‌البدل هیئت / شورا:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={Math.max(0, rankedCandidates.length - principalSeats)}
                  value={alternateSeats}
                  onChange={(e) => handleAlternateSeatsChange(parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-slate-950 border border-blue-500/60 rounded-lg px-2 py-1 text-center font-mono font-bold text-sm text-blue-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400">نفر</span>
              </div>
            </div>
          </div>

          {/* Candidate-by-Candidate Manual Overrides */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-slate-300 block">
              تنظیم انفرادی وضعیت هر کاندیدا (در صورت نیاز به تغییر دستی):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 scrollbar-thin">
              {rankedCandidates.map((c, idx) => {
                const currentRole = getCandidateElectedRole(c.id, idx);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                        رتبه {toPersianDigits(c.rank)}
                      </span>
                      <span className="font-bold text-white truncate max-w-[110px]">{c.name}</span>
                      <span className="font-mono text-emerald-400 font-bold text-[11px]">({toPersianDigits(c.votes)})</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRoleChange(c.id, 'PRINCIPAL')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          currentRole === 'PRINCIPAL'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="انتخاب به عنوان عضو اصلی"
                      >
                        اصلی
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange(c.id, 'ALTERNATE')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          currentRole === 'ALTERNATE'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="انتخاب به عنوان عضو علی‌البدل"
                      >
                        علی‌البدل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange(c.id, 'NONE')}
                        className={`px-1.5 py-1 rounded-lg text-[10px] transition ${
                          currentRole === 'NONE'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                        title="بدون انتخاب"
                      >
                        سایر
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                      <span className="text-slate-400 font-bold">{obs.role}</span>
                      {isSigned ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" /> امضا شد
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px]">در انتظار</span>
                      )}
                    </div>
                    <h5 className="font-bold text-white text-sm">{obs.name}</h5>
                    <p className="text-[11px] text-slate-400">{obs.organization}</p>
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
          Guarantees zero half-cut elements and crisp pagination (صفحه ... از ...)
      ========================================================================== */}
      <div 
        id="official-minutes-document"
        className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-2xl border border-slate-300 max-w-4xl mx-auto space-y-5 print:space-y-0 print:p-0 print:m-0 print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none"
        dir="rtl"
      >
        {/* ==================== PAGE 1 ==================== */}
        <div className={`page-1-wrapper space-y-3.5 print:space-y-2.5 ${isMultiPage ? 'page-1-multi' : ''}`}>
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-2.5 text-center relative print-avoid-break">
            <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
              <div className="text-right">
                <div>شماره صورتجلسه: <strong>{session.id}</strong></div>
                <div>کد شعبه: <strong>{toPersianDigits(session.stationNumber)}</strong></div>
              </div>
              
              {/* Center Emblem & Title */}
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-1 flex items-center justify-center text-slate-800">
                  <Building2 className="w-8 h-8" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-800">بسمه تعالی</h2>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
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
          <div className="border border-slate-400 rounded-lg p-2.5 text-xs leading-relaxed bg-slate-50 print-avoid-break">
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
          <div className="print-avoid-break">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-1.5 border-r-4 border-slate-800 pr-2">
              جدول آمار کلی تعرفه‌ها و آرای مأخوذه صندوق
            </h3>
            <table className="w-full border-collapse border border-slate-400 text-center text-xs">
              <thead className="bg-slate-200 font-bold">
                <tr>
                  <th className="border border-slate-400 py-1.5 px-1">کل واجدین شرایط</th>
                  <th className="border border-slate-400 py-1.5 px-1">مجموع آرای مأخوذه (کل برگه‌ها)</th>
                  <th className="border border-slate-400 py-1.5 px-1">آرای صحیح نامزدها</th>
                  <th className="border border-slate-400 py-1.5 px-1">آرای باطله سفید (ممتنع)</th>
                  <th className="border border-slate-400 py-1.5 px-1">آرای باطله غیرمجاز (مخدوش)</th>
                  <th className="border border-slate-400 py-1.5 px-1">درصد مشارکت شعبه</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="border border-slate-400 py-2 font-bold">{toPersianDigits(session.registeredVotersCount)}</td>
                  <td className="border border-slate-400 py-2 font-black text-sm">{toPersianDigits(totalVotes)}</td>
                  <td className="border border-slate-400 py-2 font-bold text-emerald-800">{toPersianDigits(totalValidVotes)}</td>
                  <td className="border border-slate-400 py-2">{toPersianDigits(session.blankBallots)}</td>
                  <td className="border border-slate-400 py-2 text-red-700">{toPersianDigits(session.invalidBallots)}</td>
                  <td className="border border-slate-400 py-2 font-bold">
                    {toPersianDigits(session.registeredVotersCount > 0 ? ((totalVotes / session.registeredVotersCount) * 100).toFixed(1) : 0)}٪
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Official Results & Candidate Rankings (With Dedicated Alternate Member Column) */}
          <div className="print-avoid-break">
            <div className="flex items-center justify-between mb-1.5 border-r-4 border-slate-800 pr-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                نتایج تفصیلی شمارش آرا، رتبه‌بندی نهایی و وضعیت انتخاب نامزدها
              </h3>
              <div className="text-[11px] text-slate-600 font-mono hidden sm:block">
                <span>کرسی اصلی: <strong>{toPersianDigits(principalSeats)}</strong> نفر</span>
                <span className="mx-1">•</span>
                <span>کرسی علی‌البدل: <strong>{toPersianDigits(alternateSeats)}</strong> نفر</span>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead className="bg-slate-200 font-bold text-center">
                <tr>
                  <th className="border border-slate-400 py-1.5 px-1.5 w-10">رتبه</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 w-12">تصویر</th>
                  <th className="border border-slate-400 py-1.5 px-1.5 w-16">کد نامزدی</th>
                  <th className="border border-slate-400 py-1.5 px-2.5 text-right">نام و نام خانوادگی نامزد</th>
                  <th className="border border-slate-400 py-1.5 px-2 text-right">ائتلاف / وابستگی</th>
                  <th className="border border-slate-400 py-1.5 px-2">تعداد آرای مأخوذه</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">درصد آرا</th>
                  <th className="border border-slate-400 py-1.5 px-2">وضعیت در صورتجلسه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {rankedCandidates.map((c, idx) => {
                  const role = getCandidateElectedRole(c.id, idx);
                  const isPrincipal = role === 'PRINCIPAL';
                  const isAlternate = role === 'ALTERNATE';

                  return (
                    <tr
                      key={c.id}
                      className={
                        isPrincipal
                          ? 'bg-emerald-50/70 font-semibold'
                          : isAlternate
                          ? 'bg-blue-50/70 font-semibold'
                          : ''
                      }
                    >
                      <td className="border border-slate-400 py-1.5 text-center font-bold font-mono">
                        {toPersianDigits(c.rank)}
                      </td>
                      <td className="border border-slate-400 py-1 text-center">
                        <img 
                          src={c.avatarUrl} 
                          alt={c.name} 
                          className="w-7 h-7 rounded-full mx-auto object-cover border border-slate-400"
                        />
                      </td>
                      <td className="border border-slate-400 py-1.5 text-center font-mono font-bold">
                        {toPersianDigits(c.candidateNumber)}
                      </td>
                      <td className="border border-slate-400 py-1.5 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <strong>{c.name}</strong>
                          {isPrincipal && (
                            <span className="text-[10px] text-emerald-700 font-bold hidden sm:inline">(اصلی)</span>
                          )}
                          {isAlternate && (
                            <span className="text-[10px] text-blue-700 font-bold hidden sm:inline">(علی‌البدل)</span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">کد ملی: {c.nationalIdMasked}</div>
                      </td>
                      <td className="border border-slate-400 py-1.5 px-2 text-slate-700 text-[11px]">
                        {c.affiliation}
                      </td>
                      <td className="border border-slate-400 py-1.5 text-center font-black font-mono text-xs sm:text-sm">
                        {toPersianDigits(c.votes)} رأی
                      </td>
                      <td className="border border-slate-400 py-1.5 text-center font-mono text-[11px]">
                        {toPersianDigits(c.percentage)}٪
                      </td>
                      <td className="border border-slate-400 py-1.5 px-2 text-center">
                        {/* Interactive Role Buttons (Screen Only) */}
                        {!isLocked ? (
                          <div className="no-print flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRoleChange(c.id, 'PRINCIPAL')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                isPrincipal
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-200 text-slate-700 hover:bg-emerald-100'
                              }`}
                              title="انتخاب به عنوان عضو اصلی"
                            >
                              اصلی
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(c.id, 'ALTERNATE')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                isAlternate
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-200 text-slate-700 hover:bg-blue-100'
                              }`}
                              title="انتخاب به عنوان عضو علی‌البدل"
                            >
                              علی‌البدل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(c.id, 'NONE')}
                              className={`px-1.5 py-0.5 rounded text-[9px] transition ${
                                role === 'NONE'
                                  ? 'bg-slate-500 text-white'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                              title="بدون انتخاب"
                            >
                              سایر
                            </button>
                          </div>
                        ) : null}

                        {/* Official Badge for Print (or when locked) */}
                        <div className={!isLocked ? 'hidden print:block' : ''}>
                          {isPrincipal ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-500">
                              عضو اصلی
                            </span>
                          ) : isAlternate ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-500">
                              عضو علی‌البدل
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              عدم انتخاب
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Footer of Page 1 (If Multi-page: Shows صفحه ۱ از ۲) */}
          {isMultiPage && (
            <div className="border-t border-slate-400 pt-2 flex items-center justify-between text-[10px] text-slate-600 font-mono print-avoid-break">
              <div>شماره صورتجلسه: <strong>{session.id}</strong> • شعبه {toPersianDigits(session.stationNumber)}</div>
              <div className="text-center font-bold text-slate-700">ادامه صورتجلسه و امضای مسئولین در صفحه دوم ↵</div>
              <div className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                صفحه {toPersianDigits(1)} از {toPersianDigits(totalPages)}
              </div>
            </div>
          )}
        </div>

        {/* ==================== PAGE 2 (Or continuation on same page if <= 5 candidates) ==================== */}
        <div className={`page-2-wrapper space-y-3.5 print:space-y-2.5 ${isMultiPage ? 'page-2-multi pt-3 print:pt-0' : 'pt-2'}`}>
          {/* Page 2 Repeater Header (Printed only on page 2: Shows صفحه ۲ از ۲) */}
          {isMultiPage && (
            <div className="hidden print:block border-b-2 border-slate-800 pb-2 mb-2 print-avoid-break">
              <div className="flex items-center justify-between text-[10px] text-slate-700 font-mono">
                <div>
                  <strong>بسمه تعالی - ادامه صورتجلسه رسمی شمارش آرا</strong>
                </div>
                <div>
                  صورتجلسه: <strong>{session.id}</strong> • صندوق: <strong>{session.boxNumber}</strong> • شعبه: <strong>{toPersianDigits(session.stationNumber)}</strong>
                </div>
                <div className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                  صفحه {toPersianDigits(2)} از {toPersianDigits(totalPages)}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Official Declaration of Principal and Alternate Members */}
          <div className="border border-slate-400 rounded-lg p-3 text-xs bg-slate-50 print-avoid-break elected-summary-box">
            <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>اعلام رسمی اسامی منتخبین نهایی (اعضای اصلی و اعضای علی‌البدل):</span>
              </span>
              <span className="font-mono text-[11px] text-slate-600">
                {toPersianDigits(principalCandidates.length)} نفر عضو اصلی • {toPersianDigits(alternateCandidates.length)} نفر عضو علی‌البدل
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Principal Elected Members */}
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-2.5">
                <div className="font-black text-emerald-900 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>الف) اسامی اعضای اصلی منتخب (به ترتیب آرا):</span>
                </div>
                {principalCandidates.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-800 font-semibold pr-1">
                    {principalCandidates.map((c) => (
                      <li key={c.id}>
                        <strong>{c.name}</strong> (کد {toPersianDigits(c.candidateNumber)}) - {toPersianDigits(c.votes)} رأی ({toPersianDigits(c.percentage)}٪)
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">هیچ عضو اصلی تعیین نشده است</span>
                )}
              </div>

              {/* Alternate Elected Members */}
              <div className="bg-blue-50/80 border border-blue-300 rounded-lg p-2.5">
                <div className="font-black text-blue-900 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-700" />
                  <span>ب) اسامی اعضای علی‌البدل منتخب (به ترتیب آرا):</span>
                </div>
                {alternateCandidates.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-800 font-semibold pr-1">
                    {alternateCandidates.map((c) => (
                      <li key={c.id}>
                        <strong>{c.name}</strong> (کد {toPersianDigits(c.candidateNumber)}) - {toPersianDigits(c.votes)} رأی ({toPersianDigits(c.percentage)}٪)
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">هیچ عضو علی‌البدلی تعیین نشده است</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Audit and Incidents Summary */}
          <div className="border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 space-y-1 print-avoid-break audit-summary-box">
            <h4 className="font-bold text-slate-800">خلاصه گزارش ممیزی، شکایات و فرآیند قانونی:</h4>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              فرآیند شمارش با حضور کامل هیئت نظارت و مسئول حوزه صورت پذیرفت. کل رویدادهای ممیزی الکترونیکی ثبت‌شده: 
              <strong> {toPersianDigits(auditEvents.length)} مورد </strong> 
              (شامل {toPersianDigits(auditEvents.filter(e => e.actionType === 'VOTE_CORRECTION_DECREASE').length)} مورد اصلاح دارای دلایل مستند) می‌باشد.
              هیچ‌گونه تخلف موثری در فرآیند اخذ و شمارش مشاهده نگردید و صحت نتایج با امضای ذیل مورد تایید قطعی است.
            </p>
          </div>

          {/* Section 6: Official Signatures and Certification Blocks (Completely Intact - Never Cut in Half) */}
          <div className="print-avoid-break signatures-container">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-2 border-r-4 border-slate-800 pr-2">
              بخش تایید، امضاها و گواهی قانونی صحت انتخابات
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Presiding Officer Signature Box */}
              <div className="border-2 border-slate-400 rounded-xl p-3 flex flex-col justify-between text-center min-h-[135px] bg-white signature-card print-avoid-break">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block">رئیس شعبه و مسئول حوزه</span>
                  <strong className="text-xs text-slate-900 mt-0.5 block">{session.presidingOfficer.name}</strong>
                  <span className="text-[10px] text-slate-500 font-mono block">کد ملی: {session.presidingOfficer.nationalIdMasked}</span>
                </div>

                <div className="my-1.5 flex items-center justify-center min-h-[45px]">
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
                <div key={obs.id} className="border-2 border-slate-400 rounded-xl p-3 flex flex-col justify-between text-center min-h-[135px] bg-white signature-card print-avoid-break">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block">{obs.role}</span>
                    <strong className="text-xs text-slate-900 mt-0.5 block">{obs.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono block">{obs.organization}</span>
                  </div>

                  <div className="my-1.5 flex items-center justify-center min-h-[45px]">
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

          {/* Document Footer with Hash and Page Number (Always shows صفحه ... از ...) */}
          <div className="border-t-2 border-slate-900 pt-2.5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-2 font-mono print-avoid-break">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-slate-800" />
              <span>هش یکپارچگی سند (SHA-256): </span>
              <strong className="text-slate-900">{session.finalMinutesHash ?? 'پیش‌نویس اولیه - در انتظار قفل نهایی'}</strong>
            </div>

            <div className="flex items-center gap-3">
              <span>سامانه شفافیت انتخابات حضوری</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                صفحه {toPersianDigits(totalPages)} از {toPersianDigits(totalPages)}
              </span>
            </div>
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
