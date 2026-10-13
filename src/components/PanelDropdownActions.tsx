import React, { useState, useRef, useEffect } from 'react';
import { 
  Tv, 
  ChevronDown, 
  HardDriveDownload, 
  Archive, 
  FileSpreadsheet, 
  HelpCircle, 
  Grid3X3, 
  ShieldCheck,
  Sparkles,
  Maximize,
  Minimize,
  Wifi,
  Laptop,
  Network
} from 'lucide-react';
import { toPersianDigits } from '../utils/persian';

export interface PanelDropdownActionsProps {
  onOpenProjector?: () => void;
  onOpenGuide?: () => void;
  onOpenBackup?: () => void;
  onNavigateToArchive?: () => void;
  onExportExcel?: () => void;
  onOpenManualTallySheet?: () => void;
  onOpenSecurity?: () => void;
  onOpenNetworkHub?: () => void;
  operatingMode?: 'STANDALONE' | 'NETWORK_MULTI';
  archivedCount?: number;
  className?: string;
  isHeader?: boolean;
}

export const PanelDropdownActions: React.FC<PanelDropdownActionsProps> = ({
  onOpenProjector,
  onOpenGuide,
  onOpenBackup,
  onNavigateToArchive,
  onExportExcel,
  onOpenManualTallySheet,
  onOpenSecurity,
  onOpenNetworkHub,
  operatingMode = 'STANDALONE',
  archivedCount = 0,
  className = '',
  isHeader = false,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'backup' | 'tools' | null>(null);

  const backupRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        openDropdown === 'backup' &&
        backupRef.current &&
        !backupRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'tools' &&
        toolsRef.current &&
        !toolsRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  // Fullscreen state & change listener
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 flex-wrap ${className}`} dir="rtl">
      
      {/* ====================================================================
          1. کلید پروژکتور سالن: بولد، درشت‌تر و بسیار چشمگیر
      ===================================================================== */}
      {onOpenProjector && (
        <button
          type="button"
          onClick={onOpenProjector}
          title="نمایشگر زنده مخصوص ویدئو پروژکتور سالن (کلید میانبر Win + P)"
          className={`bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-950/60 border border-indigo-400/60 hover:scale-105 active:scale-95 transition-all transform ${
            isHeader 
              ? 'px-4 py-2 text-xs sm:text-sm ring-2 ring-indigo-500/40' 
              : 'px-5 py-2.5 text-sm sm:text-base ring-2 ring-indigo-500/50'
          }`}
        >
          <Tv className={isHeader ? 'w-4 h-4 sm:w-5 sm:h-5 text-indigo-100' : 'w-5 h-5 text-indigo-100'} />
          <span>پروژکتور سالن</span>
          <span className="relative flex h-2.5 w-2.5 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* ====================================================================
          کلید نمایش تمام‌صفحه (Fullscreen Toggle)
      ===================================================================== */}
      <button
        type="button"
        onClick={handleToggleFullscreen}
        title={isFullscreen ? 'خروج از حالت تمام‌صفحه (Esc)' : 'مشاهده تمام‌صفحه برنامه (F11)'}
        className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm border ${
          isFullscreen
            ? 'bg-amber-950/70 border-amber-500/50 text-amber-200 hover:bg-amber-900/80'
            : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/90 hover:text-white'
        }`}
      >
        {isFullscreen ? (
          <>
            <Minimize className="w-3.5 h-3.5 text-amber-300" />
            <span>خروج از تمام‌صفحه</span>
          </>
        ) : (
          <>
            <Maximize className="w-3.5 h-3.5 text-slate-300" />
            <span>تمام‌صفحه</span>
          </>
        )}
      </button>

      {/* ====================================================================
          کلید روش کاربری و شبکه وای‌فای (مستقل / شبکه و کیوسک)
      ===================================================================== */}
      {onOpenNetworkHub && (
        <button
          type="button"
          onClick={onOpenNetworkHub}
          title="تغییر روش کاربری: روش سابق (تک‌سیستمه آفلاین) یا روش شبکه و کیوسک لمسی"
          className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm border ${
            operatingMode === 'NETWORK_MULTI'
              ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 hover:bg-indigo-900 ring-2 ring-indigo-500/30'
              : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-700/90 hover:text-white'
          }`}
        >
          {operatingMode === 'NETWORK_MULTI' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>شبکه و کیوسک</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </>
          ) : (
            <>
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>روش: تک‌سیستمه</span>
            </>
          )}
        </button>
      )}

      {/* ====================================================================
          2. کلید کشویی: پشتیبان و خروجی داده (Backup, Archive & Excel)
      ===================================================================== */}
      <div className="relative" ref={backupRef}>
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === 'backup' ? null : 'backup')}
          className={`px-3 py-1.5 sm:py-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
            openDropdown === 'backup' ? 'ring-2 ring-emerald-500/50 bg-slate-800 text-white' : ''
          }`}
          title="عملیات پشتیبان‌گیری در فلش/ابری، بایگانی جلسات و دریافت فایل اکسل"
        >
          <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
          <span>پشتیبان و خروجی</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            openDropdown === 'backup' ? 'rotate-180' : ''
          }`} />
        </button>

        {openDropdown === 'backup' && (
          <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-72 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 mb-1">
              عملیات داده‌ها و ذخیره‌سازی
            </div>

            {/* Item 1: Backup */}
            {onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onOpenBackup();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-900/60 transition flex-shrink-0">
                  <HardDriveDownload className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
                    پشتیبان‌گیری (فلش مموری / ابری)
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    ذخیره در پوشه انتخابی کامپیوتر یا سرور ابری
                  </div>
                </div>
              </button>
            )}

            {/* Item 2: Sessions Archive */}
            {onNavigateToArchive && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onNavigateToArchive();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400 group-hover:bg-purple-900/60 transition flex-shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition">
                      بایگانی جلسات پایان‌یافته
                    </span>
                    {archivedCount > 0 && (
                      <span className="font-mono text-[10px] bg-purple-900/80 text-purple-200 px-1.5 py-0.2 rounded-md border border-purple-500/30">
                        {toPersianDigits(archivedCount)} جلسه
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    مرور سوابق، بازبینی و بازگردانی دوره‌ها
                  </div>
                </div>
              </button>
            )}

            {/* Item 3: Export Excel */}
            {onExportExcel && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onExportExcel();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-400 group-hover:bg-teal-900/60 transition flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                    دریافت فایل اکسل (.xlsx)
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    خروجی تفکیکی آمار نامزدها و برگه شمارش
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          3. کلید کشویی: ابزارها و راهنما (Guide, Manual Tally & Security)
      ===================================================================== */}
      <div className="relative" ref={toolsRef}>
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === 'tools' ? null : 'tools')}
          className={`px-3 py-1.5 sm:py-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
            openDropdown === 'tools' ? 'ring-2 ring-sky-500/50 bg-slate-800 text-white' : ''
          }`}
          title="راهنمای مراحل انتخابات، فرم چاپی دستی و تنظیمات امنیت"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          <span>ابزارها و راهنما</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            openDropdown === 'tools' ? 'rotate-180' : ''
          }`} />
        </button>

        {openDropdown === 'tools' && (
          <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-72 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-800 mb-1">
              امکانات جانبی و راهنما
            </div>

            {/* Item 1: Guide Modal */}
            {onOpenGuide && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onOpenGuide();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-400 group-hover:bg-sky-900/60 transition flex-shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition">
                    راهنمای جامع مراحل انتخابات
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    آموزش گام‌به‌گام برگزاری و معرفی ابزارهای سامانه
                  </div>
                </div>
              </button>
            )}

            {/* Item 2: Manual Tally Sheet */}
            {onOpenManualTallySheet && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onOpenManualTallySheet();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-400 group-hover:bg-teal-900/60 transition flex-shrink-0">
                  <Grid3X3 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-teal-300 transition">
                    فرم چاپی شمارش دستی
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    جدول ۵۰تایی تفکیک ده‌تایی با قلم و امضای اعضا
                  </div>
                </div>
              </button>
            )}

            {/* Item 3: Security & License */}
            {onOpenSecurity && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onOpenSecurity();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400 group-hover:bg-amber-900/60 transition flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition">
                    تنظیمات امنیتی و لایسنس
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    تغییر رمز عبور مدیر، قفل خودکار و فعال‌سازی
                  </div>
                </div>
              </button>
            )}

            {/* Item 4: Network Hub & Station Switcher */}
            {onOpenNetworkHub && (
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  onOpenNetworkHub();
                }}
                className="w-full text-right p-2.5 rounded-xl hover:bg-slate-800/90 text-slate-200 hover:text-white flex items-center gap-3 transition group"
              >
                <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-900/60 transition flex-shrink-0">
                  <Network className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition flex items-center justify-between">
                    <span>روش کاربری و شبکه وای‌فای</span>
                    <span className="text-[10px] text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30">
                      {operatingMode === 'NETWORK_MULTI' ? 'شبکه فعال' : 'تک‌سیستمه'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    اتصال لپ‌تاپ ۲ پذیرش، کیوسک لمسی و پروژکتور
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
