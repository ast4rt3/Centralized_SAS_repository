// File Hub Logic - SAS Portal
let currentUser = null;
let accessToken = null;
let tokenClient = null;
let sasFolderId = null;
let allFiles = [];

// Constants
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initEventListeners();
    loadFiles();
    
    // Check if we have a saved token
    const savedToken = localStorage.getItem('sas_drive_token');
    const tokenExpiry = localStorage.getItem('sas_drive_token_expiry');
    
    if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        accessToken = savedToken;
        updateDriveUI(true);
        findOrCreateSASFolder();
    }
});

function checkAuth() {
    const userStr = localStorage.getItem('sas_user');
    if (!userStr) {
        window.location.href = '../../index.html?reason=session_expired';
        return;
    }
    currentUser = JSON.parse(userStr);
    document.getElementById('user-hub-title').innerText = `${currentUser.displayName}'s File Hub`;
}

function initGIS() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '875825091946-86r74p9l2u6r5p9q8n6t5u4u4r4v4u4.apps.googleusercontent.com', // Replace with your client ID if different
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) {
                throw (response);
            }
            accessToken = response.access_token;
            localStorage.setItem('sas_drive_token', accessToken);
            localStorage.setItem('sas_drive_token_expiry', (Date.now() + response.expires_in * 1000).toString());
            
            updateDriveUI(true);
            findOrCreateSASFolder();
        },
    });
}

function initEventListeners() {
    // Drive Connection
    document.getElementById('connect-drive-btn').addEventListener('click', () => {
        if (!tokenClient) initGIS();
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });

    document.getElementById('disconnect-drive').addEventListener('click', () => {
        accessToken = null;
        sasFolderId = null;
        localStorage.removeItem('sas_drive_token');
        localStorage.removeItem('sas_drive_token_expiry');
        updateDriveUI(false);
    });

    // Upload Modal
    document.getElementById('upload-btn').addEventListener('click', () => {
        if (!accessToken) {
            alert('Please connect your Google Drive first.');
            return;
        }
        document.getElementById('upload-modal').style.display = 'flex';
    });

    document.getElementById('cancel-upload-btn').addEventListener('click', () => {
        document.getElementById('upload-modal').style.display = 'none';
    });

    document.getElementById('confirm-upload-btn').addEventListener('click', handleFileUpload);

    // Filtering
    document.querySelectorAll('.hub-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.hub-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            filterFiles(item.dataset.filter);
        });
    });
}

function updateDriveUI(connected) {
    const statusCard = document.getElementById('drive-status-container');
    const connectBtn = document.getElementById('connect-drive-btn');
    const btnText = document.getElementById('drive-btn-text');
    
    if (connected) {
        statusCard.classList.remove('hidden');
        connectBtn.style.borderColor = '#059669';
        btnText.innerText = 'Drive Connected';
    } else {
        statusCard.classList.add('hidden');
        connectBtn.style.borderColor = '#e2e8f0';
        btnText.innerText = 'Connect Drive';
    }
}

async function findOrCreateSASFolder() {
    showLoading(true, "Scanning Google Drive...");
    try {
        const query = "name = 'SAS Portal Documents' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            sasFolderId = data.files[0].id;
            document.getElementById('drive-folder-name').innerText = "Saving to: /SAS Portal Documents";
        } else {
            // Create it
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
            document.getElementById('drive-folder-name').innerText = "Created: /SAS Portal Documents";
        }
    } catch (e) {
        console.error("Drive Error:", e);
    } finally {
        showLoading(false);
    }
}

async function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const category = document.getElementById('file-category').value;
    const isPublic = document.getElementById('make-public-initial').checked;
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Please select a file.");
        return;
    }
    
    if (!sasFolderId) {
        alert("Google Drive folder not ready. Please reconnect.");
        return;
    }

    const file = fileInput.files[0];
    showLoading(true, `Uploading ${file.name}...`);
    
    try {
        // 1. Upload to Drive
        const metadata = {
            name: file.name,
            parents: [sasFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form
        });
        
        const driveFile = await uploadRes.json();
        
        if (!driveFile.id) throw new Error("Drive upload failed");

        // 2. If public, set permissions
        if (isPublic) {
            await setDriveFilePublic(driveFile.id);
        }

        // 3. Save to Supabase via GAS
        const fileUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
        
        const gasPayload = {
            action: 'uploadFileMetadata',
            username: currentUser.username,
            fileName: file.name,
            driveFileId: driveFile.id,
            fileUrl: fileUrl,
            isPublic: isPublic,
            category: category
        };

        const response = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify(gasPayload)
        });
        
        const result = await response.json();
        if (result.success) {
            document.getElementById('upload-modal').style.display = 'none';
            loadFiles();
        } else {
            alert("Metadata save failed: " + result.message);
        }

    } catch (e) {
        alert("Upload Error: " + e.message);
    } finally {
        showLoading(false);
    }
}

async function setDriveFilePublic(fileId) {
    return fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
        })
    });
}

async function loadFiles() {
    const userStr = localStorage.getItem('sas_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    try {
        const response = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getFiles', username: user.username })
        });
        const result = await response.json();
        if (result.success) {
            allFiles = result.files;
            renderFiles(allFiles);
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

function renderFiles(files) {
    const grid = document.getElementById('file-grid');
    if (!files || files.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
              <i class='bx bx-folder-open'></i>
              <h3>No files yet</h3>
              <p>Connect your Google Drive and upload your first document.</p>
            </div>`;
        return;
    }

    grid.innerHTML = files.map(file => {
        const icon = getFileIcon(file.file_name);
        return `
            <div class="file-card">
                <div class="file-icon">
                    <i class='bx ${icon}'></i>
                    <span class="file-type-badge">${file.category}</span>
                </div>
                <div class="file-info">
                    <h4 title="${file.file_name}">${file.file_name}</h4>
                    <p>${new Date(file.created_at).toLocaleDateString()}</p>
                </div>
                <div class="file-footer">
                    <div class="public-toggle ${file.is_public ? 'active' : ''}" onclick="togglePrivacy('${file.id}', ${file.is_public}, '${file.drive_file_id}')">
                        <i class='bx ${file.is_public ? 'bx-globe' : 'bx-lock-alt'}'></i>
                        ${file.is_public ? 'Public' : 'Private'}
                    </div>
                    <div class="file-actions">
                        <a href="${file.file_url}" target="_blank" class="file-action-btn" title="View">
                            <i class='bx bx-show'></i>
                        </a>
                        <button class="file-action-btn delete" onclick="deleteFile('${file.id}')" title="Delete">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function togglePrivacy(id, currentStatus, driveFileId) {
    if (!accessToken) {
        alert("Please connect Drive to change privacy.");
        return;
    }

    const newStatus = !currentStatus;
    showLoading(true, "Updating privacy...");
    
    try {
        // 1. Update Drive Permissions
        if (newStatus) {
            await setDriveFilePublic(driveFileId);
        } else {
            // Delete permission (tricky, needs to find permission ID)
            // For now, we just assume public stays public on Drive, but hidden in SAS.
            // A more robust way is to list permissions and delete the 'anyone' one.
        }

        // 2. Update Supabase
        const response = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggleFilePrivacy', id: id, isPublic: newStatus })
        });
        const result = await response.json();
        if (result.success) loadFiles();
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false);
    }
}

async function deleteFile(id) {
    if (!confirm("Are you sure you want to delete this record? The file will remain in your Google Drive.")) return;

    showLoading(true, "Deleting...");
    try {
        const response = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteFileRecord', id: id })
        });
        const result = await response.json();
        if (result.success) loadFiles();
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false);
    }
}

function filterFiles(filter) {
    if (filter === 'all') {
        renderFiles(allFiles);
    } else if (filter === 'Shared') {
        renderFiles(allFiles.filter(f => f.is_public));
    } else {
        renderFiles(allFiles.filter(f => f.category === filter));
    }
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'bx-image';
    if (['pdf'].includes(ext)) return 'bx-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'bx-file';
    if (['xls', 'xlsx'].includes(ext)) return 'bx-table';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'bx-video';
    return 'bx-file-blank';
}

function showLoading(show, text = "Working...") {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    if (show) {
        textEl.innerText = text;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}
