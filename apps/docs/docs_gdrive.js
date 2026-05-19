// Documents App - GDrive Adapter & Backend Proxy
let docsAllFiles = [];
let docsCurrentFilter = 'all';

function docsLoadFiles() {
    if (!window.ENV || !window.ENV.BACKEND_GAS_URL) {
        setTimeout(docsLoadFiles, 1000);
        return;
    }

    fetch(window.ENV.BACKEND_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getDocuments', username: window.docsState?.currentUser })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            docsAllFiles = data.documents || [];
            window.docsState.allFiles = docsAllFiles;
            docsRenderFiles();
        } else {
            console.error("Backend Error:", data.message);
        }
    })
    .catch(err => {
        console.error("Load Error:", err);
        const container = document.getElementById('docs-grid');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding-top: 100px;">
                    <svg width="80" height="80" fill="none" stroke="rgba(255,255,255,0.05)" viewBox="0 0 24 24" style="margin-bottom: 20px;">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1"/>
                    </svg>
                    <p style="font-size: 18px; font-weight: 700; color: var(--text-muted);">Connection Failed</p>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.2);">Check your network and try again.</p>
                </div>
            `;
        }
    });
}

function docsRenderFiles() {
    const container = document.getElementById('docs-grid');
    if (!container) return;

    const filtered = docsAllFiles.filter(f => docsCurrentFilter === 'all' || f.category === docsCurrentFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding-top: 100px;">
                <svg width="80" height="80" fill="none" stroke="rgba(255,255,255,0.05)" viewBox="0 0 24 24" style="margin-bottom: 20px;">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1"/>
                </svg>
                <p style="font-size: 18px; font-weight: 700; color: var(--text-muted);">No documents found</p>
                <p style="font-size: 14px; color: rgba(255,255,255,0.2);">Upload your first document to get started.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    filtered.forEach(file => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (e.target.closest('.btn-action')) return;
            docsShowDocDetails(file);
        };

        card.innerHTML = `
            <div class="doc-icon-box">
                <svg width="46" height="46" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="1.2"/>
                </svg>
                <span class="category-tag">${file.category}</span>
            </div>
            <div class="doc-info">
                <h3 title="${file.file_name}">${file.file_name}</h3>
                <p>Uploaded ${new Date(file.created_at).toLocaleDateString()}</p>
            </div>
            <div class="doc-footer">
                <div class="privacy-tag ${file.is_public ? 'public' : 'private'}">
                    <span class="status-dot"></span>
                    ${file.is_public ? 'PUBLIC ACCESS' : 'PRIVATE VAULT'}
                </div>
                <div class="doc-actions">
                    <button onclick="event.stopPropagation(); docsPreviewDocument('${file.id}', '${file.file_url}', '${file.file_name}')" class="btn-action view" title="Preview">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); docsDeleteDocument('${file.id}', '${file.drive_file_id}')" class="btn-action delete" title="Delete">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function docsSetFilter(category) {
    docsCurrentFilter = category;
    window.docsState.currentFilter = category;
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.remove('active');
        if (pill.getAttribute('data-cat') === category) {
            pill.classList.add('active');
        }
    });
    docsRenderFiles();
}

async function docsFindOrCreateSASFolder() {
    const token = docsGetAccessToken();
    try {
        const query = "name = 'SAS Portal Documents' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.files && data.files.length > 0) {
            window.docsSasFolderId = data.files[0].id;
        } else {
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'SAS Portal Documents',
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            const folder = await createRes.json();
            window.docsSasFolderId = folder.id;
        }
    } catch (e) {
        console.error("Drive Folder Sync Error:", e);
    }
}

function docsShowDocDetails(file) {
    window.docsState.currentSelectedFile = file;
    const panel = document.getElementById('details-panel');
    const table = document.getElementById('details-table');
    const title = document.getElementById('details-title');
    const previewContainer = document.getElementById('details-preview-container');
    const openBtn = document.getElementById('details-open-btn');
    const visibilityBtn = document.getElementById('details-visibility-btn');

    title.innerText = file.file_name;

    if (visibilityBtn) {
        visibilityBtn.onclick = () => docsToggleDocVisibility(file.id, !file.is_public);
        visibilityBtn.innerHTML = file.is_public ? 
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> Make Private` :
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Make Public`;
    }

    openBtn.onclick = () => window.open(file.file_url, '_blank');

    let embedUrl = file.file_url;
    if (file.file_url.includes('drive.google.com')) {
        embedUrl = file.file_url.replace('/view', '/preview');
    }

    previewContainer.innerHTML = `<iframe class="details-preview-frame" src="${embedUrl}"></iframe>`;

    const details = [
        { label: "Type", value: file.category || "Document" },
        { label: "Size", value: file.size ? formatBytes(file.size) : "Unknown" },
        { label: "Location", value: "SAS Portal Documents" },
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

async function docsPreviewDocument(id, url, name) {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    const title = document.getElementById('preview-title');
    const meta = document.getElementById('preview-meta');

    title.innerText = name;
    meta.innerText = `Document preview`;

    let embedUrl = url;
    if (url.includes('drive.google.com')) {
        embedUrl = url.replace('/view', '/preview');
    }

    frame.src = embedUrl;
    modal.style.display = 'flex';
}

async function docsDeleteDocument(id, driveId) {
    const confirmed = await showConfirm(
        "Delete Document",
        "Are you sure you want to permanently delete this document from your Drive?"
    );
    if (!confirmed) return;

    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteDocument',
                id: id,
                driveFileId: driveId
            })
        });
        const data = await res.json();
        if (data.success) {
            docsLoadFiles();
            showToast("Document deleted successfully", "success");
        } else {
            showToast("Error: " + data.message, "error");
        }
    } catch (err) {
        console.error("Delete Error:", err);
        showToast("Connection failed", "error");
    }
}

async function docsToggleDocVisibility(id, makePublic) {
    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'toggleDocVisibility',
                id: id,
                isPublic: makePublic
            })
        });
        const data = await res.json();
        if (data.success) {
            docsLoadFiles();
            showToast(`Document ${makePublic ? 'made public' : 'made private'}`, "success");
        }
    } catch (err) {
        showToast("Failed to update visibility", "error");
    }
}

async function docsEditDescription(id) {
    const file = docsAllFiles.find(f => f.id === id);
    if (!file) return;
    
    const newDesc = prompt("Edit description:", file.description || '');
    if (newDesc === null) return;

    window.docsState.currentSelectedFile.description = newDesc;
    docsSaveDescription(id, newDesc);
}

async function docsSaveDescription(id, description) {
    try {
        await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'editDocDesc',
                id: id,
                description: description
            })
        });
        showToast("Description updated", "success");
    } catch (err) {
        showToast("Failed to update description", "error");
    }
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

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function docsGetAccessToken() {
    return window.docsAccessToken || localStorage.getItem('sas_drive_token');
}

// Expose to window for HTML handlers and module access
window.docsGDrive = {
    loadFiles: docsLoadFiles,
    renderFiles: docsRenderFiles,
    setFilter: docsSetFilter,
    findOrCreateSASFolder: docsFindOrCreateSASFolder,
    getAccessToken: docsGetAccessToken
};

window.docsLoadFiles = docsLoadFiles;
window.docsRenderFiles = docsRenderFiles;
window.docsSetFilter = docsSetFilter;
window.docsShowDocDetails = docsShowDocDetails;
window.docsPreviewDocument = docsPreviewDocument;
window.docsDeleteDocument = docsDeleteDocument;
window.docsEditDescription = docsEditDescription;
window.docsSaveDescription = docsSaveDescription;
window.docsToggleDocVisibility = docsToggleDocVisibility;