import React, { useState } from 'react';
import { ElectionSession, SessionStatus, TieBreakerRule, OfficialPerson, Operator } from '../types/election';
import { toPersianDigits, formatJalali, maskNationalId, toEnglishDigits } from '../utils/persian';
import { getTieBreakerRuleTitle } from '../utils/tieBreaker';
import { 
  Settings, 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  Scale, 
  Building, 
  Clock, 
  FileCheck,
  AlertTriangle,
  Phone,
  UserPlus,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  Users,
  Edit3,
  X,
  Eye
} from 'lucide-react';

interface SessionConfigTabProps {
  session: ElectionSession;
  isLocked: boolean;
  operators: Operator[];
  isDemoMode: boolean;
  onUpdateSession: (updated: Partial<ElectionSession>, reason: string) => void;
  onAdvanceStatus: (nextStatus: SessionStatus, reason: string) => void;
  onUpdateOperators: (newOperators: Operator[], reason: string) => void;
  onSwitchToRealElection: () => void;
  onLoadDemoData: () => void;
}

export const SessionConfigTab: React.FC<SessionConfigTabProps> = ({
  session,
  isLocked,
  operators,
  isDemoMode,
  onUpdateSession,
  onAdvanceStatus,
  onUpdateOperators,
  onSwitchToRealElection,
  onLoadDemoData,
}) => {
  const [title, setTitle] = useState(session.title);
  const [constituency, setConstituency] = useState(session.constituency);
  const [stationNumber, setStationNumber] = useState(session.stationNumber);
  const [boxNumber, setBoxNumber] = useState(session.boxNumber);
  const [registeredVotersCount, setRegisteredVotersCount] = useState(session.registeredVotersCount);
  const [maxVotesPerVoter, setMaxVotesPerVoter] = useState(session.maxVotesPerVoter || 1);
  const [hideVotedCandidatesInKiosk, setHideVotedCandidatesInKiosk] = useState(session.hideVotedCandidatesInKiosk !== false);
  const [hasAgeRestriction, setHasAgeRestriction] = useState(session.hasAgeRestriction ?? false);
  const [minAge, setMinAge] = useState<number>(session.minAge ?? 18);
  const [maxAge, setMaxAge] = useState<number | undefined>(session.maxAge);
  const [tieBreakerRule, setTieBreakerRule] = useState<TieBreakerRule>(session.tieBreakerRule);
  const [actionReason, setActionReason] = useState('');
  const [modalStatusChange, setModalStatusChange] = useState<SessionStatus | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Confirm demo wipe modal
  const [isConfirmWipeOpen, setIsConfirmWipeOpen] = useState(false);

  // Edit Presiding Officer modal state
  const [isEditPresidingOpen, setIsEditPresidingOpen] = useState(false);
  const [presidingName, setPresidingName] = useState(session.presidingOfficer.name);
  const [presidingRole, setPresidingRole] = useState(session.presidingOfficer.role);
  const [presidingOrg, setPresidingOrg] = useState(session.presidingOfficer.organization);
  const [presidingNId, setPresidingNId] = useState('');

  // Add Observer modal state
  const [isAddObserverOpen, setIsAddObserverOpen] = useState(false);
  const [obsName, setObsName] = useState('');
  const [obsRole, setObsRole] = useState('ناظر قانونی هیئت نظارت');
  const [obsOrg, setObsOrg] = useState('شورای نظارت بر انتخابات');
  const [obsNId, setObsNId] = useState('');

  // Operator modal state
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [opName, setOpName] = useState('');
  const [opRole, setOpRole] = useState('اپراتور ارشد شمارش آرا');
  const [opOrg, setOpOrg] = useState('هیئت اجرایی انتخابات');
  const [opNId, setOpNId] = useState('');
  const [opPhone, setOpPhone] = useState('');
  const [opError, setOpError] = useState('');

  const handleOpenEditPresiding = () => {
    setPresidingName(session.presidingOfficer.name);
    setPresidingRole(session.presidingOfficer.role);
    setPresidingOrg(session.presidingOfficer.organization);
    setPresidingNId('');
    setIsEditPresidingOpen(true);
  };

  const handleSavePresidingOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presidingName.trim()) return;
    const cleanNId = toEnglishDigits(presidingNId).trim();
    const masked = cleanNId ? maskNationalId(cleanNId) : (session.presidingOfficer.nationalIdMasked || '***-****-***');

    const updatedPresiding: OfficialPerson = {
      ...session.presidingOfficer,
      id: session.presidingOfficer.id || `OFF-${Date.now()}`,
      name: presidingName.trim(),
      role: presidingRole.trim() || 'مسئول حوزه (رئیس شعبه)',
      organization: presidingOrg.trim() || 'هیئت اجرایی',
      nationalIdMasked: masked,
    };

    onUpdateSession({ presidingOfficer: updatedPresiding }, `ثبت/ویرایش مشخصات مسئول شعبه: ${updatedPresiding.name}`);
    setIsEditPresidingOpen(false);
  };

  const handleAddObserver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsName.trim()) return;
    const cleanNId = toEnglishDigits(obsNId).trim();
    const masked = cleanNId ? maskNationalId(cleanNId) : '***-****-***';

    const newObs: OfficialPerson = {
      id: `OBS-${Date.now()}`,
      name: obsName.trim(),
      role: obsRole.trim() || 'ناظر قانونی هیئت نظارت',
      organization: obsOrg.trim() || 'شورای نظارت بر انتخابات',
      nationalIdMasked: masked,
    };

    const nextObservers = [...session.observers, newObs];
    onUpdateSession({ observers: nextObservers }, `افزودن ناظر رسمی جدید: ${newObs.name} (${newObs.role})`);
    setObsName('');
    setObsNId('');
    setIsAddObserverOpen(false);
  };

  const handleDeleteObserver = (obsId: string) => {
    if (isLocked) return;
    const target = session.observers.find(o => o.id === obsId);
    if (!target) return;
    const nextObservers = session.observers.filter(o => o.id !== obsId);
    onUpdateSession({ observers: nextObservers }, `حذف ناظر از فهرست رسمی: ${target.name}`);
  };

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    onUpdateSession(
      {
        title,
        constituency,
        stationNumber,
        boxNumber,
        registeredVotersCount: Number(registeredVotersCount) || 0,
        maxVotesPerVoter: Math.max(1, Number(maxVotesPerVoter) || 1),
        hideVotedCandidatesInKiosk,
        hasAgeRestriction,
        minAge: Number(minAge) || 18,
        maxAge: maxAge ? Number(maxAge) : undefined,
        tieBreakerRule,
      },
      'بروزرسانی مشخصات و تنظیمات عمومی حوزه انتخابات و شرط رده سنی'
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStatusChange) return;
    if (!actionReason.trim()) return;

    onAdvanceStatus(modalStatusChange, actionReason.trim());
    setModalStatusChange(null);
    setActionReason('');
  };

  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opName.trim()) {
      setOpError('نام و نام خانوادگی الزامی است.');
      return;
    }
    const cleanNId = toEnglishDigits(opNId).trim();
    const masked = cleanNId ? maskNationalId(cleanNId) : '***-****-***';

    const newOp: Operator = {
      id: `OP-${Date.now()}`,
      name: opName.trim(),
      role: opRole,
      organization: opOrg.trim() || 'هیئت اجرایی',
      nationalIdMasked: masked,
      phoneNumber: toEnglishDigits(opPhone).trim() || '—',
    };

    onUpdateOperators([...operators, newOp], `افزودن عضو مسئول / اپراتور جدید: ${newOp.name} (${newOp.role})`);
    setOpName('');
    setOpNId('');
    setOpPhone('');
    setIsAddOperatorOpen(false);
    setOpError('');
  };

  const handleDeleteOperator = (opId: string) => {
    if (isLocked) return;
    const target = operators.find(o => o.id === opId);
    if (!target) return;
    if (operators.length <= 1) {
      alert('حداقل یک اپراتور یا مسئول باید در سامانه ثبت باشد.');
      return;
    }
    const remaining = operators.filter(o => o.id !== opId);
    onUpdateOperators(remaining, `حذف اپراتور: ${target.name}`);
  };

  const getStatusLabel = (s: SessionStatus) => {
    switch (s) {
      case 'PREPARATION':
        return '۱. آماده‌سازی، بررسی خالی بودن صندوق و الصاق پلمپ';
      case 'ACTIVE_VOTING':
        return '۲. فرآیند اخذ و شمارش حضوری آرا (فعال)';
      case 'DISPUTE_REVIEW':
        return '۳. توقف موقت و رسیدگی به اعتراضات';
      case 'AWAITING_SIGNATURES':
        return '۴. خاتمه شمارش، تنظیم صورتجلسه و انتظار امضاها';
      case 'LOCKED_FINAL':
        return '۵. قفل نهایی و قطعی (پلمپ دائم سند صورتجلسه)';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          DEMO MODE VS REAL ELECTION CONTROL (Requested by user)
      ========================================================================== */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isDemoMode
          ? 'bg-amber-950/20 border-amber-500/40'
          : 'bg-emerald-950/20 border-emerald-500/40'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${
              isDemoMode ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">
                  وضعیت فعلی داده‌ها: {isDemoMode ? 'حالت آزمایشی و آموزشی (Demo Mode)' : 'حالت انتخابات رسمی و واقعی'}
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                  isDemoMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isDemoMode ? 'داده‌های دمو فعال' : 'آماده ثبت واقعی'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {isDemoMode
                  ? 'اکنون نامزدهای نمونه و آرای آزمایشی جهت بررسی و تست عملکرد در برنامه فعال هستند. برای شروع رأی‌گیری واقعی، دکمه پاک‌سازی را بزنید.'
                  : 'برنامه در وضعیت ثبت واقعی افراد و آرا قرار دارد و هیچ نامزد آزمایشی نمایش داده نمی‌شود.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isDemoMode ? (
              <button
                type="button"
                onClick={() => setIsConfirmWipeOpen(true)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/50 flex items-center gap-2 transition"
                title="پاکسازی تمام شرکت‌کنندگان و آرای آزمایشی برای ثبت افراد واقعی"
              >
                <Trash2 className="w-4 h-4" />
                <span>پاک‌سازی داده‌های دمو و شروع ثبت واقعی</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadDemoData}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/50 flex items-center gap-2 transition"
                title="بارگذاری مجدد نامزدها و آرای نمونه جهت تست"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>بارگذاری مجدد داده‌های دمو (جهت تست)</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* State Flow Wizard */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">مراحل و وضعیت چرخه حیات جلسه انتخابات</h4>
          </div>
          <span className="text-xs text-slate-400">
            شروع جلسه: {formatJalali(session.openedAt, false)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {(['PREPARATION', 'ACTIVE_VOTING', 'DISPUTE_REVIEW', 'AWAITING_SIGNATURES', 'LOCKED_FINAL'] as SessionStatus[]).map((step, idx) => {
            const isCurrent = session.status === step;
            return (
              <div
                key={step}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition ${
                  isCurrent
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-slate-500">گام {toPersianDigits(idx + 1)}</span>
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  </div>
                  <p className="line-clamp-2 leading-relaxed">{getStatusLabel(step)}</p>
                </div>

                {!isLocked && !isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalStatusChange(step);
                      setActionReason('');
                    }}
                    className="mt-3 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-700 transition text-center"
                  >
                    تغییر به این مرحله
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Details Form */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
            <Building className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">مشخصات شعبه و صندوق رأی</h4>
          </div>

          <form onSubmit={handleSaveGeneralSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">عنوان کامل انتخابات و جلسه:</label>
              <input
                type="text"
                disabled={isLocked}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">حوزه انتخابیه:</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={constituency}
                  onChange={(e) => setConstituency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شماره شعبه اخذ رأی:</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={stationNumber}
                  onChange={(e) => setStationNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شماره/عنوان صندوق:</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={boxNumber}
                  onChange={(e) => setBoxNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">تعداد واجدین شرایط (تعرفه‌ها):</label>
                <input
                  type="number"
                  disabled={isLocked}
                  value={registeredVotersCount}
                  onChange={(e) => setRegisteredVotersCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Max Votes Allowed Per Voter (سقف انتخاب برای هر رأی‌دهنده) */}
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>سقف مجاز انتخاب کاندیداها برای هر رأی‌دهنده:</span>
                </div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {toPersianDigits(maxVotesPerVoter)} کاندیدا
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                مشخص می‌کند هر رأی‌دهنده مجاز به انتخاب همزمان چند نفر است. این سقف به صورت خودکار در صفحه کیوسک لمسی و اسکن موبایل اعمال می‌گردد.
              </p>
              
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {[1, 2, 3, 5, 7, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setMaxVotesPerVoter(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      maxVotesPerVoter === num
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {toPersianDigits(num)} {num === 1 ? 'نفر (تک‌انتخابی)' : 'نفر'}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 mr-auto">
                  <span className="text-[11px] text-slate-400">تعداد دلخواه:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    disabled={isLocked}
                    value={maxVotesPerVoter}
                    onChange={(e) => setMaxVotesPerVoter(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Hide Voted Candidates in Touch Kiosk / Mobile (حذف کاندیداهای رأی‌داده‌شده) */}
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span>حذف و عدم نمایش کاندیداهای رأی‌داده‌شده در صفحه لمسی:</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    hideVotedCandidatesInKiosk 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {hideVotedCandidatesInKiosk ? 'فعال (حذف کاندیدا پس از اخذ رأی)' : 'غیرفعال (نمایش همه)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  با فعال بودن این گزینه، در مانیتور لمسی و صفحه رأی موبایل، کاندیدایی که به او رأی داده می‌شود بلافاصله از صفحه حذف و دیگر دیده نمی‌شود تا از رأی مجدد به ایشان جلوگیری گردد.
                </p>
              </div>

              <button
                type="button"
                disabled={isLocked}
                onClick={() => setHideVotedCandidatesInKiosk(!hideVotedCandidatesInKiosk)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 active:scale-95 ${
                  hideVotedCandidatesInKiosk
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {hideVotedCandidatesInKiosk ? 'فعال (حذف خودکار پس از رأی)' : 'غیرفعال (نمایش دائمی کاندیداها)'}
              </button>
            </div>

            {/* Age Restriction Configuration (شرط رده سنی - قابل انتخاب یا عدم انتخاب) */}
            <div className={`p-4 rounded-xl border transition-all space-y-3 ${
              hasAgeRestriction
                ? 'bg-amber-950/25 border-amber-500/40 shadow-inner'
                : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className={`w-4 h-4 ${hasAgeRestriction ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-white">شرط و رده سنی مجاز رأی‌دهندگان:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasAgeRestriction
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {hasAgeRestriction ? 'فعال (اعمال شرط سنی)' : 'غیرفعال (بدون محدودیت سنی - همه سنین مجاز)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    قابلیت انتخاب یا عدم انتخاب رده سنی برای رأی‌دهندگان. در صورت فعال بودن، در فایل اکسل ورودی و ثبت‌نام دستی، تاریخ تولد شمسی با این رده سنی سنجیده می‌شود.
                  </p>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setHasAgeRestriction(!hasAgeRestriction)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 active:scale-95 flex items-center gap-1.5 ${
                    hasAgeRestriction
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span>{hasAgeRestriction ? 'غیرفعال‌سازی شرط سنی' : 'فعال‌سازی شرط سنی'}</span>
                </button>
              </div>

              {/* Controls when Age Restriction is Active */}
              {hasAgeRestriction && (
                <div className="pt-3 border-t border-amber-500/20 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Minimum Age */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-300">حداقل سن مجاز (سال تمام):</label>
                        <span className="text-xs font-black font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {toPersianDigits(minAge)} سال
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[15, 18, 20, 25].map((age) => (
                          <button
                            key={age}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setMinAge(age)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                              minAge === age
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {toPersianDigits(age)} {age === 18 ? 'سال (قانونی)' : 'سال'}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 mr-auto">
                          <span className="text-[10px] text-slate-400">دلخواه:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            disabled={isLocked}
                            value={minAge}
                            onChange={(e) => setMinAge(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:border-amber-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Maximum Age (Optional) */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">حداکثر سقف سنی (اختیاری):</label>
                        <span className="text-xs font-black font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {maxAge ? `${toPersianDigits(maxAge)} سال` : 'بدون سقف'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => setMaxAge(undefined)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            !maxAge
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          بدون سقف
                        </button>
                        {[35, 50, 65, 75].map((age) => (
                          <button
                            key={age}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setMaxAge(age)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                              maxAge === age
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {toPersianDigits(age)} {age === 35 ? 'سال (جوانان)' : 'سال'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 rounded-xl text-xs text-amber-200/90 flex items-center justify-between flex-wrap gap-2">
                    <span>
                      🎯 <strong>رده سنی مصوب:</strong> {maxAge ? `از سن ${toPersianDigits(minAge)} تا ${toPersianDigits(maxAge)} سال` : `از سن ${toPersianDigits(minAge)} سال به بالا`}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      تاریخ تولد شمسی در ورود اکسل اعتبارسنجی می‌شود
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tie-breaker Rule Selector */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Scale className="w-4 h-4" />
                <span>قانون شکستن تساوی آرای نامزدها (Tie-Breaker Rule)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                در صورت کسب آرای کاملاً مساوی، نحوه اولویت‌بندی در رتبه چگونه تعیین شود؟
              </p>
              <select
                disabled={isLocked}
                value={tieBreakerRule}
                onChange={(e) => setTieBreakerRule(e.target.value as TieBreakerRule)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="ELDER_AGE">اولویت سن (بزرگ‌تر بودن سن تقویمی)</option>
                <option value="REGISTRATION_TIME">تقدم تاریخ و زمان ثبت‌نام اولیه در دبیرخانه</option>
                <option value="CANDIDATE_CODE">کد انتخاباتی کمتر (ترتیب الفبا/شماره رسمی)</option>
                <option value="LOTTERY">قرعه‌کشی رسمی با حضور هیئت نظارت و صورتجلسه مجزا</option>
              </select>
            </div>

            {!isLocked && (
              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 font-bold">تنظیمات با موفقیت ذخیره شد.</span>
                ) : <span />}
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                >
                  ذخیره تنظیمات شعبه
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Presiding Officer, Observers & Operators Team Management */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">ارکان، ناظران و عوامل اجرایی شعبه</h4>
          </div>

          {/* 1. Presiding Officer */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-bold">مسئول حوزه (رئیس شعبه اخذ رأی)</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40">
                  مقام ارشد قانونی شعبه
                </span>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleOpenEditPresiding}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>ثبت / ویرایش مشخصات</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <strong className="text-white text-sm">{session.presidingOfficer.name || 'تعیین نشده (لطفاً ثبت کنید)'}</strong>
              <span className="font-mono text-slate-400">کد ملی: {session.presidingOfficer.nationalIdMasked}</span>
            </div>

            <div className="text-[11px] text-slate-400">
              نهاد: {session.presidingOfficer.organization || 'هیئت اجرایی'} • {session.presidingOfficer.role || 'مسئول حوزه'}
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400">وضعیت امضا:</span>
              {session.presidingOfficer.signatureDataUrl ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  امضا شده در {formatJalali(session.presidingOfficer.signedAt!, true)}
                </span>
              ) : (
                <span className="text-amber-400">در انتظار امضا در برگه صورتجلسه</span>
              )}
            </div>
          </div>

          {/* 2. Official Observers Section */}
          <div className="space-y-3 pt-2 border-t border-slate-700/80">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ناظران قانونی و بازرسان رسمی هیئت نظارت ({toPersianDigits(session.observers.length)} نفر):</span>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setIsAddObserverOpen(true)}
                  className="px-2.5 py-1 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن ناظر جدید</span>
                </button>
              )}
            </div>

            {session.observers.length === 0 ? (
              <div className="p-3 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl text-center text-xs text-slate-400">
                هنوز ناظری ثبت نشده است. جهت اعتبارسنجی صورتجلسه، ناظران هیئت نظارت را اضافه فرمایید.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {session.observers.map((obs) => (
                  <div 
                    key={obs.id}
                    className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 text-xs flex items-center justify-between gap-2 hover:border-slate-600 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-white truncate">{obs.name}</strong>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-teal-300 rounded-full border border-slate-700">
                          {obs.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        نهاد: {obs.organization} • کد ملی: <span className="font-mono text-slate-300">{obs.nationalIdMasked}</span>
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {obs.signatureDataUrl ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> امضا شده
                          </span>
                        ) : (
                          <span className="text-amber-400">در انتظار امضا</span>
                        )}
                      </div>
                    </div>

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleDeleteObserver(obs.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                        title="حذف این ناظر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Operators & Tally Personnel Team */}
          <div className="space-y-3 pt-2 border-t border-slate-700/80">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>عوامل اجرایی و اپراتورهای ثبت آرا ({toPersianDigits(operators.length)} نفر):</span>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>افزودن اپراتور جدید</span>
                </button>
              )}
            </div>

            {operators.length === 0 ? (
              <div className="p-3 bg-amber-950/30 border border-amber-600/40 rounded-xl text-center text-xs text-amber-200">
                در حال حاضر هیچ اپراتوری ثبت نشده است. لطفاً دکمه «افزودن اپراتور جدید» را بزنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {operators.map((op) => (
                  <div 
                    key={op.id}
                    className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 text-xs flex items-center justify-between gap-2 hover:border-slate-600 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-white truncate">{op.name}</strong>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-emerald-300 rounded-full border border-slate-700">
                          {op.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>نهاد: {op.organization ?? 'هیئت اجرایی'}</span>
                        {op.phoneNumber && (
                          <span className="font-mono text-slate-300 flex items-center gap-1" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {toPersianDigits(op.phoneNumber)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        کد ملی: {op.nationalIdMasked}
                      </div>
                    </div>

                    {!isLocked && operators.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOperator(op.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                        title="حذف این اپراتور"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Operator Modal */}
      {isAddOperatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4" dir="rtl">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>ثبت مشخصات اپراتور یا ناظر جدید شعبه</span>
            </h4>

            <form onSubmit={handleAddOperator} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  placeholder="مثال: دکتر علیرضا ناصری"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  سمت و نقش در شعبه:
                </label>
                <select
                  value={opRole}
                  onChange={(e) => setOpRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                >
                  <option value="مسئول حوزه (رئیس شعبه)">مسئول حوزه (رئیس شعبه)</option>
                  <option value="ناظر عالی هیئت نظارت">ناظر عالی هیئت نظارت</option>
                  <option value="ناظر نماینده نامزدها">ناظر نماینده نامزدها</option>
                  <option value="اپراتور ارشد شمارش آرا">اپراتور ارشد شمارش آرا</option>
                  <option value="منشی ثبت و تطبیق تعرفه‌ها">منشی ثبت و تطبیق تعرفه‌ها</option>
                  <option value="بازرس معتمد مستقل">بازرس معتمد مستقل</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  سازمان یا ارگان معرفی‌کننده:
                </label>
                <input
                  type="text"
                  value={opOrg}
                  onChange={(e) => setOpOrg(e.target.value)}
                  placeholder="مثال: فرمانداری / کانون صنفی / شورای نظارت"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  شماره ملی ۱۰ رقمی:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={opNId}
                  onChange={(e) => setOpNId(e.target.value)}
                  placeholder="جهت اعتبارسنجی (ماسک‌گذاری خودکار)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  شماره تماس / همراه:
                </label>
                <input
                  type="text"
                  value={opPhone}
                  onChange={(e) => setOpPhone(e.target.value)}
                  placeholder="مثال: 09121234567"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              {opError && (
                <p className="text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800 text-[11px]">
                  {opError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOperatorOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  ثبت عضو مسئول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Advance Modal */}
      {modalStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="bg-slate-900 border border-emerald-500/60 rounded-2xl max-w-md w-full text-slate-100 shadow-2xl p-6 space-y-4"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-emerald-400">
              <FileCheck className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-base text-white">تغییر وضعیت رسمی جلسه</h4>
                <p className="text-xs text-slate-400">{getStatusLabel(modalStatusChange)}</p>
              </div>
            </div>

            {modalStatusChange === 'LOCKED_FINAL' && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>
                  توجه بسیار مهم: پس از قفل نهایی، شمارش آرا برای همیشه بسته خواهد شد و صورتجلسه دارای کد پلمپ قطعی می‌گردد. اطمینان حاصل کنید تمامی امضاها ثبت شده باشند.
                </span>
              </div>
            )}

            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  دلیل موجه یا مصوبه تغییر وضعیت: <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="مثال: پایان رسمی مهلت اخذ رأی با اعلام رئیس شعبه و موافقت ناظران هیئت نظارت..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalStatusChange(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!actionReason.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition"
                >
                  ثبت رسمی تغییر وضعیت در دفتر ممیزی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Wipe Demo Data Modal */}
      {isConfirmWipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div 
            className="bg-slate-900 border border-red-500/60 rounded-3xl max-w-lg w-full text-slate-100 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-red-400 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-red-500/20 rounded-2xl flex-shrink-0">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">تأیید حذف کامل شرکت‌کنندگان دمو و آماده‌سازی برای انتخابات رسمی</h4>
                <p className="text-xs text-slate-400">پاک‌سازی ۱۰۰٪ تمامی افراد و آرا برای شروع ثبت واقعی</p>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-800/60 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
              <p className="font-bold text-red-300">با تأیید این عملیات، تمامی موارد زیر به طور کامل حذف خواهند شد:</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <li><strong className="text-white">تمام نامزدها (کاندیداهای دمو):</strong> کلاً حذف شده و جدول نامزدها خالی می‌شود.</li>
                <li><strong className="text-white">تمام رأی‌دهندگان دمو:</strong> فهرست واجدین شرایط آزمایشی کلاً پاک خواهد شد.</li>
                <li><strong className="text-white">تمام مسئولین حوزه و ناظران دمو:</strong> اطلاعات مسئول شعبه و ناظران تستی پاک می‌گردد.</li>
                <li><strong className="text-white">تمام اپراتورهای دمو:</strong> کلاً حذف می‌شوند تا اطلاعات اپراتورهای واقعی ثبت گردد.</li>
                <li><strong className="text-white">تمام آرا و صندوق‌ها:</strong> آرای ثبت‌شده، تعرفه‌ها و باطله‌ها به عدد ۰ بازنشانی می‌شوند.</li>
              </ul>
            </div>

            <p className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
              پس از این مرحله، سامانه کاملاً سفید و آماده ثبت مشخصات مسئولین واقعی، نامزدها و رأی‌گیری رسمی خواهد بود.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmWipeOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                انصراف و بازگشت
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmWipeOpen(false);
                  onSwitchToRealElection();
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/60 flex items-center gap-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، همه افراد دمو را کلاً حذف کن و آماده کار شو</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Presiding Officer Modal */}
      {isEditPresidingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>ثبت و ویرایش مشخصات مسئول حوزه (رئیس شعبه)</span>
              </h4>
              <button onClick={() => setIsEditPresidingOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePresidingOfficer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی مسئول شعبه: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={presidingName}
                  onChange={(e) => setPresidingName(e.target.value)}
                  placeholder="مثال: مهندس سید رضا علوی"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  سمت رسمی در شعبه:
                </label>
                <input
                  type="text"
                  value={presidingRole}
                  onChange={(e) => setPresidingRole(e.target.value)}
                  placeholder="مسئول حوزه (رئیس شعبه اخذ رأی)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  نهاد یا ارگان متولی:
                </label>
                <input
                  type="text"
                  value={presidingOrg}
                  onChange={(e) => setPresidingOrg(e.target.value)}
                  placeholder="مثال: هیئت اجرایی انتخابات / فرمانداری"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  شماره ملی ۱۰ رقمی:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={presidingNId}
                  onChange={(e) => setPresidingNId(e.target.value)}
                  placeholder="جهت اعتبارسنجی (ماسک‌گذاری خودکار)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditPresidingOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold"
                >
                  ذخیره مشخصات مسئول حوزه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Observer Modal */}
      {isAddObserverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>افزودن ناظر قانونی جدید به هیئت نظارت شعبه</span>
              </h4>
              <button onClick={() => setIsAddObserverOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddObserver} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی ناظر: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={obsName}
                  onChange={(e) => setObsName(e.target.value)}
                  placeholder="مثال: سرکار خانم دکتر فاطمه حسینی"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  سمت نظارتی:
                </label>
                <select
                  value={obsRole}
                  onChange={(e) => setObsRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
                >
                  <option value="ناظر قانونی هیئت نظارت">ناظر قانونی هیئت نظارت</option>
                  <option value="ناظر عالی شورای نظارت">ناظر عالی شورای نظارت</option>
                  <option value="ناظر معتمد نمایندگان نامزدها">ناظر معتمد نمایندگان نامزدها</option>
                  <option value="بازرس رسمی بازرسی کل">بازرس رسمی بازرسی کل</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  سازمان / ستاد معرفی‌کننده:
                </label>
                <input
                  type="text"
                  value={obsOrg}
                  onChange={(e) => setObsOrg(e.target.value)}
                  placeholder="شورای نظارت بر انتخابات"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  شماره ملی ۱۰ رقمی:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={obsNId}
                  onChange={(e) => setObsNId(e.target.value)}
                  placeholder="جهت اعتبارسنجی (ماسک‌گذاری خودکار)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddObserverOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold"
                >
                  ثبت ناظر رسمی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
