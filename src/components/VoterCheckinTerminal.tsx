import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Voter, 
  ElectionSession, 
  Operator 
} from '../types/election';
import { toPersianDigits, toEnglishDigits, maskNationalId, formatJalali } from '../utils/persian';
import { audioFeedback } from '../utils/audioFeedback';
import { syncEngine } from '../utils/syncEngine';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Filter, 
  Barcode, 
  ScanLine, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  Maximize, 
  Minimize, 
  Radio, 
  LogOut,
  RefreshCw,
  Phone,
  ShieldCheck,
  IdCard
} from 'lucide-react';

interface VoterCheckinTerminalProps {
  session: ElectionSession;
  voters: Voter[];
  currentOperator: Operator;
  isLocked: boolean;
  onToggleVoterStatus: (voterId: string) => Promise<void> | void;
  onAddVoter: (voter: Omit<Voter, 'id' | 'rowNumber' | 'hasVoted'>) => Promise<void> | void;
  onExitTerminal: () => void;
}

export const VoterCheckinTerminal: React.FC<VoterCheckinTerminalProps> = ({
  session,
  voters,
  currentOperator,
  isLocked,
  onToggleVoterStatus,
  onAddVoter,
  onExitTerminal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'ALL' | 'VOTED' | 'NOT_VOTED'>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
    voter?: Voter;
    message: string;
    timestamp?: string;
  } | null>(null);

  // Quick Register Modal
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [quickNId, setQuickNId] = useState('');
  const [quickFullName, setQuickFullName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickError, setQuickError] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Derived statistics
  const votedCount = useMemo(() => voters.filter(v => v.hasVoted).length, [voters]);
  const totalCount = voters.length;
  const remainingCount = totalCount - votedCount;
  const attendancePercentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Autofocus barcode input
  useEffect(() => {
    if (!isQuickRegisterOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [isQuickRegisterOpen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed', e);
    }
  };

  // Barcode / National ID processor
  const handleProcessBarcodeScan = async (scannedValue: string) => {
    const raw = toEnglishDigits(scannedValue).trim();
    if (!raw) return;

    if (isLocked) {
      setScanResult({
        type: 'ERROR',
        message: 'جلسه انتخابات قفل است؛ امکان ثبت ورود وجود ندارد.',
      });
      return;
    }

    const match = raw.match(/\d{10}/);
    const cleanNId = match ? match[0] : raw.replace(/\D/g, '');

    if (cleanNId.length !== 10) {
      audioFeedback.playNotFoundWarning();
      setScanResult({
        type: 'ERROR',
        message: `فرمت بارکد کارت ملی نامعتبر است (کد ملی باید ۱۰ رقم باشد، دریافت شد: «${raw}»).`,
        timestamp: formatJalali(new Date(), true),
      });
      return;
    }

    // Find in voter list
    const found = voters.find(v => {
      const vNId = toEnglishDigits(v.nationalId || '').trim();
      return vNId === cleanNId;
    });

    if (found) {
      if (found.hasVoted) {
        audioFeedback.playDuplicateWarning();
        setScanResult({
          type: 'DUPLICATE',
          voter: found,
          message: `هشدار رأی تکراری! برای «${found.fullName}» قبلاً در ساعت ${toPersianDigits(found.votedAt || '')} تعرفه صادر شده است.`,
          timestamp: formatJalali(new Date(), true),
        });
      } else {
        audioFeedback.playVoterCheckin();
        await onToggleVoterStatus(found.id);
        
        // Broadcast to master laptop
        syncEngine.broadcast('VOTER_CHECK_IN', {
          voterId: found.id,
          voterName: found.fullName,
          nationalId: found.nationalId,
          timestamp: new Date().toISOString(),
          operatorName: currentOperator.name || 'اپراتور باجه پذیرش',
        });

        setScanResult({
          type: 'SUCCESS',
          voter: found,
          message: `احراز هویت موفق! تعرفه رأی برای «${found.fullName}» با موفقیت صادر گردید.`,
          timestamp: formatJalali(new Date(), true),
        });
      }
    } else {
      audioFeedback.playNotFoundWarning();
      setScanResult({
        type: 'NOT_FOUND',
        message: `کد ملی «${cleanNId}» در فهرست ثبت‌نام‌شدگان اولیه یافت نشد.`,
        timestamp: formatJalali(new Date(), true),
      });
      setQuickNId(cleanNId);
    }

    setBarcodeInput('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Quick register submit
  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFullName.trim()) {
      setQuickError('نام و نام خانوادگی الزامی است');
      return;
    }
    const cleanNId = toEnglishDigits(quickNId).trim();
    if (cleanNId && cleanNId.length !== 10) {
      setQuickError('کد ملی باید ۱۰ رقم باشد');
      return;
    }

    audioFeedback.playVoterCheckin();

    await onAddVoter({
      fullName: quickFullName.trim(),
      nationalId: cleanNId,
      nationalIdMasked: cleanNId ? maskNationalId(cleanNId) : '—',
      phoneNumber: toEnglishDigits(quickPhone).trim(),
    });

    setIsQuickRegisterOpen(false);
    setQuickFullName('');
    setQuickNId('');
    setQuickPhone('');
    setQuickError('');
    setScanResult({
      type: 'SUCCESS',
      message: `رأی‌دهنده جدید «${quickFullName}» ثبت و تعرفه رأی برای ایشان صادر شد.`,
      timestamp: formatJalali(new Date(), true),
    });
  };

  // Filtered voters
  const filteredVoters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cleanQ = toEnglishDigits(q);

    return voters.filter((v) => {
      const matchFilter =
        filterState === 'ALL'
          ? true
          : filterState === 'VOTED'
          ? v.hasVoted
          : !v.hasVoted;

      if (!matchFilter) return false;
      if (!q) return true;

      const nameMatch = v.fullName.toLowerCase().includes(q);
      const nIdMatch = v.nationalId ? toEnglishDigits(v.nationalId).includes(cleanQ) : false;
      const phoneMatch = v.phoneNumber ? toEnglishDigits(v.phoneNumber).includes(cleanQ) : false;

      return nameMatch || nIdMatch || phoneMatch;
    });
  }, [voters, searchQuery, filterState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-indigo-500/30 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                لپ‌تاپ ۲: باجه ثبت ورود واجدین شرایط
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>همگام‌سازی زنده با سرور مرکزی</span>
              </div>
            </div>
            <h1 className="text-xl font-black text-slate-100 mt-0.5">
              {session.title || 'ثبت ورود و صدور تعرفه رأی'}
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}</span>
          </button>

          <button
            onClick={onExitTerminal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">بازگشت به پنل اصلی</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">کل واجدین شرایط</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{toPersianDigits(totalCount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between bg-emerald-950/10">
            <div>
              <p className="text-xs text-emerald-400 font-bold">حاضرین / تعرفه صادرشده</p>
              <p className="text-2xl font-black text-emerald-300 mt-1">{toPersianDigits(votedCount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">باقیمانده</p>
              <p className="text-2xl font-black text-slate-300 mt-1">{toPersianDigits(remainingCount)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between bg-indigo-950/10">
            <div>
              <p className="text-xs text-indigo-300 font-bold">درصد مشارکت</p>
              <p className="text-2xl font-black text-indigo-300 mt-1">٪{toPersianDigits(attendancePercentage)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* High-speed Barcode Scanning Station */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 ring-2 ring-indigo-500/30">
              <Barcode className="w-6 h-6" />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-indigo-300 mb-1">
                اسکن بارکد کارت ملی یا تایپ سریع کد ملی ۱۰ رقمی (اینتر برای ثبت فوری):
              </label>
              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProcessBarcodeScan(barcodeInput);
                    }
                  }}
                  placeholder="بارکدخوان را روی کارت ملی بگیرید یا کد ملی را تایپ و Enter بزنید..."
                  className="w-full pl-28 pr-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-indigo-500/50 text-white font-mono text-lg tracking-wider placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleProcessBarcodeScan(barcodeInput)}
                  className="absolute left-2 top-2 bottom-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>ثبت ورود</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setQuickNId('');
                setQuickFullName('');
                setQuickPhone('');
                setQuickError('');
                setIsQuickRegisterOpen(true);
              }}
              className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-sm font-bold flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>ثبت مراجع جدید (بدون نوبت)</span>
            </button>
          </div>

          {/* Scan Result Feedback Alert */}
          {scanResult && (
            <div
              className={`mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-fadeIn ${
                scanResult.type === 'SUCCESS'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : scanResult.type === 'DUPLICATE'
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : scanResult.type === 'NOT_FOUND'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {scanResult.type === 'SUCCESS' && <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                {scanResult.type === 'DUPLICATE' && <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />}
                {scanResult.type === 'NOT_FOUND' && <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />}
                <p className="font-bold">{scanResult.message}</p>
              </div>

              {scanResult.type === 'NOT_FOUND' && (
                <button
                  onClick={() => setIsQuickRegisterOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                >
                  افزودن سریع این شخص
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در لیست بر اساس نام، نام خانوادگی، کد ملی یا شماره همراه..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterState === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه ({toPersianDigits(voters.length)})
            </button>
            <button
              onClick={() => setFilterState('NOT_VOTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterState === 'NOT_VOTED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              در انتظار ورود ({toPersianDigits(remainingCount)})
            </button>
            <button
              onClick={() => setFilterState('VOTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterState === 'VOTED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              وارد شده‌ها ({toPersianDigits(votedCount)})
            </button>
          </div>
        </div>

        {/* Voters List Table / Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950 text-slate-400 text-xs sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">ردیف</th>
                  <th className="py-3.5 px-4 font-bold">نام و نام خانوادگی</th>
                  <th className="py-3.5 px-4 font-bold">کد ملی</th>
                  <th className="py-3.5 px-4 font-bold">شماره تماس</th>
                  <th className="py-3.5 px-4 font-bold">وضعیت تعرفه</th>
                  <th className="py-3.5 px-4 font-bold text-center">عملیات پذیرش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      موردی مطابق با جستجوی شما یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter) => (
                    <tr
                      key={voter.id}
                      className={`hover:bg-slate-850/60 transition-colors ${
                        voter.hasVoted ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {toPersianDigits(voter.rowNumber)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {voter.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {toPersianDigits(voter.nationalIdMasked || voter.nationalId)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {voter.phoneNumber ? toPersianDigits(voter.phoneNumber) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {voter.hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تعرفه صادر شد ({toPersianDigits(voter.votedAt || '')})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <Clock className="w-3.5 h-3.5" />
                            <span>در انتظار ثبت ورود</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={async () => {
                            if (!voter.hasVoted) {
                              audioFeedback.playVoterCheckin();
                            }
                            await onToggleVoterStatus(voter.id);
                            syncEngine.broadcast('VOTER_CHECK_IN', {
                              voterId: voter.id,
                              voterName: voter.fullName,
                              newStatus: !voter.hasVoted,
                              timestamp: new Date().toISOString(),
                              operatorName: currentOperator.name || 'اپراتور باجه',
                            });
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 mx-auto ${
                            voter.hasVoted
                              ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 ring-2 ring-emerald-500/30'
                          }`}
                        >
                          {voter.hasVoted ? (
                            <>
                              <XCircle className="w-4 h-4" />
                              <span>لغو صدور تعرفه</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>ثبت ورود و صدور تعرفه</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Quick Register Modal */}
      {isQuickRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-right shadow-2xl">
            <h3 className="text-lg font-black text-slate-100 mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>ثبت‌نام سریع رأی‌دهنده جدید</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              مشخصات فرد را وارد نمایید تا بلافاصله در فهرست واجدین شرایط ثبت و برگه رأی برای ایشان صادر شود.
            </p>

            <form onSubmit={handleQuickRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  value={quickFullName}
                  onChange={(e) => setQuickFullName(e.target.value)}
                  placeholder="مثال: علیرضا محمدی"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  کد ملی (۱۰ رقمی):
                </label>
                <input
                  type="text"
                  value={quickNId}
                  onChange={(e) => setQuickNId(e.target.value)}
                  placeholder="مثال: ۰۰۱۴۵۶۷۸۹۰"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  شماره همراه (اختیاری):
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {quickError && (
                <p className="text-xs text-red-400 font-bold bg-red-950/30 p-2.5 rounded-xl border border-red-500/30">
                  {quickError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30"
                >
                  ثبت نام و صدور فوری تعرفه
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
