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
        <img class="office-card-img" src="${o.cover_url || '../../assets/SAS_landing_page_header.jpg'}" alt="${o.name}">
        <div class="office-card-body">
          <h3>${o.name}</h3>
          <p>${o.info || 'No information available.'}</p>
        </div>
        <div class="office-card-footer">
          <div class="learn-more">Learn More <i class='bx bx-right-arrow-alt'></i></div>
        </div>
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
        renderOfficeDetails(res.office, res.docs, res.activities);
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

  function renderOfficeDetails(office, docs, activities) {
    const coverImg = document.getElementById('office-cover-img');
    if (office.cover_url) {
      coverImg.src = office.cover_url;
    } else {
      coverImg.src = "../../assets/SAS_landing_page_header.jpg";
    }

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

    const activitiesList = document.getElementById('activities-list');
    if (!activities || activities.length === 0) {
      activitiesList.innerHTML = '<div style="color:#64748b; font-size:.9rem;">No activities available.</div>';
    } else {
      activitiesList.innerHTML = activities.map(a => `
        <div style="padding:15px; background:#f8fafc; border:1px solid var(--border); border-radius:12px;">
          <div style="font-size:0.75rem; color:#f59e0b; font-weight:800; margin-bottom:4px; text-transform:uppercase;">${a.activity_date}</div>
          <div style="font-weight:700; font-size:1rem; color:var(--blue); margin-bottom:4px;">${a.title}</div>
          <div style="font-size:0.9rem; color:#475569; line-height:1.5;">${a.description || ''}</div>
        </div>
      `).join('');
    }
  }


  // Handle Back Button
  btnBack.addEventListener('click', () => {
    officeView.classList.remove('active');
    loadCategory();
  });

  // Init
  loadCategory();
});
