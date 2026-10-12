import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Candidate, Operator } from '../types/election';
import { 
  validateIranianNationalId, 
  maskNationalId, 
  toPersianDigits, 
  toEnglishDigits,
  generateValidSyntheticNationalId 
} from '../utils/persian';
import { SYNTHETIC_CANDIDATE_POOL } from '../utils/mockData';
import { 
  exportCandidatesListToExcel, 
  exportCandidatesTemplateToExcel 
} from '../utils/export';
import { 
  UserPlus, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  Calendar, 
  Hash, 
  Award,
  Lock,
  Crop,
  Camera,
  Upload,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';
import { LicenseActivationModal } from './LicenseActivationModal';
import { getLicenseStatus } from '../utils/license';

interface CandidatesTabProps {
  candidates: Candidate[];
  currentOperator: Operator;
  isLocked: boolean;
  onAddCandidate: (candidateData: Omit<Candidate, 'id' | 'votes' | 'registrationOrder'>) => void;
  onGenerateSyntheticCandidates: () => void;
  onUpdateCandidatePhoto?: (candidateId: string, newPhotoUrl: string) => void;
  onUpdateCandidate?: (candidateId: string, updatedData: Partial<Candidate>) => void;
  onDeleteCandidate?: (candidateId: string) => void;
}

export const CandidatesTab: React.FC<CandidatesTabProps> = ({
  candidates,
  currentOperator,
  isLocked,
  onAddCandidate,
  onGenerateSyntheticCandidates,
  onUpdateCandidatePhoto,
  onUpdateCandidate,
  onDeleteCandidate,
}) => {
  const [name, setName] = useState('');
  const [candidateNumber, setCandidateNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [affiliation, setAffiliation] = useState('مستقل');
  const [birthYear, setBirthYear] = useState<number>(1360);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Candidate Modal State
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editName, setEditName] = useState('');
  const [editCandidateNumber, setEditCandidateNumber] = useState('');
  const [editAffiliation, setEditAffiliation] = useState('');
  const [editBirthYear, setEditBirthYear] = useState<number>(1360);
  const [editBio, setEditBio] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Delete Candidate Modal State
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);

  // Cropper Modal state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperTargetCandidate, setCropperTargetCandidate] = useState<Candidate | null>(null);
  const [cropperInitialImage, setCropperInitialImage] = useState<string>('');

  const handleOpenCropperForNew = () => {
    setCropperTargetCandidate(null);
    setCropperInitialImage(avatarUrl);
    setIsCropperOpen(true);
  };

  const handleOpenCropperForExisting = (cand: Candidate) => {
    setCropperTargetCandidate(cand);
    setCropperInitialImage(cand.avatarUrl);
    setIsCropperOpen(true);
  };

  const handleOpenCropperForEdit = () => {
    if (!editingCandidate) return;
    setCropperTargetCandidate(editingCandidate);
    setCropperInitialImage(editAvatarUrl || editingCandidate.avatarUrl);
    setIsCropperOpen(true);
  };

  const handleConfirmCroppedImage = (croppedDataUrl: string) => {
    if (editingCandidate && cropperTargetCandidate?.id === editingCandidate.id) {
      setEditAvatarUrl(croppedDataUrl);
      if (onUpdateCandidatePhoto) {
        onUpdateCandidatePhoto(editingCandidate.id, croppedDataUrl);
      }
    } else if (cropperTargetCandidate) {
      if (onUpdateCandidatePhoto) {
        onUpdateCandidatePhoto(cropperTargetCandidate.id, croppedDataUrl);
      }
    } else {
      setAvatarUrl(croppedDataUrl);
    }
  };

  // License Prompt Modal State
  const [isLicensePromptOpen, setIsLicensePromptOpen] = useState(false);
  const [licensePromptAction, setLicensePromptAction] = useState('تعریف و مدیریت نامزدها');

  const checkLicenseOrPrompt = (actionDesc: string): boolean => {
    const lic = getLicenseStatus();
    if (!lic.isLicensed) {
      setLicensePromptAction(actionDesc);
      setIsLicensePromptOpen(true);
      return false;
    }
    return true;
  };

  const handleOpenEdit = (cand: Candidate) => {
    if (!checkLicenseOrPrompt('ویرایش مشخصات نامزد')) return;
    setEditingCandidate(cand);
    setEditName(cand.name);
    setEditCandidateNumber(cand.candidateNumber);
    setEditAffiliation(cand.affiliation);
    setEditBirthYear(cand.birthYear);
    setEditBio(cand.bio);
    setEditNationalId('');
    setEditAvatarUrl(cand.avatarUrl);
    setEditErrorMsg('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    if (!editName.trim()) {
      setEditErrorMsg('نام و نام خانوادگی کاندیدا نمی‌تواند خالی باشد.');
      return;
    }

    if (!editCandidateNumber.trim()) {
      setEditErrorMsg('کد انتخاباتی نمی‌تواند خالی باشد.');
      return;
    }

    // Check code uniqueness with other candidates
    const duplicate = candidates.some(
      (c) => c.id !== editingCandidate.id && c.candidateNumber === editCandidateNumber.trim()
    );
    if (duplicate) {
      setEditErrorMsg(`کد انتخاباتی ${toPersianDigits(editCandidateNumber)} قبلاً به نامزد دیگری تخصیص یافته است.`);
      return;
    }

    const updatedData: Partial<Candidate> = {
      name: editName.trim(),
      candidateNumber: editCandidateNumber.trim(),
      affiliation: editAffiliation.trim() || 'مستقل',
      birthYear: Number(editBirthYear) || 1360,
      bio: editBio.trim() || 'نامزد تایید صلاحیت شده انتخابات',
      avatarUrl: editAvatarUrl || editingCandidate.avatarUrl,
    };

    if (editNationalId.trim()) {
      if (!validateIranianNationalId(editNationalId.trim())) {
        setEditErrorMsg('کد ملی وارد شده نامعتبر است (باید ۱۰ رقم و مطابق الگوریتم ثبت‌احوال باشد).');
        return;
      }
      updatedData.nationalIdMasked = maskNationalId(editNationalId.trim());
    }

    if (onUpdateCandidate) {
      onUpdateCandidate(editingCandidate.id, updatedData);
    }

    setEditingCandidate(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingCandidate) return;
    if (onDeleteCandidate) {
      onDeleteCandidate(deletingCandidate.id);
    }
    setDeletingCandidate(null);
  };

  const candidateFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadCandidateTemplate = () => {
    exportCandidatesTemplateToExcel();
  };

  const handleExportCandidates = () => {
    exportCandidatesListToExcel(candidates);
  };

  const handleCandidateExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkLicenseOrPrompt('بارگذاری نامزدها از فایل اکسل')) {
      e.target.value = '';
      return;
    }
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
          alert('فایل اکسل (.xlsx) انتخابی حاوی اطلاعات نامزدها نیست.');
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row.length >= 2) {
            const cNum = String(row[0] || '').trim();
            const cName = String(row[1] || '').trim();
            const rawNId = toEnglishDigits(String(row[2] || '')).trim();
            const aff = String(row[3] || 'مستقل').trim();
            const bYear = Number(toEnglishDigits(String(row[4] || '1360'))) || 1360;
            const bBio = String(row[5] || 'نامزد تایید صلاحیت شده').trim();

            if (cName && cNum) {
              const masked = rawNId ? maskNationalId(rawNId) : '***-****-***';
              onAddCandidate({
                name: cName,
                candidateNumber: cNum,
                nationalIdMasked: masked,
                affiliation: aff,
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
                birthYear: bYear,
                bio: bBio,
                status: 'APPROVED',
              });
              importedCount++;
            }
          }
        }
        if (importedCount > 0) {
          alert(`تعداد ${toPersianDigits(importedCount)} نامزد با موفقیت از فایل اکسل (.xlsx) وارد شدند.`);
        } else {
          alert('هیچ سطری در فایل اکسل نامزدها شناسایی نشد.');
        }
      } catch (err) {
        alert('خطا در پردازش فایل اکسل (.xlsx) نامزدها.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleFillSyntheticNId = () => {
    const synthetic = generateValidSyntheticNationalId(Date.now() % 1000);
    setNationalId(synthetic);
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!checkLicenseOrPrompt('ثبت و تعریف نامزد جدید در سامانه')) {
      return;
    }

    if (!name.trim()) {
      setErrorMsg('نام و نام خانوادگی نامزد الزامی است.');
      return;
    }

    if (!candidateNumber.trim()) {
      setErrorMsg('کد انتخاباتی نامزد الزامی است.');
      return;
    }

    // Uniqueness check for candidate number
    if (candidates.some((c) => c.candidateNumber === candidateNumber.trim())) {
      setErrorMsg(`کد انتخاباتی ${toPersianDigits(candidateNumber)} قبلاً به نامزد دیگری تخصیص یافته است.`);
      return;
    }

    // Validate 10-digit Iranian National ID
    if (!validateIranianNationalId(nationalId)) {
      setErrorMsg('کد ملی وارد شده نامعتبر است (باید ۱۰ رقم و مطابق الگوریتم اعتبارسنجی ثبت‌احوال باشد). برای نمونه آزمایشی می‌توانید دکمه "تولید کد ملی مصنوعی" را بزنید.');
      return;
    }

    // Mask the national ID immediately for storage/presentation to guarantee privacy
    const masked = maskNationalId(nationalId);

    onAddCandidate({
      name: name.trim(),
      candidateNumber: candidateNumber.trim(),
      nationalIdMasked: masked,
      affiliation: affiliation.trim() || 'مستقل',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
      birthYear: Number(birthYear) || 1360,
      bio: bio.trim() || 'نامزد تایید صلاحیت شده انتخابات',
      status: 'APPROVED',
    });

    setSuccessMsg(`نامزد محترم «${name.trim()}» با کد ${toPersianDigits(candidateNumber)} با موفقیت ثبت شد.`);
    setName('');
    setCandidateNumber(String(100 + candidates.length + 2));
    setNationalId('');
    setBio('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span>فهرست نامزدهای رسمی و ثبت‌نام جدید</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            اعتبارسنجی دقیق الگوریتم کد ملی، ماسک‌گذاری دائمی برای حفظ حریم خصوصی، و تعریف ویژگی‌های شکستن تساوی
          </p>
        </div>

        {/* Action Buttons: Excel .xlsx Tools & Synthetic */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Template .xlsx */}
          <button
            type="button"
            onClick={handleDownloadCandidateTemplate}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition"
            title="دانلود فایل اکسل نمونه جهت آماده‌سازی مشخصات نامزدها"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>قالب اکسل (.xlsx)</span>
          </button>

          {/* Import .xlsx */}
          {!isLocked && (
            <>
              <button
                type="button"
                onClick={() => candidateFileInputRef.current?.click()}
                className="px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
                title="بارگذاری اسامی و مشخصات نامزدها از فایل اکسل"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>بارگذاری اکسل (.xlsx)</span>
              </button>
              <input
                ref={candidateFileInputRef}
                type="file"
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleCandidateExcelUpload}
                className="hidden"
              />
            </>
          )}

          {/* Export Candidates to .xlsx */}
          {candidates.length > 0 && (
            <button
              type="button"
              onClick={handleExportCandidates}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition"
              title="دریافت فایل اکسل فهرست نامزدهای ثبت‌شده"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>خروجی (.xlsx)</span>
            </button>
          )}

          {!isLocked && (
            <button
              type="button"
              onClick={onGenerateSyntheticCandidates}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600/60 to-teal-600/60 hover:from-emerald-600 hover:to-teal-600 text-emerald-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-emerald-500/30 transition"
              title="تولید نامزدهای تستی برای بررسی فرآیند انتخابات"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>نامزدهای نمونه</span>
            </button>
          )}
        </div>
      </div>

      {/* Demo Mode Notice Banner (Point 4) */}
      {!getLicenseStatus().isLicensed && (
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-2 border-amber-500/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-300">
                نسخه آزمایشی (دمو رایگان) سامانه انتخابات
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                شما می‌توانید از نامزدهای نمونه جهت بررسی و تست سامانه استفاده فرمایید. برای <strong>ثبت و تعریف نامزدهای رسمی، ویرایش مشخصات یا بارگذاری فایل اکسل</strong>، تهیه و فعال‌سازی کلید لایسنس الزامی است.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLicensePromptAction('ثبت و تعریف نامزدهای رسمی انتخابات');
              setIsLicensePromptOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50 whitespace-nowrap transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>خرید و فعال‌سازی لایسنس</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Candidate Registration Form */}
        <div className="lg:col-span-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700 text-slate-100">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-sm">فرم ثبت نامزد جدید</h4>
          </div>

          {!isLocked ? (
            <form onSubmit={handleCreateCandidate} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  نام و نام خانوادگی: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: دکتر علیرضا نادری"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Candidate Code & Birth Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    کد انتخاباتی: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(e.target.value)}
                    placeholder="مثال: ۱۱۰"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white text-center font-mono placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    سال تولد (شمسی):
                  </label>
                  <input
                    type="number"
                    min="1320"
                    max="1385"
                    value={birthYear}
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white text-center font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* National ID with Privacy Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    شناسه ملی ۱۰ رقمی: <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSyntheticNId}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>تولید کد آزمایشی معتبر</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="۱۰ رقم کد ملی برای اعتبارسنجی"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 outline-none focus:border-emerald-500"
                />
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>کد ملی ماسک‌گذاری شده و هرگز علنی نمایش داده نمی‌شود.</span>
                </div>
              </div>

              {/* Affiliation */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ائتلاف، جناح یا عنوان:
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="مستقل یا نام ائتلاف"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  تصویر رسمی نامزد:
                </label>
                <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={handleOpenCropperForNew}
                      className="relative group cursor-pointer"
                      title="کلیک برای انتخاب عکس از حافظه کامپیوتر و تنظیم در کادر"
                    >
                      <img 
                        src={avatarUrl} 
                        alt="پیش‌نمایش" 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md group-hover:opacity-80 transition" 
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Crop className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={handleOpenCropperForNew}
                        className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition"
                      >
                        <Upload className="w-4 h-4" />
                        <span>انتخاب از حافظه کامپیوتر و تنظیم در کادر</span>
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1 text-center">
                        امکان برش، زوم، چرخش و تنظیم دقیق پرتره در کادر
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400 flex-shrink-0">یا انتخاب تصویر نمونه:</span>
                    <select
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none w-full"
                    >
                      {SYNTHETIC_CANDIDATE_POOL.map((p, idx) => (
                        <option key={idx} value={p.avatarUrl}>
                          نمونه چهره {toPersianDigits(idx + 1)} ({p.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  معرفی کوتاه و سوابق:
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="خلاصه سوابق تحصیلی و اجرایی..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-900/30 transition flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>ثبت نامزد در فهرست رسمی</span>
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              <Lock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <span>جلسه قفل شده است؛ امکان ثبت نامزد جدید وجود ندارد.</span>
            </div>
          )}
        </div>

        {/* Candidate List Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>تعداد نامزدهای ثبت‌شده: <strong className="text-white">{toPersianDigits(candidates.length)} نفر</strong></span>
            <span>مرتب‌سازی اولیه: شماره ردیف ثبت‌نام</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {candidates.map((cand) => (
              <div 
                key={cand.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex gap-3.5 hover:border-slate-600 transition"
              >
                <div className="flex flex-col items-center flex-shrink-0">
                  <img
                    src={cand.avatarUrl}
                    alt={cand.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-600 shadow-md"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleOpenCropperForExisting(cand)}
                      className="mt-1.5 px-2 py-0.5 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1 transition"
                      title="ویرایش یا انتخاب عکس جدید از کامپیوتر و تنظیم در کادر"
                    >
                      <Crop className="w-3 h-3 text-emerald-400" />
                      <span>تنظیم عکس</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="font-bold text-white text-sm truncate">{cand.name}</h5>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-700 rounded-lg">
                      کد {toPersianDigits(cand.candidateNumber)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{cand.affiliation}</p>
                  
                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 font-mono">
                    <div>کد ملی: <span className="text-slate-300">{cand.nationalIdMasked}</span></div>
                    <div>متولد: <span className="text-slate-300">{toPersianDigits(cand.birthYear)}</span> • ردیف: <span className="text-slate-300">{toPersianDigits(cand.registrationOrder)}</span></div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                    <span className="text-emerald-400 font-medium">وضعیت: تایید صلاحیت رسمی</span>
                    <span className="font-bold text-slate-200">{toPersianDigits(cand.votes)} رأی</span>
                  </div>

                  {!isLocked && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cand)}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-indigo-500/30 transition"
                        title="ویرایش مشخصات، نام، کد انتخاباتی و ائتلاف"
                      >
                        <Pencil className="w-3 h-3 text-indigo-400" />
                        <span>ویرایش</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingCandidate(cand)}
                        className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-red-500/30 transition"
                        title="حذف نامزد از فهرست رسمی"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>حذف</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 my-8 shadow-2xl animate-in fade-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">
                    ویرایش مشخصات کاندیدا: {editingCandidate.name}
                  </h4>
                  <p className="text-xs text-slate-400">کد انتخاباتی: {toPersianDigits(editingCandidate.candidateNumber)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* Photo & Cropper trigger */}
              <div className="flex items-center gap-3.5 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                <img
                  src={editAvatarUrl || editingCandidate.avatarUrl}
                  alt={editName}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500/50 shadow-md flex-shrink-0"
                />
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={handleOpenCropperForEdit}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>انتخاب / تنظیم عکس جدید از کامپیوتر</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">
                    برش، زوم و تنظیم پرتره در کادر اختصاصی
                  </p>
                </div>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    نام و نام خانوادگی کاندیدا: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    کد انتخاباتی (عددی): <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCandidateNumber}
                    onChange={(e) => setEditCandidateNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Affiliation & Birth Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    ائتلاف / وابستگی:
                  </label>
                  <input
                    type="text"
                    value={editAffiliation}
                    onChange={(e) => setEditAffiliation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    سال تولد (شکستن تساوی سن):
                  </label>
                  <input
                    type="number"
                    min={1300}
                    max={1410}
                    value={editBirthYear}
                    onChange={(e) => setEditBirthYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Optional New National ID */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  کد ملی (اختیاری جهت ویرایش یا اعتبارسنجی مجدد):
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={editNationalId}
                  onChange={(e) => setEditNationalId(e.target.value)}
                  placeholder={`کد ملی کنونی: ${editingCandidate.nationalIdMasked}`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder:font-sans placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  خلاصه سوابق و معرفی:
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none resize-none focus:border-indigo-500"
                />
              </div>

              {editErrorMsg && (
                <div className="p-2.5 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>ذخیره تغییرات کاندیدا</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Candidate Confirmation Modal */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100" dir="rtl">
            <div className="flex items-center gap-3 text-red-400 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-red-500/20 rounded-2xl flex-shrink-0">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">تأیید حذف نامزد از انتخابات</h4>
                <p className="text-xs text-slate-400">حذف قطعی کاندیدا و خارج‌سازی از فهرست رسمی</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
              <img
                src={deletingCandidate.avatarUrl}
                alt={deletingCandidate.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-600 flex-shrink-0"
              />
              <div className="min-w-0">
                <h5 className="font-bold text-sm text-white truncate">{deletingCandidate.name}</h5>
                <p className="text-xs text-slate-400">کد انتخاباتی: {toPersianDigits(deletingCandidate.candidateNumber)}</p>
                <p className="text-xs text-emerald-400 mt-0.5">آرای مأخوذه: {toPersianDigits(deletingCandidate.votes)} رأی</p>
              </div>
            </div>

            {deletingCandidate.votes > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
                ⚠️ هشدار: برای این نامزد تعداد <strong>{toPersianDigits(deletingCandidate.votes)} رأی</strong> ثبت شده است. با حذف وی، این نامزد از جدول شمارش و رتبه‌بندی کنار گذاشته می‌شود.
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              آیا از حذف نامزد «<strong>{deletingCandidate.name}</strong>» اطمینان دارید؟ این عملیات در دفتر ممیزی با نام اپراتور ثبت خواهد شد.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                انصراف و بازگشت
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/60 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، کاندیدا حذف شود</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onConfirmCrop={handleConfirmCroppedImage}
        initialImageUrl={cropperInitialImage}
        title={
          cropperTargetCandidate
            ? `انتخاب و تنظیم تصویر «${cropperTargetCandidate.name}» در کادر پرتره`
            : 'انتخاب تصویر از کامپیوتر و تنظیم در کادر رسمی پرتره'
        }
      />

      {/* License Activation & Purchase Modal (Point 4) */}
      <LicenseActivationModal
        isOpen={isLicensePromptOpen}
        onClose={() => setIsLicensePromptOpen(false)}
        onActivated={() => {
          setIsLicensePromptOpen(false);
          setSuccessMsg('لایسنس رسمی با موفقیت فعال گردید. امکان تعریف و مدیریت کلیه کاندیداها برقرار است.');
        }}
        actionTitle={licensePromptAction}
      />
    </div>
  );
};
