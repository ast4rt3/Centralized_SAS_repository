// File Hub Logic - Centralized GDrive (via GAS Proxy)
let currentUser = null;
let allFiles = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Get user from Portal (via URL param or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const portalUser = urlParams.get('portalUser');
    
    if (portalUser) {
        currentUser = portalUser;
    } else if (window.myUsername) {
        currentUser = window.myUsername;
    } else if (window.parent && window.parent.myUsername) {
        // If running in an iframe, check the parent portal
        currentUser = window.parent.myUsername;
    } else {
        // Fallback to the correct localStorage key used by SAS Portal
        const savedUser = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
        if (savedUser) {
            try {
                const userObj = JSON.parse(savedUser);
                currentUser = userObj.username || 'Anonymous';
            } catch(e) { currentUser = 'Anonymous'; }
        } else {
            currentUser = 'Anonymous';
        }
    }
    
    initEventListeners();
    setTimeout(loadFiles, 500); // Small delay to ensure myUsername is loaded
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
}

async function loadFiles() {
    console.log("Loading files for user:", currentUser);
    try {
        // We use a simple request to avoid CORS preflight issues
        const res = await fetch(window.ENV.BACKEND_GAS_URL, {
            method: 'POST',
            mode: 'cors', // Ensure CORS is handled
            body: JSON.stringify({ action: 'getFiles', username: currentUser })
        });
        const data = await res.json();
        console.log("Files loaded:", data);
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
    if (!container) return;
    
    const filtered = allFiles.filter(f => currentFilter === 'all' || f.category === currentFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="60" height="60" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-bottom: 12px;"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-width="1"/></svg>
                <p style="font-size: 16px; font-weight: 600; color: var(--slate-400);">No files found</p>
                <p style="font-size: 13px;">Start uploading documents to your personal hub.</p>
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
                <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="1.5"/></svg>
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
                <div class="file-actions">
                    <a href="${file.file_url}" target="_blank" class="btn-icon view" title="View File">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                    </a>
                    <button onclick="deleteFile('${file.id}', '${file.drive_file_id}')" class="btn-icon delete" title="Delete File">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function deleteFile(id, driveId) {
    if (!confirm("Are you sure you want to delete this file from Drive and the Portal?")) return;

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
            alert("File deleted successfully.");
        } else {
            alert("Error deleting file: " + data.message);
        }
    } catch (err) {
        console.error("Delete Error:", err);
    }
}

window.setFilter = (category) => {
    currentFilter = category;
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(category) || (category === 'all' && btn.innerText.includes('All'))) {
            btn.classList.add('active');
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
            alert("File uploaded successfully to your Drive!");
        } catch (err) {
            console.error("Upload Error:", err);
            alert("Upload failed: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Upload';
        }
    };
    reader.readAsDataURL(file);
}
