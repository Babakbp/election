import React, { useMemo } from 'react';
import { Candidate, ElectionSession } from '../types/election';
import { toPersianDigits } from '../utils/persian';
import { 
  Printer, 
  X, 
  Grid3X3, 
  HelpCircle, 
  ShieldCheck, 
  Users, 
  ArrowUpDown,
  Building2,
  PenTool,
  Stamp
} from 'lucide-react';

interface ManualTallySheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  session: ElectionSession;
}

export interface CandidateWithSortParts extends Candidate {
  lastName: string;
  firstName: string;
}

/**
 * Extracts first name and last name from full Persian name for sorting.
 * In Persian names, the first word is usually the given name, and the rest is family name/title,
 * e.g., "علی رضایی" -> first: "علی", last: "رضایی"
 * "سید محمد طباطبایی نژاد" -> first: "سید محمد", last: "طباطبایی نژاد"
 */
export function splitPersianName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  
  // Handle prefixes like سید، سیده، میر، شیخ، دکتر، مهندس
  let prefixCount = 0;
  const honorifics = ['سید', 'سیده', 'میر', 'شیخ', 'دکتر', 'مهندس', 'حاج', 'حاجیه'];
  if (honorifics.includes(parts[0]) && parts.length > 2) {
    prefixCount = 1;
  }
  
  const firstName = parts.slice(0, prefixCount + 1).join(' ');
  const lastName = parts.slice(prefixCount + 1).join(' ');
  return { firstName, lastName: lastName || firstName };
}

export const ManualTallySheetModal: React.FC<ManualTallySheetModalProps> = ({
  isOpen,
  onClose,
  candidates,
  session,
}) => {
  // Sort candidates primarily by last name (نام خانوادگی), then by first name (نام)
  const sortedCandidates = useMemo(() => {
    const list: CandidateWithSortParts[] = candidates.map((cand) => {
      const { firstName, lastName } = splitPersianName(cand.name);
      return {
        ...cand,
        firstName,
        lastName,
      };
    });

    return list.sort((a, b) => {
      const cmpLast = a.lastName.localeCompare(b.lastName, 'fa', { sensitivity: 'base' });
      if (cmpLast !== 0) return cmpLast;
      return a.firstName.localeCompare(b.firstName, 'fa', { sensitivity: 'base' });
    });
  }, [candidates]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      id="manual-tally-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:z-auto"
    >
      
      {/* Dialog container */}
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden my-auto print:bg-white print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0 print:rounded-none print:overflow-visible print:text-black" 
        dir="rtl"
      >
        {/* Modal Header (Screen Only) */}
        <div className="no-print print:hidden px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Grid3X3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">
                  فرم چاپی شمارش دستی آرا (جدول شطرنجی ۵۰ تایی)
                </h3>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  {toPersianDigits(sortedCandidates.length)} کاندیدا
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مرتب‌سازی الفبایی بر اساس نام خانوادگی، ۵ دسته ۱۰تایی شطرنجی برای تیک‌زدن آرا، به همراه محل امضای مسئولین
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ فرم (Print / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Paper Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          
          {/* Instructions banner (Screen Only) */}
          <div className="no-print print:hidden mb-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>راهنمای شمارش دستی:</strong> در مواقع قطعی برق یا عدم دسترسی به رایانه، این برگه استاندارد را چاپ کرده و هنگام خواندن هر رأی، یک مربع از خانه‌های شطرنجی کاندیدای مربوطه را علامت یا خط بزنید. هر بلوک شامل ۱۰ خانه بوده و مجموعاً ۵ دسته ده‌تایی (۵۰ رأی در هر ردیف) را پوشش می‌دهد. در پایان، جمع دسته‌ها در ستون «مجموع آرا» ثبت و برگه توسط هیئت اجرایی و نظارت امضا می‌شود.
            </div>
          </div>

          {/* Printable White Paper Document */}
          <div 
            id="manual-tally-sheet-document"
            className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 max-w-4xl mx-auto shadow-xl print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full"
            dir="rtl"
          >
            {/* Header of the paper sheet */}
            <div className="border-b-2 border-black pb-3 mb-3 text-center">
              <div className="flex items-center justify-between text-[11px] text-gray-800 font-mono">
                <div className="text-right">
                  <div>حوزه انتخابیه: <strong>{session.constituency}</strong></div>
                  <div>کد شعبه: <strong>{toPersianDigits(session.stationNumber)}</strong></div>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-0.5 flex items-center justify-center text-black">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-900">بسمه تعالی</h3>
                  <h1 className="text-sm sm:text-base font-black text-black tracking-tight mt-0.5">
                    فرم شمارش دستی آرای کاندیداها (جدول نشانه‌گذاری صندوق)
                  </h1>
                </div>

                <div className="text-left font-mono text-[11px]">
                  <div>شماره صندوق: <strong>{session.boxNumber}</strong></div>
                  <div>تاریخ: <strong>{new Date().toLocaleDateString('fa-IR')}</strong></div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-gray-700 bg-gray-100 py-1 px-2 border border-gray-300 rounded flex items-center justify-between">
                <span>مرتب‌سازی اسامی: <strong>بر اساس نام خانوادگی (الفبایی)</strong></span>
                <span>راهنما: در هر خانه مربع با قلم علامت تیک (✓) یا ضربدر (✕) درج گردد. هر دسته ۱۰ خانه دارد.</span>
              </div>
            </div>

            {/* Candidates Table with Grid Blocks */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse border-2 border-black text-xs font-sans">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-black text-black font-black text-[11px]">
                    <th className="p-1 border border-black text-center w-8">ردیف</th>
                    <th className="p-1 border border-black text-center w-12">کد</th>
                    <th className="p-1 border border-black text-right pr-2 min-w-[130px]">
                      نام خانوادگی و نام کاندیدا
                    </th>
                    <th className="p-1 border border-black text-center w-14">ائتلاف</th>
                    
                    {/* 5 Blocks of 10-squares */}
                    <th className="p-1 border border-black text-center">
                      <div className="flex items-center justify-around">
                        <span className="text-[10px]">دسته ۱ (۱۰)</span>
                        <span className="text-[10px]">دسته ۲ (۱۰)</span>
                        <span className="text-[10px]">دسته ۳ (۱۰)</span>
                        <span className="text-[10px]">دسته ۴ (۱۰)</span>
                        <span className="text-[10px]">دسته ۵ (۱۰)</span>
                      </div>
                    </th>
                    
                    <th className="p-1 border border-black text-center w-14">
                      جمع آرا
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500 border border-black">
                        هیچ نامزدی در سامانه ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    sortedCandidates.map((cand, index) => (
                      <tr 
                        key={cand.id} 
                        className={`border-b border-black ${index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}`}
                      >
                        {/* Row index */}
                        <td className="p-1 border border-black text-center font-mono font-bold text-[11px]">
                          {toPersianDigits(index + 1)}
                        </td>

                        {/* Candidate Code */}
                        <td className="p-1 border border-black text-center font-mono font-bold text-[11px]">
                          {toPersianDigits(cand.candidateNumber)}
                        </td>

                        {/* Candidate Name (Last name highlighted) */}
                        <td className="p-1.5 border border-black pr-2">
                          <span className="font-black text-black text-xs">
                            {cand.lastName}
                          </span>
                          {cand.firstName !== cand.lastName && (
                            <span className="text-gray-800 text-xs mr-1">
                              ، {cand.firstName}
                            </span>
                          )}
                        </td>

                        {/* Affiliation */}
                        <td className="p-1 border border-black text-center text-[10px] text-gray-700 truncate max-w-[80px]">
                          {cand.affiliation || 'مستقل'}
                        </td>

                        {/* The 5 clusters of 10 grid cells (50 squares total) */}
                        <td className="p-1 border border-black">
                          <div className="flex items-center justify-between gap-1 sm:gap-2">
                            {/* Render 5 Groups */}
                            {[0, 1, 2, 3, 4].map((groupIdx) => (
                              <div 
                                key={groupIdx} 
                                className="flex items-center gap-0.5 border border-black/80 rounded bg-white p-0.5 shadow-2xs"
                              >
                                {/* 10 grid boxes in 2 rows of 5 or 1 row of 10 */}
                                <div className="grid grid-cols-5 gap-0.5">
                                  {Array.from({ length: 10 }).map((_, boxIdx) => (
                                    <div 
                                      key={boxIdx}
                                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-black/60 rounded-[1px] bg-white flex items-center justify-center"
                                      title={`رأی ${groupIdx * 10 + boxIdx + 1}`}
                                    />
                                  ))}
                                </div>
                                <span className="font-mono text-[8px] font-bold text-gray-700 px-0.5 select-none">
                                  ۱۰
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Tally Box for hand writing */}
                        <td className="p-1 border border-black text-center bg-gray-50">
                          <div className="w-10 h-6 border border-dashed border-black rounded mx-auto bg-white flex items-center justify-center font-mono text-xs">
                            {/* Blank for hand tally */}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Blank & Spoiled Ballots row */}
                  <tr className="bg-gray-100 border-t-2 border-black font-bold">
                    <td className="p-1 border border-black text-center font-mono text-[11px]">-</td>
                    <td className="p-1 border border-black text-center font-mono text-[11px]">-</td>
                    <td className="p-1.5 border border-black pr-2 text-xs">
                      آرای باطله سفید (ممتنع)
                    </td>
                    <td className="p-1 border border-black text-center text-[10px]">-</td>
                    <td className="p-1 border border-black">
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        {[0, 1, 2, 3, 4].map((g) => (
                          <div key={g} className="flex items-center gap-0.5 border border-black/80 rounded bg-white p-0.5">
                            <div className="grid grid-cols-5 gap-0.5">
                              {Array.from({ length: 10 }).map((_, b) => (
                                <div key={b} className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-black/60 rounded-[1px] bg-white" />
                              ))}
                            </div>
                            <span className="font-mono text-[8px] font-bold text-gray-700 px-0.5">۱۰</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-1 border border-black text-center bg-white">
                      <div className="w-10 h-6 border border-dashed border-black rounded mx-auto" />
                    </td>
                  </tr>

                  <tr className="bg-gray-100 border-b-2 border-black font-bold">
                    <td className="p-1 border border-black text-center font-mono text-[11px]">-</td>
                    <td className="p-1 border border-black text-center font-mono text-[11px]">-</td>
                    <td className="p-1.5 border border-black pr-2 text-xs">
                      آرای باطله غیرمجاز (مخدوش)
                    </td>
                    <td className="p-1 border border-black text-center text-[10px]">-</td>
                    <td className="p-1 border border-black">
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        {[0, 1, 2, 3, 4].map((g) => (
                          <div key={g} className="flex items-center gap-0.5 border border-black/80 rounded bg-white p-0.5">
                            <div className="grid grid-cols-5 gap-0.5">
                              {Array.from({ length: 10 }).map((_, b) => (
                                <div key={b} className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-black/60 rounded-[1px] bg-white" />
                              ))}
                            </div>
                            <span className="font-mono text-[8px] font-bold text-gray-700 px-0.5">۱۰</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-1 border border-black text-center bg-white">
                      <div className="w-10 h-6 border border-dashed border-black rounded mx-auto" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures Section */}
            <div className="signatures-container mt-4 pt-3 border-t-2 border-black break-inside-avoid">
              <div className="text-[11px] font-bold text-black mb-2 flex items-center justify-between">
                <span>امضای مسئولین و اعضای حاضر در شعبه اخذ رأی جهت تایید صحت شمارش دستی:</span>
                <span className="text-[10px] text-gray-600 font-normal">
                  تاریخ و ساعت اتمام شمارش: .................................
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
                {/* Presiding Officer */}
                <div className="border border-black rounded-lg p-2 flex flex-col justify-between min-h-[75px] bg-white">
                  <div className="font-bold text-[10px] text-black">
                    رئیس شعبه: {session.presidingOfficer.name}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-2">
                    محل امضا و اثر انگشت
                  </div>
                </div>

                {/* Observers */}
                {session.observers.slice(0, 3).map((obs) => (
                  <div key={obs.id} className="border border-black rounded-lg p-2 flex flex-col justify-between min-h-[75px] bg-white">
                    <div className="font-bold text-[10px] text-black">
                      {obs.role}: {obs.name}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-2">
                      محل امضا و اثر انگشت
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paper Footer */}
            <div className="mt-3 pt-2 border-t border-gray-400 flex items-center justify-between text-[9px] text-gray-600 font-mono">
              <span>سامانه جامع مدیریت و شمارش انتخابات حضوری • طراح: بابک بهرامی پور</span>
              <span>برگه کنترل شمارش دستی صندوق (نسخه آفلاین / قطع سیستم)</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
