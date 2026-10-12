import React, { useState, useRef } from 'react';
import { Candidate, ElectionSession, Operator, AuditEvent } from '../types/election';
import { RankedCandidate, getTieBreakerRuleTitle } from '../utils/tieBreaker';
import { toPersianDigits, toEnglishDigits } from '../utils/persian';
import { audioFeedback } from '../utils/audioFeedback';
import { 
  Plus, 
  Minus, 
  Search, 
  Trophy, 
  Award, 
  Scale, 
  FileText, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  User, 
  Users,
  Activity,
  CornerDownLeft,
  Sparkles,
  RotateCcw,
  Barcode
} from 'lucide-react';

interface VotingCounterTabProps {
  session: ElectionSession;
  rankedCandidates: RankedCandidate[];
  currentOperator: Operator;
  recentAuditEvents: AuditEvent[];
  onIncrementVote: (candidateId: string, amount: number) => void;
  onRequestCorrection: (candidate: Candidate) => void;
  onUpdateBlankBallots: (delta: number) => void;
  onUpdateInvalidBallots: (delta: number) => void;
  totalVotes: number;
  totalValidVotes: number;
}

export const VotingCounterTab: React.FC<VotingCounterTabProps> = ({
  session,
  rankedCandidates,
  currentOperator,
  recentAuditEvents,
  onIncrementVote,
  onRequestCorrection,
  onUpdateBlankBallots,
  onUpdateInvalidBallots,
  totalVotes,
  totalValidVotes,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [animatingCandId, setAnimatingCandId] = useState<string | null>(null);
  const [lastBarcodeScanned, setLastBarcodeScanned] = useState<{
    candidate: Candidate;
    timestamp: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const voteButtonRef = useRef<HTMLButtonElement>(null);

  const isLocked = session.status === 'LOCKED_FINAL';

  const handleIncrement = (candidateId: string, amount: number) => {
    if (isLocked) return;
    audioFeedback.playVoteIncrement();
    setAnimatingCandId(candidateId);
    setTimeout(() => setAnimatingCandId(null), 400);
    onIncrementVote(candidateId, amount);
  };

  // Find matching candidate by code or name
  const normalizedQuery = toEnglishDigits(searchQuery.trim());
  const exactMatchedCandidate = rankedCandidates.find(
    (c) => toEnglishDigits(c.candidateNumber) === normalizedQuery
  );
  const matchedCandidate = exactMatchedCandidate || (normalizedQuery.length >= 1 ? rankedCandidates.find(
    (c) => toEnglishDigits(c.candidateNumber).startsWith(normalizedQuery) || c.name.includes(searchQuery.trim())
  ) : null);

  // Fast direct barcode voting (triggered by barcode scanner or simulation)
  const processBarcodeVote = (barcodeRaw: string) => {
    if (isLocked) return;
    const clean = toEnglishDigits(barcodeRaw).trim().toUpperCase();
    if (!clean) return;

    // Support formats: CAND-101, VOTE-CAND-101, VOTE-101, or raw 101
    const match = clean.match(/(?:CAND|VOTE-CAND|VOTE)?-?(\d+)/);
    const targetCode = match ? match[1] : clean.replace(/\D/g, '');

    const target = rankedCandidates.find(
      (c) => toEnglishDigits(c.candidateNumber) === targetCode
    );

    if (target) {
      handleIncrement(target.id, 1);
      setLastBarcodeScanned({
        candidate: { ...target, votes: target.votes + 1 },
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  // Fast keyboard voting execution
  const executeQuickVote = (cand: Candidate) => {
    if (isLocked) return;
    handleIncrement(cand.id, 1);
    setSearchQuery('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  // KeyDown on search input (handles both Barcode Scanner Enter and Manual Enter)
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = searchQuery.trim().toUpperCase();

      // If barcode scanner sent CAND- prefix or if it's an exact candidate code match
      if (raw.includes('CAND') || exactMatchedCandidate) {
        processBarcodeVote(raw);
        return;
      }

      if (matchedCandidate) {
        voteButtonRef.current?.focus();
      }
    }
  };

  // KeyDown on fast vote button
  const handleVoteButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (matchedCandidate) {
        executeQuickVote(matchedCandidate);
      }
    }
  };

  const filteredCandidates = rankedCandidates.filter(
    (c) =>
      c.name.includes(searchQuery) ||
      toEnglishDigits(c.candidateNumber).includes(normalizedQuery) ||
      c.candidateNumber.includes(searchQuery) ||
      c.affiliation.includes(searchQuery)
  );

  const turnoutPercentage = session.registeredVotersCount > 0
    ? ((totalVotes / session.registeredVotersCount) * 100).toFixed(1)
    : '0';

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Trophy className="w-4 h-4 text-amber-300" />,
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          title: 'رتبه ۱ (پیشتاز)',
        };
      case 2:
        return {
          icon: <Award className="w-4 h-4 text-slate-200" />,
          bg: 'bg-slate-300/20 text-slate-200 border-slate-400/40',
          title: 'رتبه ۲',
        };
      case 3:
        return {
          icon: <Award className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-700/20 text-amber-500 border-amber-700/40',
          title: 'رتبه ۳',
        };
      default:
        return {
          icon: <span className="text-xs font-mono">{toPersianDigits(rank)}</span>,
          bg: 'bg-slate-800 text-slate-400 border-slate-700',
          title: `رتبه ${toPersianDigits(rank)}`,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Locked Notice if applicable */}
      {isLocked && (
        <div className="bg-purple-900/30 border-2 border-purple-500/60 rounded-2xl p-4 flex items-center justify-between gap-4 text-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-300">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">صورتجلسه نهایی پلمپ و قفل شده است</h4>
              <p className="text-xs text-purple-300/80">
                شمارش آرا خاتمه یافته و توسط هیئت نظارت و مسئول حوزه تایید نهایی گردیده است. هرگونه تغییر غیرمجاز می‌باشد.
              </p>
            </div>
          </div>
          <div className="text-left font-mono text-xs bg-purple-950/60 px-3 py-1.5 rounded-lg border border-purple-800">
            هش رسمی سند: {session.finalMinutesHash ? session.finalMinutesHash.slice(0, 12) + '...' : 'تایید شده'}
          </div>
        </div>
      )}

      {/* Top Statistical Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Cast Ballots */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>کل آرای مأخوذه</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {toPersianDigits(totalVotes)}
            </span>
            <span className="text-xs text-slate-400">برگه</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>واجدین: {toPersianDigits(session.registeredVotersCount)}</span>
            <span className="text-emerald-400 font-semibold">{toPersianDigits(turnoutPercentage)}٪ مشارکت</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        </div>

        {/* Valid Votes */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>آرای صحیح نامزدها</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {toPersianDigits(totalValidVotes)}
            </span>
            <span className="text-xs text-slate-400">رأی</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>{toPersianDigits(rankedCandidates.length)} نامزد رسمی در رقابت</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        {/* Blank Ballots */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>آرای باطله سفید (ممتنع)</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {toPersianDigits(session.blankBallots)}
            </span>
            {!isLocked && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateBlankBallots(1)}
                  className="w-7 h-7 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg flex items-center justify-center font-bold text-xs"
                  title="افزایش رأی سفید"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={session.blankBallots <= 0}
                  onClick={() => onUpdateBlankBallots(-1)}
                  className="w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 rounded-lg flex items-center justify-center font-bold text-xs"
                  title="کاهش رأی سفید"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {totalVotes > 0 ? toPersianDigits(((session.blankBallots / totalVotes) * 100).toFixed(1)) : '۰'}٪ از کل آرا
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        {/* Invalid/Spoiled Ballots */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>آرای باطله غیرمجاز (مخدوش)</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-2xl font-black text-red-400 font-mono">
              {toPersianDigits(session.invalidBallots)}
            </span>
            {!isLocked && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateInvalidBallots(1)}
                  className="w-7 h-7 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg flex items-center justify-center font-bold text-xs"
                  title="افزایش برگه مخدوش"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={session.invalidBallots <= 0}
                  onClick={() => onUpdateInvalidBallots(-1)}
                  className="w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 rounded-lg flex items-center justify-center font-bold text-xs"
                  title="کاهش برگه مخدوش"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {totalVotes > 0 ? toPersianDigits(((session.invalidBallots / totalVotes) * 100).toFixed(1)) : '۰'}٪ از کل آرا
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-red-500" />
        </div>

        {/* Tie-breaker Rule Info */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
              <span>قانون شکستن تساوی</span>
              <Scale className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="mt-2 font-bold text-xs text-indigo-300 leading-tight">
              {getTieBreakerRuleTitle(session.tieBreakerRule)}
            </p>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            اعمال خودکار بر رتبه‌بندی در صورت برابری آرا
          </span>
        </div>
      </div>

      {/* =========================================================================
          KEYBOARD-DRIVEN ULTRA-FAST VOTE ENTRY PANEL (Requested by user)
          Type code -> Press Enter to focus vote button -> Press Enter to record +1 and return to search!
      ========================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg animate-pulse">
              <Barcode className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-sm text-white">
                ثبت آنی رأی با بارکدخوان تعرفه یا کد نامزد (Enter)
              </h4>
              <p className="text-[11px] text-slate-400">
                برگه تعرفه را جلوی بارکدخوان بگیرید تا فوراً ۱ رأی ثبت شود (یا کد را تایپ و اینتر بزنید)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono bg-emerald-950/60 text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>بارکدخوان آماده اسکن تعرفه (CAND-code)</span>
          </div>
        </div>

        {/* Last Barcode Scan Success Alert */}
        {lastBarcodeScanned && (
          <div className="p-3 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500/80 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 text-slate-100 shadow-xl">
            <div className="flex items-center gap-3">
              <img
                src={lastBarcodeScanned.candidate.avatarUrl}
                alt={lastBarcodeScanned.candidate.name}
                className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-sm">
                    {lastBarcodeScanned.candidate.name}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded-lg font-bold">
                    کد {toPersianDigits(lastBarcodeScanned.candidate.candidateNumber)}
                  </span>
                  <span className="text-emerald-400 font-bold text-xs">
                    ✓ ۱ رأی با موفقیت ثبت شد
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  مجموع آرای نامزد: <strong className="text-emerald-400 font-mono text-xs">{toPersianDigits(lastBarcodeScanned.candidate.votes)}</strong> رأی • زمان اسکن: {lastBarcodeScanned.timestamp}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastBarcodeScanned(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main fast search / barcode input */}
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
            <input
              ref={searchInputRef}
              type="text"
              disabled={isLocked}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="بارکد برگه تعرفه را اسکن کنید (یا کد کاندیدا را تایپ کرده و Enter بزنید)..."
              className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white font-mono placeholder:font-sans placeholder-slate-500 outline-none transition shadow-inner"
            />
          </div>

          {/* Matched Candidate Inline Action Box */}
          {matchedCandidate ? (
            <div className="flex items-center gap-3 bg-slate-950/90 border border-emerald-500/60 p-2 rounded-xl flex-shrink-0 animate-in fade-in zoom-in-95">
              <img
                src={matchedCandidate.avatarUrl}
                alt={matchedCandidate.name}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700"
              />
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">{matchedCandidate.name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                    کد {toPersianDigits(matchedCandidate.candidateNumber)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  آرا کنونی: <strong className="text-emerald-400 font-mono">{toPersianDigits(matchedCandidate.votes)}</strong>
                </div>
              </div>

              {/* Fast Vote Button */}
              <button
                ref={voteButtonRef}
                type="button"
                disabled={isLocked}
                onClick={() => executeQuickVote(matchedCandidate)}
                onKeyDown={handleVoteButtonKeyDown}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-400/50 focus:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition"
                title="ثبت رأی +۱ و بازگشت خودکار به جستجو"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت رأی (+۱)</span>
                <span className="text-[10px] font-mono bg-emerald-700/80 px-1 py-0.5 rounded text-emerald-100 mr-1">
                  Enter ⏎
                </span>
              </button>

              {/* Fast Correction Button */}
              <button
                type="button"
                disabled={isLocked || matchedCandidate.votes <= 0}
                onClick={() => onRequestCorrection(matchedCandidate)}
                className="px-2.5 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-xl text-xs flex items-center gap-1 transition"
                title="اصلاح یا کسر رأی این نامزد"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>اصلاح</span>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-950/40 px-3 py-2.5 rounded-xl border border-slate-800/80">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>بارکدخوان خودکار اسکن کرده و +۱ رأی ثبت می‌کند</span>
            </div>
          )}
        </div>

        {/* Barcode Scanner Simulator Buttons (for convenient testing without physical scanner) */}
        {!isLocked && rankedCandidates.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-slate-400">شبیه‌ساز اسکن برگه تعرفه نامزدها:</span>
              <span className="text-[9px] text-slate-500 font-mono">(کلیک = شبیه‌سازی اسکن با بارکدخوان)</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {rankedCandidates.slice(0, 8).map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => processBarcodeVote(`CAND-${cand.candidateNumber}`)}
                  className="px-2 py-1 bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-600 rounded-lg text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap transition"
                  title={`شبیه‌سازی اسکن بارکد تعرفه ${cand.name}`}
                >
                  <Barcode className="w-3 h-3 text-emerald-400" />
                  <span>{cand.name}</span>
                  <span className="font-mono text-[9px] text-amber-300 font-bold">({toPersianDigits(cand.candidateNumber)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live audit ticker pill */}
        {recentAuditEvents.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl overflow-hidden">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-slate-500 flex-shrink-0 text-[11px]">آخرین رویداد ثبت‌شده:</span>
            <span className="text-slate-200 truncate font-mono text-[11px]">
              {recentAuditEvents[0].candidateName 
                ? `${recentAuditEvents[0].candidateName} (${recentAuditEvents[0].delta && recentAuditEvents[0].delta > 0 ? '+' : ''}${toPersianDigits(recentAuditEvents[0].delta)}) - ${recentAuditEvents[0].persianTimestamp}`
                : recentAuditEvents[0].reason}
            </span>
          </div>
        )}
      </div>

      {/* Candidates Counting Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => {
          const rankInfo = getRankBadge(candidate.rank);
          const isAnimating = animatingCandId === candidate.id;

          return (
            <div
              key={candidate.id}
              className={`bg-slate-800/90 border rounded-2xl p-5 shadow-lg relative transition-all duration-200 ${
                isAnimating ? 'ring-2 ring-emerald-400 scale-[1.01] bg-slate-800' : 'border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {/* Card Top: Rank & Candidate Code */}
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${rankInfo.bg}`}>
                  {rankInfo.icon}
                  <span>{rankInfo.title}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">کد نامزدی:</span>
                  <span className="font-mono font-bold text-amber-300 bg-slate-900/90 border border-slate-700/60 px-2 py-0.5 rounded-lg">
                    {toPersianDigits(candidate.candidateNumber)}
                  </span>
                </div>
              </div>

              {/* Candidate Info */}
              <div className="flex items-start gap-3 mb-4">
                <img
                  src={candidate.avatarUrl}
                  alt={candidate.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-600 shadow-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-white truncate" title={candidate.name}>
                    {candidate.name}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5" title={candidate.affiliation}>
                    {candidate.affiliation}
                  </p>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                    <span>کد ملی: {candidate.nationalIdMasked}</span>
                    <span>•</span>
                    <span>متولد {toPersianDigits(candidate.birthYear)}</span>
                  </div>
                </div>
              </div>

              {/* Tie-breaker Alert Indicator if candidate is tied with someone */}
              {candidate.isTied && (
                <div className="mb-3 p-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{candidate.tieBreakerAppliedReason}</span>
                </div>
              )}

              {/* Vote Count & Progress Bar */}
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 mb-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">تعداد آرای مأخوذه:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                      {toPersianDigits(candidate.votes)}
                    </span>
                    <span className="text-xs text-slate-400">رأی</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-l from-emerald-400 to-teal-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, candidate.percentage)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>سهم از کل آرای صحیح</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {toPersianDigits(candidate.percentage)}٪
                    </span>
                  </div>
                </div>
              </div>

              {/* In-Person Ballot Actions: Prominently separated increment and decrement */}
              {!isLocked ? (
                <div className="space-y-2">
                  {/* Primary Increment Buttons (Green & prominent) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleIncrement(candidate.id, 1)}
                      className="col-span-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-1.5 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ثبت رأی (+۱)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrement(candidate.id, 5)}
                      className="py-2.5 px-2 bg-emerald-700/60 hover:bg-emerald-600/80 active:scale-95 text-emerald-100 font-bold rounded-xl border border-emerald-600/40 transition flex items-center justify-center gap-1 text-xs"
                      title="ثبت بسته ۵ تایی تعرفه"
                    >
                      <span>+۵ رأی</span>
                    </button>
                  </div>

                  {/* Decrement / Correction Button (Red/Amber, distinct, requires modal & justification) */}
                  <button
                    type="button"
                    onClick={() => onRequestCorrection(candidate)}
                    disabled={candidate.votes <= 0}
                    className="w-full py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-red-300 hover:text-white border border-red-800/40 rounded-xl transition flex items-center justify-center gap-1 text-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>اصلاح یا کاهش آرا (نیاز به ثبت علت)</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>شمارش در این شعبه بسته و قفل شده است</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-800">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">نامزدی با این مشخصات یافت نشد.</p>
        </div>
      )}
    </div>
  );
};
