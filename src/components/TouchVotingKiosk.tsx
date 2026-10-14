import React, { useState, useEffect, useMemo } from 'react';
import { 
  Candidate, 
  ElectionSession 
} from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { audioFeedback } from '../utils/audioFeedback';
import { syncEngine } from '../utils/syncEngine';
import { 
  Vote, 
  CheckCircle2, 
  X, 
  Maximize, 
  Minimize, 
  Sparkles, 
  Lock, 
  RefreshCw,
  LogOut,
  AlertTriangle,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  Info
} from 'lucide-react';

interface TouchVotingKioskProps {
  session: ElectionSession;
  candidates: Candidate[];
  onVoteCast: (candidateId: string) => Promise<void> | void;
  onMultipleVotesCast?: (candidateIds: string[]) => Promise<void> | void;
  onExitKiosk: () => void;
}

export const TouchVotingKiosk: React.FC<TouchVotingKioskProps> = ({
  session,
  candidates,
  onVoteCast,
  onMultipleVotesCast,
  onExitKiosk,
}) => {
  // Max votes allowed per voter (default 1)
  const maxAllowed = Math.max(1, session.maxVotesPerVoter || 1);
  const isMultiVoteMode = maxAllowed > 1;

  // Toggle for hiding voted candidates (defaults to true as requested)
  const [hideVotedCandidates, setHideVotedCandidates] = useState<boolean>(
    session.hideVotedCandidatesInKiosk !== false
  );

  // Locally tracked voted candidates in this kiosk session
  const [votedCandidateIdsLocally, setVotedCandidateIdsLocally] = useState<Set<string>>(() => new Set());

  // Check URL parameters for voter identity (e.g., from QR scan: ?station=kiosk&voter=VOTER-123)
  const voterIdParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('voter');
  }, []);

  // Check if this voter has already voted
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !voterIdParam) return false;
    return localStorage.getItem(`voter_voted_${voterIdParam}`) === 'true';
  });

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [lastVotedCandidateNames, setLastVotedCandidateNames] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKioskLockedByOperator, setIsKioskLockedByOperator] = useState(false);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter approved candidates
  const approvedCandidates = useMemo(() => {
    return candidates.filter(c => c.status === 'APPROVED');
  }, [candidates]);

  // Candidates visible on the voting ballot
  // (If hideVotedCandidates is true, any candidate who has votes or was voted in this session is removed)
  const visibleCandidates = useMemo(() => {
    if (!hideVotedCandidates) {
      return approvedCandidates;
    }
    return approvedCandidates.filter(c => {
      const hasVotes = (c.votes || 0) > 0;
      const isVotedLocally = votedCandidateIdsLocally.has(c.id);
      return !hasVotes && !isVotedLocally;
    });
  }, [approvedCandidates, hideVotedCandidates, votedCandidateIdsLocally]);

  // Selected candidates objects
  const selectedCandidates = useMemo(() => {
    return approvedCandidates.filter(c => selectedCandidateIds.includes(c.id));
  }, [approvedCandidates, selectedCandidateIds]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Request fullscreen on mount
  useEffect(() => {
    const enterFs = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // browser gesture restriction fallback
      }
    };
    enterFs();
  }, []);

  // Auto-reset timer after successful vote
  useEffect(() => {
    if (!isSuccessView) return;

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSuccessView(false);
          setSelectedCandidateIds([]);
          setLimitWarning(null);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccessView]);

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

  /**
   * Handle candidate touch/click with strict single/multi choice limit enforcement
   */
  const handleSelectCandidate = (cand: Candidate) => {
    if (session.status === 'LOCKED_FINAL') return;
    if (isKioskLockedByOperator) return;
    if (hasAlreadyVoted) return;

    const isAlreadySelected = selectedCandidateIds.includes(cand.id);

    // 1. Single Choice Mode (تک انتخابی: ۱ نفر)
    if (!isMultiVoteMode) {
      if (isAlreadySelected) {
        // Deselect
        audioFeedback.playCandidateSelect();
        setSelectedCandidateIds([]);
        setLimitWarning(null);
        return;
      }

      // If voter already selected 1 candidate and taps a different candidate:
      if (selectedCandidateIds.length >= 1) {
        audioFeedback.playWarning();
        setLimitWarning(
          `⚠️ اخطار سقف رأی: انتخابات در حالت تک‌انتخابی تنظیم شده است. شما فقط مجاز به انتخاب ۱ کاندیدا هستید. برای انتخاب «${cand.name}»، ابتدا روی کاندیدای قبلی ضربه بزنید تا لغو انتخاب شود.`
        );
        setTimeout(() => setLimitWarning(null), 5000);
        return;
      }

      // Select single candidate and open confirm modal
      audioFeedback.playCandidateSelect();
      setSelectedCandidateIds([cand.id]);
      setLimitWarning(null);
      setIsConfirmModalOpen(true);
      return;
    }

    // 2. Multi Choice Mode (چند انتخابی: تا سقف N نفر)
    if (isAlreadySelected) {
      // Toggle off
      audioFeedback.playCandidateSelect();
      setSelectedCandidateIds(prev => prev.filter(id => id !== cand.id));
      setLimitWarning(null);
    } else {
      // Trying to add another candidate: Check limit!
      if (selectedCandidateIds.length < maxAllowed) {
        audioFeedback.playCandidateSelect();
        setSelectedCandidateIds(prev => [...prev, cand.id]);
        setLimitWarning(null);
      } else {
        // EXCEEDED LIMIT: Emit audio warning & prominent banner!
        audioFeedback.playWarning();
        setLimitWarning(
          `⚠️ اخطار سقف آرا: سقف مجاز انتخاب شما (${toPersianDigits(maxAllowed)} کاندیدا) تکمیل شده است. برای انتخاب «${cand.name}»، ابتدا باید یکی از انتخاب‌های قبلی را حذف نمایید.`
        );
        setTimeout(() => setLimitWarning(null), 5000);
      }
    }
  };

  const handleClearAllSelections = () => {
    setSelectedCandidateIds([]);
    setLimitWarning(null);
    audioFeedback.playClick();
  };

  /**
   * Final vote confirmation and broadcast
   */
  const handleConfirmVote = async () => {
    if (selectedCandidateIds.length === 0 || isSubmittingVote) return;

    setIsSubmittingVote(true);
    setIsConfirmModalOpen(false);
    audioFeedback.playVoteCast();

    const chosenCands = approvedCandidates.filter(c => selectedCandidateIds.includes(c.id));
    const chosenNames = chosenCands.map(c => c.name);

    try {
      // 1. Deliver via SyncEngine (BroadcastChannel + WebSocket + HTTP REST /api/sync/vote)
      const stationTitle = voterIdParam ? 'گوشی همراه رأی‌دهنده (اسکن بارکد)' : 'کیوسک لمسی دیجیتال (صندوق ۱)';
      const castResult = await syncEngine.castVote(selectedCandidateIds, voterIdParam || undefined, stationTitle);

      if (!castResult.success) {
        setIsSubmittingVote(false);
        setSubmitError(castResult.error || 'خطا در ثبت رأی در سرور. ارتباط گوشی با سرور برقرار نشد.');
        audioFeedback.playWarning();
        return;
      }

      setSubmitError(null);

      // 2. Call parent state handlers
      if (onMultipleVotesCast) {
        await onMultipleVotesCast(selectedCandidateIds);
      } else {
        for (const id of selectedCandidateIds) {
          await onVoteCast(id);
        }
      }

      // 3. Mark voted candidates locally to remove them from screen if hideVotedCandidates is active
      setVotedCandidateIdsLocally(prev => {
        const next = new Set(prev);
        selectedCandidateIds.forEach(id => next.add(id));
        return next;
      });

      // 4. If this is a personal voter QR session, lock it so they cannot vote again
      if (voterIdParam) {
        try {
          localStorage.setItem(`voter_voted_${voterIdParam}`, 'true');
        } catch {
          // ignore
        }
        setHasAlreadyVoted(true);
      }

      setLastVotedCandidateNames(chosenNames);
      setIsSuccessView(true);
    } catch (err: any) {
      console.error('Vote submission error:', err);
      setSubmitError(err?.message || 'خطای غیرمنتظره در ثبت رأی');
      audioFeedback.playWarning();
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleAdminExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === '1234' || enteredPin === 'admin' || enteredPin === '') {
      setAdminPinModalOpen(false);
      onExitKiosk();
    } else {
      setPinError('رمز عبور نامعتبر است (پیش‌فرض: ۱۲۳۴ یا خالی)');
    }
  };

  // If this individual voter token has already voted:
  if (hasAlreadyVoted && !isSuccessView) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-100">رأی شما قبلاً با موفقیت ثبت شده است</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            برگه الکترونیک این تعرفه در سامانه به صورت رسمی ثبت و منقضی گردید. طبق آیین‌نامه انتخابات، هر واجد شرایط تنها یک‌بار مجاز به ثبت رأی می‌باشد.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
            شناسه برگه: {voterIdParam || 'ثبت شده در صندوق الکترونیک'}
          </div>
          <p className="text-xs text-slate-500">از مشارکت محترم شما سپاسگزاریم.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col font-sans select-none overflow-x-hidden pb-24 md:pb-28">
      {/* Kiosk Header */}
      <header className="bg-slate-900/90 border-b border-emerald-500/30 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40 flex-shrink-0">
            {voterIdParam ? (
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            ) : (
              <Vote className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {voterIdParam ? 'صفحه رأی هوشمند با موبایل' : 'باجه لمسی اخذ رأی الکترونیک'}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                شعبه {toPersianDigits(session.stationNumber || '۱')} - صندوق {toPersianDigits(session.boxNumber || '۱')}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${
                isMultiVoteMode 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isMultiVoteMode 
                  ? `سقف انتخاب: تا ${toPersianDigits(maxAllowed)} کاندیدا`
                  : 'نوع رأی: تک‌انتخابی (۱ نفر)'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5 truncate max-w-[280px] sm:max-w-xl">
              {session.title || 'انتخابات رسمی'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Hide/Show Voted Candidates Toggle */}
          <button
            onClick={() => setHideVotedCandidates(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors ${
              hideVotedCandidates
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={hideVotedCandidates ? 'کاندیداهای رأی‌داده‌شده حذف و مخفی هستند' : 'همه کاندیداها نمایش داده می‌شوند'}
          >
            {hideVotedCandidates ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
            <span className="hidden md:inline">
              {hideVotedCandidates ? 'حذف آرا داده‌شده (فعال)' : 'نمایش همه کاندیداها'}
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            title="حالت تمام صفحه"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}</span>
          </button>

          <button
            onClick={() => setAdminPinModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs sm:text-sm transition-colors"
            title="خروج ناظر / مسئول از کیوسک"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج ناظر</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col justify-start">
        {/* Instruction Banner */}
        <div className="mb-6 bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-100">
                {isMultiVoteMode 
                  ? `رأی‌دهنده گرامی، شما می‌توانید حداکثر به ${toPersianDigits(maxAllowed)} کاندیدا رأی دهید.`
                  : 'رأی‌دهنده گرامی، این انتخابات تک‌انتخابی است؛ لطفاً ۱ کاندیدای مورد نظر خود را لمس کنید.'}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                {isMultiVoteMode
                  ? 'کاندیداهای منتخب خود را لمس نمایید، سپس در نوار پایین دکمه «تأیید نهایی آرا» را بزنید.'
                  : 'با لمس کاندیدا، پنجره تأیید باز می‌شود. در صورت انتخاب فرد دیگر اخطار داده خواهد شد.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-500/40">
              <span>انتخاب‌های شما:</span>
              <span className="text-emerald-400 font-mono font-black text-sm">{toPersianDigits(selectedCandidateIds.length)}</span>
              <span>از</span>
              <span className="text-white font-mono font-black text-sm">{toPersianDigits(maxAllowed)}</span>
            </div>

            <div className="text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
              کاندیداهای حاضر: {toPersianDigits(visibleCandidates.length)} نفر
            </div>
          </div>
        </div>

        {/* Limit Warning Alert (Prominent Warning Message for Single & Multi choice) */}
        {limitWarning && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn shadow-lg shadow-amber-950/50">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 animate-bounce" />
            <span className="flex-1 leading-relaxed text-slate-100">{limitWarning}</span>
            <button 
              onClick={() => setLimitWarning(null)}
              className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-amber-500/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Candidates Grid (Big touch-friendly cards) */}
        {visibleCandidates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-200">
              {hideVotedCandidates && approvedCandidates.length > 0
                ? 'تمام کاندیداها رأی خود را دریافت نموده‌اند و از صفحه حذف شده‌اند.'
                : 'کاندیدای تایید شده‌ای برای نمایش وجود ندارد'}
            </h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              {hideVotedCandidates && approvedCandidates.length > 0
                ? 'برای مشاهده مجدد کاندیداها، می‌توانید از دکمه بالای صفحه گزینه «نمایش همه کاندیداها» را انتخاب فرمایید.'
                : 'لطفاً از طریق پنل اصلی نامزدها را ثبت و تأیید نمایید.'}
            </p>
            {hideVotedCandidates && approvedCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setHideVotedCandidates(false)}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold"
              >
                نمایش همه کاندیداها
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {visibleCandidates.map((cand) => {
              const isSelected = selectedCandidateIds.includes(cand.id);
              const selectionIndex = selectedCandidateIds.indexOf(cand.id);

              return (
                <div
                  key={cand.id}
                  onClick={() => handleSelectCandidate(cand)}
                  role="button"
                  tabIndex={0}
                  className={`group relative flex flex-col bg-slate-900/90 hover:bg-slate-850 rounded-3xl p-5 border transition-all duration-200 cursor-pointer text-right shadow-md active:scale-95 ${
                    isSelected
                      ? 'border-emerald-400 ring-4 ring-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900'
                      : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                  }`}
                >
                  {/* Selected check badge */}
                  <div className="absolute top-4 left-4 z-10">
                    {isSelected ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shadow-lg ring-2 ring-emerald-300">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 text-slate-500 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                        <Check className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                      </div>
                    )}
                  </div>

                  {/* Candidate Code Tag & Affiliation */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-emerald-400 font-mono text-xs font-black border border-slate-700">
                      کد {toPersianDigits(cand.candidateNumber)}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {cand.affiliation || 'مستقل'}
                    </span>
                  </div>

                  {/* Avatar Photo */}
                  <div className="flex justify-center mb-4">
                    <div className={`relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 shadow-lg transition-transform ${
                      isSelected 
                        ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105' 
                        : 'border-slate-700 group-hover:border-emerald-400'
                    }`}>
                      {cand.avatarUrl ? (
                        <img
                          src={cand.avatarUrl}
                          alt={cand.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500 text-3xl font-bold">
                          {cand.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Candidate Name & Bio */}
                  <div className="flex-1 flex flex-col items-center text-center">
                    <h3 className={`text-lg md:text-xl font-black transition-colors ${
                      isSelected ? 'text-emerald-300' : 'text-slate-100 group-hover:text-emerald-300'
                    }`}>
                      {cand.name}
                    </h3>
                    {cand.bio && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cand.bio}
                      </p>
                    )}
                  </div>

                  {/* Touch Action Button */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 transition-all ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 ring-2 ring-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-white" />
                          <span>انتخاب شده {isMultiVoteMode && `(شماره ${toPersianDigits(selectionIndex + 1)})`}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>انتخاب این کاندیدا</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar (For both Single and Multi mode) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-emerald-500/40 backdrop-blur-xl px-4 py-3 sm:py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status & selected list */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 flex-shrink-0">
              <span className="text-xs text-slate-300">وضعیت انتخاب:</span>
              <span className="font-mono font-black text-base text-emerald-400">
                {toPersianDigits(selectedCandidateIds.length)} / {toPersianDigits(maxAllowed)}
              </span>
            </div>

            {/* Chips of selected candidates */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
              {selectedCandidates.map(c => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex-shrink-0"
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCandidateIds(prev => prev.filter(id => id !== c.id));
                    }}
                    className="hover:text-red-300 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {selectedCandidateIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllSelections}
                className="px-3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
                title="پاک کردن انتخاب‌ها"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              disabled={selectedCandidateIds.length === 0}
              onClick={() => setIsConfirmModalOpen(true)}
              className={`flex-1 sm:flex-initial py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                selectedCandidateIds.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>
                {selectedCandidateIds.length === 0 
                  ? (isMultiVoteMode ? 'حداقل ۱ کاندیدا انتخاب کنید' : 'یک کاندیدا را لمس کنید')
                  : `تأیید و ثبت نهایی آرا (${toPersianDigits(selectedCandidateIds.length)} نفر)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && selectedCandidates.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-xl w-full p-6 md:p-8 text-center shadow-2xl shadow-emerald-500/20 relative max-h-[90vh] flex flex-col">
            <h3 className="text-xl md:text-2xl font-black text-slate-100 mb-2">
              {isMultiVoteMode 
                ? `آیا از ثبت رأی برای این ${toPersianDigits(selectedCandidates.length)} کاندیدا اطمینان دارید؟`
                : `آیا از ثبت رأی به «${selectedCandidates[0]?.name}» اطمینان دارید؟`}
            </h3>

            <p className="text-xs md:text-sm text-slate-400 mb-4 leading-relaxed">
              با فشردن کلید تأیید، رأی شما به صورت رسمی و قطعی در صندوق الکترونیک به ثبت می‌رسد.
              {hideVotedCandidates && (
                <span className="block text-emerald-400 mt-1 font-bold">
                  * کاندیداهای منتخب پس از ثبت، از صفحه مانیتور لمسی حذف خواهند شد.
                </span>
              )}
            </p>

            {/* Candidates Preview List / Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 my-2 p-2 bg-slate-950/60 rounded-2xl border border-slate-800 max-h-64">
              {selectedCandidates.map((cand) => (
                <div 
                  key={cand.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-emerald-400 flex-shrink-0">
                      {cand.avatarUrl ? (
                        <img src={cand.avatarUrl} alt={cand.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-400 font-bold">
                          {cand.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{cand.name}</h4>
                      <p className="text-[11px] text-slate-400">{cand.affiliation || 'مستقل'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                      کد {toPersianDigits(cand.candidateNumber)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
              <button
                disabled={isSubmittingVote}
                onClick={handleConfirmVote}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingVote ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>در حال ثبت قطعی رأی در شبکه...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-white" />
                    <span>تأیید نهایی و ثبت در صندوق</span>
                  </>
                )}
              </button>

              <button
                disabled={isSubmittingVote}
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm sm:text-base border border-slate-700 active:scale-95 transition-all"
              >
                بازگشت و تغییر انتخاب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network / Server Submission Error Modal */}
      {submitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-white">عدم ثبت رأی در سرور انتخابات</h3>
            <div className="text-xs text-red-200 bg-red-950/40 p-3 rounded-xl border border-red-500/30 leading-relaxed text-right">
              {submitError}
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <p className="font-bold text-slate-300">💡 راهنمای اتصال گوشی به سرور:</p>
              <p>• گوشی همراه شما باید دقیقاً به همان شبکه Wi-Fi لپ‌تاپ سرور متصل باشد.</p>
              <p>• در صورت روشن بودن، داده سیم‌کارت (اینترنت موبایل) را موقتاً قطع و فقط وای‌فای را متصل نگه دارید.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmVote}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تلاش مجدد برای ثبت رأی</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success View (Voted Screen with Auto-Reset) */}
      {isSuccessView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-2">
              رأی شما با موفقیت ثبت شد
            </h2>

            <div className="my-4 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400 mb-2">کاندیداهای ثبت شده به نام شما:</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {lastVotedCandidateNames.map((name, i) => (
                  <span key={i} className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              با تشکر از حضور و مشارکت محترم شما در انتخابات.
            </p>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-xs sm:text-sm font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>آماده‌سازی خودکار برای نفر بعدی در {toPersianDigits(countdown)} ثانیه...</span>
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  setIsSuccessView(false);
                  setSelectedCandidateIds([]);
                  setLimitWarning(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
              >
                آماده‌سازی فوری برای نفر بعد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Exit Pin Modal */}
      {adminPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-right shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                خروج امن مسئول از کیوسک
              </h3>
              <button
                onClick={() => setAdminPinModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              جهت بازگشت به پنل اصلی سامانه، رمز عبور مسئول را وارد فرمایید (پیش‌فرض: خالی یا ۱۲۳۴):
            </p>
            <form onSubmit={handleAdminExit} className="space-y-4">
              <input
                type="password"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                placeholder="رمز عبور مسئول..."
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-center tracking-widest text-lg focus:outline-none focus:border-emerald-500"
              />
              {pinError && <p className="text-xs text-red-400 font-bold">{pinError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
                >
                  تأیید و خروج
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm"
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
