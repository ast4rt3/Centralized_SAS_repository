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
    
    // ── Config check ──
    if (!window.ENV || !window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
        alert("Configuration Error: Supabase credentials missing in env.js.\n\nCheck that ENV.SUPABASE_URL and ENV.SUPABASE_ANON_KEY are defined.");
        console.error("❌ Missing ENV variables", window.ENV);
        els.loading.classList.add('hidden');
        return;
    }
    
    // ── Library check ──
    if (typeof window.supabase === 'undefined') {
        alert("Error: Supabase JS library not loaded.\n\nCheck your internet connection and that https://unpkg.com/@supabase/supabase-js@2 is accessible.");
        console.error("❌ window.supabase is undefined");
        els.loading.classList.add('hidden');
        return;
    }
    
    // ── Create client ──
    try {
        supabaseClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
        console.log("✅ Supabase client created");
    } catch (e) {
        alert("Failed to create Supabase client: " + e.message);
        console.error("❌ Supabase init error:", e);
        els.loading.classList.add('hidden');
        return;
    }

    // ── UI setup ──
    document.getElementById('schedDate').valueAsDate = new Date();
    els.form.addEventListener('submit', handleFormSubmit);
    
    // ── Load data with timeout safeguard ──
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
            console.warn("⚠️ loadSchedules timeout — hiding loading overlay");
            els.loading.classList.add('hidden');
            resolve('timeout');
        }, 10000);
    });
    
    try {
        const result = await Promise.race([loadSchedules(), timeoutPromise]);
        if (result !== 'timeout') {
            console.log("✅ Schedules loaded successfully");
        }
    } catch (e) {
        console.error("❌ init error:", e);
        // Error alert already shown by loadSchedules()
        els.loading.classList.add('hidden');
    }
    
    console.log("✅ Schedule Manager ready");
}

async function loadSchedules() {
    console.log("📡 Fetching schedules...");
    try {
        const { data, error } = await supabaseClient
            .from('sas_schedules')
            .select('*')
            .order('date', { ascending: false })
            .order('start_time', { ascending: false });

        if (error) {
            console.error("❌ Supabase Error:", error);
            
            let errMsg = "Failed to load schedules.\n";
            if (error.code === '42P01') {
                errMsg += "Table 'sas_schedules' does not exist.\n\nRun the SQL migration first!";
            } else if (error.code === '42501') {
                errMsg += "Permission denied (RLS?).\n\nCheck that RLS is disabled or policies set.";
            } else {
                errMsg += "Code: " + (error.code || 'unknown') + "\n" + error.message;
            }
            errMsg += "\n\nSee browser console (F12) for details.";
            alert(errMsg);
            return; // Exit without throwing; UI already hidden by init timeout
        }

        renderSchedules(data);
    } catch (e) {
        console.error("❌ loadSchedules exception:", e);
        alert("Unexpected error loading schedules: " + e.message);
    }
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

// Helpers
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

document.addEventListener('DOMContentLoaded', init);
