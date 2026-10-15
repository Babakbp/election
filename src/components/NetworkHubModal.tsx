import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  syncEngine, 
  OperatingMode, 
  StationRole, 
  ConnectedStation 
} from '../utils/syncEngine';
import { toPersianDigits } from '../utils/persian';
import { 
  Network, 
  Laptop, 
  Wifi, 
  QrCode, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Radio, 
  X, 
  ShieldCheck, 
  Users, 
  Vote, 
  Tv, 
  Smartphone, 
  Check, 
  RefreshCw,
  Info,
  Layers,
  Cable,
  Monitor,
  Terminal,
  AlertTriangle
} from 'lucide-react';

interface NetworkHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: OperatingMode;
  onSelectMode: (mode: OperatingMode) => void;
  onSelectStationRole: (role: StationRole) => void;
}

export const NetworkHubModal: React.FC<NetworkHubModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  onSelectStationRole,
}) => {
  const [networkInfo, setNetworkInfo] = useState<{
    localIps: string[];
    primaryIp: string;
    port: number;
    connectedClientsCount: number;
  }>({
    localIps: [],
    primaryIp: 'localhost',
    port: 3000,
    connectedClientsCount: 0,
  });

  const [connectedStations, setConnectedStations] = useState<ConnectedStation[]>([]);
  const [activeTabRole, setActiveTabRole] = useState<StationRole>('kiosk');
  const [connectionMedium, setConnectionMedium] = useState<'LAN_CABLE' | 'WIFI' | 'HDMI_DISPLAY'>('LAN_CABLE');
  const [manualIp, setManualIp] = useState<string>('192.168.1.1');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Subscribe to connected stations
  useEffect(() => {
    if (!isOpen) return;
    const unsub = syncEngine.subscribeStations((stations) => {
      setConnectedStations(stations);
    });
    return unsub;
  }, [isOpen]);

  // Fetch host network info from server API
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network/info')
      .then((res) => res.json())
      .then((data) => {
        setNetworkInfo(data);
      })
      .catch((err) => {
        console.warn('Network info fetch failed, using window.location', err);
      });
  }, [isOpen]);

  const getStationUrl = (role: StationRole) => {
    if (connectionMedium === 'LAN_CABLE') {
      const port = networkInfo.port || 3000;
      return `http://${manualIp.trim() || '192.168.1.1'}:${port}/?station=${role}`;
    }
    if (connectionMedium === 'HDMI_DISPLAY') {
      return `http://localhost:3000/?station=${role}`;
    }
    const baseHost = window.location.host;
    const protocol = window.location.protocol;
    return `${protocol}//${baseHost}/?station=${role}`;
  };

  // Generate QR Code for selected station link
  useEffect(() => {
    if (!isOpen) return;
    const stationUrl = getStationUrl(activeTabRole);

    QRCode.toDataURL(stationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generate failed', err));
  }, [isOpen, activeTabRole, connectionMedium, manualIp, networkInfo.port]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full p-6 md:p-8 text-right shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-6 top-6 text-slate-400 hover:text-slate-100 p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100">
              تنظیم روش کاربری و شبکه وای‌فای سامانه
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              انتخاب بین «روش سابق (تک‌سیستم آفلاین)» یا «روش شبکه، چندکاربره و کیوسک لمسی»
            </p>
          </div>
        </div>

        {/* Mode Selector Cards (روش سابق vs روش شبکه) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Option 1: Standalone Offline (روش سابق) */}
          <div
            onClick={() => onSelectMode('STANDALONE')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              currentMode === 'STANDALONE'
                ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {currentMode === 'STANDALONE' && (
              <span className="absolute left-4 top-4 flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
                <Check className="w-3.5 h-3.5" /> روش فعال
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Laptop className="w-5 h-5 text-blue-400" />
              <h3 className="font-black text-slate-100 text-base">
                روش ۱: حالت مستقل (تک‌سیستمه و آفلاین)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              روش سابق و کلاسیک: مناسب زمانی که کلیه امور رأی‌گیری، ثبت‌نام، شمارش و چاپ تنها توسط یک لپ‌تاپ انجام می‌شود. بدون نیاز به اتصال شبکه یا وای‌فای.
            </p>
          </div>

          {/* Option 2: Multi-Station Network & Kiosk (روش جدید) */}
          <div
            onClick={() => onSelectMode('NETWORK_MULTI')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
              currentMode === 'NETWORK_MULTI'
                ? 'bg-gradient-to-br from-indigo-950/40 via-slate-850 to-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            {currentMode === 'NETWORK_MULTI' && (
              <span className="absolute left-4 top-4 flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" /> روش فعال
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-indigo-400" />
              <h3 className="font-black text-slate-100 text-base">
                روش ۲: شبکه محلی، چندکاربره و کیوسک لمسی
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              روش جدید و هوشمند: اتصال چند لپ‌تاپ یا تبلت از طریق وای‌فای؛ ثبت ورود رأی‌دهندگان در لپ‌تاپ شماره ۲ و رأی‌گیری در مانیتور لمسی با همگام‌سازی لحظه‌ای.
            </p>
          </div>
        </div>

        {/* Section for Network & Cable Mode Configuration */}
        {currentMode === 'NETWORK_MULTI' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6">
            
            {/* Connection Medium Selector: LAN Cable vs HDMI vs WiFi */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Cable className="w-4 h-4 text-emerald-400" />
                  نوع بستر ارتباطی بین لپ‌تاپ اصلی و لپ‌تاپ/نمایشگر لمسی:
                </span>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {connectionMedium === 'LAN_CABLE' && 'توصیه اکید برای روز انتخابات (کابل شبکه)'}
                  {connectionMedium === 'HDMI_DISPLAY' && 'بدون شبکه (مانیتور دوم یا کابل تصویر)'}
                  {connectionMedium === 'WIFI' && 'بی‌سیم (وای‌فای / هات‌اسپات)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setConnectionMedium('LAN_CABLE');
                    if (!manualIp) setManualIp('192.168.1.1');
                  }}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                    connectionMedium === 'LAN_CABLE'
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-xs md:text-sm text-emerald-400">
                    <Cable className="w-4 h-4" />
                    <span>۱. کابل شبکه (LAN)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    اتصال مستقیم با کابل شبکه RJ45 (صفر درصد قطعی، بدون نیاز به مودم یا اینترنت)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionMedium('HDMI_DISPLAY')}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                    connectionMedium === 'HDMI_DISPLAY'
                      ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-xs md:text-sm text-blue-400">
                    <Monitor className="w-4 h-4" />
                    <span>۲. کابل تصویر (HDMI)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    استفاده از مانیتور لمسی به عنوان صفحه دوم (Extend Display) در یک کامپیوتر
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConnectionMedium('WIFI')}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                    connectionMedium === 'WIFI'
                      ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-xs md:text-sm text-indigo-400">
                    <Wifi className="w-4 h-4" />
                    <span>۳. وای‌فای (Wi-Fi)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 leading-tight">
                    اتصال بی‌سیم از طریق مودم سالن یا هات‌اسپات موبایل
                  </span>
                </button>
              </div>
            </div>

            {/* Station Selector Tabs */}
            <div className="border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-bold">انتخاب ایستگاه مورد نظر:</span>
                <span className="text-xs text-slate-400">
                  دستگاه‌های فعال آنلاین: {toPersianDigits(connectedStations.length)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTabRole('kiosk')}
                  className={`py-2.5 px-3 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                    activeTabRole === 'kiosk'
                      ? 'bg-emerald-600/30 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Vote className="w-4 h-4 text-emerald-400" />
                  <span>کیوسک لمسی اخذ رأی</span>
                </button>

                <button
                  onClick={() => setActiveTabRole('checkin')}
                  className={`py-2.5 px-3 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                    activeTabRole === 'checkin'
                      ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>باجه ثبت ورود (لپ‌تاپ ۲)</span>
                </button>

                <button
                  onClick={() => setActiveTabRole('projector')}
                  className={`py-2.5 px-3 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                    activeTabRole === 'projector'
                      ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tv className="w-4 h-4 text-blue-400" />
                  <span>پروژکتور سالن</span>
                </button>
              </div>
            </div>

            {/* Station Details & Link Box */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900 p-5 rounded-2xl border border-slate-800">
              {/* QR Code (Useful for phone / tablet camera) */}
              <div className="bg-white p-2.5 rounded-2xl shadow-md flex-shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 md:w-36 md:h-36" />
                ) : (
                  <div className="w-32 h-32 bg-slate-200 animate-pulse rounded-xl" />
                )}
              </div>

              {/* Station Info & Direct URL */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    {activeTabRole === 'kiosk' && 'کیوسک لمسی اخذ رأی (لپ‌تاپ یا مانیتور لمسی)'}
                    {activeTabRole === 'checkin' && 'باجه ثبت ورود و پذیرش واجدین شرایط'}
                    {activeTabRole === 'projector' && 'نمایشگر زنده پروژکتور سالن'}
                  </h4>
                </div>

                {/* If LAN Cable: Allow setting Server IP */}
                {connectionMedium === 'LAN_CABLE' && (
                  <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">
                      IP لپ‌تاپ اصلی (سرور):
                    </span>
                    <input
                      type="text"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      placeholder="192.168.1.1"
                      className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs px-2.5 py-1 rounded-lg w-36 text-center focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setManualIp('192.168.1.1')}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                      >
                        192.168.1.1
                      </button>
                      {networkInfo.primaryIp && networkInfo.primaryIp !== '192.168.1.1' && (
                        <button
                          type="button"
                          onClick={() => setManualIp(networkInfo.primaryIp)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-1 rounded border border-slate-700"
                        >
                          IP خودکار: {networkInfo.primaryIp}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed">
                  {connectionMedium === 'LAN_CABLE' &&
                    'این آدرس را در مرورگر کروم یا اج لپ‌تاپ لمسی وارد کنید و سپس کلید F11 را بزنید تا تمام صفحه شود.'}
                  {connectionMedium === 'HDMI_DISPLAY' &&
                    'کلیدهای Windows + P را زده و Extend را انتخاب کنید؛ سپس این آدرس را در پنجره جدید باز کرده، به مانیتور لمسی بکشید و F11 را بزنید.'}
                  {connectionMedium === 'WIFI' &&
                    'مطمئن شوید هر دو لپ‌تاپ به یک وای‌فای متصل هستند؛ سپس آدرس زیر را در دستگاه دوم باز کنید.'}
                </p>

                {/* Direct Link Input */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getStationUrl(activeTabRole)}
                    className="flex-1 min-w-0 w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 dir-ltr select-all focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(getStationUrl(activeTabRole))}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedLink === getStationUrl(activeTabRole) ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>کپی آدرس</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (connectionMedium === 'HDMI_DISPLAY') {
                        window.open(getStationUrl(activeTabRole), '_blank');
                      } else {
                        onSelectStationRole(activeTabRole);
                        onClose();
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-900/30 whitespace-nowrap"
                  >
                    <span>{connectionMedium === 'HDMI_DISPLAY' ? 'باز کردن در پنجره جدید' : 'اجرا در این سیستم'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* STEP-BY-STEP INSTRUCTIONS ACCORDING TO SELECTED MEDIUM */}
            {connectionMedium === 'LAN_CABLE' && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Cable className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>راهنمای گام‌به‌گام اتصال مستقیم دو لپ‌تاپ با کابل شبکه (LAN / Ethernet):</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Step 1 */}
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="inline-block bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[11px]">
                      گام ۱: اتصال فیزیکی کابل
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      یک سر کابل شبکه (پچ‌کورد معمولی RJ45) را به پورت شبکه لپ‌تاپ اصلی و سر دیگر را به لپ‌تاپ لمسی وصل کنید. (نیازی به مودم نیست، کارت شبکه‌ها مستقیم وصل می‌شوند).
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-block bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[11px]">
                        گام ۲: تنظیم IP در ویندوز
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('ncpa.cpl')}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono"
                        title="کپی دستور Run ویندوز"
                      >
                        <Copy className="w-3 h-3" />
                        <span>ncpa.cpl</span>
                      </button>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      کلیدهای <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">Win + R</kbd> را بزنید، <code className="text-emerald-400 font-mono">ncpa.cpl</code> را تایپ و Enter کنید:
                      <br />
                      • <strong>لپ‌تاپ اصلی:</strong> آی‌پی <code className="text-emerald-300 font-mono">192.168.1.1</code> و ساب‌نت <code className="font-mono">255.255.255.0</code>
                      <br />
                      • <strong>لپ‌تاپ لمسی:</strong> آی‌پی <code className="text-emerald-300 font-mono">192.168.1.2</code> و گیت‌وی <code className="font-mono">192.168.1.1</code>
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="inline-block bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[11px]">
                      گام ۳: اجرا در لپ‌تاپ لمسی
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      در مرورگر لپ‌تاپ لمسی، آدرس زیر را وارد کنید و سپس کلید <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">F11</kbd> را برای تمام‌صفحه شدن بزنید:
                    </p>
                    <code className="block bg-slate-950 p-1.5 rounded text-[11px] font-mono text-emerald-400 text-center dir-ltr select-all">
                      http://192.168.1.1:3000/?station=kiosk
                    </code>
                  </div>
                </div>

                {/* Golden Firewall Tip (Fixed: جلوگیری از بیرون‌زدگی متن از سمت چپ) */}
                <div dir="rtl" className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl text-xs text-amber-200 w-full max-w-full overflow-hidden box-border">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <strong className="text-amber-300 font-bold text-xs sm:text-sm">
                      نکته حیاتی فایروال ویندوز (اگر صفحه باز نشد):
                    </strong>
                  </div>
                  
                  <p className="text-[11px] text-amber-200/90 leading-relaxed mb-2.5 break-words">
                    اگر لپ‌تاپ لمسی خطای عدم اتصال داد، فایروال لپ‌تاپ اصلی پورت ۳۰۰۰ را بسته است. در لپ‌تاپ اصلی، PowerShell یا CMD را با <span className="font-bold underline text-amber-100">Run as administrator</span> باز کرده و دستور زیر را اجرا فرمایید:
                  </p>
                  
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 w-full max-w-full space-y-2 box-border overflow-hidden">
                    <div dir="ltr" className="w-full bg-slate-900/90 py-2 px-3 rounded-lg border border-slate-800/80 text-left overflow-x-auto">
                      <code className="text-[11px] font-mono text-emerald-300 block select-all whitespace-normal break-all">
                        netsh advfirewall firewall add rule name="ElectionSystem" dir=in action=allow protocol=TCP localport=3000
                      </code>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => copyToClipboard('netsh advfirewall firewall add rule name="ElectionSystem" dir=in action=allow protocol=TCP localport=3000')}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition shadow-sm active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی دستور فایروال</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {connectionMedium === 'HDMI_DISPLAY' && (
              <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                  <Monitor className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>راهنمای اتصال از طریق کابل تصویر (HDMI / مانیتور لمسی دوم):</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="inline-block bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[11px]">
                      گام ۱: اتصال کابل تصویر و لمس
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      کابل تصویر HDMI (و کابل USB تاچ در صورتی که مانیتور لمسی مجزا دارید) را به لپ‌تاپ اصلی متصل کنید.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="inline-block bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[11px]">
                      گام ۲: توسعه تصویر در ویندوز
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      کلیدهای <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">Windows + P</kbd> را در ویندوز زده و گزینه <strong className="text-blue-300">Extend (توسعه)</strong> را انتخاب کنید تا مانیتور دوم فعال شود.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="inline-block bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[11px]">
                      گام ۳: انتقال کیوسک به صفحه لمسی
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      دکمه «باز کردن در پنجره جدید» بالا را بزنید، پنجره باز شده را با ماوس بکشید و داخل مانیتور لمسی ببرید و کلید <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">F11</kbd> را بزنید.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span><strong>مزیت بزرگ این روش:</strong> چون همه چیز روی یک کامپیوتر اجرا می‌شود، هیچ نیازی به شبکه یا وای‌فای ندارد و قطعی آن غیرممکن است.</span>
                </div>
              </div>
            )}

            {connectionMedium === 'WIFI' && (
              <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 md:p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Wifi className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>راهنمای اتصال از طریق شبکه وای‌فای (مودم سالن یا هات‌اسپات گوشی):</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  هر دو لپ‌تاپ را به یک مودم یا هات‌اسپات متصل کنید. در لپ‌تاپ اصلی در برنامه CMD دستور <code className="text-amber-300 font-mono">ipconfig</code> را بزنید تا IPv4 را ببینید (مثلاً 192.168.1.5)، سپس در مرورگر لپ‌تاپ لمسی آدرس <code className="text-emerald-400 font-mono">http://[آی‌پی]:3000/?station=kiosk</code> را وارد کنید.
                </p>
              </div>
            )}

          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md"
          >
            تأیید و ذخیره تنظیمات
          </button>
        </div>
      </div>
    </div>
  );
};
