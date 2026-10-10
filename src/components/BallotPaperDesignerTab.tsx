import React, { useState } from 'react';
import { Candidate, ElectionSession, Voter, BallotPaperConfig } from '../types/election';
import { toPersianDigits, toEnglishDigits, formatJalali } from '../utils/persian';
import { 
  Printer, 
  Settings, 
  Eye, 
  Scissors, 
  QrCode, 
  Stamp, 
  CheckSquare, 
  Layers, 
  Image as ImageIcon, 
  Hash, 
  ShieldCheck, 
  FileText,
  Fingerprint,
  Sparkles,
  Ticket,
  Copy,
  Layout,
  Grid
} from 'lucide-react';

interface BallotPaperDesignerTabProps {
  candidates: Candidate[];
  session: ElectionSession;
  voters: Voter[];
  isLocked: boolean;
}

export const BallotPaperDesignerTab: React.FC<BallotPaperDesignerTabProps> = ({
  candidates,
  session,
  voters,
  isLocked,
}) => {
  // Default Ballot Configuration
  const [config, setConfig] = useState<BallotPaperConfig>({
    title: session.title || 'برگه تعرفه رسمی اخذ رأی انتخابات',
    subTitle: `حوزه انتخابیه: ${session.constituency} • شعبه شماره ${session.stationNumber} • صندوق ${session.boxNumber}`,
    constituency: session.constituency,
    stationNumber: session.stationNumber,
    boxNumber: session.boxNumber,
    instructions: 'رأی‌دهنده گرامی، لطفاً نامزد(های) منتخب خود را در کادر مربوطه علامت زده یا مشخصات وی را بنویسید. هرگونه علامت اضافی، خط‌خوردگی یا خدشه موجب ابطال تعرفه می‌گردد.',
    layoutStyle: 'CHECKLIST',
    ballotsPerPage: 2,
    showCandidatePhotos: true,
    showCandidateCodes: true,
    showCandidateAffiliations: true,
    showStub: true,
    showQrVerification: true,
    serialNumberPrefix: 'TRF-1403-',
    startingSerialNumber: 1001,
    totalCopiesToPrint: Math.max(10, voters.length || 20),
    showOfficialStamps: true,
    showSecurityBorder: true,
  });

  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  // Trigger print
  const handlePrint = () => {
    window.print();
  };

  // Generate ballot serial numbers for preview
  const generateSerial = (index: number) => {
    const num = config.startingSerialNumber + index;
    return `${config.serialNumberPrefix}${String(num).padStart(4, '0')}`;
  };

  // Calculate pages for print
  const totalBallots = config.totalCopiesToPrint;
  const ballotsPerSheet = config.ballotsPerPage;
  const totalSheets = Math.ceil(totalBallots / ballotsPerSheet);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Actions Bar (Hidden in print) */}
      <div className="no-print bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                پنل طراحی، تنظیم و چاپ برگه تعرفه رأی
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سفارشی‌سازی برگه اخذ رأی با نام و تصویر نامزدها، ته‌برگ امضا، شماره سریال امنیتی و چیدمان A4
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95"
            title="ارسال مستقیم به پرینتر با قالب استاندارد کاغذ"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ رسمی تعرفه‌ها ({toPersianDigits(config.totalCopiesToPrint)} برگ)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Right, Live Interactive Paper Preview on Left (Hidden in print) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings Panel (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700 text-white font-bold text-sm">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>تنظیمات و سفارشی‌سازی برگه تعرفه</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  عنوان اصلی بالای تعرفه:
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  متن راهنمای رأی‌دهنده:
                </label>
                <textarea
                  rows={2}
                  value={config.instructions}
                  onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none resize-none focus:border-emerald-500"
                />
              </div>

              {/* Layout Style */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  نوع چیدمان نامزدها روی تعرفه:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, layoutStyle: 'CHECKLIST' })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.layoutStyle === 'CHECKLIST'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <span>جدول کاندیداها</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, layoutStyle: 'CANDIDATE_CARDS' })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.layoutStyle === 'CANDIDATE_CARDS'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4 mx-auto mb-1 text-teal-400" />
                    <span>کارت‌های تصویری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, layoutStyle: 'WRITE_IN' })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.layoutStyle === 'WRITE_IN'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                    <span>کادر دست‌نویس</span>
                  </button>
                </div>
              </div>

              {/* Ballots per A4 Sheet */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  تعداد تعرفه در هر برگ کاغذ A4:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ballotsPerPage: 1 })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.ballotsPerPage === 1
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>۱ در هر A4</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">(برگه کامل)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ballotsPerPage: 2 })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.ballotsPerPage === 2
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>۲ در هر A4</span>
                    <span className="block text-[10px] text-emerald-400 mt-0.5">(استاندارد و بهینه)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ballotsPerPage: 4 })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.ballotsPerPage === 4
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>۴ در هر A4</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">(صرفه‌جویی بالا)</span>
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-700/80 space-y-2">
                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/40">
                  <span className="text-slate-300">نمایش ته‌برگ تعرفه (امضا و اثر انگشت رأی‌دهنده)</span>
                  <input
                    type="checkbox"
                    checked={config.showStub}
                    onChange={(e) => setConfig({ ...config, showStub: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/40">
                  <span className="text-slate-300">نمایش تصویر کاندیداها روی برگه</span>
                  <input
                    type="checkbox"
                    checked={config.showCandidatePhotos}
                    onChange={(e) => setConfig({ ...config, showCandidatePhotos: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/40">
                  <span className="text-slate-300">نمایش کد انتخاباتی درشت نامزدها</span>
                  <input
                    type="checkbox"
                    checked={config.showCandidateCodes}
                    onChange={(e) => setConfig({ ...config, showCandidateCodes: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/40">
                  <span className="text-slate-300">نمایش بارکد و QR امنیتی اصالت تعرفه</span>
                  <input
                    type="checkbox"
                    checked={config.showQrVerification}
                    onChange={(e) => setConfig({ ...config, showQrVerification: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/40">
                  <span className="text-slate-300">محل مهر رسمی هیئت اجرایی و نظارت</span>
                  <input
                    type="checkbox"
                    checked={config.showOfficialStamps}
                    onChange={(e) => setConfig({ ...config, showOfficialStamps: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>
              </div>

              {/* Number of Copies */}
              <div className="pt-2 border-t border-slate-700/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-300">
                    تیراژ برگه‌های چاپی (تعداد تعرفه):
                  </label>
                  <span className="font-mono text-emerald-400 font-bold">
                    {toPersianDigits(config.totalCopiesToPrint)} برگ ({toPersianDigits(totalSheets)} برگ A4)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={config.totalCopiesToPrint}
                    onChange={(e) => setConfig({ ...config, totalCopiesToPrint: Math.max(1, Number(e.target.value)) })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, totalCopiesToPrint: voters.length || 50 })}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-[11px] whitespace-nowrap"
                  >
                    به تعداد واجدین ({toPersianDigits(voters.length)})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>پیش‌نمایش زنده چاپی برگه A4</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span>صفحه اول پیش‌نمایش • شامل {toPersianDigits(config.ballotsPerPage)} تعرفه</span>
            </div>
          </div>

          {/* Simulated A4 Paper in Dark Theme Container */}
          <div className="bg-slate-950/80 p-4 sm:p-6 rounded-3xl border border-slate-800 flex justify-center overflow-x-auto shadow-2xl">
            <div className="w-[520px] bg-white text-slate-950 p-6 rounded-lg shadow-2xl border border-slate-200 select-none scale-95 sm:scale-100 origin-top">
              
              {/* Ballots on Page 1 */}
              <div className={`space-y-6 ${config.ballotsPerPage === 4 ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
                {Array.from({ length: config.ballotsPerPage }).map((_, bIdx) => (
                  <div key={bIdx} className="relative">
                    {/* Ballot Border and Container */}
                    <div className="border-2 border-slate-800 p-4 rounded-xl bg-slate-50/50 relative overflow-hidden">
                      
                      {/* Top Header */}
                      <div className="text-center border-b border-slate-300 pb-2.5 mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                            سریال: {generateSerial(bIdx)}
                          </span>
                          <span className="text-[10px] text-slate-600 font-bold">
                            جمهوری اسلامی ایران
                          </span>
                          {config.showQrVerification && (
                            <QrCode className="w-4 h-4 text-slate-800" />
                          )}
                        </div>
                        <h4 className="font-black text-sm text-slate-900 leading-tight">
                          {config.title}
                        </h4>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {config.subTitle}
                        </p>
                      </div>

                      {/* Instructions */}
                      <div className="text-[9px] text-slate-600 bg-amber-50 border border-amber-200 p-1.5 rounded-lg mb-2.5 leading-relaxed">
                        {config.instructions}
                      </div>

                      {/* Main Candidate Area depending on layout style */}
                      {config.layoutStyle === 'CHECKLIST' && (
                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
                          <table className="w-full text-[10px] text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-200 font-bold text-slate-800 border-b border-slate-300">
                                <th className="p-1 text-center w-6">ردیف</th>
                                {config.showCandidateCodes && <th className="p-1 text-center w-12">کد نامزد</th>}
                                {config.showCandidatePhotos && <th className="p-1 text-center w-8">عکس</th>}
                                <th className="p-1 pr-2">نام و نام خانوادگی</th>
                                {config.showCandidateAffiliations && <th className="p-1">ائتلاف / گرایش</th>}
                                <th className="p-1 text-center w-12">علامت رأی</th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidates.map((cand, idx) => (
                                <tr key={cand.id} className="border-b border-slate-200 hover:bg-slate-100/60">
                                  <td className="p-1 text-center font-mono">{toPersianDigits(idx + 1)}</td>
                                  {config.showCandidateCodes && (
                                    <td className="p-1 text-center font-mono font-bold text-slate-900 bg-slate-100">
                                      {toPersianDigits(cand.candidateNumber)}
                                    </td>
                                  )}
                                  {config.showCandidatePhotos && (
                                    <td className="p-1 text-center">
                                      <img
                                        src={cand.avatarUrl}
                                        alt={cand.name}
                                        className="w-5 h-5 rounded-full object-cover mx-auto border border-slate-300"
                                      />
                                    </td>
                                  )}
                                  <td className="p-1 pr-2 font-bold text-slate-900">{cand.name}</td>
                                  {config.showCandidateAffiliations && (
                                    <td className="p-1 text-slate-600 text-[9px]">{cand.affiliation}</td>
                                  )}
                                  <td className="p-1 text-center">
                                    <div className="w-4 h-4 border-2 border-slate-500 rounded mx-auto" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {config.layoutStyle === 'CANDIDATE_CARDS' && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {candidates.map((cand) => (
                            <div key={cand.id} className="border border-slate-300 rounded-lg p-2 flex items-center justify-between gap-1.5 bg-white">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {config.showCandidatePhotos && (
                                  <img
                                    src={cand.avatarUrl}
                                    alt={cand.name}
                                    className="w-7 h-7 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-[10px] text-slate-900 truncate">{cand.name}</p>
                                  <span className="font-mono text-[9px] font-bold text-slate-600 block">
                                    کد: {toPersianDigits(cand.candidateNumber)}
                                  </span>
                                </div>
                              </div>
                              <div className="w-5 h-5 border-2 border-slate-700 rounded-md flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}

                      {config.layoutStyle === 'WRITE_IN' && (
                        <div className="space-y-1.5 mb-3">
                          {Array.from({ length: 4 }).map((_, wIdx) => (
                            <div key={wIdx} className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-1.5 text-[10px]">
                              <span className="font-mono text-slate-500">{toPersianDigits(wIdx + 1)}.</span>
                              <div className="w-20 border border-slate-400 rounded h-6 flex items-center justify-center font-mono text-slate-400 text-[9px]">
                                کد نامزد
                              </div>
                              <div className="flex-1 border border-slate-400 rounded h-6 flex items-center pr-2 text-slate-400 text-[9px]">
                                نام و نام خانوادگی نامزد منتخب
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Official Stamps Placeholders */}
                      {config.showOfficialStamps && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-300 text-[9px] text-slate-500">
                          <div className="border border-dashed border-slate-400 rounded-lg p-2 text-center w-28">
                            <Stamp className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-400" />
                            <span>محل مهر هیئت اجرایی</span>
                          </div>
                          <div className="border border-dashed border-slate-400 rounded-lg p-2 text-center w-28">
                            <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-400" />
                            <span>محل مهر هیئت نظارت</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stub / Counterfoil with Scissors Line */}
                    {config.showStub && (
                      <div className="mt-2 pt-2 border-t-2 border-dashed border-slate-400 relative">
                        <div className="absolute -top-3 left-3 bg-white px-1 text-[8px] text-slate-500 flex items-center gap-1 font-mono">
                          <Scissors className="w-3 h-3 text-slate-600" />
                          <span>خط برش و پرفراژ ته‌برگ تعرفه</span>
                        </div>
                        
                        <div className="bg-slate-100 border border-slate-300 rounded-lg p-2 flex items-center justify-between text-[9px] text-slate-700">
                          <div className="space-y-0.5">
                            <span className="font-bold block">ته‌برگ تعرفه رأی (نزد شعبه)</span>
                            <span className="font-mono text-[8px] text-slate-500">سریال: {generateSerial(bIdx)}</span>
                            <span>نام رأی‌دهنده: ................... کد ملی: ...................</span>
                          </div>
                          <div className="border border-dashed border-slate-400 rounded p-1 text-center w-20">
                            <Fingerprint className="w-4 h-4 mx-auto text-slate-500" />
                            <span className="text-[8px] text-slate-500 block">اثر انگشت</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          PRINT ONLY AREA: Rendered exclusively when window.print() is executed!
          Contains full set of configured ballots ready for physical paper printing.
      ========================================================================== */}
      <div className="hidden print:block text-black bg-white" dir="rtl">
        {Array.from({ length: totalSheets }).map((_, sheetIdx) => (
          <div 
            key={sheetIdx} 
            className="w-full min-h-[297mm] p-6 box-border bg-white text-black break-after-page flex flex-col justify-between"
            style={{ pageBreakAfter: 'always' }}
          >
            <div className={`w-full space-y-6 ${config.ballotsPerPage === 4 ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
              {Array.from({ length: config.ballotsPerPage }).map((_, bOffset) => {
                const globalBallotNum = sheetIdx * config.ballotsPerPage + bOffset;
                if (globalBallotNum >= config.totalCopiesToPrint) return null;

                return (
                  <div key={bOffset} className="border-2 border-black p-4 rounded-xl bg-white relative">
                    
                    {/* Ballot Header */}
                    <div className="text-center border-b border-black pb-2 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-bold border border-black px-2 py-0.5 rounded">
                          سریال: {generateSerial(globalBallotNum)}
                        </span>
                        <span className="text-xs font-bold">
                          جمهوری اسلامی ایران • ستاد انتخابات
                        </span>
                        <div className="w-6 h-6 border border-black flex items-center justify-center font-mono text-[9px]">
                          QR
                        </div>
                      </div>
                      <h3 className="font-black text-base text-black">{config.title}</h3>
                      <p className="text-[11px] text-black mt-0.5">{config.subTitle}</p>
                    </div>

                    {/* Instructions */}
                    <p className="text-[10px] text-black bg-gray-100 p-1.5 rounded mb-2 border border-gray-300">
                      {config.instructions}
                    </p>

                    {/* Candidates depending on style */}
                    {config.layoutStyle === 'CHECKLIST' && (
                      <table className="w-full text-xs text-right border-collapse border border-black mb-3">
                        <thead>
                          <tr className="bg-gray-200 font-bold border-b border-black">
                            <th className="p-1 border-l border-black text-center w-8">ردیف</th>
                            {config.showCandidateCodes && <th className="p-1 border-l border-black text-center w-14">کد نامزد</th>}
                            {config.showCandidatePhotos && <th className="p-1 border-l border-black text-center w-10">تصویر</th>}
                            <th className="p-1 pr-2 border-l border-black">نام و نام خانوادگی نامزد رسمی</th>
                            {config.showCandidateAffiliations && <th className="p-1 border-l border-black">ائتلاف / جناح</th>}
                            <th className="p-1 text-center w-14">علامت رأی</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map((cand, idx) => (
                            <tr key={cand.id} className="border-b border-black">
                              <td className="p-1 border-l border-black text-center font-mono">{toPersianDigits(idx + 1)}</td>
                              {config.showCandidateCodes && (
                                <td className="p-1 border-l border-black text-center font-mono font-bold">
                                  {toPersianDigits(cand.candidateNumber)}
                                </td>
                              )}
                              {config.showCandidatePhotos && (
                                <td className="p-1 border-l border-black text-center">
                                  <img src={cand.avatarUrl} alt="" className="w-6 h-6 object-cover mx-auto rounded" />
                                </td>
                              )}
                              <td className="p-1 pr-2 border-l border-black font-bold">{cand.name}</td>
                              {config.showCandidateAffiliations && (
                                <td className="p-1 border-l border-black text-[10px]">{cand.affiliation}</td>
                              )}
                              <td className="p-1 text-center">
                                <div className="w-5 h-5 border-2 border-black rounded mx-auto" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {config.layoutStyle === 'CANDIDATE_CARDS' && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {candidates.map((cand) => (
                          <div key={cand.id} className="border border-black rounded p-2 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2">
                              {config.showCandidatePhotos && (
                                <img src={cand.avatarUrl} alt="" className="w-8 h-8 rounded object-cover border border-black" />
                              )}
                              <div>
                                <strong className="text-xs block">{cand.name}</strong>
                                <span className="font-mono text-[10px]">کد: {toPersianDigits(cand.candidateNumber)}</span>
                              </div>
                            </div>
                            <div className="w-6 h-6 border-2 border-black rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {config.layoutStyle === 'WRITE_IN' && (
                      <div className="space-y-2 mb-3">
                        {Array.from({ length: 4 }).map((_, wIdx) => (
                          <div key={wIdx} className="flex items-center gap-2 border-b border-dotted border-black pb-1 text-xs">
                            <span className="font-mono">{toPersianDigits(wIdx + 1)}.</span>
                            <div className="w-24 border border-black rounded h-7 flex items-center justify-center font-mono text-gray-500 text-[10px]">
                              کد نامزد
                            </div>
                            <div className="flex-1 border border-black rounded h-7 flex items-center pr-2 text-gray-500 text-[10px]">
                              نام و نام خانوادگی کاندیدای مورد نظر
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Official Stamps */}
                    {config.showOfficialStamps && (
                      <div className="flex items-center justify-between pt-2 border-t border-black text-[10px]">
                        <div className="border border-dashed border-black rounded p-2 text-center w-32">
                          <span>محل مهر هیئت اجرایی شعبه</span>
                        </div>
                        <div className="border border-dashed border-black rounded p-2 text-center w-32">
                          <span>محل مهر هیئت نظارت شعبه</span>
                        </div>
                      </div>
                    )}

                    {/* Stub / Counterfoil */}
                    {config.showStub && (
                      <div className="mt-3 pt-2 border-t-2 border-dashed border-black">
                        <div className="text-[10px] text-gray-700 flex items-center justify-between">
                          <div>
                            <strong className="block">ته‌برگ تعرفه رأی (مستقر در شعبه)</strong>
                            <span className="font-mono">سریال: {generateSerial(globalBallotNum)}</span>
                            <p className="mt-0.5">نام رأی‌دهنده: ................... کد ملی: ................... ردیف: .....</p>
                          </div>
                          <div className="border border-dashed border-black rounded p-1.5 text-center w-24">
                            <span>محل اثر انگشت و امضا</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
