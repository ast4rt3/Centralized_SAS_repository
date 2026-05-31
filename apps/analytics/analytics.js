/* =====================================================
   NBSC SAS — Analytics Dashboard
   analytics.js
   ===================================================== */

// ─── Config ──────────────────────────────────────────
const BACKEND_URL = window.ENV?.BACKEND_GAS_URL ||
  'https://script.google.com/macros/s/AKfycbxKEJWRrJi9fMR1RfKnLYjHUWqRGQxI68q3RW7JMPlB3hBtNAMtPvPlCKPxjidJWZaq/exec';

const LF_API_BASE    = 'https://lost-and-found-jqmn.onrender.com/api';
const BORROWERS_BASE = 'https://borrowers-log.vercel.app/api';  // placeholder — update if public API exists

// Semester filter
const CURRENT_YEAR   = new Date().getFullYear();
const SEMESTER_LABEL = `AY ${CURRENT_YEAR - 1}–${CURRENT_YEAR}`;

// Chart.js defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

const PALETTE = {
  blue:   '#4361EE', // Modern vibrant blue
  purple: '#7209B7', // Deep purple
  green:  '#2EC4B6', // Teal/Mint
  gold:   '#FFB703', // Warm yellow/gold
  pink:   '#F72585', // Magenta/pink
  indigo: '#3A0CA3', // Deep indigo
  cyan:   '#4CC9F0', // Sky blue
  red:    '#E63946', // Soft red
};

const PALETTE_LIST = Object.values(PALETTE);

// ─── State ───────────────────────────────────────────
let charts = {};
let manualServices = JSON.parse(localStorage.getItem('sas_manual_services') || '[]');

// ─── Cache Layer ──────────────────────────────────────
// All network data is cached in localStorage so the next page load
// renders instantly from cache, then refreshes in the background.
const CACHE_TTL = {
  lostFound:   10 * 60 * 1000,  // 10 min  — external API
  attendance:   5 * 60 * 1000,  //  5 min  — Supabase (live data)
  jobVacancy:  30 * 60 * 1000,  // 30 min  — rarely changes
  survey:       5 * 60 * 1000,  //  5 min  — matches poll interval
  studentData:  5 * 60 * 1000,  //  5 min
  pantry:      10 * 60 * 1000,  // 10 min
};

const CACHE_KEYS = {
  lostFound:   'sas_analytics_cache_lf',
  attendance:  'sas_analytics_cache_att',
  jobVacancy:  'sas_analytics_cache_jv',
  survey:      'sas_analytics_cache_survey',
  studentData: 'sas_analytics_cache_sd',
  pantry:      'sas_analytics_cache_pantry',
};

function cacheWrite(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    // localStorage full — clear old analytics caches and retry
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
  }
}

function cacheRead(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttl) return null; // expired
    return data;
  } catch (e) {
    return null;
  }
}

function cacheAge(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts } = JSON.parse(raw);
    const ageMs = Date.now() - ts;
    if (ageMs < 60000) return 'just now';
    if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)}m ago`;
    return `${Math.floor(ageMs / 3600000)}h ago`;
  } catch (e) { return null; }
}

// Read the raw rows cache written by the main portal's background poller.
// TTL is 6 minutes — slightly longer than the 5-min poll interval to avoid
// a gap where both the poller and the iframe try to fetch at the same time.
const _ROWS_CACHE_TTL = 6 * 60 * 1000;
function _readRowsCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, rows } = JSON.parse(raw);
    if (Date.now() - ts > _ROWS_CACHE_TTL) return null; // stale
    return rows;
  } catch (e) {
    return null;
  }
}

// ─── Init ─────────────────────────────────────────────
// Detect if we're running as a background preload (hidden iframe)
const IS_PRELOAD = new URLSearchParams(window.location.search).get('preload') === '1';

document.addEventListener('DOMContentLoaded', async () => {
  // If preloading in background, just warm the caches silently — no UI work
  if (IS_PRELOAD) {
    loadAllDataForPreload();
    return;
  }

  document.getElementById('semesterBadge').textContent = SEMESTER_LABEL;
  document.getElementById('printDate').textContent = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Initialize dashboard view
  initializeDashboardView();
  renderManualServices();

  // ── Step 1: Paint from cache instantly (zero wait) ──
  paintFromCache();

  // ── Step 2: Refresh stale/missing data in background ──
  loadAllData();

  // Survey + student dataset polling setup
  const hasLocalSheet = !!localStorage.getItem('sas_survey_sheet_id');
  let hasGlobalDefault = false;
  if (!hasLocalSheet) {
    const defaultData = await safeFetch(BACKEND_URL + '?action=getDefaultSurveySheet');
    if (defaultData && defaultData.success && defaultData.sheetId) hasGlobalDefault = true;
  }
  if (hasLocalSheet || hasGlobalDefault) startSurveyPolling();

  const hasLocalSDSheet = !!localStorage.getItem('sas_student_dataset_sheet_id');
  let hasGlobalSDDefault = false;
  if (!hasLocalSDSheet) {
    const sdDefaultData = await safeFetch(BACKEND_URL + '?action=getDefaultStudentDatasetSheet');
    if (sdDefaultData && sdDefaultData.success && sdDefaultData.sheetId) hasGlobalSDDefault = true;
  }
  loadStudentDatasetData();
  if (hasLocalSDSheet || hasGlobalSDDefault) startStudentDatasetPolling();
});

// Paint whatever is in cache right now — called before any network request
function paintFromCache() {
  const lf = cacheRead(CACHE_KEYS.lostFound, CACHE_TTL.lostFound);
  if (lf) { renderLFData(lf); showCacheAge('lf', CACHE_KEYS.lostFound); }

  const att = cacheRead(CACHE_KEYS.attendance, CACHE_TTL.attendance);
  if (att) { renderAttendanceFromCache(att); showCacheAge('att', CACHE_KEYS.attendance); }

  const jv = cacheRead(CACHE_KEYS.jobVacancy, CACHE_TTL.jobVacancy);
  if (jv) { renderJobVacancyFromCache(jv); showCacheAge('jv', CACHE_KEYS.jobVacancy); }

  const pantry = cacheRead(CACHE_KEYS.pantry, CACHE_TTL.pantry);
  if (pantry) { renderPantryFromCache(pantry); }

  // ── Survey ──────────────────────────────────────────────────────────────
  // Priority 1: parsed cache (fastest — no re-parse needed)
  // Priority 2: raw rows cache from background poller (needs parse, but no network)
  const survey = cacheRead(CACHE_KEYS.survey, CACHE_TTL.survey);
  if (survey) {
    renderSurveyData(survey);
    setSurveyStatus('ok', `${survey.total} responses · cached ${cacheAge(CACHE_KEYS.survey)}`);
    _restoreSheetUI('survey');
  } else {
    // Try rows cache from background poller
    const surveyRows = _readRowsCache(CACHE_KEYS.survey + '_rows');
    if (surveyRows) {
      const count = surveyRows.length - 1;
      setSurveyStatus('loading', `Parsing ${count} responses from background cache…`);
      _restoreSheetUI('survey');
      setTimeout(() => {
        const parsed = parseSurveyRows(surveyRows);
        cacheWrite(CACHE_KEYS.survey, parsed);
        surveyLastRowCount = count;
        renderSurveyData(parsed);
      }, 50);
    }
  }

  // ── Student Dataset ─────────────────────────────────────────────────────
  const sd = cacheRead(CACHE_KEYS.studentData, CACHE_TTL.studentData);
  if (sd) {
    renderStudentDatasetCharts(sd);
    setSDStatus('ok', `${sd.total} respondents · cached ${cacheAge(CACHE_KEYS.studentData)}`);
    _restoreSheetUI('sd');
  } else {
    // Try rows cache from background poller
    const sdRows = _readRowsCache(CACHE_KEYS.studentData + '_rows');
    if (sdRows) {
      const count = sdRows.length - 1;
      setSDStatus('loading', `Parsing ${count} respondents from background cache…`);
      _restoreSheetUI('sd');
      setTimeout(() => {
        const parsed = parseStudentDatasetRows(sdRows);
        cacheWrite(CACHE_KEYS.studentData, parsed);
        sdLastRowCount = count;
        renderStudentDatasetCharts(parsed);
      }, 100); // slight offset from survey parse to avoid blocking
    }
  }
}

// Restore sheet input + button visibility for a connected sheet section
function _restoreSheetUI(section) {
  if (section === 'survey') {
    const sheetId = localStorage.getItem('sas_survey_sheet_id');
    const input = document.getElementById('surveySheetId');
    if (input && sheetId && !input.value) input.value = sheetId;
    const rb = document.getElementById('surveyRefreshBtn');
    const db = document.getElementById('surveyDisconnectBtn');
    if (rb) rb.style.display = 'inline-flex';
    if (db) db.style.display = 'inline-flex';
  } else if (section === 'sd') {
    const sheetId = localStorage.getItem('sas_student_dataset_sheet_id');
    const input = document.getElementById('sdSheetId');
    if (input && sheetId && !input.value) input.value = sheetId;
    const rb = document.getElementById('sdRefreshBtn');
    const db = document.getElementById('sdDisconnectBtn');
    if (rb) rb.style.display = 'inline-flex';
    if (db) db.style.display = 'inline-flex';
  }
}

function showCacheAge(section, cacheKey) {
  const age = cacheAge(cacheKey);
  if (!age) return;
  // Show a subtle "cached X ago" badge if the element exists
  const el = document.getElementById(`cache-age-${section}`);
  if (el) { el.textContent = `cached ${age}`; el.style.display = 'inline'; }
}

// ─── Dashboard View Management ───────────────────────
function initializeDashboardView() {
  // Load saved dashboard preference or default to overview
  const savedDashboard = localStorage.getItem('sas_active_dashboard') || 'overview';
  showDashboard(savedDashboard);
}

function showDashboard(dashboardId) {
  // Hide all dashboards
  document.querySelectorAll('.an-dashboard').forEach(d => {
    d.classList.add('hidden');
  });
  
  // Remove active state from all buttons
  document.querySelectorAll('.an-selector-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected dashboard
  const targetDashboard = document.getElementById(`dashboard-${dashboardId}`);
  if (targetDashboard) {
    targetDashboard.classList.remove('hidden');
  }
  
  // Activate corresponding button
  const targetBtn = document.querySelector(`.an-selector-btn[data-dashboard="${dashboardId}"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
    // Scroll button into view if needed
    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  
  // Save preference
  localStorage.setItem('sas_active_dashboard', dashboardId);
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleCustomizeMode() {
  // Future feature: Allow users to customize which metrics appear in overview
  alert('Customize mode coming soon! You\'ll be able to pin your favorite metrics to the Overview dashboard.');
}

async function loadAllData() {
  showRefreshSpin(true);

  // Only re-fetch sections whose cache has expired — skip fresh ones
  const tasks = [];
  if (!cacheRead(CACHE_KEYS.lostFound,  CACHE_TTL.lostFound))  tasks.push(loadLostFoundData());
  if (!cacheRead(CACHE_KEYS.attendance, CACHE_TTL.attendance))  tasks.push(loadAttendanceData());
  if (!cacheRead(CACHE_KEYS.jobVacancy, CACHE_TTL.jobVacancy))  tasks.push(loadJobVacancyData());

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  // These are always lightweight / self-managing
  if (!cacheRead(CACHE_KEYS.pantry, CACHE_TTL.pantry)) loadPantryData();

  // Survey and student dataset manage their own staleness via row-count check
  loadSurveyData();
  loadBorrowersData(); // graceful — no await

  showRefreshSpin(false);
}

// Silent background preload — only fetches, no UI rendering
// Called when analytics.js is loaded in a hidden iframe on nav hover
async function loadAllDataForPreload() {
  const tasks = [];
  if (!cacheRead(CACHE_KEYS.lostFound,  CACHE_TTL.lostFound))  tasks.push(loadLostFoundData());
  if (!cacheRead(CACHE_KEYS.attendance, CACHE_TTL.attendance))  tasks.push(loadAttendanceData());
  if (!cacheRead(CACHE_KEYS.jobVacancy, CACHE_TTL.jobVacancy))  tasks.push(loadJobVacancyData());
  if (!cacheRead(CACHE_KEYS.pantry,     CACHE_TTL.pantry))      tasks.push(loadPantryData());

  await Promise.allSettled(tasks);

  // Survey + student dataset — fetch and cache silently
  await loadSurveyData();
  await loadStudentDatasetData();

  console.log('[Analytics] Preload complete — caches warmed');
}

function showRefreshSpin(on) {
  const btn = document.getElementById('refreshBtn');
  const icon = btn.querySelector('i');
  icon.className = on ? 'bx bx-loader-alt bx-spin' : 'bx bx-refresh';
}

// ─── Helper: safe fetch ───────────────────────────────
async function safeFetch(url, opts = {}) {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('[Analytics] Fetch failed:', url, e.message);
    return null;
  }
}

// ─── Helper: destroy & create chart ──────────────────
function makeChart(id, config) {
  if (charts[id]) { charts[id].destroy(); }
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  charts[id] = new Chart(ctx, config);
  return charts[id];
}

// ─── SECTION 1: Lost & Found ─────────────────────────
async function loadLostFoundData() {
  // Uses existing Backend.gs proxy endpoint: getLostFoundStats
  const data = await safeFetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getLostFoundStats' })
  });
  if (!data || !data.success) {
    // Try direct API as fallback
    const direct = await safeFetch(LF_API_BASE + '/admin/stats');
    if (direct && direct.data) {
      cacheWrite(CACHE_KEYS.lostFound, direct.data);
      renderLFData(direct.data);
      return;
    }
    // Only show placeholder if nothing is cached
    if (!cacheRead(CACHE_KEYS.lostFound, CACHE_TTL.lostFound)) renderLFPlaceholder();
    return;
  }
  cacheWrite(CACHE_KEYS.lostFound, data.data);
  renderLFData(data.data);
}

function renderLFData(d) {
  if (!d) { renderLFPlaceholder(); return; }

  const totalFound    = d.foundItems   ?? d.totalFoundItems   ?? d.total_found   ?? 0;
  const totalLost     = d.lostItems    ?? d.totalLostItems    ?? d.total_lost    ?? 0;
  const claimed       = d.claimedItems      ?? d.claimed       ?? 0;
  const active        = d.activeItems       ?? d.active        ?? (totalFound - claimed);
  const totalClaims   = d.totalClaims       ?? d.claims_count  ?? claimed;

  const totalAll  = totalFound + totalLost;
  const recovRate = totalFound > 0 ? Math.round((claimed / totalFound) * 100) : 0;

  // KPI
  setText('kv-lf-total',     totalAll);
  setText('kv-lf-recovered', claimed);
  setText('kv-lf-rate',      `Recovery Rate: ${recovRate}%`);

  // Stats Row
  setText('st-lf-found',   totalFound);
  setText('st-lf-lost',    totalLost);
  setText('st-lf-claimed', claimed);
  setText('st-lf-active',  active);
  setText('st-lf-claims',  totalClaims);

  // Rate badge
  const badge = document.getElementById('lf-rate-badge');
  if (badge) {
    badge.textContent = `${recovRate}%`;
    badge.style.background = recovRate >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)';
    badge.style.color       = recovRate >= 70 ? '#10b981' : '#f59e0b';
    badge.style.borderColor = recovRate >= 70 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)';
  }

  // ── Doughnut: Recovery Rate
  makeChart('lfRecoveryChart', {
    type: 'doughnut',
    data: {
      labels: ['Claimed / Returned', 'Still Active'],
      datasets: [{
        data: [claimed, active],
        backgroundColor: ['#10b981', '#1f2a42'],
        borderColor: ['#10b981', '#374151'],
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
      }
    }
  });

  // ── Bar: Category breakdown
  let cats = d.categoryBreakdown ?? d.categories;
  if (Array.isArray(cats)) {
    const cObj = {};
    cats.forEach(c => cObj[c.name || c.category] = c.found ?? c.total ?? 0);
    cats = cObj;
  }
  if (!cats) cats = sampleCategories();

  const catKeys = Object.keys(cats).slice(0, 8);
  const catVals = catKeys.map(k => cats[k]);

  makeChart('lfCategoryChart', {
    type: 'bar',
    data: {
      labels: catKeys,
      datasets: [{
        label: 'Items',
        data: catVals,
        backgroundColor: PALETTE_LIST.slice(0, catKeys.length),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // ── Line: Monthly Reports
  let monthly = d.monthlyTrend ?? d.monthly;
  if (!monthly && d.monthlyStats) {
    monthly = {};
    d.monthlyStats.forEach(m => monthly[m.month || m.name] = m.found ?? m.total ?? 0);
  }
  if (!monthly) monthly = sampleMonthly();

  const months  = Object.keys(monthly);
  const mVals   = Object.values(monthly);

  makeChart('lfMonthlyChart', {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Reports',
        data: mVals,
        borderColor: PALETTE.indigo,
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: PALETTE.indigo,
        pointRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
      }
    }
  });
}

function renderLFPlaceholder() {
  ['kv-lf-total','kv-lf-recovered','st-lf-found','st-lf-lost','st-lf-claimed','st-lf-active','st-lf-claims']
    .forEach(id => setText(id, '—'));
  renderEmptyChart('lfRecoveryChart', 'doughnut');
  renderEmptyChart('lfCategoryChart', 'bar');
  renderEmptyChart('lfMonthlyChart',  'line');
}

// ─── SECTION 2: Borrowers Log ────────────────────────
async function loadBorrowersData() {
  // The Borrowers Log public API — update URL when available
  const data = await safeFetch(BORROWERS_BASE + '/stats');
  const el = document.getElementById('borrowers-placeholder');

  if (!data || !data.success) {
    if (el) el.classList.remove('hidden');
    renderEmptyChart('borrowerItemsChart',   'bar');
    renderEmptyChart('borrowerTypeChart',    'doughnut');
    renderEmptyChart('borrowerMonthlyChart', 'bar');
    return;
  }

  if (el) el.classList.add('hidden');
  renderBorrowersData(data.data);
}

function renderBorrowersData(d) {
  const total = d.totalTransactions ?? 0;
  setText('kv-borrowers', total);

  // Items chart
  const items = d.itemBreakdown ?? {};
  makeChart('borrowerItemsChart', {
    type: 'bar',
    data: {
      labels: Object.keys(items),
      datasets: [{
        label: 'Times Borrowed',
        data: Object.values(items),
        backgroundColor: PALETTE.gold,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false } }
      }
    }
  });

  // Type doughnut
  const byType = d.typeBreakdown ?? { Student: 0, Teacher: 0, Staff: 0 };
  makeChart('borrowerTypeChart', {
    type: 'doughnut',
    data: {
      labels: Object.keys(byType),
      datasets: [{
        data: Object.values(byType),
        backgroundColor: [PALETTE.blue, PALETTE.gold, PALETTE.green],
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });

  // Monthly
  const monthly = d.monthlyTrend ?? {};
  makeChart('borrowerMonthlyChart', {
    type: 'bar',
    data: {
      labels: Object.keys(monthly),
      datasets: [{
        label: 'Transactions',
        data: Object.values(monthly),
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderColor: PALETTE.gold,
        borderWidth: 1.5,
        borderRadius: 5,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
      }
    }
  });
}

// ─── SECTION 3: Client Satisfaction Surveys ──────────
// Reads directly from the Google Sheet public CSV export.
// No backend proxy needed — works as long as the sheet is shared
// with "Anyone with the link can view".

const SURVEY_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
let surveyPollTimer = null;
let surveyLastRowCount = 0;

// Column index map (0-based) matching the exact sheet structure described:
// 0  Timestamp
// 1  Email Address
// 2  Name
// 3  Course and Year
// 4  Institute
// 5  Aware of services (checkbox, comma-separated)
// 6  Availed any service? (Yes/No)
// 7–11   Information & Orientation (5 questions, 1-5)
// 12–16  Guidance Service (5 questions, 1-5)
// 17–21  Counseling Service (5 questions, 1-5)
// 22–26  Appraisal Service (5 questions, 1-5)
// 27–28  Job Placement (2 questions, 1-5)
// 29+    Comments / open-ended (remaining columns)

// Column index map (0-based) matching the actual 152-column sheet structure.
// The sheet has 20+ service groups with ~5 questions each (1-5 rating scale).
// We're focusing on the first 5 core SASDD services for this dashboard.
// Columns 0-6: Metadata (Timestamp, Email, Name, Course, Institute, Awareness, Availed)
// Columns 7-31: Information & Orientation (5q), Guidance (5q), Counseling (5q), Appraisal (5q), Job Placement (2q)
// Columns 32-148: Additional services (not mapped here for performance)
// Columns 149-151: Open-ended comments

const SURVEY_SERVICES = [
  {
    key: 'orientation',
    label: 'Information & Orientation',
    color: '#3b82f6',
    colStart: 8,
    colEnd: 12,
    questions: [
      'Orientation provided clear information',
      'Helped understand policies',
      'Information provided timely',
      'Addressed questions effectively',
      'Overall satisfaction'
    ]
  },
  {
    key: 'guidance',
    label: 'Guidance Service',
    color: '#8b5cf6',
    colStart: 13,
    colEnd: 17,
    questions: [
      'Service available when needed',
      'Helped clarify concerns',
      'Counselors approachable',
      'Confidentiality maintained',
      'Overall satisfaction'
    ]
  },
  {
    key: 'counseling',
    label: 'Counseling Service',
    color: '#10b981',
    colStart: 18,
    colEnd: 22,
    questions: [
      'Easy to schedule',
      'Sessions met expectations',
      'Counselor skilled',
      'Positive impact on well-being',
      'Overall satisfaction'
    ]
  },
  {
    key: 'appraisal',
    label: 'Appraisal Service',
    color: '#f59e0b',
    colStart: 23,
    colEnd: 27,
    questions: [
      'Aware of services',
      'Results relevant',
      'Feedback timely',
      'Helped guide decisions',
      'Overall satisfaction'
    ]
  },
  {
    key: 'placement',
    label: 'Job Placement',
    color: '#ec4899',
    colStart: 28,
    colEnd: 32,
    questions: [
      'Resources accessible',
      'Sufficient opportunities',
      'Workshops effective',
      'Prepared for employment',
      'Overall satisfaction'
    ]
  }
];

// Derive the comment column start (first column after all rating columns)
const SURVEY_COMMENT_COL_START = 29;

// Uses the Google Visualization / gviz/tq endpoint.
// The response is always wrapped as:
//   google.visualization.Query.setResponse({...})
// So we temporarily override that function to capture the data.
async function fetchSurveySheet(sheetId) {
  return new Promise((resolve) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      console.warn('[Survey] Sheet fetch timed out');
      resolve(null);
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      const s = document.getElementById('_surveyScript');
      if (s) s.remove();
      // Restore google.visualization namespace if we stomped it
      try {
        if (window.google && window.google.visualization) {
          delete window.google.visualization.Query;
        }
      } catch(e) {}
    }

    // Ensure the google.visualization.Query.setResponse path exists
    window.google = window.google || {};
    window.google.visualization = window.google.visualization || {};
    window.google.visualization.Query = window.google.visualization.Query || {};
    window.google.visualization.Query.setResponse = function(raw) {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        resolve(parseGvizResponse(raw));
      } catch (e) {
        console.warn('[Survey] Parse error:', e.message);
        resolve(null);
      }
    };

    const script = document.createElement('script');
    script.id  = '_surveyScript';
    
    // Check if running on localhost — use CORS proxy if so
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';
    
    let url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json`;
    
    // On localhost, Google may block the request — use a CORS proxy
    if (isLocalhost) {
      console.warn('[Survey] Running on localhost — using CORS proxy (may be slower)');
      url = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    }
    
    script.src = url;
    script.onerror = (e) => {
      if (settled) return;
      settled = true;
      cleanup();
      console.error('[Survey] Script load failed. URL:', url);
      console.error('[Survey] Error event:', e);
      if (isLocalhost) {
        console.error('[Survey] Localhost detected — Google Sheets may block localhost requests.');
        console.error('[Survey] Deploy to a real domain (GitHub Pages) to test, or use the CORS proxy fallback.');
      } else {
        console.error('[Survey] Check: 1) Sheet is shared as "Anyone with the link" 2) Sheet ID is correct');
      }
      resolve(null);
    };
    document.head.appendChild(script);
    console.log('[Survey] Loading sheet:', sheetId, '| Localhost:', isLocalhost, '| URL:', url);
  });
}

// Convert the gviz DataTable response into a 2-D array of strings
// (same shape as the old CSV parser output: rows[0] = headers, rows[1..] = data)
function parseGvizResponse(raw) {
  const table = raw.table;
  if (!table) throw new Error('No table in gviz response');

  // Build header row from column labels
  const headers = (table.cols || []).map(c => c.label || '');

  // Build data rows
  const dataRows = (table.rows || []).map(r =>
    (r.c || []).map(cell => {
      if (!cell || cell.v === null || cell.v === undefined) return '';
      // Dates come as Date(year,month,day,...) objects — convert to readable string
      if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
        const parts = cell.v.slice(5, -1).split(',').map(Number);
        // parts: [year, month(0-based), day, hour, min, sec]
        const d = new Date(parts[0], parts[1], parts[2] || 1,
                           parts[3] || 0, parts[4] || 0, parts[5] || 0);
        // Format as M/D/YYYY to match the timestamp parser downstream
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      }
      // Use formatted value if available (preserves original text for dropdowns/checkboxes)
      return cell.f !== undefined && cell.f !== null ? String(cell.f) : String(cell.v);
    })
  );

  return [headers, ...dataRows];
}

function parseSurveyRows(rows) {
  // rows[0] is the header — skip it
  const data = rows.slice(1).filter(row => {
    // Skip completely empty rows or rows with only timestamp
    return row.length > 5 && row.slice(2).some(c => c && c.trim());
  });

  const result = {
    total: data.length,
    monthly: {},
    byInstitute: {},
    awarenessCount: {},
    availedYes: 0,
    availedNo: 0,
    services: {},
    allQuestions: [],
    ratingDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    comments: []
  };

  // Init service accumulators
  SURVEY_SERVICES.forEach(svc => {
    result.services[svc.key] = { label: svc.label, color: svc.color, scores: [], avg: 0 };
  });

  // Process in batches to avoid blocking
  const BATCH_SIZE = 200;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    batch.forEach(row => {
      // Monthly (col 0 = Timestamp)
      const ts = row[0] || '';
      const dateMatch = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const d = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
        const key = d.toLocaleString('en-PH', { month: 'short', year: '2-digit' });
        result.monthly[key] = (result.monthly[key] || 0) + 1;
      }

      // Institute (col 4)
      const inst = (row[4] || 'Unknown').trim();
      if (inst && inst !== 'Unknown') result.byInstitute[inst] = (result.byInstitute[inst] || 0) + 1;

      // Awareness (col 5 — comma-separated checkbox values)
      const aware = (row[5] || '').split(',');
      aware.forEach(a => {
        const s = a.trim();
        if (s && s.length > 3) result.awarenessCount[s] = (result.awarenessCount[s] || 0) + 1;
      });

      // Availed (col 6)
      const availed = (row[6] || '').trim().toLowerCase();
      if (availed === 'yes') result.availedYes++;
      else if (availed === 'no') result.availedNo++;

      // Rating columns per service
      SURVEY_SERVICES.forEach(svc => {
        let svcSum = 0;
        let svcCount = 0;
        for (let c = svc.colStart; c <= svc.colEnd; c++) {
          const v = parseFloat(row[c]);
          if (!isNaN(v) && v >= 1 && v <= 5) {
            svcSum += v;
            svcCount++;
            result.ratingDist[Math.round(v)] = (result.ratingDist[Math.round(v)] || 0) + 1;
          }
        }
        if (svcCount > 0) {
          result.services[svc.key].scores.push(svcSum / svcCount);
        }
      });

      // Comments (last 3 columns: 149, 150, 151)
      const commentParts = [row[149], row[150], row[151]].filter(c => c && c.trim().length > 2);
      if (commentParts.length > 0) {
        result.comments.push({
          name: (row[2] || 'Anonymous').trim(),
          course: (row[3] || '').trim(),
          text: commentParts.join(' | ')
        });
      }
    });
  }

  // Compute averages
  let grandSum = 0;
  let grandCount = 0;
  SURVEY_SERVICES.forEach(svc => {
    const s = result.services[svc.key];
    if (s.scores.length > 0) {
      s.avg = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
      grandSum += s.avg;
      grandCount++;
    }
  });
  result.overallAvg = grandCount > 0 ? grandSum / grandCount : 0;

  // Build flat question averages (sample first 1000 rows for speed)
  const sampleData = data.slice(0, 1000);
  SURVEY_SERVICES.forEach(svc => {
    const colCount = svc.colEnd - svc.colStart + 1;
    for (let qi = 0; qi < colCount; qi++) {
      const colIdx = svc.colStart + qi;
      const vals = sampleData.map(r => parseFloat(r[colIdx])).filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      result.allQuestions.push({
        label: svc.questions[qi] || `Q${qi + 1}`,
        svcLabel: svc.label,
        color: svc.color,
        avg
      });
    }
  });

  return result;
}

function renderSurveyData(parsed) {
  if (!parsed || parsed.total === 0) {
    setSurveyStatus('warn', 'Sheet connected but no data rows found');
    return;
  }

  setSurveyStatus('ok', `${parsed.total} responses · auto-refreshes every 5 min`);

  // KPI strip
  setText('sv-total', parsed.total);
  setText('sv-overall', parsed.overallAvg.toFixed(2) + ' / 5');
  const awareCount = Object.values(parsed.awarenessCount).reduce((a, b) => a + b, 0);
  const awareUniq = parsed.total > 0 ? Math.round((Object.keys(parsed.awarenessCount).length > 0 ? parsed.availedYes + parsed.availedNo : 0) / parsed.total * 100) : 0;
  setText('sv-aware', Object.keys(parsed.awarenessCount).length + ' services mentioned');
  const availedPct = parsed.total > 0 ? Math.round((parsed.availedYes / parsed.total) * 100) : 0;
  setText('sv-availed', `${parsed.availedYes} (${availedPct}%)`);
  setText('sv-updated', new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));

  // KPI card update
  setText('kv-survey-score', parsed.overallAvg.toFixed(1) + ' ★');
  setText('kv-survey-count', parsed.total + ' surveys collected');

  // Score badge color
  const badge = document.getElementById('sv-score-badge');
  if (badge) {
    badge.textContent = parsed.overallAvg.toFixed(2);
    const good = parsed.overallAvg >= 4;
    badge.style.background = good ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)';
    badge.style.color = good ? '#10b981' : '#f59e0b';
    badge.style.borderColor = good ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)';
  }

  // ── Gauge
  const maxDeg = 180;
  const pct = (parsed.overallAvg / 5) * maxDeg;
  setText('gauge-score', parsed.overallAvg.toFixed(1));
  makeChart('satisfactionGauge', {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, maxDeg - pct, maxDeg],
        backgroundColor: ['#f59e0b', '#1f2a42', 'transparent'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270
      }]
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });

  // ── Service group bar
  const svcKeys = SURVEY_SERVICES.map(s => s.key).filter(k => parsed.services[k].scores.length > 0);
  makeChart('surveyServiceChart', {
    type: 'bar',
    data: {
      labels: svcKeys.map(k => parsed.services[k].label),
      datasets: [{
        label: 'Avg Score',
        data: svcKeys.map(k => +parsed.services[k].avg.toFixed(2)),
        backgroundColor: svcKeys.map(k => parsed.services[k].color),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // ── Monthly
  const months = Object.keys(parsed.monthly);
  makeChart('surveyMonthlyChart', {
    type: 'bar',
    data: {
      labels: months.length ? months : ['No data'],
      datasets: [{
        label: 'Responses',
        data: months.length ? Object.values(parsed.monthly) : [0],
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 5
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
      }
    }
  });

  // ── Per-question detail (horizontal bar)
  const qLabels = parsed.allQuestions.map(q => q.label);
  const qAvgs   = parsed.allQuestions.map(q => +q.avg.toFixed(2));
  const qColors = parsed.allQuestions.map(q => q.color);
  makeChart('surveyDetailChart', {
    type: 'bar',
    data: {
      labels: qLabels,
      datasets: [{
        label: 'Avg Score',
        data: qAvgs,
        backgroundColor: qColors,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // ── Rating distribution (as percentages)
  const distLabels = ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'];
  const distCounts = [1, 2, 3, 4, 5].map(n => parsed.ratingDist[n] || 0);
  const totalRatings = distCounts.reduce((a, b) => a + b, 0);
  
  // Convert to percentages
  const distVals = distCounts.map(count => 
    totalRatings > 0 ? ((count / totalRatings) * 100) : 0
  );
  
  const distColors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6'];
  makeChart('surveyDistChart', {
    type: 'bar',
    data: {
      labels: distLabels,
      datasets: [{
        label: 'Percentage',
        data: distVals,
        backgroundColor: distColors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const pct = ctx.parsed.y.toFixed(1);
              const count = distCounts[ctx.dataIndex];
              return ` ${pct}% (${count.toLocaleString()} ratings)`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { 
          grid: { color: 'rgba(255,255,255,0.04)' }, 
          ticks: { 
            callback: function(value) {
              return value.toFixed(0) + '%';
            }
          },
          max: 100
        }
      }
    }
  });

  // ── Awareness horizontal bar
  const awKeys = Object.keys(parsed.awarenessCount).slice(0, 10);
  const awVals = awKeys.map(k => parsed.awarenessCount[k]);
  makeChart('surveyAwarenessChart', {
    type: 'bar',
    data: {
      labels: awKeys.length ? awKeys : ['No data'],
      datasets: [{
        label: 'Respondents',
        data: awKeys.length ? awVals : [0],
        backgroundColor: '#6366f1',
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // ── By Institute doughnut
  const instKeys = Object.keys(parsed.byInstitute);
  makeChart('surveyInstituteChart', {
    type: 'doughnut',
    data: {
      labels: instKeys.length ? instKeys : ['No data'],
      datasets: [{
        data: instKeys.length ? instKeys.map(k => parsed.byInstitute[k]) : [1],
        backgroundColor: instKeys.length ? PALETTE_LIST : ['rgba(255,255,255,0.05)'],
        borderWidth: instKeys.length ? 2 : 0,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '60%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
    }
  });

  // ── Availed doughnut
  makeChart('surveyAvailedChart', {
    type: 'doughnut',
    data: {
      labels: ['Availed', 'Not Availed'],
      datasets: [{
        data: [parsed.availedYes, parsed.availedNo],
        backgroundColor: ['#10b981', '#1f2a42'],
        borderColor: ['#10b981', '#374151'],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });

  // ── Comments
  renderSurveyComments(parsed.comments);

  // Show charts area
  const chartsArea = document.getElementById('survey-charts-area');
  const placeholder = document.getElementById('survey-placeholder');
  if (chartsArea) chartsArea.classList.remove('hidden');
  if (placeholder) placeholder.classList.add('hidden');
}

function renderSurveyComments(comments) {
  const list = document.getElementById('surveyCommentsList');
  const countBadge = document.getElementById('sv-comments-count');
  if (!list) return;

  const recent = comments.slice(-20).reverse(); // show last 20, newest first
  if (countBadge) countBadge.textContent = comments.length;

  if (!recent.length) {
    list.innerHTML = '<div class="an-loading-row">No open-ended comments found.</div>';
    return;
  }

  list.innerHTML = recent.map(c => `
    <div class="an-comment-item">
      <div class="an-comment-meta">
        <span class="an-comment-name">${escHtml(c.name)}</span>
        ${c.course ? `<span class="an-comment-course">${escHtml(c.course)}</span>` : ''}
      </div>
      <p class="an-comment-text">${escHtml(c.text)}</p>
    </div>`).join('');
}

function setSurveyStatus(state, msg) {
  const dot  = document.getElementById('surveyStatusDot');
  const text = document.getElementById('surveyStatusText');
  if (dot)  dot.className  = 'an-survey-status-dot an-survey-dot-' + state;
  if (text) text.textContent = msg;
}

async function loadSurveyData() {
  let sheetId = localStorage.getItem('sas_survey_sheet_id');
  
  // If no saved sheet ID, fetch the global default from backend
  if (!sheetId) {
    const defaultData = await safeFetch(BACKEND_URL + '?action=getDefaultSurveySheet');
    if (defaultData && defaultData.success && defaultData.sheetId) {
      sheetId = defaultData.sheetId;
      // Don't save to localStorage yet — let user see it's the global default
      // They can click Connect to save it permanently to their browser
    }
  }

  // Restore the saved/default ID into the input so it's always visible
  const input = document.getElementById('surveySheetId');
  if (input && sheetId && !input.value) input.value = sheetId;

  const refreshBtn    = document.getElementById('surveyRefreshBtn');
  const disconnectBtn = document.getElementById('surveyDisconnectBtn');

  if (!sheetId) {
    setSurveyStatus('off', 'Not connected');
    if (refreshBtn)    refreshBtn.style.display    = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    document.getElementById('survey-charts-area')?.classList.add('hidden');
    document.getElementById('survey-placeholder')?.classList.remove('hidden');
    return;
  }

  if (refreshBtn)    refreshBtn.style.display    = 'inline-flex';
  if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';

  // ── Check if background poller already fetched fresh rows ──────────────
  // The main portal's background poller writes to 'sas_analytics_cache_survey_rows'
  // every 5 minutes. If those rows are fresh, use them instantly — no gviz fetch needed.
  const rowsCacheKey = CACHE_KEYS.survey + '_rows';
  const cachedRows = _readRowsCache(rowsCacheKey);
  if (cachedRows) {
    const dataRowsCached = cachedRows.length - 1;
    if (dataRowsCached !== surveyLastRowCount || surveyLastRowCount === 0) {
      surveyLastRowCount = dataRowsCached;
      setSurveyStatus('loading', `Parsing ${dataRowsCached} responses from background cache…`);
      setTimeout(() => {
        const parsed = parseSurveyRows(cachedRows);
        cacheWrite(CACHE_KEYS.survey, parsed);
        renderSurveyData(parsed);
      }, 50);
    } else {
      setSurveyStatus('ok', `${dataRowsCached} responses · cached ${cacheAge(rowsCacheKey)}`);
    }
    return;
  }
  // ── No background cache — fall back to direct gviz fetch ───────────────

  setSurveyStatus('loading', 'Fetching sheet (large dataset, may take 10–30s)…');

  const startTime = Date.now();
  let rows = await fetchSurveySheet(sheetId);

  // Auto-retry once on failure before giving up
  if (!rows) {
    setSurveyStatus('loading', 'Retrying sheet fetch…');
    await new Promise(r => setTimeout(r, 3000));
    rows = await fetchSurveySheet(sheetId);
  }

  const fetchDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!rows) {
    setSurveyStatus('error', 'Could not load sheet — open the sheet → Share → Anyone with the link → Viewer');
    document.getElementById('survey-charts-area')?.classList.add('hidden');
    document.getElementById('survey-placeholder')?.classList.remove('hidden');
    return;
  }

  // Check if data changed (by row count) to avoid unnecessary re-renders
  const dataRows = rows.length - 1; // minus header
  if (dataRows === surveyLastRowCount && surveyLastRowCount > 0) {
    setSurveyStatus('ok', `${dataRows} responses · no changes · checked ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`);
    return;
  }
  surveyLastRowCount = dataRows;

  setSurveyStatus('loading', `Parsing ${dataRows} responses (fetched in ${fetchDuration}s)…`);

  // Parse in next tick to avoid blocking UI
  setTimeout(() => {
    const parsed = parseSurveyRows(rows);
    // Cache the parsed result so next load is instant
    cacheWrite(CACHE_KEYS.survey, parsed);
    renderSurveyData(parsed);
  }, 50);
}

function saveSurveySheetId() {
  let val = document.getElementById('surveySheetId')?.value?.trim();
  if (!val) return;
  
  // Extract Sheet ID from various URL formats:
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  // SHEET_ID (raw)
  const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    val = match[1];
  } else if (val.includes('/')) {
    alert('Invalid Sheet ID or URL. Please paste the full Google Sheets URL or just the Sheet ID.');
    return;
  }
  
  // Update the input to show the cleaned ID
  const input = document.getElementById('surveySheetId');
  if (input) input.value = val;
  
  // Save to localStorage for this user
  localStorage.setItem('sas_survey_sheet_id', val);
  
  // Save to backend as the global default for ALL users
  setSurveyStatus('loading', 'Saving as default for all users…');
  safeFetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'setDefaultSurveySheet', sheetId: val })
  }).then(result => {
    if (result && result.success) {
      console.log('[Survey] Saved as global default:', result.message);
    } else {
      console.warn('[Survey] Failed to save global default:', result?.message);
    }
  });
  
  surveyLastRowCount = 0; // force re-render
  loadSurveyData();
  startSurveyPolling();
}

function refreshSurveyNow() {
  surveyLastRowCount = 0;
  loadSurveyData();
}

function disconnectSurvey() {
  if (!confirm('Disconnect this Google Sheet?')) return;
  localStorage.removeItem('sas_survey_sheet_id');
  surveyLastRowCount = 0;
  stopSurveyPolling();
  const input = document.getElementById('surveySheetId');
  if (input) input.value = '';
  document.getElementById('survey-charts-area')?.classList.add('hidden');
  document.getElementById('survey-placeholder')?.classList.remove('hidden');
  setSurveyStatus('off', 'Not connected');
  const refreshBtn    = document.getElementById('surveyRefreshBtn');
  const disconnectBtn = document.getElementById('surveyDisconnectBtn');
  if (refreshBtn)    refreshBtn.style.display    = 'none';
  if (disconnectBtn) disconnectBtn.style.display = 'none';
}

function startSurveyPolling() {
  stopSurveyPolling();
  surveyPollTimer = setInterval(loadSurveyData, SURVEY_POLL_INTERVAL);
}

function stopSurveyPolling() {
  if (surveyPollTimer) { clearInterval(surveyPollTimer); surveyPollTimer = null; }
}

function renderSurveyRealData() {} // kept as no-op for backward compat

// ─── SECTION 4: Pantry Logbook ───────────────────────
function loadPantryData() {
  const sheetId = localStorage.getItem('sas_pantry_sheet_id');
  const el = document.getElementById('pantry-placeholder');

  if (!sheetId) {
    if (el) el.classList.remove('hidden');
    renderEmptyChart('pantryMonthlyChart', 'bar');
    renderEmptyChart('pantryCourseChart',  'doughnut');
    renderEmptyChart('pantryYearChart',    'bar');
    return;
  }

  if (el) el.classList.add('hidden');
  safeFetch(BACKEND_URL + '?action=getPantryStats&sheetId=' + encodeURIComponent(sheetId)).then(res => {
    if (res && res.success) {
      cacheWrite(CACHE_KEYS.pantry, res);
      renderPantryFromCache(res);
    } else {
      if (!cacheRead(CACHE_KEYS.pantry, CACHE_TTL.pantry)) {
        setText('kv-pantry', '—');
        renderEmptyChart('pantryMonthlyChart', 'bar');
        renderEmptyChart('pantryCourseChart',  'doughnut');
        renderEmptyChart('pantryYearChart',    'bar');
      }
    }
  });
}

function renderPantryFromCache(res) {
  setText('kv-pantry', res.count || 0);

  const monthly = res.monthly || {};
  makeChart('pantryMonthlyChart', {
    type: 'bar',
    data: {
      labels: Object.keys(monthly),
      datasets: [{ label: 'Students', data: Object.values(monthly), backgroundColor: PALETTE.pink, borderRadius: 5 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } }
  });

  const course = res.byCourse || {};
  makeChart('pantryCourseChart', {
    type: 'doughnut',
    data: {
      labels: Object.keys(course),
      datasets: [{ data: Object.values(course), backgroundColor: PALETTE_LIST, borderWidth: 2 }]
    },
    options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } }
  });

  const year = res.byYear || {};
  makeChart('pantryYearChart', {
    type: 'bar',
    data: {
      labels: Object.keys(year),
      datasets: [{ label: 'Students', data: Object.values(year), backgroundColor: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.gold], borderRadius: 5 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } }
  });
}

function savePantrySheetId() {
  const val = document.getElementById('pantrySheetId')?.value?.trim();
  if (!val) return;
  localStorage.setItem('sas_pantry_sheet_id', val);
  loadPantryData();
}

// ─── SECTION 5: Event Attendance ─────────────────────
let supabaseClient;
function getSupabase() {
  if (!supabaseClient && window.supabase && window.ENV?.SUPABASE_URL) {
    supabaseClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

async function fetchAll(sb, table, select) {
  let all = [];
  let from = 0;
  let step = 1000;
  let keepFetching = true;
  while(keepFetching) {
    const { data, error } = await sb.from(table).select(select).range(from, from + step - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all = all.concat(data);
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }
  return all;
}

async function loadAttendanceData() {
  const sb = getSupabase();
  const elPh = document.getElementById('attendance-placeholder');

  if (!sb) {
    if (elPh) elPh.classList.remove('hidden');
    setText('kv-attendance', '—');
    renderEmptyChart('attendanceEventChart',  'bar');
    renderEmptyChart('attendanceCourseChart', 'doughnut');
    renderEmptyChart('attendanceYearChart',   'bar');
    renderEmptyTopEvents([]);
    return;
  }

  try {
    // Fetch all events and schedules
    const events = await fetchAll(sb, 'sas_events', 'id, name');
    const schedules = await fetchAll(sb, 'sas_schedules', 'id, event_id');

    // Map schedules to events
    const schedToEvent = {};
    schedules.forEach(s => schedToEvent[s.id] = s.event_id);

    // Pre-build attendance sets per event
    const eventAttendees = {};
    events.forEach(e => eventAttendees[e.id] = new Set());

    const allUniqueAttendees = new Set();
    const attendeeStudentIds = new Set();

    // Fetch logs FILTERED by schedule IDs (much faster than full table scan)
    const scheduleIds = schedules.map(s => s.id);
    if (scheduleIds.length > 0) {
      // Chunk the schedule IDs to avoid URL length limits
      for (let i = 0; i < scheduleIds.length; i += 200) {
        const chunk = scheduleIds.slice(i, i + 200);
        let from = 0;
        const step = 1000;
        let keepGoing = true;
        while (keepGoing) {
          const { data: logsChunk, error: logErr } = await sb
            .from('sas_attendance_logs')
            .select('student_id, schedule_id')
            .in('schedule_id', chunk)
            .range(from, from + step - 1);
          if (logErr) throw logErr;
          if (logsChunk && logsChunk.length > 0) {
            logsChunk.forEach(l => {
              const evId = schedToEvent[l.schedule_id];
              if (evId && eventAttendees[evId]) {
                eventAttendees[evId].add(l.student_id);
                allUniqueAttendees.add(l.student_id);
              }
              attendeeStudentIds.add(l.student_id);
            });
            from += step;
            if (logsChunk.length < step) keepGoing = false;
          } else {
            keepGoing = false;
          }
        }
      }
    }

    // -- LEGACY DATA INTEGRATION --
    const legacyColsFd = [
      'Day1_Parade_Mass', 'Day1Opening_Morning', 'Day1Afternoon_IN', 'Day1Afternoon_OUT',
      'Day2Morning_IN', 'Day2Morning_OUT', 'Day2Afternoon_IN', 'Day2Afernoon_OUT',
      'Day3Morning_IN', 'Day3Morning_OUT', 'Day3Afternoon_IN', 'Day3Afternoon_OUT',
      'Day3_Scan_3', 'Day4_Scan_1', 'Day4_Scan_2', 'Day4_Scan_3'
    ];
    const legacyColsIt = ['Morning_Day2_IN', 'Afternoon_Day2_IN', 'Afternoon_Day2_OUT'];

    let fdData = [];
    let itData = [];
    try {
      const [fd, it] = await Promise.all([
        fetchAll(sb, 'NBSC_attendance', 'ID,' + legacyColsFd.join(',')),
        fetchAll(sb, 'NBSC_it_fest_attendance', 'ID,' + legacyColsIt.join(','))
      ]);
      fdData = fd;
      itData = it;
    } catch (e) {
      console.warn('[Analytics] Legacy attendance tables missing or error:', e.message);
    }

    let fdCount = 0;
    fdData.forEach(row => {
      const hasAttended = legacyColsFd.some(c => row[c] && row[c] !== 'Not Checked In' && row[c] !== 'Empty');
      if (hasAttended) {
        fdCount++;
        allUniqueAttendees.add(row.ID);
        attendeeStudentIds.add(row.ID);
      }
    });

    let itCount = 0;
    itData.forEach(row => {
      const hasAttended = legacyColsIt.some(c => row[c] && row[c] !== 'Not Checked In' && row[c] !== 'Empty');
      if (hasAttended) {
        itCount++;
        allUniqueAttendees.add(row.ID);
        attendeeStudentIds.add(row.ID);
      }
    });

    if (fdCount > 0) {
      events.push({ id: 'legacy-fd', name: 'Foundation Day 2026 (Legacy)' });
      eventAttendees['legacy-fd'] = { size: fdCount }; // mock Set interface for count
    }
    if (itCount > 0) {
      events.push({ id: 'legacy-it', name: 'IT Fest 2026 (Legacy)' });
      eventAttendees['legacy-it'] = { size: itCount }; // mock Set interface for count
    }
    // -- END LEGACY --

    // To get course/year level, we need student details
    let students = [];
    if (attendeeStudentIds.size > 0) {
      // Chunk the 'in' query if there are thousands of students
      const idsArray = Array.from(attendeeStudentIds);
      for (let i = 0; i < idsArray.length; i += 500) {
        const chunk = idsArray.slice(i, i + 500);
        const { data: mlist, error: mErr } = await sb
          .from('NBSC_masterlist')
          .select('ID, Course, yearLevel')
          .in('ID', chunk);
        if (!mErr && mlist) {
          students = students.concat(mlist);
        }
      }
    }

    const studentMap = {};
    students.forEach(s => studentMap[s.ID] = { course: s.Course || 'Unknown', yearLevel: s.yearLevel || '' });

    // Aggregate Data
    let totalEventAttendees = 0;
    const sortedEvents = [];
    events.forEach(e => {
      const slot = eventAttendees[e.id];
      const count = slot ? (slot instanceof Set ? slot.size : (slot.size ?? 0)) : 0;
      totalEventAttendees += count;
      if (count > 0) {
        sortedEvents.push([e.name, count]);
      }
    });

    sortedEvents.sort((a, b) => b[1] - a[1]);
    setText('kv-attendance', totalEventAttendees);

    if (elPh) elPh.classList.add('hidden');

    const topN = sortedEvents.slice(0, 10);
    makeChart('attendanceEventChart', {
      type: 'bar',
      data: {
        labels: topN.map(e => e[0]),
        datasets: [{
          label: 'Attendees',
          data:  topN.map(e => e[1]),
          backgroundColor: PALETTE.purple,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });

    // By course (based on overall unique attendees)
    const byCourse = {};
    const byYear = { '1st': 0, '2nd': 0, '3rd': 0, '4th': 0 };

    allUniqueAttendees.forEach(sid => {
      const stu = studentMap[sid] || { course: 'Unknown', yearLevel: '' };
      const courseStr = stu.course;
      const uCourse = courseStr.toUpperCase();
      
      let cat = 'UNKNOWN';
      if (uCourse.includes('INFORMATION TECHNOLOGY')) cat = 'BSIT';
      else if (uCourse.includes('BUSINESS ADMINISTRATION')) cat = 'BSBA';
      else if (uCourse.includes('EARLY CHILDHOOD')) cat = 'BECED';
      else if (uCourse.includes('SECONDARY')) cat = 'BSED';
      else if (uCourse.includes('ELEMENTARY')) cat = 'BEED';
      else if (uCourse.includes('TEACHER EDUCATION')) cat = 'BSTE';
      else if (uCourse.includes('TOURISM')) cat = 'BST';
      else {
        // Fallback: extract initials, ignoring minor words like OF, IN
        const words = uCourse.split(/\s+/).filter(w => !['OF', 'IN', 'THE', 'AND'].includes(w));
        const initials = words.map(w => w.charAt(0)).join('');
        cat = initials.length >= 2 ? initials.substring(0, 4) : courseStr.split(' ')[0];
      }
      
      byCourse[cat] = (byCourse[cat] || 0) + 1;
      
      // Year Aggregation
      const yr = String(stu.yearLevel || courseStr).toLowerCase();
      if (yr.includes('1') || yr.includes('first'))      byYear['1st']++;
      else if (yr.includes('2') || yr.includes('second')) byYear['2nd']++;
      else if (yr.includes('3') || yr.includes('third')) byYear['3rd']++;
      else if (yr.includes('4') || yr.includes('fourth')) byYear['4th']++;
    });

    // Limit to top 8 courses
    const sortedCourses = Object.entries(byCourse).sort((a, b) => b[1] - a[1]).slice(0, 8);
    makeChart('attendanceCourseChart', {
      type: 'doughnut',
      data: {
        labels: sortedCourses.length ? sortedCourses.map(c => c[0]) : ['No data'],
        datasets: [{
          data: sortedCourses.length ? sortedCourses.map(c => c[1]) : [1],
          backgroundColor: sortedCourses.length ? PALETTE_LIST : ['rgba(255,255,255,0.05)'],
          borderWidth: sortedCourses.length ? 2 : 0,
          hoverOffset: sortedCourses.length ? 6 : 0,
        }]
      },
      options: {
        cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }
      }
    });

    makeChart('attendanceYearChart', {
      type: 'bar',
      data: {
        labels: Object.keys(byYear),
        datasets: [{
          label: 'Students',
          data:  Object.values(byYear),
          backgroundColor: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.gold],
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
        }
      }
    });

    renderEmptyTopEvents(sortedEvents.slice(0, 5));

    // Cache the rendered payload for instant next load
    cacheWrite(CACHE_KEYS.attendance, {
      totalEventAttendees,
      sortedEvents,
      byCourse,
      byYear,
    });

  } catch (err) {
    console.error('[Analytics] Supabase attendance error:', err?.message ?? err, err?.stack);
    if (elPh) elPh.classList.remove('hidden');
    setText('kv-attendance', '—');
    renderEmptyChart('attendanceEventChart',  'bar');
    renderEmptyChart('attendanceCourseChart', 'doughnut');
    renderEmptyChart('attendanceYearChart',   'bar');
    renderEmptyTopEvents([]);
  }
}

function renderAttendanceFromCache({ totalEventAttendees, sortedEvents, byCourse, byYear }) {
  const elPh = document.getElementById('attendance-placeholder');
  if (elPh) elPh.classList.add('hidden');
  setText('kv-attendance', totalEventAttendees);

  const topN = sortedEvents.slice(0, 10);
  makeChart('attendanceEventChart', {
    type: 'bar',
    data: {
      labels: topN.map(e => e[0]),
      datasets: [{ label: 'Attendees', data: topN.map(e => e[1]),
        backgroundColor: PALETTE.purple, borderRadius: 6, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  const sortedCourses = Object.entries(byCourse).sort((a, b) => b[1] - a[1]).slice(0, 8);
  makeChart('attendanceCourseChart', {
    type: 'doughnut',
    data: {
      labels: sortedCourses.length ? sortedCourses.map(c => c[0]) : ['No data'],
      datasets: [{ data: sortedCourses.length ? sortedCourses.map(c => c[1]) : [1],
        backgroundColor: sortedCourses.length ? PALETTE_LIST : ['rgba(255,255,255,0.05)'],
        borderWidth: sortedCourses.length ? 2 : 0, hoverOffset: sortedCourses.length ? 6 : 0 }]
    },
    options: { cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  makeChart('attendanceYearChart', {
    type: 'bar',
    data: {
      labels: Object.keys(byYear),
      datasets: [{ label: 'Students', data: Object.values(byYear),
        backgroundColor: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.gold],
        borderRadius: 6, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
      }
    }
  });

  renderEmptyTopEvents(sortedEvents.slice(0, 5));
}

function renderEmptyTopEvents(rows) {
  const body = document.getElementById('top-events-body');
  if (!body) return;

  if (!rows || !rows.length) {
    body.innerHTML = '<div class="an-loading-row">No event data yet.</div>';
    return;
  }

  body.innerHTML = rows.map(([name, count], i) => `
    <div class="an-kpi-list-row">
      <span class="an-kpi-list-rank">#${i + 1}</span>
      <span class="an-kpi-list-name" title="${escHtml(name)}">${escHtml(name)}</span>
      <span class="an-kpi-list-val">${count}</span>
    </div>`).join('');
}

// ─── Manual Services ─────────────────────────────────
const DEFAULT_MANUAL = [
  { id: 'guidance',    label: 'Guidance Consultations', icon: 'bx-user-check', value: 0, color: PALETTE.blue },
  { id: 'scholarship', label: 'Scholarship Inquiries',  icon: 'bx-medal',      value: 0, color: PALETTE.gold },
  { id: 'clinic',      label: 'Clinic / Medical Visits',icon: 'bx-plus-medical',value: 0, color: PALETTE.pink },
  { id: 'discipline',  label: 'Discipline Cases',        icon: 'bx-shield-x',  value: 0, color: PALETTE.red  },
];

function renderManualServices() {
  const all = mergeManual(DEFAULT_MANUAL, manualServices);
  const grid = document.getElementById('manualServicesGrid');
  if (!grid) return;

  grid.innerHTML = all.map(s => `
    <div class="an-manual-card" id="mc-${s.id}">
      <div class="an-manual-card-title">
        <span><i class='bx ${s.icon}' style="color:${s.color};margin-right:6px;"></i>${escHtml(s.label)}</span>
        ${!DEFAULT_MANUAL.find(d => d.id === s.id)
          ? `<button onclick="deleteManualService('${s.id}')" title="Remove"><i class='bx bx-trash'></i></button>` : ''}
      </div>
      <div class="an-manual-value" id="mv-${s.id}">${s.value}</div>
      <div class="an-manual-label">Recorded this semester</div>
      <div class="an-manual-input-row">
        <input type="number" id="mi-${s.id}" min="0" value="${s.value}" placeholder="Enter count">
        <button onclick="updateManualValue('${s.id}')">Save</button>
      </div>
    </div>`).join('');
}

function mergeManual(defaults, saved) {
  const map = {};
  saved.forEach(s => { map[s.id] = s; });
  const result = defaults.map(d => ({ ...d, ...(map[d.id] || {}) }));
  saved.filter(s => !defaults.find(d => d.id === s.id)).forEach(s => result.push(s));
  return result;
}

function updateManualValue(id) {
  const inp = document.getElementById('mi-' + id);
  if (!inp) return;
  const val = parseInt(inp.value) || 0;
  const all = mergeManual(DEFAULT_MANUAL, manualServices);
  const item = all.find(s => s.id === id);
  if (item) { item.value = val; }

  // Persist only custom + overridden defaults
  const toSave = all.map(s => ({ id: s.id, label: s.label, icon: s.icon, value: s.value, color: s.color }));
  localStorage.setItem('sas_manual_services', JSON.stringify(toSave));
  manualServices = toSave;

  const disp = document.getElementById('mv-' + id);
  if (disp) { disp.textContent = val; disp.style.animation = 'none'; void disp.offsetWidth; }
}

function addManualService() {
  const name = prompt('Name for this service:');
  if (!name || !name.trim()) return;
  const id = 'custom_' + Date.now();
  manualServices.push({ id, label: name.trim(), icon: 'bx-building', value: 0, color: PALETTE.cyan });
  localStorage.setItem('sas_manual_services', JSON.stringify(manualServices));
  renderManualServices();
}

function deleteManualService(id) {
  if (!confirm('Remove this service entry?')) return;
  manualServices = manualServices.filter(s => s.id !== id);
  localStorage.setItem('sas_manual_services', JSON.stringify(manualServices));
  renderManualServices();
}

// ─── SECTION: Student Dataset ────────────────────────
// Reads directly from a Google Sheet (gviz/tq) — same mechanism as client satisfaction survey.
// Column map (0-based) for the student dataset form:
//  0  Timestamp
//  1  Email Address
//  2  FIRST NAME
//  3  MIDDLE NAME
//  4  LAST NAME
//  5  COURSE
//  6  YEAR
//  7  CELLPHONE/CONTACT NUMBER
//  8  BIRTHDAY
//  9  ASSIGNED SEX AT BIRTH
// 10  CITIZENSHIP
// 11  RELIGION
// 12  PUROK NO./HOUSE NO.
// 13  BARANGGAY
// 14  CITY/MUNICIPALITY
// 15  PROVINCE
// 16  FATHER'S FULLNAME
// 17  WHICH COUNTRY DOES YOUR FATHER WORK?
// 18  FATHER'S OCCUPATION
// 19  Father's Estimated Monthly Income
// 20  Is your father deprived of liberty?
// 21  Is your father a rebel returnee?
// 22  Is your father a PWD?
// 23  MOTHER'S FULLNAME
// 24  WHICH COUNTRY DOES YOUR MOTHER WORK?
// 25  MOTHER'S OCCUPATION
// 26  Mother's Estimated Monthly Income
// 27  Is your mother deprived of liberty?
// 28  Is your mother a rebel returnee?
// 29  Is your mother a PWD?
// 30  Were you raised by a solo parent?
// 31  Number of Siblings
// 32  Are you a beneficiary of 4Ps?
// 33  Do you identify as a member of an IP?
// 34  Which Indigenous group/Tribe?
// 35  How would you identify your Indigenous heritage?
// 36  Did any parents/siblings attend college?
// 37  Do you identify as a person with special needs?
// 38  Type of special need/s
// 39  Was your condition clinically diagnosed?
// 40  Do you identify as a person with a disability?
// 41  What type(s) of disability?
// 42  Do you have a government-issued PWD ID?
// 43  PWD ID Number
// 44  What type of residence are you currently living in?
// 45–48  Residence address fields
// 49  Daily mode of transportation
// 50  How long is your one-way commute?
// 51  Total daily fare cost
// 52  Monthly rent
// 53–57  Rented place address + travel info
// 58–65  Staying elsewhere address + travel info
// 66–70  Own vehicle + address
// 71  Are you currently employed while studying?
// 72  Type of work
// 73  Company/business name
// 74  Work description
// 75  Hours per day working
// 76  Do you have regular access to the internet at home?
// 77  Type of internet connection
// 78  Monthly cost for Home Wifi
// 79  Monthly cost for mobile data
// 80  How reliable is your internet connection?
// 81  Device(s) used for online learning
// 82  Do you have access to your device anytime?
// 83  Are you able to regularly join online classes?
// 84  Which mode of learning do you prefer?
// 85  Current civil status
// 86  Do you have any children or dependents?
// 87  Which of the following applies to you?
// 88  How many children or dependents?
// 89  Birthdays of children
// 90  Are you the primary caregiver?
// 91  Are you currently receiving any form of scholarship?
// 92  What type of scholarship?
// 93  What kind of support does your scholarship provide?
// 94  Is the scholarship sufficient?
// 95  Do you currently experience financial difficulties?
// 96  What kind of support would be most helpful?

const SD_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
let sdPollTimer = null;
let sdLastRowCount = 0;

// ─── Normalization helpers ────────────────────────────

// Year level: collapses ALL free-text variants into canonical labels
// Handles: "1st Year", "1ST YEAR", "1st year", "First Year", "1", "BSIT 2", "Year 3", etc.
function sdNormalizeYear(raw) {
  if (!raw) return 'Not stated';
  // Normalize to lowercase, collapse separators
  const s = String(raw).trim().toLowerCase()
    .replace(/[.\-_\/]/g, ' ')
    .replace(/\s+/g, ' ');

  // Direct ordinal matches (covers "1st year", "1st Year", "1ST YEAR", "1st")
  if (/\b1st\b/.test(s) || /\bfirst\b/.test(s) || /\byear\s*1\b/.test(s) || /^1$/.test(s)) return '1st Year';
  if (/\b2nd\b/.test(s) || /\bsecond\b/.test(s) || /\byear\s*2\b/.test(s) || /^2$/.test(s)) return '2nd Year';
  if (/\b3rd\b/.test(s) || /\bthird\b/.test(s)  || /\byear\s*3\b/.test(s) || /^3$/.test(s)) return '3rd Year';
  if (/\b4th\b/.test(s) || /\bfourth\b/.test(s) || /\byear\s*4\b/.test(s) || /^4$/.test(s)) return '4th Year';
  if (/\b5th\b/.test(s) || /\bfifth\b/.test(s)  || /\byear\s*5\b/.test(s) || /^5$/.test(s)) return '5th Year';

  // Digit anywhere in string (e.g. "BSIT 2", "BSN3", "IT-1")
  const anyDigit = s.match(/\b([1-5])\b/);
  if (anyDigit) {
    return ['1st Year','2nd Year','3rd Year','4th Year','5th Year'][parseInt(anyDigit[1]) - 1];
  }

  return 'Not stated';
}

// Course: collapses common NBSC program name variants into canonical abbreviations
function sdNormalizeCourse(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toUpperCase().replace(/[.\-_]/g, ' ').replace(/\s+/g, ' ');

  // Strip leading year indicators like "1ST YEAR BSIT" → "BSIT"
  const stripped = s.replace(/^\d+(ST|ND|RD|TH)?\s*(YEAR\s*)?/, '').trim();

  const map = [
    [/\bBSIT\b|INFORMATION TECHNOLOGY/,          'BSIT'],
    [/\bBSBA\b|BUSINESS ADMINISTRATION/,          'BSBA'],
    [/\bBECED\b|EARLY CHILDHOOD/,                 'BECED'],
    [/\bBSED\b|SECONDARY EDUCATION/,              'BSED'],
    [/\bBEED\b|ELEMENTARY EDUCATION/,             'BEED'],
    [/\bBSTE\b|TECHNOLOGY EDUCATION/,             'BSTE'],
    [/\bBST\b|TOURISM/,                           'BST'],
    [/\bBSN\b|NURSING/,                           'BSN'],
    [/\bBSCRIM\b|CRIMINOLOGY/,                    'BSCrim'],
    [/\bBSA\b|ACCOUNTANCY/,                       'BSA'],
    [/\bBSHM\b|HOSPITALITY/,                      'BSHM'],
    [/\bBSAGRI\b|AGRICULTURE/,                    'BSAgri'],
    [/\bBSCS\b|COMPUTER SCIENCE/,                 'BSCS'],
    [/\bBSPSYCH\b|PSYCHOLOGY/,                    'BSPsych'],
    [/\bBSEE\b|ELECTRICAL ENGINEERING/,           'BSEE'],
    [/\bBSCE\b|CIVIL ENGINEERING/,                'BSCE'],
    [/\bBSME\b|MECHANICAL ENGINEERING/,           'BSME'],
  ];

  for (const [pattern, label] of map) {
    if (pattern.test(stripped) || pattern.test(s)) return label;
  }

  // Fallback: extract initials from remaining words (skip filler words)
  const words = stripped.split(' ').filter(w => w.length > 1 && !['OF','IN','THE','AND','FOR','WITH'].includes(w));
  if (words.length >= 2) return words.map(w => w[0]).join('').substring(0, 5);
  return stripped.split(' ')[0] || 'Not stated';
}

// Sex: normalize casing/spacing variants
function sdNormalizeSex(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s.startsWith('m') || s === 'lalaki') return 'Male';
  if (s.startsWith('f') || s === 'babae')  return 'Female';
  if (s.includes('intersex'))              return 'Intersex';
  return raw.trim() || 'Not stated';
}

// Yes/No: handles "Yes", "YES", "yes", "No", "NO", "no", blank
function sdNormalizeYesNo(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s === 'yes' || s === 'y' || s === '1' || s === 'true') return 'Yes';
  if (s === 'no'  || s === 'n' || s === '0' || s === 'false') return 'No';
  if (s.startsWith('yes')) return 'Yes'; // "Yes, ..." (solo parent field)
  return 'Not stated'; // unanswered / ambiguous
}

// Province of Origin
function sdNormalizeProvince(raw) {
  if (!raw) return 'Not stated';
  let s = String(raw).trim().toLowerCase();
  if (s === '' || s === 'n/a' || s === 'none') return 'Not stated';
  
  // Fuzzy deduction / Typo fixing
  const bukidnonTowns = ['manolo', 'malaybalay', 'valencia', 'maramag', 'quezon', 'kibawe', 'don carlos', 'kitaotao', 'dangcagan', 'kadingilan', 'kalilangan', 'pangantucan', 'san fernando', 'cabanglasan', 'imapasug', 'sumilao', 'baungon', 'talakag', 'lantapan', 'libona', 'malitbog', 'damulog'];
  if (s.includes('bukidon') || s.includes('bukidn') || s === 'buk' || bukidnonTowns.some(t => s.includes(t))) s = 'bukidnon';
  if (s.includes('misamis') && s.includes('or')) s = 'misamis oriental';
  if (s.includes('cdo') || s.includes('cagayan')) s = 'misamis oriental';
  
  // Title case
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
}

// Scholarship Type Deduction
function sdNormalizeScholarshipType(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s === '' || s === 'n/a' || s === 'none') return 'Not stated';
  if (s.includes('tes') || s.includes('tertiary')) return 'TES (Tertiary Education Subsidy)';
  if (s.includes('ched') || s.includes('tdp') || s.includes('stufap')) return 'CHED Scholarship';
  if (s.includes('school') || s.includes('academic') || s.includes('nbsc')) return 'School-based Scholarship';
  if (s.includes('dost')) return 'DOST Scholarship';
  if (s.includes('lgu') || s.includes('mayor') || s.includes('provincial')) return 'LGU/Provincial Scholarship';
  
  // Provide capitalized fallback for everything else
  return s.charAt(0).toUpperCase() + s.substring(1);
}

// Income bracket helper
function sdIncomeBracket(raw) {
  if (!raw) return 'Not stated';
  // Strip currency symbols, commas, spaces, trailing .00
  const cleaned = String(raw).replace(/[₱$,\s]/g, '').replace(/\.0+$/, '');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return 'Not stated';
  if (n < 5000)  return 'Below ₱5,000';
  if (n < 10000) return '₱5,000–9,999';
  if (n < 15000) return '₱10,000–14,999';
  if (n < 20000) return '₱15,000–19,999';
  if (n < 30000) return '₱20,000–29,999';
  if (n < 50000) return '₱30,000–49,999';
  return '₱50,000+';
}

// Civil status: normalize variants
function sdNormalizeCivilStatus(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('single'))   return 'Single';
  if (s.includes('married'))  return 'Married';
  if (s.includes('widow') || s.includes('widower')) return 'Widowed';
  if (s.includes('separat') || s.includes('annul')) return 'Separated/Annulled';
  if (s.includes('live') || s.includes('cohabit') || s.includes('partner')) return 'Live-in';
  return raw.trim() || 'Not stated';
}

// Residence type: normalize variants
function sdNormalizeResidence(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('own') || s.includes('family') || s.includes('parents')) return 'Family-owned';
  if (s.includes('rent'))   return 'Renting';
  if (s.includes('dorm') || s.includes('boarding') || s.includes('school')) return 'Dormitory/Boarding';
  if (s.includes('relative') || s.includes('uncle') || s.includes('aunt') || s.includes('grandp')) return 'Staying with Relatives';
  if (s.includes('free') || s.includes('provided')) return 'Free/Provided';
  return raw.trim() || 'Not stated';
}

// Commute duration: normalize variants
function sdNormalizeCommute(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  if (s.includes('less than 15') || s.includes('< 15') || s.includes('below 15')) return 'Less than 15 min';
  if (s.includes('15') && (s.includes('30') || s.includes('to 30'))) return '15–30 min';
  if ((s.includes('30') || s.includes('31')) && (s.includes('60') || s.includes('1 hour') || s.includes('to 60'))) return '30–60 min';
  if (s.includes('1') && s.includes('2') && s.includes('hour')) return '1–2 hours';
  if (s.includes('more than 2') || s.includes('over 2') || s.includes('2 hours above') || s.includes('> 2')) return 'More than 2 hours';
  if (/^\d+\s*min/.test(s)) {
    const mins = parseInt(s);
    if (mins < 15)  return 'Less than 15 min';
    if (mins < 30)  return '15–30 min';
    if (mins < 60)  return '30–60 min';
    if (mins < 120) return '1–2 hours';
    return 'More than 2 hours';
  }
  return raw.trim() || 'Not stated';
}

// Learning mode: normalize variants
function sdNormalizeLearningMode(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('face') || s.includes('in-person') || s.includes('onsite') || s.includes('on-site') || s.includes('presential')) return 'Face-to-face';
  if (s.includes('online') && s.includes('face')) return 'Blended/Hybrid';
  if (s.includes('blend') || s.includes('hybrid') || s.includes('modular') || s.includes('flexible')) return 'Blended/Hybrid';
  if (s.includes('online') || s.includes('virtual') || s.includes('remote')) return 'Online';
  return raw.trim() || 'Not stated';
}

// Internet access: normalize yes/no/sometimes variants
// Also handles reliability-style answers that may appear in this column
function sdNormalizeInternet(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s === 'yes' || s === 'y') return 'Yes';
  if (s === 'no'  || s === 'n') return 'No';
  if (s.startsWith('yes')) return 'Yes';
  if (s.startsWith('no'))  return 'No';
  if (s.includes('sometimes') || s.includes('limited') || s.includes('intermittent')) return 'Sometimes';
  return 'Not stated'; // don't pass through garbage values
}

// Age bracket: computed from birthday string (col 8)
// Handles: "MM/DD/YYYY", "YYYY-MM-DD", "Month DD, YYYY", etc.
function sdComputeAgeBracket(raw) {
  if (!raw || String(raw).trim().toLowerCase() === 'n/a') return 'Not stated';
  let d = null;

  // Try ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    d = new Date(raw);
  }
  // Try M/D/YYYY or MM/DD/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const parts = raw.split('/');
    d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  // Try "Month DD, YYYY" or "DD Month YYYY"
  else {
    d = new Date(raw);
  }

  if (!d || isNaN(d.getTime())) return 'Invalid/Unrealistic Date';

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;

  if (age < 15 || age > 80) return 'Invalid/Unrealistic Date'; // likely bad data (e.g. 2026)
  if (age < 18) return 'Under 18';
  if (age < 21) return '18–20';
  if (age < 25) return '21–24';
  if (age < 30) return '25–29';
  if (age < 35) return '30–34';
  return '35 and above';
}

// Religion: normalize to major categories
function sdNormalizeReligion(raw) {
  if (!raw) return 'Not stated';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('catholic') || s.includes('roman')) return 'Roman Catholic';
  if (s.includes('iglesia') || s.includes('inc')) return 'Iglesia ni Cristo';
  if (s.includes('protestant') || s.includes('baptist') || s.includes('methodist') ||
      s.includes('adventist') || s.includes('evangelical') || s.includes('pentecostal') ||
      s.includes('born again') || s.includes('christian')) return 'Protestant/Christian';
  if (s.includes('islam') || s.includes('muslim')) return 'Islam';
  if (s.includes('aglipayan') || s.includes('philippine independent')) return 'Aglipayan';
  if (s.includes('jehovah') || s.includes('witness')) return "Jehovah's Witness";
  if (s.includes('buddhis')) return 'Buddhism';
  if (s.includes('none') || s.includes('atheist') || s.includes('agnostic') || s.includes('no religion')) return 'None/Atheist';
  if (s.length < 2) return 'Not stated';
  return 'Other';
}

function parseStudentDatasetRows(rows) {
  const data = rows.slice(1).filter(r => r.length > 5 && r.slice(2).some(c => c && c.trim()));

  const result = {
    total: data.length,
    byCourse: {},
    byYear: {},
    bySex: {},
    byAge: {},
    byCivilStatus: {},
    byResidence: {},
    byIncome: {},
    byCommute: {},
    byLearningMode: {},
    byInternet: {},
    byScholarship: { Yes: 0, No: 0 },
    byEmployed: { Yes: 0, No: 0 },
    byFinancialDifficulty: { Yes: 0, No: 0 },
    by4ps: { Yes: 0, No: 0 },
    byIP: { Yes: 0, No: 0 },
    byPWD: { Yes: 0, No: 0 },
    bySoloParent: { Yes: 0, No: 0 },
    byFirstGenCollege: { Yes: 0, No: 0 },
    byProvince: {},
    byReligion: {},
    byScholarshipType: {},
    supportNeeded: {},
  };

  data.forEach(row => {
    const get = (i) => (row[i] || '').trim();

    // ── Core demographics ──────────────────────────────────────────────────
    // Course (col 5) — normalized
    const cat = sdNormalizeCourse(get(5));
    result.byCourse[cat] = (result.byCourse[cat] || 0) + 1;

    // Year level (col 6) — normalized
    const yr = sdNormalizeYear(get(6));
    result.byYear[yr] = (result.byYear[yr] || 0) + 1;

    // Sex (col 9) — normalized
    const sex = sdNormalizeSex(get(9));
    result.bySex[sex] = (result.bySex[sex] || 0) + 1;

    // Age (col 8)
    const ageBracket = sdComputeAgeBracket(get(8));
    result.byAge[ageBracket] = (result.byAge[ageBracket] || 0) + 1;

    // Province of origin (col 15)
    const province = sdNormalizeProvince(get(15));
    if (province.toLowerCase() !== 'bukinon') {
      result.byProvince[province] = (result.byProvince[province] || 0) + 1;
    }

    // Religion (col 11)
    const religion = get(11);
    if (religion && religion.length > 1) {
      const rNorm = sdNormalizeReligion(religion);
      result.byReligion[rNorm] = (result.byReligion[rNorm] || 0) + 1;
    }

    // ── Family background ──────────────────────────────────────────────────
    // Solo parent (col 30)
    const solo = sdNormalizeYesNo(get(30));
    if (solo === 'Yes') result.bySoloParent.Yes++;
    else if (solo === 'No') result.bySoloParent.No++;

    // 4Ps beneficiary (col 32)
    const fps = sdNormalizeYesNo(get(32));
    if (fps === 'Yes') result.by4ps.Yes++;
    else if (fps === 'No') result.by4ps.No++;

    // IP member (col 33)
    const ip = sdNormalizeYesNo(get(33));
    if (ip === 'Yes') result.byIP.Yes++;
    else if (ip === 'No') result.byIP.No++;

    // First-generation college student (col 36)
    // "Did any parents/siblings attend college?" — No = first-gen
    const parentCollege = sdNormalizeYesNo(get(36));
    if (parentCollege === 'No') result.byFirstGenCollege.Yes++;   // No parent attended = first-gen
    else if (parentCollege === 'Yes') result.byFirstGenCollege.No++;

    // PWD / special needs (col 40)
    const pwd = sdNormalizeYesNo(get(40));
    if (pwd === 'Yes') result.byPWD.Yes++;
    else if (pwd === 'No') result.byPWD.No++;

    // ── Socioeconomic ──────────────────────────────────────────────────────
    // Residence type (col 44)
    const res = sdNormalizeResidence(get(44));
    result.byResidence[res] = (result.byResidence[res] || 0) + 1;

    // Combined family income (father col 19 + mother col 26)
    const fIncome = parseFloat(String(get(19)).replace(/[^0-9.]/g, '')) || 0;
    const mIncome = parseFloat(String(get(26)).replace(/[^0-9.]/g, '')) || 0;
    const combined = fIncome + mIncome;
    const bracket = combined > 0 ? sdIncomeBracket(String(combined)) : sdIncomeBracket(get(19) || get(26));
    result.byIncome[bracket] = (result.byIncome[bracket] || 0) + 1;

    // Commute duration (col 51)
    const commute = sdNormalizeCommute(get(51));
    if (commute.toLowerCase() !== 'not stated') {
      result.byCommute[commute] = (result.byCommute[commute] || 0) + 1;
    }

    // Employed while studying (col 75)
    const emp = sdNormalizeYesNo(get(75));
    if (emp === 'Yes') result.byEmployed.Yes++;
    else if (emp === 'No') result.byEmployed.No++;

    // Internet reliability (col 80)
    const inet = sdNormalizeInternet(get(80));
    result.byInternet[inet] = (result.byInternet[inet] || 0) + 1;

    // Learning mode preference (col 88)
    const learn = sdNormalizeLearningMode(get(88));
    result.byLearningMode[learn] = (result.byLearningMode[learn] || 0) + 1;

    // Civil status (col 89)
    const civil = sdNormalizeCivilStatus(get(89));
    result.byCivilStatus[civil] = (result.byCivilStatus[civil] || 0) + 1;

    // Scholarship (col 95)
    const schol = sdNormalizeYesNo(get(95));
    if (schol === 'Yes') result.byScholarship.Yes++;
    else if (schol === 'No') result.byScholarship.No++;

    // Scholarship Type (col 96)
    if (schol === 'Yes') {
      const sType = sdNormalizeScholarshipType(get(96));
      result.byScholarshipType[sType] = (result.byScholarshipType[sType] || 0) + 1;
    }

    // Financial difficulty (col 99)
    const fin = sdNormalizeYesNo(get(99));
    if (fin === 'Yes') result.byFinancialDifficulty.Yes++;
    else if (fin === 'No') result.byFinancialDifficulty.No++;

    // Support needed (col 100)
    let support = get(100);
    if (support && support.includes('Scholarship opportunities, I truly need financial support')) {
      support = support.replace(/Scholarship opportunities, I truly need financial support[\s\S]*?program\./i, '');
    }
    if (support && support.trim().toLowerCase() !== 'n/a' && support.trim().toLowerCase() !== 'none' && support.trim() !== '') {
      support.split(/[,;]/).forEach(s => {
        const t = s.trim();
        if (t.length < 3) return;
        const tl = t.toLowerCase();
        let label = t;
        if (tl.includes('financial') || tl.includes('monetary') || tl.includes('allowance')) label = 'Financial Assistance';
        else if (tl.includes('scholar') || tl.includes('stipend') || tl.includes('grant')) label = 'Scholarship/Stipend';
        else if (tl.includes('food') || tl.includes('meal') || tl.includes('pantry') || tl.includes('nutrition')) label = 'Food Assistance';
        else if (tl.includes('transport') || tl.includes('fare') || tl.includes('commut')) label = 'Transportation Support';
        else if (tl.includes('mental') || tl.includes('counsel') || tl.includes('psycho')) label = 'Mental Health/Counseling';
        else if (tl.includes('medical') || tl.includes('health') || tl.includes('clinic')) label = 'Medical/Health Support';
        else if (tl.includes('housing') || tl.includes('dorm') || tl.includes('boarding') || tl.includes('shelter')) label = 'Housing/Accommodation';
        else if (tl.includes('gadget') || tl.includes('device') || tl.includes('laptop') || tl.includes('computer')) label = 'Gadget/Device Access';
        else if (tl.includes('internet') || tl.includes('wifi') || tl.includes('data') || tl.includes('connect')) label = 'Internet/Connectivity';
        else if (tl.includes('tuition') || tl.includes('fee') || tl.includes('enroll')) label = 'Tuition/School Fees';
        else if (tl.includes('book') || tl.includes('module') || tl.includes('material') || tl.includes('supply')) label = 'Learning Materials';
        else if (tl.includes('job') || tl.includes('employ') || tl.includes('work') || tl.includes('livelihood')) label = 'Employment/Livelihood';
        result.supportNeeded[label] = (result.supportNeeded[label] || 0) + 1;
      });
    } else {
      result.supportNeeded['Not stated'] = (result.supportNeeded['Not stated'] || 0) + 1;
    }
  });

  return result;
}

function renderStudentDatasetCharts(parsed) {
  if (!parsed || parsed.total === 0) {
    setSDStatus('warn', 'Sheet connected but no data rows found');
    return;
  }

  setSDStatus('ok', `${parsed.total} respondents · auto-refreshes every 5 min`);

  // ── KPI strip ────────────────────────────────────────────────────────────
  setText('sd-total', parsed.total);
  setText('sd-4ps', parsed.by4ps.Yes);
  setText('sd-solo', parsed.bySoloParent.Yes);
  setText('sd-scholarship', parsed.byScholarship.Yes);
  setText('sd-pwd', parsed.byPWD.Yes);
  setText('sd-ip', parsed.byIP.Yes);
  setText('sd-firstgen', parsed.byFirstGenCollege.Yes);
  setText('sd-employed', parsed.byEmployed.Yes);
  setText('sd-updated', new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }));

  // Global KPI card
  window.sdTotalRespondents = parsed.total;
  setText('kv-sd-total', parsed.total);
  setText('kv-sd-sub', `${parsed.by4ps.Yes} on 4Ps · ${parsed.byPWD.Yes} PWD · ${parsed.byIP.Yes} IP`);

  // ── Course (horizontal bar, top 10) ──────────────────────────────────────
  const courseEntries = Object.entries(parsed.byCourse).sort((a,b) => b[1]-a[1]).slice(0,10);
  makeChart('sdCourseChart', {
    type: 'bar',
    data: {
      labels: courseEntries.map(e => e[0]),
      datasets: [{ label: 'Students', data: courseEntries.map(e => e[1]),
        backgroundColor: PALETTE_LIST, borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  // ── Sex at birth (doughnut) ───────────────────────────────────────────────
  const sexEntries = Object.entries(parsed.bySex).sort((a,b) => b[1] - a[1]);
  const sexKeys = sexEntries.map(e => e[0]);
  makeChart('sdSexChart', {
    type: 'doughnut',
    data: {
      labels: sexKeys.length ? sexKeys : ['No data'],
      datasets: [{ data: sexKeys.length ? sexEntries.map(e => e[1]) : [1],
        backgroundColor: sexKeys.length ? [PALETTE.blue, PALETTE.pink, PALETTE.purple] : ['rgba(255,255,255,0.05)'],
        borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Age brackets (bar) — CHED reporting ──────────────────────────────────
  const ageOrder = ['Under 18', '18–20', '21–24', '25–29', '30–34', '35 and above'];
  const ageKeys = ageOrder.filter(k => parsed.byAge && parsed.byAge[k]);
  if (ageKeys.length > 0) {
    makeChart('sdAgeChart', {
      type: 'bar',
      data: {
        labels: ageKeys,
        datasets: [{ label: 'Students', data: ageKeys.map(k => parsed.byAge[k] || 0),
          backgroundColor: [PALETTE.blue, PALETTE.indigo, PALETTE.purple, PALETTE.pink, PALETTE.red, PALETTE.gold],
          borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } }
        }
      }
    });
  }

  // ── Province of origin (horizontal bar, top 10) — geographic distribution ─
  const provEntries = Object.entries(parsed.byProvince || {}).sort((a,b) => b[1]-a[1]).slice(0,10);
  if (provEntries.length > 0) {
    makeChart('sdProvinceChart', {
      type: 'bar',
      data: {
        labels: provEntries.map(e => e[0]),
        datasets: [{ label: 'Students', data: provEntries.map(e => e[1]),
          backgroundColor: PALETTE.cyan, borderRadius: 4, borderSkipped: false, maxBarThickness: 32 }]
      },
      options: {
        indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            type: 'logarithmic',
            grid: { color: 'rgba(255,255,255,0.04)' }, 
            ticks: { 
              autoSkip: true,
              maxTicksLimit: 8,
              callback: function(value) {
                return value === 1 || value === 10 || value === 100 || value === 1000 || value === 10000 ? value : '';
              }
            } 
          },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  // ── Religion (doughnut) ───────────────────────────────────────────────────
  const relEntries = Object.entries(parsed.byReligion || {}).filter(e => e[0] !== 'Not stated').sort((a,b) => b[1] - a[1]);
  if (relEntries.length > 0) {
    makeChart('sdReligionChart', {
      type: 'doughnut',
      data: {
        labels: relEntries.map(e => e[0]),
        datasets: [{ data: relEntries.map(e => e[1]),
          backgroundColor: PALETTE_LIST, borderWidth: 2, hoverOffset: 6 }]
      },
      options: { cutout: '55%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });
  }

  // ── First-generation college students (doughnut) ──────────────────────────
  // First-generation college chart removed per request

  // ── Year level (bar)
  const yearOrder = ['1st Year','2nd Year','3rd Year','4th Year','5th Year'];
  const yearKeys = [...new Set([...yearOrder, ...Object.keys(parsed.byYear)])].filter(k => parsed.byYear[k]);
  makeChart('sdYearChart', {
    type: 'bar',
    data: {
      labels: yearKeys.length ? yearKeys : ['No data'],
      datasets: [{ label: 'Students', data: yearKeys.map(k => parsed.byYear[k] || 0),
        backgroundColor: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.gold, PALETTE.pink],
        borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: { plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } } } }
  });

  // ── Income brackets (bar)
  const incomeOrder = ['Below ₱5,000','₱5,000–9,999','₱10,000–14,999','₱15,000–19,999','₱20,000–29,999','₱30,000–49,999','₱50,000+','Not stated'];
  const incomeKeys = incomeOrder.filter(k => parsed.byIncome[k]);
  makeChart('sdIncomeChart', {
    type: 'bar',
    data: {
      labels: incomeKeys.length ? incomeKeys : ['No data'],
      datasets: [{ label: 'Families', data: incomeKeys.map(k => parsed.byIncome[k] || 0),
        backgroundColor: PALETTE.green, borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: { plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } } } }
  });

  // ── Vulnerable & Special Groups (horizontal bar)
  makeChart('sdVulnerableChart', {
    type: 'bar',
    data: {
      labels: ['Employed Students', 'Solo Parent Household', '4Ps Beneficiaries', 'IP Member', 'PWD / Special Needs'],
      datasets: [{ 
        label: 'Count', 
        data: [
          parsed.byEmployed.Yes, 
          parsed.bySoloParent.Yes,
          parsed.by4ps.Yes, 
          parsed.byIP.Yes, 
          parsed.byPWD.Yes
        ],
        backgroundColor: [PALETTE.gold, PALETTE.pink, PALETTE.indigo, PALETTE.cyan, PALETTE.red],
        borderRadius: 4, borderSkipped: false, maxBarThickness: 32 
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // ── Residence type (horizontal bar)
  // Residence type chart removed per request

  // ── Civil status (doughnut)
  const civilEntries = Object.entries(parsed.byCivilStatus).sort((a,b) => b[1] - a[1]);
  const civilKeys = civilEntries.map(e => e[0]);
  makeChart('sdCivilChart', {
    type: 'doughnut',
    data: {
      labels: civilKeys.length ? civilKeys : ['No data'],
      datasets: [{ data: civilKeys.length ? civilEntries.map(e => e[1]) : [1],
        backgroundColor: civilKeys.length ? PALETTE_LIST : ['rgba(255,255,255,0.05)'],
        borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Internet access (doughnut)
  const inetEntries = Object.entries(parsed.byInternet).sort((a,b) => b[1] - a[1]);
  const inetKeys = inetEntries.map(e => e[0]);
  makeChart('sdInternetChart', {
    type: 'doughnut',
    data: {
      labels: inetKeys.length ? inetKeys : ['No data'],
      datasets: [{ data: inetKeys.length ? inetEntries.map(e => e[1]) : [1],
        backgroundColor: inetKeys.length ? [PALETTE.green, PALETTE.red, PALETTE.gold] : ['rgba(255,255,255,0.05)'],
        borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Learning mode (doughnut)
  const learnEntries = Object.entries(parsed.byLearningMode).sort((a,b) => b[1] - a[1]);
  const learnKeys = learnEntries.map(e => e[0]);
  makeChart('sdLearningChart', {
    type: 'doughnut',
    data: {
      labels: learnKeys.length ? learnKeys : ['No data'],
      datasets: [{ data: learnKeys.length ? learnEntries.map(e => e[1]) : [1],
        backgroundColor: learnKeys.length ? PALETTE_LIST : ['rgba(255,255,255,0.05)'],
        borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Commute duration (bar)
  const commuteEntries = Object.entries(parsed.byCommute).sort((a,b) => b[1]-a[1]).slice(0,8);
  makeChart('sdCommuteChart', {
    type: 'bar',
    data: {
      labels: commuteEntries.length ? commuteEntries.map(e => e[0]) : ['No data'],
      datasets: [{ label: 'Students', data: commuteEntries.length ? commuteEntries.map(e => e[1]) : [0],
        backgroundColor: PALETTE.cyan, borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // ── Scholarship (doughnut)
  makeChart('sdScholarshipChart', {
    type: 'doughnut',
    data: {
      labels: ['With Scholarship', 'No Scholarship'],
      datasets: [{ data: [parsed.byScholarship.Yes, parsed.byScholarship.No],
        backgroundColor: [PALETTE.green, '#1f2a42'], borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Scholarship Type (horizontal bar)
  const scholTypeEntries = Object.entries(parsed.byScholarshipType || {}).filter(e => e[0] !== 'Not stated').sort((a,b) => b[1]-a[1]).slice(0,8);
  if (scholTypeEntries.length > 0 && document.getElementById('sdScholarshipTypeChart')) {
    makeChart('sdScholarshipTypeChart', {
      type: 'bar',
      data: {
        labels: scholTypeEntries.map(e => e[0]),
        datasets: [{ label: 'Students', data: scholTypeEntries.map(e => e[1]),
          backgroundColor: PALETTE.gold, borderRadius: 4, borderSkipped: false, maxBarThickness: 32 }]
      },
      options: {
        indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  // ── Financial difficulty (doughnut)
  makeChart('sdFinancialChart', {
    type: 'doughnut',
    data: {
      labels: ['With Difficulty', 'No Difficulty'],
      datasets: [{ data: [parsed.byFinancialDifficulty.Yes, parsed.byFinancialDifficulty.No],
        backgroundColor: [PALETTE.red, '#1f2a42'], borderWidth: 2, hoverOffset: 6 }]
    },
    options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
  });

  // ── Support needed (horizontal bar, top 8)
  const supportEntries = Object.entries(parsed.supportNeeded).sort((a,b) => b[1]-a[1]).slice(0,8);
  makeChart('sdSupportChart', {
    type: 'bar',
    data: {
      labels: supportEntries.length ? supportEntries.map(e => e[0]) : ['No data'],
      datasets: [{ label: 'Respondents', data: supportEntries.length ? supportEntries.map(e => e[1]) : [0],
        backgroundColor: PALETTE.purple, borderRadius: 4, borderSkipped: false, maxBarThickness: 32 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { left: 10, right: 10, bottom: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // Show charts area
  document.getElementById('sd-charts-area')?.classList.remove('hidden');
  document.getElementById('sd-placeholder')?.classList.add('hidden');
}

function setSDStatus(state, msg) {
  const dot  = document.getElementById('sdStatusDot');
  const text = document.getElementById('sdStatusText');
  if (dot)  dot.className  = 'an-survey-status-dot an-survey-dot-' + state;
  if (text) text.textContent = msg;
}

async function loadStudentDatasetData() {
  let sheetId = localStorage.getItem('sas_student_dataset_sheet_id');

  if (!sheetId) {
    const defaultData = await safeFetch(BACKEND_URL + '?action=getDefaultStudentDatasetSheet');
    if (defaultData && defaultData.success && defaultData.sheetId) {
      sheetId = defaultData.sheetId;
    }
  }

  const input = document.getElementById('sdSheetId');
  if (input && sheetId && !input.value) input.value = sheetId;

  const refreshBtn    = document.getElementById('sdRefreshBtn');
  const disconnectBtn = document.getElementById('sdDisconnectBtn');

  if (!sheetId) {
    setSDStatus('off', 'Not connected');
    if (refreshBtn)    refreshBtn.style.display    = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    document.getElementById('sd-charts-area')?.classList.add('hidden');
    document.getElementById('sd-placeholder')?.classList.remove('hidden');
    return;
  }

  if (refreshBtn)    refreshBtn.style.display    = 'inline-flex';
  if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';

  // ── Check if background poller already fetched fresh rows ──────────────
  const sdRowsCacheKey = CACHE_KEYS.studentData + '_rows';
  const sdCachedRows = _readRowsCache(sdRowsCacheKey);
  if (sdCachedRows) {
    const dataRowsCached = sdCachedRows.length - 1;
    if (dataRowsCached !== sdLastRowCount || sdLastRowCount === 0) {
      sdLastRowCount = dataRowsCached;
      setSDStatus('loading', `Parsing ${dataRowsCached} respondents from background cache…`);
      setTimeout(() => {
        const parsed = parseStudentDatasetRows(sdCachedRows);
        cacheWrite(CACHE_KEYS.studentData, parsed);
        renderStudentDatasetCharts(parsed);
      }, 50);
    } else {
      setSDStatus('ok', `${dataRowsCached} respondents · cached ${cacheAge(sdRowsCacheKey)}`);
    }
    return;
  }
  // ── No background cache — fall back to direct gviz fetch ───────────────

  setSDStatus('loading', 'Fetching sheet…');

  let rows = await fetchSurveySheet(sheetId); // reuse the same gviz fetcher

  // Auto-retry once on failure before giving up
  if (!rows) {
    setSDStatus('loading', 'Retrying sheet fetch…');
    await new Promise(r => setTimeout(r, 3000));
    rows = await fetchSurveySheet(sheetId);
  }

  if (!rows) {
    setSDStatus('error', 'Could not load sheet — make sure it is shared as "Anyone with the link → Viewer"');
    document.getElementById('sd-charts-area')?.classList.add('hidden');
    document.getElementById('sd-placeholder')?.classList.remove('hidden');
    return;
  }

  const dataRows = rows.length - 1;
  if (dataRows === sdLastRowCount && sdLastRowCount > 0) {
    setSDStatus('ok', `${dataRows} respondents · no changes · checked ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`);
    return;
  }
  sdLastRowCount = dataRows;

  setSDStatus('loading', `Parsing ${dataRows} respondents…`);
  setTimeout(() => {
    const parsed = parseStudentDatasetRows(rows);
    // Cache the parsed result so next load is instant
    cacheWrite(CACHE_KEYS.studentData, parsed);
    renderStudentDatasetCharts(parsed);
  }, 50);
}

function saveStudentDatasetSheetId() {
  let val = document.getElementById('sdSheetId')?.value?.trim();
  if (!val) return;

  const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    val = match[1];
  } else if (val.includes('/')) {
    alert('Invalid Sheet ID or URL. Please paste the full Google Sheets URL or just the Sheet ID.');
    return;
  }

  const input = document.getElementById('sdSheetId');
  if (input) input.value = val;

  localStorage.setItem('sas_student_dataset_sheet_id', val);

  setSDStatus('loading', 'Saving as default for all users…');
  safeFetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'setDefaultStudentDatasetSheet', sheetId: val })
  }).then(result => {
    if (result && result.success) {
      console.log('[StudentDataset] Saved as global default:', result.message);
    } else {
      console.warn('[StudentDataset] Failed to save global default:', result?.message);
    }
  });

  sdLastRowCount = 0;
  loadStudentDatasetData();
  startStudentDatasetPolling();
}

function refreshStudentDatasetNow() {
  sdLastRowCount = 0;
  loadStudentDatasetData();
}

function disconnectStudentDataset() {
  if (!confirm('Disconnect this Google Sheet?')) return;
  localStorage.removeItem('sas_student_dataset_sheet_id');
  sdLastRowCount = 0;
  stopStudentDatasetPolling();
  const input = document.getElementById('sdSheetId');
  if (input) input.value = '';
  document.getElementById('sd-charts-area')?.classList.add('hidden');
  document.getElementById('sd-placeholder')?.classList.remove('hidden');
  setSDStatus('off', 'Not connected');
  document.getElementById('sdRefreshBtn').style.display    = 'none';
  document.getElementById('sdDisconnectBtn').style.display = 'none';
}

function startStudentDatasetPolling() {
  stopStudentDatasetPolling();
  sdPollTimer = setInterval(loadStudentDatasetData, SD_POLL_INTERVAL);
}

function stopStudentDatasetPolling() {
  if (sdPollTimer) { clearInterval(sdPollTimer); sdPollTimer = null; }
}

// ─── Utilities ────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderEmptyChart(id, type) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) { charts[id].destroy(); }
  charts[id] = new Chart(ctx, {
    type,
    data: {
      labels: ['No data'],
      datasets: [{
        data: [1],
        backgroundColor: ['rgba(255,255,255,0.05)'],
        borderColor: ['rgba(255,255,255,0.1)'],
        borderWidth: 1,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

function sampleCategories() {
  return {
    'Documents': 4, 'Electronics': 3, 'Clothing': 5,
    'Water Bottles': 2, 'Keys': 3, 'Bags': 2, 'ID Cards': 4, 'Others': 1
  };
}

function sampleMonthly() {
  const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const result = {};
  months.forEach(m => { result[m] = Math.floor(Math.random() * 5 + 1); });
  return result;
}

// ─── Print ────────────────────────────────────────────
function printReport() {
  window.print();
}

// ─── Formal Print Report Sync ──────────────────────────
window.addEventListener('beforeprint', () => {
  const copyText = (srcId, destId) => {
    const src = document.getElementById(srcId);
    const dest = document.getElementById(destId);
    if (src && dest) dest.textContent = src.textContent;
  };

  copyText('kv-sd-total', 'fp-sd-total');
  copyText('kv-lf-total', 'fp-lf-total');
  copyText('kv-borrowers', 'fp-borrowers');
  copyText('kv-pantry', 'fp-pantry');
  copyText('kv-survey-score', 'fp-survey-score');
  copyText('kv-attendance', 'fp-attendance');
  copyText('kv-vacancies', 'fp-vacancies');

  copyText('sd-4ps', 'fp-sd-4ps');
  copyText('sd-solo', 'fp-sd-solo');
  copyText('sd-scholarship', 'fp-sd-scholarship');
  copyText('sd-pwd', 'fp-sd-pwd');
  copyText('sd-ip', 'fp-sd-ip');
  copyText('sd-employed', 'fp-sd-employed');
  
  // Clean up Recovery Rate formatting (strip the prefix if it exists)
  const lfRateSrc = document.getElementById('kv-lf-rate');
  const lfRateDest = document.getElementById('fp-lf-rate');
  if (lfRateSrc && lfRateDest) {
    let txt = lfRateSrc.textContent;
    if (txt.includes(':')) txt = txt.split(':')[1].trim();
    lfRateDest.textContent = txt;
  }
});

// ─── SECTION 8: Job Vacancies Analytics ──────────────────
// Reads pre-processed structured data from Supabase (sas_job_vacancies).
// Data is populated by running: node scripts/sync-vacancies.js
// This function does NOT trigger OCR — it only reads what's already stored.

async function loadJobVacancyData() {
  const elPh = document.getElementById('vacancies-placeholder');

  try {
    const res = await safeFetch(`${BACKEND_URL}?action=getVacancyData`);

    if (!res || !res.success) {
      console.warn('[Job Vacancies] getVacancyData failed:', res?.message);
      // Only show placeholder if nothing is cached
      if (!cacheRead(CACHE_KEYS.jobVacancy, CACHE_TTL.jobVacancy)) {
        throw new Error(res?.message || 'Failed to load vacancy data');
      }
      return;
    }

    const payload = { vacancies: res.vacancies || [], total: res.total || (res.vacancies || []).length };
    cacheWrite(CACHE_KEYS.jobVacancy, payload);
    renderJobVacancyFromCache(payload);

  } catch (err) {
    console.error('[Job Vacancies] Error:', err);
    if (!cacheRead(CACHE_KEYS.jobVacancy, CACHE_TTL.jobVacancy)) {
      if (elPh) elPh.classList.remove('hidden');
      setText('kv-vacancies', '—');
      renderEmptyChart('vacanciesChart', 'doughnut');
      renderTopRoles([]);
    }
  }
}

function renderJobVacancyFromCache({ vacancies, total }) {
  const elPh = document.getElementById('vacancies-placeholder');
  setText('kv-vacancies', total || vacancies.length);

  if (vacancies.length === 0) {
    renderEmptyChart('vacanciesChart', 'doughnut');
    renderTopRoles([]);
    if (elPh) {
      elPh.classList.remove('hidden');
      const p = elPh.querySelector('p');
      if (p) p.textContent = 'No vacancy data yet. Run the sync script to process posters.';
    }
    return;
  }

  if (elPh) elPh.classList.add('hidden');

  const industryCounts = {};
  vacancies.forEach(v => {
    const bucket = v.industry || 'Others';
    industryCounts[bucket] = (industryCounts[bucket] || 0) + 1;
  });

  const chartEntries = Object.entries(industryCounts)
    .filter(([k]) => k !== 'Others')
    .sort((a, b) => b[1] - a[1]);
  if (industryCounts['Others']) chartEntries.push(['Others', industryCounts['Others']]);

  makeChart('vacanciesChart', {
    type: 'doughnut',
    data: {
      labels: chartEntries.map(e => e[0]),
      datasets: [{
        data: chartEntries.map(e => e[1]),
        backgroundColor: PALETTE_LIST,
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} poster${ctx.parsed !== 1 ? 's' : ''}` } }
      }
    }
  });

  const positionCounts = {};
  vacancies.forEach(v => {
    if (Array.isArray(v.positions)) {
      v.positions.forEach(p => {
        const key = p.trim();
        if (key.length > 1) positionCounts[key] = (positionCounts[key] || 0) + 1;
      });
    }
  });

  const topRoles = Object.entries(positionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  renderTopRoles(topRoles);
}

function renderTopRoles(roles) {
  const body = document.getElementById('top-roles-body');
  if (!body) return;

  if (!roles || !roles.length) {
    body.innerHTML = '<div class="an-loading-row" style="color:var(--an-text-muted,#64748b);">No roles detected yet — OCR data may still be processing.</div>';
    return;
  }

  body.innerHTML = roles.map(([name, count], i) => `
    <div class="an-kpi-list-row">
      <span class="an-kpi-list-rank">#${i + 1}</span>
      <span class="an-kpi-list-name" style="text-transform:capitalize;">${escHtml(name.toLowerCase())}</span>
      <span class="an-kpi-list-val">${count}</span>
    </div>`).join('');
}

// ── Student Dataset UI Tabs ──
window.switchSDTab = function(tabId, btnElem) {
  // Hide all tab contents
  document.querySelectorAll('.an-tab-content').forEach(el => el.classList.add('hidden'));
  
  // Show target tab
  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');

  // Update active button state
  if (btnElem) {
    document.querySelectorAll('.an-sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElem.classList.add('active');
  }
};
// ── Print Mode Chart Updates ──
window.addEventListener('beforeprint', () => {
  Chart.defaults.color = '#000';
  for (let id in charts) {
    if (charts[id]) {
      if (charts[id].options.scales) {
        for (let axis in charts[id].options.scales) {
          if (charts[id].options.scales[axis].grid) {
            charts[id].options.scales[axis].grid.color = 'rgba(0,0,0,0.1)';
          }
        }
      }
      charts[id].update();
    }
  }
});
window.addEventListener('afterprint', () => {
  Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
  for (let id in charts) {
    if (charts[id]) {
      if (charts[id].options.scales) {
        for (let axis in charts[id].options.scales) {
          if (charts[id].options.scales[axis].grid) {
            charts[id].options.scales[axis].grid.color = 'rgba(255,255,255,0.04)';
          }
        }
      }
      charts[id].update();
    }
  }
});
