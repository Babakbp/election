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
  Grid,
  Barcode,
  Grid3X3
} from 'lucide-react';

/**
 * High-contrast 1D Standard Code 39 Barcode SVG renderer
 * Universally readable by all standard hardware USB/Bluetooth barcode readers
 */
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

export const BarcodeSvg: React.FC<{ 
  value: string; 
  className?: string;
  showText?: boolean;
}> = ({ value, className = 'h-9', showText = true }) => {
  // 1. Convert Persian/Arabic digits to English digits first to prevent stripping!
  const asciiValue = toEnglishDigits(value || '');
  // 2. Extract strictly the numeric candidate code
  const clean = asciiValue.toUpperCase().replace(/[^0-9A-Z]/g, '').trim();
  const safeCode = clean || '101';
  const encoded = `*${safeCode}*`;
  
  const narrowW = 1.3;
  const wideW = 3.3;
  const gapW = 1.3;
  const quietZone = 8;
  
  let curX = quietZone;
  const rects: { x: number; w: number }[] = [];

  for (let c = 0; c < encoded.length; c++) {
    const char = encoded[c];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const w = isWide ? wideW : narrowW;
      if (isBar) {
        rects.push({ x: curX, w });
      }
      curX += w;
    }
    curX += gapW; // inter-character gap
  }
  const totalW = curX + quietZone;

  return (
    <div className="flex flex-col items-center bg-white px-1.5 py-0.5 rounded">
      <svg 
        viewBox={`0 0 ${totalW} 36`} 
        className={`w-full max-w-[170px] ${className}`} 
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width={totalW} height="36" fill="#ffffff" />
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y="0" width={r.w} height="36" fill="#000000" />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[9px] font-black tracking-widest text-slate-950 mt-0.5 select-all dir-ltr">
          {safeCode}
        </span>
      )}
    </div>
  );
};

interface BallotPaperDesignerTabProps {
  candidates: Candidate[];
  session: ElectionSession;
  voters: Voter[];
  isLocked: boolean;
  onOpenManualTallySheet?: () => void;
}

export const BallotPaperDesignerTab: React.FC<BallotPaperDesignerTabProps> = ({
  candidates,
  session,
  voters,
  isLocked,
  onOpenManualTallySheet,
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

  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);

  // Trigger print with dual fallback (standard window.print + isolated print iframe for sandboxed iframes)
  const handlePrint = () => {
    setPrintSuccessMessage('دستور چاپ به پرینتر ارسال شد. در کادر چاپ اندازه را روی A4 قرار دهید (کلید میانبر: Ctrl+P).');
    setTimeout(() => setPrintSuccessMessage(null), 6000);

    // 1. Direct standard browser print
    try {
      window.print();
    } catch (e) {
      console.warn('Direct window.print encountered error, attempting fallback iframe', e);
    }

    // 2. Fallback for sandboxed iframes where parent blocks window.print()
    setTimeout(() => {
      try {
        const printDoc = document.getElementById('ballot-paper-print-document');
        if (printDoc) {
          let iframe = document.getElementById('ballot-print-hidden-iframe') as HTMLIFrameElement;
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'ballot-print-hidden-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
          }
          const doc = iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html lang="fa" dir="rtl">
                <head>
                  <meta charset="utf-8">
                  <title>${config.title}</title>
                  <style>
                    @page { size: A4 portrait; margin: 8mm; }
                    body { font-family: 'Vazirmatn', Tahoma, sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    * { box-sizing: border-box; }
                    .break-after-page { page-break-after: always; break-after: page; }
                    .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
                  </style>
                  <link rel="stylesheet" href="/assets/index.css">
                </head>
                <body>
                  ${printDoc.innerHTML}
                </body>
              </html>
            `);
            doc.close();
            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } catch (err) {
                console.warn('Iframe print error', err);
              }
            }, 300);
          }
        }
      } catch (err) {
        console.warn('Iframe print fallback error', err);
      }
    }, 150);
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
          {onOpenManualTallySheet && (
            <button
              type="button"
              onClick={onOpenManualTallySheet}
              className="px-4 py-2.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 font-bold rounded-xl text-xs flex items-center gap-2 border border-teal-500/30 transition shadow-md active:scale-95"
              title="فرم چاپی جدول شطرنجی ۵۰ تایی برای شمارش دستی آرا با قلم در صورت عدم دسترسی به نرم‌افزار"
            >
              <Grid3X3 className="w-4 h-4 text-teal-400" />
              <span>فرم شمارش دستی (جدول شطرنجی)</span>
            </button>
          )}

          <div className="flex flex-col items-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
              title="ارسال مستقیم به پرینتر یا ذخیره PDF با کلید میانبر Ctrl+P"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ رسمی تعرفه‌ها ({toPersianDigits(config.totalCopiesToPrint)} برگ)</span>
            </button>
            <span className="text-[10px] text-slate-400 mt-1 font-mono">
              کلید میانبر: <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-300">Ctrl + P</kbd>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Print Feedback Notification */}
      {printSuccessMessage && (
        <div className="no-print bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-xl animate-in fade-in">
          <Printer className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
          <span>{printSuccessMessage}</span>
        </div>
      )}

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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                    onClick={() => setConfig({ ...config, layoutStyle: 'INDIVIDUAL_BARCODE_CARDS', ballotsPerPage: 4 })}
                    className={`p-2 rounded-xl border text-center transition ${
                      config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS'
                        ? 'bg-amber-600/30 border-amber-500 text-white font-bold'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Barcode className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <span className="text-[11px] block font-bold">تعرفه نواری بارکددار</span>
                    <span className="text-[9px] text-amber-300 block font-normal">(با ته‌برگ منگنه)</span>
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

              {/* Special Info Banner for Individual Barcode Cards */}
              {config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS' && (
                <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl text-[11px] text-amber-200 flex items-start gap-2.5">
                  <Barcode className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>تعرفه نواری بارکددار با ته‌برگ سابقه:</strong> در هر ردیف یک کاندیدا به صورت باریک و نواری چاپ می‌شود؛ انتهای هر تعرفه دارای یک ته‌برگ مجزا حاوی کد نامزد و محل منگنه است. پس از برش افقی، برگه‌های نامزدها روی هم چیده و منگنه می‌شوند تا به صورت دفترچه تعرفه به هر رأی‌دهنده تحویل گردند.
                  </p>
                </div>
              )}

              {/* Ballots per A4 Sheet (or 8-candidate strip indicator for barcode strips mode) */}
              {config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS' ? (
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    تراکم چاپ نواری در هر برگ A4:
                  </label>
                  <div className="bg-slate-900 border border-amber-600/40 p-2.5 rounded-xl text-amber-200 text-xs flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>✂️</span>
                      <span>۸ نوار باریک در هر برگه A4</span>
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      استاندارد دفترچه
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    طول هر تعرفه باریک و بهینه شده تا ۸ کاندیدا در یک برگه A4 چاپ شده و پس از برش روی هم منگنه شوند.
                  </p>
                </div>
              ) : (
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
              )}

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
              <span>
                {config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS'
                  ? `صفحه اول پیش‌نمایش • شامل ${toPersianDigits(Math.min(8, candidates.length))} نوار کاندیدا با ته‌برگ`
                  : `صفحه اول پیش‌نمایش • شامل ${toPersianDigits(config.ballotsPerPage)} تعرفه`}
              </span>
            </div>
          </div>

          {/* Simulated A4 Paper in Dark Theme Container */}
          <div className="bg-slate-950/80 p-3 sm:p-5 rounded-3xl border border-slate-800 flex justify-center overflow-x-auto shadow-2xl">
            <div className="w-[580px] max-w-full bg-white text-slate-950 p-4 sm:p-5 rounded-lg shadow-2xl border border-slate-200 select-none scale-95 sm:scale-100 origin-top">
              
              {/* Ballots on Page 1 */}
              {config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS' ? (
                <div className="space-y-2.5">
                  {/* Page Sheet Banner */}
                  <div className="text-center border-b-2 border-slate-800 pb-2 mb-2">
                    <div className="flex items-center justify-between text-[9px] text-slate-700 font-bold mb-1">
                      <span>جمهوری اسلامی ایران • ستاد انتخابات</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black">
                        تعرفه نواری بارکددار با ته‌برگ سابقه (آماده برش و منگنه دفترچه‌ای)
                      </span>
                      <span>شعبه: {toPersianDigits(session.stationNumber)}</span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900 leading-tight">{config.title}</h4>
                    <p className="text-[9px] text-slate-600 mt-0.5">
                      در هر ردیف یک کاندیدا به صورت باریک قرار دارد. ته‌برگ هر کاندیدا حاوی کد اختصاصی و محل منگنه است تا برگه‌ها بریده و روی هم منگنه شوند.
                    </p>
                  </div>

                  {/* Single column stack of slim horizontal strips */}
                  <div className="space-y-2">
                    {candidates.slice(0, 8).map((cand) => (
                      <div 
                        key={cand.id} 
                        className="border-2 border-dashed border-slate-400 rounded-lg bg-white relative flex items-stretch text-slate-900 overflow-hidden shadow-sm"
                      >
                        {/* RIGHT: Main voting slip (تعرفه اصلی جهت اسکن و انداختن در صندوق) */}
                        <div className="flex-1 p-2 flex items-center justify-between gap-3 min-w-0">
                          {/* Candidate photo & details */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {config.showCandidatePhotos && (
                              <img
                                src={cand.avatarUrl}
                                alt={cand.name}
                                className="w-9 h-9 rounded-md object-cover border border-slate-300 flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              {/* Full Candidate Name - Never truncated */}
                              <h5 className="font-black text-xs sm:text-sm text-slate-950 leading-snug break-words">
                                {cand.name}
                              </h5>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="font-mono text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-black flex-shrink-0">
                                  کد: {toPersianDigits(cand.candidateNumber)}
                                </span>
                                {config.showCandidateAffiliations && cand.affiliation && (
                                  <span className="text-[8px] text-slate-500 truncate max-w-[140px]">{cand.affiliation}</span>
                                )}
                                <span className="text-[7.5px] text-slate-400 font-mono flex items-center gap-1">
                                  <span>شعبه {toPersianDigits(session.stationNumber)}</span>
                                  <span>•</span>
                                  <span>صندوق {session.boxNumber}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Seal box & Barcode */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {config.showOfficialStamps && (
                              <div className="border border-dashed border-slate-400 rounded p-0.5 text-[7px] text-slate-500 text-center w-10 flex flex-col items-center justify-center min-h-[30px] flex-shrink-0">
                                <Stamp className="w-2.5 h-2.5 text-slate-400" />
                                <span className="leading-none mt-0.5">محل مهر</span>
                              </div>
                            )}

                            <div className="bg-slate-50 border border-slate-200 rounded p-1 flex flex-col items-center justify-center flex-shrink-0">
                              <BarcodeSvg 
                                value={toEnglishDigits(cand.candidateNumber).replace(/\D/g, '') || String(cand.registrationOrder || '101')} 
                                className="h-6 max-w-[95px]" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* CENTER: Vertical Perforation line */}
                        <div className="w-4 border-r-2 border-dashed border-slate-400 flex flex-col items-center justify-center bg-slate-100 text-slate-600 px-0.5 select-none flex-shrink-0">
                          <Scissors className="w-2.5 h-2.5 text-slate-600" />
                          <span className="text-[6.5px] [writing-mode:vertical-rl] font-bold text-slate-500 my-0.5 tracking-tighter">
                            خط برش
                          </span>
                        </div>

                        {/* LEFT: Stub (ته‌برگ سابقه با کد نامزد و محل منگنه) */}
                        <div className="w-28 sm:w-32 bg-amber-50/50 p-1.5 flex flex-col justify-between text-right flex-shrink-0 border-r border-slate-200">
                          <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-0.5 mb-0.5">
                            <span className="text-[7.5px] text-slate-600 font-mono flex items-center gap-0.5 font-bold">
                              <span>📎</span>
                              <span>محل منگنه</span>
                            </span>
                            <span className="text-[7.5px] font-black text-slate-700">ته‌برگ سابقه</span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] text-slate-600 font-medium">کد نامزد:</span>
                              <strong className="text-[11px] font-black font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-1 py-0.2 rounded">
                                {toPersianDigits(cand.candidateNumber)}
                              </strong>
                            </div>
                            <p className="text-[8.5px] font-bold text-slate-900 mt-0.5 leading-snug break-words">{cand.name}</p>
                          </div>

                          <div className="border-t border-dotted border-slate-300 pt-0.5 mt-0.5 flex items-center justify-between text-[7px] text-slate-500 font-mono">
                            <span>امضا / اثر انگشت</span>
                            <span>#{toPersianDigits(cand.candidateNumber)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {candidates.length > 8 && (
                    <div className="text-[9px] text-center text-slate-500 mt-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 font-mono">
                      نمایش ۸ نامزد صفحه اول از مجموع {toPersianDigits(candidates.length)} نامزد (در هنگام چاپ در {toPersianDigits(Math.ceil(candidates.length / 8))} برگه مجزا تفکیک می‌شود)
                    </div>
                  )}
                </div>
              ) : (
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
              )}

            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          PRINT ONLY AREA: Rendered exclusively when window.print() is executed!
          Contains full set of configured ballots ready for physical paper printing.
      ========================================================================== */}
      <div id="ballot-paper-print-document" className="ballot-paper-print-root print-only print:block text-black bg-white" dir="rtl">
        {config.layoutStyle === 'INDIVIDUAL_BARCODE_CARDS' ? (
          (() => {
            const CANDIDATES_PER_SHEET = 8;
            const candidateChunks: Candidate[][] = [];
            for (let i = 0; i < candidates.length; i += CANDIDATES_PER_SHEET) {
              candidateChunks.push(candidates.slice(i, i + CANDIDATES_PER_SHEET));
            }
            if (candidateChunks.length === 0) candidateChunks.push([]);

            const totalSets = Math.max(1, config.totalCopiesToPrint);

            return Array.from({ length: totalSets }).flatMap((_, setIdx) =>
              candidateChunks.map((chunk, chunkIdx) => (
                <div 
                  key={`set-${setIdx}-chunk-${chunkIdx}`} 
                  className="w-full min-h-[297mm] p-4 box-border bg-white text-black break-after-page flex flex-col justify-between"
                  style={{ pageBreakAfter: 'always' }}
                >
                  <div>
                    {/* Header on printed sheet */}
                    <div className="text-center border-b-2 border-black pb-1.5 mb-2">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span>جمهوری اسلامی ایران • ستاد انتخابات</span>
                        <span className="border-2 border-black px-2.5 py-0.5 rounded font-black text-xs bg-gray-100">
                          برگه‌های تعرفه رأی نواری بارکددار با ته‌برگ سابقه و منگنه دفترچه‌ای
                          {totalSets > 1 ? ` (دسته ${toPersianDigits(setIdx + 1)} از ${toPersianDigits(totalSets)})` : ''}
                        </span>
                        <span>شعبه: {toPersianDigits(session.stationNumber)}</span>
                      </div>
                      <h3 className="font-black text-sm text-black">{config.title}</h3>
                      <p className="text-[9px] text-gray-800 mt-0.5 font-medium">
                        دستورالعمل: تعرفه‌های نواری زیر را از خط‌چین افقی برش بزنید. برگه‌های نامزدها را به ترتیب روی هم چیده و از سمت چپ (بخش ته‌برگ) منگنه کنید تا دفترچه تعرفه رأی‌دهنده آماده شود. رأی‌دهنده برگه نامزد منتخب را از خط پرفراژ جدا کرده و در صندوق می‌اندازد.
                      </p>
                    </div>

                    {/* Single column of slim horizontal strips */}
                    <div className="space-y-1.5">
                      {chunk.map((cand) => (
                        <div 
                          key={cand.id} 
                          className="border-2 border-dashed border-black rounded-lg bg-white relative flex items-stretch text-black overflow-hidden break-inside-avoid min-h-[29mm]"
                        >
                          {/* RIGHT SIDE: Main Ballot Slip */}
                          <div className="flex-1 p-2 flex items-center justify-between gap-3 min-w-0">
                            {/* Candidate Info */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {config.showCandidatePhotos && (
                                <img 
                                  src={cand.avatarUrl} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded-md border border-black flex-shrink-0" 
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                {/* Full Candidate Name - Never truncated */}
                                <strong className="text-sm sm:text-base block text-black font-black leading-snug break-words">
                                  {cand.name}
                                </strong>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                  <span className="font-mono text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-black flex-shrink-0">
                                    کد: {toPersianDigits(cand.candidateNumber)}
                                  </span>
                                  {config.showCandidateAffiliations && cand.affiliation && (
                                    <span className="text-[9px] text-gray-800 font-bold truncate max-w-[150px]">{cand.affiliation}</span>
                                  )}
                                  <span className="text-[8px] text-gray-600 font-mono flex items-center gap-1.5">
                                    <span>شعبه: {toPersianDigits(session.stationNumber)}</span>
                                    <span>•</span>
                                    <span>صندوق: {session.boxNumber}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stamp & Barcode */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {config.showOfficialStamps && (
                                <div className="border border-dashed border-black rounded p-1 text-[8px] text-center w-12 flex flex-col items-center justify-center min-h-[36px] flex-shrink-0">
                                  <Stamp className="w-3.5 h-3.5 mx-auto mb-0.5" />
                                  <span className="leading-none">محل مهر</span>
                                </div>
                              )}

                              <div className="border border-black rounded p-1 bg-white flex flex-col items-center justify-center flex-shrink-0">
                                <BarcodeSvg 
                                  value={toEnglishDigits(cand.candidateNumber).replace(/\D/g, '') || String(cand.registrationOrder || '101')} 
                                  className="h-7 max-w-[115px]" 
                                />
                              </div>
                            </div>
                          </div>

                          {/* VERTICAL PERFORATION / CUT DIVIDER */}
                          <div className="w-5 border-r-2 border-dashed border-black flex flex-col items-center justify-center bg-gray-100 text-black px-0.5 select-none flex-shrink-0">
                            <Scissors className="w-3.5 h-3.5" />
                            <span className="text-[7px] [writing-mode:vertical-rl] font-bold text-gray-700 my-0.5 tracking-tighter">
                              خط پرفراژ
                            </span>
                          </div>

                          {/* LEFT SIDE: STUB (ته‌برگ سابقه) */}
                          <div className="w-32 sm:w-36 bg-gray-50 p-2 flex flex-col justify-between text-right flex-shrink-0 border-r border-black">
                            <div className="flex items-center justify-between border-b border-dashed border-gray-400 pb-0.5 mb-1">
                              <span className="text-[8px] font-mono text-gray-700 flex items-center gap-0.5 font-bold">
                                <span>📎</span>
                                <span>محل منگنه</span>
                              </span>
                              <span className="text-[8px] font-black text-black">
                                ته‌برگ سابقه
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-700 font-bold">کد نامزد:</span>
                                <strong className="text-sm font-black font-mono text-black bg-white border border-black px-1.5 py-0.2 rounded">
                                  {toPersianDigits(cand.candidateNumber)}
                                </strong>
                              </div>
                              <p className="text-[9.5px] font-black text-black mt-0.5 leading-snug break-words">
                                {cand.name}
                              </p>
                            </div>

                            <div className="border-t border-dotted border-gray-400 pt-0.5 mt-0.5 flex items-center justify-between text-[7.5px] text-gray-600 font-mono">
                              <span>امضا / اثر انگشت</span>
                              <span>#{toPersianDigits(cand.registrationOrder || cand.candidateNumber)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sheet Footer */}
                  <div className="border-t border-black pt-1.5 text-[9px] text-center text-gray-700 flex items-center justify-between font-mono">
                    <span>
                      دسته {toPersianDigits(setIdx + 1)} از {toPersianDigits(totalSets)}
                      {candidateChunks.length > 1 ? ` (بخش ${toPersianDigits(chunkIdx + 1)} از ${toPersianDigits(candidateChunks.length)})` : ''}
                    </span>
                    <span>سامانه جامع مدیریت و شمارش انتخابات حضوری</span>
                  </div>
                </div>
              ))
            );
          })()
        ) : (
          Array.from({ length: totalSheets }).map((_, sheetIdx) => (
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
        ))
        )}
      </div>

    </div>
  );
};
