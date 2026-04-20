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
  retryBtn: document.getElementById('retryBtn')
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
  
  // Debounce the search input to prevent lag on every keystroke
  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderTable(els.searchInput.value, els.columnFilter.value);
    }, 300); // 300ms delay
  });
  
  els.columnFilter.addEventListener('change', () => renderTable(els.searchInput.value, els.columnFilter.value));
  
  loadInitialData(); // Load cache first if available
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
    // Search across ID, Name, and Course
    const searchable = row.slice(0, 3).map(c => (c || '').toString().toLowerCase()).join(' ');
    if (term && !searchable.includes(term)) return;

    count++;
    html += '<tr>';

    row.forEach((cell, i) => {
      // Column filter logic
      if (selectedColumnIndex !== 'all') {
        const targetIdx = parseInt(selectedColumnIndex);
        if (i > 3 && i !== targetIdx) return; // Keep ID, Name, Course, Year
      }

      let content = '';
      let style = '';
      
      if (i === 3) {
        content = processYearValue(cell);
      } else if (i > 3) {
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
  console.log("📡 Fetching data from Supabase...");
  if (!checkDependencies()) return;
  setState('loading');
  masterData = [];
  els.thead.innerHTML = '';
  els.tbody.innerHTML = '';

  try {
    let allData = [];
    let from = 0;
    let step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      console.log(` 🔍 Fetching range ${from} to ${from + step - 1}...`);
      const { data, error } = await supabaseClient
        .from('NBSC_masterlist')
        .select(`
          ID, Name, Course, yearLevel,
          attendance: NBSC_attendance (*)
        `)
        .order('Name', { ascending: true })
        .range(from, from + step - 1);

      if (error) {
          console.error(" ❌ Supabase Query Error:", error);
          throw error;
      }

      if (data && data.length > 0) {
          allData = allData.concat(data);
          from += step;
          // If we got less than the step size, we reached the end
          if (data.length < step) keepFetching = false;
      } else {
          keepFetching = false;
      }
    }
    
    console.log(" ✅ All data received:", allData.length, "rows");

    const attendanceCols = [
      'Day1_Parade_Mass', 'Day1Opening_Morning', 'Day1Afternoon_IN', 'Day1Afternoon_OUT',
      'Day2Morning_IN', 'Day2Morning_OUT', 'Day2Afternoon_IN', 'Day2Afernoon_OUT',
      'Day3Morning_IN', 'Day3Morning_OUT', 'Day3Afternoon_IN', 'Day3Afternoon_OUT',
      'Day3_Scan_3', 'Day4_Scan_1', 'Day4_Scan_2', 'Day4_Scan_3'
    ];

    const headers = ['ID', 'Name', 'Course', 'Year Level', ...attendanceCols.map(c => c.replace(/_/g, ' '))];
    
    const rows = allData.map((m, idx) => {
      try {
        const att = m.attendance && m.attendance.length > 0 ? m.attendance[0] : {};
        return [
          m.ID, 
          m.Name, 
          m.Course, 
          m.yearLevel,
          ...attendanceCols.map(c => att[c] || 'Not Checked In')
        ];
      } catch (err) {
        console.error(" ❌ Mapping failed at row " + idx, err);
        return null;
      }
    }).filter(r => r !== null);

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
       timestamp: Date.now(),
       headers: headers,
       data: rows
    }));

    masterData = rows;
    buildHeaders(headers);
    setState('loaded');
    renderTable();

  } catch (err) {
    console.error(err);
    setState('error', err.message || 'Failed to fetch Masterlist from Supabase');
  }
}

document.addEventListener('DOMContentLoaded', init);
