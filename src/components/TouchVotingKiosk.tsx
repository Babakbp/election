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
  UserCheck
} from 'lucide-react';

interface TouchVotingKioskProps {
  session: ElectionSession;
  candidates: Candidate[];
  onVoteCast: (candidateId: string) => Promise<void> | void;
  onExitKiosk: () => void;
}

export const TouchVotingKiosk: React.FC<TouchVotingKioskProps> = ({
  session,
  candidates,
  onVoteCast,
  onExitKiosk,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [lastVotedCandidateName, setLastVotedCandidateName] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKioskLockedByOperator, setIsKioskLockedByOperator] = useState(false);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Filter approved candidates
  const approvedCandidates = useMemo(() => {
    return candidates.filter(c => c.status === 'APPROVED');
  }, [candidates]);

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
          setSelectedCandidate(null);
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

  const handleSelectCandidate = (cand: Candidate) => {
    if (session.status === 'LOCKED_FINAL') return;
    if (isKioskLockedByOperator) return;

    audioFeedback.playCandidateSelect();
    setSelectedCandidate(cand);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;
    const cand = selectedCandidate;

    setIsConfirmModalOpen(false);
    audioFeedback.playVoteCast();

    try {
      await onVoteCast(cand.id);
      // Also broadcast directly via sync engine to all connected laptops
      syncEngine.broadcast('KIOSK_VOTE_CAST', {
        candidateId: cand.id,
        candidateName: cand.name,
        candidateNumber: cand.candidateNumber,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }

    setLastVotedCandidateName(cand.name);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Kiosk Header */}
      <header className="bg-slate-900/90 border-b border-emerald-500/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40">
            <Vote className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                باجه لمسی اخذ رأی الکترونیک
              </span>
              <span className="text-xs text-slate-400">
                شعبه {toPersianDigits(session.stationNumber || '۱')} - صندوق {toPersianDigits(session.boxNumber || '۱')}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight mt-0.5">
              {session.title || 'انتخابات رسمی'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition-colors"
            title="حالت تمام صفحه"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'خروج تمام‌صفحه' : 'تمام‌صفحه'}</span>
          </button>

          <button
            onClick={() => setAdminPinModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-sm transition-colors"
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
        <div className="mb-6 bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-100">
                رأی‌دهنده گرامی، لطفاً روی کاندیدای مورد نظر خود ضربه بزنید (لمس کنید).
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                پس از انتخاب نامزد، صفحه تأیید باز می‌شود و می‌توانید رأی خود را نهایی کنید.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
            تعداد کاندیداها: {toPersianDigits(approvedCandidates.length)} نفر
          </div>
        </div>

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
              const isSelected = selectedCandidate?.id === cand.id;
              return (
                <div
                  key={cand.id}
                  onClick={() => handleSelectCandidate(cand)}
                  role="button"
                  tabIndex={0}
                  className={`group relative flex flex-col bg-slate-900/80 hover:bg-slate-850 rounded-3xl p-5 border transition-all duration-200 cursor-pointer text-right shadow-md active:scale-95 ${
                    isSelected
                      ? 'border-emerald-500 ring-4 ring-emerald-500/30 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                  }`}
                >
                  {/* Top Badge: Candidate Code */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-slate-800 group-hover:bg-emerald-500/20 text-emerald-400 border border-slate-700 group-hover:border-emerald-500/30 text-sm font-black font-mono">
                      کد {toPersianDigits(cand.candidateNumber)}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[140px]">
                      {cand.affiliation || 'مستقل'}
                    </span>
                  </div>

                  {/* Avatar Photo */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 group-hover:border-emerald-400 shadow-lg">
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
                    <h3 className="text-lg md:text-xl font-black text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {cand.name}
                    </h3>
                    {cand.bio && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cand.bio}
                      </p>
                    )}
                  </div>

                  {/* Big Touch Vote Button */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <span>انتخاب این کاندیدا</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-lg w-full p-6 md:p-8 text-center shadow-2xl shadow-emerald-500/20 relative">
            <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden bg-slate-800 border-2 border-emerald-400 shadow-xl mb-4">
              {selectedCandidate.avatarUrl ? (
                <img
                  src={selectedCandidate.avatarUrl}
                  alt={selectedCandidate.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-400 text-2xl font-bold">
                  {selectedCandidate.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-2">
              کد انتخاباتی {toPersianDigits(selectedCandidate.candidateNumber)}
            </div>

            <h3 className="text-2xl font-black text-slate-100 mb-2">
              آیا از ثبت رأی به «{selectedCandidate.name}» اطمینان دارید؟
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              با فشردن کلید تأیید، رأی شما به صورت رسمی و قطعی در صندوق الکترونیک ثبت خواهد شد.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmVote}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>تأیید نهایی و ثبت رأی</span>
              </button>

              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-base border border-slate-700 active:scale-95 transition-all"
              >
                انصراف و انتخاب مجدد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success View (Voted Screen with Auto-Reset) */}
      {isSuccessView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center shadow-2xl relative">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-14 h-14" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-slate-100 mb-3">
              رأی شما با موفقیت ثبت شد
            </h2>
            <p className="text-emerald-400 font-bold text-base mb-2">
              رأی برای: {lastVotedCandidateName}
            </p>
            <p className="text-slate-400 text-sm mb-8">
              با تشکر از مشارکت شما در انتخابات.
            </p>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>بازگشت خودکار برای رأی‌دهنده بعدی در {toPersianDigits(countdown)} ثانیه...</span>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsSuccessView(false);
                  setSelectedCandidate(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-bold transition-colors"
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
