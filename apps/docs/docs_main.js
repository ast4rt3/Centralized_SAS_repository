// Documents App - Main Bootstrap Module

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    window.docsState.currentUser = user;
    window.docsState.currentUserRole = getCurrentUserRole();
    
    // Set UI to Connected (since GDrive is accessed via server-side GAS proxy)
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const uploadBtn = document.getElementById('open-upload-btn');

    if (statusPill) statusPill.className = 'status-pill connected';
    if (statusText) statusText.innerText = 'Connected';
    if (uploadBtn) uploadBtn.disabled = false;

    docsInitListeners();
    docsLoadFiles();
});

function getCurrentUser() {
    const urlParams = new URLSearchParams(window.location.search);
    const portalUser = urlParams.get('portalUser');
    if (portalUser) return portalUser;
    
    const savedUser = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (savedUser) {
        try {
            const data = JSON.parse(savedUser);
            return data.username || 'Anonymous';
        } catch (e) {}
    }
    return 'Anonymous';
}

function getCurrentUserRole() {
    const savedUser = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (savedUser) {
        try {
            const data = JSON.parse(savedUser);
            return data.role || 'user';
        } catch (e) {}
    }
    return 'user';
}

function docsInitListeners() {
    const openBtn = document.getElementById('open-upload-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('upload-modal').style.display = 'flex';
            if (window.docsDraft?.loadDraft) window.docsDraft.loadDraft();
        });
    }

    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('upload-modal').style.display = 'none';
        });
    }

    const form = document.getElementById('upload-form');
    if (form) {
        form.addEventListener('submit', docsHandleUpload);
    }

    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const cat = pill.getAttribute('data-cat');
            window.docsGDrive.setFilter(cat);
        });
    });
}

function docsLoadFiles() {
    window.docsGDrive.loadFiles();
}

async function docsHandleUpload(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get('file');
    const category = formData.get('category');
    const isPublic = formData.get('isPublic') === 'on';

    if (!file) return;

    const submitBtn = document.getElementById('submit-upload-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Uploading...';

    const originalSize = file.size;
    compressAndUpload(file).then(async (compressedBase64) => {
        const compressedSize = compressedBase64.length;
        const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        console.log(`Compression: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${ratio}% reduction)`);

        try {
            // 1. Upload file content to Google Drive via GAS proxy
            const uploadRes = await fetch(window.ENV.BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadFileToDrive',
                    fileData: compressedBase64,
                    fileName: file.name,
                    username: window.docsState.currentUser,
                    category: category
                })
            });
            const uploadResult = await uploadRes.json();

            if (!uploadResult.success) throw new Error(uploadResult.message);

            // 2. Direct POST to Supabase REST API
            const username = window.docsState.currentUser || 'Anonymous';
            const metadata = `[vault:${username}:${isPublic}:${uploadResult.fileId}]`;
            
            const headers = {
                "apikey": window.ENV.SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${window.ENV.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            };

            const dbPayload = {
                title: file.name,
                category: category,
                date: new Date().toISOString().split('T')[0],
                url: uploadResult.fileUrl,
                description: metadata
            };

            const sbRes = await fetch(`${window.ENV.SUPABASE_URL}/rest/v1/sas_documents`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(dbPayload)
            });

            if (!sbRes.ok) {
                const errText = await sbRes.text();
                throw new Error("Supabase insert failed: " + errText);
            }

            document.getElementById('upload-modal').style.display = 'none';
            e.target.reset();
            if (window.docsDraft?.clearDraft) window.docsDraft.clearDraft();
            docsLoadFiles();
            showToast("Document uploaded successfully!", "success");
        } catch (err) {
            console.error("Upload Error:", err);
            showToast("Upload failed: " + err.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Upload File';
        }
    });
}

async function compressImage(base64Data, mimeType) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const compressed = canvas.toDataURL('image/jpeg', 0.72);
            resolve(compressed);
        };
        img.src = base64Data;
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

function compressAndUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                let result = reader.result;
                const mimeType = file.type;

                if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
                    result = await compressImage(result, mimeType);
                }

                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}