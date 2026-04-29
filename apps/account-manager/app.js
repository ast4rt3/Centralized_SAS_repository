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
        
        loadingIndicator.classList.remove('hidden');
        try {
            const formData = new URLSearchParams();
            formData.append('action', 'getPendingUsers');
            formData.append('portalUser', portalUser);

            const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: formData
            });
            const data = await r.json();

            if (data.success) {
                renderUsers(data.users || []);
                countPending.textContent = (data.users || []).length;
            } else {
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

        if (users.length === 0) {
            emptyState.classList.remove('hidden');
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

    async function handleAction(action, userId, username) {
        const actionText = action === 'approve' ? 'Approving' : 'Declining';
        const confirmText = action === 'approve' 
            ? `Are you sure you want to approve ${username}?`
            : `Are you sure you want to decline ${username}? This will remove the request.`;

        if (!confirm(confirmText)) return;

        loadingIndicator.classList.remove('hidden');
        try {
            const formData = new URLSearchParams();
            formData.append('action', action === 'approve' ? 'approveUser' : 'rejectUser');
            formData.append('targetUsername', username);
            formData.append('portalUser', portalUser);

            const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: formData
            });
            const data = await r.json();

            if (data.success) {
                showToast(`${username} ${action === 'approve' ? 'approved' : 'declined'} successfully`, "success");
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
