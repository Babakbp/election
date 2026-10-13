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
  Layers
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
  const [activeTabRole, setActiveTabRole] = useState<StationRole>('checkin');
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

  // Generate QR Code for selected station link
  useEffect(() => {
    if (!isOpen) return;

    const baseHost = window.location.host;
    const protocol = window.location.protocol;
    // Prefer network IP if available and user is accessing via network, otherwise window.location
    const stationUrl = `${protocol}//${baseHost}/?station=${activeTabRole}`;

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
  }, [isOpen, activeTabRole]);

  if (!isOpen) return null;

  const getStationUrl = (role: StationRole) => {
    const baseHost = window.location.host;
    const protocol = window.location.protocol;
    return `${protocol}//${baseHost}/?station=${role}`;
  };

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

        {/* Section for Network Mode Configuration */}
        {currentMode === 'NETWORK_MULTI' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>لینک‌ها و بارکدهای اتصال ترمینال‌های فرعی</span>
              </div>
              <span className="text-xs text-slate-400">
                دستگاه‌های متصل فعال: {toPersianDigits(connectedStations.length)} دستگاه
              </span>
            </div>

            {/* Station Selector Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTabRole('checkin')}
                className={`py-3 px-3 rounded-2xl text-xs md:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-2 border transition-all ${
                  activeTabRole === 'checkin'
                    ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>باجه ثبت ورود (لپ‌تاپ ۲)</span>
              </button>

              <button
                onClick={() => setActiveTabRole('kiosk')}
                className={`py-3 px-3 rounded-2xl text-xs md:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-2 border transition-all ${
                  activeTabRole === 'kiosk'
                    ? 'bg-emerald-600/30 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Vote className="w-4 h-4 text-emerald-400" />
                <span>کیوسک لمسی اخذ رأی</span>
              </button>

              <button
                onClick={() => setActiveTabRole('projector')}
                className={`py-3 px-3 rounded-2xl text-xs md:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-2 border transition-all ${
                  activeTabRole === 'projector'
                    ? 'bg-blue-600/30 border-blue-500 text-white ring-2 ring-blue-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-4 h-4 text-blue-400" />
                <span>پروژکتور سالن</span>
              </button>
            </div>

            {/* Station Details & QR Code */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900 p-5 rounded-2xl border border-slate-800">
              {/* QR Code */}
              <div className="bg-white p-2.5 rounded-2xl shadow-md flex-shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-36 h-36" />
                ) : (
                  <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-xl" />
                )}
              </div>

              {/* Station Info & Direct URL */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-100 text-base flex items-center gap-2">
                    {activeTabRole === 'checkin' && 'لپ‌تاپ ۲: باجه ثبت ورود و پذیرش واجدین شرایط'}
                    {activeTabRole === 'kiosk' && 'مانیتور لمسی: کیوسک اخذ رأی دیجیتال'}
                    {activeTabRole === 'projector' && 'نمایشگر زنده پروژکتور سالن'}
                  </h4>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeTabRole === 'checkin' &&
                    'این آدرس را روی لپ‌تاپ یا تبلت دوم باز کنید تا متصدی بتواند مراجعین را جستجو و بارکد کارت ملی را اسکن کرده و ورود آنها را در لحظه ثبت کند.'}
                  {activeTabRole === 'kiosk' &&
                    'این آدرس را روی لپ‌تاپ متصل به مانیتور لمسی باز کنید تا رأی‌دهندگان با زدن دکمه کاندیدا رأی دهند و فوراً به صندوق اضافه شود.'}
                  {activeTabRole === 'projector' &&
                    'این آدرس را روی دستگاه متصل به پروژکتور یا تلویزیون سالن باز کنید تا نمودار نتایج را به صورت زنده نمایش دهد.'}
                </p>

                {/* Direct Link Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getStationUrl(activeTabRole)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 dir-ltr select-all focus:outline-none"
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
                        <span>کپی لینک</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onSelectStationRole(activeTabRole);
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-900/30"
                  >
                    <span>اجرا در همین سیستم</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* WiFi Setup Guide Banner */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
              <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block mb-0.5">
                  راهنمای اتصال آسان دو لپ‌تاپ در سالن انتخابات:
                </strong>
                کافیست هر دو دستگاه به یک مودم وای‌فای یا نقطه اتصال (Hotspot) تلفن همراه متصل باشند. سپس لینک فوق را در مرورگر دستگاه دوم وارد کنید یا با گوشی اسکن کنید. تمام داده‌ها با کمترین تاخیر در حافظه سرور و وب‌سوکت تبادل خواهند شد.
              </div>
            </div>
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
