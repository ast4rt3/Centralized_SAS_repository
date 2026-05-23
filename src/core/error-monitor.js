export function initErrorMonitor() {
  // Only initialize once
  if (document.getElementById('sas-error-monitor')) return;

  // Only initialize for superadmin
  let userRole = 'guest';
  const session = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (session) {
    try { userRole = JSON.parse(session).role?.toLowerCase(); } catch(e) {}
  }
  if (userRole !== 'superadmin') return;

  const logs = [];
  let isExpanded = false;

  // Create Container
  const container = document.createElement('div');
  container.id = 'sas-error-monitor';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '999999',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none'
  });

  // Create Toggle Button
  const toggleBtn = document.createElement('button');
  toggleBtn.innerHTML = '🐛 0';
  Object.assign(toggleBtn.style, {
    pointerEvents: 'auto',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#f87171',
    border: '1px solid #ef4444',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    display: 'none', // Hide initially until an error occurs
    transition: 'all 0.2s',
    zIndex: '2'
  });

  // Create Panel
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    pointerEvents: 'auto',
    width: '350px',
    maxHeight: '400px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid #475569',
    borderRadius: '12px',
    padding: '10px',
    marginBottom: '10px',
    overflowY: 'auto',
    display: 'none',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    color: '#f8fafc',
    fontSize: '12px',
    zIndex: '1'
  });

  const title = document.createElement('div');
  title.innerHTML = '<strong style="color:#f87171;">Console Monitor</strong> <span style="font-size:10px;color:#94a3b8;">(Latest 50 logs)</span>';
  title.style.borderBottom = '1px solid #334155';
  title.style.paddingBottom = '8px';
  title.style.marginBottom = '8px';
  panel.appendChild(title);

  const logContainer = document.createElement('div');
  panel.appendChild(logContainer);

  container.appendChild(panel);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);

  // Toggle Panel
  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    panel.style.display = isExpanded ? 'block' : 'none';
    if (isExpanded) {
      panel.scrollTop = panel.scrollHeight;
    }
  });

  // Update UI
  function updateUI() {
    toggleBtn.style.display = 'block'; // Show button when there are logs
    const errorCount = logs.filter(l => l.type === 'error').length;
    toggleBtn.innerHTML = `🐛 ${errorCount} Errors`;
    if (errorCount > 0) {
      toggleBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      toggleBtn.style.color = '#fca5a5';
    }

    logContainer.innerHTML = logs.map(log => {
      let color = log.type === 'error' ? '#fca5a5' : log.type === 'warn' ? '#fde047' : '#cbd5e1';
      return `<div style="margin-bottom:6px; padding:6px; background:rgba(255,255,255,0.05); border-left:3px solid ${color}; border-radius:4px; word-wrap:break-word;">
                <span style="opacity:0.5; font-size:10px;">${log.time}</span><br/>
                <span style="color:${color}">${log.msg}</span>
              </div>`;
    }).join('');

    if (isExpanded) {
      panel.scrollTop = panel.scrollHeight;
    }
  }

  // Intercept Console
  function intercept(method) {
    const original = console[method];
    console[method] = function(...args) {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      logs.push({ type: method, msg, time: new Date().toLocaleTimeString() });
      if (logs.length > 50) logs.shift(); // Keep last 50
      updateUI();
      original.apply(console, args);
    };
  }

  intercept('error');
  intercept('warn');
  
  // Intercept Unhandled Errors
  window.addEventListener('error', function(event) {
    const msg = `${event.message} at ${event.filename}:${event.lineno}`;
    logs.push({ type: 'error', msg, time: new Date().toLocaleTimeString() });
    if (logs.length > 50) logs.shift();
    updateUI();
  });

  window.addEventListener('unhandledrejection', function(event) {
    const msg = `Unhandled Promise Rejection: ${event.reason}`;
    logs.push({ type: 'error', msg, time: new Date().toLocaleTimeString() });
    if (logs.length > 50) logs.shift();
    updateUI();
  });
}
