import { Candidate, TieBreakerRule } from '../types/election';

export interface RankedCandidate extends Candidate {
  rank: number;
  percentage: number;
  isTied: boolean;
  tieBreakerAppliedReason?: string;
}

export function rankCandidates(
  candidates: Candidate[],
  rule: TieBreakerRule,
  totalValidVotes: number
): RankedCandidate[] {
  // First clone and sort
  const sorted = [...candidates].sort((a, b) => {
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }
    // Equal votes -> apply tie breaker
    switch (rule) {
      case 'ELDER_AGE':
        // Lower birth year = older candidate
        return a.birthYear - b.birthYear;
      case 'REGISTRATION_TIME':
        return a.registrationOrder - b.registrationOrder;
      case 'CANDIDATE_CODE':
        return parseInt(a.candidateNumber, 10) - parseInt(b.candidateNumber, 10);
      case 'LOTTERY':
        return a.name.localeCompare(b.name, 'fa');
      default:
        return 0;
    }
  });

  return sorted.map((cand, index) => {
    const tiedGroup = candidates.filter(
      (c) => c.id !== cand.id && c.votes === cand.votes && cand.votes > 0
    );
    const isTied = tiedGroup.length > 0;

    let tieBreakerAppliedReason: string | undefined;
    if (isTied) {
      switch (rule) {
        case 'ELDER_AGE':
          tieBreakerAppliedReason = `تساوی آرا با دیگر نامزدها؛ اعمال اولویت بر اساس سن (متولد ${cand.birthYear})`;
          break;
        case 'REGISTRATION_TIME':
          tieBreakerAppliedReason = `تساوی آرا؛ تقدم شماره ترتیب ثبت‌نام (ردیف ${cand.registrationOrder})`;
          break;
        case 'CANDIDATE_CODE':
          tieBreakerAppliedReason = `تساوی آرا؛ تقدم بر مبنای کد انتخاباتی کمتر (${cand.candidateNumber})`;
          break;
        case 'LOTTERY':
          tieBreakerAppliedReason = 'تساوی آرا؛ تقدم بر مبنای صورتجلسه قرعه‌کشی رسمی ناظران';
          break;
      }
    }

    const percentage = totalValidVotes > 0 
      ? Number(((cand.votes / totalValidVotes) * 100).toFixed(1)) 
      : 0;

    return {
      ...cand,
      rank: index + 1,
      percentage,
      isTied,
      tieBreakerAppliedReason,
    };
  });
}

export function getTieBreakerRuleTitle(rule: TieBreakerRule): string {
  switch (rule) {
    case 'ELDER_AGE':
      return 'اولویت سن (بزرگ‌تر بودن نامزد)';
    case 'REGISTRATION_TIME':
      return 'تقدم تاریخ و زمان ثبت‌نام اولیه';
    case 'CANDIDATE_CODE':
      return 'کد انتخاباتی کمتر (ترتیب الفبا/شماره)';
    case 'LOTTERY':
      return 'قرعه‌کشی رسمی با حضور ناظران';
  }
}
