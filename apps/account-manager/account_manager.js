(function() {
    const BACKEND_GAS_URL = window.ENV?.BACKEND_GAS_URL;
    const pendingList = document.getElementById('pending-list');
    const emptyState = document.getElementById('empty-state');
    const loadingIndicator = document.getElementById('loading-indicator');
    const countPending = document.getElementById('count-pending');
    const refreshBtn = document.getElementById('refresh-all-btn');

    // Get current user from parent portal
    const urlParams = new URLSearchParams(window.location.search);
    const portalUser = urlParams.get('portalUser');

    async function fetchPendingUsers() {
        if (!BACKEND_GAS_URL) return;
        
        // 1. Get session data from URL (most reliable for iframes)
        const urlParams = new URLSearchParams(window.location.search);
        let username = urlParams.get('portalUser');
        let token = urlParams.get('portalToken');
        let source = "URL";

        // 2. Fallback to storage
        if (!username || !token) {
            let rawData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
            
            // If empty and in iframe, try to get from parent
            if (!rawData && window.parent && window.parent !== window) {
                try {
                    rawData = window.parent.localStorage.getItem('sas_user_data') || 
                              window.parent.sessionStorage.getItem('sas_user_data');
                } catch (e) {
                    console.warn("[AccountManager] Cannot access parent storage:", e);
                }
            }

            const userData = JSON.parse(rawData || '{}');
            username = username || userData.username;
            token = token || userData.token;
            source = "Storage";
        }

        if (!username) {
            console.error("[AccountManager] Session missing. No username found.");
            showToast("Session missing. Please re-login.", "error");
            return;
        }

        if (!token) {
            console.warn("[AccountManager] Token missing for user:", username, ". Proceeding with username-only auth fallback.");
        } else {
            console.log(`[AccountManager] Authenticated via ${source}: ${username}`);
        }

        const userData = { username, token: token || "" };
        loadingIndicator.classList.remove('hidden');

        try {
            // 3. Try GET first (more reliable in GAS)
            const fetchUrl = `${BACKEND_GAS_URL}?action=getPendingUsers&username=${encodeURIComponent(userData.username)}&token=${encodeURIComponent(userData.token)}`;
            console.log("[AccountManager] Fetching via GET:", fetchUrl);
            
            const r = await fetch(fetchUrl);
            const rawText = await r.text();
            
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                console.error("[AccountManager] RAW Response (Not JSON):", rawText);
                throw new Error("Server returned an invalid response. Check console for details.");
            }

            console.log("[AccountManager] Server Response:", data);

            if (data.success) {
                renderUsers(data.users || []);
                countPending.textContent = (data.users || []).length;
            } else {
                console.error("[AccountManager] Fetch failed:", data.message);
                showToast(data.message || "Failed to fetch users", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Network error. Check connection.", "error");
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function renderUsers(users) {
        // Clear except empty state
        const rows = pendingList.querySelectorAll('.user-row');
        rows.forEach(r => r.remove());

        if (!Array.isArray(users)) {
            console.error("[AccountManager] Expected array for users, got:", users);
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').textContent = "Error: Invalid data received from server.";
            return;
        }

        if (users.length === 0) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').textContent = "No pending registration requests.";
            return;
        }

        emptyState.classList.add('hidden');

        users.forEach(user => {
            const row = document.createElement('div');
            row.className = 'user-row';
            
            const initial = (user.username || '?').charAt(0).toUpperCase();
            const roleClass = `role-${(user.role || 'user').toLowerCase()}`;

            row.innerHTML = `
                <div class="user-avatar">${initial}</div>
                <div class="user-info">
                    <span class="name">${user.username}</span>
                    <span class="sub">Requested on ${new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                    <span class="role-badge ${roleClass}">${user.role}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ID: ${user.id.substring(0, 8)}...
                </div>
                <div class="action-group">
                    <button class="btn-action btn-reject" data-id="${user.id}">Decline</button>
                    <button class="btn-action btn-approve" data-id="${user.id}">Approve</button>
                </div>
            `;

            const approveBtn = row.querySelector('.btn-approve');
            const rejectBtn = row.querySelector('.btn-reject');

            approveBtn.onclick = () => handleAction('approve', user.id, user.username);
            rejectBtn.onclick = () => handleAction('reject', user.id, user.username);

            pendingList.appendChild(row);
        });
    }

    async function handleAction(action, userId, targetUsername) {
        const actionText = action === 'approve' ? 'Approving' : 'Declining';
        const confirmText = action === 'approve' 
            ? `Are you sure you want to approve ${targetUsername}?`
            : `Are you sure you want to decline ${targetUsername}? This will remove the request.`;

        if (!confirm(confirmText)) return;

        loadingIndicator.classList.remove('hidden');
        try {
            // Get current admin session
            const urlParams = new URLSearchParams(window.location.search);
            let adminUsername = urlParams.get('portalUser');
            let adminToken = urlParams.get('portalToken');

            if (!adminUsername || !adminToken) {
                let rawData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
                if (!rawData && window.parent && window.parent !== window) {
                    try {
                        rawData = window.parent.localStorage.getItem('sas_user_data') || 
                                  window.parent.sessionStorage.getItem('sas_user_data');
                    } catch (e) {}
                }
                const userData = JSON.parse(rawData || '{}');
                adminUsername = adminUsername || userData.username;
                adminToken = adminToken || userData.token;
            }

            if (!adminUsername) {
                showToast("Session missing. Please re-login.", "error");
                return;
            }

            const formData = new URLSearchParams();
            formData.append('action', action === 'approve' ? 'approveUser' : 'rejectUser');
            formData.append('username', adminUsername);
            formData.append('token', adminToken || "");
            formData.append('targetUsername', targetUsername);

            const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: formData
            });
            const rawText = await r.text();
            
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                console.error("[AccountManager] Action RAW Response:", rawText);
                throw new Error("Server returned an invalid response.");
            }

            if (data.success) {
                showToast(`${targetUsername} ${action === 'approve' ? 'approved' : 'declined'} successfully`, "success");
                fetchPendingUsers();
            } else {
                showToast(data.message || `Failed to ${action} user`, "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Network error", "error");
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class='bx ${type === 'success' ? 'bx-check-circle' : 'bx-error-circle'}'></i>
            <span>${msg}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    refreshBtn.onclick = fetchPendingUsers;

    // Initial load
    fetchPendingUsers();

})();
