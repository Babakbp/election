import * as XLSX from 'xlsx';
import { ElectionSession, AuditEvent, Voter, Candidate } from '../types/election';
import { RankedCandidate } from './tieBreaker';
import { formatJalali } from './persian';

/**
 * Trigger browser download for an ArrayBuffer as an .xlsx file
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export official election results and ballot breakdown to a true .xlsx file
 */
export function exportElectionToExcel(
  session: ElectionSession,
  rankedCandidates: RankedCandidate[],
  totalVotes: number,
  totalValidVotes: number
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary & Station Info
  const summaryData = [
    ['مشخصات و آمار کلی شعبه اخذ رأی', ''],
    ['عنوان انتخابات', session.title],
    ['کد شعبه', session.code],
    ['حوزه انتخابیه', session.constituency],
    ['شماره شعبه', session.stationNumber],
    ['صندوق اخذ رأی', session.boxNumber],
    ['وضعیت جلسه', session.status],
    ['تاریخ و ساعت گزارش', formatJalali(new Date())],
    ['مسئول شعبه', session.presidingOfficer.name],
    ['', ''],
    ['آمار تعرفه‌ها و آرا', ''],
    ['کل واجدین شرایط (تعرفه‌های تحویلی)', session.registeredVotersCount],
    ['مجموع کل آرای مأخوذه (برگه‌ها)', totalVotes],
    ['آرای صحیح نامزدها', totalValidVotes],
    ['آرای باطله سفید (ممتنع)', session.blankBallots],
    ['آرای باطله غیرمجاز (مخدوش)', session.invalidBallots],
    ['درصد مشارکت شعبه', session.registeredVotersCount > 0 ? `${((totalVotes / session.registeredVotersCount) * 100).toFixed(1)}%` : '0%'],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'خلاصه آمار');

  // Sheet 2: Candidate Rankings & Votes
  const candidatesHeaders = [
    'رتبه',
    'کد نامزدی',
    'نام و نام خانوادگی',
    'کد ملی (محافظت‌شده)',
    'ائتلاف / وابستگی',
    'تعداد آرا',
    'درصد از آرای صحیح',
    'وضعیت و ملاحظات تساوی',
  ];
  const candidatesRows = rankedCandidates.map((c) => [
    c.rank,
    c.candidateNumber,
    c.name,
    c.nationalIdMasked,
    c.affiliation,
    c.votes,
    `${c.percentage}%`,
    c.isTied ? (c.tieBreakerAppliedReason ?? 'تساوی آرا') : 'اکثریت قانونی',
  ]);
  const candidatesWs = XLSX.utils.aoa_to_sheet([candidatesHeaders, ...candidatesRows]);
  XLSX.utils.book_append_sheet(wb, candidatesWs, 'نتایج نامزدها');

  downloadWorkbook(wb, `صورتجلسه_شمارش_آرا_شعبه_${session.stationNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export immutable tamper-evident audit ledger to a true .xlsx file
 */
export function exportAuditLogsToExcel(auditEvents: AuditEvent[], sessionTitle: string) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'ردیف',
    'شناسه رویداد',
    'زمان ثبت (شمسی)',
    'نام اپراتور',
    'سمت / نقش',
    'نوع عملیات',
    'نامزد مربوطه',
    'کد نامزد',
    'مقدار قبل',
    'مقدار جدید',
    'تغییر (دلتا)',
    'دلیل ثبت/اصلاح موجه',
    'هش یکپارچگی (SHA-256)',
  ];

  const rows = auditEvents.map((e, idx) => [
    idx + 1,
    e.id,
    e.persianTimestamp,
    e.operatorName,
    e.operatorRole,
    e.actionType,
    e.candidateName ?? '—',
    e.candidateNumber ?? '—',
    e.previousValue ?? '—',
    e.newValue ?? '—',
    e.delta !== null ? (e.delta > 0 ? `+${e.delta}` : `${e.delta}`) : '—',
    e.reason,
    e.hash,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'دفتر ممیزی رویدادها');

  downloadWorkbook(wb, `دفتر_ممیزی_رویدادها_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export sample template for voters list as a true .xlsx file
 */
export function exportVotersTemplateToExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['ردیف', 'نام و نام خانوادگی', 'کد ملی', 'شماره تماس', 'تاریخ تولد شمسی'];
  const sampleRows = [
    [1, 'محمد رضایی', '0012345678', '09121112233', '1370/05/12'],
    [2, 'فاطمه احمدی', '0023456789', '09122223344', '1375/08/20'],
    [3, 'علی مرادی', '0034567890', '09123334455', '1381/01/15'],
    [4, 'زهرا حسینی', '0045678901', '09124445566', '1364/11/03'],
    [5, 'حسین باقری', '0056789012', '09125556677', '1386/03/14'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'قالب واجدین شرایط');

  downloadWorkbook(wb, 'قالب_واجدین_شرایط_با_تاریخ_تولد.xlsx');
}

/**
 * Export the current voters list to a true .xlsx file
 */
export function exportVotersListToExcel(voters: Voter[], stationNumber: string) {
  const wb = XLSX.utils.book_new();
  const headers = ['ردیف', 'نام و نام خانوادگی', 'کد ملی', 'شماره تماس', 'تاریخ تولد شمسی', 'سن (سال)', 'احراز رده سنی', 'وضعیت', 'زمان تحویل تعرفه', 'زمان ثبت رأی'];
  const rows = voters.map((v) => {
    let statusText = 'مراجعه نکرده';
    if (v.status === 'VOTED' || v.hasVoted) {
      statusText = 'رای داده شد';
    } else if (v.status === 'BALLOT_DELIVERED' || v.ballotDeliveredAt) {
      statusText = 'تعرفه تحویل شد';
    }
    const ageEligibleText = v.isAgeEligible === false ? 'عدم احراز رده سنی' : 'واجد شرایط سنی';
    return [
      v.rowNumber,
      v.fullName,
      v.nationalIdMasked,
      v.phoneNumber,
      v.birthDate ?? '—',
      v.age !== undefined ? v.age : '—',
      ageEligibleText,
      statusText,
      v.ballotDeliveredAt ?? '—',
      v.votedAt ?? '—',
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'فهرست واجدین شرایط');

  downloadWorkbook(wb, `فهرست_واجدین_شرایط_شعبه_${stationNumber}.xlsx`);
}

/**
 * Export sample template for candidates list as a true .xlsx file
 */
export function exportCandidatesTemplateToExcel() {
  const wb = XLSX.utils.book_new();
  const headers = ['کد انتخاباتی', 'نام و نام خانوادگی', 'کد ملی ۱۰ رقمی', 'ائتلاف یا وابستگی', 'سال تولد', 'خلاصه سوابق'];
  const sampleRows = [
    ['101', 'دکتر علیرضا محمدی', '0012345678', 'ائتلاف مستقلین', 1358, 'استاد دانشگاه و پژوهشگر ارشد'],
    ['102', 'مهندس سارا احمدی', '0023456789', 'جبهه پیشرفت و امید', 1364, 'فعال صنعتی و مدیر پروژه'],
    ['103', 'دکتر رضا کریمی', '0034567890', 'ائتلاف خدمت‌گزاران', 1352, 'پزشک متخصص و مدرس'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'قالب نامزدها');

  downloadWorkbook(wb, 'قالب_ثبت_نامزدها.xlsx');
}

/**
 * Export candidates list to a true .xlsx file
 */
export function exportCandidatesListToExcel(candidates: Candidate[]) {
  const wb = XLSX.utils.book_new();
  const headers = ['ردیف ثبت‌نام', 'کد نامزدی', 'نام و نام خانوادگی', 'کد ملی (محافظت‌شده)', 'ائتلاف / وابستگی', 'سال تولد', 'تعداد آرا', 'سوابق'];
  const rows = candidates.map((c) => [
    c.registrationOrder,
    c.candidateNumber,
    c.name,
    c.nationalIdMasked,
    c.affiliation,
    c.birthYear,
    c.votes,
    c.bio,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'فهرست نامزدهای رسمی');

  downloadWorkbook(wb, `فهرست_نامزدهای_انتخابات_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
