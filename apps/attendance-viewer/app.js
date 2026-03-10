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
  refreshBtn: document.getElementById('refreshBtn'),
  retryBtn: document.getElementById('retryBtn')
};

let masterData = [];

function init() {
  els.refreshBtn.addEventListener('click', fetchData);
  els.retryBtn.addEventListener('click', fetchData);
  els.searchInput.addEventListener('input', () => renderTable(els.searchInput.value));
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

function renderTable(filter = '') {
  els.tbody.innerHTML = '';
  const term = filter.toLowerCase().trim();
  let count = 0;

  masterData.forEach(row => {
    // Basic search checks first few columns (Name, Course/Section)
    const searchable = row.slice(0, 3).map(c => (c || '').toString().toLowerCase()).join(' ');
    if (term && !searchable.includes(term)) return;

    count++;
    const tr = document.createElement('tr');

    row.forEach((cell, i) => {
      const td = document.createElement('td');
      // If column is past the ID column (index 3), it's likely a timestamp column
      if (i > 3) {
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

      // Build Headers
      data.headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h || '';
        els.thead.appendChild(th);
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
