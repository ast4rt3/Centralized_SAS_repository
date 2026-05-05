// File Hub Logic - Unified Vanilla Version
let currentUser = null;
let accessToken = null;
let tokenClient = null;
let sasFolderId = null;
let allFiles = [];
let currentFilter = 'all';

// Constants
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get user from Portal (via URL param or session)
    const urlParams = new URLSearchParams(window.location.search);
    currentUser = urlParams.get('portalUser') || 'Anonymous';
    
    initGIS();
    initEventListeners();
    loadFiles();
});

function initGIS() {
    // Initialize the Google Identity Services client
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '772922718131-77r3167m88k4e3r75d862f92r4268e0a.apps.googleusercontent.com', // Using the same client ID
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) {
                console.error("GIS Error:", response);
                return;
            }
            accessToken = response.access_token;
            handlePostAuth();
        },
    });

    // Check if we have a valid token in memory or storage
    const savedToken = localStorage.getItem('sas_drive_token');
    const tokenExpiry = localStorage.getItem('sas_drive_token_expiry');

    if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        accessToken = savedToken;
        handlePostAuth();
    }
}

// Make connectDrive global for the status pill
window.connectDrive = () => {
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

async function handlePostAuth() {
    // Save token
    localStorage.setItem('sas_drive_token', accessToken);
    localStorage.setItem('sas_drive_token_expiry', (Date.now() + 3600 * 1000).toString());

    // Update UI Status
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const uploadBtn = document.getElementById('open-upload-btn');

    statusPill.className = 'status-pill connected';
    statusText.innerText = 'Connected';
    uploadBtn.disabled = false;

    // Find or create SAS folder
    findOrCreateSASFolder();
}

function initEventListeners() {
    // Open Modal
    document.getElementById('open-upload-btn').addEventListener('click', () => {
        document.getElementById('upload-modal').style.display = 'flex';
    });

    // Close Modal
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('upload-modal').style.display = 'none';
    });

    // Form Submit
    document.getElementById('upload-form').addEventListener('submit', handleFileUpload);
}

async function loadFiles() {
    try {
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getFiles', username: currentUser })
        });
        const data = await res.json();
        if (data.success) {
            allFiles = data.files;
            renderFiles();
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

function renderFiles() {
    const container = document.getElementById('file-container');
    const filtered = allFiles.filter(f => currentFilter === 'all' || f.category === currentFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-bottom: 16px;"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1"/></svg>
                <p style="font-size: 18px; font-weight: 600; color: var(--slate-400);">No files found</p>
                <p style="font-size: 14px;">Connect your drive and start uploading.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="file-grid"></div>`;
    const grid = container.querySelector('.file-grid');

    filtered.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="file-icon-box">
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="1.5"/></svg>
                <span class="category-tag">${file.category}</span>
            </div>
            <div class="file-info">
                <h3 title="${file.file_name}">${file.file_name}</h3>
                <p>${new Date(file.created_at).toLocaleDateString()}</p>
            </div>
            <div class="file-footer">
                <div class="privacy-tag ${file.is_public ? 'public' : 'private'}">
                    <span class="status-dot"></span>
                    ${file.is_public ? 'PUBLIC' : 'PRIVATE'}
                </div>
                <a href="${file.file_url}" target="_blank" class="btn-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

function setFilter(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(category) || (category === 'all' && btn.innerText.includes('All'))) {
            btn.classList.add('active');
        }
    });
    renderFiles();
}

async function findOrCreateSASFolder() {
    try {
        const query = "name = 'SAS Portal Documents' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        
        if (data.files && data.files.length > 0) {
            sasFolderId = data.files[0].id;
        } else {
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'SAS Portal Documents',
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            const folder = await createRes.json();
            sasFolderId = folder.id;
        }
    } catch (e) {
        console.error("Drive Folder Sync Error:", e);
    }
}

async function handleFileUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('file');
    const category = formData.get('category');
    const isPublic = formData.get('isPublic') === 'on';

    if (!file || !accessToken || !sasFolderId) return;

    const submitBtn = document.getElementById('submit-upload-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Uploading...';

    try {
        // 1. Upload to Drive (Multipart)
        const metadata = {
            name: file.name,
            parents: [sasFolderId]
        };

        const driveFormData = new FormData();
        driveFormData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        driveFormData.append('file', file);

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: driveFormData
        });
        
        const driveFile = await uploadRes.json();
        
        if (!driveFile.id) throw new Error("Drive upload failed");

        // 2. Set Public Permissions if needed
        if (isPublic) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: 'reader', type: 'anyone' })
            });
        }

        // 3. Save Metadata to Supabase via GAS
        const fileUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
        const gasPayload = {
            action: 'uploadFileMetadata',
            username: currentUser,
            fileName: file.name,
            driveFileId: driveFile.id,
            fileUrl: fileUrl,
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
        alert("File uploaded successfully!");
    } catch (err) {
        console.error("Upload Error:", err);
        alert("Upload failed. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Upload to Drive';
    }
}
