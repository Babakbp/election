import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  getMachineHardwareId, 
  getLicenseStatus, 
  activateLicense, 
  getAppPasswordInfo, 
  setAppPassword, 
  generateLicenseKey,
  verifyCreatorMasterPassword,
  verifyCreatorOtp,
  CREATOR_TOTP_SECRET,
  CREATOR_TOTP_URI,
  CREATOR_NAME,
  CREATOR_EMAIL,
  getIssuedLicenses,
  saveIssuedLicenseRecord,
  deleteIssuedLicenseRecord,
  IssuedLicenseRecord
} from '../utils/license';
import { toPersianDigits, toEnglishDigits } from '../utils/persian';
import { 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Mail, 
  X, 
  QrCode, 
  Sparkles, 
  RefreshCw, 
  Cpu, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff,
  User,
  Phone,
  Hash,
  History,
  Trash2,
  Search,
  Share2,
  ExternalLink
} from 'lucide-react';

interface SecurityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockAppNow: () => void;
  onLicenseChanged?: () => void;
}

export const SecurityConfigModal: React.FC<SecurityConfigModalProps> = ({
  isOpen,
  onClose,
  onLockAppNow,
  onLicenseChanged,
}) => {
  // Machine & License State
  const [hardwareId, setHardwareId] = useState('');
  const [licenseData, setLicenseData] = useState(getLicenseStatus());
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseSuccess, setLicenseSuccess] = useState('');
  const [copiedHw, setCopiedHw] = useState(false);

  // App Password State
  const [passwordInfo, setPasswordInfo] = useState(getAppPasswordInfo());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // =========================================================================
  // SECRET CREATOR BACKDOOR (5 consecutive clicks on inconspicuous lock)
  // =========================================================================
  const [secretClickCount, setSecretClickCount] = useState(0);
  const secretClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Creator Modal State
  const [isCreatorPortalOpen, setIsCreatorPortalOpen] = useState(false);
  const [creatorStep, setCreatorStep] = useState<1 | 2 | 3>(1); // 1: Password, 2: 2FA QR/OTP, 3: License Generator & CRM
  const [creatorPasswordInput, setCreatorPasswordInput] = useState('');
  const [creatorPasswordError, setCreatorPasswordError] = useState('');
  const [showCreatorPassword, setShowCreatorPassword] = useState(false);
  const [creatorOtpInput, setCreatorOtpInput] = useState('');
  const [creatorOtpError, setCreatorOtpError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Creator License Generator & CRM State (Step 3)
  const [genTargetHwId, setGenTargetHwId] = useState('');
  const [genCustomerName, setGenCustomerName] = useState('');
  const [genNationalId, setGenNationalId] = useState('');
  const [genMobileNumber, setGenMobileNumber] = useState('');
  const [genNote, setGenNote] = useState('');
  const [genExpiryType, setGenExpiryType] = useState<'LIFETIME' | 'ONE_YEAR'>('LIFETIME');
  const [generatedKeyOutput, setGeneratedKeyOutput] = useState('');
  const [lastSavedRecord, setLastSavedRecord] = useState<IssuedLicenseRecord | null>(null);
  const [copiedGenKey, setCopiedGenKey] = useState(false);
  const [copiedCustomerText, setCopiedCustomerText] = useState(false);

  // CRM History List & Search
  const [issuedHistory, setIssuedHistory] = useState<IssuedLicenseRecord[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [activeNationalIdFilter, setActiveNationalIdFilter] = useState('');
  const [copiedRecordId, setCopiedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const id = getMachineHardwareId();
      setHardwareId(id);
      setLicenseData(getLicenseStatus());
      setPasswordInfo(getAppPasswordInfo());
      setGenTargetHwId(id);
      setLicenseError('');
      setLicenseSuccess('');
      setPasswordMsg('');
      setPasswordError('');
      setSecretClickCount(0);
      setIssuedHistory(getIssuedLicenses());
    }
  }, [isOpen]);

  // Generate authentic RFC 6238 QR Code when creator Step 2 is active or when creator portal opens
  useEffect(() => {
    if (isCreatorPortalOpen && creatorStep === 2) {
      QRCode.toDataURL(CREATOR_TOTP_URI, {
        width: 240,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate authentic QR code:', err));
    }
  }, [isCreatorPortalOpen, creatorStep]);

  // Grouped stats and filtered history by National ID or search term
  const nationalIdCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!Array.isArray(issuedHistory)) return map;
    for (const r of issuedHistory) {
      const nid = (r?.nationalId || '').trim();
      const key = nid || 'بدون کد ملی';
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [issuedHistory]);

  const uniqueNationalIdsCount = useMemo(() => {
    if (!Array.isArray(issuedHistory)) return 0;
    const validIds = issuedHistory
      .map(r => (r?.nationalId || '').trim())
      .filter(Boolean);
    const set = new Set(validIds);
    return set.size;
  }, [issuedHistory]);

  const filteredHistory = useMemo(() => {
    if (!Array.isArray(issuedHistory)) return [];
    let list = issuedHistory;
    if (activeNationalIdFilter) {
      list = list.filter(r => (r?.nationalId || '').trim() === activeNationalIdFilter.trim());
    }
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.trim().toLowerCase();
      list = list.filter(r => 
        (r?.nationalId || '').includes(q) ||
        (r?.mobileNumber || '').includes(q) ||
        (r?.customerName || '').toLowerCase().includes(q) ||
        (r?.hardwareId || '').toLowerCase().includes(q) ||
        (r?.licenseKey || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [issuedHistory, activeNationalIdFilter, historySearchTerm]);

  // Handle secret inconspicuous lock click (5 clicks in 3 seconds)
  const handleSecretLockClick = () => {
    if (secretClickTimeoutRef.current) {
      clearTimeout(secretClickTimeoutRef.current);
    }

    const nextCount = secretClickCount + 1;
    setSecretClickCount(nextCount);

    if (nextCount >= 5) {
      setSecretClickCount(0);
      setIsCreatorPortalOpen(true);
      setCreatorStep(1);
      setCreatorPasswordInput('');
      setCreatorPasswordError('');
      setIssuedHistory(getIssuedLicenses());
    } else {
      secretClickTimeoutRef.current = setTimeout(() => {
        setSecretClickCount(0);
      }, 3000);
    }
  };

  // Copy hardware serial
  const handleCopyHardwareId = () => {
    navigator.clipboard.writeText(hardwareId);
    setCopiedHw(true);
    setTimeout(() => setCopiedHw(false), 2000);
  };

  // Activate license key
  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseError('');
    setLicenseSuccess('');

    if (!licenseInput.trim()) {
      setLicenseError('لطفاً کلید لایسنس دریافتی از سازنده را وارد نمایید.');
      return;
    }

    const ok = await activateLicense(licenseInput.trim(), 'کاربر رسمی');
    if (ok) {
      const updated = getLicenseStatus();
      setLicenseData(updated);
      setLicenseSuccess('لایسنس رسمی سامانه با موفقیت فعال و دائمی شد.');
      setLicenseInput('');
      onLicenseChanged?.();
    } else {
      setLicenseError('کلید لایسنس وارد شده نامعتبر است یا با شماره سریال این سیستم همخوانی ندارد.');
    }
  };

  // Save or remove app login password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (!newPassword.trim()) {
      setAppPassword('');
      setPasswordInfo(getAppPasswordInfo());
      setPasswordMsg('رمز عبور برنامه با موفقیت حذف شد. ورود آزاد است.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPasswordError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }

    setAppPassword(newPassword.trim());
    setPasswordInfo(getAppPasswordInfo());
    setPasswordMsg('رمز عبور ورود به سامانه با موفقیت ذخیره شد.');
    setNewPassword('');
    setConfirmPassword('');
  };

  // =========================================================================
  // CREATOR STEP VERIFICATIONS
  // =========================================================================
  const handleCreatorStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCreatorMasterPassword(creatorPasswordInput)) {
      setCreatorStep(2);
      setCreatorPasswordError('');
      setCreatorOtpInput('');
      setCreatorOtpError('');
    } else {
      setCreatorPasswordError('رمز عبور اول سازنده نادرست است.');
    }
  };

  const handleCreatorStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorOtpError('');
    const cleanOtp = toEnglishDigits(creatorOtpInput).trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setCreatorOtpError('لطفاً کد ۶ رقمی تولیدشده توسط نرم‌افزار Google Authenticator را وارد فرمایید.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const isValid = await verifyCreatorOtp(cleanOtp);
      if (isValid) {
        setCreatorStep(3);
        setCreatorOtpError('');
        setIssuedHistory(getIssuedLicenses());
      } else {
        setCreatorOtpError('کد ۶ رقمی وارد شده نادرست است یا زمان آن منقضی شده است. لطفاً کد جدید نمایش‌داده‌شده در Google Authenticator را وارد فرمایید.');
      }
    } catch (err) {
      setCreatorOtpError('خطا در اعتبارسنجی کد امنیتی.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Issue & Save License Record in Creator Panel (Step 3)
  const handleGenerateLicenseKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTargetHwId.trim()) return;

    const customerTitle = genCustomerName.trim() || 'کاربر رسمی سامانه';
    const cleanNationalId = toEnglishDigits(genNationalId).trim();
    const cleanMobile = toEnglishDigits(genMobileNumber).trim();

    // 1. Generate cryptographic license key
    const generated = await generateLicenseKey(genTargetHwId.trim(), customerTitle, genExpiryType);
    setGeneratedKeyOutput(generated);

    // 2. Save record into persistent issued licenses CRM
    const savedRec = saveIssuedLicenseRecord({
      licenseKey: generated,
      customerName: customerTitle,
      nationalId: cleanNationalId,
      mobileNumber: cleanMobile,
      hardwareId: genTargetHwId.trim().toUpperCase(),
      expiryType: genExpiryType,
      note: genNote.trim() || undefined,
    });

    setLastSavedRecord(savedRec);
    setIssuedHistory(getIssuedLicenses());
  };

  const handleApplyGeneratedKeyDirectly = async () => {
    if (!generatedKeyOutput) return;
    const ok = await activateLicense(generatedKeyOutput, genCustomerName || 'کاربر رسمی');
    if (ok) {
      setLicenseData(getLicenseStatus());
      onLicenseChanged?.();
      alert('لایسنس تولیدی مستقیماً روی همین سیستم با موفقیت فعال شد!');
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('آیا از حذف این سابقه لایسنس از لیست اطمینان دارید؟')) {
      deleteIssuedLicenseRecord(id);
      setIssuedHistory(getIssuedLicenses());
      if (lastSavedRecord?.id === id) {
        setLastSavedRecord(null);
      }
    }
  };

  const handleCopyCustomerDeliveryText = (rec: IssuedLicenseRecord) => {
    const text = `با سلام و احترام\nمشخصات لایسنس رسمی نرم‌افزار شمارش آرا:\n\nنام خریدار: ${rec.customerName}\nکد ملی: ${rec.nationalId || '-'}\nشماره همراه: ${rec.mobileNumber || '-'}\nسریال سخت‌افزار: ${rec.hardwareId}\nنوع لایسنس: ${rec.expiryType === 'LIFETIME' ? 'دائمی و نامحدود' : 'یک‌ساله'}\nتاریخ صدور: ${rec.persianIssuedAt}\n\nکلید فعال‌سازی:\n${rec.licenseKey}\n\nطراح و پشتیبانی: ${CREATOR_NAME}\nایمیل: ${CREATOR_EMAIL}`;
    navigator.clipboard.writeText(text);
    setCopiedCustomerText(true);
    setTimeout(() => setCopiedCustomerText(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto no-print">
      
      {/* Main Security Modal Card - Compact Height with internal scrolling */}
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto" 
        dir="rtl"
      >
        
        {/* Header - Fixed at Top */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">
                  تنظیمات امنیتی و لایسنس سامانه
                </h3>
                
                {/* 
                  INCONSPICUOUS SUBTLE LOCK
                  Click 5 times consecutively to open Creator Portal (Babak Bahramipour)
                */}
                <div 
                  onClick={handleSecretLockClick}
                  title="وضعیت پایش امنیتی سامانه"
                  className="p-1 text-slate-600 hover:text-slate-400 cursor-pointer select-none transition opacity-25 hover:opacity-75 rounded"
                >
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                مدیریت رمز ورود، شماره سریال رایانه و وضعیت فعال‌سازی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
          
          {/* =====================================================================
              SECTION 1: MACHINE HARDWARE SERIAL & CREATOR CONTACT
          ====================================================================== */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>شماره سریال یکتای سخت‌افزار کامپیوتر (Machine Hardware ID)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                ثابت روی این دستگاه
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 font-mono text-emerald-400 text-sm font-bold tracking-wider text-center sm:text-right select-all">
                {hardwareId}
              </div>

              <button
                type="button"
                onClick={handleCopyHardwareId}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition"
                title="کپی در حافظه"
              >
                {copiedHw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHw ? 'کپی شد!' : 'کپی سریال'}</span>
              </button>
            </div>

            {/* Creator Contact Info */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div className="text-slate-300">
                <span className="text-slate-400">طراح و سازنده: </span>
                <strong className="text-white font-bold">{CREATOR_NAME}</strong>
                <span className="text-slate-400 mr-2">| ارسال سریال به ایمیل سازنده جهت دریافت لایسنس</span>
              </div>

              <a
                href={`mailto:${CREATOR_EMAIL}?subject=درخواست%20لایسنس%20سامانه%20شمارش%20آرا&body=با%20سلام%0Aشماره%20سریال%20سیستم%20من:%0A${hardwareId}`}
                className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg font-bold border border-indigo-500/30 flex items-center gap-1 self-start sm:self-auto transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{CREATOR_EMAIL}</span>
              </a>
            </div>
          </div>

          {/* =====================================================================
              SECTION 2: LICENSE ACTIVATION BOX
          ====================================================================== */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>وضعیت لایسنس و فعال‌سازی برنامه</span>
              </div>

              {licenseData.isLicensed ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>نسخه رسمی و دائمی فعال است</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>نسخه آزمایشی (دمو رایگان)</span>
                </span>
              )}
            </div>

            {licenseData.isLicensed ? (
              <div className="bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-lg text-[11px] space-y-1">
                <div className="text-emerald-200">
                  سامانه به صورت رسمی روی این رایانه فعال است و ثبت نامزدها و صدور تعرفه‌ها کاملاً نامحدود می‌باشد.
                </div>
                <div className="font-mono text-emerald-400">
                  کلید فعال: {licenseData.licenseKey}
                </div>
              </div>
            ) : (
              <form onSubmit={handleActivateLicense} className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="کلید لایسنس دریافتی را وارد فرمایید (مثال: BBP-XXXXX-YYYYY-...)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder:font-sans placeholder-slate-500 outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>فعال‌سازی لایسنس</span>
                  </button>
                </div>

                {licenseError && (
                  <p className="text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800 text-[11px]">
                    {licenseError}
                  </p>
                )}
                {licenseSuccess && (
                  <p className="text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800 text-[11px]">
                    {licenseSuccess}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* =====================================================================
              SECTION 3: APPLICATION LOGIN PASSWORD
          ====================================================================== */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>رمز عبور ورود به سامانه (مدیریت رمز مدیر)</span>
              </div>

              <div className="flex items-center gap-2">
                {passwordInfo.isPasswordProtected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    رمز فعال است
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    بدون رمز (ورود آزاد)
                  </span>
                )}

                {passwordInfo.isPasswordProtected && (
                  <button
                    type="button"
                    onClick={onLockAppNow}
                    className="px-2 py-1 bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    title="قفل فوری صفحه"
                  >
                    <Lock className="w-3 h-3 text-red-400" />
                    <span>قفل فوری</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    رمز عبور جدید (برای حذف رمز، خالی بگذارید):
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز ورود دلخواه مدیر..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 pr-8 text-white outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    تکرار رمز ورود جدید:
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار رمز ورود..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800 text-[11px]">
                  {passwordError}
                </p>
              )}
              {passwordMsg && (
                <p className="text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800 text-[11px]">
                  {passwordMsg}
                </p>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات رمز</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* =====================================================================
          CREATOR MASTER PORTAL (2-STEP AUTHENTICATION & CRM LICENSE GENERATOR)
          Requested by Creator: بابک بهرامی پور
      ====================================================================== */}
      {isCreatorPortalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          
          <div 
            className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95" 
            dir="rtl"
          >
            
            {/* Creator Header - Fixed */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-white">
                    پنل اختصاصی سازنده سامانه ({CREATOR_NAME})
                  </h4>
                  <p className="text-[11px] text-amber-400">
                    {creatorStep === 1 && 'مرحله ۱ از ۲: تأیید رمز عبور اول سازنده'}
                    {creatorStep === 2 && 'مرحله ۲ از ۲: احراز هویت دو مرحله‌ای (Google Authenticator 2FA)'}
                    {creatorStep === 3 && 'میز کار صدور لایسنس و ثبت سوابق مشتریان بر اساس کد ملی'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatorPortalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Creator Body Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              
              {/* STEP 1: Master Password */}
              {creatorStep === 1 && (
                <form onSubmit={handleCreatorStep1Submit} className="space-y-4 max-w-md mx-auto py-2">
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 leading-relaxed text-xs">
                    سلام آقای بهرامی پور؛ لطفاً جهت احراز هویت و دسترسی به میز کار سازنده، رمز عبور اول خود را وارد فرمایید.
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      رمز عبور اول سازنده:
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatorPassword ? 'text' : 'password'}
                        autoFocus
                        required
                        value={creatorPasswordInput}
                        onChange={(e) => setCreatorPasswordInput(e.target.value)}
                        placeholder="رمز عبور اول سازنده را وارد فرمایید..."
                        className="w-full bg-slate-950 border-2 border-amber-500/60 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pr-10 text-white font-mono outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatorPassword(!showCreatorPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        {showCreatorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {creatorPasswordError && (
                    <p className="text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800 text-xs">
                      {creatorPasswordError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatorPortalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/60 transition"
                    >
                      <span>تأیید و دریافت QR Code مرحله دوم</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Authentic 2FA QR Code & One-Time Password (OTP) */}
              {creatorStep === 2 && (
                <form onSubmit={handleCreatorStep2Submit} className="space-y-4 max-w-lg mx-auto py-1">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>کیوآرکد رسمی احراز هویت دو مرحله‌ای (Google Authenticator)</span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed max-w-md mx-auto">
                      این کیوآرکد را با دوربین گوشی یا نرم‌افزار <strong>Google Authenticator</strong> یا <strong>Microsoft Authenticator</strong> اسکن فرمایید تا حساب با نام <strong>BabakBahramipour</strong> اضافه شود:
                    </p>

                    {/* Real Scannable High-Resolution QR Code */}
                    <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-2xl border-4 border-amber-500 flex items-center justify-center">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Google Authenticator QR Code"
                          className="w-full h-full object-contain rounded-xl select-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 text-xs p-4">
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                          <span>در حال ایجاد کیوآرکد...</span>
                        </div>
                      )}
                    </div>

                    {/* Direct App Link */}
                    <div>
                      <a 
                        href={CREATOR_TOTP_URI} 
                        className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>کلیک جهت افزودن مستقیم به اپلیکیشن Authenticator در تلفن همراه</span>
                      </a>
                    </div>

                    {/* Manual Setup Key Box */}
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-right space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>کلید راه‌اندازی دستی (Setup Key):</span>
                        <span className="text-amber-400 font-mono">حساب: {CREATOR_EMAIL}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={CREATOR_TOTP_SECRET}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 font-mono text-xs text-amber-300 text-center select-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(CREATOR_TOTP_SECRET);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1 transition"
                          title="کپی کلید متنی"
                        >
                          {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSecret ? 'کپی شد' : 'کپی کلید'}</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500">
                        در صورت عدم استفاده از دوربین، کلید فوق را در بخش «Enter a setup key» نرم‌افزار وارد نمایید.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-center">
                      رمز یک‌بار مصرف ۶ رقمی تولیدشده در نرم‌افزار Google Authenticator:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      required
                      value={creatorOtpInput}
                      onChange={(e) => setCreatorOtpInput(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                      placeholder="کد ۶ رقمی..."
                      className="w-full max-w-xs mx-auto block bg-slate-950 border-2 border-amber-500/60 focus:border-amber-400 rounded-xl px-3.5 py-2 text-center text-2xl font-mono text-white tracking-[0.3em] outline-none"
                    />
                  </div>

                  {creatorOtpError && (
                    <p className="text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800 text-xs leading-relaxed text-center">
                      {creatorOtpError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(1)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      بازگشت به مرحله ۱
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingOtp}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/60 transition"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{isVerifyingOtp ? 'در حال اعتبارسنجی...' : 'تأیید نهایی و ورود به میز کار'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: CREATOR LICENSE GENERATOR & NATIONAL ID CRM HISTORY */}
              {creatorStep === 3 && (
                <div className="space-y-4">
                  
                  {/* Auth success badge */}
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl flex items-center justify-between text-emerald-300 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>احراز هویت دو مرحله‌ای تأیید شد. میز کار صدور لایسنس و بایگانی سوابق فعال است.</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400/80">سازنده: {CREATOR_NAME}</span>
                  </div>

                  {/* FORM: Issue New License */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>صدور لایسنس جدید و ثبت مشخصات خریدار</span>
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        کلید لایسنس با الگوریتم رمزنگاری SHA-256 متصل به سخت‌افزار تولید می‌شود
                      </span>
                    </div>

                    <form onSubmit={handleGenerateLicenseKey} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* Hardware ID */}
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-slate-300 font-medium text-[11px] flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                              <span>شماره سریال سخت‌افزار کامپیوتر مشتری (Machine Hardware ID):</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setGenTargetHwId(hardwareId)}
                              className="text-[10px] text-amber-400 hover:underline"
                            >
                              درج سریال همین کامپیوتر ({hardwareId})
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={genTargetHwId}
                            onChange={(e) => setGenTargetHwId(e.target.value)}
                            placeholder="IR-HW-XXXX-YYYY-ZZZZ-WWWW"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* National ID (کد ملی) */}
                        <div>
                          <label className="block text-slate-300 font-medium mb-1 text-[11px] flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5 text-indigo-400" />
                            <span>کد ملی خریدار / متقاضی (ثبت در سابقه):</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={genNationalId}
                            onChange={(e) => setGenNationalId(e.target.value.replace(/\D/g, ''))}
                            placeholder="۱۰ رقم کد ملی (مثال: ۰۰۱۲۳۴۵۶۷۸)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-amber-500"
                          />
                          {genNationalId && nationalIdCountMap[genNationalId.trim()] && (
                            <span className="text-[10px] text-amber-400 mt-0.5 block">
                              توجه: برای این کد ملی تاکنون {toPersianDigits(nationalIdCountMap[genNationalId.trim()])} لایسنس صادر شده است.
                            </span>
                          )}
                        </div>

                        {/* Mobile Phone (شماره همراه) */}
                        <div>
                          <label className="block text-slate-300 font-medium mb-1 text-[11px] flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>شماره همراه خریدار:</span>
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            value={genMobileNumber}
                            onChange={(e) => setGenMobileNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="شماره همراه (مثال: ۰۹۱۲۳۴۵۶۷۸۹)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Customer / Org Name */}
                        <div>
                          <label className="block text-slate-300 font-medium mb-1 text-[11px] flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>نام و نام خانوادگی خریدار یا سازمان:</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={genCustomerName}
                            onChange={(e) => setGenCustomerName(e.target.value)}
                            placeholder="مثلاً علی رضایی / شرکت / شهرداری..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* License Type */}
                        <div>
                          <label className="block text-slate-300 font-medium mb-1 text-[11px]">نوع لایسنس:</label>
                          <select
                            value={genExpiryType}
                            onChange={(e) => setGenExpiryType(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500"
                          >
                            <option value="LIFETIME">دائمی و نامحدود (Lifetime)</option>
                            <option value="ONE_YEAR">یک‌ساله (One Year)</option>
                          </select>
                        </div>

                        {/* Note (Optional) */}
                        <div className="sm:col-span-2">
                          <label className="block text-slate-300 font-medium mb-1 text-[11px]">یادداشت یا نام پروژه (اختیاری):</label>
                          <input
                            type="text"
                            value={genNote}
                            onChange={(e) => setGenNote(e.target.value)}
                            placeholder="مثلاً: انتخابات هیئت مدیره شرکت..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-amber-500"
                          />
                        </div>

                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/60 transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>تولید کلید لایسنس و ثبت قطعی در سابقه مشتری</span>
                      </button>
                    </form>

                    {/* Result Output for Generated Key */}
                    {generatedKeyOutput && (
                      <div className="bg-slate-900 p-3.5 rounded-xl border-2 border-emerald-500 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>لایسنس با موفقیت صادر و در سابقه کد ملی ذخیره شد:</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            کد ملی: <strong className="text-white font-mono">{genNationalId}</strong>
                          </span>
                        </div>

                        <div className="font-mono text-sm sm:text-base font-black text-emerald-400 select-all text-center tracking-wider bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          {generatedKeyOutput}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedKeyOutput);
                              setCopiedGenKey(true);
                              setTimeout(() => setCopiedGenKey(false), 2000);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700"
                          >
                            {copiedGenKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedGenKey ? 'کپی شد!' : 'کپی فقط کلید'}</span>
                          </button>

                          {lastSavedRecord && (
                            <button
                              type="button"
                              onClick={() => handleCopyCustomerDeliveryText(lastSavedRecord)}
                              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-500/30"
                              title="کپی متن کامل شامل نام، کد ملی، شماره موبایل و سریال برای پیامک یا پیام‌رسان"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>{copiedCustomerText ? 'متن مشخصات کپی شد!' : 'کپی متن مشخصات تحویل به مشتری'}</span>
                            </button>
                          )}

                          {genTargetHwId.trim() === hardwareId && (
                            <button
                              type="button"
                              onClick={handleApplyGeneratedKeyDirectly}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                            >
                              فعال‌سازی آنی روی همین کامپیوتر
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* =================================================================
                      CRM HISTORY & AUDIT LOG PER NATIONAL ID
                      User Request 2:
                      هر لایسنس که ایجاد می کنم بتوانم در همان پنل کد ملی و شماره همراهش را ثبت کنم
                      و هر کد ملی که ثبت کردم سابقه بماند و معلوم باشد برای هر کد ملی تا کنون چند لایسنس و چه لایسنس هایی صادر کردم.
                  ================================================================== */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    
                    {/* CRM Header & Stats */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                          <History className="w-4 h-4 text-amber-400" />
                          <span>بایگانی سوابق لایسنس‌های صادر شده بر اساس کد ملی</span>
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          گزارش کامل تعداد و جزئیات لایسنس‌های صادر شده برای هر کد ملی و شماره همراه
                        </p>
                      </div>

                      {/* Summary Badges */}
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold">
                          کل لایسنس‌ها: {toPersianDigits(issuedHistory.length)} فقره
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-bold">
                          تعداد کدهای ملی: {toPersianDigits(uniqueNationalIdsCount)} نفر
                        </span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                          placeholder="جستجو با کد ملی، شماره همراه، نام مشتری یا کلید لایسنس..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-white text-xs outline-none focus:border-amber-500 placeholder-slate-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                      </div>

                      {activeNationalIdFilter && (
                        <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                          <span>فیلتر کد ملی: {activeNationalIdFilter}</span>
                          <button
                            type="button"
                            onClick={() => setActiveNationalIdFilter('')}
                            className="p-0.5 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Records List */}
                    {filteredHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/80">
                        {issuedHistory.length === 0 
                          ? 'هنوز لایسنسی در سامانه ثبت نشده است. با پر کردن فرم بالا لایسنس صادر فرمایید.' 
                          : 'هیچ سابقه‌ای مطابق با عبارت جستجو یافت نشد.'}
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {filteredHistory.map((rec) => {
                          const cleanNid = (rec?.nationalId || '').trim();
                          const totalForThisNid = cleanNid ? (nationalIdCountMap[cleanNid] || 1) : 1;
                          const isCopied = copiedRecordId === rec.id;

                          return (
                            <div 
                              key={rec.id}
                              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 space-y-2 transition"
                            >
                              {/* Top Bar of Record */}
                              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                <div className="flex items-center gap-2">
                                  <strong className="text-white font-bold">{rec?.customerName || 'کاربر رسمی'}</strong>
                                  
                                  {/* National ID Badge with Click-to-Filter & Total Count */}
                                  <button
                                    type="button"
                                    onClick={() => cleanNid && setActiveNationalIdFilter(cleanNid)}
                                    title="کلیک برای فیلتر و مشاهده تمام لایسنس‌های این کد ملی"
                                    className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-md font-mono text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <Hash className="w-2.5 h-2.5" />
                                    <span>کد ملی: {cleanNid || 'نامشخص'}</span>
                                    <span className="bg-indigo-600/60 text-white px-1 rounded-sm text-[9px] mr-1">
                                      {toPersianDigits(totalForThisNid)} فقره
                                    </span>
                                  </button>

                                  {/* Mobile Phone Badge */}
                                  {rec.mobileNumber && (
                                    <a
                                      href={`tel:${rec.mobileNumber}`}
                                      className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-mono text-[10px] flex items-center gap-1"
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>{rec.mobileNumber}</span>
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">
                                    {rec.expiryType === 'LIFETIME' ? 'دائمی' : 'یک‌ساله'}
                                  </span>
                                  <span>{rec.persianIssuedAt}</span>
                                </div>
                              </div>

                              {/* License Key & Hardware Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-xs">
                                <div className="space-y-0.5">
                                  <div className="font-mono text-emerald-400 font-bold select-all">
                                    {rec.licenseKey}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400 select-all">
                                    سریال: {rec.hardwareId}
                                  </div>
                                  {rec.note && (
                                    <div className="text-[10px] text-amber-300/80">
                                      یادداشت: {rec.note}
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(rec.licenseKey);
                                      setCopiedRecordId(rec.id);
                                      setTimeout(() => setCopiedRecordId(null), 2000);
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                                    title="کپی کلید لایسنس"
                                  >
                                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{isCopied ? 'کپی شد' : 'کپی کلید'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyCustomerDeliveryText(rec)}
                                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1"
                                    title="کپی متن کامل مشخصات تحویل به مشتری"
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>متن تحویل</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRecord(rec.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition"
                                    title="حذف این سابقه"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
