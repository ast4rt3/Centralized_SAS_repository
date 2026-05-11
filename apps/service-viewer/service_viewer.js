const BACKEND_GAS_URL = window.ENV?.BACKEND_GAS_URL || 'https://script.google.com/macros/s/AKfycbyNmsUvDndrM5L2v_E3gJvM2jHqI1o30Tz8X-aI2H9vX-xYjZ0/exec'; // Example fallback if needed, but it should be loaded from env

async function sasFetch(action, params = {}) {
  if (!BACKEND_GAS_URL) {
    console.warn("Backend URL missing!");
    return { success: false, message: "Backend URL missing" };
  }
  try {
    const url = new URL(BACKEND_GAS_URL);
    url.searchParams.append('action', action);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
    const r = await fetch(url.toString());
    return await r.json();
  } catch (e) {
    console.error("SAS Fetch Error:", e);
    return { success: false, message: e.message };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const loadingState = document.getElementById('loading-state');
  const categoryView = document.getElementById('category-view');
  const officeView = document.getElementById('office-view');
  const navBar = document.getElementById('nav-bar');
  const btnBack = document.getElementById('btn-back');
  const breadcrumb = document.getElementById('breadcrumb');

  let currentCategoryName = localStorage.getItem('sas_selected_service_category') || 'Services';
  let currentOfficeId = null;

  // Render initial state
  document.getElementById('category-title').textContent = currentCategoryName;
  breadcrumb.textContent = currentCategoryName;

  async function loadCategory() {
    loadingState.style.display = 'flex';
    categoryView.classList.remove('active');
    officeView.classList.remove('active');
    navBar.style.display = 'none';

    try {
      // Use the new payload param 'categoryName'
      const res = await sasFetch('getOfficesByCategory', { categoryName: currentCategoryName });
      
      loadingState.style.display = 'none';
      if (res.success) {
        renderOffices(res.offices);
        categoryView.classList.add('active');
      } else {
        document.getElementById('offices-grid').innerHTML = `<p style="color:red;">Error: ${res.message}</p>`;
        categoryView.classList.add('active');
      }
    } catch (err) {
      loadingState.style.display = 'none';
      document.getElementById('offices-grid').innerHTML = `<p style="color:red;">Network Error.</p>`;
      categoryView.classList.add('active');
    }
  }

  function renderOffices(offices) {
    const grid = document.getElementById('offices-grid');
    if (!offices || offices.length === 0) {
      grid.innerHTML = '<p style="color:#64748b;">No offices found in this category.</p>';
      return;
    }

    grid.innerHTML = offices.map(o => `
      <div class="office-card" data-id="${o.id}" data-name="${o.name}">
        <h3>${o.name}</h3>
        <p>${o.info || 'No information available.'}</p>
      </div>
    `).join('');

    // Attach click events
    grid.querySelectorAll('.office-card').forEach(card => {
      card.addEventListener('click', () => {
        loadOfficeDetails(card.getAttribute('data-id'), card.getAttribute('data-name'));
      });
    });
  }

  async function loadOfficeDetails(officeId, officeName) {
    currentOfficeId = officeId;
    
    categoryView.classList.remove('active');
    loadingState.style.display = 'flex';
    navBar.style.display = 'flex';
    breadcrumb.textContent = `${currentCategoryName} / ${officeName}`;

    try {
      const res = await sasFetch('getOfficeDetails', { officeId });
      loadingState.style.display = 'none';

      if (res.success) {
        renderOfficeDetails(res.office, res.docs);
        officeView.classList.add('active');
      } else {
        alert("Failed to load office details: " + res.message);
        loadCategory();
      }
    } catch (err) {
      loadingState.style.display = 'none';
      alert("Network Error.");
      loadCategory();
    }
  }

  function renderOfficeDetails(office, docs) {
    document.getElementById('office-title').textContent = office.name;
    document.getElementById('office-info').textContent = office.info || 'No info provided.';
    document.getElementById('office-body').textContent = office.office_body || 'No detailed description available.';

    const docsList = document.getElementById('docs-list');
    if (!docs || docs.length === 0) {
      docsList.innerHTML = '<div style="color:#64748b; font-size:.9rem;">No documents available.</div>';
    } else {
      docsList.innerHTML = docs.map(d => `
        <a href="${d.url}" target="_blank" class="doc-item">
          <i class='bx bxs-file-pdf'></i>
          <span>${d.title}</span>
        </a>
      `).join('');
    }
  }

  // Handle Export CSV
  document.getElementById('btn-export').addEventListener('click', async () => {
    if (!currentOfficeId) return;
    const btn = document.getElementById('btn-export');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Exporting...';
    btn.disabled = true;

    try {
      const res = await sasFetch('exportOfficeAnalytics', { officeId: currentOfficeId });
      if (res.success && res.analytics && res.analytics.exportData) {
        // Trigger download
        const blob = new Blob([res.analytics.exportData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `office_analytics_${currentOfficeId}.csv`);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to generate export: " + (res.message || "No data."));
      }
    } catch (e) {
      alert("Export failed.");
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  });

  // Handle Back Button
  btnBack.addEventListener('click', () => {
    officeView.classList.remove('active');
    loadCategory();
  });

  // Init
  loadCategory();
});
