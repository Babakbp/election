import { Candidate, ElectionSession, Operator, AuditEvent } from '../types/election';
import { formatJalali, generateValidSyntheticNationalId, maskNationalId } from './persian';

export const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'OP-01',
    name: 'مهندس سید رضا علوی',
    role: 'مسئول حوزه (رئیس شعبه)',
    nationalIdMasked: '***-****-۲۸۱',
    organization: 'هیئت اجرایی انتخابات',
    phoneNumber: '۰۹۱۲۱۱۱۴۵۶۷',
  },
  {
    id: 'OP-02',
    name: 'دکتر فریبا صادقی',
    role: 'ناظر عالی هیئت نظارت',
    nationalIdMasked: '***-****-۶۵۳',
    organization: 'هیئت مرکزی نظارت بر انتخابات',
    phoneNumber: '۰۹۱۲۲۲۲۳۴۵۶',
  },
  {
    id: 'OP-03',
    name: 'مهندس پویا باقری',
    role: 'اپراتور ارشد شمارش آرا',
    nationalIdMasked: '***-****-۹۰۴',
    organization: 'کمیته فناوری اطلاعات',
    phoneNumber: '۰۹۱۲۳۳۳۷۸۹۰',
  },
  {
    id: 'OP-04',
    name: 'مهندس مریم کمالی',
    role: 'نماینده و بازرس مستقل',
    nationalIdMasked: '***-****-۴۱۲',
    organization: 'کانون صنفی اعضا',
    phoneNumber: '۰۹۱۲۴۴۴۸۹۰۱',
  },
];

export function createInitialVoters() {
  const sampleVoters = [
    { name: 'محمدرضا حسینی', phone: '09121234567', voted: true },
    { name: 'فاطمه احمدی‌تبار', phone: '09122345678', voted: true },
    { name: 'علی صادقی‌کیا', phone: '09123456789', voted: false },
    { name: 'نرگس مرادی', phone: '09124567890', voted: true },
    { name: 'حسین رحیمی فرد', phone: '09125678901', voted: false },
    { name: 'سمیرا بهرامی', phone: '09126789012', voted: true },
    { name: 'مهرداد کاظمی', phone: '09127890123', voted: false },
    { name: 'مریم اکبری اصل', phone: '09128901234', voted: true },
    { name: 'امیرحسین رضایی', phone: '09129012345', voted: false },
    { name: 'زهرا موسوی‌پور', phone: '09191112233', voted: true },
    { name: 'داوود قاسمی', phone: '09192223344', voted: false },
    { name: 'پروانه نظری', phone: '09193334455', voted: true },
    { name: 'کیوان اسدی', phone: '09194445566', voted: false },
    { name: 'سارا جلالی', phone: '09195556677', voted: true },
    { name: 'مهدی نوری', phone: '09196667788', voted: false },
    { name: 'لیلا یوسفی', phone: '09197778899', voted: false },
  ];

  return sampleVoters.map((item, index) => {
    const rawNId = generateValidSyntheticNationalId(index + 30);
    return {
      id: `VOT-${index + 1}`,
      rowNumber: index + 1,
      fullName: item.name,
      nationalId: rawNId,
      nationalIdMasked: maskNationalId(rawNId),
      phoneNumber: item.phone,
      hasVoted: item.voted,
      votedAt: item.voted ? '۱۴۰۳/۰۷/۱۹ - ۱۰:۱۵' : undefined,
    };
  });
}


export const SYNTHETIC_CANDIDATE_POOL = [
  {
    name: 'دکتر علیرضا کاظمی‌نژاد',
    affiliation: 'ائتلاف توسعه و نوآوری تخصصی',
    candidateNumber: '۱۰۱',
    birthYear: 1354,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'دکترای مهندسی سیستم‌ها، ۲۰ سال سابقه مدیریت پروژه‌های ملی',
  },
  {
    name: 'دکتر سارا مهدوی‌پور',
    affiliation: 'مستقل - رویکرد شفافیت و عدالت',
    candidateNumber: '۱۰۲',
    birthYear: 1362,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
    bio: 'پژوهشگر ارشد، عضو هیئت علمی دانشگاه، فعال صنفی',
  },
  {
    name: 'مهندس کامران احمدی',
    affiliation: 'فهرست همبستگی صنفی و رفاه اعضا',
    candidateNumber: '۱۰۳',
    birthYear: 1358,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    bio: 'کارشناس ارشد عمران، مشاور پروژه‌های زیرساختی',
  },
  {
    name: 'مهندس زهرا موسوی شیرازی',
    affiliation: 'ائتلاف توسعه و نوآوری تخصصی',
    candidateNumber: '۱۰۴',
    birthYear: 1365,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    bio: 'طراح ارشد سازه، برنده جایزه نوآوری در ساخت و ساز سبز',
  },
  {
    name: 'دکتر محمدحسین فرهمند',
    affiliation: 'مستقل - ارتقای جایگاه حرفه‌ای',
    candidateNumber: '۱۰۵',
    birthYear: 1350,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    bio: 'استاد تمام دانشگاه، رئیس پیشین کمیسیون حقوقی و حل اختلاف',
  },
  {
    name: 'مهندس نیلوفر بهرامی',
    affiliation: 'فهرست همبستگی صنفی و رفاه اعضا',
    candidateNumber: '۱۰۶',
    birthYear: 1368,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    bio: 'کارشناس فناوری اطلاعات و زیرساخت هوشمندسازی شهری',
  },
  {
    name: 'دکتر پژمان رادمنش',
    affiliation: 'ائتلاف آینده‌نگران صنف',
    candidateNumber: '۱۰۷',
    birthYear: 1359,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    bio: 'مدیر طرح و برنامه، کارشناس رسمی دادگستری',
  },
  {
    name: 'مهندس مونا طاهری',
    affiliation: 'مستقل',
    candidateNumber: '۱۰۸',
    birthYear: 1364,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    bio: 'متخصص کنترل کیفیت، بازرس ویژه دوره‌های گذشته',
  },
];

export function createInitialCandidates(): Candidate[] {
  return SYNTHETIC_CANDIDATE_POOL.slice(0, 6).map((item, index) => {
    const rawSyntheticNId = generateValidSyntheticNationalId(index + 1);
    return {
      id: `CAND-${index + 1}`,
      candidateNumber: item.candidateNumber,
      name: item.name,
      nationalIdMasked: maskNationalId(rawSyntheticNId),
      affiliation: item.affiliation,
      avatarUrl: item.avatarUrl,
      votes: [42, 38, 29, 29, 17, 12][index] ?? 0, // Initial votes for realistic simulation with an intentional tie (38 vs 38 or 29 vs 29)
      birthYear: item.birthYear,
      registrationOrder: index + 1,
      bio: item.bio,
      status: 'APPROVED',
    };
  });
}

export function createInitialSession(): ElectionSession {
  const now = new Date();
  const rawId1 = generateValidSyntheticNationalId(91);
  const rawId2 = generateValidSyntheticNationalId(92);
  const rawId3 = generateValidSyntheticNationalId(93);

  return {
    id: 'SES-1403-1082-A',
    code: 'شعبه مرکزی شماره ۱۲۸',
    title: 'انتخابات دوازدهمین دوره هیئت مدیره و بازرسان سازمان',
    constituency: 'حوزه انتخابیه تهران - شعبه سالن همایش‌های رازی',
    stationNumber: '۱۲۸',
    boxNumber: 'صندوق الف - شماره ۱',
    electionType: 'BOARD',
    tieBreakerRule: 'ELDER_AGE', // قانون پیش‌فرض شکستن تساوی: اولویت سن
    registeredVotersCount: 350,
    blankBallots: 4,   // آرای باطله سفید
    invalidBallots: 2, // آرای باطله خط‌خورده
    maxVotesPerVoter: 1, // پیش‌فرض: تک انتخابی
    hideVotedCandidatesInKiosk: true, // حذف کاندیداهای رأی‌داده‌شده از کیوسک لمسی
    presidingOfficer: {
      id: 'OFF-01',
      name: 'مهندس سید رضا علوی',
      role: 'رئیس شعبه و مسئول حوزه اخذ رأی',
      organization: 'هیئت اجرایی انتخابات',
      nationalIdMasked: maskNationalId(rawId1),
    },
    observers: [
      {
        id: 'OBS-01',
        name: 'دکتر فریبا صادقی',
        role: 'نماینده هیئت نظارت عالی',
        organization: 'هیئت نظارت بر انتخابات استان',
        nationalIdMasked: maskNationalId(rawId2),
      },
      {
        id: 'OBS-02',
        name: 'مهندس مریم کمالی',
        role: 'بازرس معتمد و نماینده نامزدها',
        organization: 'کانون صنفی اعضا',
        nationalIdMasked: maskNationalId(rawId3),
      },
    ],
    status: 'ACTIVE_VOTING',
    openedAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
  };
}

export function createInitialAuditEvents(): AuditEvent[] {
  const now = new Date();
  const t0 = new Date(now.getTime() - 10000).toISOString();
  const t1 = new Date(now.getTime() - 8000).toISOString();
  const t2 = new Date(now.getTime() - 5000).toISOString();

  return [
    {
      id: 'EVT-1001',
      eventIdNumber: 1,
      timestamp: t0,
      persianTimestamp: formatJalali(t0),
      operatorName: 'مهندس سید رضا علوی',
      operatorRole: 'رئیس شعبه',
      actionType: 'INITIAL_SEAL',
      previousValue: null,
      newValue: 'پلمپ صندوق تایید شد',
      delta: null,
      reason: 'بررسی خالی بودن صندوق در حضور ناظران و الصاق برچسب‌های امنیتی',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    {
      id: 'EVT-1002',
      eventIdNumber: 2,
      timestamp: t1,
      persianTimestamp: formatJalali(t1),
      operatorName: 'مهندس پویا باقری',
      operatorRole: 'اپراتور ارشد',
      candidateId: 'CAND-1',
      candidateName: 'دکتر علیرضا کاظمی‌نژاد',
      candidateNumber: '۱۰۱',
      actionType: 'VOTE_INCREMENT',
      previousValue: 41,
      newValue: 42,
      delta: 1,
      reason: 'قرائت تعرفه و شمارش حضوری برگه رأی با نظارت هیئت ناظران',
      hash: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
      prevHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'EVT-1003',
      eventIdNumber: 3,
      timestamp: t2,
      persianTimestamp: formatJalali(t2),
      operatorName: 'مهندس پویا باقری',
      operatorRole: 'اپراتور ارشد',
      candidateId: 'CAND-2',
      candidateName: 'دکتر سارا مهدوی‌پور',
      candidateNumber: '۱۰۲',
      actionType: 'VOTE_INCREMENT',
      previousValue: 37,
      newValue: 38,
      delta: 1,
      reason: 'شمارش تعرفه قانونی شماره ۱۲۴',
      hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3',
      prevHash: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
    },
  ];
}
