import { getEl } from "../utils/dom.js";

/**
 * Ensure the main app UI is visible (removing hidden classes/attributes)
 */
export function ensureAppVisible() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#lp-')) return;

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
  
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    if (pageId === 'converter' || pageId === 'database') {
      pageContent.style.setProperty('background', '#0f172a', 'important');
    } else {
      pageContent.style.background = '';
    }
  }

  // Close sidebar on mobile after navigation
  document.body.classList.remove('sidebar-open');
}

/**
 * Set active state on sidebar navigation items
 */
export function setActiveNav(pageId) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(el => {
    const isActive = el.getAttribute('data-page') === pageId;
    el.classList.toggle('active', isActive);
    
    // Automatically expand parent section if this item is active
    if (isActive) {
      const parentSection = el.closest('.nav-section');
      if (parentSection && parentSection.classList.contains('collapsed')) {
        parentSection.classList.remove('collapsed');
        
        // Add to localStorage preference to persist the expanded state
        try {
          const sectionId = parentSection.getAttribute('data-section-id');
          const currentExpanded = JSON.parse(localStorage.getItem('sas_sidebar_expanded_sections') || '[]');
          if (currentExpanded.indexOf(sectionId) === -1) {
            currentExpanded.push(sectionId);
            localStorage.setItem('sas_sidebar_expanded_sections', JSON.stringify(currentExpanded));
          }
        } catch (e) {
          console.error('[Navigation] Failed to update collapsible state:', e);
        }
      }
    }
  });
}

/**
 * Synchronize UI state with browser URL hash
 */
export function syncFromHash(systems) {
  const hash = (window.location.hash || '#home').replace('#', '');
  const pageId = hash || 'home';

  // Close any full-screen landing overlays on hash change/navigation
  const lfViewer = document.getElementById('lost-found-viewer');
  const lpMainContent = document.getElementById('lp-main-content');
  if (lfViewer && !lfViewer.classList.contains('hidden')) {
    lfViewer.classList.add('hidden');
    if (lpMainContent) {
      lpMainContent.style.display = '';
    }
    const navbar = document.querySelector('.lp-navbar');
    if (navbar && window.scrollY < 40) {
      navbar.classList.remove('scrolled');
    }
  }

  const allActPage = document.getElementById('lp-all-activities-page');
  if (allActPage && allActPage.classList.contains('lp-all-act-open')) {
    allActPage.classList.remove('lp-all-act-open');
    allActPage.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  const systemsData = systems || [];

  // 0. Handle Landing Page internal anchors (e.g. #lp-about, #lp-services)
  // We handle this FIRST to allow smooth transitions from any view back to the landing page sections
  if (pageId.startsWith('lp-')) {
    const lp = document.getElementById('landing-page');
    if (lp) {
      lp.classList.remove('hidden');
      document.body.classList.add('lp-mode');
      document.body.classList.remove('system-mode', 'tv-mode', 'dashboard-backdrop');
      
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
  if (pageId === 'home' || pageId === 'messages' || pageId === 'database' || pageId === 'converter' || pageId === 'loading' || pageId === 'service-viewer' || pageId === 'documents') {
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
        document.body.classList.remove('system-mode', 'tv-mode', 'dashboard-backdrop');
        
        // Hide nav toggle if user is not logged in
        const navToggle = document.getElementById('nav-toggle');
        if (navToggle) {
          navToggle.classList.add('hidden');
          navToggle.hidden = true;
        }
        
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

          // Sync navbar transparency state when returning to main landing content
          const navbar = document.querySelector('.lp-navbar');
          if (navbar && window.scrollY < 40) {
            navbar.classList.remove('scrolled');
          }
        }
      }
      return;
    }

    if (session) {
      let userRole = 'guest';
      try { userRole = (JSON.parse(session).role || '').toLowerCase().trim(); } catch(e) {}

      if (pageId === 'database' && userRole !== 'superadmin') {
        console.warn(`[Security] ${userRole} attempted to access restricted database view.`);
        if (window.showToast) window.showToast("Access Denied: Superadmin only", "error");
        window.location.hash = 'home';
        return;
      }
      
      if (pageId === 'messages' && userRole !== 'admin' && userRole !== 'superadmin') {
        console.warn(`[Security] ${userRole} attempted to access restricted messenger view.`);
        if (window.showToast) window.showToast("Access Denied", "error");
        window.location.hash = 'home';
        return;
      }

      if (pageId === 'converter' && userRole !== 'admin' && userRole !== 'superadmin') {
        console.warn(`[Security] ${userRole} attempted to access restricted converter view.`);
        if (window.showToast) window.showToast("Access Denied", "error");
        window.location.hash = 'home';
        return;
      }

      if (pageId === 'documents' && 
          userRole !== 'admin' && 
          userRole !== 'superadmin' && 
          userRole !== 'user' && 
          userRole !== 'uploader') {
        console.warn(`[Security] ${userRole} attempted to access restricted documents view.`);
        if (window.showToast) window.showToast("Access Denied: Documents require authorization", "error");
        window.location.hash = 'home';
        return;
      }

      showPage(pageId === 'loading' ? 'home' : pageId);
      ensureAppVisible();

      if (pageId === 'documents') {
        const docsFrame = document.getElementById('documents-frame');
        if (docsFrame && (!docsFrame.src || docsFrame.src === 'about:blank' || docsFrame.src === '')) {
          const rawData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data') || '{}';
          let currentUser = 'Unknown';
          let currentToken = '';
          try {
            const userData = JSON.parse(rawData);
            currentUser = userData.username || 'Unknown';
            currentToken = userData.token || userData.jwt || '';
          } catch(e) {}
          docsFrame.src = 'apps/docs/index.html?portalUser=' + encodeURIComponent(currentUser) + '&token=' + encodeURIComponent(currentToken) + '&portalToken=' + encodeURIComponent(currentToken);
        }
      }
      
      // If an authenticated user wants to view the service explorer natively
      if (pageId === 'service-viewer') {
        const lp = document.getElementById('landing-page');
        if (lp) {
          showPage('landing-page'); // We need to show the landing page div, but hide its main content
          lp.classList.remove('hidden');
          document.body.classList.add('lp-mode');
          document.body.classList.remove('system-mode', 'tv-mode', 'dashboard-backdrop');
          
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
    if (!targetUrl.startsWith('http') && !targetUrl.includes('?') && !targetUrl.includes('#')) {
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
    systemFrame.src = targetUrl + glue + 'portalUser=' + encodeURIComponent(currentUser) + '&token=' + encodeURIComponent(currentToken);
  }
}

/**
 * Initialize instant hover prefetching for dynamic sub-apps and vaults
 */
export function initLinkPrefetcher(systems) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('mouseenter', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (!navItem) return;

    const pageId = navItem.getAttribute('data-page');
    if (!pageId) return;

    let urlToPrefetch = '';
    
    if (systems && Array.isArray(systems)) {
      const sys = systems.find(s => s.id === pageId);
      if (sys && !sys.external) {
        urlToPrefetch = sys.url;
      }
    }
    
    if (pageId === 'documents') {
      urlToPrefetch = 'apps/docs/index.html';
    } else if (pageId === 'service-viewer') {
      urlToPrefetch = 'apps/service-viewer/index.html';
    }
    
    if (urlToPrefetch) {
      if (!urlToPrefetch.includes('.') && !urlToPrefetch.endsWith('/')) {
        urlToPrefetch += '/';
      }
      
      const absoluteUrl = new URL(urlToPrefetch, window.location.origin + window.location.pathname).toString();
      
      const existing = document.querySelector(`link[href="${absoluteUrl}"]`);
      if (!existing) {
        console.log(`[Prefetch] Pre-warming connection and prefetching sub-app on hover: ${pageId} (${urlToPrefetch})`);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = absoluteUrl;
        document.head.appendChild(link);
      }
    }
  }, true);
}

