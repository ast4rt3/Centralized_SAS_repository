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
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  green:  '#10b981',
  gold:   '#f59e0b',
  pink:   '#ec4899',
  indigo: '#6366f1',
  cyan:   '#06b6d4',
  red:    '#ef4444',
};

const PALETTE_LIST = Object.values(PALETTE);

// ─── State ───────────────────────────────────────────
let charts = {};
let manualServices = JSON.parse(localStorage.getItem('sas_manual_services') || '[]');

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('semesterBadge').textContent = SEMESTER_LABEL;
  document.getElementById('printDate').textContent = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  renderManualServices();
  loadAllData();
});

async function loadAllData() {
  showRefreshSpin(true);
  await Promise.allSettled([
    loadLostFoundData(),
    loadAttendanceData(),
    loadJobVacancyData(),
  ]);
  loadBorrowersData();  // graceful — no await
  loadSurveyData();
  loadPantryData();
  showRefreshSpin(false);
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
    if (direct && direct.data) { renderLFData(direct.data); return; }
    renderLFPlaceholder();
    return;
  }
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
function loadSurveyData() {
  const sheetId = localStorage.getItem('sas_survey_sheet_id');
  const el = document.getElementById('survey-placeholder');

  if (!sheetId) {
    if (el) el.classList.remove('hidden');
    renderEmptyChart('satisfactionGauge', 'doughnut');
    renderEmptyChart('surveyServiceChart', 'bar');
    renderEmptyChart('surveyMonthlyChart', 'bar');
    return;
  }

  if (el) el.classList.add('hidden');
  
  safeFetch(BACKEND_URL + '?action=getSurveyStats&sheetId=' + encodeURIComponent(sheetId)).then(res => {
    if (res && res.success) {
      renderSurveyRealData(res);
    } else {
      renderEmptyChart('satisfactionGauge', 'doughnut');
      renderEmptyChart('surveyServiceChart', 'bar');
      renderEmptyChart('surveyMonthlyChart', 'bar');
    }
  });
}

function saveSurveySheetId() {
  const val = document.getElementById('surveySheetId')?.value?.trim();
  if (!val) return;
  localStorage.setItem('sas_survey_sheet_id', val);
  loadSurveyData();
}

function renderSurveyRealData(d) {
  const score = d.score || 0;
  setText('kv-survey-score', score.toFixed(1) + ' ★');
  setText('gauge-score', score.toFixed(1));
  setText('kv-survey-count', (d.count || 0) + ' surveys collected');

  const maxDeg = 180;
  const pct    = (score / 5) * maxDeg;

  makeChart('satisfactionGauge', {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, maxDeg - pct, maxDeg],
        backgroundColor: ['#f59e0b','#1f2a42','transparent'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }]
    },
    options: {
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });

  const bySvc = d.byService || {};
  const svcKeys = Object.keys(bySvc);

  makeChart('surveyServiceChart', {
    type: 'bar',
    data: {
      labels: svcKeys.length ? svcKeys : ['No data'],
      datasets: [{
        label: 'Avg Rating',
        data: svcKeys.length ? svcKeys.map(k => bySvc[k]) : [0],
        backgroundColor: PALETTE_LIST,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } }
      }
    }
  });

  const monthly = d.monthly || {};
  makeChart('surveyMonthlyChart', {
    type: 'bar',
    data: {
      labels: Object.keys(monthly).length ? Object.keys(monthly) : ['No data'],
      datasets: [{
        label: 'Surveys',
        data: Object.keys(monthly).length ? Object.values(monthly) : [0],
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: PALETTE.blue,
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
    } else {
      setText('kv-pantry', '—');
      renderEmptyChart('pantryMonthlyChart', 'bar');
      renderEmptyChart('pantryCourseChart',  'doughnut');
      renderEmptyChart('pantryYearChart',    'bar');
    }
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

// ─── SECTION 8: Job Vacancies OCR Analytics ───────────
const JOB_DICTIONARY = {
  "Skilled Trades": ["CARPENTER", "ELECTRICIAN", "WELDER", "PLUMBER", "MECHANIC", "TECHNICIAN"],
  "Manufacturing & Logistics": ["PRODUCTION", "FORKLIFT", "WAREHOUSE", "DRIVER", "DELIVERY", "OPERATOR"],
  "Hospitality & Food": ["KITCHEN", "DINING", "COOK", "WAITER", "BARISTA", "HOTEL", "RESTAURANT", "CREW"],
  "Retail & Sales": ["SALES", "CASHIER", "MERCHANDISER", "AGENT", "CLERK", "PROMO"],
  "Business & Admin": ["MANAGER", "ADMIN", "ASSISTANT", "SECRETARY", "HR", "STAFF"],
  "IT & Tech": ["DEVELOPER", "PROGRAMMER", "SOFTWARE", "IT", "NETWORK"],
  "Education": ["TEACHER", "INSTRUCTOR", "PROFESSOR", "TUTOR"]
};

async function loadJobVacancyData() {
  const sb = getSupabase();
  const elPh = document.getElementById('vacancies-placeholder');

  if (!sb) {
    if (elPh) elPh.classList.remove('hidden');
    setText('kv-vacancies', '—');
    renderEmptyChart('vacanciesChart', 'doughnut');
    return;
  }

  try {
    // 1. Fetch live file IDs from Google Drive
    const driveRes = await safeFetch(`${BACKEND_URL}?action=getDriveVacancies`);
    if (!driveRes || !driveRes.success) throw new Error("Could not fetch Drive folders");
    
    let liveDriveIds = [];
    driveRes.folders.forEach(f => {
      if (f.files) f.files.forEach(file => liveDriveIds.push(file.id));
      if (f.subfolders) f.subfolders.forEach(sf => {
        if (sf.files) sf.files.forEach(file => liveDriveIds.push(file.id));
      });
    });

    // 2. Fetch OCR text from Supabase
    const { data: cachedTexts, error } = await sb.from('sas_job_vacancies').select('*');
    if (error) throw error;

    const cachedIds = new Set((cachedTexts || []).map(r => r.drive_file_id));
    const missingIds = liveDriveIds.filter(id => !cachedIds.has(id));

    // 3. Trigger OCR sync for missing files
    if (missingIds.length > 0) {
      console.log(`[Job Vacancies] Syncing ${missingIds.length} missing files for OCR...`);
      const syncRes = await fetch(`${BACKEND_URL}?action=syncVacancyOCR`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ fileIds: missingIds.join(',') })
      }).then(r => r.json());
      
      if (syncRes && syncRes.success && syncRes.processed) {
        syncRes.processed.forEach(p => {
          cachedTexts.push({ drive_file_id: p.id, extracted_text: p.text });
        });
      }
    }

    // 4. Run Analytics on Text
    const industryCounts = {};
    const exactRoles = {};

    (cachedTexts || []).forEach(row => {
      const text = String(row.extracted_text || "").toUpperCase();
      let matchedIndustry = "Others";
      
      // Match against dictionary
      for (const [industry, keywords] of Object.entries(JOB_DICTIONARY)) {
        for (const kw of keywords) {
          if (text.includes(kw)) {
            matchedIndustry = industry;
            // Record exact role matched
            exactRoles[kw] = (exactRoles[kw] || 0) + 1;
            break; // Move to next industry or break if we only want 1 category per image
          }
        }
        if (matchedIndustry !== "Others") break; // Found primary industry
      }
      
      industryCounts[matchedIndustry] = (industryCounts[matchedIndustry] || 0) + 1;
    });

    setText('kv-vacancies', cachedTexts.length);

    // Sort exact roles for top list
    const topRoles = Object.entries(exactRoles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    renderTopRoles(topRoles);

    // Chart
    const labels = Object.keys(industryCounts);
    const data = Object.values(industryCounts);

    if (labels.length === 0) {
      renderEmptyChart('vacanciesChart', 'doughnut');
    } else {
      makeChart('vacanciesChart', {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: PALETTE_LIST,
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: { cutout: '60%', plugins: { legend: { position: 'bottom' } } }
      });
    }

    if (elPh) elPh.classList.add('hidden');
  } catch (err) {
    console.error('[Job Vacancies OCR Error]:', err);
    if (elPh) elPh.classList.remove('hidden');
    setText('kv-vacancies', '—');
    renderEmptyChart('vacanciesChart', 'doughnut');
  }
}

function renderTopRoles(roles) {
  const body = document.getElementById('top-roles-body');
  if (!body) return;

  if (!roles || !roles.length) {
    body.innerHTML = '<div class="an-loading-row">No specific roles detected yet.</div>';
    return;
  }

  body.innerHTML = roles.map(([name, count], i) => `
    <div class="an-kpi-list-row">
      <span class="an-kpi-list-rank">#${i + 1}</span>
      <span class="an-kpi-list-name" style="text-transform: capitalize;">${name.toLowerCase()}</span>
      <span class="an-kpi-list-val">${count}</span>
    </div>`).join('');
}
