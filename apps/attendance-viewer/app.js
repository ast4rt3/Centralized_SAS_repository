const GAS_URL = 'https://script.google.com/macros/s/AKfycbz3cjgDKFw4CrDdB0dETT4SPyU7Xvh6szAFB_Iz8AiwCpbDNRGVPsuwnjr-0HFDbxaZ2g/exec';

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

function init() {
  els.refreshBtn.addEventListener('click', fetchData);
  els.retryBtn.addEventListener('click', fetchData);
  els.searchInput.addEventListener('input', () => renderTable(els.searchInput.value, els.columnFilter.value));
  els.columnFilter.addEventListener('change', () => renderTable(els.searchInput.value, els.columnFilter.value));
  fetchData();
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
  if (!v) return '<span class="status-badge">Empty</span>';
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

function renderTable(filter = '', selectedColumnIndex = 'all') {
  els.tbody.innerHTML = '';
  const term = filter.toLowerCase().trim();
  let count = 0;

  masterData.forEach(row => {
    // Search across all data rows (except maybe timestamps)
    const searchable = row.slice(0, 3).map(c => (c || '').toString().toLowerCase()).join(' ');
    if (term && !searchable.includes(term)) return;

    count++;
    const tr = document.createElement('tr');

    row.forEach((cell, i) => {
      // If a specific column is selected (and it's not the Name/ID columns which we might always want to show, or maybe we hide them too)
      // Usually, we always show the first column (Name) and hide the others if a filter is active
      if (selectedColumnIndex !== 'all') {
        const targetIdx = parseInt(selectedColumnIndex);
        if (i !== 0 && i !== targetIdx) {
           // Hide the columns that don't match the selected filter, except Name (idx 0)
           return;
        }
      }

      const td = document.createElement('td');
      // Assume earliest columns are strings, and the latter ones are timelines
      // The user wants C,D,E,H,I,J,K,L,M,N,O,P,Q,R,S
      // Let's assume indices > 2 are timestamps (adjust if needed based on data)
      if (i > 2) {
        td.innerHTML = processTimeValue(cell);
      } else {
        td.textContent = cell || '';
        if (i === 0) td.style.fontWeight = '600'; // Make Name bold
      }
      tr.appendChild(td);
    });
    els.tbody.appendChild(tr);
  });

  els.recordCount.textContent = count;
}

function fetchData() {
  setState('loading');
  masterData = [];
  els.thead.innerHTML = '';
  els.tbody.innerHTML = '';

  // Require URL to be set
  if (!GAS_URL.startsWith("https://") || GAS_URL.includes("YOUR_NEW_GAS_WEB_APP_URL_HERE")) {
    setState('error', 'Please set the Google Apps Script URL in app.js first.');
    return;
  }

  // Use fetch to trigger a simple GET request.
  // Google Apps Script doGet() will redirect and return JSON.
  fetch(GAS_URL)
    .then(res => res.text()) // Use text() first to catch unexpected HTML redirects
    .then(text => {
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Non-JSON response received:", text);
        throw new Error("Invalid response from Google Servers: " + text.slice(0, 100)); // slice to avoid massive error block
      }

      if (!data.success) {
        throw new Error(data.message || "Unknown server error");
      }

      // Build Headers AND populate Dropdown Filter
      els.columnFilter.innerHTML = '<option value="all" style="color: black;">All Columns</option>';
      data.headers.forEach((h, i) => {
        const th = document.createElement('th');
        th.textContent = h || `Column ${i+1}`;
        // Store index so we can filter by it
        th.dataset.colIndex = i;
        els.thead.appendChild(th);

        // Populate dropdown with options (skip Name/ID columns if you only want to filter by specific events)
        if (i > 0) { // Assuming 0 is Name
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = h || `Column ${i+1}`;
            opt.style.color = "black";
            els.columnFilter.appendChild(opt);
        }
      });

      // Build Rows
      masterData = data.rows;

      setState('loaded');
      renderTable();
    })
    .catch(err => {
      console.error(err);
      setState('error', err.message || 'Failed to fetch Masterlist');
    });
}

document.addEventListener('DOMContentLoaded', init);
