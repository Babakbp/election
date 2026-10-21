import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Voter, Operator, VoterStatus, ElectionSession } from '../types/election';
import { 
  toPersianDigits, 
  toEnglishDigits, 
  maskNationalId, 
  formatJalali, 
  parseJalaliBirthDate, 
  isVoterAgeEligible,
  extractPersianFamilyName,
  comparePersianAlphabetical,
  sortVotersByFamilyName
} from '../utils/persian';
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
  Fingerprint,
  Trash2,
  FileCheck,
  Calendar,
  Shield,
  Ban
} from 'lucide-react';

interface VotersTabProps {
  voters: Voter[];
  session?: ElectionSession;
  isLocked: boolean;
  currentOperator: Operator;
  onUpdateVoters: (newVoters: Voter[], reason: string) => void;
  onToggleVoterStatus: (voterId: string) => void;
  onSetVoterStatus?: (voterId: string, status: VoterStatus) => void;
  onDeleteVoter?: (voterId: string) => void;
  onClearAllVoters?: () => void;
}

export const VotersTab: React.FC<VotersTabProps> = ({
  voters,
  session,
  isLocked,
  onUpdateVoters,
  onToggleVoterStatus,
  onSetVoterStatus,
  onDeleteVoter,
  onClearAllVoters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'ALL' | 'BALLOT_DELIVERED' | 'VOTED' | 'NOT_VOTED' | 'DISQUALIFIED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [voterToDelete, setVoterToDelete] = useState<Voter | null>(null);
  const [newName, setNewName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newDisqualified, setNewDisqualified] = useState(false);
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
  const [quickBirthDate, setQuickBirthDate] = useState('');
  const [quickDisqualified, setQuickDisqualified] = useState(false);
  const [quickError, setQuickError] = useState('');

  // Excel Ineligible Voters Action Modal Data
  const [excelIneligibleModalData, setExcelIneligibleModalData] = useState<{
    allVoters: Voter[];
    eligibleVoters: Voter[];
    ineligibleVoters: { voter: Voter; reason: string }[];
    fileName: string;
  } | null>(null);

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
      const isVoted = found.status === 'VOTED' || found.hasVoted;
      const isDelivered = found.status === 'BALLOT_DELIVERED' || (!found.hasVoted && !!found.ballotDeliveredAt);

      if (isVoted) {
        // DUPLICATE VOTING ALERT!
        audioFeedback.playDuplicateWarning();
        setScanResult({
          type: 'DUPLICATE',
          voter: found,
          message: `⚠️ هشدار تقلب! برای رأی‌دهنده «${found.fullName}» قبلاً در ساعت ${toPersianDigits(found.votedAt || '')} رأی ثبت شده است! صدور مجدد تعرفه غیرمجاز است.`,
          timestamp: formatJalali(new Date(), true),
        });
      } else if (isDelivered) {
        audioFeedback.playDuplicateWarning();
        setScanResult({
          type: 'DUPLICATE',
          voter: found,
          message: `⚠️ توجه: تعرفه رأی برای «${found.fullName}» قبلاً در ساعت ${toPersianDigits(found.ballotDeliveredAt || '')} تحویل شده است و در انتظار ثبت رأی می‌باشد.`,
          timestamp: formatJalali(new Date(), true),
        });
      } else if (found.isDisqualified || (session?.hasAgeRestriction && found.isAgeEligible === false)) {
        audioFeedback.playNotFoundWarning();
        setScanResult({
          type: 'ERROR',
          voter: found,
          message: `⛔ عدم احراز شرایط رأی‌دهی! رأی‌دهنده «${found.fullName}» (${found.birthDate ? `متولد: ${toPersianDigits(found.birthDate)}` : 'فاقد تاریخ تولد'}) دارای تیک عدم احراز شرایط سنی حوزه می‌باشد. تحویل برگه تعرفه و اخذ رأی غیرمجاز است.`,
          timestamp: formatJalali(new Date(), true),
        });
      } else {
        // SUCCESS CHECK-IN & ISSUE BALLOT
        audioFeedback.playScanSuccess();
        const timeNow = formatJalali(new Date(), true);
        if (onSetVoterStatus) {
          onSetVoterStatus(found.id, 'BALLOT_DELIVERED');
        } else {
          onToggleVoterStatus(found.id);
        }
        setScanResult({
          type: 'SUCCESS',
          voter: { ...found, status: 'BALLOT_DELIVERED', ballotDeliveredAt: timeNow },
          message: `✅ احراز هویت موفق: تعرفه رأی برای «${found.fullName}» (ردیف ${toPersianDigits(found.rowNumber)}) تحویل شد.`,
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
      setQuickBirthDate('');
      setQuickDisqualified(false);
      setQuickError('');
      setIsQuickRegisterOpen(true);
      setScanResult({
        type: 'NOT_FOUND',
        message: `کد ملی ${toPersianDigits(cleanNId)} در فهرست واجدین شرایط (اکسل) ثبت نشده است. لطفاً مشخصات رأی‌دهنده را وارد کنید تا ثبت و تعرفه تحویل گردد.`,
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

    let birthDate: string | undefined = undefined;
    let age: number | undefined = undefined;
    if (quickBirthDate.trim()) {
      const parsed = parseJalaliBirthDate(quickBirthDate);
      if (parsed && parsed.isValid) {
        birthDate = parsed.formattedBirthDate;
        age = parsed.age;
      }
    }
    const eligibility = isVoterAgeEligible(
      birthDate,
      session?.hasAgeRestriction,
      session?.minAge,
      session?.maxAge,
      session?.minBirthDate,
      session?.maxBirthDate
    );

    const isDisq = quickDisqualified || (session?.hasAgeRestriction && !eligibility.isEligible);
    if (session?.hasAgeRestriction && !eligibility.isEligible && !quickDisqualified) {
      if (!confirm(`⚠️ توجه: این فرد بر اساس تاریخ تولد وارد شده، شرط سنی حوزه را احراز نکرده است (${eligibility.reason || 'خارج از بازه مجاز'}).\n\nآیا مایلید با تیک «عدم احراز شرایط» ثبت شود تا در لیست بماند اما نتواند رأی دهد؟`)) {
        return;
      }
    }

    const timeNow = formatJalali(new Date(), true);
    const newVoter: Voter = {
      id: `VOT-SCAN-${Date.now()}`,
      rowNumber: voters.length + 1,
      fullName: quickFullName.trim(),
      nationalId: quickNId,
      nationalIdMasked: maskNationalId(quickNId),
      phoneNumber: toEnglishDigits(quickPhone).trim() || '—',
      birthDate,
      age: age ?? eligibility.age,
      isAgeEligible: eligibility.isEligible,
      isDisqualified: isDisq,
      disqualificationReason: isDisq ? (eligibility.reason || 'عدم احراز شرایط سنی مجاز حوزه') : undefined,
      hasVoted: false,
      status: isDisq ? 'NOT_CHECKED_IN' : 'BALLOT_DELIVERED',
      ballotDeliveredAt: isDisq ? undefined : timeNow,
    };

    onUpdateVoters(
      [...voters, newVoter],
      isDisq
        ? `ثبت با تیک عدم احراز شرایط برای: ${newVoter.fullName} (${newVoter.nationalIdMasked})`
        : `ثبت حضور و تحویل تعرفه با بارکدخوان کارت ملی: ${newVoter.fullName} (${newVoter.nationalIdMasked})`
    );

    if (isDisq) {
      audioFeedback.playNotFoundWarning();
      setScanResult({
        type: 'ERROR',
        voter: newVoter,
        message: `⛔ رأی‌دهنده «${newVoter.fullName}» با تیک «عدم احراز شرایط سنی» ثبت شد و مجاز به اخذ تعرفه و شرکت در انتخابات نمی‌باشد.`,
        timestamp: timeNow,
      });
    } else {
      audioFeedback.playScanSuccess();
      setScanResult({
        type: 'SUCCESS',
        voter: newVoter,
        message: `✅ ثبت دستی و تحویل موفق تعرفه: «${newVoter.fullName}» با کد ملی ${toPersianDigits(newVoter.nationalIdMasked)} به فهرست اضافه و تعرفه تحویل شد.`,
        timestamp: timeNow,
      });
    }

    setIsQuickRegisterOpen(false);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  };

  // Stats
  const totalCount = voters.length;
  const ballotDeliveredCount = voters.filter(v => !v.isDisqualified && (v.status === 'BALLOT_DELIVERED' || (!v.hasVoted && !!v.ballotDeliveredAt))).length;
  const votedCount = voters.filter(v => !v.isDisqualified && (v.status === 'VOTED' || v.hasVoted)).length;
  const disqualifiedCount = voters.filter(v => v.isDisqualified || (session?.hasAgeRestriction && v.isAgeEligible === false)).length;
  const remainingCount = voters.filter(v => !v.isDisqualified && (session?.hasAgeRestriction ? v.isAgeEligible !== false : true) && (v.status === 'NOT_CHECKED_IN' || (!v.status && !v.hasVoted && !v.ballotDeliveredAt))).length;
  const turnoutPercent = totalCount > 0 ? (((votedCount + ballotDeliveredCount) / totalCount) * 100).toFixed(1) : '0';

  // Toggle Disqualification (تیک عدم احراز شرایط / رفع عدم احراز)
  const handleToggleDisqualification = (voterId: string) => {
    if (isLocked) return;
    const target = voters.find((v) => v.id === voterId);
    if (!target) return;
    const isCurrentlyDisq = target.isDisqualified || (session?.hasAgeRestriction && target.isAgeEligible === false);
    const newDisq = !isCurrentlyDisq;
    const updated = voters.map((v) =>
      v.id === voterId
        ? {
            ...v,
            isDisqualified: newDisq,
            isAgeEligible: !newDisq,
            disqualificationReason: newDisq ? (v.disqualificationReason || 'عدم احراز شرایط سنی حوزه انتخابیه') : undefined,
            status: newDisq && v.status === 'BALLOT_DELIVERED' ? ('NOT_CHECKED_IN' as VoterStatus) : v.status,
            ballotDeliveredAt: newDisq ? undefined : v.ballotDeliveredAt,
          }
        : v
    );
    onUpdateVoters(
      updated,
      `${newDisq ? 'ثبت تیک عدم احراز شرایط' : 'رفع عدم احراز شرایط و تایید صلاحیت'} برای: ${target.fullName}`
    );
  };

  // Delete Single Voter from list
  const handleDeleteSingleVoter = (voterId: string) => {
    if (isLocked) return;
    const target = voters.find((v) => v.id === voterId);
    if (!target) return;
    if (!confirm(`آیا از حذف «${target.fullName}» از فهرست واجدین شرایط مطمئن هستید؟`)) return;
    const updated = voters.filter((v) => v.id !== voterId).map((v, idx) => ({ ...v, rowNumber: idx + 1 }));
    onUpdateVoters(updated, `حذف رأی‌دهنده: ${target.fullName}`);
  };

  // Delete All Ineligible / Disqualified Voters
  const handleDeleteAllDisqualifiedVoters = () => {
    if (isLocked) return;
    const disqualified = voters.filter(
      (v) => v.isDisqualified || (session?.hasAgeRestriction && v.isAgeEligible === false)
    );
    if (disqualified.length === 0) return;
    if (
      !confirm(
        `آیا از حذف تمامی ${toPersianDigits(disqualified.length)} نفر افراد فاقد شرایط سنی از لیست اطمینان دارید؟`
      )
    ) {
      return;
    }
    const updated = voters
      .filter((v) => !v.isDisqualified && (!session?.hasAgeRestriction || v.isAgeEligible !== false))
      .map((v, idx) => ({ ...v, rowNumber: idx + 1 }));
    onUpdateVoters(updated, `حذف دسته‌جمعی ${toPersianDigits(disqualified.length)} نفر افراد فاقد شرایط سنی`);
  };

  // Filtered
  const filteredVoters = voters.filter((v) => {
    const isDisq = v.isDisqualified || (session?.hasAgeRestriction && v.isAgeEligible === false);
    const isVoted = !isDisq && (v.status === 'VOTED' || v.hasVoted);
    const isDelivered = !isDisq && (v.status === 'BALLOT_DELIVERED' || (!v.hasVoted && !!v.ballotDeliveredAt));
    const isNotAttended = !isDisq && !isVoted && !isDelivered;

    if (filterState === 'DISQUALIFIED' && !isDisq) return false;
    if (filterState === 'VOTED' && !isVoted) return false;
    if (filterState === 'BALLOT_DELIVERED' && !isDelivered) return false;
    if (filterState === 'NOT_VOTED' && !isNotAttended) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.fullName.toLowerCase().includes(q);
      const matchNId = (v.nationalId || '').includes(toEnglishDigits(q)) || (v.nationalIdMasked || '').includes(q);
      const matchPhone = (v.phoneNumber || '').includes(toEnglishDigits(q)) || (v.phoneNumber || '').includes(q);
      const matchRow = String(v.rowNumber) === toEnglishDigits(q);
      return matchName || matchNId || matchPhone || matchRow;
    }
    return true;
  });

  // Sort State: Default to Persian Alphabetical by Family Name (حروف الفبای فامیلی)
  const [sortMode, setSortMode] = useState<'FAMILY_NAME' | 'ROW_NUMBER'>('FAMILY_NAME');

  const sortedFilteredVoters = React.useMemo(() => {
    if (sortMode === 'ROW_NUMBER') {
      return [...filteredVoters].sort((a, b) => a.rowNumber - b.rowNumber);
    }
    return sortVotersByFamilyName(filteredVoters);
  }, [filteredVoters, sortMode]);

  // Download Sample .xlsx
  const handleDownloadSampleXLSX = () => {
    exportVotersTemplateToExcel();
  };

  // Export current voters as .xlsx
  const handleExportCurrentVoters = () => {
    exportVotersListToExcel(voters, '۱');
  };

  // Import .xlsx or .xls or .csv File (Requested: در اکسل ورودی تاریخ تولد شمسی نیز لحاظ شود)
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

        // Detect column positions from header row
        const headerRow = (rows[0] || []).map((h) => String(h || '').trim());
        let fullNameCol = -1;
        let firstNameCol = -1;
        let lastNameCol = -1;
        let nIdCol = -1;
        let phoneCol = -1;
        let birthDateCol = -1;

        headerRow.forEach((colRaw, idx) => {
          const col = colRaw.toLowerCase();
          if (col.includes('خانوادگی') || col.includes('فامیلی') || col.includes('شهرت') || col.includes('family') || col.includes('lastname') || col.includes('last name')) {
            lastNameCol = idx;
          } else if (col.includes('نام و') || col.includes('نام کامل') || col.includes('fullname') || col.includes('full name')) {
            fullNameCol = idx;
          } else if (col.includes('نام') || col.includes('firstname') || col.includes('first name') || col.includes('name')) {
            firstNameCol = idx;
          } else if (col.includes('ملی') || col.includes('national') || col.includes('nid')) {
            nIdCol = idx;
          } else if (col.includes('تماس') || col.includes('تلفن') || col.includes('همراه') || col.includes('phone') || col.includes('mobile')) {
            phoneCol = idx;
          } else if (col.includes('تولد') || col.includes('birth') || col.includes('سن') || col.includes('سال تولد')) {
            birthDateCol = idx;
          }
        });

        const eligibleVoters: Voter[] = [];
        const ineligibleVoters: { voter: Voter; reason: string }[] = [];
        const allParsedVoters: Voter[] = [];
        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let fullName = '';
          let rawNId = '';
          let phone = '';
          let rawBirthDate = '';

          if (fullNameCol !== -1) {
            fullName = String(row[fullNameCol] || '').trim();
          } else if (firstNameCol !== -1 && lastNameCol !== -1) {
            const first = String(row[firstNameCol] || '').trim();
            const last = String(row[lastNameCol] || '').trim();
            fullName = `${first} ${last}`.trim();
          } else if (lastNameCol !== -1) {
            fullName = String(row[lastNameCol] || '').trim();
          } else if (firstNameCol !== -1) {
            fullName = String(row[firstNameCol] || '').trim();
          }

          if (nIdCol !== -1) {
            rawNId = toEnglishDigits(String(row[nIdCol] || '')).trim();
          }
          if (phoneCol !== -1) {
            phone = toEnglishDigits(String(row[phoneCol] || '')).trim();
          }
          if (birthDateCol !== -1) {
            rawBirthDate = String(row[birthDateCol] || '').trim();
          }

          // Positional fallback if no header matched
          if (!fullName && firstNameCol === -1 && lastNameCol === -1 && fullNameCol === -1) {
            const hasLeadingIndex = typeof row[0] === 'number' || (/^\d+$/.test(String(row[0]).trim()) && String(row[0]).trim().length < 6);
            if (hasLeadingIndex) {
              fullName = String(row[1] || '').trim();
              rawNId = toEnglishDigits(String(row[2] || '')).trim();
              phone = toEnglishDigits(String(row[3] || '')).trim();
              rawBirthDate = String(row[4] || '').trim();
            } else {
              fullName = String(row[0] || '').trim();
              rawNId = toEnglishDigits(String(row[1] || '')).trim();
              phone = toEnglishDigits(String(row[2] || '')).trim();
              rawBirthDate = String(row[3] || '').trim();
            }
          }

          if (fullName) {
            let birthDate: string | undefined = undefined;
            let age: number | undefined = undefined;

            if (rawBirthDate) {
              const parsed = parseJalaliBirthDate(rawBirthDate);
              if (parsed && parsed.isValid) {
                birthDate = parsed.formattedBirthDate;
                age = parsed.age;
              }
            }

            const eligibility = isVoterAgeEligible(
              birthDate,
              session?.hasAgeRestriction,
              session?.minAge,
              session?.maxAge,
              session?.minBirthDate,
              session?.maxBirthDate
            );

            const vItem: Voter = {
              id: `VOT-${Date.now()}-${allParsedVoters.length + 1}`,
              rowNumber: allParsedVoters.length + 1,
              fullName,
              nationalId: rawNId || '1000000000',
              nationalIdMasked: rawNId ? maskNationalId(rawNId) : '***-****-***',
              phoneNumber: phone || '—',
              birthDate,
              age: age ?? eligibility.age,
              isAgeEligible: eligibility.isEligible,
              isDisqualified: !eligibility.isEligible && !!session?.hasAgeRestriction,
              disqualificationReason: (!eligibility.isEligible && session?.hasAgeRestriction) ? (eligibility.reason || 'خارج از بازه سنی مجاز') : undefined,
              hasVoted: false,
              status: 'NOT_CHECKED_IN',
            };

            allParsedVoters.push(vItem);

            if (session?.hasAgeRestriction && !eligibility.isEligible) {
              ineligibleVoters.push({ voter: vItem, reason: eligibility.reason || 'خارج از بازه سنی مجاز حوزه' });
            } else {
              eligibleVoters.push(vItem);
            }
          }
        }

        if (allParsedVoters.length === 0) {
          alert('هیچ سطری در فایل اکسل شناسایی نشد.');
          return;
        }

        if (session?.hasAgeRestriction && ineligibleVoters.length > 0) {
          // Open interactive review modal for ineligible voters
          setExcelIneligibleModalData({
            allVoters: allParsedVoters,
            eligibleVoters: eligibleVoters,
            ineligibleVoters: ineligibleVoters,
            fileName: file.name,
          });
        } else {
          // All are eligible or age is not restricted (سن ملاک نیست)
          onUpdateVoters(
            allParsedVoters,
            `بارگذاری ${toPersianDigits(allParsedVoters.length)} نفر از فایل اکسل (${session?.hasAgeRestriction ? 'تمامی افراد واجد شرایط سنی هستند' : 'حالت بدون محدودیت سنی - سن ملاک نیست'})`
          );
          alert(`تعداد ${toPersianDigits(allParsedVoters.length)} نفر واجد شرایط با موفقیت از فایل اکسل وارد شدند.`);
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

    let birthDate: string | undefined = undefined;
    let age: number | undefined = undefined;
    if (newBirthDate.trim()) {
      const parsed = parseJalaliBirthDate(newBirthDate);
      if (parsed && parsed.isValid) {
        birthDate = parsed.formattedBirthDate;
        age = parsed.age;
      }
    }
    const eligibility = isVoterAgeEligible(
      birthDate,
      session?.hasAgeRestriction,
      session?.minAge,
      session?.maxAge,
      session?.minBirthDate,
      session?.maxBirthDate
    );

    const isDisq = newDisqualified || (session?.hasAgeRestriction && !eligibility.isEligible);
    if (session?.hasAgeRestriction && !eligibility.isEligible && !newDisqualified) {
      const confirmDisq = confirm(
        `⚠️ توجه: این فرد بر اساس تاریخ تولد وارد شده، شرط سنی حوزه را احراز نکرده است (${eligibility.reason || 'خارج از بازه مجاز'}).\n\n` +
        `آیا مایلید با تیک «عدم احراز شرایط» ثبت شود تا در لیست بماند اما نتواند رأی دهد؟\n\n` +
        `[OK / تأیید] = ثبت با تیک عدم احراز شرایط (مسدودسازی رأی‌دهی)\n` +
        `[Cancel / انصراف] = عدم ثبت و بازگشت به فرم`
      );
      if (!confirmDisq) {
        return;
      }
    }

    const newV: Voter = {
      id: `VOT-${Date.now()}`,
      rowNumber: voters.length + 1,
      fullName: newName.trim(),
      nationalId: cleanNId || '1000000000',
      nationalIdMasked: cleanNId ? maskNationalId(cleanNId) : '***-***-***',
      phoneNumber: toEnglishDigits(newPhone).trim() || '—',
      birthDate,
      age: age ?? eligibility.age,
      isAgeEligible: eligibility.isEligible,
      isDisqualified: isDisq,
      disqualificationReason: isDisq ? (eligibility.reason || 'عدم احراز شرایط سنی مجاز حوزه') : undefined,
      hasVoted: false,
      status: 'NOT_CHECKED_IN',
    };

    onUpdateVoters(
      [...voters, newV],
      isDisq
        ? `ثبت دستی با تیک عدم احراز شرایط برای: ${newV.fullName}`
        : `ثبت دستی رأی‌دهنده جدید: ${newV.fullName}`
    );
    setNewName('');
    setNewNationalId('');
    setNewPhone('');
    setNewBirthDate('');
    setNewDisqualified(false);
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

          {/* Delete All Voters Button (Requested by User: دکمه حذف اطلاعات همه‌ی واجدین کنار دکمه بارگذاری اکسل) */}
          <button
            type="button"
            disabled={isLocked || voters.length === 0}
            onClick={() => setIsClearAllModalOpen(true)}
            className="px-3.5 py-2 bg-red-950/70 hover:bg-red-900 border border-red-700/80 text-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={voters.length === 0 ? "فهرست واجدین شرایط در حال حاضر خالی است" : "حذف کامل کلیه اطلاعات واجدین شرایط"}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>حذف اطلاعات همه‌ی واجدین</span>
          </button>

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
      <div className={`no-print grid gap-3 ${disqualifiedCount > 0 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">کل واجدین شرایط در لیست</span>
          <strong className="text-2xl font-black text-white font-mono mt-1 block">
            {toPersianDigits(totalCount)} <span className="text-xs text-slate-400 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-blue-500/30 rounded-2xl p-4 bg-blue-950/10">
          <span className="text-xs text-blue-400 font-bold block">تعرفه تحویل شد</span>
          <strong className="text-2xl font-black text-blue-300 font-mono mt-1 block">
            {toPersianDigits(ballotDeliveredCount)} <span className="text-xs text-blue-400/80 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 bg-emerald-950/10">
          <span className="text-xs text-emerald-400 font-bold block">رای داده شد</span>
          <strong className="text-2xl font-black text-emerald-300 font-mono mt-1 block">
            {toPersianDigits(votedCount)} <span className="text-xs text-emerald-400/80 font-sans">نفر</span>
          </strong>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">واجدین باقی‌مانده</span>
          <strong className="text-2xl font-black text-amber-400 font-mono mt-1 block">
            {toPersianDigits(remainingCount)} <span className="text-xs text-slate-400 font-sans">نفر</span>
          </strong>
        </div>

        {disqualifiedCount > 0 && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-4">
            <span className="text-xs text-red-300 font-bold block">⛔ عدم احراز شرایط</span>
            <strong className="text-2xl font-black text-red-400 font-mono mt-1 block">
              {toPersianDigits(disqualifiedCount)} <span className="text-xs text-red-300/80 font-sans">نفر</span>
            </strong>
          </div>
        )}
      </div>

      {/* Search and Filters (Hidden in print) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام، کدملی، شماره تماس یا ردیف..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs flex-wrap">
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              همه ({toPersianDigits(totalCount)})
            </button>
            <button
              onClick={() => setFilterState('BALLOT_DELIVERED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'BALLOT_DELIVERED' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              تعرفه تحویل شد ({toPersianDigits(ballotDeliveredCount)})
            </button>
            <button
              onClick={() => setFilterState('VOTED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'VOTED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              رای داده شد ({toPersianDigits(votedCount)})
            </button>
            <button
              onClick={() => setFilterState('NOT_VOTED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'NOT_VOTED' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              مراجعه نکرده ({toPersianDigits(remainingCount)})
            </button>
            <button
              onClick={() => setFilterState('DISQUALIFIED')}
              className={`px-3 py-1 rounded-lg transition ${filterState === 'DISQUALIFIED' ? 'bg-red-600 text-white font-bold shadow' : 'text-red-400 hover:text-red-200'}`}
            >
              ⛔ عدم احراز شرایط ({toPersianDigits(disqualifiedCount)})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-slate-900/90 p-1 rounded-xl border border-slate-700">
            <span className="text-[11px] text-slate-400 px-1.5">مرتب‌سازی:</span>
            <button
              type="button"
              onClick={() => setSortMode('FAMILY_NAME')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                sortMode === 'FAMILY_NAME' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="مرتب‌سازی الفبایی بر اساس نام خانوادگی (پیش‌فرض)"
            >
              <span>الفبای فامیلی (پیش‌فرض)</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode('ROW_NUMBER')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                sortMode === 'ROW_NUMBER' 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
              title="مرتب‌سازی بر اساس شماره ردیف ثبت‌نام"
            >
              <span>شماره ردیف</span>
            </button>
          </div>

          {disqualifiedCount > 0 && !isLocked && (
            <button
              type="button"
              onClick={handleDeleteAllDisqualifiedVoters}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="حذف دسته‌جمعی افراد فاقد شرایط سنی از لیست واجدین"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>حذف افراد فاقد شرایط ({toPersianDigits(disqualifiedCount)} نفر)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Table (Hidden in print) */}
      <div className="no-print bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700 font-medium">
              <tr>
                <th className="py-3 px-4 w-14">ردیف</th>
                <th className="py-3 px-4">
                  <span>نام و نام خانوادگی</span>
                  {sortMode === 'FAMILY_NAME' && (
                    <span className="text-[10px] text-emerald-400 font-normal mr-1.5 font-sans">(مرتب‌شده بر اساس حروف الفبای فامیلی)</span>
                  )}
                </th>
                <th className="py-3 px-4">کد ملی (محافظت‌شده)</th>
                <th className="py-3 px-4">شماره تماس / همراه</th>
                <th className="py-3 px-4 text-center">تاریخ تولد / سن</th>
                <th className="py-3 px-4 text-center">وضعیت تعرفه و رأی</th>
                <th className="py-3 px-4 text-center">اقدام منشی شعبه / عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-200">
              {sortedFilteredVoters.map((voter) => {
                const isDisq = voter.isDisqualified || (session?.hasAgeRestriction && voter.isAgeEligible === false);
                const isVoted = !isDisq && (voter.status === 'VOTED' || voter.hasVoted);
                const isDelivered = !isDisq && (voter.status === 'BALLOT_DELIVERED' || (!voter.hasVoted && !!voter.ballotDeliveredAt));

                return (
                  <tr key={voter.id} className={`transition ${isDisq ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-700/40'}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">
                      {toPersianDigits(voter.rowNumber)}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        {isDisq && (
                          <span title="عدم احراز شرایط">
                            <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          </span>
                        )}
                        <span className={isDisq ? 'text-red-200' : 'text-white'}>{voter.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {voter.nationalIdMasked}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300" dir="ltr">
                      {toPersianDigits(voter.phoneNumber)}
                    </td>
                    {/* Birth Date & Age Column */}
                    <td className="py-3 px-4 text-center">
                      {voter.birthDate ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono text-slate-200 font-semibold text-[11px]">
                            {toPersianDigits(voter.birthDate)}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {voter.age !== undefined && (
                              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 font-mono border border-slate-700/80">
                                {toPersianDigits(voter.age)} سال
                              </span>
                            )}
                            {session?.hasAgeRestriction && (
                              voter.isAgeEligible === false ? (
                                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded font-bold" title={voter.disqualificationReason || 'خارج از بازه سنی مجاز'}>
                                  عدم احراز سن
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                                  واجد شرایط
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isDisq ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm" title={voter.disqualificationReason || 'عدم احراز شرایط سنی حوزه'}>
                          <Ban className="w-3.5 h-3.5 text-red-400" />
                          <span>⛔ عدم احراز شرایط (غیرمجاز)</span>
                        </span>
                      ) : isVoted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>رای داده شد {voter.votedAt ? `(${toPersianDigits(voter.votedAt)})` : ''}</span>
                        </span>
                      ) : isDelivered ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                          <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>تعرفه تحویل شد {voter.ballotDeliveredAt ? `(${toPersianDigits(voter.ballotDeliveredAt)})` : ''}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] text-slate-400 bg-slate-800 border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>مراجعه نکرده</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {isDisq ? (
                          <>
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleToggleDisqualification(voter.id)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 transition flex items-center gap-1"
                              title="تغییر وضعیت احراز صلاحیت و رفع مسدودیت"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                              <span>رفع عدم احراز</span>
                            </button>
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => setVoterToDelete(voter)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 transition flex items-center gap-1"
                              title={`حذف «${voter.fullName}» از فهرست واجدین شرایط`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>حذف از لیست</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {!isDelivered && !isVoted && (
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => {
                                  audioFeedback.playVoterCheckin();
                                  if (onSetVoterStatus) {
                                    onSetVoterStatus(voter.id, 'BALLOT_DELIVERED');
                                  } else {
                                    onToggleVoterStatus(voter.id);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition flex items-center gap-1"
                                title="تحویل برگه تعرفه به رأی‌دهنده"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>تحویل تعرفه</span>
                              </button>
                            )}

                            {isDelivered && (
                              <>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    audioFeedback.playScanSuccess();
                                    if (onSetVoterStatus) {
                                      onSetVoterStatus(voter.id, 'VOTED');
                                    } else {
                                      onToggleVoterStatus(voter.id);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1"
                                  title="تایید انداختن رأی در صندوق"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ثبت رای داده شد</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    if (onSetVoterStatus) {
                                      onSetVoterStatus(voter.id, 'NOT_CHECKED_IN');
                                    } else {
                                      onToggleVoterStatus(voter.id);
                                    }
                                  }}
                                  className="px-2 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                                  title="لغو تحویل تعرفه"
                                >
                                  لغو
                                </button>
                              </>
                            )}

                            {isVoted && (
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => {
                                  if (onSetVoterStatus) {
                                    onSetVoterStatus(voter.id, 'BALLOT_DELIVERED');
                                  } else {
                                    onToggleVoterStatus(voter.id);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                title="بازگردانی به وضعیت تعرفه تحویل شد"
                              >
                                لغو رأی
                              </button>
                            )}

                            {/* Mark as Disqualified button */}
                            {!isVoted && (
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleToggleDisqualification(voter.id)}
                                className="p-1.5 rounded-xl text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-700/80 transition"
                                title="تیک عدم احراز شرایط (مسدودسازی رأی‌دهی)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Individual Delete Button (Requested: در لیست دکمه حذف فرد ایجاد کن) */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => setVoterToDelete(voter)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/50 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-800/60 transition shadow-sm flex items-center gap-1 disabled:opacity-40"
                              title={`حذف «${voter.fullName}» از فهرست واجدین شرایط`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>حذف فرد</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      {(() => {
        const printSortedVoters = sortVotersByFamilyName(voters);
        const halfCount = Math.ceil(printSortedVoters.length / 2);

        return (
          <div className="print-only hidden p-2 bg-white text-black" dir="rtl">
            <div className="text-center border-b-2 border-black pb-1 mb-2">
              <h2 className="text-xs font-black">دفترچه رسمی واجدین شرایط و کنترل تعرفه رأی‌دهندگان (مرتب‌شده الفبایی بر اساس نام خانوادگی)</h2>
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
                  {printSortedVoters.slice(0, halfCount).map((v) => {
                    const isDisq = v.isDisqualified || (session?.hasAgeRestriction && v.isAgeEligible === false);
                    return (
                      <tr key={v.id} className={`border-b border-black ${isDisq ? 'bg-red-50' : ''}`}>
                        <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.rowNumber)}</td>
                        <td className="border border-black p-0.5 font-bold truncate max-w-[90px]">{v.fullName}</td>
                        <td className="border border-black p-0.5 text-center font-mono">{v.nationalIdMasked}</td>
                        <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.phoneNumber)}</td>
                        <td className="border border-black p-0.5 text-center text-[7px] font-bold">
                          {isDisq
                            ? '⛔ عدم احراز'
                            : v.status === 'VOTED' || v.hasVoted
                            ? '✓ رای داده شد'
                            : v.status === 'BALLOT_DELIVERED' || v.ballotDeliveredAt
                            ? '✓ تعرفه تحویل'
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
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
                  {printSortedVoters.slice(halfCount).map((v) => {
                    const isDisq = v.isDisqualified || (session?.hasAgeRestriction && v.isAgeEligible === false);
                    return (
                      <tr key={v.id} className={`border-b border-black ${isDisq ? 'bg-red-50' : ''}`}>
                        <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.rowNumber)}</td>
                        <td className="border border-black p-0.5 font-bold truncate max-w-[90px]">{v.fullName}</td>
                        <td className="border border-black p-0.5 text-center font-mono">{v.nationalIdMasked}</td>
                        <td className="border border-black p-0.5 text-center font-mono">{toPersianDigits(v.phoneNumber)}</td>
                        <td className="border border-black p-0.5 text-center text-[7px] font-bold">
                          {isDisq
                            ? '⛔ عدم احراز'
                            : v.status === 'VOTED' || v.hasVoted
                            ? '✓ رای داده شد'
                            : v.status === 'BALLOT_DELIVERED' || v.ballotDeliveredAt
                            ? '✓ تعرفه تحویل'
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">تاریخ تولد شمسی (اختیاری):</label>
                <input
                  type="text"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  placeholder="مثال: 1370/05/12 یا 1370"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                />
                {newBirthDate.trim() && (() => {
                  const parsed = parseJalaliBirthDate(newBirthDate);
                  if (!parsed || !parsed.isValid) {
                    return <span className="text-[10px] text-amber-400 mt-1 block">فرمت صحیح: 1375/04/20 یا 1375</span>;
                  }
                  const eligibility = isVoterAgeEligible(
                    parsed.formattedBirthDate,
                    session?.hasAgeRestriction,
                    session?.minAge,
                    session?.maxAge,
                    session?.minBirthDate,
                    session?.maxBirthDate
                  );
                  return (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 font-mono">
                          سن محاسبه‌شده: {toPersianDigits(parsed.age)} سال (متولد {toPersianDigits(parsed.birthYear)})
                        </span>
                        {session?.hasAgeRestriction ? (
                          eligibility.isEligible ? (
                            <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                              ✓ واجد شرایط سنی
                            </span>
                          ) : (
                            <span className="text-red-300 font-bold bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                              ⚠️ فاقد شرایط سنی مجاز
                            </span>
                          )
                        ) : (
                          <span className="text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                            سن ملاک نیست (واجد شرایط)
                          </span>
                        )}
                      </div>

                      {session?.hasAgeRestriction && !eligibility.isEligible && (
                        <div className="bg-red-950/50 border border-red-700/80 p-3 rounded-xl text-xs text-red-200 space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-red-300">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>علت عدم احراز: {eligibility.reason}</span>
                          </div>
                          <p className="text-[11px] text-red-200/90 leading-relaxed">
                            این فرد خارج از بازه سنی تعیین‌شده متولد شده است. در صورت ثبت، تیک «عدم احراز شرایط» اعمال و صدور تعرفه برای وی مسدود خواهد شد.
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-red-800/60">
                            <input
                              type="checkbox"
                              checked={newDisqualified}
                              onChange={(e) => setNewDisqualified(e.target.checked)}
                              className="rounded text-red-600 focus:ring-red-500 bg-slate-900 border-red-700"
                            />
                            <span className="text-xs font-bold text-red-300">
                              ثبت با تیک «عدم احراز شرایط» (غیرمجاز برای رأی‌دهی)
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  تاریخ تولد شمسی (اختیاری جهت رده سنی):
                </label>
                <input
                  type="text"
                  value={quickBirthDate}
                  onChange={(e) => setQuickBirthDate(e.target.value)}
                  placeholder="مثال: 1370/05/12 یا 1370"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  فرمت مجاز: YYYY/MM/DD یا چهار رقم سال تولد (مثال: ۱۳۷۲)
                </span>
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

      {/* Clear All Voters Confirmation Modal (Requested: دکمه حذف اطلاعات همه ی واجدین) */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-red-500/70 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100 text-right" dir="rtl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-500/20 rounded-2xl border border-red-500/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">حذف کامل اطلاعات تمامی واجدین شرایط</h4>
                <p className="text-xs text-red-300">هشدار: این عملیات غیرقابل بازگشت است</p>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-800/60 p-4 rounded-2xl text-xs text-red-200 leading-relaxed">
              آیا از حذف اطلاعات تمامی <strong className="text-white font-mono">{toPersianDigits(voters.length)}</strong> نفر واجد شرایط موجود در این جلسه انتخابات اطمینان کامل دارید؟ کلیه اسامی، سوابق کدهای ملی و وضعیت تعرفه‌ها پاک خواهند شد.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllVoters) {
                    onClearAllVoters();
                  } else {
                    onUpdateVoters([], 'حذف کامل اطلاعات تمامی واجدین شرایط توسط اپراتور');
                  }
                  setIsClearAllModalOpen(false);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/60 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، حذف اطلاعات همه‌ی واجدین</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Voter Confirmation Modal (Requested: در لیست دکمه حذف فرد ایجاد کن) */}
      {voterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100 text-right" dir="rtl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-500/20 rounded-2xl border border-red-500/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">حذف فرد از فهرست واجدین شرایط</h4>
                <p className="text-xs text-slate-400">حذف مشخصات رأی‌دهنده انتخاب‌شده</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-xs text-slate-300 space-y-1.5">
              <p>
                آیا از حذف <strong className="text-white">«{voterToDelete.fullName}»</strong> با کد ملی <code className="text-emerald-400 font-mono">{toPersianDigits(voterToDelete.nationalIdMasked)}</code> از فهرست اطمینان دارید؟
              </p>
              {(voterToDelete.hasVoted || voterToDelete.status === 'VOTED') && (
                <p className="text-amber-400 text-[11px] font-bold">
                  ⚠️ توجه: برای این فرد تعرفه یا رأی ثبت شده بود.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setVoterToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteVoter) {
                    onDeleteVoter(voterToDelete.id);
                  } else {
                    const remaining = voters.filter(v => v.id !== voterToDelete.id).map((v, idx) => ({ ...v, rowNumber: idx + 1 }));
                    onUpdateVoters(remaining, `حذف رأی‌دهنده «${voterToDelete.fullName}» از فهرست واجدین شرایط`);
                  }
                  setVoterToDelete(null);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/60 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأیید و حذف این فرد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Ineligible Voters Action Modal */}
      {excelIneligibleModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100 text-right max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/40">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">بررسی فاقدین شرایط سنی در فایل اکسل</h4>
                <p className="text-xs text-amber-300">فایل ورودی: {excelIneligibleModalData.fileName}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">کل افراد در فایل</span>
                <strong className="text-lg font-bold text-white font-mono">{toPersianDigits(excelIneligibleModalData.allVoters.length)} نفر</strong>
              </div>
              <div>
                <span className="text-[11px] text-emerald-400 block">واجدین شرایط سنی</span>
                <strong className="text-lg font-bold text-emerald-300 font-mono">{toPersianDigits(excelIneligibleModalData.eligibleVoters.length)} نفر</strong>
              </div>
              <div>
                <span className="text-[11px] text-red-400 block">فاقدین شرایط سنی</span>
                <strong className="text-lg font-bold text-red-300 font-mono">{toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر</strong>
              </div>
            </div>

            <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col min-h-0">
              <span className="text-xs font-bold text-slate-300">
                فهرست افراد شناسایی‌شده خارج از بازه سنی مجاز:
              </span>
              <div className="overflow-y-auto max-h-48 border border-slate-800 rounded-xl bg-slate-950/60 divide-y divide-slate-800">
                {excelIneligibleModalData.ineligibleVoters.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-900/50">
                    <div>
                      <strong className="text-white block">{toPersianDigits(idx + 1)}. {item.voter.fullName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        کد ملی: {toPersianDigits(item.voter.nationalIdMasked)} | تولد: {item.voter.birthDate ? toPersianDigits(item.voter.birthDate) : 'نامشخص'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-red-300 bg-red-950/80 px-2 py-1 rounded border border-red-800">
                      {item.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              لطفاً یکی از گزینه‌های زیر را انتخاب فرمایید: می‌توانید افراد فاقد شرایط سنی را با <strong>«تیک عدم احراز شرایط»</strong> وارد کنید تا در سیستم مسدود شوند و امکان رأی‌دهی نداشته باشند، و یا آنها را به طور کامل از فهرست <strong>«حذف»</strong> کنید.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExcelIneligibleModalData(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                انصراف و لغو
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateVoters(
                    excelIneligibleModalData.eligibleVoters,
                    `بارگذاری اکسل با حذف ${toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر فاقد شرایط سنی (فقط واجدین شرایط وارد شدند)`
                  );
                  alert(`تعداد ${toPersianDigits(excelIneligibleModalData.eligibleVoters.length)} نفر واجد شرایط با موفقیت وارد شدند.\nافراد فاقد شرایط سنی (${toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر) از لیست حذف شدند.`);
                  setExcelIneligibleModalData(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف فاقدین شرایط از لیست ({toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateVoters(
                    excelIneligibleModalData.allVoters,
                    `بارگذاری اکسل همراه با تیک عدم احراز شرایط برای ${toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر فاقد شرایط سنی`
                  );
                  alert(`تعداد ${toPersianDigits(excelIneligibleModalData.allVoters.length)} نفر وارد شدند.\nتعداد ${toPersianDigits(excelIneligibleModalData.ineligibleVoters.length)} نفر فاقد شرایط سنی با تیک «عدم احراز شرایط» علامت‌گذاری شده و حق رأی نخواهند داشت.`);
                  setExcelIneligibleModalData(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/60 transition"
              >
                <Ban className="w-4 h-4 text-slate-950" />
                <span>تیک عدم احراز شرایط (ماندن در لیست با مسدودسازی رأی)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
