let categories = [];
let currentCategoryId = null;
let offices = [];

// Session Retrieval
function getSession() {
    const urlParams = new URLSearchParams(window.location.search);
    let username = urlParams.get('portalUser');
    let token = urlParams.get('portalToken');

    if (!username || !token) {
        let rawData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
        if (!rawData && window.parent && window.parent !== window) {
            try {
                rawData = window.parent.localStorage.getItem('sas_user_data') || 
                          window.parent.sessionStorage.getItem('sas_user_data');
            } catch (e) { }
        }
        const userData = JSON.parse(rawData || '{}');
        username = username || userData.username;
        token = token || userData.token;
    }
    return { username, token };
}

const API_URL = window.parent.ENV?.BACKEND_GAS_URL || 'https://script.google.com/macros/s/AKfycbyNmsUvDndrM5L2v_E3gJvM2jHqI1o30Tz8X-aI2H9vX-xYjZ0/exec';

async function api(action, payload = {}) {
    const session = getSession();
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action, 
                ...payload, 
                username: session.username,
                token: session.token 
            })
        });
        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        return { success: false, message: e.message };
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('category-form').onsubmit = handleCategorySubmit;
    document.getElementById('office-form').onsubmit = handleOfficeSubmit;
}

// Categories
async function loadCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;"><i class="bx bx-loader-alt bx-spin"></i></div>';
    
    const res = await api('getServiceCategories');
    console.log("Categories Response:", res);
    
    if (res.success) {
        categories = res.categories || res.data || [];
        console.log("Parsed Categories:", categories);
        if (categories.length === 0) {
            list.innerHTML = `
                <div style="padding:20px; text-align:center; opacity:0.7; font-size:0.8rem;">
                    <p>No categories found.</p>
                    <button class="btn btn-primary" style="margin-top:10px; font-size:0.7rem; padding:6px 12px;" onclick="seedInitialCategories()">
                        <i class='bx bx-refresh'></i> Seed Defaults
                    </button>
                </div>
            `;
        } else {
            renderCategoryList();
        }
    } else {
        list.innerHTML = `<div style="padding:20px; text-align:center; color:#ef4444; font-size:0.8rem;">Error: ${res.message}</div>`;
    }
}

window.seedInitialCategories = async () => {
    const defaults = [
        { name: 'Student Welfare Services', icon_class: 'bx-heart', description: 'Services ensuring students basic needs and well-being.' },
        { name: 'Student Development Services', icon_class: 'bx-group', description: 'Services focusing on enhancing skills and engagement.' },
        { name: 'Institutional Student Programs and Services', icon_class: 'bx-building-house', description: 'Required support services provided by the institution.' }
    ];
    
    // Refresh local list first
    const refreshRes = await api('getServiceCategories');
    const existingNames = (refreshRes.categories || refreshRes.data || []).map(c => c.name);
    
    for (const cat of defaults) {
        if (!existingNames.includes(cat.name)) {
            await api('addServiceCategory', cat);
        }
    }
    await loadCategories();
};

function renderCategoryList() {
    const list = document.getElementById('category-list');
    if (!list) return;
    
    list.innerHTML = (categories || []).map(c => `
        <div class="nav-item-wrapper" style="position:relative; margin-bottom:5px;">
            <div class="nav-item ${currentCategoryId === c.id ? 'active' : ''}" onclick="selectCategory('${c.id}')">
                <i class='bx ${c.icon_class || 'bx-folder'}'></i>
                <span>${c.name}</span>
            </div>
            <div class="cat-delete-btn" onclick="deleteCategory(event, '${c.id}', '${c.name.replace(/'/g, "\\'")}')" title="Delete Category">
                <i class='bx bx-x'></i>
            </div>
        </div>
    `).join('');
}

window.deleteCategory = async (e, id, name) => {
    e.stopPropagation();
    
    // Check if it has offices (local check first if currently selected)
    let hasOffices = false;
    if (currentCategoryId === id && offices.length > 0) {
        hasOffices = true;
    } else {
        // Quick API check
        const res = await api('getOfficesByCategory', { categoryName: name });
        if (res.success && res.offices && res.offices.length > 0) {
            hasOffices = true;
        }
    }
    
    const warnMsg = hasOffices ? 
        `WARNING: This category "${name}" contains ${offices.length} offices. Deleting it will NOT delete the offices (they will become orphaned), but the category will be gone. Continue?` : 
        `Are you sure you want to delete the category "${name}"?`;
        
    if (!confirm(warnMsg)) return;
    
    const delRes = await api('deleteServiceCategory', { id });
    if (delRes.success) {
        if (currentCategoryId === id) {
            currentCategoryId = null;
            document.getElementById('view-title').innerText = "Select a Category";
            document.getElementById('category-actions').classList.add('hidden');
            document.getElementById('office-grid').innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-category'></i>
                    <h3>No Category Selected</h3>
                    <p>Choose a category from the sidebar to manage its offices.</p>
                </div>
            `;
        }
        await loadCategories();
    } else {
        alert("Error deleting category: " + delRes.message);
    }
};

window.selectCategory = async (id) => {
    currentCategoryId = id;
    renderCategoryList();
    const cat = categories.find(c => c.id === id);
    document.getElementById('view-title').innerText = cat.name;
    document.getElementById('view-subtitle').innerText = cat.description || '';
    document.getElementById('category-actions').classList.remove('hidden');
    
    await loadOffices(id);
};

// Offices
async function loadOffices(categoryId) {
    const grid = document.getElementById('office-grid');
    grid.innerHTML = '<div class="empty-state"><i class="bx bx-loader-alt bx-spin"></i><p>Loading offices...</p></div>';
    
    const res = await api('getOfficesByCategory', { categoryId });
    if (res.success) {
        offices = res.offices;
        renderOfficeGrid();
    }
}

function renderOfficeGrid() {
    const grid = document.getElementById('office-grid');
    if (offices.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class='bx bx-buildings'></i>
                <h3>No Offices Found</h3>
                <p>Click "Add Office" to start populating this category.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = offices.map(off => `
        <div class="office-card" onclick="previewOffice('${off.id}', '${off.name}')">
            <div class="office-actions">
                <div class="action-btn" onclick="event.stopPropagation(); editOffice('${off.id}')"><i class='bx bx-edit-alt'></i></div>
                <div class="action-btn delete" onclick="event.stopPropagation(); deleteOffice('${off.id}')"><i class='bx bx-trash'></i></div>
            </div>
            <h3>${off.name}</h3>
            <p>${off.info || 'No info provided.'}</p>
            <div style="margin-top:15px; font-size:0.7rem; font-weight:700; color:var(--nbsc-blue); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:4px;">
                <i class='bx bx-show'></i> Click to Preview
            </div>
        </div>
    `).join('');
}

window.previewOffice = async (id, name) => {
    const grid = document.getElementById('office-grid');
    const header = document.getElementById('view-title-container');
    const actions = document.getElementById('category-actions');
    const preview = document.getElementById('preview-view');
    
    grid.classList.add('hidden');
    header.classList.add('hidden');
    actions.classList.add('hidden');
    preview.classList.remove('hidden');
    
    document.getElementById('prev-title').innerText = "Loading...";
    document.getElementById('prev-info').innerText = "";
    document.getElementById('prev-body').innerText = "";
    document.getElementById('prev-docs').innerHTML = "";
    document.getElementById('prev-activities').innerHTML = "";

    const res = await api('getOfficeDetails', { officeId: id });
    if (res.success) {
        document.getElementById('prev-title').innerText = res.office.name;
        document.getElementById('prev-info').innerText = res.office.info || '';
        document.getElementById('prev-body').innerText = res.office.office_body || '';
        
        document.getElementById('prev-docs').innerHTML = res.docs.map(d => `
            <a href="${d.url}" target="_blank" style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-decoration:none; color:var(--text); font-weight:600; font-size:.9rem;">
                <i class='bx bxs-file-pdf' style="color:#ef4444; font-size:1.3rem;"></i>
                <span>${d.title}</span>
            </a>
        `).join('') || '<p style="color:var(--text-muted); font-size:.9rem;">No documents.</p>';

        document.getElementById('prev-activities').innerHTML = res.activities.map(a => `
            <div style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                <div style="font-size:0.7rem; color:var(--nbsc-blue); font-weight:700; margin-bottom:4px;">${a.activity_date}</div>
                <div style="font-weight:700; font-size:0.9rem; color:var(--text);">${a.title}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${a.description || ''}</div>
            </div>
        `).join('') || '<p style="color:var(--text-muted); font-size:.9rem;">No recent activities.</p>';
    }
};

window.closePreview = () => {
    document.getElementById('preview-view').classList.add('hidden');
    document.getElementById('office-grid').classList.remove('hidden');
    document.getElementById('view-title-container').classList.remove('hidden');
    document.getElementById('category-actions').classList.remove('hidden');
};

// Modals & Forms
window.openCategoryModal = () => {
    document.getElementById('cat-modal-title').innerText = "New Category";
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = "";
    document.getElementById('category-modal').classList.add('active');
};

window.editCurrentCategory = () => {
    const cat = categories.find(c => c.id === currentCategoryId);
    if (!cat) return;
    document.getElementById('cat-modal-title').innerText = "Edit Category";
    document.getElementById('cat-id').value = cat.id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-icon').value = cat.icon_class;
    document.getElementById('cat-desc').value = cat.description;
    document.getElementById('category-modal').classList.add('active');
};

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const payload = {
        name: document.getElementById('cat-name').value,
        icon_class: document.getElementById('cat-icon').value,
        description: document.getElementById('cat-desc').value
    };
    
    const action = id ? 'updateServiceCategory' : 'addServiceCategory';
    if (id) payload.id = id;
    
    const res = await api(action, payload);
    if (res.success) {
        closeModals();
        await loadCategories();
    } else {
        alert("Error: " + res.message);
    }
}

window.openOfficeModal = () => {
    document.getElementById('off-modal-title').innerText = "New Office";
    document.getElementById('office-form').reset();
    document.getElementById('off-id').value = "";
    document.getElementById('office-modal').classList.add('active');
};

window.editOffice = async (id) => {
    const off = offices.find(o => o.id === id);
    if (!off) return;
    
    document.getElementById('off-modal-title').innerText = "Edit Office: " + off.name;
    document.getElementById('off-id').value = off.id;
    document.getElementById('off-name').value = off.name;
    document.getElementById('off-info').value = off.info;
    document.getElementById('off-body').value = off.office_body;
    
    // Switch to first tab and show modal
    switchOfficeTab('info');
    document.getElementById('office-modal').classList.add('active');
    
    // Load existing docs and activities
    await loadOfficeContent(id);
};

// Tab Management
window.switchOfficeTab = (tabId) => {
    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
        t.style.color = t.dataset.tab === tabId ? 'var(--nbsc-blue)' : 'var(--text-muted)';
        t.style.borderBottom = t.dataset.tab === tabId ? '2px solid var(--nbsc-blue)' : 'none';
    });
    document.querySelectorAll('.office-tab-content').forEach(c => {
        c.classList.toggle('hidden', c.dataset.tab !== tabId);
    });
};

// Content Loading
async function loadOfficeContent(officeId) {
    const res = await api('getOfficeDetails', { officeId });
    if (res.success) {
        renderModalDocs(res.docs);
        renderModalActivities(res.activities);
    }
}

function renderModalDocs(docs) {
    const list = document.getElementById('modal-docs-list');
    if (!docs || docs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No documents uploaded yet.</p>';
        return;
    }
    list.innerHTML = docs.map(d => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#fff; border:1px solid var(--border); border-radius:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <i class='bx bxs-file-pdf' style="color:#ef4444; font-size:1.5rem;"></i>
                <span style="font-weight:600;">${d.title}</span>
            </div>
            <div style="display:flex; gap:8px;">
                <a href="${d.url}" target="_blank" class="action-btn"><i class='bx bx-link-external'></i></a>
                <div class="action-btn delete" onclick="deleteOfficeDoc('${d.id}')"><i class='bx bx-trash'></i></div>
            </div>
        </div>
    `).join('');
}

function renderModalActivities(acts) {
    const list = document.getElementById('modal-activities-list');
    if (!acts || acts.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No activities recorded yet.</p>';
        return;
    }
    list.innerHTML = acts.map(a => `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:15px; background:#fff; border:1px solid var(--border); border-radius:10px; margin-bottom:12px;">
            <div>
                <div style="font-size:0.75rem; color:var(--nbsc-blue); font-weight:700;">${a.activity_date}</div>
                <div style="font-weight:700; margin:4px 0;">${a.title}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${a.description || ''}</div>
            </div>
            <div class="action-btn delete" onclick="deleteOfficeActivity('${a.id}')"><i class='bx bx-trash'></i></div>
        </div>
    `).join('');
}

// Upload & Add Logic
window.uploadOfficeDoc = async () => {
    const title = document.getElementById('new-doc-title').value;
    const fileInput = document.getElementById('new-doc-file');
    const officeId = document.getElementById('off-id').value;
    
    if (!title || !fileInput.files[0]) return alert("Title and file required.");
    
    const btn = document.getElementById('btn-upload-doc');
    btn.disabled = true;
    btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";
    
    try {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            const fileData = e.target.result;
            // 1. Upload to Drive
            const uploadRes = await api('uploadFileToDrive', { 
                fileData, 
                fileName: file.name,
                username: getSession().username
            });
            
            if (uploadRes.success) {
                // 2. Save metadata to Office Docs
                const saveRes = await api('addOfficeDoc', {
                    office_id: officeId,
                    title: title,
                    url: uploadRes.fileUrl
                });
                
                if (saveRes.success) {
                    document.getElementById('new-doc-title').value = "";
                    document.getElementById('new-doc-file').value = "";
                    await loadOfficeContent(officeId);
                } else {
                    alert("Error saving metadata: " + saveRes.message);
                }
            } else {
                alert("Upload failed: " + uploadRes.message);
            }
            btn.disabled = false;
            btn.innerText = "Upload";
        };
        reader.readAsDataURL(file);
    } catch (e) {
        alert("Upload Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Upload";
    }
};

window.addOfficeActivity = async () => {
    const officeId = document.getElementById('off-id').value;
    const title = document.getElementById('new-act-title').value;
    const date = document.getElementById('new-act-date').value;
    const desc = document.getElementById('new-act-desc').value;
    
    if (!title || !date) return alert("Title and date required.");
    
    const btn = document.getElementById('btn-add-act');
    btn.disabled = true;
    
    const res = await api('addOfficeActivity', {
        office_id: officeId,
        title,
        activity_date: date,
        description: desc
    });
    
    if (res.success) {
        document.getElementById('new-act-title').value = "";
        document.getElementById('new-act-date').value = "";
        document.getElementById('new-act-desc').value = "";
        await loadOfficeContent(officeId);
    } else {
        alert("Error: " + res.message);
    }
    btn.disabled = false;
};

window.deleteOfficeDoc = async (id) => {
    if (!confirm("Delete this document?")) return;
    const res = await api('deleteOfficeDoc', { id });
    if (res.success) await loadOfficeContent(document.getElementById('off-id').value);
};

window.deleteOfficeActivity = async (id) => {
    if (!confirm("Delete this activity?")) return;
    const res = await api('deleteOfficeActivity', { id });
    if (res.success) await loadOfficeContent(document.getElementById('off-id').value);
};

async function handleOfficeSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('off-id').value;
    const payload = {
        category_id: currentCategoryId,
        name: document.getElementById('off-name').value,
        info: document.getElementById('off-info').value,
        office_body: document.getElementById('off-body').value
    };
    
    const action = id ? 'updateOffice' : 'addOffice';
    if (id) payload.id = id;
    
    const res = await api(action, payload);
    if (res.success) {
        if (!id) closeModals(); // Close only if it's a new office
        await loadOffices(currentCategoryId);
    } else {
        alert("Error: " + res.message);
    }
}

window.deleteOffice = async (id) => {
    if (!confirm("Are you sure you want to delete this office?")) return;
    const res = await api('deleteOffice', { id });
    if (res.success) {
        await loadOffices(currentCategoryId);
    } else {
        alert("Error: " + res.message);
    }
};

window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
};

