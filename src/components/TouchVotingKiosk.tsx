import React, { useState, useEffect, useMemo } from 'react';
import { 
  Candidate, 
  ElectionSession, 
  AuditEvent 
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
  ArrowRight, 
  HelpCircle, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RefreshCw,
  LogOut,
  AlertTriangle,
  UserCheck,
  Check,
  RotateCcw
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

  // Filter approved candidates
  const approvedCandidates = useMemo(() => {
    return candidates.filter(c => c.status === 'APPROVED');
  }, [candidates]);

  // Selected candidates list objects
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

  // Request fullscreen on mount for true kiosk experience
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

  // Countdown timer on success view to reset kiosk for next voter
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

  // Handle candidate touch/tap
  const handleSelectCandidate = (cand: Candidate) => {
    if (session.status === 'LOCKED_FINAL') return;
    if (isKioskLockedByOperator) return;

    if (!isMultiVoteMode) {
      // Single candidate mode: tap opens confirm dialog
      audioFeedback.playCandidateSelect();
      setSelectedCandidateIds([cand.id]);
      setIsConfirmModalOpen(true);
      return;
    }

    // Multi-candidate mode: toggle selection
    if (selectedCandidateIds.includes(cand.id)) {
      audioFeedback.playCandidateSelect();
      setSelectedCandidateIds(prev => prev.filter(id => id !== cand.id));
      setLimitWarning(null);
    } else {
      if (selectedCandidateIds.length < maxAllowed) {
        audioFeedback.playCandidateSelect();
        setSelectedCandidateIds(prev => [...prev, cand.id]);
        setLimitWarning(null);
      } else {
        audioFeedback.playWarning();
        setLimitWarning(`سقف مجاز انتخاب شما (${toPersianDigits(maxAllowed)} کاندیدا) تکمیل شده است. برای انتخاب این فرد، ابتدا یکی از انتخاب‌های قبلی را بردارید.`);
        setTimeout(() => setLimitWarning(null), 4000);
      }
    }
  };

  const handleClearAllSelections = () => {
    setSelectedCandidateIds([]);
    setLimitWarning(null);
    audioFeedback.playClick();
  };

  const handleConfirmVote = async () => {
    if (selectedCandidateIds.length === 0) return;

    setIsConfirmModalOpen(false);
    audioFeedback.playVoteCast();

    const chosenCands = approvedCandidates.filter(c => selectedCandidateIds.includes(c.id));
    const chosenNames = chosenCands.map(c => c.name);

    try {
      if (onMultipleVotesCast) {
        await onMultipleVotesCast(selectedCandidateIds);
      } else {
        for (const id of selectedCandidateIds) {
          await onVoteCast(id);
        }
      }

      // Broadcast directly via sync engine to all connected laptops & displays
      if (selectedCandidateIds.length === 1) {
        const c = chosenCands[0];
        syncEngine.broadcast('KIOSK_VOTE_CAST', {
          candidateId: c.id,
          candidateName: c.name,
          candidateNumber: c.candidateNumber,
          timestamp: new Date().toISOString(),
        });
      } else {
        syncEngine.broadcast('KIOSK_MULTIPLE_VOTES_CAST', {
          candidateIds: selectedCandidateIds,
          candidates: chosenCands.map(c => ({ id: c.id, name: c.name, code: c.candidateNumber })),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    }

    setLastVotedCandidateNames(chosenNames);
    setIsSuccessView(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col font-sans select-none overflow-x-hidden pb-24 md:pb-28">
      {/* Kiosk Header */}
      <header className="bg-slate-900/90 border-b border-emerald-500/30 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40 flex-shrink-0">
            <Vote className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                باجه لمسی اخذ رأی الکترونیک
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                شعبه {toPersianDigits(session.stationNumber || '۱')} - صندوق {toPersianDigits(session.boxNumber || '۱')}
              </span>
              {isMultiVoteMode && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  سقف انتخاب: تا {toPersianDigits(maxAllowed)} کاندیدا
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mt-0.5 truncate max-w-[280px] sm:max-w-xl">
              {session.title || 'انتخابات رسمی'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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
                  : 'رأی‌دهنده گرامی، لطفاً روی کاندیدای مورد نظر خود ضربه بزنید (لمس کنید).'}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                {isMultiVoteMode
                  ? 'کاندیداهای منتخب خود را لمس نمایید، سپس در نوار پایین دکمه «تأیید نهایی آرا» را بزنید.'
                  : 'پس از انتخاب نامزد، پنجره تأیید باز می‌شود و می‌توانید رأی خود را نهایی کنید.'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {isMultiVoteMode ? (
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-500/40">
                <span>انتخاب‌های شما:</span>
                <span className="text-emerald-400 font-mono font-black text-sm">{toPersianDigits(selectedCandidateIds.length)}</span>
                <span>از</span>
                <span className="text-white font-mono font-black text-sm">{toPersianDigits(maxAllowed)}</span>
              </div>
            ) : (
              <div className="text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
                تعداد کاندیداها: {toPersianDigits(approvedCandidates.length)} نفر
              </div>
            )}
          </div>
        </div>

        {/* Limit Warning Alert */}
        {limitWarning && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="flex-1 leading-relaxed">{limitWarning}</span>
            <button 
              onClick={() => setLimitWarning(null)}
              className="text-amber-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Candidates Grid (Big touch-friendly cards) */}
        {approvedCandidates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800">
            <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-200">کاندیدای تایید شده‌ای برای نمایش وجود ندارد</h3>
            <p className="text-slate-400 text-sm mt-2">
              لطفاً از طریق پنل اصلی نامزدها را ثبت و تأیید نمایید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {approvedCandidates.map((cand) => {
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
                  {/* Selected check badge for multi mode */}
                  {isMultiVoteMode && (
                    <div className="absolute top-4 left-4 z-10">
                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shadow-lg ring-2 ring-emerald-300">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800/80 border-2 border-slate-700 text-slate-500 flex items-center justify-center group-hover:border-slate-500">
                          <span className="text-xs font-mono">+</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Badge: Candidate Code & Affiliation */}
                  <div className={`flex items-center justify-between mb-4 ${isMultiVoteMode ? 'pl-10' : ''}`}>
                    <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono border ${
                      isSelected 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                        : 'bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 border-slate-700 group-hover:border-emerald-500/30'
                    }`}>
                      کد {toPersianDigits(cand.candidateNumber)}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[130px]">
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

      {/* Floating Bottom Bar for Multi-Vote Mode */}
      {isMultiVoteMode && (
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
                      className="hover:text-red-300"
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
                  title="پاک کردن همه انتخاب‌ها"
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
                    ? 'حداقل ۱ کاندیدا انتخاب کنید'
                    : `تأیید و ثبت نهایی آرا (${toPersianDigits(selectedCandidateIds.length)} نفر)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            </p>

            {/* Candidates Preview List / Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 my-2 p-2 bg-slate-950/60 rounded-2xl border border-slate-800 max-h-64">
              {selectedCandidates.map((cand, idx) => (
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
                    {isMultiVoteMode && (
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs flex items-center justify-center font-bold">
                        {toPersianDigits(idx + 1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleConfirmVote}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                <span>تأیید نهایی و ثبت آرا</span>
              </button>

              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm sm:text-base border border-slate-700 active:scale-95 transition-all"
              >
                بازگشت و تغییر انتخاب
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
