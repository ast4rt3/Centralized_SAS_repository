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
                // Global Toast CSS Injection
                (function injectStyles() {
                  const styleId = 'messaging-ui-styles';
                  if (document.getElementById(styleId)) return;
                  const style = document.createElement('style');
                  style.id = styleId;
                  style.textContent = `
                    .fb-chat-notifications {
                      position: fixed;
                      bottom: 24px;
                      right: 24px;
                      z-index: 999999;
                      display: flex;
                      flex-direction: column-reverse;
                      gap: 12px;
                      pointer-events: none;
                    }
                    .fb-chat-toast {
                      pointer-events: auto;
                      background: rgba(15, 23, 42, 0.85);
                      backdrop-filter: blur(20px);
                      -webkit-backdrop-filter: blur(20px);
                      border: 1px solid rgba(255, 255, 255, 0.15);
                      border-left: 4px solid #f59e0b;
                      color: white;
                      padding: 16px 20px;
                      border-radius: 12px;
                      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1);
                      cursor: pointer;
                      min-width: 280px;
                      max-width: 380px;
                      animation: fb-toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                      display: flex;
                      flex-direction: column;
                      gap: 4px;
                    }
                    .fb-chat-toast:hover {
                      transform: translateY(-4px) scale(1.02);
                      background: rgba(15, 23, 42, 0.95);
                      box-shadow: 0 15px 35px -5px rgba(245, 158, 11, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1);
                    }
                    .fb-chat-toast-sender {
                      font-weight: 800;
                      font-size: 0.95rem;
                      color: #f59e0b;
                      display: flex;
                      align-items: center;
                      gap: 8px;
                    }
                    .fb-chat-toast-sender::before {
                      content: '';
                      display: inline-block;
                      width: 8px;
                      height: 8px;
                      background: #22c55e;
                      border-radius: 50%;
                      box-shadow: 0 0 8px #22c55e;
                    }
                    .fb-chat-toast-text {
                      font-size: 0.95rem;
                      color: #f8fafc;
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      margin: 0;
                      font-weight: 400;
                    }
                    @keyframes fb-toast-in {
                      from { opacity: 0; transform: translateX(30px) scale(0.9); }
                      to { opacity: 1; transform: translateX(0) scale(1); }
                    }
                  `;
                  document.head.appendChild(style);
                })();

                function showGlobalToast(sender, text) {
                  // Only show if we are NOT on the main portal (main portal handles it)
                  if (typeof window.showNotification === 'function') return;

                  let container = document.getElementById('fb-chat-notifications');
                  if (!container) {
                    container = document.createElement('div');
                    container.id = 'fb-chat-notifications';
                    container.className = 'fb-chat-notifications';
                    document.body.appendChild(container);
                  }
                  
                  const toast = document.createElement('div');
                  toast.className = 'fb-chat-toast';
                  toast.onclick = () => {
                     const depth = window.location.pathname.split('/').filter(Boolean).length;
                     const rootPrefix = depth > 0 ? '../'.repeat(depth) : '/';
                     window.location.href = rootPrefix + "index.html"; 
                  };
                  
                  const displaySender = document.createElement('span');
                  displaySender.className = 'fb-chat-toast-sender';
                  displaySender.textContent = sender;
                  
                  const displayText = document.createElement('p');
                  displayText.className = 'fb-chat-toast-text';
                  displayText.textContent = text;
                  
                  toast.appendChild(displaySender);
                  toast.appendChild(displayText);
                  container.appendChild(toast);
                  
                  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
                }
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

                // Global Message Listener for standalone apps
                if (typeof window.showNotification !== 'function') {
                    const msgChannel = client.channel('global-messages');
                    msgChannel.on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'user_messages', filter: `receiver=eq.${user.username}` },
                        (payload) => {
                            if (payload.new && payload.new.sender !== user.username) {
                                showGlobalToast(payload.new.sender, payload.new.text);
                            }
                        }
                    );
                    
                    const role = user.role ? user.role.toLowerCase().trim() : '';
                    if (role === 'admin' || role === 'superadmin') {
                        msgChannel.on(
                            'postgres_changes',
                            { event: 'INSERT', schema: 'public', table: 'user_messages', filter: `receiver=eq.admin-group` },
                            (payload) => {
                                if (payload.new && payload.new.sender !== user.username) {
                                    showGlobalToast(payload.new.sender, payload.new.text);
                                }
                            }
                        );
                    }
                    msgChannel.subscribe();
                }

            } catch (err) {
                console.warn("[Global Presence] Failed to initialize:", err);
            }
        }, 1500);
    });
})();
