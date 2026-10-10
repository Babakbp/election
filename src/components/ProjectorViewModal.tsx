import React, { useEffect, useState } from 'react';
import { ElectionSession, Candidate, AuditEvent } from '../types/election';
import { RankedCandidate } from '../utils/tieBreaker';
import { toPersianDigits, formatJalali } from '../utils/persian';
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
  List
} from 'lucide-react';

interface ProjectorViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ElectionSession;
  rankedCandidates: RankedCandidate[];
  recentAuditEvents: AuditEvent[];
  totalVotes: number;
  totalValidVotes: number;
}

export const ProjectorViewModal: React.FC<ProjectorViewModalProps> = ({
  isOpen,
  onClose,
  session,
  rankedCandidates,
  recentAuditEvents,
  totalVotes,
  totalValidVotes,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Auto-select 2 columns if more than 5 candidates to guarantee all fit on screen
  const [columnsMode, setColumnsMode] = useState<'1-col' | '2-col'>(() => 
    rankedCandidates.length > 5 ? '2-col' : '1-col'
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

          {/* Toggle 1-col / 2-col to fit more candidates */}
          <button
            onClick={() => setColumnsMode(prev => prev === '1-col' ? '2-col' : '1-col')}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="تغییر چیدمان ۱ ستونه یا ۲ ستونه برای جا شدن تمام کاندیداها"
          >
            {columnsMode === '1-col' ? <LayoutGrid className="w-4 h-4 text-emerald-400" /> : <List className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{columnsMode === '1-col' ? '۲ ستونه' : '۱ ستونه'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isFullscreen ? 'خروج از تمام صفحه' : 'نمایش تمام صفحه ویدئو پروژکتور'}
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

      {/* Live Event Ticker at the Bottom */}
      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-slate-500 font-semibold flex-shrink-0">جریان زنده رویدادها:</span>
          {recentAuditEvents.length > 0 && (
            <span className="font-mono text-slate-300 truncate">
              [{recentAuditEvents[0].persianTimestamp}] {recentAuditEvents[0].operatorName}: {recentAuditEvents[0].reason} ({recentAuditEvents[0].candidateName ?? 'جلسه'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px] flex-shrink-0">
          <span>{formatJalali(new Date(), true)}</span>
          <span>•</span>
          <span>سامانه شفافیت انتخابات حضوری</span>
        </div>
      </div>
    </div>
  );
};
