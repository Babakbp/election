export type LotteryIdentifierType = 'PERSONNEL_8' | 'NATIONAL_10';

export type LotteryIdentifierPolicy = 'BOTH' | 'PERSONNEL_8_ONLY' | 'NATIONAL_10_ONLY';

export interface LotteryParticipant {
  id: string;
  rowNumber: number;
  fullName: string;
  identifierType: LotteryIdentifierType;
  identifierCode: string; // 8-digit personnel code OR 10-digit national ID
  phoneNumber?: string; // شماره موبایل فرد
  department?: string; // واحد سازمانی / بخش / توضیحات
  isEligible: boolean;
  addedAt: string;
}

export interface LotterySettings {
  title: string;
  organization: string;
  roundCode: string;
  winnerCount: number; // تعداد افراد انتخابی (برندگان اصلی)
  reserveCount: number; // تعداد افراد رزرو (علی‌البدل)
  spinDurationSeconds: number; // مدت نمایش چرخش چرخ قرعه‌کشی (پیش‌فرض ۳۰ ثانیه)
  identifierPolicy: LotteryIdentifierPolicy;
  enableSound: boolean;
  notes?: string;
}

export interface LotterySelectedEntry {
  rank: number; // رتبه انتخاب (۱، ۲، ...) یا اولویت رزرو (۱، ۲، ...)
  role: 'WINNER' | 'RESERVE';
  participant: LotteryParticipant;
}

export interface LotteryDrawResult {
  id: string;
  drawnAt: string; // ISO
  persianDrawnAt: string;
  settings: LotterySettings;
  totalParticipantsCount: number;
  eligibleParticipantsCount: number;
  winners: LotterySelectedEntry[];
  reserves: LotterySelectedEntry[];
  integrityHash: string; // SHA-256
  algorithmInfo: string;
}

export interface ArchivedLotteryRound {
  id: string;
  archivedAt: string;
  persianArchivedDate: string;
  result: LotteryDrawResult;
  allParticipants: LotteryParticipant[];
  notes?: string;
}
