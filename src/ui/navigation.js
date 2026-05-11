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

  // 0. Handle Landing Page internal anchors (e.g. #lp-about, #lp-services)
  // We handle this FIRST to allow smooth transitions from any view back to the landing page sections
  if (pageId.startsWith('lp-')) {
    const lp = document.getElementById('landing-page');
    if (lp) {
      lp.classList.remove('hidden');
      document.body.classList.add('lp-mode');
      
      const mainContent = document.getElementById('lp-main-content');
      const explorerView = document.getElementById('lp-service-explorer-view');
      
      // If we're coming from the Service Viewer or elsewhere, ensure main landing content is shown
      if (mainContent && explorerView) {
        mainContent.style.display = 'block';
        explorerView.style.display = 'none';
        
        // Remove 'scrolled' class only if we're at the very top
        const navbar = document.querySelector('.lp-navbar');
        if (navbar && window.scrollY < 40) {
          navbar.classList.remove('scrolled');
        }

        // Manually trigger scroll to the target element since browser might have failed
        // if it was display:none during the initial hash change
        setTimeout(() => {
          const target = document.getElementById(pageId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      }
    }
    return;
  }

  // 1. Handle special non-system pages
  if (pageId === 'home' || pageId === 'messages' || pageId === 'database' || pageId === 'loading' || pageId === 'service-viewer') {
    document.body.classList.remove('system-mode');
    if (pageId !== 'service-viewer') setActiveNav(pageId);
    
    // Only show app UI if authenticated
    const session = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    const isLoginPage = window.location.hash === '#login';
    
    if (!session && !isLoginPage) {
      const lp = document.getElementById('landing-page');
      if (lp) {
        lp.classList.remove('hidden');
        document.body.classList.add('lp-mode');
        
        // Handle Landing Page internal routing
        const mainContent = document.getElementById('lp-main-content');
        const explorerView = document.getElementById('lp-service-explorer-view');
        
        if (pageId === 'service-viewer' && explorerView && mainContent) {
          mainContent.style.display = 'none';
          explorerView.style.display = 'block';
          // Ensure we scroll to top
          window.scrollTo(0, 0);
          // Trigger the explorer load script
          if (window.loadServiceCategory) window.loadServiceCategory();
        } else if (mainContent && explorerView) {
          mainContent.style.display = 'block';
          explorerView.style.display = 'none';
        }
      }
      return;
    }

    if (session) {
      showPage(pageId === 'loading' ? 'home' : pageId);
      ensureAppVisible();
      
      // If an authenticated user wants to view the service explorer natively
      if (pageId === 'service-viewer') {
        const lp = document.getElementById('landing-page');
        if (lp) {
          showPage('landing-page'); // We need to show the landing page div, but hide its main content
          lp.classList.remove('hidden');
          document.body.classList.add('lp-mode');
          
          const mainContent = document.getElementById('lp-main-content');
          const explorerView = document.getElementById('lp-service-explorer-view');
          if (mainContent && explorerView) {
            mainContent.style.display = 'none';
            explorerView.style.display = 'block';
            window.scrollTo(0, 0);
            if (window.loadServiceCategory) window.loadServiceCategory();
          }
        }
      }
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
    // Ensure URL is relative to the current portal path
    let targetUrl = sys.url;
    
    // Add trailing slash if it's a directory (doesn't contain a dot in the last segment)
    if (!targetUrl.includes('?') && !targetUrl.includes('#')) {
      const segments = targetUrl.split('/');
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment.includes('.') && lastSegment.length > 0) {
        targetUrl += '/';
      }
    }

    const rawData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data') || '{}';
    console.log("[Portal] Raw session data length:", rawData.length);
    const userData = JSON.parse(rawData);
    const currentUser = userData.username || 'Unknown';
    const currentToken = userData.token || userData.jwt || '';
    
    console.log(`[Portal] Loading system: ${pageId} | User: ${currentUser} | Token: ${currentToken ? 'Present' : 'MISSING'}`);
    systemFrame.src = targetUrl + glue + 'portalUser=' + encodeURIComponent(currentUser) + '&portalToken=' + encodeURIComponent(currentToken);
  }
}

