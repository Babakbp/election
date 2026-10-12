import React, { useState } from 'react';
import { ArchivedSession, ElectionSession, Candidate, AuditEvent, Operator, Voter } from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { exportElectionToExcel } from '../utils/export';
import { rankCandidates } from '../utils/tieBreaker';
import { 
  archiveSession, 
  deleteArchivedSession, 
  saveBackupToFolderOrDownload 
} from '../utils/fileBackupStorage';
import { ArchivedSessionReviewModal } from './ArchivedSessionReviewModal';
import { 
  Archive, 
  Search, 
  Eye, 
  FileSpreadsheet, 
  Download, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Building2, 
  Vote, 
  ShieldCheck, 
  Users, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

interface SessionsArchiveTabProps {
  archivedSessions: ArchivedSession[];
  onRefreshArchives: () => void;
  onRestoreSession: (archive: ArchivedSession) => void;
  currentSession: ElectionSession;
  currentCandidates: Candidate[];
  currentAuditEvents: AuditEvent[];
  currentOperators: Operator[];
  currentVoters: Voter[];
  onArchiveCurrentSession: () => void;
}

export const SessionsArchiveTab: React.FC<SessionsArchiveTabProps> = ({
  archivedSessions,
  onRefreshArchives,
  onRestoreSession,
  currentSession,
  currentCandidates,
  currentAuditEvents,
  currentOperators,
  currentVoters,
  onArchiveCurrentSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchive, setSelectedArchive] = useState<ArchivedSession | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const totalHistoricalVotes = archivedSessions.reduce((sum, a) => sum + a.totalVotes, 0);

  const filteredArchives = archivedSessions.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.session.title.toLowerCase().includes(q) ||
      item.session.constituency.toLowerCase().includes(q) ||
      item.persianArchivedDate.includes(q) ||
      item.winnerNames.some(w => w.toLowerCase().includes(q))
    );
  });

  const handleOpenReview = (archive: ArchivedSession) => {
    setSelectedArchive(archive);
    setIsReviewModalOpen(true);
  };

  const handleExportExcel = (archive: ArchivedSession) => {
    const totalValid = archive.candidates.reduce((sum, c) => sum + c.votes, 0);
    const ranked = rankCandidates(archive.candidates, archive.session.tieBreakerRule, totalValid);
    exportElectionToExcel(archive.session, ranked, archive.totalVotes, totalValid);
  };

  const handleDownloadBackup = async (archive: ArchivedSession) => {
    await saveBackupToFolderOrDownload({
      session: archive.session,
      candidates: archive.candidates,
      auditEvents: archive.auditEvents,
      operators: archive.operators,
      voters: archive.voters,
      notes: archive.notes,
    }, `بایگانی_${archive.session.title}`);
  };

  const handleDelete = (id: string) => {
    deleteArchivedSession(id);
    onRefreshArchives();
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-2xl flex-shrink-0">
            <Archive className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white">
                بایگانی دائمی جلسات انتخابات و بازبینی نتایج
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                {toPersianDigits(archivedSessions.length)} جلسه ثبت‌شده
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              تمام جلسات پایان‌یافته همراه با اسامی نامزدها، آرای دقیق، لاگ ممیزی و امضاهای الکترونیکی در این بخش نگهداری می‌شوند و هر زمان قابل بازبینی، چاپ مجدد و استخراج اکسل هستند.
            </p>
          </div>
        </div>

        {/* Action: Archive Current Session */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onArchiveCurrentSession}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-purple-900/40 transition"
            title="ذخیره وضعیت فعلی جلسه باز در بایگانی"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ذخیره جلسه جاری در بایگانی</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">تعداد دوره‌های بایگانی‌شده</span>
            <strong className="text-lg font-black text-white font-mono">
              {toPersianDigits(archivedSessions.length)} دوره
            </strong>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">مجموع کل آرای تاریخچه</span>
            <strong className="text-lg font-black text-emerald-400 font-mono">
              {toPersianDigits(totalHistoricalVotes)} رأی
            </strong>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">وضعیت امنیت اسناد</span>
            <strong className="text-sm font-bold text-sky-300">
              هش SHA-256 و امضای دیجیتال
            </strong>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس عنوان انتخابات، حوزه یا نام نامزد..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400">
          نمایش {toPersianDigits(filteredArchives.length)} از {toPersianDigits(archivedSessions.length)} جلسه
        </span>
      </div>

      {/* Sessions Cards List */}
      {filteredArchives.length > 0 ? (
        <div className="space-y-4">
          {filteredArchives.map((archive) => {
            const isDeleting = deleteConfirmId === archive.id;

            return (
              <div
                key={archive.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition shadow-sm space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white">
                        {archive.session.title}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        مختومه در بایگانی
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>حوزه: {archive.session.constituency}</span>
                      </span>
                      <span>•</span>
                      <span>شعبه: <strong className="text-emerald-300">{toPersianDigits(archive.session.stationNumber)}</strong></span>
                      <span>•</span>
                      <span>صندوق: {archive.session.boxNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{archive.persianArchivedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Vote Count & Candidates count badges */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-left font-mono">
                      <span className="text-[10px] text-slate-500 block">کل آرا:</span>
                      <strong className="text-sm text-emerald-400">
                        {toPersianDigits(archive.totalVotes)}
                      </strong>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-left font-mono">
                      <span className="text-[10px] text-slate-500 block">نامزدها:</span>
                      <strong className="text-sm text-sky-400">
                        {toPersianDigits(archive.candidates.length)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Top Winners summary */}
                <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-semibold">پیشتازان / منتخبان:</span>
                    {archive.winnerNames.slice(0, 4).map((winner, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg text-slate-200"
                      >
                        {winner}
                      </span>
                    ))}
                    {archive.winnerNames.length > 4 && (
                      <span className="text-xs text-slate-500">
                        +{toPersianDigits(archive.winnerNames.length - 4)} نفر دیگر
                      </span>
                    )}
                  </div>

                  {archive.notes && (
                    <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                      {archive.notes}
                    </span>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenReview(archive)}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>بازبینی کامل نتایج و امضاها</span>
                    </button>

                    <button
                      onClick={() => handleExportExcel(archive)}
                      className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>خروجی اکسل</span>
                    </button>

                    <button
                      onClick={() => handleDownloadBackup(archive)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>دانلود فایل (.json)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestoreSession(archive)}
                      className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      title="بارگذاری این جلسه به عنوان جلسه فعال نرم‌افزار"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>بارگذاری به عنوان جلسه فعال</span>
                    </button>

                    {!isDeleting ? (
                      <button
                        onClick={() => setDeleteConfirmId(archive.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition"
                        title="حذف از بایگانی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-950/40 p-1 rounded-xl border border-red-800">
                        <span className="text-[11px] text-red-300 px-1">حذف شود؟</span>
                        <button
                          onClick={() => handleDelete(archive.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold"
                        >
                          بله
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-1 text-slate-400 hover:text-white text-[10px]"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Archive className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {searchQuery ? 'موردی منطبق با جستجوی شما یافت نشد.' : 'هنوز جلسه‌ای در بایگانی ذخیره نشده است.'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              پس از اتمام هر انتخابات و قفل نهایی صورتجلسه، جلسه به طور خودکار به این بخش منتقل می‌شود یا می‌توانید با دکمه زیر جلسه جاری را هم‌اکنون بایگانی کنید.
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={onArchiveCurrentSession}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-purple-900/40 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>بایگانی کردن جلسه جاری هم‌اکنون</span>
            </button>
          )}
        </div>
      )}

      {/* Review & Inspection Modal */}
      <ArchivedSessionReviewModal
        archive={selectedArchive}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedArchive(null);
        }}
        onRestoreAsActive={(arch) => {
          setIsReviewModalOpen(false);
          setSelectedArchive(null);
          onRestoreSession(arch);
        }}
      />
    </div>
  );
};
