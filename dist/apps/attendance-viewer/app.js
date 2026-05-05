// Initialize Supabase Client
let supabaseClient;

function checkDependencies() {
  if (typeof supabaseClient === 'undefined' && window.supabase) {
      if (!window.ENV || !window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
          setState('error', 'Configuration Error: Supabase URL or Key missing in env.js');
          return false;
      }
      supabaseClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  }
  
  if (!supabaseClient) {
      setState('error', 'Dependency Error: Supabase library failed to load.');
      return false;
  }
  return true;
}

const els = {
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errMsg: document.getElementById('error-message'),
  tableContainer: document.getElementById('tableContainer'),
  thead: document.getElementById('tableHeaderRow'),
  tbody: document.getElementById('tableBody'),
  recordCount: document.getElementById('recordCount'),
  searchInput: document.getElementById('searchInput'),
  columnFilter: document.getElementById('columnFilter'),
  refreshBtn: document.getElementById('refreshBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  retryBtn: document.getElementById('retryBtn'),
  eventSelector: document.getElementById('eventSelector'),
  subHeader: document.getElementById('subHeaderText')
};

let masterData = [];

const CACHE_KEY = 'attendance_masterlist_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

let searchTimeout;

function init() {
  console.log("🚀 Initializing App...");
  if (!checkDependencies()) return;
  
  els.refreshBtn.addEventListener('click', () => fetchData(true));
  els.retryBtn.addEventListener('click', () => fetchData(true));
  els.exportPdfBtn.addEventListener('click', exportToPDF);
  
  // Debounce the search input to prevent lag on every keystroke
  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderTable(els.searchInput.value, els.columnFilter.value);
    }, 300); // 300ms delay
  });
  
  els.columnFilter.addEventListener('change', () => renderTable(els.searchInput.value, els.columnFilter.value));
  els.eventSelector.addEventListener('change', () => fetchData(true));
  
  fetchEvents(); 
}

async function fetchEvents() {
  if (!checkDependencies()) return;
  
    try {
    const { data, error } = await supabaseClient
      .from('sas_events')
      .select('id, name')
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    let html = `
      <option value="legacy" style="color: black;">Foundation Day 2026</option>
      <option value="it-fest" style="color: black;">IT Fest 2026</option>
    `;
    
    if (data && data.length > 0) {
      data.forEach(ev => {
        html += `<option value="${ev.id}" style="color: black;">${ev.name}</option>`;
      });
    }
    
    els.eventSelector.innerHTML = html;
    
    // Default Selection Logic
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdFromUrl = urlParams.get('eventId');
    
    if (eventIdFromUrl && [...els.eventSelector.options].some(opt => opt.value === eventIdFromUrl)) {
      els.eventSelector.value = eventIdFromUrl;
    } else if (data && data.length > 0) {
      // Default to the most recent dynamic event (first in sorted list)
      els.eventSelector.value = data[0].id;
    } else {
      // Fallback to IT Fest or Foundation Day
      els.eventSelector.value = 'it-fest';
    }
    
    loadInitialData(); // Load data after events are ready
  } catch (err) {
    console.error("Failed to fetch events:", err);
    els.eventSelector.innerHTML = `
      <option value="legacy" style="color: black;">Foundation Day 2026 (Legacy)</option>
      <option value="it-fest" style="color: black;">IT Fest 2026 (Legacy)</option>
    `;
    loadInitialData();
  }
}

function loadInitialData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const isExpired = (Date.now() - parsed.timestamp) > CACHE_TTL_MS;
      
      // If valid cache, load instantly without network request
      if (!isExpired && parsed.data && parsed.headers) {
        masterData = parsed.data;
        buildHeaders(parsed.headers);
        setState('loaded');
        renderTable();
        return;
      }
    } catch (e) {
      console.warn('Cache could not be parsed', e);
    }
  }
  
  // If no cache or expired, fetch fresh data
  fetchData(true);
}

function buildHeaders(headersArr) {
  els.thead.innerHTML = '';
  els.columnFilter.innerHTML = '<option value="all" style="color: black;">All Columns</option>';
  
  headersArr.forEach((h, i) => {
    const th = document.createElement('th');
    th.textContent = h || `Column ${i+1}`;
    th.dataset.colIndex = i;
    els.thead.appendChild(th);

    if (i > 0) { 
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = h || `Column ${i+1}`;
        opt.style.color = "black";
        els.columnFilter.appendChild(opt);
    }
  });
}

function setState(state, msg = '') {
  els.loading.classList.add('hidden');
  els.error.classList.add('hidden');
  els.tableContainer.classList.add('hidden');

  if (state === 'loading') els.loading.classList.remove('hidden');
  if (state === 'error') {
    els.errMsg.textContent = msg;
    els.error.classList.remove('hidden');
  }
  if (state === 'loaded') els.tableContainer.classList.remove('hidden');
}

function processTimeValue(v) {
  if (!v || v === 'Not Checked In' || v === 'Empty') return '<span class="status-badge">Not Checked In</span>';
  const str = v.toString();
  if (str.toLowerCase() === 'not checked in') return '<span class="status-badge">Not Checked In</span>';
  if (str.includes('Flagged')) {
    const reason = str.split('(')[0].replace('Flagged:', '').trim();
    return `<span class="status-badge flagged" title="${str}">Flagged: ${reason}</span>`;
  }
  if (str.includes('(LATE)')) {
    const time = str.split('(LATE)')[0].trim();
    return `<span class="status-badge late" title="${str}">${time} (Late)</span>`;
  }
  // Standard entry e.g. "8:45 AM [StaffName]"
  const time = str.split('[')[0].trim();
  return `<span class="status-badge present" title="${str}">${time}</span>`;
}

function processYearValue(v) {
  if (!v) return '';
  const str = v.toString().trim();
  const lowerStr = str.toLowerCase();
  
  if (lowerStr.includes('first') || lowerStr.includes('1st')) {
    return `<span class="status-badge year-1" title="${str}">${str}</span>`;
  }
  if (lowerStr.includes('second') || lowerStr.includes('2nd')) {
    return `<span class="status-badge year-2" title="${str}">${str}</span>`;
  }
  if (lowerStr.includes('third') || lowerStr.includes('3rd')) {
    return `<span class="status-badge year-3" title="${str}">${str}</span>`;
  }
  if (lowerStr.includes('fourth') || lowerStr.includes('4th')) {
    return `<span class="status-badge year-4" title="${str}">${str}</span>`;
  }
  
  // Default fallback if it doesn't match standard year naming
  return `<span class="status-badge year-default" title="${str}">${str}</span>`;
}

function renderTable(filter = '', selectedColumnIndex = 'all') {
  const term = filter.toLowerCase().trim();
  let count = 0;
  let html = '';

  masterData.forEach(row => {
    // 1. Search Filter (ID, Name, Course)
    const searchable = row.slice(0, 3).map(c => (c || '').toString().toLowerCase()).join(' ');
    if (term && !searchable.includes(term)) return;

    // 2. "Present Only" Filter: Check if student has at least one check-in
    // Attendance columns now start at index 3 (ID=0, Name=1, Course=2)
    const attendanceValues = row.slice(3);
    const isPresent = attendanceValues.some(v => v && v !== 'Not Checked In' && v !== 'Empty');
    
    if (!isPresent) return;

    count++;
    html += '<tr>';

    row.forEach((cell, i) => {
      // Column filter logic
      if (selectedColumnIndex !== 'all') {
        const targetIdx = parseInt(selectedColumnIndex);
        if (i > 2 && i !== targetIdx) return; // Keep ID, Name, Course
      }

      let content = '';
      let style = '';
      
      if (i > 2) {
        content = processTimeValue(cell);
      } else {
        content = cell || '';
        if (i === 1) style = ' style="font-weight: 600;"'; // Name
      }
      
      html += `<td${style}>${content}</td>`;
    });
    html += '</tr>';
  });

  els.tbody.innerHTML = html;
  els.recordCount.textContent = count;
}

async function fetchData(forceRefresh = false) {
  const selectedEvent = els.eventSelector.value;
  const eventName = els.eventSelector.options[els.eventSelector.selectedIndex]?.text || 'Attendance';
  
  console.log(`📡 Fetching data for event: ${eventName} (${selectedEvent})...`);
  if (!checkDependencies()) return;
  setState('loading');
  
  masterData = [];
  els.thead.innerHTML = '';
  els.tbody.innerHTML = '';
  els.subHeader.textContent = eventName;

  try {
    if (selectedEvent === 'legacy') {
      await fetchLegacyData();
    } else if (selectedEvent === 'it-fest') {
      await fetchITFestData();
    } else {
      await fetchGenericData(selectedEvent);
    }
  } catch (err) {
    console.error(err);
    setState('error', err.message || 'Failed to fetch attendance data');
  }
}

async function fetchLegacyData() {
  let allData = [];
  let from = 0;
  let step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabaseClient
      .from('NBSC_masterlist')
      .select(`
        ID, Name, Course,
        attendance: NBSC_attendance (*)
      `)
      .order('Name', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  const attendanceCols = [
    'Day1_Parade_Mass', 'Day1Opening_Morning', 'Day1Afternoon_IN', 'Day1Afternoon_OUT',
    'Day2Morning_IN', 'Day2Morning_OUT', 'Day2Afternoon_IN', 'Day2Afernoon_OUT',
    'Day3Morning_IN', 'Day3Morning_OUT', 'Day3Afternoon_IN', 'Day3Afternoon_OUT',
    'Day3_Scan_3', 'Day4_Scan_1', 'Day4_Scan_2', 'Day4_Scan_3'
  ];

  const headers = ['ID', 'Name', 'Course', ...attendanceCols.map(c => c.replace(/_/g, ' '))];
  
  const rows = allData.map(m => {
    const att = m.attendance && m.attendance.length > 0 ? m.attendance[0] : {};
    return [
      m.ID, m.Name, m.Course,
      ...attendanceCols.map(c => att[c] || 'Not Checked In')
    ];
  });

  masterData = rows;
  buildHeaders(headers);
  setState('loaded');
  renderTable();
}

async function fetchITFestData() {
  let allData = [];
  let from = 0;
  let step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabaseClient
      .from('NBSC_masterlist')
      .select(`
        ID, Name, Course,
        attendance: NBSC_it_fest_attendance (*)
      `)
      .order('Name', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  const attendanceCols = [
    'Morning_Day2_IN', 'Afternoon_Day2_IN', 'Afternoon_Day2_OUT'
  ];

  const headers = ['ID', 'Name', 'Course', ...attendanceCols.map(c => c.replace(/_/g, ' '))];
  
  const rows = allData.map(m => {
    const att = m.attendance && m.attendance.length > 0 ? m.attendance[0] : {};
    return [
      m.ID, m.Name, m.Course,
      ...attendanceCols.map(c => att[c] || 'Not Checked In')
    ];
  });

  masterData = rows;
  buildHeaders(headers);
  setState('loaded');
  renderTable();
}

async function fetchGenericData(eventId) {
  // 1. Fetch Schedules for this event
  const { data: schedules, error: schedErr } = await supabaseClient
    .from('sas_schedules')
    .select('id, label, date')
    .eq('event_id', eventId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (schedErr) throw schedErr;
  if (!schedules || schedules.length === 0) {
    throw new Error("No scanning windows found for this event. Create them in Schedule Manager first.");
  }

  const scheduleIds = schedules.map(s => s.id);

  // 2. Fetch Masterlist
  let masterlist = [];
  let from = 0;
  let step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await supabaseClient
      .from('NBSC_masterlist')
      .select('ID, Name, Course')
      .order('Name', { ascending: true })
      .range(from, from + step - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      masterlist = masterlist.concat(data);
      from += step;
      if (data.length < step) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  // 3. Fetch Logs for these schedules
  const { data: logs, error: logErr } = await supabaseClient
    .from('sas_attendance_logs')
    .select('student_id, schedule_id, scanned_at, status, scanner_user, flag_reason')
    .in('schedule_id', scheduleIds);

  if (logErr) throw logErr;

  // 4. Pivot Data
  // Map logs: student_id -> { schedule_id -> logEntry }
  const logMap = {};
  logs.forEach(l => {
    if (!logMap[l.student_id]) logMap[l.student_id] = {};
    logMap[l.student_id][l.schedule_id] = l;
  });

  const headers = ['ID', 'Name', 'Course', ...schedules.map(s => s.label)];
  
  const rows = masterlist.map(s => {
    const studentLogs = logMap[s.ID] || {};
    return [
      s.ID, s.Name, s.Course,
      ...schedules.map(sch => {
        const entry = studentLogs[sch.id];
        if (!entry) return 'Not Checked In';
        
        const time = new Date(entry.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (entry.status === 'flagged') {
          return `Flagged: ${entry.flag_reason || 'Unknown'} (${time}) [${entry.scanner_user}]`;
        }
        return `${time} [${entry.scanner_user}]`;
      })
    ];
  });

  masterData = rows;
  buildHeaders(headers);
  setState('loaded');
  renderTable();
}

async function exportToPDF() {
  if (!masterData || masterData.length === 0) {
    alert("No data available to export.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
  
  const eventName = els.eventSelector.options[els.eventSelector.selectedIndex]?.text || 'Attendance';
  const timestamp = new Date().toLocaleString();

  // 1. Prepare Data (Follow the same filtering as renderTable)
  const term = els.searchInput.value.toLowerCase().trim();
  const selectedColumnIndex = els.columnFilter.value;
  
  const headers = [];
  const headerEls = els.thead.querySelectorAll('th');
  headerEls.forEach((th, i) => {
    // Apply column filter to headers
    if (selectedColumnIndex !== 'all') {
      const targetIdx = parseInt(selectedColumnIndex);
      if (i > 2 && i !== targetIdx) return;
    }
    headers.push(th.textContent);
  });

  const body = [];
  masterData.forEach(row => {
    // Apply Search Filter
    const searchable = row.slice(0, 3).map(c => (c || '').toString().toLowerCase()).join(' ');
    if (term && !searchable.includes(term)) return;

    // Apply Present Only Filter
    const attendanceValues = row.slice(3);
    const isPresent = attendanceValues.some(v => v && v !== 'Not Checked In' && v !== 'Empty');
    if (!isPresent) return;

    const filteredRow = [];
    row.forEach((cell, i) => {
      // Apply column filter to cells
      if (selectedColumnIndex !== 'all') {
        const targetIdx = parseInt(selectedColumnIndex);
        if (i > 2 && i !== targetIdx) return;
      }
      
      // Clean up cell content for PDF (strip staff names/extra info)
      if (i > 2) {
        if (!cell || cell === 'Not Checked In' || cell === 'Empty') {
          filteredRow.push('ABSENT');
        } else {
          // Extract time only, strip [StaffName]
          const timeOnly = cell.toString().split('[')[0].trim();
          filteredRow.push(timeOnly);
        }
      } else {
        filteredRow.push(cell || '');
      }
    });
    body.push(filteredRow);
  });

  if (body.length === 0) {
    alert("No records match the current filters.");
    return;
  }

  // 2. Generate PDF Content
  doc.setFontSize(18);
  doc.setTextColor(0, 74, 153); // NBSC Blue
  doc.text("Attendance Report", 14, 15);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Event: ${eventName}`, 14, 22);
  doc.text(`Generated: ${timestamp}`, 14, 28);
  doc.text(`Total Records: ${body.length}`, 14, 34);

  doc.autoTable({
    head: [headers],
    body: body,
    startY: 40,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [0, 51, 102], // NBSC Dark Mid
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 40 },
    didDrawPage: function(data) {
      // Footer
      const str = "Page " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.text(str, data.settings.margin.left, pageHeight - 10);
      doc.text("NBSC SAS Portal - Attendance Tracker", pageSize.width - 60, pageHeight - 10);
    }
  });

  const fileName = `Attendance_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

document.addEventListener('DOMContentLoaded', init);
