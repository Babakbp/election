import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArchivedLotteryRound,
  LotteryDrawResult,
  LotteryIdentifierPolicy,
  LotteryIdentifierType,
  LotteryParticipant,
  LotterySettings,
} from '../../types/lottery';
import {
  createSampleLotteryParticipants,
  deleteLotteryArchive,
  downloadLotteryJsonBackup,
  executeCryptographicLotteryDraw,
  exportLotteryParticipantsTemplateToExcel,
  exportLotteryResultsToExcel,
  formatIdentifierTypeLabel,
  loadLastLotteryResult,
  loadLotteryArchives,
  loadLotteryParticipants,
  loadLotterySettings,
  normalizeAndValidateLotteryCode,
  normalizeMobilePhone,
  saveLastLotteryResult,
  saveLotteryArchive,
  saveLotteryParticipants,
  saveLotterySettings,
} from '../../utils/lotteryEngine';
import { formatJalali, toEnglishDigits, toPersianDigits } from '../../utils/persian';
import { LotteryWheel } from './LotteryWheel';
import { printLotteryMinutes } from './lotteryPrint';
import {
  Archive,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Dices,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Maximize,
  Minimize,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface LotteryPanelProps {
  onSwitchToElection: () => void;
}

type LotteryTab = 'DRAW' | 'PARTICIPANTS' | 'RESULTS' | 'ARCHIVE';

export const LotteryPanel: React.FC<LotteryPanelProps> = ({ onSwitchToElection }) => {
  const [activeTab, setActiveTab] = useState<LotteryTab>('DRAW');
  const [settings, setSettings] = useState<LotterySettings>(() => loadLotterySettings());
  const [participants, setParticipants] = useState<LotteryParticipant[]>(() =>
    loadLotteryParticipants()
  );
  const [lastResult, setLastResult] = useState<LotteryDrawResult | null>(() =>
    loadLastLotteryResult()
  );
  const [archives, setArchives] = useState<ArchivedLotteryRound[]>(() => loadLotteryArchives());

  // Spinning wheel execution state
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingResult, setPendingResult] = useState<LotteryDrawResult | null>(null);
  const [justCompletedDraw, setJustCompletedDraw] = useState(false);
  const [showStartConfirmModal, setShowStartConfirmModal] = useState(false);

  // Flash message banner (replaces window.alert)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
  };

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Persist changes automatically
  useEffect(() => {
    saveLotterySettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLotteryParticipants(participants);
  }, [participants]);

  useEffect(() => {
    saveLastLotteryResult(lastResult);
  }, [lastResult]);

  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
  };

  // Eligible participants filtered by policy
  const eligibleParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (!p.isEligible) return false;
      if (settings.identifierPolicy === 'PERSONNEL_8_ONLY' && p.identifierType !== 'PERSONNEL_8') {
        return false;
      }
      if (settings.identifierPolicy === 'NATIONAL_10_ONLY' && p.identifierType !== 'NATIONAL_10') {
        return false;
      }
      return true;
    });
  }, [participants, settings.identifierPolicy]);

  const totalRequiredSeats = settings.winnerCount + settings.reserveCount;
  const canStartDraw =
    !isSpinning &&
    settings.winnerCount >= 1 &&
    settings.reserveCount >= 0 &&
    eligibleParticipants.length >= totalRequiredSeats &&
    eligibleParticipants.length >= 1;

  // Ask for confirmation first before starting the draw
  const handleRequestStartDraw = () => {
    if (isSpinning) return;

    if (settings.winnerCount < 1) {
      showFeedback('error', 'تعداد افراد انتخابی (برندگان اصلی) باید حداقل ۱ نفر باشد.');
      return;
    }

    if (eligibleParticipants.length < totalRequiredSeats) {
      showFeedback(
        'error',
        `تعداد شرکت‌کنندگان واجد شرایط (${toPersianDigits(
          eligibleParticipants.length
        )} نفر) کمتر از مجموع برندگان و رزرو (${toPersianDigits(totalRequiredSeats)} نفر) است.`
      );
      return;
    }

    setShowStartConfirmModal(true);
  };

  // Start the 30-second animated draw after user confirms
  const handleConfirmStartLotteryDraw = async () => {
    setShowStartConfirmModal(false);
    if (isSpinning) return;

    setJustCompletedDraw(false);
    const computed = await executeCryptographicLotteryDraw(participants, settings);
    setPendingResult(computed);
    setIsSpinning(true);
  };

  const handleWheelSpinComplete = () => {
    setIsSpinning(false);
    if (!pendingResult) return;

    const finalResult = pendingResult;
    setLastResult(finalResult);
    setPendingResult(null);
    setJustCompletedDraw(true);

    // Automatically archive completed lottery round
    const archiveRecord: ArchivedLotteryRound = {
      id: `LOT-ARCH-${Date.now()}`,
      archivedAt: new Date().toISOString(),
      persianArchivedDate: formatJalali(new Date(), true),
      result: finalResult,
      allParticipants: [...participants],
      notes: settings.notes || `بایگانی خودکار پس از اجرای دوره ${settings.roundCode}`,
    };
    const updatedArchives = saveLotteryArchive(archiveRecord);
    setArchives(updatedArchives);

    showFeedback(
      'success',
      `قرعه‌کشی با موفقیت انجام شد: ${toPersianDigits(
        finalResult.winners.length
      )} برنده اصلی و ${toPersianDigits(finalResult.reserves.length)} نفر رزرو انتخاب و در بایگانی ذخیره شدند.`
    );
  };

  // ---------------- Participants Management State ----------------
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | LotteryIdentifierType | 'INACTIVE'>('ALL');
  const [singleFullName, setSingleFullName] = useState('');
  const [singleCode, setSingleCode] = useState('');
  const [singleCodeType, setSingleCodeType] = useState<LotteryIdentifierType>('PERSONNEL_8');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleDept, setSingleDept] = useState('');
  const [singleError, setSingleError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const excelFileRef = useRef<HTMLInputElement | null>(null);

  const handleAddSingleParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError('');

    if (!singleFullName.trim()) {
      setSingleError('لطفاً نام و نام خانوادگی فرد را وارد کنید.');
      return;
    }

    const validation = normalizeAndValidateLotteryCode(singleCode, singleCodeType);
    if (!validation.isValid) {
      setSingleError(validation.error || 'کد وارد شده معتبر نیست.');
      return;
    }

    const phoneCheck = normalizeMobilePhone(singlePhone);
    if (!phoneCheck.isValid) {
      setSingleError(phoneCheck.error || 'شماره موبایل وارد شده معتبر نیست.');
      return;
    }

    const duplicate = participants.find(
      (p) => p.identifierCode === validation.code && p.identifierType === validation.type
    );
    if (duplicate) {
      setSingleError(
        `این کد قبلاً برای «${duplicate.fullName}» در فهرست قرعه‌کشی ثبت شده است.`
      );
      return;
    }

    const nextParticipant: LotteryParticipant = {
      id: `LOT-P-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rowNumber: participants.length + 1,
      fullName: singleFullName.trim(),
      identifierType: validation.type,
      identifierCode: validation.code,
      phoneNumber: phoneCheck.phone || undefined,
      department: singleDept.trim() || undefined,
      isEligible: true,
      addedAt: new Date().toISOString(),
    };

    setParticipants((prev) => [...prev, nextParticipant]);
    setSingleFullName('');
    setSingleCode('');
    setSinglePhone('');
    setSingleDept('');
    showFeedback('success', `«${nextParticipant.fullName}» به فهرست قرعه‌کشی اضافه شد.`);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, raw: false });

        const existingKeys = new Set(
          participants.map((p) => `${p.identifierType}:${p.identifierCode}`)
        );
        const added: LotteryParticipant[] = [];
        let skippedInvalid = 0;
        let skippedDuplicate = 0;

        let headerMap: {
          nameIdx: number;
          codeIdx: number;
          phoneIdx: number;
          deptIdx: number;
        } | null = null;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Array.isArray(row) || row.length < 2) continue;

          const firstCell = String(row[0] || '').trim();
          const secondCell = String(row[1] || '').trim();

          // Detect header row and map column indices dynamically
          if (
            i === 0 &&
            (firstCell.includes('ردیف') ||
              firstCell.includes('نام') ||
              secondCell.includes('نام'))
          ) {
            const headers = row.map((cell) => String(cell || '').trim());
            const nameIdx = headers.findIndex((h) => h.includes('نام'));
            const codeIdx = headers.findIndex(
              (h) => h.includes('کد') || h.includes('پرسنلی') || h.includes('ملی')
            );
            const phoneIdx = headers.findIndex(
              (h) => h.includes('موبایل') || h.includes('همراه') || h.includes('تلفن')
            );
            const deptIdx = headers.findIndex(
              (h) => h.includes('واحد') || h.includes('بخش') || h.includes('دپارتمان')
            );
            if (nameIdx !== -1 && codeIdx !== -1) {
              headerMap = { nameIdx, codeIdx, phoneIdx, deptIdx };
            }
            continue;
          }

          let name = '';
          let rawCode = '';
          let rawPhone = '';
          let dept = '';

          if (headerMap) {
            name = String(row[headerMap.nameIdx] || '').trim();
            rawCode = String(row[headerMap.codeIdx] || '').trim();
            if (headerMap.phoneIdx !== -1) {
              rawPhone = String(row[headerMap.phoneIdx] || '').trim();
            }
            if (headerMap.deptIdx !== -1) {
              dept = String(row[headerMap.deptIdx] || '').trim();
            }
          } else {
            const isLeadingRowNum =
              /^\d{1,5}$/.test(toEnglishDigits(firstCell)) && row.length >= 3;
            const offset = isLeadingRowNum ? 1 : 0;
            name = String(row[offset] || '').trim();
            rawCode = String(row[offset + 1] || '').trim();

            const extraA = String(row[offset + 2] || '').trim();
            const extraB = String(row[offset + 3] || '').trim();
            const extraACheck = normalizeMobilePhone(extraA);
            const extraBCheck = normalizeMobilePhone(extraB);

            if (extraA && extraACheck.isValid && extraACheck.phone) {
              rawPhone = extraACheck.phone;
              dept = extraB;
            } else if (extraB && extraBCheck.isValid && extraBCheck.phone) {
              dept = extraA;
              rawPhone = extraBCheck.phone;
            } else {
              dept = extraA;
            }
          }

          if (!name || !rawCode) continue;

          const check = normalizeAndValidateLotteryCode(rawCode);
          if (!check.isValid) {
            skippedInvalid++;
            continue;
          }

          const key = `${check.type}:${check.code}`;
          if (existingKeys.has(key)) {
            skippedDuplicate++;
            continue;
          }
          existingKeys.add(key);

          const phoneCheck = normalizeMobilePhone(rawPhone);
          const normalizedPhone =
            phoneCheck.isValid && phoneCheck.phone ? phoneCheck.phone : undefined;

          added.push({
            id: `LOT-P-${Date.now()}-${added.length + 1}`,
            rowNumber: participants.length + added.length + 1,
            fullName: name,
            identifierType: check.type,
            identifierCode: check.code,
            phoneNumber: normalizedPhone,
            department: dept || undefined,
            isEligible: true,
            addedAt: new Date().toISOString(),
          });
        }

        if (added.length > 0) {
          setParticipants((prev) => [...prev, ...added]);
          showFeedback(
            'success',
            `${toPersianDigits(added.length)} نفر از فایل اکسل وارد شدند.${
              skippedDuplicate > 0 ? ` (${toPersianDigits(skippedDuplicate)} مورد تکراری)` : ''
            }${
              skippedInvalid > 0
                ? ` (${toPersianDigits(skippedInvalid)} مورد کد نامعتبر غیر ۸ یا ۱۰ رقمی)`
                : ''
            }`
          );
        } else {
          showFeedback(
            'error',
            'هیچ ردیف معتبری در فایل اکسل یافت نشد. مطمئن شوید کدها ۸ رقم (پرسنلی) یا ۱۰ رقم (ملی) باشند.'
          );
        }
      } catch {
        showFeedback('error', 'خطا در خواندن فایل اکسل (.xlsx). لطفاً قالب نمونه را بررسی کنید.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleBulkTextImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const existingKeys = new Set(
      participants.map((p) => `${p.identifierType}:${p.identifierCode}`)
    );
    const added: LotteryParticipant[] = [];
    let invalidCount = 0;

    lines.forEach((line) => {
      // Support formats: "نام و نام خانوادگی, 14021108, 09121112233, واحد"
      const parts = line.split(/[\t,|؛،-]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) {
        invalidCount++;
        return;
      }

      // Find which part looks like 8 or 10 digit code
      let codeIndex = parts.findIndex((part) => {
        const d = toEnglishDigits(part).replace(/\D/g, '');
        return d.length === 8 || d.length === 10;
      });
      if (codeIndex === -1) codeIndex = 1;

      const check = normalizeAndValidateLotteryCode(parts[codeIndex]);
      if (!check.isValid) {
        invalidCount++;
        return;
      }

      const remaining = parts.filter((_, idx) => idx !== codeIndex);
      const name = remaining[0] || '';
      let phone = '';
      let dept = '';

      for (const token of remaining.slice(1)) {
        const pCheck = normalizeMobilePhone(token);
        if (!phone && pCheck.isValid && pCheck.phone) {
          phone = pCheck.phone;
        } else if (!dept) {
          dept = token;
        }
      }

      if (!name) {
        invalidCount++;
        return;
      }

      const key = `${check.type}:${check.code}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);

      added.push({
        id: `LOT-P-${Date.now()}-${added.length + 1}`,
        rowNumber: participants.length + added.length + 1,
        fullName: name,
        identifierType: check.type,
        identifierCode: check.code,
        phoneNumber: phone || undefined,
        department: dept || undefined,
        isEligible: true,
        addedAt: new Date().toISOString(),
      });
    });

    if (added.length > 0) {
      setParticipants((prev) => [...prev, ...added]);
      setBulkText('');
      setShowBulkModal(false);
      showFeedback(
        'success',
        `${toPersianDigits(added.length)} نفر با موفقیت اضافه شدند.${
          invalidCount > 0 ? ` (${toPersianDigits(invalidCount)} سطر نامعتبر نادیده گرفته شد)` : ''
        }`
      );
    } else {
      showFeedback(
        'error',
        'فرمت خطوط وارد شده معتبر نیست. هر خط باید شامل «نام و نام خانوادگی، کد ۸ یا ۱۰ رقمی» باشد.'
      );
    }
  };

  const handleLoadSampleParticipants = () => {
    const samples = createSampleLotteryParticipants();
    setParticipants(samples);
    showFeedback(
      'success',
      `${toPersianDigits(samples.length)} شرکت‌کننده نمونه با کد پرسنلی ۸ رقمی و کد ملی ۱۰ رقمی بارگذاری شدند.`
    );
  };

  const toggleParticipantEligibility = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEligible: !p.isEligible } : p))
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p, idx) => ({ ...p, rowNumber: idx + 1 }))
    );
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (filterType === 'PERSONNEL_8' && p.identifierType !== 'PERSONNEL_8') return false;
      if (filterType === 'NATIONAL_10' && p.identifierType !== 'NATIONAL_10') return false;
      if (filterType === 'INACTIVE' && p.isEligible) return false;

      if (!searchQuery.trim()) return true;
      const q = toEnglishDigits(searchQuery.trim().toLowerCase());
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.identifierCode.includes(q) ||
        (p.phoneNumber || '').includes(q) ||
        (p.department || '').toLowerCase().includes(q)
      );
    });
  }, [participants, filterType, searchQuery]);

  // ---------------- Archive State ----------------
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedArchive, setSelectedArchive] = useState<ArchivedLotteryRound | null>(null);
  const [deleteArchiveConfirmId, setDeleteArchiveConfirmId] = useState<string | null>(null);

  const filteredArchives = useMemo(() => {
    return archives.filter((item) => {
      if (!archiveSearch.trim()) return true;
      const q = toEnglishDigits(archiveSearch.trim().toLowerCase());
      return (
        item.result.settings.title.toLowerCase().includes(q) ||
        item.result.settings.roundCode.toLowerCase().includes(q) ||
        item.persianArchivedDate.includes(q) ||
        item.result.winners.some(
          (w) =>
            w.participant.fullName.toLowerCase().includes(q) ||
            w.participant.identifierCode.includes(q) ||
            (w.participant.phoneNumber || '').includes(q)
        )
      );
    });
  }, [archives, archiveSearch]);

  const handleSaveManualArchive = () => {
    if (!lastResult) return;
    const exists = archives.some((a) => a.result.id === lastResult.id);
    if (exists) {
      showFeedback('info', 'این دوره قرعه‌کشی قبلاً در بایگانی ذخیره شده است.');
      return;
    }
    const newArch: ArchivedLotteryRound = {
      id: `LOT-ARCH-${Date.now()}`,
      archivedAt: new Date().toISOString(),
      persianArchivedDate: formatJalali(new Date(), true),
      result: lastResult,
      allParticipants: [...participants],
      notes: settings.notes || '',
    };
    const updated = saveLotteryArchive(newArch);
    setArchives(updated);
    showFeedback('success', 'نتیجه دوره جاری در بایگانی قرعه‌کشی ذخیره شد.');
  };

  const handleDeleteArchiveItem = (id: string) => {
    const updated = deleteLotteryArchive(id);
    setArchives(updated);
    setDeleteArchiveConfirmId(null);
    if (selectedArchive?.id === id) setSelectedArchive(null);
    showFeedback('info', 'دوره مورد نظر از بایگانی قرعه‌کشی حذف شد.');
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950"
      dir="rtl"
    >
      {/* Dedicated Top Bar (Strictly 3 zones: Brand wordmark, Nav links, Primary back/fullscreen action) */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Title (single line) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
              <Dices className="w-5 h-5" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
              سامانه مستقل قرعه‌کشی
            </span>
          </div>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('DRAW')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'DRAW'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>اجرای قرعه‌کشی و تنظیمات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PARTICIPANTS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'PARTICIPANTS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>شرکت‌کنندگان</span>
              <span className="font-mono tabular-nums opacity-80">
                ({toPersianDigits(participants.length)})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RESULTS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'RESULTS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>نتایج و خروجی‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ARCHIVE')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'ARCHIVE'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>بایگانی دوره‌ها</span>
              <span className="font-mono tabular-nums opacity-80">
                ({toPersianDigits(archives.length)})
              </span>
            </button>
          </nav>

          {/* Zone 3: Primary Switch Back Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              type="button"
              disabled={isSpinning}
              onClick={onSwitchToElection}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>بازگشت به پنل انتخابات</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Secondary Nav */}
        <div className="lg:hidden border-t border-slate-800/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'DRAW', label: 'اجرای قرعه‌کشی' },
              { id: 'PARTICIPANTS', label: `شرکت‌کنندگان (${toPersianDigits(participants.length)})` },
              { id: 'RESULTS', label: 'نتایج و خروجی‌ها' },
              { id: 'ARCHIVE', label: `بایگانی (${toPersianDigits(archives.length)})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === item.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 bg-slate-900 border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div
            className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-950/70 border-red-500/40 text-red-200'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* =================================================================
            TAB 1: DRAW & SETTINGS (اجرای قرعه‌کشی و تنظیمات)
        ================================================================== */}
        {activeTab === 'DRAW' && (
          <div className="space-y-6">
            {/* Summary Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{settings.organization}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{settings.roundCode}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white mt-1">
                  {settings.title}
                </h1>
              </div>

              <div className="flex items-center gap-6 text-xs flex-wrap">
                <div>
                  <span className="text-slate-400 block">واجدین شرایط قرعه</span>
                  <strong className="text-base font-black text-white font-mono tabular-nums">
                    {toPersianDigits(eligibleParticipants.length)} نفر
                  </strong>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block">افراد انتخابی (اصلی)</span>
                  <strong className="text-base font-black text-emerald-400 font-mono tabular-nums">
                    {toPersianDigits(settings.winnerCount)} نفر
                  </strong>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block">افراد رزرو</span>
                  <strong className="text-base font-black text-amber-400 font-mono tabular-nums">
                    {toPersianDigits(settings.reserveCount)} نفر
                  </strong>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 block">مدت چرخش</span>
                  <strong className="text-base font-black text-sky-400 font-mono tabular-nums">
                    {toPersianDigits(settings.spinDurationSeconds)} ثانیه
                  </strong>
                </div>
              </div>
            </div>

            {/* Two-column Workspace: Wheel Stage (Left/Center) + Draw Settings (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Right Column (5 cols): Settings & Start Control */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>تنظیمات دوره قرعه‌کشی</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({ ...s, enableSound: !s.enableSound }))
                      }
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
                      title="قطع یا وصل صدای چرخ قرعه‌کشی"
                    >
                      {settings.enableSound ? (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                      <span>{settings.enableSound ? 'صدای چرخ فعال' : 'بی‌صدا'}</span>
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        عنوان دوره قرعه‌کشی
                      </label>
                      <input
                        type="text"
                        disabled={isSpinning}
                        value={settings.title}
                        onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          نام سازمان / برگزارکننده
                        </label>
                        <input
                          type="text"
                          disabled={isSpinning}
                          value={settings.organization}
                          onChange={(e) =>
                            setSettings({ ...settings, organization: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          کد دوره قرعه‌کشی
                        </label>
                        <input
                          type="text"
                          disabled={isSpinning}
                          value={settings.roundCode}
                          onChange={(e) =>
                            setSettings({ ...settings, roundCode: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500 disabled:opacity-60"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Winner & Reserve Counts */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          تعداد افراد انتخابی (اصلی)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          disabled={isSpinning}
                          value={settings.winnerCount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              winnerCount: Math.max(1, parseInt(e.target.value || '1', 10)),
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono tabular-nums font-bold outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          تعداد افراد رزرو (علی‌البدل)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={500}
                          disabled={isSpinning}
                          value={settings.reserveCount}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              reserveCount: Math.max(0, parseInt(e.target.value || '0', 10)),
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono tabular-nums font-bold outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Spin Duration & Identifier Policy */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          مدت چرخش چرخ (ثانیه)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          disabled={isSpinning}
                          value={settings.spinDurationSeconds}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              spinDurationSeconds: Math.min(
                                120,
                                Math.max(5, parseInt(e.target.value || '30', 10))
                              ),
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sky-300 font-mono tabular-nums font-bold outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          نوع کدهای مجاز در قرعه
                        </label>
                        <select
                          disabled={isSpinning}
                          value={settings.identifierPolicy}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              identifierPolicy: e.target.value as LotteryIdentifierPolicy,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 disabled:opacity-60"
                        >
                          <option value="BOTH">هر دو (پرسنلی ۸ رقمی و کد ملی)</option>
                          <option value="PERSONNEL_8_ONLY">فقط کد پرسنلی ۸ رقمی</option>
                          <option value="NATIONAL_10_ONLY">فقط کد ملی ۱۰ رقمی</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        توضیحات / ملاحظات صورتجلسه
                      </label>
                      <textarea
                        rows={2}
                        disabled={isSpinning}
                        value={settings.notes || ''}
                        onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
                        placeholder="شرح کوتاه موضوع قرعه‌کشی یا اسامی ناظران..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none resize-none focus:border-amber-500 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Draw Action Area */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  {participants.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between gap-3">
                      <span>هنوز شرکت‌کننده‌ای ثبت نشده است.</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleLoadSampleParticipants}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-colors"
                        >
                          افراد نمونه
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('PARTICIPANTS')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold transition-colors"
                        >
                          ثبت افراد
                        </button>
                      </div>
                    </div>
                  ) : eligibleParticipants.length < totalRequiredSeats ? (
                    <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 text-xs text-red-200">
                      حداقل به {toPersianDigits(totalRequiredSeats)} نفر شرکت‌کننده واجد شرایط
                      برای انتخاب {toPersianDigits(settings.winnerCount)} برنده و{' '}
                      {toPersianDigits(settings.reserveCount)} رزرو نیاز است (موجود:{' '}
                      {toPersianDigits(eligibleParticipants.length)} نفر).
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canStartDraw}
                    onClick={handleRequestStartDraw}
                    className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {isSpinning
                        ? `در حال چرخش چرخ قرعه‌کشی (${toPersianDigits(
                            settings.spinDurationSeconds
                          )} ثانیه)...`
                        : `شروع قرعه‌کشی و چرخش چرخ (${toPersianDigits(
                            settings.spinDurationSeconds
                          )} ثانیه)`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Left Column (7 cols): Animated Spinning Wheel Stage */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                <LotteryWheel
                  participants={eligibleParticipants}
                  isSpinning={isSpinning}
                  durationSeconds={settings.spinDurationSeconds}
                  enableSound={settings.enableSound}
                  firstWinner={
                    pendingResult?.winners[0]?.participant ||
                    (justCompletedDraw ? lastResult?.winners[0]?.participant : null)
                  }
                  onSpinComplete={handleWheelSpinComplete}
                />
              </div>
            </div>

            {/* Instant Reveal Section right below Wheel when Draw Completes */}
            {lastResult && !isSpinning && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {justCompletedDraw
                          ? 'نتیجه نهایی قرعه‌کشی اعلام و در بایگانی ثبت شد'
                          : 'آخرین نتیجه قرعه‌کشی ثبت‌شده'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-1">
                      {lastResult.settings.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                      زمان اجرا: {lastResult.persianDrawnAt} · شناسه: {lastResult.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => exportLotteryResultsToExcel(lastResult, participants)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>خروجی اکسل (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printLotteryMinutes(lastResult, participants)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>چاپ صورتجلسه (A4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('RESULTS')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Eye className="w-4 h-4 text-sky-400" />
                      <span>نمای کامل و خروجی‌ها</span>
                    </button>
                  </div>
                </div>

                {/* Winners & Reserves Side-by-Side Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Winners Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>
                        برندگان اصلی ({toPersianDigits(lastResult.winners.length)} نفر)
                      </span>
                    </h3>
                    <div className="border border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 w-12 text-center">رتبه</th>
                            <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                            <th className="py-2.5 px-3">کد پرسنلی / ملی</th>
                            <th className="py-2.5 px-3">شماره موبایل</th>
                            <th className="py-2.5 px-3">واحد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {lastResult.winners.map((w) => (
                            <tr key={w.participant.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-emerald-400">
                                {toPersianDigits(w.rank)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {w.participant.fullName}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                                <span>{toPersianDigits(w.participant.identifierCode)}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {formatIdentifierTypeLabel(w.participant.identifierType)}
                                </span>
                              </td>
                              <td
                                className="py-2.5 px-3 font-mono tabular-nums text-slate-300 text-right"
                                dir="ltr"
                              >
                                {w.participant.phoneNumber
                                  ? toPersianDigits(w.participant.phoneNumber)
                                  : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {w.participant.department || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Reserves Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      <span>
                        افراد رزرو / علی‌البدل ({toPersianDigits(lastResult.reserves.length)} نفر)
                      </span>
                    </h3>
                    <div className="border border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 w-12 text-center">اولویت</th>
                            <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                            <th className="py-2.5 px-3">کد پرسنلی / ملی</th>
                            <th className="py-2.5 px-3">شماره موبایل</th>
                            <th className="py-2.5 px-3">واحد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {lastResult.reserves.length > 0 ? (
                            lastResult.reserves.map((r) => (
                              <tr key={r.participant.id} className="hover:bg-slate-800/40">
                                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-amber-400">
                                  {toPersianDigits(r.rank)}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">
                                  {r.participant.fullName}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                                  <span>{toPersianDigits(r.participant.identifierCode)}</span>
                                  <span className="text-[10px] text-slate-500 block">
                                    {formatIdentifierTypeLabel(r.participant.identifierType)}
                                  </span>
                                </td>
                                <td
                                  className="py-2.5 px-3 font-mono tabular-nums text-slate-300 text-right"
                                  dir="ltr"
                                >
                                  {r.participant.phoneNumber
                                    ? toPersianDigits(r.participant.phoneNumber)
                                    : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {r.participant.department || '—'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-6 text-center text-slate-500 text-xs"
                              >
                                فرد رزرو در تنظیمات این دوره مشخص نشده است.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 2: PARTICIPANTS (شرکت‌کنندگان با کد پرسنلی ۸ رقمی یا کد ملی)
        ================================================================== */}
        {activeTab === 'PARTICIPANTS' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>مدیریت شرکت‌کنندگان در قرعه‌کشی</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ثبت افراد به صورت تکی یا گروهی (اکسل) با کد پرسنلی ۸ رقمی یا کد ملی ۱۰ رقمی و شماره موبایل
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={excelFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelImport}
                />

                <button
                  type="button"
                  onClick={() => excelFileRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>ورود از فایل اکسل</span>
                </button>

                <button
                  type="button"
                  onClick={exportLotteryParticipantsTemplateToExcel}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>دانلود قالب اکسل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>ثبت گروهی متنی</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleParticipants}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>بارگذاری فهرست نمونه</span>
                </button>
              </div>
            </div>

            {/* Single Participant Registration Form */}
            <form
              onSubmit={handleAddSingleParticipant}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>افزودن شرکت‌کننده جدید</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.9fr_1fr_1.1fr_auto] gap-3 items-end text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={singleFullName}
                    onChange={(e) => setSingleFullName(e.target.value)}
                    placeholder="مثلاً: محمدحسین رضایی"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">نوع شناسه</label>
                  <select
                    value={singleCodeType}
                    onChange={(e) =>
                      setSingleCodeType(e.target.value as LotteryIdentifierType)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="PERSONNEL_8">کد پرسنلی ۸ رقمی</option>
                    <option value="NATIONAL_10">کد ملی ۱۰ رقمی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {singleCodeType === 'PERSONNEL_8'
                      ? 'کد پرسنلی (۸ رقم)'
                      : 'کد ملی (۱۰ رقم)'}
                  </label>
                  <input
                    type="text"
                    value={singleCode}
                    onChange={(e) => setSingleCode(e.target.value)}
                    placeholder={singleCodeType === 'PERSONNEL_8' ? '14021108' : '0012345678'}
                    maxLength={singleCodeType === 'PERSONNEL_8' ? 8 : 10}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono tabular-nums outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    شماره موبایل (اختیاری)
                  </label>
                  <input
                    type="tel"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    placeholder="09121234567"
                    maxLength={13}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono tabular-nums outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    واحد / بخش (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={singleDept}
                    onChange={(e) => setSingleDept(e.target.value)}
                    placeholder="فناوری اطلاعات"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-2 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ثبت در قرعه</span>
                  </button>
                </div>
              </div>

              {singleError && (
                <p className="text-xs text-red-400 font-medium">{singleError}</p>
              )}
            </form>

            {/* Filter & Search Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام، کد، شماره موبایل یا واحد..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  {(
                    [
                      { id: 'ALL', label: 'همه' },
                      { id: 'PERSONNEL_8', label: 'کد پرسنلی ۸ رقمی' },
                      { id: 'NATIONAL_10', label: 'کد ملی ۱۰ رقمی' },
                      { id: 'INACTIVE', label: 'غیرفعال' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterType(f.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterType === f.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {participants.length > 0 && (
                  <>
                    {!confirmClearAll ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(true)}
                        className="px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold transition-colors"
                      >
                        پاک‌سازی همه
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-red-950/70 border border-red-700 rounded-xl px-2.5 py-1 text-xs">
                        <span className="text-red-200">حذف کل لیست؟</span>
                        <button
                          type="button"
                          onClick={() => {
                            setParticipants([]);
                            setConfirmClearAll(false);
                            showFeedback('info', 'فهرست شرکت‌کنندگان پاک‌سازی شد.');
                          }}
                          className="px-2 py-0.5 bg-red-600 text-white rounded font-bold"
                        >
                          بله
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="px-1.5 py-0.5 text-slate-300"
                        >
                          خیر
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Participants Table */}
            {filteredParticipants.length > 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="py-3 px-4 w-14 text-center">ردیف</th>
                        <th className="py-3 px-4">نام و نام خانوادگی</th>
                        <th className="py-3 px-4">نوع کد</th>
                        <th className="py-3 px-4">کد پرسنلی / کد ملی</th>
                        <th className="py-3 px-4">شماره موبایل</th>
                        <th className="py-3 px-4">واحد / بخش</th>
                        <th className="py-3 px-4 text-center">حضور در قرعه</th>
                        <th className="py-3 px-4 text-center w-20">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredParticipants.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-400">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-white">{p.fullName}</td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {formatIdentifierTypeLabel(p.identifierType)}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-amber-300">
                            {toPersianDigits(p.identifierCode)}
                          </td>
                          <td
                            className="py-2.5 px-4 font-mono tabular-nums text-slate-300 text-right"
                            dir="ltr"
                          >
                            {p.phoneNumber ? toPersianDigits(p.phoneNumber) : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {p.department || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleParticipantEligibility(p.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                p.isEligible
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {p.isEligible ? 'فعال در قرعه' : 'غیرفعال'}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                              title="حذف از فهرست"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">
                  {participants.length === 0
                    ? 'هنوز شرکت‌کننده‌ای در این پنل ثبت نشده است'
                    : 'موردی با فیلتر جستجو یافت نشد'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  افراد را با کد پرسنلی ۸ رقمی یا کد ملی ۱۰ رقمی از طریق فرم بالا، فایل اکسل یا دکمه فهرست نمونه اضافه کنید.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 3: RESULTS & OUTPUTS (نتایج و خروجی‌های رسمی)
        ================================================================== */}
        {activeTab === 'RESULTS' && (
          <div className="space-y-6">
            {lastResult ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{lastResult.settings.organization}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{lastResult.settings.roundCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lastResult.persianDrawnAt}</span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-1">
                      گزارش کامل و خروجی‌های رسمی: {lastResult.settings.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => exportLotteryResultsToExcel(lastResult, participants)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>دریافت اکسل (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printLotteryMinutes(lastResult, participants)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>چاپ صورتجلسه A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadLotteryJsonBackup(lastResult, participants)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Download className="w-4 h-4 text-sky-400" />
                      <span>فایل پشتیبان (.json)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveManualArchive}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Archive className="w-4 h-4 text-purple-400" />
                      <span>ثبت در بایگانی</span>
                    </button>
                  </div>
                </div>

                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 block">شرکت‌کنندگان واجد شرایط</span>
                    <strong className="text-xl font-black text-white font-mono tabular-nums mt-1 block">
                      {toPersianDigits(lastResult.eligibleParticipantsCount)} نفر
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 block">تعداد برندگان اصلی</span>
                    <strong className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1 block">
                      {toPersianDigits(lastResult.winners.length)} نفر
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 block">تعداد افراد رزرو</span>
                    <strong className="text-xl font-black text-amber-400 font-mono tabular-nums mt-1 block">
                      {toPersianDigits(lastResult.reserves.length)} نفر
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <span className="text-xs text-slate-400 block">مدت چرخش چرخ</span>
                    <strong className="text-xl font-black text-sky-400 font-mono tabular-nums mt-1 block">
                      {toPersianDigits(lastResult.settings.spinDurationSeconds)} ثانیه
                    </strong>
                  </div>
                </div>

                {/* Winners & Reserves Full Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>جدول رسمی برندگان اصلی</span>
                    </h3>
                    <div className="border border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 text-center w-12">رتبه</th>
                            <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                            <th className="py-2.5 px-3">نوع و شماره کد</th>
                            <th className="py-2.5 px-3">شماره موبایل</th>
                            <th className="py-2.5 px-3">واحد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {lastResult.winners.map((w) => (
                            <tr key={w.participant.id}>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-emerald-400">
                                {toPersianDigits(w.rank)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {w.participant.fullName}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                                <span>{toPersianDigits(w.participant.identifierCode)}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {formatIdentifierTypeLabel(w.participant.identifierType)}
                                </span>
                              </td>
                              <td
                                className="py-2.5 px-3 font-mono tabular-nums text-slate-300 text-right"
                                dir="ltr"
                              >
                                {w.participant.phoneNumber
                                  ? toPersianDigits(w.participant.phoneNumber)
                                  : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300">
                                {w.participant.department || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      <span>جدول رسمی افراد رزرو (علی‌البدل)</span>
                    </h3>
                    <div className="border border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 text-center w-12">اولویت</th>
                            <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                            <th className="py-2.5 px-3">نوع و شماره کد</th>
                            <th className="py-2.5 px-3">شماره موبایل</th>
                            <th className="py-2.5 px-3">واحد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {lastResult.reserves.length > 0 ? (
                            lastResult.reserves.map((r) => (
                              <tr key={r.participant.id}>
                                <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-amber-400">
                                  {toPersianDigits(r.rank)}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">
                                  {r.participant.fullName}
                                </td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                                  <span>{toPersianDigits(r.participant.identifierCode)}</span>
                                  <span className="text-[10px] text-slate-500 block">
                                    {formatIdentifierTypeLabel(r.participant.identifierType)}
                                  </span>
                                </td>
                                <td
                                  className="py-2.5 px-3 font-mono tabular-nums text-slate-300 text-right"
                                  dir="ltr"
                                >
                                  {r.participant.phoneNumber
                                    ? toPersianDigits(r.participant.phoneNumber)
                                    : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {r.participant.department || '—'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-6 text-center text-slate-500 text-xs"
                              >
                                فرد رزرو در این دوره تعریف نشده است.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Integrity Proof */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>الگوریتم انتخاب: {lastResult.algorithmInfo}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 break-all" dir="ltr">
                    SHA-256: {lastResult.integrityHash}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <Award className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    هنوز قرعه‌کشی در این نشست اجرا نشده است
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ابتدا از بخش «اجرای قرعه‌کشی و تنظیمات» قرعه‌کشی را اجرا کنید تا خروجی‌های اکسل و صورتجلسه چاپی ایجاد شوند.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('DRAW')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  <span>رفتن به صفحه اجرای قرعه‌کشی</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 4: ARCHIVE (بایگانی دوره‌های قرعه‌کشی)
        ================================================================== */}
        {activeTab === 'ARCHIVE' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-400" />
                  <span>بایگانی دائمی دوره‌های قرعه‌کشی</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تمام دوره‌های قرعه‌کشی اجرا شده همراه با برندگان، افراد رزرو، فهرست کامل شرکت‌کنندگان و کد اصالت SHA-256 در این بخش نگهداری می‌شوند.
                </p>
              </div>

              <div className="text-xs text-slate-300 font-mono tabular-nums">
                مجموع دوره‌های ثبت‌شده: <strong className="text-amber-400">{toPersianDigits(archives.length)} دوره</strong>
              </div>
            </div>

            {/* Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="جستجو بر اساس عنوان، کد دوره، نام برنده یا کد پرسنلی/ملی..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <span className="text-xs text-slate-400 font-mono tabular-nums">
                نمایش {toPersianDigits(filteredArchives.length)} از {toPersianDigits(archives.length)} دوره
              </span>
            </div>

            {/* Archive List */}
            {filteredArchives.length > 0 ? (
              <div className="space-y-4">
                {filteredArchives.map((arch) => {
                  const isDeleting = deleteArchiveConfirmId === arch.id;
                  return (
                    <div
                      key={arch.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {arch.result.settings.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                            <span>{arch.result.settings.organization}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              کد: {arch.result.settings.roundCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{arch.persianArchivedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                          <div>
                            <span className="text-slate-500 block">شرکت‌کنندگان</span>
                            <strong className="text-white">
                              {toPersianDigits(arch.result.eligibleParticipantsCount)} نفر
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">برندگان</span>
                            <strong className="text-emerald-400">
                              {toPersianDigits(arch.result.winners.length)} نفر
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">رزرو</span>
                            <strong className="text-amber-400">
                              {toPersianDigits(arch.result.reserves.length)} نفر
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Quick Preview of Top Winners */}
                      <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 font-semibold">منتخبین اصلی:</span>
                        {arch.result.winners.slice(0, 5).map((w, i) => (
                          <span key={w.participant.id}>
                            {i > 0 && <span className="text-slate-600 mx-1">·</span>}
                            <strong className="text-white">{w.participant.fullName}</strong>{' '}
                            <span className="font-mono tabular-nums text-slate-400">
                              ({toPersianDigits(w.participant.identifierCode)})
                            </span>
                          </span>
                        ))}
                        {arch.result.winners.length > 5 && (
                          <span className="text-slate-500">
                            و {toPersianDigits(arch.result.winners.length - 5)} نفر دیگر
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedArchive(arch)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>بازبینی کامل دوره</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              exportLotteryResultsToExcel(arch.result, arch.allParticipants)
                            }
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>خروجی اکسل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              printLotteryMinutes(arch.result, arch.allParticipants, arch)
                            }
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            <span>چاپ صورتجلسه</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              downloadLotteryJsonBackup(arch.result, arch.allParticipants)
                            }
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-400" />
                            <span>پشتیبان (.json)</span>
                          </button>
                        </div>

                        <div>
                          {!isDeleting ? (
                            <button
                              type="button"
                              onClick={() => setDeleteArchiveConfirmId(arch.id)}
                              className="p-2 text-slate-500 hover:text-red-400 rounded-xl transition-colors"
                              title="حذف از بایگانی"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-800 rounded-xl px-2.5 py-1 text-xs">
                              <span className="text-red-200">حذف شود؟</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteArchiveItem(arch.id)}
                                className="px-2 py-0.5 bg-red-600 text-white rounded font-bold"
                              >
                                بله
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteArchiveConfirmId(null)}
                                className="px-1.5 py-0.5 text-slate-300"
                              >
                                لغو
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Archive className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">
                  {archiveSearch
                    ? 'موردی مطابق جستجوی شما یافت نشد'
                    : 'هنوز دوره قرعه‌کشی در بایگانی ذخیره نشده است'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  پس از پایان هر دوره قرعه‌کشی، نتایج به صورت خودکار به همراه لیست شرکت‌کنندگان در این بخش بایگانی می‌شوند.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bulk Text Entry Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleBulkTextImport}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">ثبت گروهی شرکت‌کنندگان</h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              در هر خط، نام و نام خانوادگی، کد پرسنلی ۸ رقمی (یا کد ملی ۱۰ رقمی)، شماره موبایل (اختیاری) و نام واحد را با ویرگول یا خط تیره جدا کنید:
            </p>

            <textarea
              rows={7}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`محمد امینی, 14021108, 09121112233, فناوری اطلاعات\nزهرا شریفی, 0012345678, 09123334455, امور مالی`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                افزودن به فهرست
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Archive Inspection Modal */}
      {selectedArchive && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white">
                  {selectedArchive.result.settings.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                  {selectedArchive.result.settings.roundCode} · {selectedArchive.persianArchivedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchive(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-400">
                    برندگان اصلی ({toPersianDigits(selectedArchive.result.winners.length)} نفر)
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <th className="py-2 px-3 text-center">رتبه</th>
                          <th className="py-2 px-3">نام</th>
                          <th className="py-2 px-3">کد</th>
                          <th className="py-2 px-3">موبایل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {selectedArchive.result.winners.map((w) => (
                          <tr key={w.participant.id}>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400">
                              {toPersianDigits(w.rank)}
                            </td>
                            <td className="py-2 px-3 font-bold text-white">
                              {w.participant.fullName}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                              {toPersianDigits(w.participant.identifierCode)}
                            </td>
                            <td
                              className="py-2 px-3 font-mono tabular-nums text-slate-300 text-right"
                              dir="ltr"
                            >
                              {w.participant.phoneNumber
                                ? toPersianDigits(w.participant.phoneNumber)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-amber-400">
                    افراد رزرو ({toPersianDigits(selectedArchive.result.reserves.length)} نفر)
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <th className="py-2 px-3 text-center">اولویت</th>
                          <th className="py-2 px-3">نام</th>
                          <th className="py-2 px-3">کد</th>
                          <th className="py-2 px-3">موبایل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {selectedArchive.result.reserves.length > 0 ? (
                          selectedArchive.result.reserves.map((r) => (
                            <tr key={r.participant.id}>
                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">
                                {toPersianDigits(r.rank)}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {r.participant.fullName}
                              </td>
                              <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                                {toPersianDigits(r.participant.identifierCode)}
                              </td>
                              <td
                                className="py-2 px-3 font-mono tabular-nums text-slate-300 text-right"
                                dir="ltr"
                              >
                                {r.participant.phoneNumber
                                  ? toPersianDigits(r.participant.phoneNumber)
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-500">
                              ندارد
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 break-all" dir="ltr">
                SHA-256: {selectedArchive.result.integrityHash}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportLotteryResultsToExcel(
                      selectedArchive.result,
                      selectedArchive.allParticipants
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>خروجی اکسل</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printLotteryMinutes(
                      selectedArchive.result,
                      selectedArchive.allParticipants,
                      selectedArchive
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ صورتجلسه</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArchive(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal Before Starting Draw */}
      {showStartConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-black text-sm">
                <Dices className="w-5 h-5 text-amber-400" />
                <span>تأیید نهایی پیش از شروع قرعه‌کشی</span>
              </div>
              <button
                type="button"
                onClick={() => setShowStartConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                آیا از شروع قرعه‌کشی برای دوره{' '}
                <strong className="text-white">«{settings.title}»</strong> اطمینان دارید؟
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                <div>
                  <span className="text-slate-400 block text-[11px]">شرکت‌کنندگان واجد شرایط</span>
                  <strong className="text-white text-sm">
                    {toPersianDigits(eligibleParticipants.length)} نفر
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">مدت چرخش چرخ</span>
                  <strong className="text-sky-400 text-sm">
                    {toPersianDigits(settings.spinDurationSeconds)} ثانیه
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">افراد انتخابی (اصلی)</span>
                  <strong className="text-emerald-400 text-sm">
                    {toPersianDigits(settings.winnerCount)} نفر
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">افراد رزرو (علی‌البدل)</span>
                  <strong className="text-amber-400 text-sm">
                    {toPersianDigits(settings.reserveCount)} نفر
                  </strong>
                </div>
              </div>

              {lastResult && (
                <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 text-amber-200">
                  توجه: یک نتیجه قرعه‌کشی در این نشست نمایش داده شده است (دوره «{lastResult.settings.title}»). در صورت تأیید، قرعه‌کشی جدیدی انجام شده و نتیجه قبلی در بخش بایگانی محفوظ می‌ماند.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStartConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                انصراف (لغو)
              </button>
              <button
                type="button"
                onClick={handleConfirmStartLotteryDraw}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>بله، قرعه‌کشی شروع شود</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
