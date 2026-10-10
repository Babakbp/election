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
