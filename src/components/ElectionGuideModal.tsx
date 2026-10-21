import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  Search, 
  CheckCircle2, 
  ArrowLeft, 
  Vote, 
  Users, 
  UserCheck, 
  Ticket, 
  Settings2, 
  FileCheck2, 
  ScrollText, 
  Tv, 
  Grid3X3, 
  FileSpreadsheet, 
  ShieldCheck, 
  HardDriveDownload, 
  Keyboard, 
  Sparkles, 
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Layers,
  MonitorPlay,
  Monitor,
  Printer,
  Archive,
  Copy,
  Check,
  Cable,
  Wifi,
  Laptop,
  Maximize2
} from 'lucide-react';
import { toPersianDigits } from '../utils/persian';
import { getProjectorUrl, tryOpenProjectorWindow } from '../utils/projectorLink';
import { ProjectorLauncherModal } from './ProjectorLauncherModal';

interface ElectionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'VOTING' | 'AUDIT' | 'CANDIDATES' | 'VOTERS' | 'BALLOTS' | 'SESSION' | 'MINUTES' | 'ARCHIVE') => void;
  onOpenManualTallySheet?: () => void;
  onOpenProjector?: () => void;
  onOpenBackup?: () => void;
  onOpenSecurity?: () => void;
}

export const ElectionGuideModal: React.FC<ElectionGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenManualTallySheet,
  onOpenProjector,
  onOpenBackup,
  onOpenSecurity,
}) => {
  const [activeSection, setActiveSection] = useState<'STEPS' | 'PROJECTOR' | 'TOOLS' | 'TIPS'>('STEPS');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  const handleCopyProjectorLink = async () => {
    const url = getProjectorUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setIsLauncherOpen(true);
    }
  };

  if (!isOpen) return null;

  // Step-by-step Election Workflow stages
  const electionSteps = [
    {
      id: 1,
      title: 'گام اول: پیکربندی و آماده‌سازی شعبه (قبل از شروع اخذ رأی)',
      badge: 'مرحله مقدماتی',
      color: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
      description: 'پیش از ورود رأی‌دهندگان، تنظیمات پایه، هیئت اجرایی و لیست نامزدها و واجدین شرایط را تکمیل نمایید.',
      actions: [
        {
          label: 'تنظیمات شعبه و عوامل',
          icon: Settings2,
          tab: 'SESSION' as const,
        },
        {
          label: 'ثبت نامزدهای رسمی',
          icon: Users,
          tab: 'CANDIDATES' as const,
        },
        {
          label: 'فهرست واجدین شرایط',
          icon: UserCheck,
          tab: 'VOTERS' as const,
        },
      ],
      details: [
        'در تب «تنظیمات شعبه»، عنوان انتخابات، شماره حوزه و شعبه، تعداد کرسی‌های اصلی و علی‌البدل و حداقل سن مجاز رأی‌دهی را مشخص کنید.',
        'اعضای هیئت اجرایی، ناظران شورای نگهبان یا هیئت نظارت و اپراتورها را در لیست عوامل ثبت نمایید.',
        'در تب «نامزدهای رسمی»، اسامی داوطلبان، کد انتخاباتی اختصاصی، ائتلاف و تصویر آن‌ها را وارد کنید یا از دکمه ورود اکسل بهره ببرید.',
        'در تب «واجدین شرایط»، لیست رأی‌دهندگان به همراه کد ملی را بارگذاری نمایید تا از رأی تکراری جلوگیری شود.',
      ],
    },
    {
      id: 2,
      title: 'گام دوم: طراحی، صدور و چاپ تعرفه‌ها و فرم‌های شمارش دستی',
      badge: 'مرحله چاپ اسناد',
      color: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
      description: 'تعرفه‌های رأی ضد جعل و فرم‌های رسمی شمارش دستی کاندیداها را چاپ و برای جلسه آماده کنید.',
      actions: [
        {
          label: 'طراحی و چاپ تعرفه رأی',
          icon: Ticket,
          tab: 'BALLOTS' as const,
        },
        {
          label: 'فرم شمارش دستی (جدول ۵۰ تایی)',
          icon: Grid3X3,
          specialAction: 'MANUAL_TALLY',
        },
      ],
      details: [
        'در تب «طراحی و چاپ تعرفه رأی»، می‌توانید برگه رأی را در قالب‌های ۱ تا ۴ ستونه شخصی‌سازی نمایید.',
        'فعال‌سازی گزینه‌های امنیتی تعرفه شامل: بارکد یکتا، کد QR، مهر رسمی هیئت نظارت، راهنمای رأی‌دهنده و زمینه ضد تقلب.',
        'چاپ «فرم شمارش دستی کاندیداها»: در بالای صفحه روی دکمه «فرم شمارش دستی» کلیک کنید؛ فرم استاندارد شامل مشخصات کاندیدا و ۵ دسته ۱۰ تایی خانه شطرنجی (۵۰ مربع تیک‌زدن آرا) با سورت الفبایی و کادر امضای مسئولین آماده چاپ در قطع A4 است.',
      ],
    },
    {
      id: 3,
      title: 'گام سوم: بازرسی، پلمپ صندوق و آغاز رسمی رأی‌گیری',
      badge: 'آغاز اخذ رأی',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      description: 'تایید خالی بودن صندوق، پلمپ رسمی و کنترل هویت رأی‌دهندگان در زمان ورود.',
      actions: [
        {
          label: 'کنترل واجدین شرایط و بارکد',
          icon: UserCheck,
          tab: 'VOTERS' as const,
        },
        {
          label: 'تغییر وضعیت به شمارش فعال',
          icon: Settings2,
          tab: 'SESSION' as const,
        },
      ],
      details: [
        'ناظرین و رئیس شعبه خالی بودن صندوق را بررسی و پلمپ فیزیکی را انجام می‌دهند.',
        'حین مراجعه رأی‌دهنده، کدملی یا بارکد کارت وی در تب «واجدین شرایط» اسکن/استعلام می‌شود تا از رأی مجدد ممانعت گردد.',
        'تعرفه رسمی ممهور به مهر شعبه به رأی‌دهنده تحویل داده می‌شود.',
      ],
    },
    {
      id: 4,
      title: 'گام چهارم: بازگشایی صندوق و شمارش زنده آرا (Live Tallying)',
      badge: 'شمارش زنده حضوری',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      description: 'شمارش شفاف آرا در حضور ناظران با قابلیت نمایش زنده روی ویدئو پروژکتور سالن.',
      actions: [
        {
          label: 'پنل شمارش زنده و صندوق',
          icon: Vote,
          tab: 'VOTING' as const,
        },
        {
          label: 'آموزش تفکیک پروژکتور (Extend)',
          icon: Tv,
          specialAction: 'SHOW_PROJECTOR_GUIDE',
        },
        {
          label: 'باز کردن پروژکتور سالن',
          icon: MonitorPlay,
          specialAction: 'PROJECTOR',
        },
      ],
      details: [
        'در بالای صفحه وضعیت جلسه را به «شمارش زنده حضوری فعال است» تغییر دهید.',
        'اپراتور می‌تواند با وارد کردن کد نامزد و زدن Enter (یا کلیک روی نامزد)، به سرعت هر رأی را ثبت کند.',
        'ثبت آرای باطله (سفید، خط‌خورده، مخدوش، نام غیرمجاز) با دکمه‌های اختصاصی تعبیه شده انجام می‌شود.',
        'تفکیک پروژکتور سالن از لپ‌تاپ اپراتور: کابل تصویر را به ویدئو پروژکتور متصل کنید، در ویندوز کلیدهای Win + P را بزنید و گزینه Extend (توسعه) را انتخاب نمایید. سپس روی دکمه «پروژکتور سالن» کلیک کرده و «باز کردن در پنجره مستقل» را بزنید. پنجره باز شده را با ماوس به داخل پرده پروژکتور برده و F11 را بزنید تا تمام‌صفحه شود. در این حالت لپ‌تاپ اپراتور برای ثبت رأی کاملاً آزاد می‌ماند و سالن فقط نمودارهای زنده را می‌بیند.',
        'امکان لغو سریع آخرین رأی ثبت‌شده (Undo) در صورت اشتباه سهوی اپراتور فراهم است.',
      ],
    },
    {
      id: 5,
      title: 'گام پنجم: نظارت، اصلاح مغایرت‌ها و ثبت اعتراضات',
      badge: 'نظارت و شکایات',
      color: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
      description: 'بررسی اعتراض کاندیداها و اعمال اصلاحات امنیتی با ثبت در دفتر کل ردگیری.',
      actions: [
        {
          label: 'دفتر کل ردگیری (Audit Log)',
          icon: ScrollText,
          tab: 'AUDIT' as const,
        },
      ],
      details: [
        'در صورت بروز هرگونه اختلاف یا شکایت، وضعیت جلسه به «توقف موقت (بررسی شکایات)» تغییر می‌یابد.',
        'هرگونه اصلاح آرا نیازمند وارد کردن رمز عبور امنیتی و توضیح کتبی علت اصلاح است.',
        'تمام عملیات‌ها با مهر زمانی دقیق، نام اپراتور و هش رمزنگاری در «دفتر کل ردگیری» به صورت ضد دستکاری ثبت می‌گردد.',
      ],
    },
    {
      id: 6,
      title: 'گام ششم: پایان شمارش، امضای دیجیتال ناظران و قفل نهایی صورتجلسه',
      badge: 'نهایی‌سازی و خروجی',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
      description: 'امضای رسمی الکترونیکی، بستن پرونده، چاپ صورتجلسه رسمی، ذخیره در بایگانی دائمی و پشتیبان‌گیری در فلش/کامپیوتر.',
      actions: [
        {
          label: 'صورتجلسه و امضاها',
          icon: FileCheck2,
          tab: 'MINUTES' as const,
        },
        {
          label: 'بایگانی جلسات',
          icon: Archive,
          tab: 'ARCHIVE' as const,
        },
        {
          label: 'پشتیبان‌گیری ابری و فلش',
          icon: HardDriveDownload,
          specialAction: 'BACKUP',
        },
      ],
      details: [
        'پس از اتمام تمام آرا، به تب «صورتجلسه و امضاها» بروید.',
        'اعضای هیئت اجرایی و ناظران با قلم یا لمس صفحه در کادر مخصوص امضای دیجیتال خود را ثبت می‌کنند.',
        'پس از تایید تمام امضاها، وضعیت جلسه را به «قفل نهایی و تایید شده (قطعی)» ارتقا دهید. در این حالت جلسه به طور خودکار به «بایگانی جلسات» منتقل می‌شود.',
        'صورتجلسه رسمی استاندارد را مستقیماً چاپ کنید یا با دکمه خروجی (.xlsx) فایل کامل اکسل را ذخیره نمایید.',
        'امکان ذخیره مستقیم در پوشه تعریف‌شده روی کامپیوتر یا فلش مموری، همگام‌سازی ابری و بازبینی کامل جلسات پیشین در هر زمان فراهم است.',
      ],
    },
  ];

  // System Tools & Features Directory
  const systemTools = [
    {
      id: 'voting',
      category: 'شمارش و عملیات صندوق',
      title: 'صندوق شمارش زنده و کیبورد سریع',
      icon: Vote,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'ثبت فوق‌العاده سریع آرا از طریق کیبورد عددی (Numpad) با تایپ کد کاندیدا، کلیک مستقیم، یا اسکن بارکد. پشتیبانی از لغو آخرین رأی و ثبت آرای باطله سفید و مخدوش.',
      highlight: 'سرعت پردازش تا ۱۰۰ رأی در دقیقه بدون افت سرعت',
      tab: 'VOTING' as const,
    },
    {
      id: 'projector',
      category: 'نمایشگرها و مانیتورینگ',
      title: 'نمایشگر زنده سالن و ویدئو پروژکتور',
      icon: Tv,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      description: 'صفحه تمام‌صفحه اختصاصی برای پخش زنده روی پروژکتور تالار. نمایش رتبه‌بندی لحظه‌ای، نمودار درصد آرا، تفکیک کرسی‌های اصلی/علی‌البدل، با امکان حالت محرمانه و افکت پیروزی نهایی.',
      highlight: 'طراحی چشم‌نواز Fullscreen ویژه ناظران و حضار',
      specialAction: 'PROJECTOR',
    },
    {
      id: 'ballots',
      category: 'تعرفه و چاپ',
      title: 'طراح پیشرفته تعرفه رأی (Ballot Designer)',
      icon: Ticket,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description: 'ساخت و سفارشی‌سازی فرمت چاپی برگه رأی با چیدمان ۲، ۳ یا ۴ ستونه، کدهای QR اختصاصی، شماره سریال، بارکد اصالت، مهر رسمی هیئت نظارت و پترن ضدجعل.',
      highlight: 'چاپ مستقیم در ابعاد A4 و A5 بدون افت کیفیت',
      tab: 'BALLOTS' as const,
    },
    {
      id: 'manual-tally',
      category: 'تعرفه و چاپ',
      title: 'فرم چاپی شمارش دستی کاندیداها (جدول ۵۰ تایی)',
      icon: Grid3X3,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      description: 'طراحی شده بر اساس تقاضای کاربران برای مواقع عدم دسترسی به رایانه یا شمارش دستی قلمی. دارای ۵ دسته ۱۰ تایی خانه شطرنجی مقابل هر نامزد، سورت نام خانوادگی، و کادر امضای مسئولین.',
      highlight: 'آماده چاپ مستقیم A4 با سربرگ رسمی و تفکیک ده‌تایی',
      specialAction: 'MANUAL_TALLY',
    },
    {
      id: 'voters',
      category: 'نظارت و احراز هویت',
      title: 'دفتر واجدین شرایط و استعلام بارکد',
      icon: UserCheck,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      description: 'سامانه بررسی کدملی رأی‌دهندگان جهت جلوگیری قطعی از تکرار رأی. پشتیبانی از اسکنر بارکد فیزیکی، فیلتر حضور/غیاب، و آمار لحظه‌ای نرخ مشارکت در شعبه.',
      highlight: 'ممانعت صددرصدی از رأی تکراری و اعلام هشدار قرمز',
      tab: 'VOTERS' as const,
    },
    {
      id: 'audit',
      category: 'امنیت و ردگیری',
      title: 'دفتر کل ردگیری غیرقابل دستکاری (Audit Ledger)',
      icon: ScrollText,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'ثبت جزئی‌ترین رویدادها، زمان دقیق، شناسه اپراتور، رأی‌های اضافه یا کسر شده، اصلاحیه‌ها و تغییر وضعیت جلسه در دیتابیس ثبت وقایع با قابلیت جستجو و فیلتر.',
      highlight: 'سند معتبر حقوقی برای ارائه به مراجع نظارتی و قضایی',
      tab: 'AUDIT' as const,
    },
    {
      id: 'minutes',
      category: 'گزارشات و مستندسازی',
      title: 'صورتجلسه رسمی و امضای دیجیتال',
      icon: FileCheck2,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'تولید خودکار متن رسمی صورتجلسه نتایج بر اساس استانداردهای ابلاغی. شامل امضای دیجیتال با پد لمسی/موس ناظران و رئیس شعبه، و قابلیت قفل ابدی جلسه (LOCKED_FINAL).',
      highlight: 'قابلیت چاپ رسمی با سربرگ استاندارد و امضاهای واقعی',
      tab: 'MINUTES' as const,
    },
    {
      id: 'excel',
      category: 'گزارشات و مستندسازی',
      title: 'خروجی اکسل کامل (.xlsx)',
      icon: FileSpreadsheet,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'دانلود فایل جامع اکسل شامل چند شیت: شیت آمار کلی و شعبه، شیت تفکیکی آرا و درصد نامزدها، شیت واجدین شرایط، و شیت امضاکنندگان جلسه با فرمت استاندارد.',
      highlight: 'سازگار کامل با مایکروسافت اکسل بدون نیاز به اینترنت',
      isDirectExport: true,
    },
    {
      id: 'security',
      category: 'امنیت و لایسنس',
      title: 'سیستم امنیت، رمز مدیر و قفل صفحه',
      icon: ShieldCheck,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'تعیین رمز عبور مدیر، محافظت از اعمال تغییرات حساس (مانند تصحیح آرا یا قفل صندوق)، قفل دستی و خودکار صفحه (Lock Screen) در صورت ترک سیستم توسط اپراتور.',
      highlight: 'جلوگیری از دسترسی افراد غیرمجاز به سیستم رأی‌گیری',
      specialAction: 'SECURITY',
    },
    {
      id: 'backup',
      category: 'امنیت و پشتیبان‌گیری',
      title: 'پشتیبان‌گیری ابری و پوشه فلش/کامپیوتر',
      icon: HardDriveDownload,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      description: 'امکان انتخاب یک پوشه دائمی در هارد یا فلش مموری برای ذخیره خودکار فایل‌ها در دفعات بعدی، به همراه گاوصندوق ابری امن (Cloud Vault) با رمزنگاری SHA-256.',
      highlight: 'ذخیره خودکار در پوشه انتخابی + همگام‌سازی ابری',
      specialAction: 'BACKUP',
    },
    {
      id: 'archive',
      category: 'بایگانی و تاریخچه',
      title: 'بایگانی دائمی جلسات و بازبینی نتایج',
      icon: Archive,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'ثبت و آرشیو همیشگی جلسات مختومه، بازبینی رتبه‌بندی نامزدها، نمودارها، امضاها، استخراج اکسل تاریخی و امکان بازیابی هر دوره به عنوان جلسه فعال.',
      highlight: 'نگهداری دائمی دوره‌های پیشین با قابلیت بازبینی کامل',
      tab: 'ARCHIVE' as const,
    },
  ];

  // Best practices & shortcuts
  const tipsAndShortcuts = [
    {
      title: 'کلیدهای میانبر در زمان شمارش آرا',
      icon: Keyboard,
      items: [
        { key: 'کد نامزد + Enter', desc: 'ثبت فوری رأی برای نامزد مورد نظر در تب شمارش زنده' },
        { key: 'Ctrl + Z یا دکمه بازگشت', desc: 'لغو آخرین رأی ثبت‌شده در صورت بروز اشتباه' },
        { key: 'F11', desc: 'حالت تمام‌صفحه (Fullscreen) برای نمایشگر سالن یا پنل اپراتور' },
        { key: 'Ctrl + P', desc: 'چاپ مستقیم صورتجلسه، تعرفه رأی، یا فرم شمارش دستی' },
      ],
    },
    {
      title: 'نکات اتصال به ویدئو پروژکتور سالن',
      icon: MonitorPlay,
      items: [
        { key: 'کلید Win + P در ویندوز', desc: 'انتخاب گزینه Extend (گسترش تصویر) تا پروژکتور به عنوان نمایشگر دوم عمل کند.' },
        { key: 'تفکیک صفحه اپراتور و حضار', desc: 'پنجره نمایشگر سالن را به سمت صفحه پروژکتور بکشید تا حضار فقط نمودار را ببینند و اپراتور ثبت آرا را کنترل کند.' },
        { key: 'حالت محرمانه نمایشگر', desc: 'می‌توانید در پنل پروژکتور، تا پایان شمارش ارقام را مخفی نگه دارید تا از ایجاد هیجان کاذب جلوگیری شود.' },
      ],
    },
    {
      title: 'دستورالعمل قانونی و امنیتی برگزاری انتخابات',
      icon: ShieldCheck,
      items: [
        { key: 'تست اولیه با داده آزمایشی', desc: 'پیش از شروع واقعی با قابلیت داده‌های پیش‌فرض سامانه یک دور آزمایشی برگزار و سپس داده‌ها را ریست کنید.' },
        { key: 'پشتیبان‌گیری دوره‌ای', desc: 'در فواصل شمارش (مثلاً هر ۱۰۰ رأی) یک فایل پشتیبان با دکمه پشتیبان‌گیری دریافت نمایید.' },
        { key: 'عدم اتصال به اینترنت عمومی', desc: 'سامانه به صورت صددرصد محلی (Offline) عمل می‌کند و نیازی به اینترنت ندارد که ضامن امنیت کامل است.' },
      ],
    },
  ];

  const handleActionClick = (action: { tab?: any; specialAction?: string; isDirectExport?: boolean }) => {
    if (action.specialAction === 'SHOW_PROJECTOR_GUIDE') {
      setActiveSection('PROJECTOR');
      return;
    }
    onClose();
    if (action.tab && onNavigateTab) {
      onNavigateTab(action.tab);
    } else if (action.specialAction === 'MANUAL_TALLY' && onOpenManualTallySheet) {
      onOpenManualTallySheet();
    } else if (action.specialAction === 'PROJECTOR' && onOpenProjector) {
      onOpenProjector();
    } else if (action.specialAction === 'BACKUP' && onOpenBackup) {
      onOpenBackup();
    } else if (action.specialAction === 'SECURITY' && onOpenSecurity) {
      onOpenSecurity();
    }
  };

  // Filter items based on search query
  const filteredSteps = electionSteps.filter(s => 
    !searchQuery || 
    s.title.includes(searchQuery) || 
    s.description.includes(searchQuery) || 
    s.details.some(d => d.includes(searchQuery))
  );

  const filteredTools = systemTools.filter(t => 
    !searchQuery || 
    t.title.includes(searchQuery) || 
    t.description.includes(searchQuery) || 
    t.category.includes(searchQuery) ||
    t.highlight.includes(searchQuery)
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto no-print print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-2xl flex-shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="guide-title" className="text-base sm:text-lg font-black text-white">
                  راهنمای جامع انتخابات و معرفی امکانات سامانه
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  آموزش گام‌به‌گام
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                راهنمای کامل مراحل اجرایی برگزاری انتخابات، شرح وظایف اپراتور و کاتالوگ ابزارهای پیشرفته
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="بستن راهنما (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs & Search */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main 4 Section Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveSection('STEPS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'STEPS'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-sky-300" />
              <span>مراحل برگزاری ({toPersianDigits(6)} گام)</span>
            </button>

            {/* Dedicated Projector Dual-Display Guide Tab (User Requested) */}
            <button
              onClick={() => setActiveSection('PROJECTOR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'PROJECTOR'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-4 h-4 text-indigo-400" />
              <span>راهنمای پروژکتور سالن (Extend)</span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">پاسخ به سوال</span>
            </button>

            <button
              onClick={() => setActiveSection('TOOLS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'TOOLS'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-300" />
              <span>معرفی ابزارها ({toPersianDigits(10)} ابزار)</span>
            </button>

            <button
              onClick={() => setActiveSection('TIPS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeSection === 'TIPS'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-sky-300" />
              <span>میانبرها و نکات</span>
            </button>
          </div>

          {/* Quick Search in Guide */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در مراحل یا امکانات..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* SECTION 1: Step-by-Step Election Workflow */}
          {activeSection === 'STEPS' && (
            <div className="space-y-4">
              <div className="bg-sky-950/20 border border-sky-800/30 rounded-2xl p-4 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-sky-200 leading-relaxed">
                  <strong>گردش کار استاندارد انتخابات:</strong> برای دستیابی به بالاترین میزان دقت و شفافیت قانونی، توصیه می‌شود مراحل زیر را به ترتیب از گام ۱ تا ۶ دنبال نمایید. با کلیک بر روی هر دکمه آبی‌رنگ، مستقیماً به همان بخش از نرم‌افزار منتقل خواهید شد.
                </div>
              </div>

              <div className="space-y-4 relative">
                {filteredSteps.map((step) => (
                  <div
                    key={step.id}
                    className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition"
                  >
                    {/* Step Title Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-black text-xs font-mono">
                          {toPersianDigits(step.id)}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-white">
                          {step.title}
                        </h3>
                      </div>
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${step.color}`}>
                        {step.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Step Bullet Details */}
                    <ul className="mt-3 space-y-2 text-xs text-slate-400 list-disc list-inside">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {detail}
                        </li>
                      ))}
                    </ul>

                    {/* Direct Quick Action Buttons */}
                    {step.actions && step.actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500">ابزارهای مرتبط با این گام:</span>
                        {step.actions.map((act, actIdx) => {
                          const IconComp = act.icon;
                          return (
                            <button
                              key={actIdx}
                              onClick={() => handleActionClick(act)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700/80 hover:border-sky-500 flex items-center gap-1.5 transition shadow-sm"
                            >
                              <IconComp className="w-3.5 h-3.5 text-sky-400 group-hover:text-white" />
                              <span>{act.label}</span>
                              <ArrowLeft className="w-3 h-3 text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {filteredSteps.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    موردی منطبق با عبارت «{searchQuery}» در مراحل انتخابات یافت نشد.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: Dedicated Projector Dual-Display Guide (User Requested: توضیحات فعال کردن صفحه پروژکتور) */}
          {activeSection === 'PROJECTOR' && (
            <div className="space-y-6">
              {/* Question & Answer Hero Banner */}
              <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/40 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 rounded-2xl flex-shrink-0 mt-1">
                    <Tv className="w-7 h-7" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <span className="inline-block bg-indigo-500/30 text-indigo-200 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
                      پاسخ رسمی به سوال متداول کاربران
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                      چطور صفحه پروژکتور سالن جدا نمایش داده می‌شود تا اپراتور عملیات ثبت رأی را انجام دهد و سالن فقط صفحه پروژکتور را ببیند؟
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                      این قابلیت با استفاده از ویژگی استاندارد <strong className="text-indigo-300">«نمایشگر دوگانه (Dual Display / Extend)»</strong> در سیستم‌عامل ویندوز انجام می‌شود. بدین ترتیب مانیتور لپ‌تاپ شما برای کاربری و ثبت آرا کاملاً مستقل می‌ماند و پروژکتور سالن فقط صفحه اختصاصی نمودارهای زنده و نتایج را بدون ابزارهای مدیریتی پخش می‌کند.
                    </p>
                  </div>
                </div>

                {/* Interactive Action Bar */}
                <div className="mt-5 pt-4 border-t border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={getProjectorUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const res = tryOpenProjectorWindow();
                        if (!res.success) {
                          e.preventDefault();
                          setIsLauncherOpen(true);
                        } else {
                          onClose();
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-900/40 active:scale-95 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>همین حالا تست کنید: باز کردن پروژکتور در پنجره مستقل</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenProjector) {
                          onOpenProjector();
                          onClose();
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition border border-slate-700 active:scale-95"
                    >
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>پیش‌نمایش پروژکتور در همین پنجره</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyProjectorLink}
                    className="px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition"
                    title="کپی لینک مستقیم صفحه پروژکتور"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedLink ? 'آدرس کپی شد!' : 'کپی لینک پروژکتور (station=projector)'}</span>
                  </button>
                </div>
              </div>

              {/* 5-Step Visual Walkthrough Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm px-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>راهنمای گام‌به‌گام تفکیک تصویر (در کمتر از ۱ دقیقه):</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Step 1 */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-indigo-500/40 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs font-mono">
                          {toPersianDigits(1)}
                        </span>
                        <Cable className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="font-bold text-xs text-white">اتصال کابل تصویر</h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        کابل HDMI یا VGA ویدئو پروژکتور سالن را به خروجی تصویر لپ‌تاپ اپراتور متصل و پروژکتور را روشن کنید.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-950/60 border border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-indigo-500 transition relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                      کلید حیاتی
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs font-mono">
                          {toPersianDigits(2)}
                        </span>
                        <Monitor className="w-5 h-5 text-amber-400" />
                      </div>
                      <h4 className="font-bold text-xs text-white">کلید Win + P در ویندوز</h4>
                      <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        روی کیبورد کلید <kbd className="bg-slate-800 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">Win + P</kbd> را بزنید و گزینه <strong className="text-amber-300">Extend (توسعه)</strong> را انتخاب کنید.
                      </p>
                      <span className="block mt-1 text-[10px] text-rose-300 font-medium">
                        ⚠️ هرگز Duplicate را نزنید!
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-indigo-500/40 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs font-mono">
                          {toPersianDigits(3)}
                        </span>
                        <ExternalLink className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="font-bold text-xs text-white">باز کردن پنجره مستقل</h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        در بالای برنامه روی دکمه «پروژکتور سالن» کلیک کرده و «باز کردن در پنجره مستقل» را انتخاب کنید.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-indigo-500/40 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs font-mono">
                          {toPersianDigits(4)}
                        </span>
                        <Laptop className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="font-bold text-xs text-white">انتقال پنجره به پرده</h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        پنجره باز شده را با ماوس از نوار بالایش بگیرید و به سمت صفحه پروژکتور (سمت راست دسکتاپ) بکشید (Drag & Drop).
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="bg-slate-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-emerald-500 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs font-mono">
                          {toPersianDigits(5)}
                        </span>
                        <Maximize2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h4 className="font-bold text-xs text-white">تمام‌صفحه با F11</h4>
                      <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                        در پنجره پروژکتور، کلید <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">F11</kbd> را بزنید تا نوار مرورگر ناپدید شده و سالن فقط صفحه زنده را ببیند.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Comparison & Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Operator Laptop Benefits */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <span>وضعیت صفحه اپراتور (روی مانیتور لپ‌تاپ):</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>آزادی کامل عمل:</strong> اپراتور می‌تواند آزادانه بین تب‌های شمارش آرا، واجدین شرایط، تنظیمات و صورتجلسه جابجا شود؛ سالن اصلاً متوجه جابجایی تب‌ها نمی‌شود.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>محرمانگی کامل:</strong> عملیات ثبت کد ملی رأی‌دهندگان، دکمه‌های حذفی و اصلاحیه‌ها تنها روی صفحه اپراتور دیده می‌شوند و روی پرده سالن منعکس نمی‌شوند.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>سرعت نامحدود:</strong> اپراتور می‌تواند با کیبورد عددی (Numpad) پشت سر هم کد کاندیداها را وارد کند و در صورت اشتباه با دکمه بازگشت (Undo) آن را تصحیح کند.</span>
                    </li>
                  </ul>
                </div>

                {/* Projector Screen Benefits */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <MonitorPlay className="w-5 h-5 text-emerald-400" />
                    <span>وضعیت صفحه پروژکتور (روی پرده تالار):</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>همگام‌سازی بلادرنگ (زیر ۱۰ میلی‌ثانیه):</strong> به محض اینکه اپراتور یک رأی ثبت کند، نمودار میله‌ای و درصد رأی کاندیدا روی پرده سالن با انیمیشن زیبا بالا می‌رود.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>تغییر چیدمان ۱ ستونه یا ۲ ستونه:</strong> اگر تعداد کاندیداها زیاد است (مثلاً بیش از ۵ نفر)، دکمه ۲ ستونه در بالای پروژکتور وجود دارد تا تمام اسامی بدون نیاز به اسکرول روی پرده جا شوند.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span><strong>نمایش کرسی‌های اصلی و علی‌البدل:</strong> برندگان بر اساس تعداد کرسی‌های تعریف‌شده به تفکیک رنگی مشخص می‌شوند.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Single Screen Alternative: Direct Vote Registration inside Projector */}
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2 text-xs shadow-md">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Vote className="w-5 h-5 text-emerald-400" />
                  <span>روش تک‌نمایشگر بدون دردسر دو صفحه کردن (ثبت رأی مستقیم در پایین صفحه پروژکتور):</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  اگر به هر دلیل نمی‌خواهید یا امکان تفکیک دو مانیتور در ویندوز را ندارید، نیازی به نگرانی نیست! در همان صفحه پروژکتور سالن، دکمه <strong className="text-emerald-300">«ثبت آراء (دستی / بارکدخوان)»</strong> در پایین صفحه تعبیه شده است (کلید میانبر <kbd className="bg-slate-800 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">F2</kbd>).
                  با زدن این دکمه، توضیحات ذیل صفحه موقتاً با یک نوار بسیار فشرده و کم‌جا جایگزین می‌شود تا اپراتور بتواند مستقیماً با اسکن بارکدخوان، تایپ شماره کاندیدا یا کلیک روی نامزدها رأی را ثبت کند و تغییرات در همان لحظه در نمودارهای سالن اعمال شود.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: System Tools & Feature Catalog */}
          {activeSection === 'TOOLS' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-2xl p-4 flex items-start gap-3">
                <Layers className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 leading-relaxed">
                  <strong>معرفی کلیه امکانات و ابزارها:</strong> تمام قابلیت‌های این نرم‌افزار برای مدیریت یکپارچه و ضد تقلب انتخابات حضوری طراحی شده‌اند. می‌توانید هر ابزار را مشاهده و در صورت نیاز مستقیماً به آن رجوع نمایید.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                            {tool.category}
                          </span>
                          <span className="text-[11px] text-emerald-400 font-medium">
                            {tool.highlight}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${tool.color}`}>
                            <ToolIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">
                              {tool.title}
                            </h4>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {tool.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end">
                        <button
                          onClick={() => handleActionClick(tool)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 hover:border-emerald-500 flex items-center gap-1.5 transition"
                        >
                          <span>مشاهده و ورود به ابزار</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTools.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  موردی منطبق با عبارت «{searchQuery}» در ابزارها یافت نشد.
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Shortcuts & Practical Tips */}
          {activeSection === 'TIPS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tipsAndShortcuts.map((tipGroup, groupIdx) => {
                  const GroupIcon = tipGroup.icon;
                  return (
                    <div
                      key={groupIdx}
                      className="bg-slate-950/40 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col"
                    >
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-sky-400">
                        <GroupIcon className="w-5 h-5" />
                        <h4 className="font-bold text-sm text-white">
                          {tipGroup.title}
                        </h4>
                      </div>

                      <div className="mt-3 space-y-3 flex-1">
                        {tipGroup.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/70">
                            <span className="font-mono text-xs font-bold text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40 inline-block mb-1">
                              {item.key}
                            </span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Box for Manual Tally Form vs Digital System */}
              <div className="bg-gradient-to-r from-teal-950/30 via-slate-900/60 to-slate-950 border border-teal-800/40 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Grid3X3 className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-teal-200">
                      کاربرد ویژه: «فرم چاپی شمارش دستی کاندیداها» در شرایط قطع برق یا شمارش سنتی
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      در صورتی که در محل شعبه امکان استفاده لحظه‌ای از کامپیوتر مهیا نباشد یا ناظران تمایل به ثبت سنتی با قلم داشته باشند:
                      از دکمه <strong>«فرم شمارش دستی»</strong> در نوار بالای برنامه استفاده کنید. 
                      این فرم اسامی تمام نامزدها را بر اساس نام خانوادگی مرتب کرده و روبروی هر کدام ۵ دسته ۱۰ تایی خانه شطرنجی (جمعاً ۵۰ تایی با برچسب ده) تعبیه کرده است. پس از تیک زدن قلمی، اعضای هیئت پای برگه‌ها را امضا نموده و در پایان، مجموع آرا را در سیستم الکترونیکی ثبت می‌کنند.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>سامانه انتخابات کاملاً آفلاین و امن • بدون نیاز به اینترنت</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition"
            >
              بستن راهنما
            </button>
          </div>
        </div>
      </div>

      {/* Projector Launcher & Popup Blocker Fallback Modal */}
      <ProjectorLauncherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        wasBlocked={true}
        onOpenProjectorModal={onOpenProjector}
      />
    </div>
  );
};
