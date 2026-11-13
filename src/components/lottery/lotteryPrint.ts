import { ArchivedLotteryRound, LotteryDrawResult, LotteryParticipant } from '../../types/lottery';
import { formatIdentifierTypeLabel } from '../../utils/lotteryEngine';
import { toPersianDigits } from '../../utils/persian';

/**
 * Print an official A4 portrait Lottery Minutes document using a hidden isolated iframe
 * (safe inside sandboxed iframes without triggering window.open).
 */
export function printLotteryMinutes(
  result: LotteryDrawResult,
  allParticipants: LotteryParticipant[] = [],
  archiveMeta?: ArchivedLotteryRound
) {
  const winnersRowsHtml = result.winners
    .map(
      (w) => `
      <tr>
        <td style="text-align:center;font-weight:bold;">${toPersianDigits(w.rank)}</td>
        <td><strong>${escapeHtml(w.participant.fullName)}</strong></td>
        <td style="text-align:center;">${formatIdentifierTypeLabel(w.participant.identifierType)}</td>
        <td style="text-align:center;font-family:monospace;font-weight:bold;direction:ltr;">${toPersianDigits(w.participant.identifierCode)}</td>
        <td style="text-align:center;font-family:monospace;direction:ltr;">${w.participant.phoneNumber ? toPersianDigits(w.participant.phoneNumber) : '—'}</td>
        <td>${escapeHtml(w.participant.department || '—')}</td>
        <td style="text-align:center;font-weight:bold;">برنده اصلی</td>
      </tr>
    `
    )
    .join('');

  const reservesRowsHtml =
    result.reserves.length > 0
      ? result.reserves
          .map(
            (r) => `
          <tr>
            <td style="text-align:center;font-weight:bold;">${toPersianDigits(r.rank)}</td>
            <td><strong>${escapeHtml(r.participant.fullName)}</strong></td>
            <td style="text-align:center;">${formatIdentifierTypeLabel(r.participant.identifierType)}</td>
            <td style="text-align:center;font-family:monospace;font-weight:bold;direction:ltr;">${toPersianDigits(r.participant.identifierCode)}</td>
            <td style="text-align:center;font-family:monospace;direction:ltr;">${r.participant.phoneNumber ? toPersianDigits(r.participant.phoneNumber) : '—'}</td>
            <td>${escapeHtml(r.participant.department || '—')}</td>
            <td style="text-align:center;">رزرو (علی‌البدل)</td>
          </tr>
        `
          )
          .join('')
      : `<tr><td colspan="7" style="text-align:center;color:#555;">فرد رزرو در تنظیمات این دوره تعریف نشده است.</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>صورتجلسه رسمی قرعه‌کشی - ${escapeHtml(result.settings.title)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            direction: rtl;
            font-size: 11px;
            line-height: 1.5;
          }
          .doc-frame {
            border: 2px solid #000000;
            padding: 14px 16px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header h1 {
            margin: 4px 0;
            font-size: 16px;
            font-weight: 900;
          }
          .header p {
            margin: 2px 0;
            font-size: 11px;
            color: #222222;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            border: 1px solid #000000;
            padding: 8px 10px;
            background: #f8fafc;
            margin-bottom: 12px;
            font-size: 10.5px;
          }
          .section-title {
            font-size: 12.5px;
            font-weight: 800;
            margin: 12px 0 6px;
            padding: 4px 8px;
            background: #e2e8f0;
            border: 1px solid #000000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th, td {
            border: 1px solid #000000;
            padding: 5px 6px;
            text-align: right;
            font-size: 10.5px;
          }
          th {
            background: #f1f5f9;
            font-weight: 800;
          }
          .hash-box {
            border: 1px dashed #000000;
            padding: 6px 10px;
            font-family: monospace;
            font-size: 9.5px;
            background: #f9fafb;
            margin-top: 8px;
            word-break: break-all;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-top: 18px;
            page-break-inside: avoid;
          }
          .sig-box {
            border: 1px solid #000000;
            height: 76px;
            padding: 6px 8px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: 10px;
            text-align: center;
          }
          .footer-note {
            margin-top: 10px;
            font-size: 9.5px;
            color: #444444;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #cccccc;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="doc-frame">
          <div class="header">
            <p>${escapeHtml(result.settings.organization)}</p>
            <h1>صورتجلسه رسمی نتایج قرعه‌کشی</h1>
            <p><strong>${escapeHtml(result.settings.title)}</strong></p>
          </div>

          <div class="meta-grid">
            <div><strong>کد دوره:</strong> <span style="font-family:monospace;">${escapeHtml(result.settings.roundCode)}</span></div>
            <div><strong>زمان اجرا:</strong> ${escapeHtml(result.persianDrawnAt)}</div>
            <div><strong>شناسه قرعه:</strong> <span style="font-family:monospace;">${escapeHtml(result.id)}</span></div>
            <div><strong>کل شرکت‌کنندگان:</strong> ${toPersianDigits(result.totalParticipantsCount)} نفر</div>
            <div><strong>واجدین شرکت:</strong> ${toPersianDigits(result.eligibleParticipantsCount)} نفر</div>
            <div><strong>مدت چرخش چرخ:</strong> ${toPersianDigits(result.settings.spinDurationSeconds)} ثانیه</div>
          </div>

          <div class="section-title">فهرست برندگان اصلی (${toPersianDigits(result.winners.length)} نفر)</div>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">رتبه</th>
                <th>نام و نام خانوادگی</th>
                <th style="width:95px;text-align:center;">نوع کد</th>
                <th style="width:90px;text-align:center;">کد پرسنلی / ملی</th>
                <th style="width:88px;text-align:center;">شماره موبایل</th>
                <th>واحد / بخش</th>
                <th style="width:75px;text-align:center;">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              ${winnersRowsHtml}
            </tbody>
          </table>

          <div class="section-title">فهرست افراد رزرو / علی‌البدل (${toPersianDigits(result.reserves.length)} نفر)</div>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">اولویت</th>
                <th>نام و نام خانوادگی</th>
                <th style="width:95px;text-align:center;">نوع کد</th>
                <th style="width:90px;text-align:center;">کد پرسنلی / ملی</th>
                <th style="width:88px;text-align:center;">شماره موبایل</th>
                <th>واحد / بخش</th>
                <th style="width:75px;text-align:center;">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              ${reservesRowsHtml}
            </tbody>
          </table>

          ${
            archiveMeta?.notes || result.settings.notes
              ? `<div style="margin-top:8px;font-size:10.5px;"><strong>ملاحظات دوره:</strong> ${escapeHtml(
                  archiveMeta?.notes || result.settings.notes || ''
                )}</div>`
              : ''
          }

          <div class="hash-box">
            <strong>الگوریتم:</strong> ${escapeHtml(result.algorithmInfo)}
            <br />
            <strong>کد اصالت و یکپارچگی (SHA-256):</strong> ${escapeHtml(result.integrityHash)}
          </div>

          <div class="signatures">
            <div class="sig-box">
              <strong>مسئول / مجری قرعه‌کشی</strong>
              <span>نام و امضا: .......................</span>
            </div>
            <div class="sig-box">
              <strong>ناظر اول / بازرس</strong>
              <span>نام و امضا: .......................</span>
            </div>
            <div class="sig-box">
              <strong>ناظر دوم / نماینده حراست</strong>
              <span>نام و امضا: .......................</span>
            </div>
          </div>

          <div class="footer-note">
            <span>تعداد کل پرونده‌های شرکت‌کننده در بایگانی این دوره: ${toPersianDigits(
              allParticipants.length || result.totalParticipantsCount
            )} نفر</span>
            <span>سامانه مستقل قرعه‌کشی</span>
          </div>
        </div>
      </body>
    </html>
  `;

  let iframe = document.getElementById('lottery-print-hidden-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'lottery-print-hidden-iframe';
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
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.warn('Lottery print iframe error:', err);
      }
    }, 250);
  }
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
