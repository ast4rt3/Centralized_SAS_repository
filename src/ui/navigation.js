import { getEl } from "../utils/dom.js";

/**
 * Ensure the main app UI is visible (removing hidden classes/attributes)
 */
export function ensureAppVisible() {
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  const landingPage = document.getElementById('landing-page');
  const loginOverlay = document.getElementById('login-overlay');
  const navToggle = document.getElementById('nav-toggle');

  if (landingPage) landingPage.classList.add('hidden');
  if (loginOverlay) loginOverlay.classList.add('hidden');
  
  if (sidebar) sidebar.classList.remove('hidden');
  if (content) content.classList.remove('hidden');
  if (navToggle) {
    navToggle.classList.remove('hidden');
    navToggle.hidden = false;
  }
  
  document.body.classList.remove('lp-mode');
  document.body.classList.add('dashboard-backdrop');
}


/**
 * Switch active page
 */
export function showPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  
  // Close sidebar on mobile after navigation
  document.body.classList.remove('sidebar-open');
}

/**
 * Set active state on sidebar navigation items
 */
export function setActiveNav(pageId) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-page') === pageId);
  });
}

/**
 * Synchronize UI state with browser URL hash
 */
export function syncFromHash(systems) {
  const hash = (window.location.hash || '#home').replace('#', '');
  const pageId = hash || 'home';
  
  const systemsData = systems || [];

  // 1. Handle special non-system pages
  if (pageId === 'home' || pageId === 'messages' || pageId === 'database' || pageId === 'loading') {
    document.body.classList.remove('system-mode');
    setActiveNav(pageId);
    
    // Only show app UI if authenticated
    const session = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    const isLoginPage = window.location.hash === '#login';
    
    if (!session && !isLoginPage) {
      const lp = document.getElementById('landing-page');
      if (lp) {
        lp.classList.remove('hidden');
        document.body.classList.add('lp-mode');
      }
      return;
    }

    if (session) {
      showPage(pageId === 'loading' ? 'home' : pageId);
      ensureAppVisible();
    }

    const systemFrame = document.getElementById('system-frame');
    if (systemFrame) systemFrame.src = 'about:blank';
    return;
  }

  // 2. Resolve System
  const sys = systemsData.find(s => s.id === pageId);
  if (!sys) {
    // If hash doesn't match any system, default to home
    window.location.hash = 'home';
    return;
  }

  // 3. RBAC Check
  let userRole = 'guest';
  const session = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (session) {
    try { userRole = JSON.parse(session).role; } catch(e) {}
  }


  const allowedRoles = sys.roles || ['admin'];
  const hasAccess = (userRole === 'superadmin') || 
                    allowedRoles.some(r => r.toLowerCase() === (userRole || '').toLowerCase());

  if (!hasAccess) {
    console.warn(`[Security] ${userRole} attempted to access restricted system: ${pageId}`);
    if (window.showToast) window.showToast(`Access Denied for ${userRole}`, "error");
    window.location.hash = 'home';
    return;
  }

  // 4. Handle External Systems
  if (sys.external) {
    window.open(sys.url, '_blank', 'noopener');
    window.location.hash = 'home';
    return;
  }

  // 5. Load Internal System
  setActiveNav(pageId);
  showPage('system-view');
  ensureAppVisible();
  document.body.classList.add('system-mode');

  const systemFrame = document.getElementById('system-frame');
  if (systemFrame) {
    const glue = sys.url.includes('?') ? '&' : '?';
    const currentUser = JSON.parse(localStorage.getItem('sas_user_data') || '{}').username || 'Unknown';
    systemFrame.src = sys.url + glue + 'portalUser=' + encodeURIComponent(currentUser);
  }
}

