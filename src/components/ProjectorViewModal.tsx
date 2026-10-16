import React, { useEffect, useState, useRef } from 'react';
import { ElectionSession, Candidate, AuditEvent } from '../types/election';
import { RankedCandidate } from '../utils/tieBreaker';
import { toPersianDigits, formatJalali, toEnglishDigits } from '../utils/persian';
import { audioFeedback } from '../utils/audioFeedback';
import { 
  X, 
  Tv, 
  Trophy, 
  Users, 
  CheckCircle2, 
  Activity, 
  Lock, 
  Building2,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  ExternalLink,
  Monitor,
  Vote,
  Barcode,
  Check
} from 'lucide-react';

interface ProjectorViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ElectionSession;
  rankedCandidates: RankedCandidate[];
  recentAuditEvents: AuditEvent[];
  totalVotes: number;
  totalValidVotes: number;
  onIncrementVote?: (candidateId: string, amount: number) => void;
  isLocked?: boolean;
}

export const ProjectorViewModal: React.FC<ProjectorViewModalProps> = ({
  isOpen,
  onClose,
  session,
  rankedCandidates,
  recentAuditEvents,
  totalVotes,
  totalValidVotes,
  onIncrementVote,
  isLocked = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Auto-select 2 columns if more than 5 candidates to guarantee all fit on screen
  const [columnsMode, setColumnsMode] = useState<'1-col' | '2-col'>(() => 
    rankedCandidates.length > 5 ? '2-col' : '1-col'
  );
  // Requested: Toggle for compact vote registration bar at bottom of projector
  const [isVotingModeOpen, setIsVotingModeOpen] = useState(false);
  const [voteInput, setVoteInput] = useState('');
  const [lastRegisteredVote, setLastRegisteredVote] = useState<{
    name: string;
    candidateNumber: string;
    votes: number;
    time: string;
  } | null>(null);

  const voteInputRef = useRef<HTMLInputElement>(null);
  const isDetached = typeof window !== 'undefined' && window.location.search.includes('station=projector');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (isVotingModeOpen) {
          setIsVotingModeOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsVotingModeOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => voteInputRef.current?.focus(), 80);
          }
          return next;
        });
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isVotingModeOpen]);

  useEffect(() => {
    if (lastRegisteredVote) {
      const timer = setTimeout(() => {
        setLastRegisteredVote(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastRegisteredVote]);

  // Candidate matching for instant manual or barcode entry
  const cleanInput = toEnglishDigits(voteInput).trim().toUpperCase();
  const matchCode = cleanInput.match(/(?:CAND|VOTE-CAND|VOTE)?-?(\d+)/);
  const targetCode = matchCode ? matchCode[1] : cleanInput.replace(/\D/g, '');
  const matchedCandidate = targetCode
    ? rankedCandidates.find(
        (c) =>
          toEnglishDigits(c.candidateNumber) === targetCode ||
          toEnglishDigits(c.id) === targetCode
      )
    : null;

  const executeVote = (candidateId: string) => {
    if (isLocked) return;
    const target = rankedCandidates.find((c) => c.id === candidateId);
    if (!target) return;

    if (onIncrementVote) {
      onIncrementVote(target.id, 1);
    }
    audioFeedback.playVoteIncrement();
    setLastRegisteredVote({
      name: target.name,
      candidateNumber: target.candidateNumber,
      votes: target.votes + 1,
      time: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });
    setVoteInput('');
    setTimeout(() => {
      voteInputRef.current?.focus();
    }, 50);
  };

  const handleVoteInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchedCandidate) {
        executeVote(matchedCandidate.id);
      }
    } else if (e.key === 'Escape') {
      if (voteInput.trim()) {
        setVoteInput('');
      } else {
        setIsVotingModeOpen(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  if (!isOpen) return null;

  const maxVotes = Math.max(...rankedCandidates.map(c => c.votes), 1);
  const turnoutPercentage = session.registeredVotersCount > 0
    ? ((totalVotes / session.registeredVotersCount) * 100).toFixed(1)
    : '0';

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-7 overflow-y-auto select-none"
      dir="rtl"
    >
      {/* Top Header Bar for Projector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {session.title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                شمارش زنده حضوری سالن
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              حوزه: {session.constituency} • شعبه <strong className="text-white font-mono">{toPersianDigits(session.stationNumber)}</strong> • صندوق: {session.boxNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Key Metric Pills */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <div className="text-center px-1.5">
              <span className="text-[10px] text-slate-400 block">کل آرا</span>
              <strong className="text-base font-black text-white font-mono">{toPersianDigits(totalVotes)}</strong>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="text-center px-1.5">
              <span className="text-[10px] text-slate-400 block">آرای صحیح</span>
              <strong className="text-base font-black text-emerald-400 font-mono">{toPersianDigits(totalValidVotes)}</strong>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div className="text-center px-1.5">
              <span className="text-[10px] text-slate-400 block">مشارکت</span>
              <strong className="text-base font-black text-amber-400 font-mono">{toPersianDigits(turnoutPercentage)}٪</strong>
            </div>
          </div>

          {/* Open in Separate Window (For Hall Projector) */}
          {!isDetached && (
            <button
              onClick={() => {
                window.open('/?station=projector', '_blank');
                onClose();
              }}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-400/50"
              title="پروژکتور را در پنجره جداگانه باز کنید تا به مانیتور دوم/پروژکتور بکشید و این صفحه برای ثبت رأی اپراتور آزاد شود"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">انتقال به پنجره مجزا (پروژکتور سالن)</span>
              <span className="sm:hidden">پنجره مجزا</span>
            </button>
          )}

          {/* Toggle 1-col / 2-col to fit more candidates */}
          <button
            onClick={() => setColumnsMode(prev => prev === '1-col' ? '2-col' : '1-col')}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="تغییر چیدمان ۱ ستونه یا ۲ ستونه برای جا شدن تمام کاندیداها"
          >
            {columnsMode === '1-col' ? <LayoutGrid className="w-4 h-4 text-emerald-400" /> : <List className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{columnsMode === '1-col' ? '۲ ستونه' : '۱ ستونه'}</span>
          </button>

          {/* Toggle Operator Voting Bar */}
          <button
            onClick={() => {
              setIsVotingModeOpen((prev) => !prev);
              if (!isVotingModeOpen) {
                setTimeout(() => voteInputRef.current?.focus(), 80);
              }
            }}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isVotingModeOpen
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
            }`}
            title="فعال‌سازی نوار ثبت دستی شماره و بارکدخوان در پایین صفحه (کلید F2)"
          >
            <Vote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">
              {isVotingModeOpen ? 'نوار ثبت رأی فعال است' : 'ثبت آراء در این صفحه'}
            </span>
            <span className="md:hidden">ثبت رأی</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isFullscreen ? 'خروج از تمام صفحه' : 'نمایش تمام صفحه ویدئو پروژکتور (F11)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="خروج از حالت نمایشگر (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Dual Monitor & Projector Guidance Banner */}
      {!isDetached && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-200 mt-3 flex-shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl flex-shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-white font-bold">راهنمای تفکیک صفحه پروژکتور از لپ‌تاپ اپراتور:</strong>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  اپراتور ثبت رأی می‌کند، سالن فقط پروژکتور را می‌بیند
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                کلیدهای <kbd className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">Win + P</kbd> را در ویندوز بزنید و حالت <strong className="text-indigo-300">Extend (توسعه)</strong> را انتخاب کنید. سپس دکمه «انتقال به پنجره مجزا» را بزنید؛ پنجره جدید را با ماوس به سمت تصویر پروژکتور بکشید و <kbd className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">F11</kbd> بزنید تا تمام‌صفحه شود. صفحه لپ‌تاپ برای ثبت و شمارش آرا آزاد می‌ماند!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.open('/?station=projector', '_blank');
              onClose();
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 flex-shrink-0 shadow transition self-stretch sm:self-auto justify-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>باز کردن در پنجره مستقل</span>
          </button>
        </div>
      )}

      {/* Main Content: Compact live ranking bars so all candidates fit comfortably */}
      <div className={`my-4 sm:my-5 max-w-7xl mx-auto w-full ${
        columnsMode === '2-col'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5'
          : 'space-y-2.5 max-w-5xl'
      }`}>
        {rankedCandidates.map((c, index) => {
          const widthPercent = (c.votes / maxVotes) * 100;
          const isLeader = index === 0 && c.votes > 0;

          return (
            <div
              key={c.id}
              className={`p-2.5 sm:p-3 sm:px-4 rounded-2xl border transition-all duration-200 ${
                isLeader 
                  ? 'bg-slate-900/95 border-amber-500/50 shadow-xl shadow-amber-950/20 ring-1 ring-amber-500/20' 
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Right Side: Compact Photo with Rank Badge */}
                <div className="relative flex-shrink-0">
                  <img
                    src={c.avatarUrl}
                    alt={c.name}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-md border transition-transform duration-200 ${
                      isLeader 
                        ? 'border-amber-400 ring-2 ring-amber-500/30' 
                        : 'border-slate-700'
                    }`}
                  />
                  {/* Rank Badge Badge overlay on photo corner */}
                  <div 
                    className={`absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-bold font-mono text-xs flex items-center justify-center shadow-md border border-slate-950 ${
                      index === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                      index === 1 ? 'bg-slate-300 text-slate-950 font-bold' :
                      index === 2 ? 'bg-amber-700 text-white font-bold' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                    title={`رتبه ${toPersianDigits(c.rank)}`}
                  >
                    {index === 0 ? <Trophy className="w-3.5 h-3.5 text-slate-950" /> : toPersianDigits(c.rank)}
                  </div>
                </div>

                {/* Left/Middle Section: Candidate Meta, Big Vote Numbers, and Shortened Green Vote Bar */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  {/* Top row: Name, Code, Affiliation & Big Vote Count */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                        {c.name}
                      </h3>
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-800 text-amber-300 border border-slate-700/80 rounded font-semibold flex-shrink-0">
                        کد {toPersianDigits(c.candidateNumber)}
                      </span>
                      <span className="hidden sm:inline text-xs text-slate-400 truncate">
                        • {c.affiliation}
                      </span>
                    </div>

                    {/* Big Vote Count Number */}
                    <div className="flex items-baseline gap-1.5 flex-shrink-0 bg-slate-950/70 border border-slate-800/80 px-2.5 py-1 rounded-xl">
                      <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                        {toPersianDigits(c.votes)}
                      </span>
                      <span className="text-[11px] text-slate-400">رأی</span>
                      <span className="text-emerald-400 font-bold font-mono text-xs sm:text-sm mr-1">
                        ({toPersianDigits(c.percentage)}٪)
                      </span>
                    </div>
                  </div>

                  {/* Shortened Green Vote Progress Bar (with right side opened up exclusively for the candidate photo) */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 max-w-md sm:max-w-lg bg-slate-800/80 rounded-full h-2.5 sm:h-3 overflow-hidden border border-slate-700/50 shadow-inner">
                      <div
                        className={`h-2.5 sm:h-3 rounded-full transition-all duration-500 ${
                          isLeader 
                            ? 'bg-gradient-to-l from-amber-400 via-emerald-400 to-teal-400 shadow-sm shadow-emerald-500/30' 
                            : 'bg-gradient-to-l from-emerald-500 to-teal-500'
                        }`}
                        style={{ width: `${Math.max(2, widthPercent)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0 font-medium">
                      {toPersianDigits(c.percentage)}٪
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Area: Either Live Event Ticker OR Compact Operator Voting Bar (User Requested: به جای توضیحات ذیل صفحه) */}
      {!isVotingModeOpen ? (
        <div className="border-t border-slate-800 pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-slate-500 font-semibold flex-shrink-0">جریان زنده رویدادها:</span>
            {recentAuditEvents.length > 0 && (
              <span className="font-mono text-slate-300 truncate">
                [{recentAuditEvents[0].persianTimestamp}] {recentAuditEvents[0].operatorName}: {recentAuditEvents[0].reason} ({recentAuditEvents[0].candidateName ?? 'جلسه'})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Operator Quick Vote Toggle Button */}
            <button
              onClick={() => {
                setIsVotingModeOpen(true);
                setTimeout(() => voteInputRef.current?.focus(), 80);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/50 transition transform active:scale-95 flex-shrink-0"
              title="برای جلوگیری از مشکل دو صفحه کردن، ثبت دستی شماره کاندیدا و بارکدخوان را همین‌جا فعال کنید (F2)"
            >
              <Vote className="w-4 h-4 text-emerald-200" />
              <span>ثبت آراء (دستی / بارکدخوان)</span>
              <span className="px-1.5 py-0.5 bg-emerald-800/80 rounded text-[10px] font-mono text-emerald-200">
                F2
              </span>
            </button>

            <div className="hidden lg:flex items-center gap-2 text-slate-500 font-mono text-[11px] flex-shrink-0">
              <span>{formatJalali(new Date(), true)}</span>
              <span>•</span>
              <span>سامانه شفافیت انتخابات حضوری</span>
            </div>
          </div>
        </div>
      ) : (
        /* User Requested: قسمت ثبت دستی شماره کاندیدا وثبت با بارکدخوان خیلی کوچک و کم جا بجای اون توضیحات ذیل صفحه نمایش داده شود تا اپراتور در این صفحه هم بتواند عملیات ثبت رای را انجام دهد */
        <div className="border-t border-emerald-500/50 bg-slate-900/95 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 px-3 py-2 sm:px-6 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl backdrop-blur-md flex-shrink-0 animate-in slide-in-from-bottom-2 duration-200">
          {/* Right Section: Fast Manual / Barcode Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={voteInputRef}
                type="text"
                value={voteInput}
                onChange={(e) => setVoteInput(e.target.value)}
                onKeyDown={handleVoteInputKeyDown}
                placeholder="شماره کاندیدا یا بارکدخوان (Enter)..."
                className="w-full bg-slate-950 border border-emerald-500/40 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono transition"
                autoFocus
              />
            </div>

            {/* Matched Candidate Button or Status */}
            {matchedCandidate ? (
              <button
                onClick={() => executeVote(matchedCandidate.id)}
                disabled={isLocked}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/40 transition flex-shrink-0 active:scale-95 animate-in fade-in"
                title={`ثبت +۱ رأی برای ${matchedCandidate.name} (Enter)`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>ثبت {matchedCandidate.name} (+۱)</span>
              </button>
            ) : voteInput.trim() ? (
              <span className="text-[11px] text-amber-400 font-semibold px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg flex-shrink-0">
                کد نامعتبر
              </span>
            ) : null}
          </div>

          {/* Center Section: Compact Candidate Clickable Quick-Pills (خیلی کوچک و کم جا) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full lg:max-w-xl scrollbar-none">
            <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0 hidden xl:inline">انتخاب سریع:</span>
            {rankedCandidates.map((cand) => (
              <button
                key={cand.id}
                onClick={() => executeVote(cand.id)}
                disabled={isLocked}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500/60 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition flex-shrink-0 active:scale-95"
                title={`کلیک برای ثبت فوری +۱ رأی برای ${cand.name}`}
              >
                <span className="font-mono text-emerald-400 font-bold">کد {toPersianDigits(cand.candidateNumber)}</span>
                <span className="truncate max-w-[85px]">{cand.name}</span>
              </button>
            ))}
          </div>

          {/* Left Section: Last Vote Confirmation & Exit Voting Bar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastRegisteredVote && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ثبت شد: {lastRegisteredVote.name} ({toPersianDigits(lastRegisteredVote.votes)} رأی)</span>
              </div>
            )}

            <button
              onClick={() => setIsVotingModeOpen(false)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
              title="بستن بخش ثبت رأی و بازگشت به نمایش توضیحات رویدادها (Esc یا F2)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بستن نوار ثبت</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
