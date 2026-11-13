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
export const STORAGE_KEY_LOTTERY_DEMO_MODE = 'lottery_panel_demo_mode_v1';

export function loadLotteryDemoMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_DEMO_MODE);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // First-time open (no stored participants yet) starts in Demo Mode
    const hasParticipants = localStorage.getItem(STORAGE_KEY_LOTTERY_PARTICIPANTS) !== null;
    const hasResult = localStorage.getItem(STORAGE_KEY_LOTTERY_LAST_RESULT) !== null;
    return !hasParticipants && !hasResult;
  } catch {
    return true;
  }
}

export function saveLotteryDemoMode(isDemo: boolean): void {
  localStorage.setItem(STORAGE_KEY_LOTTERY_DEMO_MODE, isDemo ? 'true' : 'false');
}
export const STORAGE_KEY_LOTTERY_DEMO_MODE = 'lottery_panel_demo_mode_v1';

export function loadLotteryDemoMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTTERY_DEMO_MODE);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // First-time open (no stored participants yet) starts in Demo Mode
    const hasParticipants = localStorage.getItem(STORAGE_KEY_LOTTERY_PARTICIPANTS) !== null;
    const hasResult = localStorage.getItem(STORAGE_KEY_LOTTERY_LAST_RESULT) !== null;
    return !hasParticipants && !hasResult;
  } catch {
    return true;
  }
}

export function saveLotteryDemoMode(isDemo: boolean): void {
  localStorage.setItem(STORAGE_KEY_LOTTERY_DEMO_MODE, isDemo ? 'true' : 'false');
}

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

export function saveAllLotteryArchives(archives: ArchivedLotteryRound[]): void {
  localStorage.setItem(STORAGE_KEY_LOTTERY_ARCHIVES, JSON.stringify(archives));
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
 * Normalize Iranian mobile number (handles Persian digits and missing leading zero from Excel).
 */
export function normalizeMobilePhone(rawPhone: string | undefined | null): {
  isValid: boolean;
  phone: string;
  error?: string;
} {
  const digits = toEnglishDigits(String(rawPhone || '')).replace(/\D/g, '');
  if (!digits) {
    return { isValid: true, phone: '' };
  }
  if (/^09\d{9}$/.test(digits)) {
    return { isValid: true, phone: digits };
  }
  if (/^9\d{9}$/.test(digits)) {
    return { isValid: true, phone: `0${digits}` };
  }
  if (/^989\d{9}$/.test(digits)) {
    return { isValid: true, phone: `0${digits.slice(2)}` };
  }
  return {
    isValid: false,
    phone: digits,
    error: 'شماره موبایل معتبر نیست (باید ۱۱ رقم و با ۰۹ شروع شود، مثلاً 09121234567).',
  };
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
    phoneNumber: string;
    department: string;
  }> = [
    { fullName: 'امیرحسین رضایی', identifierType: 'PERSONNEL_8', identifierCode: '14021108', phoneNumber: '09121112201', department: 'واحد فنی و مهندسی' },
    { fullName: 'فاطمه مرادی', identifierType: 'PERSONNEL_8', identifierCode: '14021145', phoneNumber: '09121112202', department: 'امور مالی و اداری' },
    { fullName: 'علی‌اصغر کریمی', identifierType: 'PERSONNEL_8', identifierCode: '14021209', phoneNumber: '09121112203', department: 'فناوری اطلاعات' },
    { fullName: 'زهرا حسینی مقدم', identifierType: 'NATIONAL_10', identifierCode: '0012345678', phoneNumber: '09121112204', department: 'روابط عمومی' },
    { fullName: 'مهدی باقری', identifierType: 'PERSONNEL_8', identifierCode: '14021314', phoneNumber: '09121112205', department: 'تولید و عملیات' },
    { fullName: 'سارا احمدی نیا', identifierType: 'NATIONAL_10', identifierCode: '0023456789', phoneNumber: '09121112206', department: 'منابع انسانی' },
    { fullName: 'حسین محمدی', identifierType: 'PERSONNEL_8', identifierCode: '14021422', phoneNumber: '09121112207', department: 'کنترل کیفیت' },
    { fullName: 'مریم کاظمی', identifierType: 'PERSONNEL_8', identifierCode: '14021536', phoneNumber: '09121112208', department: 'پشتیبانی و تدارکات' },
    { fullName: 'رضا جعفری', identifierType: 'NATIONAL_10', identifierCode: '0034567890', phoneNumber: '09121112209', department: 'حراست و بازرسی' },
    { fullName: 'نرگس طاهری', identifierType: 'PERSONNEL_8', identifierCode: '14021671', phoneNumber: '09121112210', department: 'آموزش و پژوهش' },
    { fullName: 'سعید رحیمی', identifierType: 'PERSONNEL_8', identifierCode: '14021788', phoneNumber: '09121112211', department: 'برنامه‌ریزی' },
    { fullName: 'لیلا صادقی', identifierType: 'NATIONAL_10', identifierCode: '0045678901', phoneNumber: '09121112212', department: 'امور رفاهی' },
  ];

  return samples.map((s, idx) => ({
    id: `LOT-P-${Date.now()}-${idx + 1}`,
    rowNumber: idx + 1,
    fullName: s.fullName,
    identifierType: s.identifierType,
    identifierCode: s.identifierCode,
    phoneNumber: s.phoneNumber,
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
 * Apply RTL view and comfortable column widths to an XLSX worksheet.
 */
function configureRtlWorksheet(ws: XLSX.WorkSheet, colWidths: number[]): XLSX.WorkSheet {
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  return ws;
}

/**
 * Export Excel template for importing lottery participants (8-digit personnel code or 10-digit national ID + mobile phone)
 */
export function exportLotteryParticipantsTemplateToExcel() {
  const wb = XLSX.utils.book_new();
  const headers = [
    'ردیف',
    'نام و نام خانوادگی',
    'کد پرسنلی ۸ رقمی یا کد ملی ۱۰ رقمی',
    'شماره موبایل',
    'واحد / بخش',
  ];
  const rows = [
    [1, 'محمد امینی', '14030125', '09121112233', 'فناوری اطلاعات'],
    [2, 'زهرا شریفی', '14030289', '09122223344', 'امور مالی'],
    [3, 'علی ناصری', '0012345678', '09123334455', 'روابط عمومی'],
    [4, 'فاطمه قاسمی', '14030412', '09124445566', 'منابع انسانی'],
  ];
  const ws = configureRtlWorksheet(
    XLSX.utils.aoa_to_sheet([headers, ...rows]),
    [8, 26, 32, 18, 24]
  );
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

  const detailHeaders = [
    'رتبه / اولویت',
    'وضعیت انتخاب',
    'نام و نام خانوادگی',
    'نوع شناسه',
    'کد پرسنلی / کد ملی',
    'شماره موبایل',
    'واحد / بخش',
  ];

  const winnerRows = result.winners.map((w) => [
    w.rank,
    'انتخاب شده (برنده اصلی)',
    w.participant.fullName,
    formatIdentifierTypeLabel(w.participant.identifierType),
    w.participant.identifierCode,
    w.participant.phoneNumber || '—',
    w.participant.department || '—',
  ]);

  const reserveRows = result.reserves.map((r) => [
    r.rank,
    'علی‌البدل (رزرو)',
    r.participant.fullName,
    formatIdentifierTypeLabel(r.participant.identifierType),
    r.participant.identifierCode,
    r.participant.phoneNumber || '—',
    r.participant.department || '—',
  ]);

  // Sheet 1: Combined immediately visible report (Draw Info + Selected Winners + Alternates/Reserves)
  const combinedSheetRows: (string | number)[][] = [
    ['گزارش رسمی نتایج قرعه‌کشی — فهرست افراد انتخاب‌شده و علی‌البدل'],
    ['عنوان دوره قرعه‌کشی', result.settings.title, '', 'سازمان / برگزارکننده', result.settings.organization],
    ['کد دوره', result.settings.roundCode, '', 'تاریخ و زمان اجرا (شمسی)', result.persianDrawnAt],
    [
      'تعداد کل ثبت‌نام‌شدگان',
      result.totalParticipantsCount,
      '',
      'واجدین شرایط در قرعه',
      result.eligibleParticipantsCount,
    ],
    [
      'تعداد افراد انتخاب‌شده (اصلی)',
      result.winners.length,
      '',
      'تعداد افراد علی‌البدل (رزرو)',
      result.reserves.length,
    ],
    ['مدت چرخش چرخ (ثانیه)', result.settings.spinDurationSeconds, '', 'الگوریتم تصادفی‌سازی', result.algorithmInfo],
    ['کد اصالت و یکپارچگی (SHA-256)', result.integrityHash],
    [],
    [`افراد انتخاب شده — برندگان اصلی (${result.winners.length} نفر)`],
    detailHeaders,
    ...winnerRows,
    [],
    [`افراد علی‌البدل — رزرو (${result.reserves.length} نفر)`],
    detailHeaders,
    ...(reserveRows.length > 0
      ? reserveRows
      : [['—', 'علی‌البدل (رزرو)', 'در تنظیمات این دوره فرد علی‌البدل تعریف نشده است.', '—', '—', '—', '—']]),
  ];

  const combinedWs = configureRtlWorksheet(
    XLSX.utils.aoa_to_sheet(combinedSheetRows),
    [18, 26, 28, 22, 22, 18, 24]
  );
  XLSX.utils.book_append_sheet(wb, combinedWs, 'نتایج منتخبین و علی‌البدل');

  // Sheet 2: Main Winners (Dedicated)
  const winnersWs = configureRtlWorksheet(
    XLSX.utils.aoa_to_sheet([
      ['رتبه انتخاب', 'وضعیت', 'نام و نام خانوادگی', 'نوع شناسه', 'کد پرسنلی / کد ملی', 'شماره موبایل', 'واحد / بخش'],
      ...winnerRows,
    ]),
    [14, 24, 28, 22, 22, 18, 24]
  );
  XLSX.utils.book_append_sheet(wb, winnersWs, 'برندگان اصلی');

  // Sheet 3: Reserve / Alternate List (Dedicated)
  const reservesWs = configureRtlWorksheet(
    XLSX.utils.aoa_to_sheet([
      ['اولویت علی‌البدل', 'وضعیت', 'نام و نام خانوادگی', 'نوع شناسه', 'کد پرسنلی / کد ملی', 'شماره موبایل', 'واحد / بخش'],
      ...(reserveRows.length > 0
        ? reserveRows
        : [['—', 'علی‌البدل (رزرو)', 'در این دوره فرد علی‌البدل تعریف نشده است.', '—', '—', '—', '—']]),
    ]),
    [16, 22, 28, 22, 22, 18, 24]
  );
  XLSX.utils.book_append_sheet(wb, reservesWs, 'افراد علی‌البدل (رزرو)');

  // Sheet 4: Full Participants Pool
  if (allParticipants.length > 0) {
    const winnerIds = new Set(result.winners.map((w) => w.participant.id));
    const reserveIds = new Set(result.reserves.map((r) => r.participant.id));
    const poolHeaders = [
      'ردیف',
      'نام و نام خانوادگی',
      'نوع شناسه',
      'کد پرسنلی / کد ملی',
      'شماره موبایل',
      'واحد / بخش',
      'نتیجه در قرعه',
    ];
    const poolRows = allParticipants.map((p) => {
      let status = p.isEligible ? 'عدم انتخاب' : 'غیرفعال';
      if (winnerIds.has(p.id)) {
        const w = result.winners.find((x) => x.participant.id === p.id);
        status = `برنده اصلی (نفر ${toPersianDigits(w?.rank || 1)})`;
      } else if (reserveIds.has(p.id)) {
        const r = result.reserves.find((x) => x.participant.id === p.id);
        status = `علی‌البدل / رزرو (اولویت ${toPersianDigits(r?.rank || 1)})`;
      }
      return [
        p.rowNumber,
        p.fullName,
        formatIdentifierTypeLabel(p.identifierType),
        p.identifierCode,
        p.phoneNumber || '—',
        p.department || '—',
        status,
      ];
    });
    const poolWs = configureRtlWorksheet(
      XLSX.utils.aoa_to_sheet([poolHeaders, ...poolRows]),
      [10, 28, 22, 22, 18, 24, 28]
    );
    XLSX.utils.book_append_sheet(wb, poolWs, 'فهرست کامل شرکت‌کنندگان');
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

/**
 * Download complete JSON backup of the entire Lottery Panel (settings, participants, active result, and all archived rounds)
 */
export function downloadFullLotteryJsonBackup(params: {
  settings: LotterySettings;
  participants: LotteryParticipant[];
  lastResult: LotteryDrawResult | null;
  archives: ArchivedLotteryRound[];
}) {
  const payload = {
    type: 'INDEPENDENT_LOTTERY_FULL_BACKUP',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: params.settings,
    participants: params.participants,
    lastResult: params.lastResult,
    archives: params.archives,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `پشتیبان_کامل_قرعه_کشی_${params.settings.roundCode || 'سامانه'}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type ParsedLotteryBackup =
  | {
      kind: 'SINGLE_ROUND';
      exportedAt?: string;
      result: LotteryDrawResult;
      allParticipants: LotteryParticipant[];
    }
  | {
      kind: 'FULL_PANEL';
      exportedAt?: string;
      settings: LotterySettings;
      participants: LotteryParticipant[];
      lastResult: LotteryDrawResult | null;
      archives: ArchivedLotteryRound[];
    };

function sanitizeParticipantRecord(raw: any, fallbackIndex: number): LotteryParticipant | null {
  if (!raw || typeof raw !== 'object') return null;
  const fullName = String(raw.fullName || '').trim();
  const codeCheck = normalizeAndValidateLotteryCode(
    String(raw.identifierCode || ''),
    raw.identifierType === 'PERSONNEL_8' || raw.identifierType === 'NATIONAL_10'
      ? raw.identifierType
      : undefined
  );
  if (!fullName || !codeCheck.isValid) return null;

  const phoneCheck = normalizeMobilePhone(raw.phoneNumber);
  return {
    id: String(raw.id || `LOT-P-${Date.now()}-${fallbackIndex}`),
    rowNumber: typeof raw.rowNumber === 'number' && raw.rowNumber > 0 ? raw.rowNumber : fallbackIndex + 1,
    fullName,
    identifierType: codeCheck.type,
    identifierCode: codeCheck.code,
    phoneNumber: phoneCheck.isValid && phoneCheck.phone ? phoneCheck.phone : undefined,
    department: raw.department ? String(raw.department).trim() : undefined,
    isEligible: typeof raw.isEligible === 'boolean' ? raw.isEligible : true,
    addedAt: String(raw.addedAt || new Date().toISOString()),
  };
}

function sanitizeDrawResultRecord(raw: any): LotteryDrawResult | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.winners) || !raw.settings || typeof raw.settings !== 'object') {
    return null;
  }

  const defaults = getDefaultLotterySettings();
  const mergedSettings: LotterySettings = {
    ...defaults,
    ...raw.settings,
  };

  const sanitizeEntries = (list: any[], role: 'WINNER' | 'RESERVE'): LotterySelectedEntry[] => {
    if (!Array.isArray(list)) return [];
    const output: LotterySelectedEntry[] = [];
    list.forEach((entry, idx) => {
      const p = sanitizeParticipantRecord(entry?.participant || entry, idx);
      if (!p) return;
      output.push({
        rank: typeof entry?.rank === 'number' && entry.rank > 0 ? entry.rank : output.length + 1,
        role: entry?.role === 'WINNER' || entry?.role === 'RESERVE' ? entry.role : role,
        participant: p,
      });
    });
    return output;
  };

  const winners = sanitizeEntries(raw.winners, 'WINNER');
  const reserves = sanitizeEntries(raw.reserves || [], 'RESERVE');

  return {
    id: String(raw.id || `LOT-DRAW-${Date.now()}`),
    drawnAt: String(raw.drawnAt || new Date().toISOString()),
    persianDrawnAt: String(raw.persianDrawnAt || formatJalali(new Date(), true)),
    settings: mergedSettings,
    totalParticipantsCount:
      typeof raw.totalParticipantsCount === 'number'
        ? raw.totalParticipantsCount
        : winners.length + reserves.length,
    eligibleParticipantsCount:
      typeof raw.eligibleParticipantsCount === 'number'
        ? raw.eligibleParticipantsCount
        : winners.length + reserves.length,
    winners,
    reserves,
    integrityHash: String(raw.integrityHash || 'IMPORTED-BACKUP'),
    algorithmInfo: String(
      raw.algorithmInfo || 'Web Crypto CSPRNG (crypto.getRandomValues) + Fisher-Yates Unbiased Shuffle'
    ),
  };
}

/**
 * Parse and validate an imported JSON backup file (either single-round or full-panel lottery backup).
 */
export function parseLotteryJsonBackup(rawText: string):
  | { ok: true; data: ParsedLotteryBackup }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'ساختار فایل JSON انتخاب‌شده معتبر نیست.' };
    }

    // Case 1: Full-panel backup
    if (
      parsed.type === 'INDEPENDENT_LOTTERY_FULL_BACKUP' ||
      (Array.isArray(parsed.archives) && (Array.isArray(parsed.participants) || parsed.settings))
    ) {
      const defaults = getDefaultLotterySettings();
      const settings: LotterySettings = {
        ...defaults,
        ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
      };
      const participants: LotteryParticipant[] = Array.isArray(parsed.participants)
        ? parsed.participants
            .map((p: any, idx: number) => sanitizeParticipantRecord(p, idx))
            .filter((x: LotteryParticipant | null): x is LotteryParticipant => x !== null)
            .map((p: LotteryParticipant, idx: number) => ({ ...p, rowNumber: idx + 1 }))
        : [];
      const lastResult = parsed.lastResult ? sanitizeDrawResultRecord(parsed.lastResult) : null;
      const archives: ArchivedLotteryRound[] = Array.isArray(parsed.archives)
        ? parsed.archives
            .map((arch: any, idx: number): ArchivedLotteryRound | null => {
              const res = sanitizeDrawResultRecord(arch?.result);
              if (!res) return null;
              const archParticipants = Array.isArray(arch?.allParticipants)
                ? arch.allParticipants
                    .map((p: any, pIdx: number) => sanitizeParticipantRecord(p, pIdx))
                    .filter((x: LotteryParticipant | null): x is LotteryParticipant => x !== null)
                : [];
              return {
                id: String(arch.id || `LOT-ARCH-${Date.now()}-${idx}`),
                archivedAt: String(arch.archivedAt || res.drawnAt),
                persianArchivedDate: String(arch.persianArchivedDate || res.persianDrawnAt),
                result: res,
                allParticipants: archParticipants,
                notes: arch.notes ? String(arch.notes) : undefined,
              };
            })
            .filter((x: ArchivedLotteryRound | null): x is ArchivedLotteryRound => x !== null)
        : [];

      return {
        ok: true,
        data: {
          kind: 'FULL_PANEL',
          exportedAt: parsed.exportedAt ? String(parsed.exportedAt) : undefined,
          settings,
          participants,
          lastResult,
          archives,
        },
      };
    }

    // Case 2: Single-round backup (standard INDEPENDENT_LOTTERY_BACKUP or ArchivedLotteryRound)
    const rawResult = parsed.result || (Array.isArray(parsed.winners) ? parsed : null);
    const sanitizedResult = sanitizeDrawResultRecord(rawResult);
    if (sanitizedResult) {
      const rawPool = Array.isArray(parsed.allParticipants)
        ? parsed.allParticipants
        : Array.isArray(parsed.participants)
          ? parsed.participants
          : [];
      const allParticipants: LotteryParticipant[] = rawPool
        .map((p: any, idx: number) => sanitizeParticipantRecord(p, idx))
        .filter((x: LotteryParticipant | null): x is LotteryParticipant => x !== null)
        .map((p: LotteryParticipant, idx: number) => ({ ...p, rowNumber: idx + 1 }));

      return {
        ok: true,
        data: {
          kind: 'SINGLE_ROUND',
          exportedAt: parsed.exportedAt ? String(parsed.exportedAt) : undefined,
          result: sanitizedResult,
          allParticipants,
        },
      };
    }

    return {
      ok: false,
      error:
        'فایل انتخاب‌شده یک فایل پشتیبان معتبر سامانه قرعه‌کشی نیست (داده‌های نتیجه یا بایگانی یافت نشد).',
    };
  } catch {
    return {
      ok: false,
      error: 'امکان خواندن فایل JSON وجود ندارد. لطفاً از سالم بودن فایل پشتیبان اطمینان حاصل کنید.',
    };
  }
}
