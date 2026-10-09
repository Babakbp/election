$root = Join-Path (Get-Location) "election-pwa"

New-Item -ItemType Directory -Force -Path $root | Out-Null

@'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#1769aa">
  <link rel="manifest" href="manifest.webmanifest">
  <title>سامانه رآی گیری</title>

<style>
    :root {
      --primary:#1769aa;
      --secondary:#0d47a1;
      --background:#eef3f8;
      --card:#ffffff;
      --text:#1f2937;
      --muted:#6b7280;
      --success:#16803c;
      --warning:#d97706;
      --danger:#c62828;
      --border:#dbe3ec;
      --font:Tahoma,Arial,sans-serif;
      --radius:15px;
    }

* { box-sizing:border-box; }

body {
      margin:0;
      background:var(--background);
      color:var(--text);
      font-family:var(--font);
    }

button,input,select { font-family:inherit; }

button {
      border:0;
      border-radius:9px;
      padding:10px 15px;
      cursor:pointer;
      font-size:14px;
    }

button:disabled {
      opacity:.5;
      cursor:not-allowed;
    }

.topbar {
      background:linear-gradient(135deg,var(--secondary),var(--primary));
      color:white;
      padding:18px 25px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:15px;
    }

h1,h2,h3,p { margin-top:0; }

h1 { font-size:23px; margin-bottom:6px; }
    h2 { font-size:18px; }

.actions {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }

.layout {
      max-width:1500px;
      margin:18px auto;
      padding:0 18px;
      display:grid;
      grid-template-columns:1fr 340px;
      gap:18px;
    }

.panel {
      background:var(--card);
      border:1px solid var(--border);
      border-radius:var(--radius);
      padding:18px;
      margin-bottom:18px;
      box-shadow:0 4px 18px #0000000d;
    }

.panel-title {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:15px;
    }

.status {
      background:#e5f7eb;
      color:var(--success);
      padding:7px 12px;
      border-radius:20px;
      font-size:12px;
      font-weight:bold;
    }

.status.ended {
      background:#ffebee;
      color:var(--danger);
    }

.voter-form {
      display:grid;
      grid-template-columns:repeat(4,1fr) auto;
      gap:9px;
      align-items:end;
    }

label {
      display:block;
      color:var(--muted);
      font-size:12px;
      margin-bottom:5px;
    }

input,select {
      width:100%;
      padding:10px;
      border:1px solid var(--border);
      border-radius:8px;
      background:white;
      outline:none;
    }

input:focus,select:focus {
      border-color:var(--primary);
      box-shadow:0 0 0 3px #1769aa22;
    }

.candidate-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(185px,1fr));
      gap:15px;
    }

.candidate {
      position:relative;
      border:2px solid var(--border);
      border-radius:var(--radius);
      padding:12px;
      text-align:center;
      transition:.2s;
    }

.candidate:hover {
      border-color:var(--primary);
      transform:translateY(-3px);
    }

.candidate button {
      width:100%;
      background:transparent;
      padding:0;
      color:inherit;
    }

.photo {
      width:125px;
      height:125px;
      margin:auto auto 10px;
      border-radius:50%;
      display:grid;
      place-items:center;
      color:white;
      font-size:34px;
      font-weight:bold;
      background:var(--primary);
      overflow:hidden;
    }

.photo img {
      width:100%;
      height:100%;
      object-fit:cover;
    }

.rank {
      position:absolute;
      right:8px;
      top:8px;
      width:29px;
      height:29px;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:var(--secondary);
      color:white;
      font-weight:bold;
    }

.name { font-weight:bold; font-size:16px; }
    .code,.muted { color:var(--muted); font-size:12px; }
    .votes { color:var(--primary); font-size:24px; font-weight:bold; margin-top:7px; }

.rank-list,.logs {
      display:flex;
      flex-direction:column;
      gap:8px;
    }

.rank-item {
      display:grid;
      grid-template-columns:32px 1fr auto;
      align-items:center;
      gap:8px;
      padding:8px;
      border:1px solid var(--border);
      border-radius:9px;
    }

.rank-number {
      width:27px;
      height:27px;
      display:grid;
      place-items:center;
      border-radius:50%;
      color:white;
      background:var(--primary);
    }

.log {
      padding:9px;
      border-right:4px solid var(--success);
      background:#f4fff7;
      border-radius:8px;
      font-size:12px;
    }

.log.minus {
      border-right-color:var(--danger);
      background:#fff7f7;
    }

.summary {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
    }

.summary div {
      text-align:center;
      padding:10px;
      border-radius:9px;
      background:#f5f8fc;
      font-size:12px;
    }

.summary strong {
      display:block;
      color:var(--primary);
      font-size:22px;
    }

.blue { background:var(--primary); color:white; }
    .green { background:var(--success); color:white; }
    .orange { background:var(--warning); color:white; }
    .red { background:var(--danger); color:white; }
    .gray { background:#64748b; color:white; }
    .light { background:#ffffff22; color:white; border:1px solid #ffffff66; }

.modal {
      display:none;
      position:fixed;
      inset:0;
      background:#0008;
      align-items:center;
      justify-content:center;
      padding:18px;
      z-index:5;
    }

.modal.show { display:flex; }

.modal-box {
      width:min(650px,100%);
      max-height:90vh;
      overflow:auto;
      background:white;
      border-radius:16px;
      padding:20px;
    }

.settings {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
    }

.setting {
      border:1px solid var(--border);
      padding:10px;
      border-radius:9px;
    }

.modal-actions {
      display:flex;
      gap:8px;
      margin-top:17px;
    }

@media(max-width:1000px) {
      .layout { grid-template-columns:1fr; }
      .voter-form { grid-template-columns:1fr 1fr; }
    }

@media(max-width:600px) {
      .topbar { flex-direction:column; align-items:flex-start; }
      .voter-form,.settings,.summary { grid-template-columns:1fr; }
    }
  </style>
</head>

<body>
  <header class="topbar">
    <div>
      <h1>سامانه رآی گیری شفاف</h1>
      <div>جلسه نمونه انتخابات</div>
    </div>

<div class="actions">
      <button class="light" onclick="openSettings()">تنظیمات صفحه</button>
      <button class="light" onclick="backup()">پشتیبان گیری</button>
      <button class="light" onclick="restoreInput.click()">بازیابی اطلاعات</button>
      <button class="red" onclick="finishSession()">پایان رآی گیری</button>
      <input id="restoreInput" type="file" accept=".json" hidden>
    </div>
  </header>

<main class="layout">
    <section>
      <div class="panel">
        <div class="panel-title">
          <h2>ثبت رآی دهنده</h2>
          <span id="status" class="status">در حال رآی گیری</span>
        </div>

<div class="voter-form">
          <div>
            <label>کد ملی</label>
            <input id="nationalId" inputmode="numeric" placeholder="کد ملی">
          </div>

<div>
            <label>نام</label>
            <input id="firstName" placeholder="نام">
          </div>

<div>
            <label>نام خانوادگی</label>
            <input id="lastName" placeholder="نام خانوادگی">
          </div>

<div>
            <label>شماره تلفن</label>
            <input id="phone" inputmode="tel" placeholder="اختیاری">
          </div>

<button class="blue" onclick="registerVoter()">ثبت رآی دهنده</button>
        </div>

<p id="voterMessage" class="muted" style="margin-top:10px">
          ثبت مشخصات رآی دهنده اختیاری است.
        </p>
      </div>

<div class="panel">
        <div class="panel-title">
          <h2>انتخاب کاندیدا</h2>
          <strong id="total">مجموع رآی: ۰</strong>
        </div>

<div id="candidateGrid" class="candidate-grid"></div>
      </div>

<div class="panel">
        <div class="panel-title">
          <h2>گزارش زنده عملیات</h2>
          <button class="orange" onclick="correctLastVote()">اصلاح رآی</button>
        </div>
        <div id="logs" class="logs"></div>
      </div>
    </section>

<aside>
      <div class="panel">
        <div class="panel-title">
          <h2>نفرات برتر</h2>
          <span class="muted">رتبه زنده</span>
        </div>
        <div id="ranking" class="rank-list"></div>
      </div>

<div class="panel">
        <h2>خلاصه جلسه</h2>
        <div class="summary">
          <div><strong id="candidateCount">۰</strong>کاندیدا</div>
          <div><strong id="voterCount">۰</strong>رآی دهنده</div>
          <div><strong id="operationCount">۰</strong>عملیات</div>
        </div>
      </div>

<div class="panel">
        <button class="blue" style="width:100%;margin-bottom:8px" onclick="exportCsv()">
          خروجی Excel
        </button>
        <button class="green" style="width:100%" onclick="printReport()">
          چاپ صورتجلسه
        </button>
      </div>
    </aside>
  </main>

<div id="settingsModal" class="modal">
    <div class="modal-box">
      <h2>تنظیمات رنگ، فونت و دکمه ها</h2>

<div class="settings">
        <div class="setting">
          <label>فونت</label>
          <select id="font">
            <option>Tahoma</option>
            <option>Arial</option>
            <option>Segoe UI</option>
            <option>B Nazanin</option>
            <option>Vazirmatn</option>
            <option>Shabnam</option>
          </select>
        </div>

<div class="setting">
          <label>رنگ اصلی دکمه ها</label>
          <input id="primaryColor" type="color" value="#1769aa">
        </div>

<div class="setting">
          <label>رنگ زمینه صفحه</label>
          <input id="backgroundColor" type="color" value="#eef3f8">
        </div>

<div class="setting">
          <label>رنگ کارت ها</label>
          <input id="cardColor" type="color" value="#ffffff">
        </div>

<div class="setting">
          <label>اندازه کارت کاندیدا</label>
          <select id="cardSize">
            <option value="170">کوچک</option>
            <option value="185" selected>متوسط</option>
            <option value="240">بزرگ</option>
          </select>
        </div>

<div class="setting">
          <label>گردی گوشه ها</label>
          <input id="radius" type="range" min="0" max="30" value="15">
        </div>
      </div>

<div class="modal-actions">
        <button class="blue" onclick="applySettings()">اعمال تنظیمات</button>
        <button class="gray" onclick="closeSettings()">بستن</button>
      </div>
    </div>
  </div>

<script>
    const dbRequest = indexedDB.open("election-pwa", 1);

let db;
    let candidates = [
      {id:1,name:"علی رضایی",code:"۰۰۱۲۳۴۵۶۷۸",initials:"عر",votes:0,color:"#1565c0"},
      {id:2,name:"مریم احمدی",code:"۰۰۲۳۴۵۶۷۸۹",initials:"ما",votes:0,color:"#8e24aa"},
      {id:3,name:"حسین کریمی",code:"۰۰۳۴۵۶۷۸۹۰",initials:"حک",votes:0,color:"#00897b"},
      {id:4,name:"سارا محمدی",code:"۰۰۴۵۶۷۸۹۰۱",initials:"سم",votes:0,color:"#ef6c00"}
    ];

let voters = [];
    let logs = [];
    let activeVoter = null;
    let lastVote = null;
    let ended = false;
    const fa = new Intl.NumberFormat("fa-IR");

dbRequest.onupgradeneeded = event => {
      db = event.target.result;
      db.createObjectStore("app", {keyPath:"id"});
    };

dbRequest.onsuccess = event => {
      db = event.target.result;
      loadData();
    };

function saveData() {
      if (!db) return;
      const tx = db.transaction("app","readwrite");
      tx.objectStore("app").put({
        id:"state",
        candidates,
        voters,
        logs,
        ended
      });
    }

function loadData() {
      const tx = db.transaction("app","readonly");
      const request = tx.objectStore("app").get("state");

request.onsuccess = () => {
        if (request.result) {
          candidates = request.result.candidates || candidates;
          voters = request.result.voters || [];
          logs = request.result.logs || [];
          ended = request.result.ended || false;
        }
        render();
      };
    }

function render() {
      const sorted = [...candidates].sort((a,b) => b.votes - a.votes);

document.getElementById("candidateGrid").innerHTML = sorted.map((c,i) => `
        <div class="candidate">
          <div class="rank">${fa.format(i+1)}</div>
          <button onclick="vote(${c.id})" ${ended ? "disabled" : ""}>
            <div class="photo" style="background:${c.color}">
              ${c.initials}
            </div>
            <div class="name">${c.name}</div>
            <div class="code">کد ملی: ${c.code}</div>
            <div class="votes">${fa.format(c.votes)}</div>
            <div class="muted">رآی</div>
          </button>
        </div>
      `).join("");

document.getElementById("ranking").innerHTML = sorted.map((c,i) => `
        <div class="rank-item">
          <div class="rank-number">${fa.format(i+1)}</div>
          <strong>${c.name}</strong>
          <b>${fa.format(c.votes)}</b>
        </div>
      `).join("");

const total = candidates.reduce((sum,c) => sum + c.votes, 0);

document.getElementById("total").textContent =
        "مجموع رآی: " + fa.format(total);

document.getElementById("candidateCount").textContent =
        fa.format(candidates.length);

document.getElementById("voterCount").textContent =
        fa.format(voters.length);

document.getElementById("operationCount").textContent =
        fa.format(logs.length);

document.getElementById("logs").innerHTML = logs.length
        ? logs.slice().reverse().map(log => `
          <div class="log ${log.change < 0 ? "minus" : ""}">
            ${log.time} ـ ${log.change > 0 ? "افزایش رآی" : "کاهش رآی"}
            ـ <b>${log.name}</b>
            ـ ${log.change > 0 ? "+۱" : "−۱"}
            ${log.voter ? " ـ رآی دهنده: " + log.voter : ""}
          </div>
        `).join("")
        : '<div class="muted">هنوز عملیاتی ثبت نشده است.</div>';

const status = document.getElementById("status");
      status.textContent = ended ? "رآی گیری پایان یافته" : "در حال رآی گیری";
      status.className = ended ? "status ended" : "status";

saveData();
    }

function registerVoter() {
      if (ended) return alert("رآی گیری پایان یافته است.");

const nationalId = document.getElementById("nationalId").value.trim();
      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const phone = document.getElementById("phone").value.trim();

if (!nationalId && !firstName && !lastName) {
        activeVoter = null;
        document.getElementById("voterMessage").textContent =
          "ثبت رآی بدون مشخصات رآی دهنده فعال است.";
        return;
      }

if (!nationalId || !firstName || !lastName) {
        return alert("کد ملی، نام و نام خانوادگی را وارد کنید.");
      }

if (voters.some(v => v.nationalId === nationalId)) {
        return alert("این رآی دهنده قبلاً ثبت شده است.");
      }

activeVoter = {
        nationalId,
        name: firstName + " " + lastName,
        phone,
        voted:false
      };

voters.push(activeVoter);

document.getElementById("voterMessage").textContent =
        "رآی دهنده «" + activeVoter.name +
        "» ثبت شد؛ اکنون کاندیدا را انتخاب کنید.";

render();
    }

function vote(id) {
      if (ended) return alert("رآی گیری پایان یافته است.");

if (activeVoter && activeVoter.voted) {
        return alert("برای این رآی دهنده قبلاً رآی ثبت شده است.");
      }

const candidate = candidates.find(c => c.id === id);
      candidate.votes++;

if (activeVoter) activeVoter.voted = true;

lastVote = {
        candidateId:id,
        voter:activeVoter ? activeVoter.name : ""
      };

logs.push({
        time:new Date().toLocaleTimeString("fa-IR"),
        name:candidate.name,
        change:1,
        voter:activeVoter ? activeVoter.name : ""
      });

activeVoter = null;
      clearVoterForm();

document.getElementById("voterMessage").textContent =
        "رآی با موفقیت ثبت شد.";

render();
    }

function correctLastVote() {
      if (!lastVote) return alert("رآیی برای اصلاح وجود ندارد.");

const candidate = candidates.find(c => c.id === lastVote.candidateId);
      if (!candidate || candidate.votes <= 0) return;

const reason = prompt("دلیل اصلاح رآی را وارد کنید:", "اشتباه اپراتور");
      if (reason === null) return;

candidate.votes--;

logs.push({
        time:new Date().toLocaleTimeString("fa-IR"),
        name:candidate.name,
        change:-1,
        voter:lastVote.voter,
        reason
      });

lastVote = null;
      render();
    }

function finishSession() {
      if (confirm("آیا از پایان رآی گیری اطمینان دارید؟")) {
        ended = true;
        render();
      }
    }

function clearVoterForm() {
      ["nationalId","firstName","lastName","phone"].forEach(id => {
        document.getElementById(id).value = "";
      });
    }

function backup() {
      const data = {
        version:1,
        createdAt:new Date().toISOString(),
        candidates,
        voters,
        logs,
        ended
      };

const blob = new Blob(
        [JSON.stringify(data,null,2)],
        {type:"application/json"}
      );

const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "پشتیبان-رآی-گیری.json";
      a.click();
      URL.revokeObjectURL(url);
    }

document.getElementById("restoreInput").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;

const reader = new FileReader();

reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          candidates = data.candidates || candidates;
          voters = data.voters || [];
          logs = data.logs || [];
          ended = data.ended || false;
          render();
          alert("اطلاعات با موفقیت بازیابی شد.");
        } catch {
          alert("فایل پشتیبان معتبر نیست.");
        }
      };

reader.readAsText(file);
    });

function exportCsv() {
      const rows = [
        ["رتبه","نام کاندیدا","کد ملی","تعداد رآی"],
        ...[...candidates]
          .sort((a,b) => b.votes-a.votes)
          .map((c,i) => [i+1,c.name,c.code,c.votes])
      ];

const csv = "\ufeff" + rows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "گزارش-رآی-گیری.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

function printReport() {
      const sorted = [...candidates].sort((a,b) => b.votes-a.votes);

const html = `
        <html lang="fa" dir="rtl">
        <head><meta charset="UTF-8"><title>صورتجلسه رآی گیری</title></head>
        <body style="font-family:Tahoma;padding:30px">
          <h1>صورتجلسه رآی گیری</h1>
          <p>تاریخ: ${new Date().toLocaleDateString("fa-IR")}</p>
          <table border="1" cellpadding="10" cellspacing="0" width="100%">
            <tr><th>رتبه</th><th>کاندیدا</th><th>کد ملی</th><th>تعداد رآی</th></tr>
            ${sorted.map((c,i) => `
              <tr>
                <td>${i+1}</td>
                <td>${c.name}</td>
                <td>${c.code}</td>
                <td>${c.votes}</td>
              </tr>
            `).join("")}
          </table>
          <br><br>
          <p>امضاء مسئول حوزه: ....................................</p>
          <p>امضاء ناظر اول: ........................................</p>
          <p>امضاء ناظر دوم: ........................................</p>
        </body></html>
      `;

const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      w.print();
    }

function openSettings() {
      document.getElementById("settingsModal").classList.add("show");
    }

function closeSettings() {
      document.getElementById("settingsModal").classList.remove("show");
    }

function applySettings() {
      document.documentElement.style.setProperty(
        "--font",
        '"' + document.getElementById("font").value + '",Tahoma,Arial,sans-serif'
      );

document.documentElement.style.setProperty(
        "--primary",
        document.getElementById("primaryColor").value
      );

document.documentElement.style.setProperty(
        "--background",
        document.getElementById("backgroundColor").value
      );

document.documentElement.style.setProperty(
        "--card",
        document.getElementById("cardColor").value
      );

document.documentElement.style.setProperty(
        "--radius",
        document.getElementById("radius").value + "px"
      );

document.querySelector(".candidate-grid").style.gridTemplateColumns =
        "repeat(auto-fill,minmax(" +
        document.getElementById("cardSize").value + "px,1fr))";

closeSettings();
    }

if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js");
      });
    }
  </script>
</body>
</html>
'@ | Set-Content -Encoding UTF8 "$root\index.html"

@'
{
  "name": "سامانه رآی گیری شفاف",
  "short_name": "رآی گیری",
  "lang": "fa",
  "dir": "rtl",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#eef3f8",
  "theme_color": "#1769aa"
}
'@ | Set-Content -Encoding UTF8 "$root\manifest.webmanifest"

@'
const CACHE = "election-pwa-v1";

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
'@ | Set-Content -Encoding UTF8 "$root\sw.js"

@'
{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
'@ | Set-Content -Encoding UTF8 "$root\vercel.json"

@'
# سامانه رآی گیری شفاف

نسخه آفلاین PWA با ذخیره اطلاعات در IndexedDB.

## اجرا

فایل index.html را با Chrome یا Edge باز کنید.

برای فعال شدن کامل حالت آفلاین و نصب PWA، پروژه را روی GitHub Pages یا Vercel منتشر کنید.

## انتشار در GitHub

1. یک Repository بسازید.
2. فایلهای این پوشه را Upload کنید.
3. از بخش Settings > Pages گزینه Deploy from branch را فعال کنید.
4. شاخه main و پوشه root را انتخاب کنید.

## انتشار در Vercel

1. Repository را به Vercel متصل کنید.
2. Framework را روی Other قرار دهید.
3. Build Command را خالی بگذارید.
4. پروژه را Deploy کنید.

## اطلاعات

اطلاعات در حافظه مرورگر همان دستگاه ذخیره میشود.
قبل از پاک کردن اطلاعات مرورگر، از بخش پشتیبان گیری فایل پشتیبان بگیرید.
'@ | Set-Content -Encoding UTF8 "$root\README.md"

Write-Host ""
Write-Host "پروژه با موفقیت ساخته شد:" -ForegroundColor Green
Write-Host $root -ForegroundColor Cyan
Write-Host ""
Write-Host "فایل index.html را برای اجرای محلی باز کنید."
'@

Set-Location $root
Write-Host "ساخت پروژه پایان یافت."
