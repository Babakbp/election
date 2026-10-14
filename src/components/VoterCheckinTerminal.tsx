import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
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
  IdCard,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  X
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

  // Mobile Voting QR Modal
  const [isMobileQrModalOpen, setIsMobileQrModalOpen] = useState(false);
  const [currentVoterForQr, setCurrentVoterForQr] = useState<Voter | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [networkIp, setNetworkIp] = useState<string>('');
  const [publicSharedHost, setPublicSharedHost] = useState<string>('');

  // Fetch local network IP for mobile device compatibility
  useEffect(() => {
    fetch('/api/network/info')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.primaryIp && !data.primaryIp.startsWith('169.254') && data.primaryIp !== 'localhost') {
            setNetworkIp(data.primaryIp);
          }
          if (data.publicSharedHost) {
            setPublicSharedHost(data.publicSharedHost);
          }
        }
      })
      .catch(() => {});
  }, []);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Derived statistics
  const votedCount = useMemo(() => voters.filter(v => v.hasVoted).length, [voters]);
  const totalCount = voters.length;
  const remainingCount = totalCount - votedCount;
  const attendancePercentage = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;
  const maxAllowedVotes = session.maxVotesPerVoter || 1;

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
    if (!isQuickRegisterOpen && !isMobileQrModalOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [isQuickRegisterOpen, isMobileQrModalOpen]);

  // Compute mobile voting URL using network IP if available so smartphones on Wi-Fi can open it
  const mobileVotingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    let hostToUse = window.location.host;
    if (customHost.trim()) {
      hostToUse = customHost.trim();
    } else if (publicSharedHost && window.location.host.includes('ais-dev-')) {
      // Use public shared host in AI Studio so mobile phones can open without Google login
      hostToUse = publicSharedHost;
    } else if (networkIp && !networkIp.startsWith('169.254') && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const port = window.location.port || '3000';
      hostToUse = `${networkIp}:${port}`;
    }

    const protocol = window.location.protocol;
    const base = hostToUse.startsWith('http') ? hostToUse : `${protocol}//${hostToUse}${window.location.pathname}`;
    const url = new URL(base);
    url.searchParams.set('station', 'kiosk');
    if (currentVoterForQr) {
      url.searchParams.set('voter', currentVoterForQr.id);
    }
    return url.toString();
  }, [customHost, currentVoterForQr, networkIp, publicSharedHost]);

  // Generate QR code when modal opens or url changes
  useEffect(() => {
    if (isMobileQrModalOpen && mobileVotingUrl) {
      QRCode.toDataURL(mobileVotingUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#022c22',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [isMobileQrModalOpen, mobileVotingUrl]);

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

  const handleBarcodeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessBarcodeScan(barcodeInput);
  };

  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFullName.trim()) {
      setQuickError('نام و نام خانوادگی الزامی است.');
      return;
    }

    const cleanNId = toEnglishDigits(quickNId).trim();
    if (cleanNId.length !== 10) {
      setQuickError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    // Check duplicate
    if (voters.some(v => toEnglishDigits(v.nationalId).trim() === cleanNId)) {
      setQuickError('این کد ملی پیش از این در فهرست ثبت شده است.');
      return;
    }

    audioFeedback.playVoterCheckin();
    await onAddVoter({
      fullName: quickFullName.trim(),
      nationalId: cleanNId,
      nationalIdMasked: maskNationalId(cleanNId),
      phoneNumber: toEnglishDigits(quickPhone).trim(),
    });

    setIsQuickRegisterOpen(false);
    setScanResult({
      type: 'SUCCESS',
      message: `رأی‌دهنده جدید «${quickFullName.trim()}» با موفقیت ثبت و تعرفه رأی صادر گردید.`,
      timestamp: formatJalali(new Date(), true),
    });

    setQuickFullName('');
    setQuickNId('');
    setQuickPhone('');
    setQuickError('');

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Filtered voters list
  const filteredVoters = useMemo(() => {
    return voters.filter(v => {
      const matchesSearch = 
        !searchQuery ||
        v.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        toEnglishDigits(v.nationalId).includes(toEnglishDigits(searchQuery)) ||
        toEnglishDigits(v.phoneNumber || '').includes(toEnglishDigits(searchQuery));

      if (!matchesSearch) return false;

      if (filterState === 'VOTED') return v.hasVoted;
      if (filterState === 'NOT_VOTED') return !v.hasVoted;
      return true;
    });
  }, [voters, searchQuery, filterState]);

  const copyMobileLink = () => {
    navigator.clipboard.writeText(mobileVotingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-indigo-500/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/30 flex-shrink-0">
            <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                لپ‌تاپ ۲: باجه ثبت ورود واجدین شرایط
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>همگام‌سازی زنده با سرور مرکزی</span>
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-100 mt-0.5">
              {session.title || 'ثبت ورود و صدور تعرفه رأی'}
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setCurrentVoterForQr(null);
              setIsMobileQrModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
            title="نمایش بارکد QR اخذ رأی با موبایل مراجعین"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">بارکد اسکن رأی با موبایل</span>
            <span className="sm:hidden">QR رأی</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden md:inline">{isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}</span>
          </button>

          <button
            onClick={onExitTerminal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">بازگشت به پنل اصلی</span>
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
              <p className="text-xs text-indigo-300 font-medium">درصد مشارکت لحظه‌ای</p>
              <p className="text-2xl font-black text-indigo-200 mt-1">٪{toPersianDigits(attendancePercentage)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* High-Speed Barcode Scanner Box */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 md:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Barcode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-base">اسکنر بارکد کارت ملی / وارد کردن کد ملی:</h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                دستگاه بارکدخوان بارکد ۲بعدی یا خطی کارت ملی را مستقیماً در این کادر می‌خواند و پس از تایید، تعرفه صادر می‌گردد.
              </p>

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
                  placeholder="بارکد کارت ملی را اسکن کنید یا کد ملی را وارد نموده و اینتر بزنید..."
                  className="w-full pl-28 pr-4 py-3.5 bg-slate-950 border-2 border-indigo-500/50 rounded-2xl text-white text-base font-mono focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleProcessBarcodeScan(barcodeInput)}
                  className="absolute left-2 top-2 bottom-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>ثبت ورود</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  setQuickNId('');
                  setQuickFullName('');
                  setQuickPhone('');
                  setQuickError('');
                  setIsQuickRegisterOpen(true);
                }}
                className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>ثبت مراجع جدید (بدون نوبت)</span>
              </button>

              <button
                onClick={() => {
                  setCurrentVoterForQr(null);
                  setIsMobileQrModalOpen(true);
                }}
                className="px-4 py-3.5 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>نمایش بارکد QR اخذ رأی</span>
              </button>
            </div>
          </div>

          {/* Scan Result Feedback Alert */}
          {scanResult && (
            <div
              className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm animate-fadeIn ${
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

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {scanResult.type === 'SUCCESS' && scanResult.voter && (
                  <button
                    onClick={() => {
                      setCurrentVoterForQr(scanResult.voter || null);
                      setIsMobileQrModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>اسکن QR با موبایل مراجع</span>
                  </button>
                )}

                {scanResult.type === 'NOT_FOUND' && (
                  <button
                    onClick={() => setIsQuickRegisterOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                  >
                    افزودن سریع این شخص
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Voter Directory Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <IdCard className="w-5 h-5 text-indigo-400" />
                <span>دفتر آمار و فهرست واجدین شرایط شعبه</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                امکان جستجوی دستی بر اساس نام و کد ملی، ثبت ورود دستی، و صدور بارکد QR اختصاصی برای موبایل
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterState('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterState === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                همه ({toPersianDigits(totalCount)})
              </button>
              <button
                onClick={() => setFilterState('VOTED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterState === 'VOTED'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                تعرفه صادر شده ({toPersianDigits(votedCount)})
              </button>
              <button
                onClick={() => setFilterState('NOT_VOTED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterState === 'NOT_VOTED'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                حاضر نشده ({toPersianDigits(remainingCount)})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام، کد ملی یا شماره همراه..."
              className="w-full pr-12 pl-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ردیف</th>
                  <th className="py-3 px-4">نام و نام خانوادگی</th>
                  <th className="py-3 px-4">کد ملی</th>
                  <th className="py-3 px-4">شماره همراه</th>
                  <th className="py-3 px-4 text-center">وضعیت تعرفه</th>
                  <th className="py-3 px-4 text-center">عملیات پذیرش / بارکد موبایل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                      هیچ موردی مطابق با جستجوی شما یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredVoters.map((voter, index) => (
                    <tr
                      key={voter.id}
                      className={`hover:bg-slate-850 transition-colors ${
                        voter.hasVoted ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">{toPersianDigits(index + 1)}</td>
                      <td className="py-3 px-4 font-bold text-slate-100">{voter.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {toPersianDigits(voter.nationalIdMasked || maskNationalId(voter.nationalId))}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {voter.phoneNumber ? toPersianDigits(voter.phoneNumber) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {voter.hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentVoterForQr(voter);
                              setIsMobileQrModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700 transition"
                            title="تولید و نمایش بارکد اسکن رأی با موبایل برای این شخص"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

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
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                              voter.hasVoted
                                ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 ring-2 ring-emerald-500/30'
                            }`}
                          >
                            {voter.hasVoted ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>لغو تعرفه</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>صدور تعرفه</span>
                              </>
                            )}
                          </button>
                        </div>
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
                  placeholder="مثال: علیرضا حسینی"
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

      {/* Mobile Voting QR Code Modal */}
      {isMobileQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 text-right">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">بارکد اسکن رأی با موبایل مراجعین</h3>
                  <p className="text-[11px] text-slate-400">اتصال مستقیم دوربین گوشی هوشمند به صفحه اخذ رأی</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileQrModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentVoterForQr && (
              <div className="mb-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between">
                <span>مراجع احراز هویت شده:</span>
                <span className="font-bold text-white">{currentVoterForQr.fullName}</span>
                <span className="font-mono text-slate-400">{toPersianDigits(currentVoterForQr.nationalIdMasked)}</span>
              </div>
            )}

            {/* Big QR Code image */}
            <div className="my-3 p-4 bg-white rounded-2xl inline-block shadow-2xl border-4 border-emerald-500/20">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="بارکد رأی با موبایل" className="w-56 h-56 mx-auto object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              )}
            </div>

            {/* Localhost Guidance Warning */}
            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !networkIp && !customHost && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-right space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>راهنمای اسکن در شبکه محلی (Localhost):</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  سیستم در حال حاضر روی <code>localhost</code> است. برای اینکه دوربین گوشی بتواند صفحه را باز کند، گوشی و کامپیوتر باید به یک Wi-Fi مشترک وصل باشند. در بخش زیر، آی‌پی وای‌فای لپ‌تاپ (مثلاً <code>192.168.1.10:3000</code>) را درج نمایید تا بارکد به‌روزرسانی شود.
                </p>
              </div>
            )}

            {/* Host / IP Configuration Details */}
            <div className="mb-3 text-right">
              <details className="text-xs bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                <summary className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold select-none flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>آدرس شبکه و لینک بارکد (IP و پورت)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono dir-ltr truncate max-w-[180px]">{mobileVotingUrl}</span>
                </summary>
                <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-[11px] text-slate-300">
                    آدرس IP اختصاصی جهت اسکن با گوشی در وای‌فای:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customHost}
                      onChange={(e) => setCustomHost(e.target.value)}
                      placeholder={networkIp ? `${networkIp}:3000` : (typeof window !== 'undefined' ? window.location.host : '192.168.1.X:3000')}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono dir-ltr focus:outline-none focus:border-emerald-500"
                    />
                    {customHost && (
                      <button
                        type="button"
                        onClick={() => setCustomHost('')}
                        className="px-2.5 py-1 text-[11px] bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                      >
                        پیش‌فرض
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    نکته: تلفن همراه رأی‌دهنده باید به همان شبکه Wi-Fi محلی متصل باشد تا صفحه اخذ رأی بارگذاری شود.
                  </p>
                </div>
              </details>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-200 text-right space-y-1.5 mb-4">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <Sparkles className="w-4 h-4" />
                <span>راهنمای مراجع:</span>
              </div>
              <p className="leading-relaxed">
                ۱. دوربین گوشی خود را به سمت این تصویر بارکد بگیرید تا لینک صفحه رأی باز شود.
              </p>
              <p className="leading-relaxed">
                ۲. کاندیداهای منتخب خود را (تا سقف {toPersianDigits(maxAllowedVotes)} نفر) لمس و انتخاب کنید.
              </p>
              <p className="leading-relaxed">
                ۳. رأی شما بلافاصله از طریق شبکه در لپ‌تاپ ۱ و نمایشگر پروژکتور ثبت و اعمال می‌گردد.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={copyMobileLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'لینک کپی شد' : 'کپی لینک صفحه رأی'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(mobileVotingUrl, '_blank')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>تست و باز کردن در تب جدید</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
