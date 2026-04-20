let supabaseClient;
const els = {
    grid: document.getElementById('scheduleGrid'),
    form: document.getElementById('scheduleForm'),
    modal: document.getElementById('modalOverlay'),
    loading: document.getElementById('loadingOverlay'),
    stats: document.getElementById('statsText')
};

async function init() {
    console.log("🚀 Initializing Schedule Manager...");
    
    // Guard: ENV
    if (!window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY) {
        console.error("❌ Missing Supabase credentials");
        showError("Supabase credentials missing in env.js");
        return;
    }
    
    // Guard: library
    if (!window.supabase) {
        console.error("❌ Supabase library not loaded");
        showError("Supabase library not loaded — check internet connection");
        return;
    }
    
    // Create client
    try {
        supabaseClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
        console.log("✅ Supabase client ready");
    } catch (e) {
        console.error("❌ Client creation failed:", e);
        showError("Failed to create Supabase client:\n" + e.message);
        return;
    }
    
    // UI setup
    document.getElementById('schedDate').valueAsDate = new Date();
    els.form.addEventListener('submit', handleFormSubmit);
    
    // Load schedules
    try {
        await loadSchedules();
        console.log("✅ Schedules loaded");
    } catch (e) {
        console.error("❌ loadSchedules failed:", e);
    }
    
    els.loading.classList.add('hidden');
    console.log("✅ Init complete");
}

function showError(msg) {
    alert(msg);
    els.loading.classList.add('hidden');
}

async function loadSchedules() {
    console.log("📡 Fetching schedules...");
    const { data, error, status, statusText } = await supabaseClient
        .from('sas_schedules')
        .select('*')
        .order('created_at', { ascending: false });

    console.log('📊 Query raw response:', { 
        rowCount: data?.length, 
        error: error?.message, 
        status, 
        statusText,
        firstRow: data?.[0] 
    });

    if (error) {
        console.error("❌ Supabase Error:", error);
        let msg = "Failed to load schedules.\n";
        if (error.code === '42P01') {
            msg += "Table 'sas_schedules' not found.\n\nDid you run the SQL migration?";
        } else if (error.code === '42501') {
            msg += "Permission denied — RLS may be enabled.\n\nRun: ALTER TABLE sas_schedules DISABLE ROW LEVEL SECURITY;";
        } else {
            msg += "(" + (error.code || 'unknown') + ") " + error.message;
        }
        showError(msg);
        els.grid.innerHTML = `<div style="text-align:center;padding:40px;color:red;">${msg.replace(/\n/g, '<br>')}</div>`;
        return;
    }

    console.log('✅ Data received, rows:', data?.length);
    renderSchedules(data);
}

function renderSchedules(schedules) {
    els.grid.innerHTML = '';
    let activeCount = 0;

    if (!schedules || schedules.length === 0) {
        els.grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">
                <i class='bx bx-calendar-x' style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No schedules found. Create your first check-in window!</p>
            </div>
        `;
        els.stats.textContent = "0 Windows defined";
        return;
    }

    schedules.forEach(sched => {
        const isActive = sched.is_active;
        if (isActive) activeCount++;

        const card = document.createElement('div');
        card.className = `card ${isActive ? 'active' : ''}`;
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <p class="card-date">${formatDate(sched.date)}</p>
                    <h3 class="card-label">${sched.label}</h3>
                </div>
                <div class="status-pill ${isActive ? 'active' : ''}">
                    ${isActive ? 'Active' : 'Archived'}
                </div>
            </div>
            <div class="card-time">
                <i class='bx bx-time-five'></i>
                <span>${formatTime(sched.start_time)} - ${formatTime(sched.end_time)}</span>
            </div>
            <div class="card-footer">
                <button class="btn btn-outline" onclick="toggleStatus('${sched.id}', ${isActive})" style="padding: 6px 12px; font-size: 0.7rem;">
                    <i class='bx ${isActive ? 'bx-archive-in' : 'bx-play'}'></i> 
                    ${isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-outline" onclick="deleteSchedule('${sched.id}')" style="padding: 6px 12px; font-size: 0.7rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `;
        els.grid.appendChild(card);
    });

    els.stats.textContent = `${activeCount} Active / ${schedules.length} Total Windows`;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
        label: document.getElementById('schedLabel').value,
        date: document.getElementById('schedDate').value,
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value,
        is_active: true
    };

    console.log("🚀 Saving schedule:", payload);
    const { error } = await supabaseClient
        .from('sas_schedules')
        .insert([payload]);

    if (error) {
        alert("Error saving: " + error.message);
    } else {
        closeModal();
        loadSchedules();
    }
}

async function toggleStatus(id, currentStatus) {
    const { error } = await supabaseClient
        .from('sas_schedules')
        .update({ is_active: !currentStatus })
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadSchedules();
}

async function deleteSchedule(id) {
    if (!confirm("Are you sure you want to delete this window and ALL associated attendance logs?")) return;

    const { error } = await supabaseClient
        .from('sas_schedules')
        .delete()
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadSchedules();
}

function openModal() { els.modal.style.display = 'flex'; }
function closeModal() { els.modal.style.display = 'none'; els.form.reset(); document.getElementById('schedDate').valueAsDate = new Date(); }

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
    });
}

function formatTime(timeStr) {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

// Run init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
