const URL = 'https://docs.google.com/spreadsheets/d/1ROXUAlBt1bYx4ftNqG-HBwH2GzCyH9bix2pilzEMDEs/gviz/tq?tqx=out:json&gid=1786390592&tq=SELECT%20C%2CD%2CE%2CF%2CG%2CH%2CI%2CJ%2CK%2CL%2CM%2CN%2CO%2CP%2CQ%2CR%2CS';

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

  fetch(URL)
    .then(res => res.text())
    .then(text => {
      // The response is wrapped in a google callback function: google.visualization.Query.setResponse(...)
      const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);/);
      if (!match) throw new Error("Invalid response format from Google Sheets");
      
      const data = JSON.parse(match[1]);
      if (data.status === 'error') {
        throw new Error(data.errors[0].message + " (" + data.errors[0].detailed_message + ")");
      }

      // Build Headers
      const cols = data.table.cols;
      cols.forEach(c => {
        const th = document.createElement('th');
        th.textContent = c.label || c.id || '';
        els.thead.appendChild(th);
      });

      // Build Rows
      const rows = data.table.rows;
      masterData = rows.map(r => r.c.map(c => c ? (c.f || c.v) : ''));

      setState('loaded');
      renderTable();
    })
    .catch(err => {
      console.error(err);
      setState('error', err.message || 'Failed to fetch Masterlist');
    });
}

document.addEventListener('DOMContentLoaded', init);
