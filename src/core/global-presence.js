// Global Presence Tracker for all SAS Systems
// This script runs on sub-applications to ensure the user stays "Online" in the global messenger
(function() {
    // 1. Only run if we are NOT in the main portal (main portal already has legacy.js doing this)
    // Actually, it's fine if it runs everywhere, but to avoid double tracking we can check if initSharedMessaging exists.
    // Wait, let's just let it run. Supabase presence merges duplicate keys gracefully.

    // 2. Check login
    let user = null;
    try {
        const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
        if (raw) user = JSON.parse(raw);
    } catch(e) {}
    
    if (!user || !user.username) return;

    // 3. Load dependencies dynamically if missing
    function loadDependencies() {
        return new Promise((resolve) => {
            let loadedSupabase = !!window.supabase;
            let loadedEnv = !!(window.ENV && window.ENV.SUPABASE_URL);

            const checkDone = () => {
                if (loadedSupabase && loadedEnv) resolve();
            };

            if (!loadedSupabase) {
                const s = document.createElement('script');
                s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
                s.onload = () => { loadedSupabase = true; checkDone(); };
                document.head.appendChild(s);
            }

            if (!loadedEnv) {
                const e = document.createElement('script');
                // Calculate root path by checking depth of pathname
                const depth = window.location.pathname.split('/').filter(Boolean).length;
                // If deployed at root, depth is e.g. 2 for apps/analytics/index.html
                // We'll just try to guess env.js location
                e.src = "/env.js"; // Try absolute first
                e.onload = () => { loadedEnv = true; checkDone(); };
                e.onerror = () => {
                    // Try relative fallback
                    const e2 = document.createElement('script');
                    e2.src = "../../env.js";
                    e2.onload = () => { loadedEnv = true; checkDone(); };
                    document.head.appendChild(e2);
                };
                document.head.appendChild(e);
            }

            checkDone();
        });
    }

    loadDependencies().then(() => {
        if (!window.supabase || !window.ENV || !window.ENV.SUPABASE_URL) return;

        // Give a tiny delay to ensure main portal tracking doesn't conflict if both load
        setTimeout(async () => {
            try {
                const client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
                const channel = client.channel('online-users', {
                    config: { presence: { key: user.username } }
                });

                channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            online_at: new Date().toISOString(),
                            user: user.username,
                            system: document.title || 'Sub-system'
                        });
                    }
                });
            } catch (err) {
                console.warn("[Global Presence] Failed to initialize:", err);
            }
        }, 1500);
    });
})();
