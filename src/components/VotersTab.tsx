import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Voter, Operator } from '../types/election';
import { toPersianDigits, toEnglishDigits, maskNationalId, formatJalali } from '../utils/persian';
import { exportVotersTemplateToExcel, exportVotersListToExcel } from '../utils/export';
import { audioFeedback } from '../utils/audioFeedback';
import { 
  Users, 
  Upload, 
  Download, 
  Printer, 
  Search, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Filter,
  FileSpreadsheet,
  Barcode,
  ScanLine,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Volume2,
  RefreshCw,
  X,
  Fingerprint
} from 'lucide-react';

interface VotersTabProps {
  voters: Voter[];
  isLocked: boolean;
  currentOperator: Operator;
  onUpdateVoters: (newVoters: Voter[], reason: string) => void;
  onToggleVoterStatus: (voterId: string) => void;
}

export const VotersTab: React.FC<VotersTabProps> = ({
  voters,
  isLocked,
  onUpdateVoters,
  onToggleVoterStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'ALL' | 'VOTED' | 'NOT_VOTED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Barcode Scanner Station state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'SUCCESS' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
    voter?: Voter;
    message: string;
    timestamp?: string;
  } | null>(null);

  // Quick Register Modal for Unlisted Scanned Voter
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [quickNId, setQuickNId] = useState('');
  const [quickFullName, setQuickFullName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickError, setQuickError] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quickNameInputRef = useRef<HTMLInputElement>(null);

  // Auto focus barcode input
  useEffect(() => {
    if (!isAddModalOpen && !isQuickRegisterOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [isAddModalOpen, isQuickRegisterOpen]);

  // Focus quick name input when quick modal opens
  useEffect(() => {
    if (isQuickRegisterOpen) {
      setTimeout(() => {
        quickNameInputRef.current?.focus();
      }, 100);
    }
  }, [isQuickRegisterOpen]);

  // Core Barcode Scanning Processor
  const handleProcessBarcodeScan = (scannedValue: string) => {
    const raw = toEnglishDigits(scannedValue).trim();
    if (!raw) return;

    if (isLocked) {
      setScanResult({
        type: 'ERROR',
        message: 'جلسه انتخابات قفل شده است؛ امکان ثبت حضور یا صدور تعرفه وجود ندارد.',
      });
      return;
    }

    // Extract 10-digit national ID if barcode contains extra prefix or numbers
    const match = raw.match(/\d{10}/);
    const cleanNId = match ? match[0] : raw.replace(/\D/g, '');

    if (cleanNId.length !== 10) {
      audioFeedback.playNotFoundWarning();
      setScanResult({
        type: 'ERROR',
        message: `فرمت بارکد کارت ملی نامعتبر است (کد ملی باید ۱۰ رقم باشد، دریافت شد: «${raw}»).`,
        timestamp: formatJalali(new Date(), true),
      });
      return;
    }

    // Find in voter list (imported from Excel or registered manually)
    const found = voters.find(v => {
      const vNId = toEnglishDigits(v.nationalId || '').trim();
      return vNId === cleanNId;
    });

    if (found) {
      if (found.hasVoted) {
        // DUPLICATE VOTING ALERT!
        audioFeedback.playDuplicateWarning();
        setScanResult({
          type: 'DUPLICATE',
          voter: found,
          message: `⚠️ هشدار تقلب! رأی‌دهنده «${found.fullName}» قبلاً در ساعت ${found.votedAt || 'نامشخص'} تعرفه دریافت نموده و رأی داده است! صدور مجدد تعرفه غیرمجاز است.`,
          timestamp: formatJalali(new Date(), true),
        });
      } else {
        // SUCCESS CHECK-IN & ISSUE BALLOT
        audioFeedback.playScanSuccess();
        onToggleVoterStatus(found.id);
        const timeNow = formatJalali(new Date(), true);
        setScanResult({
          type: 'SUCCESS',
          voter: { ...found, hasVoted: true, votedAt: timeNow },
          message: `✅ احراز هویت موفق: «${found.fullName}» (ردیف ${toPersianDigits(found.rowNumber)}) — حضور ثبت و تعرفه رأی صادر گردید.`,
          timestamp: timeNow,
        });
      }
      setBarcodeInput('');
    } else {
      // NOT FOUND IN LIST -> Open Quick Registration Modal
      audioFeedback.playNotFoundWarning();
      setQuickNId(cleanNId);
      setQuickFullName('');
      setQuickPhone('');
      setQuickError('');
      setIsQuickRegisterOpen(true);
      setScanResult({
        type: 'NOT_FOUND',
        message: `کد ملی ${toPersianDigits(cleanNId)} در فهرست واجدین شرایط (اکسل) ثبت نشده است. لطفاً نام رأی‌دهنده را وارد کنید تا فوراً ثبت و تعرفه صادر گردد.`,
        timestamp: formatJalali(new Date(), true),
      });
      setBarcodeInput('');
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessBarcodeScan(barcodeInput);
    }
  };

  const handleSaveQuickVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFullName.trim()) {
      setQuickError('نام و نام خانوادگی رأی‌دهنده الزامی است.');
      return;
    }

    const timeNow = formatJalali(new Date(), true);
    const newVoter: Voter = {
      id: `VOT-SCAN-${Date.now()}`,
      rowNumber: voters.length + 1,
      fullName: quickFullName.trim(),
      nationalId: quickNId,
      nationalIdMasked: maskNationalId(quickNId),
      phoneNumber: toEnglishDigits(quickPhone).trim() || '—',
      hasVoted: true,
      votedAt: timeNow,
    };

    onUpdateVoters(
      [...voters, newVoter],
      `ثبت حضور و صدور تعرفه با بارکدخوان کارت ملی: ${newVoter.fullName} (${newVoter.nationalIdMasked})`
    );

    audioFeedback.playScanSuccess();
    setScanResult({
      type: 'SUCCESS',
      voter: newVoter,
      message: `✅ ثبت دستی و صدور موفق تعرفه: «${newVoter.fullName}» با کد ملی ${toPersianDigits(newVoter.nationalIdMasked)} به فهرست اضافه و تعرفه تحویل شد.`,
      timestamp: timeNow,
    });

    setIsQuickRegisterOpen(false);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  };

  // Stats
  const totalCount = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const remainingCount = totalCount - votedCount;
  const turnoutPercent = totalCount > 0 ? ((votedCount / totalCount) * 100).toFixed(1) : '0';

  // Filtered
  const filteredVoters = voters.filter((v) => {
    if (filterState === 'VOTED' && !v.hasVoted) return false;
    if (filterState === 'NOT_VOTED' && v.hasVoted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.fullName.toLowerCase().includes(q);
      const matchNId = v.nationalId.includes(toEnglishDigits(q)) || v.nationalIdMasked.includes(q);
      const matchPhone = v.phoneNumber.includes(toEnglishDigits(q)) || v.phoneNumber.includes(q);
      const matchRow = String(v.rowNumber) === toEnglishDigits(q);
      return matchName || matchNId || matchPhone || matchRow;
    }
    return true;
  });

  // Download Sample .xlsx
  const handleDownloadSampleXLSX = () => {
    exportVotersTemplateToExcel();
  };

  // Export current voters as .xlsx
  const handleExportCurrentVoters = () => {
    exportVotersListToExcel(voters, '۱');
  };

  // Import .xlsx or .xls or .csv File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rows || rows.length <= 1) {
          alert('فایل اکسل (.xlsx) انتخابی حاوی اطلاعات کافی نیست.');
          return;
        }

        const newVoterList: Voter[] = [];
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row.length > 0) {
            let fullName = '';
            let rawNId = '';
            let phone = '';

            // Detect whether column 0 is row number or name
            if (typeof row[0] === 'number' || (/^\d+$/.test(String(row[0]).trim()) && String(row[0]).trim().length < 6)) {
              fullName = String(row[1] || '').trim();
              rawNId = toEnglishDigits(String(row[2] || '')).trim();
              phone = toEnglishDigits(String(row[3] || '')).trim();
            } else {
              fullName = String(row[0] || '').trim();
              rawNId = toEnglishDigits(String(row[1] || '')).trim();
              phone = toEnglishDigits(String(row[2] || '')).trim();
            }

            if (fullName) {
              newVoterList.push({
                id: `VOT-${Date.now()}-${newVoterList.length + 1}`,
                rowNumber: newVoterList.length + 1,
                fullName,
                nationalId: rawNId || '1000000000',
                nationalIdMasked: rawNId ? maskNationalId(rawNId) : '***-****-***',
                phoneNumber: phone || '—',
                hasVoted: false,
              });
            }
          }
        }

        if (newVoterList.length > 0) {
          onUpdateVoters(newVoterList, `بارگذاری ${toPersianDigits(newVoterList.length)} نفر واجد شرایط از فایل اکسل .xlsx`);
          alert(`تعداد ${toPersianDigits(newVoterList.length)} نفر رأی‌دهنده با موفقیت از فایل .xlsx وارد شدند.`);
        } else {
          alert('هیچ سطری در فایل اکسل شناسایی نشد.');
        }
      } catch (err) {
        alert('خطا در پردازش فایل اکسل (.xlsx). لطفاً از قالب استاندارد استفاده فرمایید.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Add Single Voter
  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError('نام و نام خانوادگی الزامی است.');
      return;
    }
    const cleanNId = toEnglishDigits(newNationalId).trim();
    if (cleanNId && cleanNId.length !== 10) {
      setAddError('کد ملی باید ۱۰ رقم باشد.');
      return;
    }

    const newV: Voter = {
      id: `VOT-${Date.now()}`,
      rowNumber: voters.length + 1,
      fullName: newName.trim(),
      nationalId: cleanNId || '1000000000',
      nationalIdMasked: cleanNId ? maskNationalId(cleanNId) : '***-***-***',
      phoneNumber: toEnglishDigits(newPhone).trim() || '—',
      hasVoted: false,
    };

    onUpdateVoters([...voters, newV], `ثبت دستی رأی‌دهنده جدید: ${newV.fullName}`);
    setNewName('');
    setNewNationalId('');
    setNewPhone('');
    setIsAddModalOpen(false);
    setAddError('');
  };

  // Print Compact Voter Sheet
  const handlePrintCompactSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats (Hidden in print) */}
      <div className="no-print bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>فهرست واجدین شرایط و احراز هویت رأی‌دهندگان</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ورودی فایل اکسل، جستجوی سریع، ثبت حضور و چاپ ریز و کم‌جای اسامی برای منشی شعبه
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Sample .xlsx */}
          <button
            onClick={handleDownloadSampleXLSX}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition"
            title="دانلود فایل نمونه اکسل جهت آماده‌سازی لیست رأی‌دهندگان (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>قالب نمونه (.xlsx)</span>
          </button>

          {/* Import .xlsx */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
          >
            <Upload className="w-4 h-4" />
            <span>بارگذاری اکسل (.xlsx)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Export Voters to .xlsx */}
          {voters.length > 0 && (
            <button
              onClick={handleExportCurrentVoters}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition"
              title="خروجی فایل اکسل از وضعیت فعلی واجدین شرایط و آرا"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              <span>خروجی (.xlsx)</span>
            </button>
          )}

          {/* Add single voter */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>افزودن فرد جدید</span>
          </button>

          {/* Compact Print */}
          <button
            onClick={handlePrintCompactSheet}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ اسامی (ریز و کم‌جا)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          BARCODE SCANNER STATION FOR NATIONAL ID CARDS (Requested by User)
      ========================================================================== */}
      <div className="no-print bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl animate-pulse">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-base text-white tracking-tight">
                  ایستگاه اسکن بارکدخوان کارت ملی (احراز هویت و صدور فوری تعرفه)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>دستگاه متصل و آماده اسکن</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                دستگاه بارکدخوان را روی بارکد کارت ملی گرفته یا ۱۰ رقم کد ملی را وارد و دکمه Enter را بزنید
              </p>
            </div>
          </div>

          {/* Simulator shortcuts for easy testing without hardware scanner */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <span className="text-[11px] text-slate-400 hidden lg:inline">شبیه‌ساز اسکن کارت:</span>
            <button
              type="button"
              onClick={() => {
                const firstUnvoted = voters.find(v => !v.hasVoted);
                if (firstUnvoted) handleProcessBarcodeScan(firstUnvoted.nationalId);
                else if (voters[0]) handleProcessBarcodeScan(voters[0].nationalId);
              }}
              className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-xl text-[11px] border border-emerald-800/60 font-semibold transition flex items-center gap-1"
              title="شبیه‌سازی اسکن فرد واجد شرایط ثبت‌شده از اکسل"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>تست فرد در لیست</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const votedPerson = voters.find(v => v.hasVoted);
                if (votedPerson) handleProcessBarcodeScan(votedPerson.nationalId);
                else alert('هنوز فردی در سامانه رأی نداده است. ابتدا یک نفر را ثبت کنید.');
              }}
              className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl text-[11px] border border-red-800/60 font-semibold transition flex items-center gap-1"
              title="شبیه‌سازی اسکن فردی که قبلاً رأی داده جهت بررسی هشدار تقلب"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>تست رأی تکراری</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const randNId = `00${Math.floor(10000000 + Math.random() * 90000000)}`;
                handleProcessBarcodeScan(randNId);
              }}
              className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 rounded-xl text-[11px] border border-amber-800/60 font-semibold transition flex items-center gap-1"
              title="شبیه‌سازی اسکن کد ملی خارج از لیست جهت باز شدن فرم ورود دستی"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>تست فرد جدید</span>
            </button>
          </div>
        </div>

        {/* Scanner Input Bar */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine className="w-5 h-5 text-emerald-400 absolute right-3.5 top-3.5 animate-pulse" />
              <input
                ref={barcodeInputRef}
                type="text"
                disabled={isLocked}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="اسکنر بارکدخوان فعال است (بارکد کارت ملی را اسکن کنید یا کد ملی را تایپ کرده و Enter بزنید)..."
                className="w-full bg-slate-950 border-2 border-emerald-500/70 focus:border-emerald-400 rounded-2xl pr-11 pl-32 py-3 text-sm text-white font-mono placeholder:font-sans placeholder-slate-500 outline-none transition shadow-inner"
              />
              <button
                type="button"
                disabled={!barcodeInput.trim() || isLocked}
                onClick={() => handleProcessBarcodeScan(barcodeInput)}
                className="absolute left-2 top-2 bottom-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تأیید ورود (Enter)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scan Result Alert Feedback */}
        {scanResult && (
          <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 flex items-start justify-between gap-3 ${
            scanResult.type === 'SUCCESS'
              ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-100 shadow-xl shadow-emerald-950/40'
              : scanResult.type === 'DUPLICATE'
              ? 'bg-red-950/85 border-red-500 text-red-50 ring-2 ring-red-500/50 shadow-xl shadow-red-950/50'
              : scanResult.type === 'NOT_FOUND'
              ? 'bg-amber-950/80 border-amber-500/80 text-amber-100 shadow-xl shadow-amber-950/40'
              : 'bg-red-950/80 border-red-500/80 text-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl flex-shrink-0 mt-0.5">
                {scanResult.type === 'SUCCESS' && <CheckCircle2 className="w-7 h-7 text-emerald-400" />}
                {scanResult.type === 'DUPLICATE' && <ShieldAlert className="w-7 h-7 text-red-400 animate-bounce" />}
                {scanResult.type === 'NOT_FOUND' && <AlertTriangle className="w-7 h-7 text-amber-400" />}
                {scanResult.type === 'ERROR' && <AlertTriangle className="w-7 h-7 text-red-400" />}
              </div>
              <div>
                <h5 className="font-black text-sm sm:text-base leading-snug">
                  {scanResult.type === 'SUCCESS' && 'تأیید هویت و صدور تعرفه اخذ رأی'}
                  {scanResult.type === 'DUPLICATE' && '⚠️ اخطار تقلب: تلاش برای دریافت تعرفه تکراری!'}
                  {scanResult.type === 'NOT_FOUND' && 'عدم وجود در لیست قبلی (اکسل)'}
                  {scanResult.type === 'ERROR' && 'خطای اسکن'}
                </h5>
                <p className="text-xs sm:text-sm mt-1 leading-relaxed font-medium">{scanResult.message}</p>
                {scanResult.voter && (
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                    <span>ردیف: <strong>{toPersianDigits(scanResult.voter.rowNumber)}</strong></span>
                    <span>•</span>
                    <span>کد ملی: <strong>{scanResult.voter.nationalIdMasked}</strong></span>
                    {scanResult.timestamp && (
                      <>
                        <span>•</span>
                        <span>زمان ثبت: {scanResult.timestamp}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* KPI Counters (Hidden in print) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">کل واجدین شرایط در لیست</span>
          <strong className="text-2xl font-black text-white font-mono mt-1 block">
            {toPersianDigits(totalCount)} <span className="text-xs text-slate-400 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">تعداد تعرفه‌های صادر شده (رأی داده)</span>
          <strong className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
            {toPersianDigits(votedCount)} <span className="text-xs text-slate-400 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">واجدین باقی‌مانده</span>
          <strong className="text-2xl font-black text-amber-400 font-mono mt-1 block">
            {toPersianDigits(remainingCount)} <span className="text-xs text-slate-400 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">درصد مشارکت حضوری</span>
          <strong className="text-2xl font-black text-teal-300 font-mono mt-1 block">
            {toPersianDigits(turnoutPercent)}٪
          </strong>
        </div>
      </div>

      {/* Search and Filters (Hidden in print) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام، کدملی، شماره تماس یا ردیف..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'ALL' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              همه ({toPersianDigits(totalCount)})
            </button>
            <button
              onClick={() => setFilterState('VOTED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'VOTED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              رأی‌داده ({toPersianDigits(votedCount)})
            </button>
            <button
              onClick={() => setFilterState('NOT_VOTED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'NOT_VOTED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              باقی‌مانده ({toPersianDigits(remainingCount)})
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Table (Hidden in print) */}
      <div className="no-print bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 font-medium">
              <tr>
                <th className="py-3 px-4 w-14">ردیف</th>
                <th className="py-3 px-4">نام و نام خانوادگی</th>
                <th className="py-3 px-4">کد ملی (محافظت‌شده)</th>
                <th className="py-3 px-4">شماره تماس / همراه</th>
                <th className="py-3 px-4 text-center">وضعیت رأی</th>
                <th className="py-3 px-4 text-center">اقدام منشی شعبه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-200">
              {filteredVoters.map((voter) => (
                <tr key={voter.id} className="hover:bg-slate-700/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">
                    {toPersianDigits(voter.rowNumber)}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {voter.fullName}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {voter.nationalIdMasked}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                    {toPersianDigits(voter.phoneNumber)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {voter.hasVoted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>رأی داده شد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-800 border border-slate-700">
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>مراجعه نکرده</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => onToggleVoterStatus(voter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        voter.hasVoted
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                      }`}
                    >
                      {voter.hasVoted ? 'لغو ثبت رأی' : 'ثبت رأی و تحویل تعرفه'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVoters.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            هیچ رأی‌دهنده‌ای مطابق جستجو یافت نشد.
          </div>
        )}
      </div>

      {/* =========================================================================
          PRINT ONLY: ULTRA-COMPACT 2-COLUMN A4 ATTENDANCE ROSTER SHEET
          Designed to be extremely dense, small font, taking minimal space on paper.
      ========================================================================== */}
      <div className="print-only hidden p-2 bg-white text-black" dir="rtl">
        <div className="text-center border-b-2 border-black pb-1 mb-2">
          <h2 className="text-xs font-black">دفترچه رسمی واجدین شرایط و کنترل تعرفه رأی‌دهندگان</h2>
          <div className="flex justify-between text-[8px] font-mono mt-0.5">
            <span>کل واجدین: {toPersianDigits(voters.length)} نفر</span>
            <span>تاریخ چاپ: {formatJalali(new Date(), false)}</span>
            <span>شعبه اخذ رأی حضوری</span>
          </div>
        </div>

        {/* 2-Column Super Compact Grid */}
        <div className="grid grid-cols-2 gap-2 text-[7.5px] leading-none">
          {/* Half 1 */}
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-0.5 w-5 text-center">ردیف</th>
                <th className="border border-black p-0.5 text-right">نام و نام خانوادگی</th>
                <th className="border border-black p-0.5 text-center w-14">کد ملی</th>
                <th className="border border-black p-0.5 text-center w-14">همراه</th>
                <th className="border border-black p-0.5 text-center w-12">امضا/اثر</th>
              </tr>
            </thead>
            <tbody>
              {voters.slice(0, Math.ceil(voters.length / 2)).map((v) => (
                <tr key={v.id} className="border-b border-black">
                  <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.rowNumber)}</td>
                  <td className="border border-black p-0.5 font-bold truncate max-w-[90px]">{v.fullName}</td>
                  <td className="border border-black p-0.5 text-center font-mono">{v.nationalIdMasked}</td>
                  <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.phoneNumber)}</td>
                  <td className="border border-black p-0.5 text-center text-[7px] text-gray-500">
                    {v.hasVoted ? '✓ تحویل شد' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Half 2 */}
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-0.5 w-5 text-center">ردیف</th>
                <th className="border border-black p-0.5 text-right">نام و نام خانوادگی</th>
                <th className="border border-black p-0.5 text-center w-14">کد ملی</th>
                <th className="border border-black p-0.5 text-center w-14">همراه</th>
                <th className="border border-black p-0.5 text-center w-12">امضا/اثر</th>
              </tr>
            </thead>
            <tbody>
              {voters.slice(Math.ceil(voters.length / 2)).map((v) => (
                <tr key={v.id} className="border-b border-black">
                  <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.rowNumber)}</td>
                  <td className="border border-black p-0.5 font-bold truncate max-w-[90px]">{v.fullName}</td>
                  <td className="border border-black p-0.5 text-center font-mono">{v.nationalIdMasked}</td>
                  <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.phoneNumber)}</td>
                  <td className="border border-black p-0.5 text-center text-[7px] text-gray-500">
                    {v.hasVoted ? '✓ تحویل شد' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Voter Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4" dir="rtl">
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>ثبت دستی رأی‌دهنده جدید</span>
            </h4>

            <form onSubmit={handleAddVoter} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: علی احمدی"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">کد ملی ۱۰ رقمی:</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newNationalId}
                  onChange={(e) => setNewNationalId(e.target.value)}
                  placeholder="اختیاری یا جهت احراز هویت"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">شماره تماس / همراه:</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="مثال: 09123456789"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>

              {addError && (
                <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800">
                  {addError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  ثبت در فهرست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Register Modal for Scanned National ID (User Request: اگر اطلاعات نداشتند بارکد خوان کد ملی را وارد و سایر مشخصات دستی وارد شود) */}
      {isQuickRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-emerald-500/70 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">ثبت فوری رأی‌دهنده جدید با بارکدخوان</h4>
                  <p className="text-xs text-slate-400">کد ملی از بارکد کارت خوانده شد؛ نام را وارد نمایید</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickRegisterOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">کد ملی خوانده‌شده با بارکدخوان:</span>
                <strong className="text-emerald-400 font-mono text-base font-black tracking-wider">
                  {toPersianDigits(quickNId)}
                </strong>
              </div>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold">
                ✓ استخراج خودکار
              </span>
            </div>

            <form onSubmit={handleSaveQuickVoter} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی رأی‌دهنده: <span className="text-red-400">*</span>
                </label>
                <input
                  ref={quickNameInputRef}
                  type="text"
                  required
                  value={quickFullName}
                  onChange={(e) => setQuickFullName(e.target.value)}
                  placeholder="مثال: علیرضا حسینی"
                  className="w-full bg-slate-800 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  شماره تماس / تلفن همراه (اختیاری):
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="مثال: 09121112233"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {quickError && (
                <div className="p-2.5 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-xs">
                  {quickError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>ثبت مشخصات و صدور فوری تعرفه (Enter)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
