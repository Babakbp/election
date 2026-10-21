export type SessionStatus = 
  | 'PREPARATION'         // آماده‌سازی و بازرسی صندوق
  | 'ACTIVE_VOTING'       // در حال اخذ و شمارش آرا
  | 'DISPUTE_REVIEW'      // توقف موقت و بررسی شکایات
  | 'AWAITING_SIGNATURES' // پایان شمارش و در انتظار امضاها
  | 'LOCKED_FINAL';       // قفل نهایی و تایید شده (غیرقابل تغییر)

export type TieBreakerRule = 
  | 'LOTTERY'           // قرعه‌کشی رسمی با حضور ناظران
  | 'REGISTRATION_TIME' // تقدم تاریخ و ساعت ثبت‌نام
  | 'ELDER_AGE'         // اولویت سن (بزرگتر بودن)
  | 'CANDIDATE_CODE';   // کد انتخاباتی کمتر

export type ElectionType = 
  | 'BOARD'             // هیئت مدیره و بازرسان
  | 'GENERAL_ASSEMBLY'  // مجمع عمومی تشکل / سازمان
  | 'COUNCIL'           // شورای اسلامی / صنف
  | 'PARLIAMENT'        // انتخابات پارلمانی / سراسری
  | 'SYNDICATE';        // سندیکا و کانون‌های تخصصی

export type ElectedRole = 'PRINCIPAL' | 'ALTERNATE' | 'NONE'; // عضو اصلی | عضو علی‌البدل | عدم انتخاب

export interface Candidate {
  id: string;
  candidateNumber: string; // کد انتخاباتی
  name: string;
  nationalIdMasked: string; // نمایش داده شده به صورت امن: ***-****-123
  nationalIdHash?: string; // هش شده برای اعتبارسنجی یکتایی بدون افشای عمومی
  affiliation: string; // ائتلاف یا جناح یا مستقل
  avatarUrl: string;
  votes: number;
  birthYear: number;
  registrationOrder: number;
  bio: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  electedRole?: ElectedRole;
}

export type ActionType = 
  | 'VOTE_INCREMENT'
  | 'VOTE_CORRECTION_DECREASE'
  | 'ROLLBACK'
  | 'BALLOT_BLANK_CHANGE'
  | 'BALLOT_INVALID_CHANGE'
  | 'SESSION_STATE_CHANGE'
  | 'CANDIDATE_REGISTERED'
  | 'CANDIDATE_PHOTO_UPDATED'
  | 'CANDIDATE_UPDATED'
  | 'CANDIDATE_DELETED'
  | 'VOTER_CHECKED_IN'
  | 'VOTER_REGISTERED_SCANNER'
  | 'BALLOT_CONFIG_UPDATED'
  | 'SIGNATURE_RECORDED'
  | 'LOCK_SESSION'
  | 'INITIAL_SEAL';

export interface AuditEvent {
  id: string;
  eventIdNumber: number;
  timestamp: string; // ISO string
  persianTimestamp: string; // نمایش شمسی با ثانیه
  operatorName: string;
  operatorRole: string;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateNumber?: string | null;
  actionType: ActionType;
  previousValue: number | string | null;
  newValue: number | string | null;
  delta: number | null;
  reason: string; // الزامی برای هر اصلاح یا کاهش
  isRollback?: boolean;
  rollbackOfEventId?: string;
  hash: string;
  prevHash: string;
}

export interface OfficialPerson {
  id: string;
  name: string;
  role: string; // مثلاً: رئیس شعبه، ناظر عالی، نماینده فرمانداری، نماینده شورای نظارت
  organization: string;
  nationalIdMasked: string;
  signatureDataUrl?: string;
  signedAt?: string;
  digitalCertificateToken?: string;
}

export interface ElectionSession {
  id: string;
  code: string; // e.g., SES-1403-128
  title: string;
  constituency: string; // حوزه انتخابیه: مثلاً تهران - منطقه ۶
  stationNumber: string; // شماره شعبه
  boxNumber: string; // شماره صندوق اخذ رأی
  electionType: ElectionType;
  tieBreakerRule: TieBreakerRule;
  registeredVotersCount: number; // کل واجدین شرایط
  blankBallots: number; // آرای باطله سفید (ممتنع)
  invalidBallots: number; // آرای باطله غیرمجاز (خط‌خورده)
  maxVotesPerVoter?: number; // سقف تعداد انتخاب کاندیداها برای هر رأی‌دهنده (پیش‌فرض: ۱ نفر)
  hideVotedCandidatesInKiosk?: boolean; // حذف و مخفی‌سازی کاندیداهای رأی‌داده‌شده از صفحه لمسی اخذ رأی (پیش‌فرض: فعال)
  hasAgeRestriction?: boolean; // شرط رده سنی فعال باشد یا خیر (اگر false باشد یعنی «سن ملاک نیست»)
  minBirthDate?: string; // کمترین تاریخ تولد مجاز (شمسی، مثلاً 1330/01/01 یا 1330)
  maxBirthDate?: string; // بیشترین تاریخ تولد مجاز (شمسی، مثلاً 1387/07/26 یا 1387)
  minAge?: number; // حداقل سن مجاز رأی‌دهی (پیش‌فرض: ۱۸ سال)
  maxAge?: number; // حداکثر سن مجاز رأی‌دهی (اختیاری)
  presidingOfficer: OfficialPerson; // مسئول حوزه / رئیس شعبه
  observers: OfficialPerson[]; // ناظران و بازرسان
  status: SessionStatus;
  openedAt: string;
  closedAt?: string;
  lockedAt?: string;
  finalMinutesHash?: string;
  isDemoMode?: boolean; // حالت آزمایشی / واقعی
  principalSeatsCount?: number; // تعداد اعضای اصلی منتخب (پیش‌فرض: ۵)
  alternateSeatsCount?: number; // تعداد اعضای علی‌البدل منتخب (پیش‌فرض: ۲)
  candidateElectedRoles?: Record<string, ElectedRole>; // نقش و وضعیت انتخاب هر کاندیدا
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  nationalIdMasked: string;
  organization?: string;
  phoneNumber?: string;
}

export type VoterStatus = 'NOT_CHECKED_IN' | 'BALLOT_DELIVERED' | 'VOTED';

export interface Voter {
  id: string;
  rowNumber: number;
  fullName: string;
  nationalId: string; // برای اعتبارسنجی و جستجو
  nationalIdMasked: string; // برای نمایش امن در لیست چاپی و صفحه
  phoneNumber: string; // شماره تماس / همراه
  birthDate?: string; // تاریخ تولد شمسی (مثلاً 1370/05/12 یا سال 1370)
  age?: number; // سن محاسبه‌شده بر اساس سال تولد شمسی
  isAgeEligible?: boolean; // آیا در صورت فعال بودن شرط رده سنی، واجد شرایط است؟
  isDisqualified?: boolean; // تیک عدم احراز شرایط (غیرمجاز برای تحویل تعرفه و اخذ رأی)
  disqualificationReason?: string; // علت عدم احراز شرایط (مثلاً خارج از رده سنی مجاز)
  hasVoted: boolean;
  votedAt?: string;
  status?: VoterStatus;
  ballotDeliveredAt?: string;
}

export interface BallotPaperConfig {
  title: string;
  subTitle: string;
  constituency: string;
  stationNumber: string;
  boxNumber: string;
  instructions: string;
  layoutStyle: 'CHECKLIST' | 'WRITE_IN' | 'CANDIDATE_CARDS' | 'INDIVIDUAL_BARCODE_CARDS';
  ballotsPerPage: 1 | 2 | 4 | 6 | 8;
  showCandidatePhotos: boolean;
  showCandidateCodes: boolean;
  showCandidateAffiliations: boolean;
  showStub: boolean; // ته‌برگ تعرفه با خط‌چین برای امضا و اثر انگشت
  showQrVerification: boolean; // کیوآرکد امنیتی
  serialNumberPrefix: string; // پیشوند شماره سریال تعرفه
  startingSerialNumber: number; // شماره شروع سریال
  totalCopiesToPrint: number; // تعداد کل تعرفه‌های چاپی
  showOfficialStamps: boolean; // محل مهر هیئت اجرایی و نظارت
  showSecurityBorder: boolean; // کادر گیلوش امنیتی
  barcodeFormat?: 'CAND_CODE' | 'RAW_CODE';
}

export interface ArchivedSession {
  id: string; // شناسه یکتای بایگانی
  archivedAt: string; // ISO string
  persianArchivedDate: string; // نمایش تاریخ و زمان شمسی
  session: ElectionSession;
  candidates: Candidate[];
  auditEvents: AuditEvent[];
  operators: Operator[];
  voters?: Voter[];
  totalVotes: number;
  winnerNames: string[];
  integrityChecksum: string;
  notes?: string;
  backupPath?: string; // نام یا مسیر پوشه ذخیره شده
}

