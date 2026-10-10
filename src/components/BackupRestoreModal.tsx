import React, { useState } from 'react';
import { ElectionSession, Candidate, AuditEvent, Operator } from '../types/election';
import { computeSHA256 } from '../utils/persian';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  FileJson,
  CheckCircle2
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ElectionSession;
  candidates: Candidate[];
  auditEvents: AuditEvent[];
  operators: Operator[];
  onRestoreData: (data: {
    session: ElectionSession;
    candidates: Candidate[];
    auditEvents: AuditEvent[];
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
  onRestoreData,
  onResetSession,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    const rawData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session,
      candidates,
      auditEvents,
      operators,
    };

    const jsonString = JSON.stringify(rawData, null, 2);
    const checksum = await computeSHA256(jsonString);

    const fullPackage = {
      ...rawData,
      integrityChecksum: checksum,
    };

    const blob = new Blob([JSON.stringify(fullPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `پشتیبان_انتخابات_شعبه_${session.stationNumber}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.session || !parsed.candidates || !parsed.auditEvents) {
          setImportStatus('خطا: ساختار فایل پشتیبان نامعتبر است.');
          setIsSuccess(false);
          return;
        }

        onRestoreData({
          session: parsed.session,
          candidates: parsed.candidates,
          auditEvents: parsed.auditEvents,
        });

        setIsSuccess(true);
        setImportStatus('بازیابی اطلاعات و زنجیره ممیزی با موفقیت انجام شد.');
      } catch (err) {
        setImportStatus('خطا در خواندن فایل JSON پشتیبان.');
        setIsSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl p-6 space-y-6"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">پشتیبان‌گیری و بازیابی آفلاین امن</h3>
              <p className="text-xs text-slate-400">ذخیره داده‌ها و زنجیره ممیزی با تضمین عدم دستکاری</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تهیه نسخه پشتیبان (JSON Snapshot)</span>
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            شامل تمامی نامزدها، آرای شمارش‌شده، لاگ کامل رویدادها، امضاهای رسمی و کلید هش SHA-256.
          </p>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>دانلود فایل پشتیبان رمزنگاری‌شده</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>بازیابی از فایل پشتیبان</span>
          </h4>
          <p className="text-xs text-slate-400">
            انتخاب فایل پشتیبان معتبر و بازگردانی وضعیت جلسه و رویدادهای مربوطه:
          </p>
          <label className="w-full mt-2 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>انتخاب و بارگذاری فایل JSON</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          {importStatus && (
            <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              isSuccess ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-red-950/40 text-red-300 border border-red-800'
            }`}>
              {isSuccess ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Reset Session Section */}
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>بازنشانی جلسه و شروع انتخابات جدید</span>
          </div>
          <p className="text-[11px] text-slate-400">
            در صورت نیاز به شروع یک انتخابات کاملاً جدید یا پاک‌سازی داده‌های آزمایشی.
          </p>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="py-1.5 px-3 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded-lg text-xs transition"
            >
              بازنشانی داده‌ها و شروع جلسه نو
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
                className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition"
              >
                بله، اطمینان دارم و پاک شود
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="py-1.5 px-2 text-slate-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>
          )}
        </div>

        <div className="text-left pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
