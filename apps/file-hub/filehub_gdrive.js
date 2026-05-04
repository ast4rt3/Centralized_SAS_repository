// File Hub Logic - Centralized GDrive (via GAS Proxy)
let currentUser = null;


let allFiles = [];
let currentCategory = 'all';
let currentFiles = [];
let currentViewMode = localStorage.getItem('filehub_view_mode') || 'medium'; // Persistence
let currentSelectedFile = null;



let currentFilter = 'all';
let allUsers = [];
let selectedShareUser = null;


document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect Theme from Portal
    const savedUser = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (savedUser) {
        try {
            const data = JSON.parse(savedUser);
            if (data.theme === 'light') {
                document.body.classList.add('light-mode');
            }
        } catch (e) { }
    }

    // 2. Identify User
    const urlParams = new URLSearchParams(window.location.search);
    const portalUser = urlParams.get('portalUser');

    if (portalUser) {
        currentUser = portalUser;
    } else if (window.myUsername) {
        currentUser = window.myUsername;
    } else if (window.parent && window.parent.myUsername) {
        currentUser = window.parent.myUsername;
    } else if (savedUser) {
        try {
            const userObj = JSON.parse(savedUser);
            currentUser = userObj.username || 'Anonymous';
        } catch (e) { currentUser = 'Anonymous'; }
    } else {
        currentUser = 'Anonymous';
    }

    // --- VIEW MODE HANDLING ---
    const viewMenuBtn = document.getElementById('view-menu-btn');
    const viewMenuDropdown = document.getElementById('view-menu-dropdown');
    const viewOptions = document.querySelectorAll('.view-option');
    const fileGrid = document.getElementById('file-grid');

    // Apply initial view mode
    if (fileGrid) {
        applyViewMode(currentViewMode);
        updateViewActiveState(currentViewMode);
    }



    if (viewMenuBtn) {
        viewMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewMenuDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        if (viewMenuDropdown) viewMenuDropdown.classList.remove('show');
    });

    viewOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.view;
            currentViewMode = mode;
            localStorage.setItem('filehub_view_mode', mode);

            // Re-render to apply the new view mode class and structure
            renderFiles();

            updateViewActiveState(mode);
            updateViewLabel(mode);
            if (viewMenuDropdown) viewMenuDropdown.classList.remove('show');
        });
    });

    function applyViewMode(mode) {
        if (!fileGrid) return;
        // Remove all view classes first
        fileGrid.classList.remove('list-view', 'small-grid', 'medium-grid', 'large-grid', 'xl-grid');

        if (mode === 'list') {
            fileGrid.classList.add('list-view');
        } else {
            fileGrid.classList.add(`${mode}-grid`);
        }
        updateViewLabel(mode);
    }

    function updateViewLabel(mode) {
        const label = document.getElementById('current-view-label');
        if (!label) return;
        const names = { 'xl': 'Extra Large', 'large': 'Large', 'medium': 'Medium', 'small': 'Small', 'list': 'List' };
        label.innerText = names[mode] || 'Medium';
    }



    function updateViewActiveState(mode) {
        viewOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.view === mode);
        });
    }

    initEventListeners();
    setTimeout(loadFiles, 500);
});

function initEventListeners() {
    // Open Modal
    const openBtn = document.getElementById('open-upload-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('upload-modal').style.display = 'flex';
        });
    }

    // Close Modal
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('upload-modal').style.display = 'none';
        });
    }

    // Form Submit
    const form = document.getElementById('upload-form');
    if (form) {
        form.addEventListener('submit', handleFileUpload);
    }

    // Share Search
    const shareInput = document.getElementById('share-username');
    if (shareInput) {
        shareInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                document.getElementById('share-user-results').classList.remove('show');
                return;
            }
            const filtered = allUsers.filter(u => 
                u.username.toLowerCase().includes(query) || 
                u.displayName.toLowerCase().includes(query)
            );
            renderUserSearch(filtered);
        });
    }
}


async function loadFiles() {
    if (!window.ENV || !window.ENV.BACKEND_GAS_URL) {
        setTimeout(loadFiles, 1000);
        return;
    }

    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ action: 'getFiles', username: currentUser })
        });
        const data = await res.json();
        if (data.success) {
            allFiles = data.files || [];
            renderFiles();
        } else {
            console.error("Backend Error:", data.message);
            const container = document.getElementById('file-grid');
            if (container) {
                container.innerHTML = `<div class="empty-state"><p style="color: #ff4d4d;">Database Connection Error</p><p style="font-size: 13px;">${data.message}</p></div>`;
            }
        }
    } catch (e) {

        console.error("Fetch Exception:", e);
        const container = document.getElementById('file-grid');
        if (container) {
            container.innerHTML = `<div class="empty-state"><p>Connection Failed. Check your network.</p></div>`;
        }
    }
}




function renderFiles() {
    const container = document.getElementById('file-grid');
    if (!container) return;




    const filtered = allFiles.filter(f => currentFilter === 'all' || f.category === currentFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding-top: 100px;">
                <svg width="80" height="80" fill="none" stroke="rgba(255,255,255,0.05)" viewBox="0 0 24 24" style="margin-bottom: 20px;"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1"/></svg>
                <p style="font-size: 18px; font-weight: 700; color: var(--text-muted);">No documents in this vault</p>
                <p style="font-size: 14px; color: rgba(255,255,255,0.2);">Start uploading to your personal storage.</p>
            </div>
        `;
        return;
    }

    // Apply the current view mode class to the container itself
    container.classList.remove('list-view', 'small-grid', 'medium-grid', 'large-grid', 'xl-grid');
    if (currentViewMode === 'list') {
        container.classList.add('list-view');
    } else {
        container.classList.add(`${currentViewMode}-grid`);
    }

    container.innerHTML = "";

    const grid = container;

    filtered.forEach(file => {
        const card = document.createElement('div');
        card.className = `file-card ${currentSelectedFile && currentSelectedFile.id === file.id ? 'selected' : ''}`;
        card.style.cursor = 'pointer';

        // Single Click: Show Details
        card.onclick = (e) => {
            if (e.target.closest('.btn-action')) return;
            showFileDetails(file);

            // Highlight selected card
            document.querySelectorAll('.file-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };

        // Double Click: Full Preview
        card.ondblclick = (e) => {
            if (e.target.closest('.btn-action')) return;
            previewFile(file.file_url, file.file_name, new Date(file.created_at).toLocaleDateString());
        };

        card.innerHTML = `
            <div class="file-icon-box">
                <svg width="46" height="46" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="1.2"/></svg>
                <span class="category-tag">${file.category}</span>
            </div>
            <div class="file-info">
                <h3 title="${file.file_name}">${file.file_name}</h3>
                <p>Uploaded ${new Date(file.created_at).toLocaleDateString()}</p>
            </div>
            <div class="file-footer">
                <div class="privacy-tag ${file.is_public ? 'public' : 'private'}">
                    <span class="status-dot"></span>
                    ${file.is_public ? 'PUBLIC ACCESS' : 'PRIVATE VAULT'}
                </div>
                <div class="file-actions">
                    <a href="${file.file_url}" target="_blank" class="btn-action view" title="Open Document" onclick="event.stopPropagation()">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                    </a>
                    <button onclick="event.stopPropagation(); deleteFile('${file.id}', '${file.drive_file_id}')" class="btn-action delete" title="Delete Permanent">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


function previewFile(url, name, date) {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    const title = document.getElementById('preview-title');
    const meta = document.getElementById('preview-meta');

    title.innerText = name;
    meta.innerText = `Uploaded on ${date}`;

    // Ensure the Drive URL is in 'preview' or 'view' mode for embedding
    let embedUrl = url;
    if (url.includes('drive.google.com')) {
        // Transform standard view URL to a clean preview URL for iframe
        embedUrl = url.replace('/view', '/preview');
    }

    frame.src = embedUrl;
    modal.style.display = 'flex';
}

function closePreview() {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');

    modal.style.display = 'none';
    frame.src = 'about:blank';
}


async function deleteFile(id, driveId) {
    const confirmed = await showConfirm(
        "Delete Permanent",
        "Are you sure you want to permanently delete this document from your vault and Google Drive?"
    );
    if (!confirmed) return;

    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteFileFromDrive',
                id: id,
                driveFileId: driveId
            })
        });
        const data = await res.json();
        if (data.success) {
            loadFiles();
            showToast("Document deleted successfully", "success");
        } else {
            showToast("Error: " + data.message, "error");
        }
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Connection failed", "error");
    }
}

// Custom Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-msg');

        titleEl.innerText = title;
        msgEl.innerText = message;
        modal.style.display = 'flex';

        const cleanup = (result) => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        };

        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
    });
}



window.setFilter = (category) => {
    currentFilter = category;
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.remove('active');
        if (pill.getAttribute('data-cat') === category) {
            pill.classList.add('active');
        }
    });
    renderFiles();
};

async function handleFileUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('file');
    const category = formData.get('category');
    const isPublic = formData.get('isPublic') === 'on';

    if (!file) return;

    const submitBtn = document.getElementById('submit-upload-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Uploading...';

    // 1. Read file as Base64
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const base64Data = reader.result;

            // 2. Upload to Drive via GAS
            const uploadRes = await fetch(window.ENV.BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadFileToDrive',
                    fileData: base64Data,
                    fileName: file.name,
                    username: currentUser,
                    category: category
                })
            });
            const uploadResult = await uploadRes.json();

            if (!uploadResult.success) throw new Error(uploadResult.message);

            // 3. Save Metadata to Supabase via GAS
            const gasPayload = {
                action: 'uploadFileMetadata',
                username: currentUser,
                fileName: file.name,
                driveFileId: uploadResult.fileId,
                fileUrl: uploadResult.fileUrl,
                isPublic: isPublic,
                category: category
            };

            await fetch(window.ENV.BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify(gasPayload)
            });

            document.getElementById('upload-modal').style.display = 'none';
            e.target.reset();
            loadFiles();
            showToast("Document uploaded successfully to your Drive!", "success");
        } catch (err) {
            console.error("Upload Error:", err);
            showToast("Upload failed: " + err.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Upload File';
        }
    };
    reader.readAsDataURL(file);
}

function showFileDetails(file) {
    window.currentSelectedFile = file;
    const panel = document.getElementById('details-panel');
    const table = document.getElementById('details-table');
    const title = document.getElementById('details-title');
    const previewContainer = document.getElementById('details-preview-container');
    const openBtn = document.getElementById('details-open-btn');
    const shareBtn = document.getElementById('details-share-btn');

    title.innerText = file.file_name;

    // Only owner can share
    console.log("Checking Share Permissions:", { fileOwner: file.username, currentUser: currentUser });
    if (file.username === currentUser) {
        shareBtn.style.display = 'flex';
    } else {
        shareBtn.style.display = 'none';
    }



    // Set up Open Externally button

    openBtn.onclick = () => window.open(file.file_url, '_blank');

    // Create Mini Preview Iframe
    let embedUrl = file.file_url;
    if (file.file_url.includes('drive.google.com')) {
        embedUrl = file.file_url.replace('/view', '/preview');
    }

    previewContainer.innerHTML = `<iframe class="details-preview-frame" src="${embedUrl}"></iframe>`;

    const details = [
        { label: "Type", value: file.category || "Document" },
        { label: "Size", value: file.size ? formatBytes(file.size) : "Unknown" },
        { label: "Location", value: "SAS Secure Cloud" },
        { label: "Modified", value: new Date(file.created_at).toLocaleString() },
        { label: "Status", value: file.is_public ? "Publicly Shared" : "Private Vault" }
    ];

    table.innerHTML = details.map(d => `
        <div class="details-row">
            <span class="details-label">${d.label}</span>
            <span class="details-value">${d.value}</span>
        </div>
    `).join('');

    panel.style.display = 'flex';
}

function openShareModal() {
    if (!window.currentSelectedFile) return;
    document.getElementById('share-modal').style.display = 'flex';
    document.getElementById('share-username').value = '';
    document.getElementById('share-user-results').classList.remove('show');
    selectedShareUser = null;
    document.getElementById('share-username').focus();
    if (allUsers.length === 0) fetchUsers();
}

function closeShareModal() {
    document.getElementById('share-modal').style.display = 'none';
}

async function fetchUsers() {

    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getUsers' })
        });
        const data = await res.json();
        if (data.success) {
            allUsers = data.users || [];
        }
    } catch (err) {
        console.error("Fetch Users Error:", err);
    }
}

function renderUserSearch(users) {
    const box = document.getElementById('share-user-results');
    if (users.length === 0) {
        box.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 13px;">No users found</div>';
    } else {
        box.innerHTML = users.map(u => `
            <div class="user-search-item" onclick="selectUser('${u.username}')">
                <img src="${u.profilePic || '../../assets/sas_logo_real.png'}" onerror="this.src='../../assets/sas_logo_real.png'">
                <div style="display: flex; flex-direction: column;">
                    <span class="name">${u.displayName}</span>
                    <span class="uname">@${u.username}</span>
                </div>
            </div>
        `).join('');
    }
    box.classList.add('show');
}

function selectUser(username) {
    selectedShareUser = username;
    const input = document.getElementById('share-username');
    input.value = username;
    document.getElementById('share-user-results').classList.remove('show');
}

async function confirmShare() {
    const targetUser = selectedShareUser || document.getElementById('share-username').value.trim();

    if (!targetUser) {
        showToast("Please enter a username.", "error");
        return;
    }

    const file = window.currentSelectedFile;
    const rawData = localStorage.getItem('sas_user_data') || '{}';
    let sessionUser = currentUser;
    let sessionToken = '';
    try {
        const u = JSON.parse(rawData);
        if (u.username) sessionUser = u.username;
        if (u.token) sessionToken = u.token;
    } catch(e){}

    try {
        const payload = {
            action: 'shareFile',
            id: file.id,
            targetUser: targetUser,
            username: sessionUser,
            token: sessionToken
        };

        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, "success");
            closeShareModal();
        } else {
            showToast(result.message, "error");
        }
    } catch (err) {
        console.error("Share Error:", err);
        showToast("Failed to share file.", "error");
    }
}



function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Expose functions to window for HTML onclick handlers
window.closePreview = closePreview;
window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.confirmShare = confirmShare;
window.deleteFile = deleteFile;
window.selectUser = selectUser;
window.showFileDetails = showFileDetails;
window.previewFile = previewFile;


