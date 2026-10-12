/**
 * License & Security Management Utility
 * Creator: بابک بهرامی پور (babakbahramipour@gmail.com)
 */

import { computeSHA256, formatJalali } from './persian';

export const CREATOR_NAME = 'بابک بهرامی پور';
export const CREATOR_EMAIL = 'babakbahramipour@gmail.com';
export const CREATOR_MASTER_PASSWORD = '@Bbp131564970'; // Master Password for Creator Babak Bahramipour

const STORAGE_KEY_HW_ID = 'elections_machine_hardware_id_v1';
const STORAGE_KEY_LICENSE = 'elections_app_license_data_v1';
const STORAGE_KEY_APP_PASSWORD = 'elections_admin_app_password_v1';
const STORAGE_KEY_IS_LOCKED = 'elections_app_is_locked_v1';
const STORAGE_KEY_ISSUED_LICENSES = 'elections_creator_issued_licenses_v1';
const LICENSE_SECRET_SALT = 'BBP_OFFICIAL_ELECTION_2026_MASTER_SECRET_SALT_IRAN';

export interface LicenseData {
  isLicensed: boolean;
  licenseKey?: string;
  customerName?: string;
  hardwareId: string;
  activatedAt?: string;
  expiryType?: 'LIFETIME' | 'ONE_YEAR';
}

export interface IssuedLicenseRecord {
  id: string;
  licenseKey: string;
  customerName: string;
  nationalId: string; // کد ملی خریدار
  mobileNumber: string; // شماره همراه
  hardwareId: string; // شناسه سخت‌افزاری کامپیوتر
  expiryType: 'LIFETIME' | 'ONE_YEAR';
  issuedAt: string;
  persianIssuedAt: string;
  note?: string;
}

export function getIssuedLicenses(): IssuedLicenseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ISSUED_LICENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: String(item?.id || `LIC-${Date.now()}`),
          licenseKey: String(item?.licenseKey || ''),
          customerName: String(item?.customerName || 'کاربر رسمی'),
          nationalId: String(item?.nationalId || ''),
          mobileNumber: String(item?.mobileNumber || ''),
          hardwareId: String(item?.hardwareId || ''),
          expiryType: item?.expiryType === 'ONE_YEAR' ? 'ONE_YEAR' : 'LIFETIME',
          issuedAt: String(item?.issuedAt || new Date().toISOString()),
          persianIssuedAt: String(item?.persianIssuedAt || ''),
          note: item?.note ? String(item.note) : undefined,
        }));
      }
    }
  } catch (e) {
    console.error('Error parsing issued licenses:', e);
  }
  return [];
}

export function saveIssuedLicenseRecord(
  record: Omit<IssuedLicenseRecord, 'id' | 'issuedAt' | 'persianIssuedAt'>
): IssuedLicenseRecord {
  const current = getIssuedLicenses();
  const now = new Date();
  const newRec: IssuedLicenseRecord = {
    id: `LIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    licenseKey: String(record.licenseKey || ''),
    customerName: String(record.customerName || 'کاربر رسمی'),
    nationalId: String(record.nationalId || ''),
    mobileNumber: String(record.mobileNumber || ''),
    hardwareId: String(record.hardwareId || ''),
    expiryType: record.expiryType === 'ONE_YEAR' ? 'ONE_YEAR' : 'LIFETIME',
    issuedAt: now.toISOString(),
    persianIssuedAt: formatJalali(now, true),
    note: record.note ? String(record.note) : undefined,
  };
  const updated = [newRec, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_ISSUED_LICENSES, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  return newRec;
}

export function deleteIssuedLicenseRecord(id: string): void {
  const current = getIssuedLicenses();
  const updated = current.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_ISSUED_LICENSES, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}

export function getLicensesForNationalId(nationalId: string): IssuedLicenseRecord[] {
  const clean = (nationalId || '').trim();
  if (!clean) return [];
  const all = getIssuedLicenses();
  return all.filter((r) => (r.nationalId || '').trim() === clean);
}

/**
 * Returns a persistent machine hardware identification serial
 * Formatted as: IR-HW-XXXX-YYYY-ZZZZ-WWWW
 */
export function getMachineHardwareId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY_HW_ID);
    if (existing && existing.startsWith('IR-HW-')) {
      return existing;
    }
  } catch (e) {
    // ignore
  }

  // Derive stable device signature
  let seed = 'BROWSER_INIT';
  if (typeof window !== 'undefined') {
    const nav = window.navigator;
    const scr = window.screen;
    seed = `${nav.userAgent || ''}-${scr.width}x${scr.height}-${scr.colorDepth}-${nav.language || ''}-${nav.hardwareConcurrency || 4}-${Date.now()}`;
  }

  // Generate deterministic-looking 4-part hex code
  let hashVal = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hashVal ^= seed.charCodeAt(i);
    hashVal = (hashVal * 0x01000193) >>> 0;
  }

  const p1 = (hashVal & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const p2 = ((hashVal >>> 16) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const randNum = Math.floor(Math.random() * 0xffffffff);
  const p3 = (randNum & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const p4 = ((randNum >>> 16) & 0xffff).toString(16).toUpperCase().padStart(4, '0');

  const generatedId = `IR-HW-${p1}-${p2}-${p3}-${p4}`;
  try {
    localStorage.setItem(STORAGE_KEY_HW_ID, generatedId);
  } catch (e) {
    // ignore
  }

  return generatedId;
}

/**
 * Generates an official cryptographic license key for a given customer hardware ID
 * Used by Creator Babak Bahramipour in Creator Portal
 */
export async function generateLicenseKey(
  hardwareId: string, 
  customerName: string = 'کاربر رسمی سامانه',
  expiryType: 'LIFETIME' | 'ONE_YEAR' = 'LIFETIME'
): Promise<string> {
  const cleanHw = hardwareId.trim().toUpperCase();
  const rawPayload = `${cleanHw}:${expiryType}:${LICENSE_SECRET_SALT}`;
  const sha = await computeSHA256(rawPayload);

  // Split sha into 4 blocks of 5 chars
  const b1 = sha.slice(0, 5).toUpperCase();
  const b2 = sha.slice(5, 10).toUpperCase();
  const b3 = sha.slice(10, 15).toUpperCase();
  const b4 = sha.slice(15, 20).toUpperCase();

  return `BBP-${b1}-${b2}-${b3}-${b4}`;
}

/**
 * Verifies if a license key is valid for this machine
 */
export async function verifyLicenseKey(
  inputKey: string, 
  targetHardwareId: string
): Promise<{ isValid: boolean; expiryType?: 'LIFETIME' | 'ONE_YEAR' }> {
  const cleanKey = inputKey.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanKey.startsWith('BBP-') || cleanKey.length < 20) {
    return { isValid: false };
  }

  // Check LIFETIME
  const lifetimeExpected = await generateLicenseKey(targetHardwareId, '', 'LIFETIME');
  if (cleanKey === lifetimeExpected) {
    return { isValid: true, expiryType: 'LIFETIME' };
  }

  // Check ONE_YEAR
  const oneYearExpected = await generateLicenseKey(targetHardwareId, '', 'ONE_YEAR');
  if (cleanKey === oneYearExpected) {
    return { isValid: true, expiryType: 'ONE_YEAR' };
  }

  return { isValid: false };
}

/**
 * Gets current app license status
 */
export function getLicenseStatus(): LicenseData {
  const hwId = getMachineHardwareId();
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LICENSE);
    if (saved) {
      const data = JSON.parse(saved);
      if (data && data.isLicensed && data.hardwareId === hwId) {
        return data;
      }
    }
  } catch (e) {
    // ignore
  }

  return {
    isLicensed: false,
    hardwareId: hwId,
    customerName: 'نسخه آزمایشی (دمو رایگان)',
  };
}

/**
 * Saves and activates a license key
 */
export async function activateLicense(licenseKey: string, customerName: string = 'کاربر رسمی'): Promise<boolean> {
  const hwId = getMachineHardwareId();
  const check = await verifyLicenseKey(licenseKey, hwId);
  if (!check.isValid) {
    return false;
  }

  const licData: LicenseData = {
    isLicensed: true,
    licenseKey: licenseKey.trim().toUpperCase(),
    customerName: customerName.trim() || 'کاربر رسمی',
    hardwareId: hwId,
    activatedAt: new Date().toISOString(),
    expiryType: check.expiryType || 'LIFETIME',
  };

  try {
    localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licData));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Revokes current license (returns to demo)
 */
export function revokeLicense(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LICENSE);
  } catch (e) {
    // ignore
  }
}

// =========================================================================
// APPLICATION LOGIN PASSWORD MANAGEMENT
// =========================================================================

export function getAppPasswordInfo(): { isPasswordProtected: boolean; isLocked: boolean } {
  let isPasswordProtected = false;
  let isLocked = false;
  try {
    const savedPass = localStorage.getItem(STORAGE_KEY_APP_PASSWORD);
    isPasswordProtected = Boolean(savedPass);
    const lockedVal = localStorage.getItem(STORAGE_KEY_IS_LOCKED);
    // If password is set, default to locked if not explicitly unlocked in session
    isLocked = isPasswordProtected && (lockedVal === 'true' || lockedVal === null);
  } catch (e) {
    // ignore
  }
  return { isPasswordProtected, isLocked };
}

export function setAppPassword(newPassword: string): void {
  try {
    if (!newPassword.trim()) {
      localStorage.removeItem(STORAGE_KEY_APP_PASSWORD);
      localStorage.setItem(STORAGE_KEY_IS_LOCKED, 'false');
    } else {
      localStorage.setItem(STORAGE_KEY_APP_PASSWORD, newPassword.trim());
      localStorage.setItem(STORAGE_KEY_IS_LOCKED, 'false');
    }
  } catch (e) {
    // ignore
  }
}

export function verifyAppPassword(enteredPassword: string): boolean {
  try {
    const savedPass = localStorage.getItem(STORAGE_KEY_APP_PASSWORD);
    if (!savedPass) return true; // no password required
    return savedPass === enteredPassword.trim();
  } catch (e) {
    return false;
  }
}

export function lockApp(): void {
  try {
    localStorage.setItem(STORAGE_KEY_IS_LOCKED, 'true');
  } catch (e) {
    // ignore
  }
}

export function unlockApp(): void {
  try {
    localStorage.setItem(STORAGE_KEY_IS_LOCKED, 'false');
  } catch (e) {
    // ignore
  }
}

// =========================================================================
// CREATOR 2-STEP AUTHENTICATION (Babak Bahramipour Master Gateway)
// =========================================================================

/**
 * Step 1: Verify Creator Master Password
 */
export function verifyCreatorMasterPassword(pass: string): boolean {
  return pass.trim() === CREATOR_MASTER_PASSWORD;
}

/**
 * Standard RFC 4648 Base32 Secret Key for Babak Bahramipour (Creator)
 * Compatible with Google Authenticator, Microsoft Authenticator, 2FAS, Aegis
 */
export const CREATOR_TOTP_SECRET = 'KRUGS4ZANFZSAYJAONSWG4TFOR2A';
export const CREATOR_TOTP_URI = `otpauth://totp/Elections:babakbahramipour@gmail.com?secret=${CREATOR_TOTP_SECRET}&issuer=BabakBahramipour&algorithm=SHA1&digits=6&period=30`;

function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Standard RFC 6238 TOTP Generation (HMAC-SHA1)
 */
export async function generateRFC6238TOTP(
  secretBase32: string = CREATOR_TOTP_SECRET,
  timeOffsetSteps: number = 0,
  timeStepSeconds: number = 30
): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const timeSlice = Math.floor(epoch / timeStepSeconds) + timeOffsetSteps;

  const counterBuffer = new ArrayBuffer(8);
  const dataView = new DataView(counterBuffer);
  dataView.setUint32(0, 0, false);
  dataView.setUint32(4, timeSlice, false);

  const keyBytes = base32ToBytes(secretBase32);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const sigBytes = new Uint8Array(signature);

  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verifies entered 6-digit OTP against standard Google Authenticator RFC 6238
 * Allows current window, previous (-30s) and next (+30s) window for clock skew tolerance
 */
export async function verifyCreatorOtp(enteredOtp: string): Promise<boolean> {
  const clean = enteredOtp.trim().replace(/\s+/g, '');
  if (!clean || clean.length !== 6) return false;

  try {
    const current = await generateRFC6238TOTP(CREATOR_TOTP_SECRET, 0);
    if (clean === current) return true;

    const prev = await generateRFC6238TOTP(CREATOR_TOTP_SECRET, -1);
    if (clean === prev) return true;

    const next = await generateRFC6238TOTP(CREATOR_TOTP_SECRET, 1);
    if (clean === next) return true;
  } catch (err) {
    console.error('Error verifying TOTP:', err);
  }

  return false;
}
