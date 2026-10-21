/**
 * Persian typography, Jalali date formatting, National ID validation & Crypto tools
 */

export function toPersianDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '';
  const str = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

export function toEnglishDigits(str: string): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
}

export function formatJalali(dateInput: string | number | Date, includeSeconds = true): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
      calendar: 'persian',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', options);
    return formatter.format(d);
  } catch {
    return new Date(dateInput).toLocaleString('fa-IR');
  }
}

export function formatJalaliShort(dateInput: string | number | Date): string {
  try {
    const d = new Date(dateInput);
    const options: Intl.DateTimeFormatOptions = {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(d);
  } catch {
    return '';
  }
}

/**
 * Iranian National ID Validator
 * Standard 10 digit algorithm: sum of first 9 digits multiplied by their position (10 down to 2) % 11
 */
export function validateIranianNationalId(code: string): boolean {
  const cleanCode = toEnglishDigits(code).trim().replace(/[-\s]/g, '');
  if (!/^\d{10}$/.test(cleanCode)) {
    return false;
  }

  // Check repeating digits like 0000000000, 1111111111, etc.
  if (/^(\d)\1{9}$/.test(cleanCode)) {
    return false;
  }

  const digits = cleanCode.split('').map(Number);
  const checkDigit = digits[9];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;
  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

/**
 * Mask National ID to ensure privacy: displays like ***-****-890
 */
export function maskNationalId(nationalId: string): string {
  const clean = toEnglishDigits(nationalId).replace(/[^0-9]/g, '');
  if (clean.length < 10) return '***-***-***';
  const last3 = clean.slice(-3);
  return `***-****-${last3}`;
}

/**
 * Generate a valid synthetic Iranian National ID for testing/demo purposes
 */
export function generateValidSyntheticNationalId(seed = 1): string {
  const prefix = String(100 + (seed % 800)).padStart(3, '0');
  const mid = String(100000 + (seed * 1337) % 800000).padStart(6, '0');
  const first9 = prefix + mid;
  const digits = first9.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  const rem = sum % 11;
  const check = rem < 2 ? rem : 11 - rem;
  return first9 + String(check);
}

/**
 * Computes SHA-256 hash formatted as hexadecimal string
 */
export async function computeSHA256(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // fallback pseudo hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Get current Jalali (Shamsi) Year
 */
export function getCurrentJalaliYear(): number {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' });
    const parts = formatter.format(new Date());
    const enDigits = toEnglishDigits(parts).replace(/\D/g, '');
    const yr = parseInt(enDigits, 10);
    return isNaN(yr) || yr < 1300 ? 1403 : yr;
  } catch {
    return 1403;
  }
}

export interface ParsedJalaliBirthDate {
  formattedBirthDate: string;
  birthYear: number;
  age: number;
  isValid: boolean;
}

/**
 * Parses a Shamsi birth date or year (e.g., "1370/05/12", "1370-5-12", "1370", "70/05/12")
 * and computes the person's age based on the current Jalali calendar year.
 */
export function parseJalaliBirthDate(input: string | number | undefined | null): ParsedJalaliBirthDate | null {
  if (input === undefined || input === null) return null;
  const rawStr = toEnglishDigits(String(input)).trim();
  if (!rawStr) return null;

  const currentYear = getCurrentJalaliYear();

  // Pattern 1: standard Full date YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const fullDateMatch = rawStr.match(/^(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (fullDateMatch) {
    let year = parseInt(fullDateMatch[1], 10);
    if (year < 100) {
      year = year >= 0 && year <= 30 ? 1400 + year : 1300 + year;
    }
    const month = parseInt(fullDateMatch[2], 10);
    const day = parseInt(fullDateMatch[3], 10);

    if (year >= 1300 && year <= currentYear + 1) {
      const padM = String(month).padStart(2, '0');
      const padD = String(day).padStart(2, '0');
      const age = Math.max(0, currentYear - year);
      return {
        formattedBirthDate: `${year}/${padM}/${padD}`,
        birthYear: year,
        age,
        isValid: true,
      };
    }
  }

  // Pattern 2: Year only YYYY (e.g. 1375)
  const yearOnlyMatch = rawStr.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const year = parseInt(yearOnlyMatch[1], 10);
    if (year >= 1300 && year <= currentYear + 1) {
      const age = Math.max(0, currentYear - year);
      return {
        formattedBirthDate: `${year}`,
        birthYear: year,
        age,
        isValid: true,
      };
    }
  }

  // Pattern 3: Embedded numbers in string (e.g. "متولد 1375" or "1370/02")
  const embeddedYear = rawStr.match(/\b(13\d{2}|14\d{2})\b/);
  if (embeddedYear) {
    const year = parseInt(embeddedYear[1], 10);
    if (year >= 1300 && year <= currentYear + 1) {
      const age = Math.max(0, currentYear - year);
      return {
        formattedBirthDate: `${year}`,
        birthYear: year,
        age,
        isValid: true,
      };
    }
  }

  return null;
}

/**
 * Converts a Jalali date string (e.g. "1375/04/12", "1375", "1375-4-12") to a comparable integer (YYYYMMDD).
 * For year-only inputs, isUpperBound determines whether it defaults to start-of-year (0101) or end-of-year (1229).
 */
export function normalizeJalaliDateToComparable(rawDate: string | undefined | null, isUpperBound = false): number | null {
  if (!rawDate) return null;
  const cleaned = toEnglishDigits(String(rawDate)).trim();
  if (!cleaned) return null;

  // Pattern 1: YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const fullMatch = cleaned.match(/^(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (fullMatch) {
    let year = parseInt(fullMatch[1], 10);
    if (year < 100) year = year >= 0 && year <= 30 ? 1400 + year : 1300 + year;
    const month = Math.min(12, Math.max(1, parseInt(fullMatch[2], 10)));
    const day = Math.min(31, Math.max(1, parseInt(fullMatch[3], 10)));
    return year * 10000 + month * 100 + day;
  }

  // Pattern 2: Year only YYYY (e.g. 1375)
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return isUpperBound ? year * 10000 + 1229 : year * 10000 + 101;
  }

  // Pattern 3: Year and Month YYYY/MM
  const ymMatch = cleaned.match(/^(\d{4})[./-](\d{1,2})$/);
  if (ymMatch) {
    const year = parseInt(ymMatch[1], 10);
    const month = Math.min(12, Math.max(1, parseInt(ymMatch[2], 10)));
    return isUpperBound ? year * 10000 + month * 100 + 29 : year * 10000 + month * 100 + 1;
  }

  return null;
}

/**
 * Checks whether a voter meets the age restriction configured for the election session.
 * Supports:
 * 1. "سن ملاک نیست" (hasAgeRestriction = false) -> All voters eligible
 * 2. Date of birth range (minBirthDate & maxBirthDate)
 * 3. Min/Max age fallback
 */
export function isVoterAgeEligible(
  birthDate: string | undefined | null,
  hasAgeRestriction?: boolean,
  minAgeOrOptions?: number | { minBirthDate?: string; maxBirthDate?: string; minAge?: number; maxAge?: number },
  maxAgeArg?: number,
  minBirthDateArg?: string,
  maxBirthDateArg?: string
): { isEligible: boolean; age?: number; reason?: string; formattedBirthDate?: string } {
  // If age restriction is turned off (سن ملاک نیست), everyone is eligible
  if (!hasAgeRestriction) {
    const parsed = parseJalaliBirthDate(birthDate);
    return {
      isEligible: true,
      age: parsed?.age,
      formattedBirthDate: parsed?.formattedBirthDate,
    };
  }

  const parsed = parseJalaliBirthDate(birthDate);
  if (!parsed || !parsed.isValid) {
    return {
      isEligible: false,
      reason: 'تاریخ تولد ثبت نشده یا نامعتبر است',
    };
  }

  let minBirthDate: string | undefined = minBirthDateArg;
  let maxBirthDate: string | undefined = maxBirthDateArg;
  let minAge: number | undefined = undefined;
  let maxAge: number | undefined = maxAgeArg;

  if (typeof minAgeOrOptions === 'object' && minAgeOrOptions !== null) {
    minBirthDate = minBirthDate || minAgeOrOptions.minBirthDate;
    maxBirthDate = maxBirthDate || minAgeOrOptions.maxBirthDate;
    minAge = minAgeOrOptions.minAge;
    maxAge = maxAge || minAgeOrOptions.maxAge;
  } else if (typeof minAgeOrOptions === 'number') {
    minAge = minAgeOrOptions;
  }

  const voterComp = normalizeJalaliDateToComparable(parsed.formattedBirthDate);

  // Check 1: Minimum Birth Date (کمترین تاریخ تولد مجاز - یعنی متولدین بعد از این تاریخ)
  if (minBirthDate && voterComp !== null) {
    const minComp = normalizeJalaliDateToComparable(minBirthDate, false);
    if (minComp !== null && voterComp < minComp) {
      return {
        isEligible: false,
        age: parsed.age,
        formattedBirthDate: parsed.formattedBirthDate,
        reason: `خارج از بازه سنی: تاریخ تولد (${toPersianDigits(parsed.formattedBirthDate)}) قبل از کمترین تاریخ مجاز (${toPersianDigits(minBirthDate)}) است`,
      };
    }
  }

  // Check 2: Maximum Birth Date (بیشترین تاریخ تولد مجاز - یعنی متولدین تا این تاریخ)
  if (maxBirthDate && voterComp !== null) {
    const maxComp = normalizeJalaliDateToComparable(maxBirthDate, true);
    if (maxComp !== null && voterComp > maxComp) {
      return {
        isEligible: false,
        age: parsed.age,
        formattedBirthDate: parsed.formattedBirthDate,
        reason: `خارج از بازه سنی: تاریخ تولد (${toPersianDigits(parsed.formattedBirthDate)}) بعد از بیشترین تاریخ مجاز (${toPersianDigits(maxBirthDate)}) است (فاقد حداقل سن قانونی)`,
      };
    }
  }

  // Fallback to minAge if date range not specified
  if (!maxBirthDate && minAge !== undefined && minAge > 0) {
    if (parsed.age < minAge) {
      return {
        isEligible: false,
        age: parsed.age,
        formattedBirthDate: parsed.formattedBirthDate,
        reason: `عدم احراز حداقل سن قانونی (سن: ${toPersianDigits(parsed.age)} سال - حداقل مجاز: ${toPersianDigits(minAge)} سال)`,
      };
    }
  }

  // Fallback to maxAge if date range not specified
  if (!minBirthDate && maxAge !== undefined && maxAge > 0) {
    if (parsed.age > maxAge) {
      return {
        isEligible: false,
        age: parsed.age,
        formattedBirthDate: parsed.formattedBirthDate,
        reason: `بیشتر از حداکثر سقف سنی (سن: ${toPersianDigits(parsed.age)} سال - سقف مجاز: ${toPersianDigits(maxAge)} سال)`,
      };
    }
  }

  return {
    isEligible: true,
    age: parsed.age,
    formattedBirthDate: parsed.formattedBirthDate,
  };
}

/**
 * Extract Persian Family Name (نام خانوادگی) from full name.
 * Handles common prefixes like سید، سیده، میر، حاج، حاجی، دکتر، مهندس، شیخ، کربلایی
 * and compound prefixes/affixes like پور، زاده، نیا، اصل، مقدم، وند، تبار
 */
export function extractPersianFamilyName(fullName: string): string {
  if (!fullName) return '';
  const clean = fullName
    .replace(/[ـ\u200c\u200d]/g, ' ')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';

  // Common honorific / prefix titles to ignore when identifying family name
  const honorifics = new Set([
    'سید', 'سیده', 'میر', 'حاج', 'حاجی', 'شیخ', 'کربلایی', 'مشهدی', 
    'دکتر', 'مهندس', 'آقای', 'خانم', 'استاد', 'شهید', 'سرکار'
  ]);

  let startIndex = 0;
  while (startIndex < parts.length - 1 && honorifics.has(parts[startIndex])) {
    startIndex++;
  }

  const remainingParts = parts.slice(startIndex);
  if (remainingParts.length <= 1) {
    return remainingParts[0] || parts[parts.length - 1];
  }

  if (remainingParts.length === 2) {
    return remainingParts[1];
  }

  // Compound family name suffixes/prefixes: e.g. "پور احمدی", "حسینی زاده", "مرادی نیا", "اصل تبریزی"
  const compoundMarkers = new Set([
    'پور', 'زاده', 'نیا', 'اصل', 'تبار', 'وند', 'مقدم', 'دوست', 'نژاد', 'راد', 'کیا', 'بخش'
  ]);

  const secondToLast = remainingParts[remainingParts.length - 2];
  if (compoundMarkers.has(secondToLast)) {
    return remainingParts.slice(-2).join(' ');
  }

  // Compound first names: e.g. "محمد رضا حسینی" -> family is "حسینی"
  const compoundFirstNames = new Set([
    'محمد', 'علی', 'امیر', 'غلام', 'رضا', 'عبد', 'حسین', 'مهدی', 'فاطمه', 'زهرا', 'امیرمحمد', 'احمدرضا'
  ]);
  if (compoundFirstNames.has(remainingParts[0]) && remainingParts.length >= 3) {
    return remainingParts.slice(2).join(' ');
  }

  return remainingParts.slice(1).join(' ');
}

/**
 * Compare two Persian strings alphabetically with proper Arabic/Persian letter normalization (ي -> ی, ك -> ک, etc.)
 */
export function comparePersianAlphabetical(a: string, b: string): number {
  const normA = (a || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا').trim();
  const normB = (b || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا').trim();
  return normA.localeCompare(normB, 'fa', { sensitivity: 'base' });
}

/**
 * Sort an array of voter-like objects alphabetically by Persian family name
 */
export function sortVotersByFamilyName<T extends { fullName: string; rowNumber?: number }>(voters: T[]): T[] {
  return [...voters].sort((a, b) => {
    const famA = extractPersianFamilyName(a.fullName);
    const famB = extractPersianFamilyName(b.fullName);
    const cmp = comparePersianAlphabetical(famA, famB);
    if (cmp !== 0) return cmp;
    const fullCmp = comparePersianAlphabetical(a.fullName, b.fullName);
    if (fullCmp !== 0) return fullCmp;
    return (a.rowNumber || 0) - (b.rowNumber || 0);
  });
}

