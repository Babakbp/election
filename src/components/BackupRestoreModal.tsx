import React, { useState, useEffect } from 'react';
import { ElectionSession, Candidate, AuditEvent, Operator, Voter } from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { 
  selectBackupDirectory, 
  getBackupFolderInfo, 
  setCustomBackupPath, 
  saveBackupToFolderOrDownload, 
  saveToCloudVault, 
  getCloudVaultSnapshots, 
  deleteCloudVaultSnapshot,
  CloudBackupSnapshot,
  STORAGE_KEY_AUTO_BACKUP,
  isFileSystemAccessSupported
} from '../utils/fileBackupStorage';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  FileJson,
  CheckCircle2,
  FolderPlus,
  FolderCheck,
  Cloud,
  CloudUpload,
  HardDrive,
  Usb,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ElectionSession;
  candidates: Candidate[];
  auditEvents: AuditEvent[];
  operators: Operator[];
  voters?: Voter[];
  onRestoreData: (data: {
    session: ElectionSession;
    candidates: Candidate[];
    auditEvents: AuditEvent[];
    operators?: Operator[];
    voters?: Voter[];
  }) => void;
  onResetSession: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  session,
  candidates,
  auditEvents,
  operators,
  voters = [],
  onRestoreData,
  onResetSession,
}) => {
  const [activeTab, setActiveTab] = useState<'FOLDER' | 'CLOUD' | 'RESTORE'>('FOLDER');
  const [folderInfo, setFolderInfo] = useState<{ folderName: string; customPath: string; hasPersistentHandle: boolean }>({
    folderName: '',
    customPath: '',
    hasPersistentHandle: false,
  });
  const [saveStatusMsg, setSaveStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cloudSnapshots, setCloudSnapshots] = useState<CloudBackupSnapshot[]>([]);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolderInfo();
      loadCloudSnapshots();
    }
  }, [isOpen]);

  const loadFolderInfo = async () => {
    const info = await getBackupFolderInfo();
    setFolderInfo(info);
  };

  const loadCloudSnapshots = () => {
    const snaps = getCloudVaultSnapshots();
    setCloudSnapshots(snaps);
  };

  if (!isOpen) return null;

  // 1. Choose folder on PC or USB Flash drive
  const handleSelectFolder = async () => {
    setSaveStatusMsg(null);
    const res = await selectBackupDirectory();
    if (res.success) {
      setFolderInfo(prev => ({
        ...prev,
        folderName: res.folderName,
        hasPersistentHandle: true,
      }));
      setSaveStatusMsg({
        type: 'success',
        text: `پوشه «${res.folderName}» با موفقیت به عنوان مسیر پیش‌فرض ذخیره در کامپیوتر یا فلش تعیین شد. دفعات بعد تمام فایل‌ها در همین پوشه ذخیره می‌شوند.`,
      });
    } else if (res.error) {
      setSaveStatusMsg({
        type: 'error',
        text: res.error,
      });
    }
  };

  // 2. Save backup into the configured folder or download
  const handleSaveToConfiguredFolder = async () => {
    setIsSaving(true);
    setSaveStatusMsg(null);
    try {
      const res = await saveBackupToFolderOrDownload({
        session,
        candidates,
        auditEvents,
        operators,
        voters,
      });

      if (res.method === 'DIRECT_FOLDER') {
        setSaveStatusMsg({
          type: 'success',
          text: `فایل «${res.fileName}» مستقیماً درون پوشه «${res.folderName}» در کامپیوتر/فلش با کد هش SHA-256 ذخیره شد.`,
        });
      } else {
        setSaveStatusMsg({
          type: 'success',
          text: `فایل «${res.fileName}» با موفقیت دانلود و صادر شد. برای نگهداری امن آن را به پوشه انتخابی یا فلش مموری منتقل کنید.`,
        });
      }
    } catch (e: any) {
      setSaveStatusMsg({
        type: 'error',
        text: e.message || 'خطا در ذخیره‌سازی فایل پشتیبان',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Cloud Vault backup
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    setSaveStatusMsg(null);
    try {
      const snapshot = await saveToCloudVault({
        session,
        candidates,
        auditEvents,
        operators,
        voters,
      });
      loadCloudSnapshots();
      setSaveStatusMsg({
        type: 'success',
        text: `نسخه کامل جلسه با موفقیت در فضای ابری امن با شناسه «${snapshot.id.slice(0, 15)}...» ذخیره و همگام شد.`,
      });
    } catch (e: any) {
      setSaveStatusMsg({
        type: 'error',
        text: e.message || 'خطا در ذخیره‌سازی ابری',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Restore from Cloud Snapshot
  const handleRestoreCloudSnapshot = (snap: CloudBackupSnapshot) => {
    try {
      const parsed = JSON.parse(snap.payloadJson);
      onRestoreData({
        session: parsed.session,
        candidates: parsed.candidates,
        auditEvents: parsed.auditEvents,
        operators: parsed.operators,
        voters: parsed.voters,
      });
      setSaveStatusMsg({
        type: 'success',
        text: `جلسه «${snap.sessionTitle}» از نسخه ابری با موفقیت بازیابی شد.`,
      });
    } catch {
      setSaveStatusMsg({
        type: 'error',
        text: 'خطا در بازیابی نسخه ابری.',
      });
    }
  };

  const handleDeleteCloudSnapshot = (id: string) => {
    deleteCloudVaultSnapshot(id);
    loadCloudSnapshots();
  };

  // 5. Restore from file upload
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.session || !parsed.candidates || !parsed.auditEvents) {
          setSaveStatusMsg({
            type: 'error',
            text: 'خطا: ساختار فایل پشتیبان نامعتبر است.',
          });
          return;
        }

        onRestoreData({
          session: parsed.session,
          candidates: parsed.candidates,
          auditEvents: parsed.auditEvents,
          operators: parsed.operators,
          voters: parsed.voters,
        });

        setSaveStatusMsg({
          type: 'success',
          text: 'بازیابی اطلاعات، آرا، عوامل و زنجیره ممیزی با موفقیت انجام شد.',
        });
      } catch (err) {
        setSaveStatusMsg({
          type: 'error',
          text: 'خطا در خواندن فایل JSON پشتیبان.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto no-print print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl flex-shrink-0">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">پشتیبان‌گیری ابری و ذخیره در کامپیوتر یا فلش</h3>
              <p className="text-xs text-slate-400 mt-0.5">مدیریت مسیر ذخیره‌سازی دائمی، فضای ابری و بازیابی داده‌ها</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('FOLDER'); setSaveStatusMsg(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'FOLDER'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Usb className="w-3.5 h-3.5 text-emerald-300" />
            <span>پوشه کامپیوتر یا فلش مموری</span>
          </button>

          <button
            onClick={() => { setActiveTab('CLOUD'); setSaveStatusMsg(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CLOUD'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-300" />
            <span>پشتیبان‌گیری فضای ابری ({toPersianDigits(cloudSnapshots.length)})</span>
          </button>

          <button
            onClick={() => { setActiveTab('RESTORE'); setSaveStatusMsg(null); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RESTORE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-indigo-300" />
            <span>بازیابی از فایل و بازنشانی</span>
          </button>
        </div>

        {/* Status Alert if any */}
        {saveStatusMsg && (
          <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            saveStatusMsg.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/40 text-red-300 border border-red-800'
          }`}>
            {saveStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="leading-relaxed">{saveStatusMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: LOCAL FOLDER / FLASH DRIVE STORAGE */}
          {activeTab === 'FOLDER' && (
            <div className="space-y-4">
              
              {/* Folder Picker Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">
                      تعیین پوشه ذخیره‌سازی ثابت (روی کامپیوتر یا فلش مموری)
                    </h4>
                  </div>
                  {folderInfo.hasPersistentHandle && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>پوشه فعال متصل است</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  طبق درخواست شما، یک‌بار پوشه مورد نظر خود را در درایو کامپیوتر یا فلش مموری متصل انتخاب نمایید؛ برنامه نام و دسترسی این پوشه را به خاطر می‌سپارد و در تمام دفعات بعدی، نسخه‌های پشتیبان را مستقیماً درون همین پوشه با تاریخ و ساعت ذخیره می‌کند.
                </p>

                {/* Selected Folder Display */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">پوشه ذخیره فعلی:</span>
                    <strong className="text-xs font-mono text-emerald-300">
                      {folderInfo.folderName ? folderInfo.folderName : 'هنوز پوشه‌ای مشخص نشده است'}
                    </strong>
                  </div>

                  <button
                    onClick={handleSelectFolder}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition"
                  >
                    <FolderPlus className="w-4 h-4 text-emerald-400" />
                    <span>{folderInfo.folderName ? 'تغییر پوشه انتخابی' : 'انتخاب پوشه در کامپیوتر یا فلش'}</span>
                  </button>
                </div>

                {/* Direct Save Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveToConfiguredFolder}
                    disabled={isSaving}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {folderInfo.folderName 
                        ? `ذخیره فایل پشتیبان در پوشه «${folderInfo.folderName}»`
                        : 'ذخیره فایل پشتیبان در کامپیوتر (دانلود مستقیم)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
                <span className="font-bold text-slate-300 block">نکات مربوط به ذخیره در فلش مموری:</span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>فلش مموری را به پورت USB رایانه وصل کرده و با دکمه بالا پوشه آن را انتخاب کنید.</li>
                  <li>هر فایل پشتیبان شامل امضای رمزنگاری‌شده تمامیت سند (SHA-256) است تا از هرگونه دستکاری ممانعت شود.</li>
                  <li>نام فایل به صورت خودکار شامل شماره شعبه، تاریخ روز و ساعت دقیق خواهد بود.</li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: CLOUD VAULT */}
          {activeTab === 'CLOUD' && (
            <div className="space-y-4">
              
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-sky-400" />
                    <h4 className="font-bold text-sm text-white">
                      پشتیبان‌گیری در فضای ابری امن (Cloud Vault)
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    فضای ابری فعال
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  یک نسخه کامل و رمزگذاری‌شده از کلیه اطلاعات انتخابات، نامزدها، آرا و ردگیری‌ها را در گاوصندوق ابری ذخیره کنید تا حتی در صورت خرابی کامل رایانه یا مفقود شدن فلش، اطلاعات فوراً قابل بازگردانی باشد.
                </p>

                <button
                  onClick={handleSaveToCloud}
                  disabled={isSaving}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>ارسال و همگام‌سازی نسخه جدید با فضای ابری</span>
                </button>
              </div>

              {/* Cloud Snapshots List */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-slate-300">
                  نسخه‌های ذخیره‌شده در فضای ابری ({toPersianDigits(cloudSnapshots.length)} نسخه):
                </h5>

                {cloudSnapshots.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cloudSnapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{snap.sessionTitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              شعبه {toPersianDigits(snap.stationNumber)}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                            {snap.persianSavedDate} • {toPersianDigits(snap.totalVotes)} رأی
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreCloudSnapshot(snap)}
                            className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="بازیابی این نسخه ابری"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>بازیابی</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCloudSnapshot(snap.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition"
                            title="حذف این نسخه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-xs text-slate-500">
                    هنوز نسخه‌ای در فضای ابری ذخیره نشده است. با دکمه بالا اولین نسخه را ارسال کنید.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: RESTORE FROM FILE & RESET */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              
              {/* Import from JSON File Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-bold text-sm text-white">
                    بازیابی از فایل پشتیبان JSON (کامپیوتر یا فلش)
                  </h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  فایل پشتیبان را از کامپیوتر یا فلش مموری انتخاب کنید تا وضعیت کامل جلسه، لیست نامزدها و لاگ رویدادها بازگردانی شود.
                </p>

                <label className="w-full py-3 bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>انتخاب فایل پشتیبان (.json)</span>
                  <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                </label>
              </div>

              {/* Reset Session Section */}
              <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>شروع انتخابات جدید و پاک‌سازی داده‌های جاری</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  قبل از شروع دوره جدید، جلسه جاری به طور خودکار در <strong>بایگانی برنامه</strong> ذخیره خواهد شد تا هیچ اطلاعاتی از بین نرود.
                </p>

                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="py-2 px-3 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded-xl text-xs transition"
                  >
                    شروع انتخابات جدید
                  </button>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onResetSession();
                        setConfirmReset(false);
                        onClose();
                      }}
                      className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition"
                    >
                      بله، جلسه نو آغاز شود
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="py-2 px-2 text-slate-400 hover:text-white text-xs"
                    >
                      انصراف
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>پشتیبان‌گیری امن با استاندارد یکپارچگی SHA-256</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
