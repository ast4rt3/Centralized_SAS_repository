import { getEl } from "../utils/dom.js";

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
  
  // RBAC checks would go here based on systems config
  // ...
  
  setActiveNav(pageId);
  showPage(pageId);
  
  // Handle system-mode for iframes
  const isSystem = systems.some(s => s.id === pageId);
  document.body.classList.toggle('system-mode', isSystem);
}
