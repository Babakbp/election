import * as XLSX from 'xlsx';
import {
  ArchivedLotteryRound,
  LotteryDrawResult,
  LotteryIdentifierType,
  LotteryParticipant,
  LotterySelectedEntry,
  LotterySettings,
} from '../types/lottery';
import {
  computeSHA256,
  formatJalali,
  toEnglishDigits,
  toPersianDigits,
  validateIranianNationalId,
} from './persian';

export const STORAGE_KEY_LOTTERY_SETTINGS = 'lottery_panel_settings_v1';
export const STORAGE_KEY_LOTTERY_PARTICIPANTS = 'lottery_panel_participants_v1';
export const STORAGE_KEY_LOTTERY_LAST_RESULT = 'lottery_panel_last_result_v1';
export const STORAGE_KEY_LOTTERY_ARCHIVES = 'lottery_panel_archives_v1';

export function getDefaultLotterySettings(): LotterySettings {
  return {
    title: 'قرعه‌کشی دوره جدید کارکنان و اعضا',
    organization: 'ستاد برگزاری قرعه‌کشی و امور رفاهی',
    roundCode: 'LOT-1405-01',
    winnerCount: 3,
    reserveCount: 2,
    spinDurationSeconds: 30,
    identifierPolicy: 'BOTH',
    enableSound: true,
    notes: '',
  };
}

export function loadLotterySettings(): LotterySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_SETTINGS);
    if (raw) {
      return { ...getDefaultLotterySettings(), ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return getDefaultLotterySettings();
}

export function saveLotterySettings(settings: LotterySettings): void {
  localStorage.setItem(STORAGE_KEY_LOTTERY_SETTINGS, JSON.stringify(settings));
}

export function loadLotteryParticipants(): LotteryParticipant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_PARTICIPANTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLotteryParticipants(participants: LotteryParticipant[]): void {
  localStorage.setItem(STORAGE_KEY_LOTTERY_PARTICIPANTS, JSON.stringify(participants));
}

export function loadLastLotteryResult(): LotteryDrawResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_LAST_RESULT);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveLastLotteryResult(result: LotteryDrawResult | null): void {
  if (!result) {
    localStorage.removeItem(STORAGE_KEY_LOTTERY_LAST_RESULT);
    return;
  }
  localStorage.setItem(STORAGE_KEY_LOTTERY_LAST_RESULT, JSON.stringify(result));
}

export function loadLotteryArchives(): ArchivedLotteryRound[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_ARCHIVES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLotteryArchive(round: ArchivedLotteryRound): ArchivedLotteryRound[] {
  const existing = loadLotteryArchives();
  const updated = [round, ...existing.filter((item) => item.id !== round.id)];
  localStorage.setItem(STORAGE_KEY_LOTTERY_ARCHIVES, JSON.stringify(updated));
  return updated;
}

export function deleteLotteryArchive(archiveId: string): ArchivedLotteryRound[] {
  const existing = loadLotteryArchives();
  const updated = existing.filter((item) => item.id !== archiveId);
  localStorage.setItem(STORAGE_KEY_LOTTERY_ARCHIVES, JSON.stringify(updated));
  return updated;
}

export function updateLotteryArchiveNotes(archiveId: string, notes: string): ArchivedLotteryRound[] {
  const existing = loadLotteryArchives();
  const updated = existing.map((item) =>
    item.id === archiveId ? { ...item, notes } : item
  );
  localStorage.setItem(STORAGE_KEY_LOTTERY_ARCHIVES, JSON.stringify(updated));
  return updated;
}

/**
 * Normalize and validate an 8-digit personnel code or 10-digit national ID.
 */
export function normalizeAndValidateLotteryCode(
  rawCode: string,
  preferredType?: LotteryIdentifierType
): {
  isValid: boolean;
  code: string;
  type: LotteryIdentifierType;
  error?: string;
} {
  const digits = toEnglishDigits(String(rawCode || '')).replace(/\D/g, '');

  if (preferredType === 'PERSONNEL_8') {
    if (!/^\d{8}$/.test(digits)) {
      return {
        isValid: false,
        code: digits,
        type: 'PERSONNEL_8',
        error: 'کد پرسنلی باید دقیقاً ۸ رقم عددی باشد.',
      };
    }
    return { isValid: true, code: digits, type: 'PERSONNEL_8' };
  }

  if (preferredType === 'NATIONAL_10') {
    if (!/^\d{10}$/.test(digits)) {
      return {
        isValid: false,
        code: digits,
        type: 'NATIONAL_10',
        error: 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد.',
      };
    }
    return { isValid: true, code: digits, type: 'NATIONAL_10' };
  }

  // Auto-detect: 8 digits -> PERSONNEL_8, 10 digits -> NATIONAL_10
  if (digits.length === 8) {
    return { isValid: true, code: digits, type: 'PERSONNEL_8' };
  }
  if (digits.length === 10) {
    return { isValid: true, code: digits, type: 'NATIONAL_10' };
  }

  return {
    isValid: false,
    code: digits,
    type: digits.length <= 8 ? 'PERSONNEL_8' : 'NATIONAL_10',
    error: 'کد وارد شده باید ۸ رقم (کد پرسنلی) یا ۱۰ رقم (کد ملی) باشد.',
  };
}

export function isNationalIdChecksumValid(code: string): boolean {
  return validateIranianNationalId(code);
}

export function formatIdentifierTypeLabel(type: LotteryIdentifierType): string {
  return type === 'PERSONNEL_8' ? 'کد پرسنلی ۸ رقمی' : 'کد ملی ۱۰ رقمی';
}

/**
 * Cryptographically secure unbiased integer in [0, maxExclusive)
 * using rejection sampling over Web Crypto API.
 */
function cryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const maxUint32 = 0xffffffff;
    const limit = maxUint32 - (maxUint32 % maxExclusive);
    const buf = new Uint32Array(1);
    while (true) {
      window.crypto.getRandomValues(buf);
      if (buf[0] < limit) {
        return buf[0] % maxExclusive;
      }
    }
  }
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Perform unbiased Fisher-Yates shuffle draw for winners and reserves.
 */
export async function executeCryptographicLotteryDraw(
  participants: LotteryParticipant[],
  settings: LotterySettings
): Promise<LotteryDrawResult> {
  const eligible = participants.filter((p) => {
    if (!p.isEligible) return false;
    if (settings.identifierPolicy === 'PERSONNEL_8_ONLY' && p.identifierType !== 'PERSONNEL_8') return false;
    if (settings.identifierPolicy === 'NATIONAL_10_ONLY' && p.identifierType !== 'NATIONAL_10') return false;
    return true;
  });

  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const winners: LotterySelectedEntry[] = pool
    .slice(0, settings.winnerCount)
    .map((p, idx) => ({
      rank: idx + 1,
      role: 'WINNER',
      participant: p,
    }));

  const reserves: LotterySelectedEntry[] = pool
    .slice(settings.winnerCount, settings.winnerCount + settings.reserveCount)
    .map((p, idx) => ({
      rank: idx + 1,
      role: 'RESERVE',
      participant: p,
    }));

  const now = new Date();
  const payloadForHash = {
    drawnAt: now.toISOString(),
    roundCode: settings.roundCode,
    title: settings.title,
    winners: winners.map((w) => ({
      rank: w.rank,
      code: w.participant.identifierCode,
      name: w.participant.fullName,
    })),
    reserves: reserves.map((r) => ({
      rank: r.rank,
      code: r.participant.identifierCode,
      name: r.participant.fullName,
    })),
  };

  const integrityHash = await computeSHA256(JSON.stringify(payloadForHash));

  return {
    id: `DRAW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    drawnAt: now.toISOString(),
    persianDrawnAt: formatJalali(now, true),
    settings: { ...settings },
    totalParticipantsCount: participants.length,
    eligibleParticipantsCount: eligible.length,
    winners,
    reserves,
    integrityHash,
    algorithmInfo: 'Fisher-Yates CSPRNG (crypto.getRandomValues) + SHA-256',
  };
}

/**
 * Sample demo participants with valid 8-digit personnel codes and 10-digit national IDs
 */
export function createSampleLotteryParticipants(): LotteryParticipant[] {
  const now = new Date().toISOString();
  const samples: Array<{
    fullName: string;
    identifierType: LotteryIdentifierType;
    identifierCode: string;
    department: string;
  }> = [
    { fullName: 'امیرحسین رضایی', identifierType: 'PERSONNEL_8', identifierCode: '14021108', department: 'واحد فنی و مهندسی' },
    { fullName: 'فاطمه مرادی', identifierType: 'PERSONNEL_8', identifierCode: '14021145', department: 'امور مالی و اداری' },
    { fullName: 'علی‌اصغر کریمی', identifierType: 'PERSONNEL_8', identifierCode: '14021209', department: 'فناوری اطلاعات' },
    { fullName: 'زهرا حسینی مقدم', identifierType: 'NATIONAL_10', identifierCode: '0012345678', department: 'روابط عمومی' },
    { fullName: 'مهدی باقری', identifierType: 'PERSONNEL_8', identifierCode: '14021314', department: 'تولید و عملیات' },
    { fullName: 'سارا احمدی نیا', identifierType: 'NATIONAL_10', identifierCode: '0023456789', department: 'منابع انسانی' },
    { fullName: 'حسین محمدی', identifierType: 'PERSONNEL_8', identifierCode: '14021422', department: 'کنترل کیفیت' },
    { fullName: 'مریم کاظمی', identifierType: 'PERSONNEL_8', identifierCode: '14021536', department: 'پشتیبانی و تدارکات' },
    { fullName: 'رضا جعفری', identifierType: 'NATIONAL_10', identifierCode: '0034567890', department: 'حراست و بازرسی' },
    { fullName: 'نرگس طاهری', identifierType: 'PERSONNEL_8', identifierCode: '14021671', department: 'آموزش و پژوهش' },
    { fullName: 'سعید رحیمی', identifierType: 'PERSONNEL_8', identifierCode: '14021788', department: 'برنامه‌ریزی' },
    { fullName: 'لیلا صادقی', identifierType: 'NATIONAL_10', identifierCode: '0045678901', department: 'امور رفاهی' },
  ];

  return samples.map((s, idx) => ({
    id: `LOT-P-${Date.now()}-${idx + 1}`,
    rowNumber: idx + 1,
    fullName: s.fullName,
    identifierType: s.identifierType,
    identifierCode: s.identifierCode,
    department: s.department,
    isEligible: true,
    addedAt: now,
  }));
}

/**
 * Download an Excel workbook helper
 */
function downloadLotteryWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Excel template for importing lottery participants (8-digit personnel code or 10-digit national ID)
 */
export function exportLotteryParticipantsTemplateToExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['ردیف', 'نام و نام خانوادگی', 'کد پرسنلی ۸ رقمی یا کد ملی ۱۰ رقمی', 'واحد / بخش'];
  const rows = [
    [1, 'محمد امینی', '14030125', 'فناوری اطلاعات'],
    [2, 'زهرا شریفی', '14030289', 'امور مالی'],
    [3, 'علی ناصری', '0012345678', 'روابط عمومی'],
    [4, 'فاطمه قاسمی', '14030412', 'منابع انسانی'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'فهرست شرکت‌کنندگان');
  downloadLotteryWorkbook(wb, 'قالب_ورود_شرکت_کنندگان_قرعه_کشی.xlsx');
}

/**
 * Export full official Lottery Draw Results to Excel (.xlsx)
 */
export function exportLotteryResultsToExcel(
  result: LotteryDrawResult,
  allParticipants: LotteryParticipant[] = []
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ['گزارش رسمی نتایج قرعه‌کشی', ''],
    ['عنوان دوره قرعه‌کشی', result.settings.title],
    ['سازمان / نهاد برگزارکننده', result.settings.organization],
    ['کد دوره', result.settings.roundCode],
    ['تاریخ و زمان اجرا (شمسی)', result.persianDrawnAt],
    ['تعداد کل شرکت‌کنندگان ثبت‌شده', result.totalParticipantsCount],
    ['تعداد واجدین شرایط شرکت در قرعه', result.eligibleParticipantsCount],
    ['تعداد افراد انتخابی (برندگان اصلی)', result.winners.length],
    ['تعداد افراد رزرو (علی‌البدل)', result.reserves.length],
    ['مدت چرخش چرخ قرعه‌کشی (ثانیه)', result.settings.spinDurationSeconds],
    ['الگوریتم تصادفی‌سازی', result.algorithmInfo],
    ['کد اصالت و یکپارچگی (SHA-256)', result.integrityHash],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'خلاصه دوره');

  // Sheet 2: Main Winners
  const winnerHeaders = ['رتبه انتخاب', 'وضعیت', 'نام و نام خانوادگی', 'نوع شناسه', 'کد پرسنلی / کد ملی', 'واحد / بخش'];
  const winnerRows = result.winners.map((w) => [
    w.rank,
    'برنده اصلی (منتخب)',
    w.participant.fullName,
    formatIdentifierTypeLabel(w.participant.identifierType),
    w.participant.identifierCode,
    w.participant.department || '—',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([winnerHeaders, ...winnerRows]), 'برندگان اصلی');

  // Sheet 3: Reserve List
  const reserveHeaders = ['اولویت رزرو', 'وضعیت', 'نام و نام خانوادگی', 'نوع شناسه', 'کد پرسنلی / کد ملی', 'واحد / بخش'];
  const reserveRows = result.reserves.map((r) => [
    r.rank,
    'رزرو (علی‌البدل)',
    r.participant.fullName,
    formatIdentifierTypeLabel(r.participant.identifierType),
    r.participant.identifierCode,
    r.participant.department || '—',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([reserveHeaders, ...reserveRows]), 'افراد رزرو');

  // Sheet 4: Full Participants Pool
  if (allParticipants.length > 0) {
    const winnerIds = new Set(result.winners.map((w) => w.participant.id));
    const reserveIds = new Set(result.reserves.map((r) => r.participant.id));
    const poolHeaders = ['ردیف', 'نام و نام خانوادگی', 'نوع شناسه', 'کد پرسنلی / کد ملی', 'واحد / بخش', 'نتیجه در قرعه'];
    const poolRows = allParticipants.map((p) => {
      let status = p.isEligible ? 'عدم انتخاب' : 'غیرفعال';
      if (winnerIds.has(p.id)) {
        const w = result.winners.find((x) => x.participant.id === p.id);
        status = `برنده اصلی (نفر ${toPersianDigits(w?.rank || 1)})`;
      } else if (reserveIds.has(p.id)) {
        const r = result.reserves.find((x) => x.participant.id === p.id);
        status = `رزرو (اولویت ${toPersianDigits(r?.rank || 1)})`;
      }
      return [
        p.rowNumber,
        p.fullName,
        formatIdentifierTypeLabel(p.identifierType),
        p.identifierCode,
        p.department || '—',
        status,
      ];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([poolHeaders, ...poolRows]), 'فهرست کامل شرکت‌کنندگان');
  }

  downloadLotteryWorkbook(
    wb,
    `نتایج_قرعه_کشی_${result.settings.roundCode || 'دوره'}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/**
 * Download standalone JSON backup file for a lottery draw result
 */
export function downloadLotteryJsonBackup(result: LotteryDrawResult, allParticipants: LotteryParticipant[]) {
  const payload = {
    type: 'INDEPENDENT_LOTTERY_BACKUP',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    result,
    allParticipants,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `بایگانی_قرعه_کشی_${result.settings.roundCode || result.id}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
