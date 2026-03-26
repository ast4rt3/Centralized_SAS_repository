const BACKEND_GAS_URL = window.ENV?.BACKEND_GAS_URL || "YOUR_NEW_BACKEND_GAS_URL_HERE";


// --- CLOUDINARY CONFIGURATION ---
// Get these from your Cloudinary Dashboard: https://cloudinary.com/console
const CLOUDINARY_CLOUD_NAME = window.ENV?.CLOUDINARY_CLOUD_NAME || ""; // e.g. "yourname"
const CLOUDINARY_UPLOAD_PRESET = window.ENV?.CLOUDINARY_UPLOAD_PRESET || ""; // e.g. "sas_uploads" (Must be Unsigned)

// Load YouTube IFrame APIs
if (!window.YT) {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global TV Settings State
let tvAudioEnabled = false;
let tvTheaterEnabled = false; // Default to non-fullscreen for VIDEOS

// Offline banner — automatically shown/hidden based on connectivity
(function () {
  const banner = document.getElementById('offline-banner');
  function updateBanner() {
    if (banner) banner.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner(); // Check immediately on page load
})();

  // --- AUTO-UPDATE LOGIC ---
  // Periodically check for new versions on the server to bypass aggressive caching
  async function checkForUpdates() {
    try {
      // Use timestamp query param to bypass middle-man caches
      const response = await fetch('version.json?t=' + new Date().getTime());
      if (!response.ok) return;
      
      const data = await response.json();
      const localVersion = localStorage.getItem('sas_app_version');

      if (localVersion && localVersion !== data.version) {
        console.log(`[Update] New version ${data.version} found! (Local: ${localVersion})`);
        localStorage.setItem('sas_app_version', data.version);
        
        // Brief delay to allow console logs to be seen, then hard refresh
        setTimeout(() => {
          window.location.reload(true);
        }, 1000);
      } else {
        localStorage.setItem('sas_app_version', data.version);
      }
    } catch (err) {
      console.warn("Update check failed (likely offline):", err);
    }
  }

  // Initial check on startup
  checkForUpdates();
  // Check every 60 minutes
  setInterval(checkForUpdates, 3600000);
  
  // 12-HOUR PERIODIC AUTO-RELOAD (For TV stability)
  setInterval(() => {
    const isTv = document.body.classList.contains('tv-mode');
    const modalOpen = document.getElementById('add-post-modal') && !document.getElementById('add-post-modal').classList.contains('hidden');
    
    // Only reload if in TV mode and NOT currently editing a post OR if it's 3 AM-ish (quiet time)
    if (isTv && !modalOpen) {
      console.log("[Maintenance] Performing scheduled 12-hour hard reset...");
      window.location.reload();
    }
  }, 12 * 60 * 60 * 1000); 

console.log('--- SAS APP LOADING (v11 + Sidebar Fix) ---');
document.addEventListener('DOMContentLoaded', () => {

  // --- TV Clock Logic ---
  // Utility to extract Drive ID
  function getDriveId(url) {
    if (!url) return null;
    const match = url.match(/[?&]id=([^&#]+)/) || url.match(/\/file\/d\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function getYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  let fbInitPromise = null;
  window.fbPlayers = {};
  // --- GLOBAL HELPERS FOR MEDIA SCOPES ---
  function getScopedElements(scope) {
    return {
      previewGroup: document.getElementById(`${scope}-img-preview-group`),
      previewImg: document.getElementById(`${scope}-preview-img`),
      previewContainer: document.getElementById(`${scope}-preview-container`),
      previewWrapper: document.getElementById(`${scope}-preview-transform-wrapper`),
      videoGroup: document.getElementById(`${scope}-video-settings-group`),
      videoPlayer: document.getElementById(`${scope}-video-preview-player`),
      videoIframe: document.getElementById(`${scope}-video-preview-iframe-wrapper`),
      zoomSlider: document.getElementById(`${scope}-img-zoom`),
      zoomVal: document.getElementById(`${scope}-preview-zoom-val`),
      resetBtn: document.getElementById(`${scope}-preview-reset-btn`),
      posInput: document.getElementById(`${scope}-img-pos`),
      sizeInput: document.getElementById(`${scope}-img-size-val`),
      coordsDisplay: document.getElementById(`${scope}-preview-coords`),
      // Video range elements
      vStartDisplay: document.getElementById(`${scope}-video-start-display`),
      vEndDisplay: document.getElementById(`${scope}-video-duration-display`),
      vSliderStart: document.getElementById(`${scope}-video-slider-start`),
      vSliderEnd: document.getElementById(`${scope}-video-slider-end`),
      vStartHidden: document.getElementById(`${scope}-video-start`),
      vEndHidden: document.getElementById(`${scope}-video-end`)
    };
  }

  const transformStates = {
    upload: { zoom: 1, x: 0, y: 0 },
    url: { zoom: 1, x: 0, y: 0 }
  };

  function updateTransform(scope, zoom, x, y) {
    const els = getScopedElements(scope);
    const state = transformStates[scope];
    if (!els.previewWrapper || !state) return;
    
    if (zoom !== undefined) state.zoom = zoom;
    if (x !== undefined) state.x = x;
    if (y !== undefined) state.y = y;
    
    els.previewWrapper.style.transform = `scale(${state.zoom}) translate(${state.x}%, ${state.y}%)`;
    const posStr = `${Math.round(state.x)}%, ${Math.round(state.y)}%`;

    if (els.posInput) els.posInput.value = `${state.x} ${state.y}`;
    if (els.sizeInput) els.sizeInput.value = state.zoom;
    if (els.coordsDisplay) els.coordsDisplay.textContent = posStr;
  }
  window.updateTransform = updateTransform;

  function initFbSdk() {
    if (fbInitPromise) return fbInitPromise;
    
    fbInitPromise = new Promise((resolve) => {
      if (window.FB) {
         resolve();
         return;
      }
      
      window.fbAsyncInit = function() {
        FB.init({ xfbml: true, version: 'v19.0' });
        FB.Event.subscribe('xfbml.ready', function(msg) {
          if (msg.type === 'video') {
            window.fbPlayers[msg.id] = msg.instance;
            const el = document.getElementById(msg.id);
            if (el && el.closest('.home-news-slide.is-active')) {
              try {
                 if (window.tvAudioEnabled) msg.instance.unmute();
                 else msg.instance.mute();
                 msg.instance.play();
              } catch(e) {}
            }
          }
        });
        resolve();
      };
      
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(js);
    });
    
    return fbInitPromise;
  }

  function getFacebookVideoUrl(url) {
    if (!url) return null;
    const urlLower = url.toLowerCase();
    // Support full URLs, mobile URLs, IDs, and paths
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com') || urlLower.includes('/videos/') || urlLower.includes('watch?v=')) {
      let fbHref = url;
      
      // Try to normalize to a very standard format if possible
      const vMatch = url.match(/[?&]v=([^&#]+)/) || url.match(/\/videos\/([^/?#]+)/) || url.match(/\/reel\/([^/?#]+)/);
      if (vMatch) {
         fbHref = `https://www.facebook.com/video.php?v=${vMatch[1]}`;
      } else if (url.startsWith('/')) {
         fbHref = 'https://www.facebook.com' + url;
      } else if (!url.includes('://')) {
         fbHref = 'https://www.facebook.com/' + url;
      }

      return fbHref; // Return raw URL for FB SDK
    }
    return null;
  }

  class DigitCounter {
    constructor(parent, initialValue = '0') {
      this.parent = parent;
      this.currentValue = null; // Set to null to force first update
      this.element = this.createDigitElement();
      this.parent.appendChild(this.element);
      this.container = this.element.querySelector('.counter-column-container');
      this.update(initialValue); // Apply initial position
    }

    createDigitElement() {
      const wrapper = document.createElement('div');
      wrapper.className = 'counter-column-wrapper';
      const container = document.createElement('div');
      container.className = 'counter-column-container';

      // Create digits 0-9
      for (let i = 0; i <= 9; i++) {
        const digit = document.createElement('div');
        digit.className = 'counter-digit';
        digit.textContent = i;
        container.appendChild(digit);
      }

      wrapper.appendChild(container);
      return wrapper;
    }

    update(newValue) {
      // Check for height change as well as value change
      const isImmersive = document.body.classList.contains('tv-mode') || 
                          document.body.classList.contains('fullscreen-active') || 
                          document.body.classList.contains('video-fullscreen-active');
      const digitHeight = isImmersive ? 40 : 60;
      
      if (this.currentValue === newValue && this.lastHeight === digitHeight) return;
      
      this.currentValue = newValue;
      this.lastHeight = digitHeight;
      
      const offset = -parseInt(newValue, 10) * digitHeight;
      this.container.style.transform = `translateY(${offset}px)`;
    }
  }

  let digitCounters = [];

  function updateClock() {
    const clock = document.getElementById('tv-clock');
    const timeEl = document.getElementById('tv-time');
    const dateEl = document.getElementById('tv-date');
    if (!clock || !timeEl || !dateEl) return;

    const now = new Date();

    // Format: "09:41 AM"
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Split into characters: ["0", "9", ":", "4", "1", " ", "A", "M"]
    const chars = timeStr.split('');

    // Initialize counters if they don't exist
    if (digitCounters.length === 0) {
      timeEl.innerHTML = '';
      chars.forEach(char => {
        if (/\d/.test(char)) {
          digitCounters.push(new DigitCounter(timeEl, char));
        } else {
          const sep = document.createElement('div');
          sep.className = 'counter-separator';
          sep.textContent = char;
          timeEl.appendChild(sep);
          digitCounters.push({ update: (val) => { sep.textContent = val; } });
        }
      });
    }

    // Update existing counters
    chars.forEach((char, i) => {
      if (digitCounters[i]) {
        digitCounters[i].update(char);
      }
    });

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  }

  async function updateWeather() {
    const weatherEl = document.getElementById('tv-weather');
    if (!weatherEl) return;

    try {
      // Coordinates for Manolo Fortich, Bukidnon
      const lat = 8.3569;
      const lon = 124.8622;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.current) {
        const temp = Math.round(data.current.temperature_2m);
        weatherEl.innerHTML = `<span class="weather-temp">${temp}°C</span>`;
      }
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }
  }

  updateClock();
  updateWeather();
  setInterval(updateClock, 1000);
  setInterval(updateWeather, 1800000); // 30 minutes

  const navDynamic = document.getElementById('nav-dynamic');
  const statSystems = document.getElementById('stat-systems');
  const homePage = document.getElementById('home');
  const loadingPage = document.getElementById('loading');
  const systemViewPage = document.getElementById('system-view');
  const systemFrame = document.getElementById('system-frame');
  const sidebar = document.querySelector('.sidebar');
  const navToggle = document.getElementById('nav-toggle');
  const navOverlay = document.getElementById('nav-overlay');

  // New UI elements for login/user menu
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');
  const userDisplayName = document.getElementById('user-display-name');
  const userDropdownName = document.getElementById('user-dropdown-name');
  const logoutBtn = document.getElementById('logout-btn');

  // TV Settings UI Elements
  const tvSettingsBox = document.getElementById('tv-settings');
  const btnTvAudio = document.getElementById('tv-audio-toggle');
  const btnTvTheater = document.getElementById('tv-fullscreen-toggle');
  const btnTvHeaderToggle = document.getElementById('tv-header-toggle');
  const btnSidebarToggle = document.getElementById('sidebar-toggle');
  const btnAdminExitTv = document.getElementById('admin-exit-tv');

  let systems = [];
  let systemsLoaded = false;
  let systemsPromise = null;
  let ytPlayers = {}; // Persistent store for YT players
  let globalCarouselTimer = null;
  let globalSlideGeneration = 0;

  // Sidebar Collapse Persistence
  const isSidebarCollapsed = localStorage.getItem('sas_sidebar_collapsed') === 'true';
  if (isSidebarCollapsed && sidebar) {
    sidebar.classList.add('collapsed');
  }

  // Admin Exit TV Logic
  if (btnAdminExitTv) {
    btnAdminExitTv.addEventListener('click', () => {
      // Clear TV-specific states
      localStorage.removeItem('sas_admin_tv_view');
      document.body.classList.remove('tv-mode');
      document.body.classList.remove('tv-header-collapsed');
      
      // The most robust way to restore the full Admin Dashboard layout
      // after such heavy DOM/CSS manipulation is a clean reload to #home.
      window.location.hash = 'home';
      setTimeout(() => {
        window.location.reload();
      }, 50);
    });
  }

  function setActiveNav(item) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (item) item.classList.add('active');
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = pageId === 'home'
      ? homePage
      : (pageId === 'loading' ? loadingPage : (pageId === 'system-view' ? systemViewPage : null));
    if (page) page.classList.add('active');
  }

  function getHashPageId() {
    var hash = (window.location.hash || '#home').replace('#', '');
    if (!hash) return 'home';
    return hash;
  }

  function syncFromHash() {
    if (!systemsLoaded) {
      // If called before config, defer until ready
      if (systemsPromise) {
        systemsPromise.then(() => syncFromHash());
      }
      return;
    }
    var pageId = getHashPageId();
    if (pageId === 'home') {
      setActiveNav(document.querySelector('.nav-item[data-page="home"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('home');
      return;
    }

    var sys = systems.find(function (s) { return s.id === pageId; });
    
    // --- RBAC CHECK ---
    const sessionData = sessionStorage.getItem('sas_user_data');
    let userRole = 'guest';
    if (sessionData) {
      try { userRole = JSON.parse(sessionData).role; } catch(e) {}
    }

    if (!sys) {
      setActiveNav(document.querySelector('.nav-item[data-page="home"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('home');
      return;
    }

    // Determine if user has permission
    const allowedRoles = sys.roles || ['admin']; // Default to admin only if not specified
    const hasAccess = allowedRoles.includes(userRole);

    console.log(`[RBAC] User: ${userRole}, System: ${pageId}, Allowed: ${allowedRoles}, Success: ${hasAccess}`);

    if (!hasAccess) {
      console.warn(`[Security] ${userRole} attempted to access restricted system: ${pageId}`);
      showToast(`Access Denied: ${userRole} is not authorized for ${sys.name}`, "error");
      window.location.hash = 'home';
      return;
    }

    // If user navigates to an external system via hash, open it in a new tab
    // and return them to home (so the iframe view isn't used for external apps).
    if (sys.external) {
      window.open(sys.url, '_blank', 'noopener');
      window.location.hash = 'home';
      return;
    }

    var el = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (el) setActiveNav(el);

    document.body.classList.add('system-mode');
    closeNav();
    showPage('system-view');
    if (systemFrame) systemFrame.src = sys.url;
  }

  function openNav() {
    if (!sidebar || !navOverlay || !navToggle) return;
    sidebar.classList.add('is-open');
    navOverlay.hidden = false;
    navToggle.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    if (!sidebar || !navOverlay || !navToggle) return;
    sidebar.classList.remove('is-open');
    navOverlay.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
  }

  function groupBySection(items) {
    var groups = {};
    items.forEach(function (s) {
      var section = s.section || 'Systems';
      if (!groups[section]) groups[section] = [];
      groups[section].push(s);
    });
    return groups;
  }

  function renderNav() {
    const sessionData = sessionStorage.getItem('sas_user_data');
    let userRole = 'guest';

    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        userRole = userData.role;
      } catch (e) { }
    }
    
    // System Icon Mapping (Lucide-style SVGs)
    const SYSTEM_ICONS = {
      'tv-view': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
      'attendance-scanner': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`,
      'schedule-manager': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      'foundation-day-attendance': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
      'nbsc-mailer': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
      'lost-and-found': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      'borrowers-log': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      'default': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`
    };

    console.log('[Sidebar] User Role:', userRole);
    console.log('[Sidebar] Total Systems in Config:', systems.length);

    // Filter systems based on role
    const allowedSystems = systems.filter(s => {
      const allowedRoles = s.roles || ['admin'];
      const hasAccess = allowedRoles.includes(userRole);
      console.log(`[Sidebar] System ${s.id} allowed: ${hasAccess} (Roles: ${allowedRoles})`);
      return hasAccess;
    });
    console.log('[Sidebar] Allowed Systems for User:', allowedSystems.length);

    var groups = groupBySection(allowedSystems);
    var sectionNames = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });

    let adminTvNav = '';
    if (userRole === 'admin') {
      adminTvNav = `
        <div class="nav-section-label">Admin Tools</div>
        <a href="#home" class="nav-item" id="nav-toggle-tv" data-page="home">
          <span class="nav-icon">${SYSTEM_ICONS['tv-view']}</span>
          <span class="nav-label">TV View</span>
        </a>
      `;
    }

    if (allowedSystems.length === 0 && userRole !== 'admin') {
      navDynamic.innerHTML = '<div class="nav-section-label">Protected Content</div><div style="padding:10px 16px; font-size:0.85rem; color:var(--text-muted);">Your account has limited access to internal systems. Contact admin for permissions.</div>';
      return;
    }

    navDynamic.innerHTML = adminTvNav + sectionNames
      .map(function (sectionName) {
        var itemsHtml = groups[sectionName]
          .map(function (s) {
            return (
              '<a href="' + (s.external ? s.url : '#' + s.id) + '" class="nav-item" data-page="' + s.id + '"' +
              (s.external ? ' target="_blank" rel="noopener"' : '') + '>' +
              '<span class="nav-icon">' + (SYSTEM_ICONS[s.id] || SYSTEM_ICONS['default']) + '</span><span class="nav-label">' + escapeHtml(s.name) + '</span></a>'
            );
          })
          .join('');
        return '<div class="nav-section-label">' + escapeHtml(sectionName) + '</div>' + itemsHtml;
      })
      .join('');

    // Re-bind listeners
    navDynamic.querySelectorAll('.nav-item').forEach(function (a) {
      if (a.id === 'nav-toggle-tv') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          document.body.classList.add('tv-mode');
          localStorage.setItem('sas_admin_tv_view', 'true');
          if (btnAdminExitTv) btnAdminExitTv.classList.remove('hidden');
          if (navToggle) navToggle.hidden = true; // Lock down sidebar
          tvSettingsBox.classList.remove('hidden');
          window.location.hash = 'home';
          closeNav();
          fetchPosts(); // Trigger carousel
        });
        return;
      }

      if (a.getAttribute('target') !== '_blank') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.hash = this.getAttribute('data-page');
          closeNav();
        });
      } else {
        a.addEventListener('click', function () { setActiveNav(null); });
      }
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 4000);
  }

  function showConfirm(title, message, showPassword = false, type = 'info') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const card = modal.querySelector('.modal-card');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const iconEl = document.getElementById('confirm-modal-icon');
      const inputGroup = document.getElementById('confirm-modal-input-group');
      const passwordInput = document.getElementById('confirm-modal-password');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const okBtn = document.getElementById('confirm-modal-ok');

      // Clear previous types
      card.classList.remove('modal-danger', 'modal-warning', 'modal-success', 'modal-info');
      card.classList.add(`modal-${type}`);

      // Set Icon
      const icons = {
        danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      };
      iconEl.innerHTML = icons[type] || icons.info;

      titleEl.textContent = title;
      messageEl.textContent = message;
      passwordInput.value = '';

      if (showPassword) {
        inputGroup.classList.remove('hidden');
      } else {
        inputGroup.classList.add('hidden');
      }

      modal.classList.remove('hidden');
      
      // Accessibility: Autofocus
      if (showPassword) {
        passwordInput.focus();
      } else {
        okBtn.focus();
      }

      const cleanup = (result) => {
        modal.classList.add('hidden');
        cancelBtn.onclick = null;
        okBtn.onclick = null;
        document.removeEventListener('keydown', handleEsc);
        resolve(result);
      };

      const handleEsc = (e) => {
        if (e.key === 'Escape') cleanup(null);
      };
      document.addEventListener('keydown', handleEsc);

      cancelBtn.onclick = () => cleanup(null);
      okBtn.onclick = () => {
        if (showPassword) {
          const pass = passwordInput.value.trim();
          if (!pass) {
            showToast("Password is required", "error");
            passwordInput.focus();
            return;
          }
          cleanup(pass);
        } else {
          cleanup(true);
        }
      };

      // Close on overlay click
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(null);
      };
    });
  }

  // Helper functions for UI state
  function showLoginUI() {
    document.body.classList.remove('system-mode');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (navToggle) navToggle.hidden = true;
    if (userMenuBtn) userMenuBtn.hidden = true;
    if (tvSettingsBox) tvSettingsBox.classList.add('hidden');
  }

  function showAppUI(userObj) {
    if (loginOverlay) loginOverlay.classList.add('hidden');
    if (navToggle) navToggle.hidden = false;
    if (userMenuBtn) userMenuBtn.hidden = false;
    setupUserMenu(userObj);
    finishInit();
  }

  // Check login state on load
  const sessionData = sessionStorage.getItem('sas_user_data');
  if (sessionData) {
    const userObj = JSON.parse(sessionData);
    showAppUI(userObj);
  } else {
    showLoginUI();
  }

  // Bind TV Settings Toggles
  if (btnTvAudio) {
    btnTvAudio.addEventListener('click', () => {
      tvAudioEnabled = !tvAudioEnabled;
      if (tvAudioEnabled) {
        btnTvAudio.classList.add('active-setting');
        btnTvAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`; // Unmuted Icon
      } else {
        btnTvAudio.classList.remove('active-setting');
        btnTvAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`; // Muted Icon
      }
    });
  }

  if (btnTvTheater) {
    btnTvTheater.addEventListener('click', () => {
      tvTheaterEnabled = !tvTheaterEnabled;
      btnTvTheater.classList.toggle('active-setting', tvTheaterEnabled);
      setActive(current);
    });
  }

  if (btnTvHeaderToggle) {
    btnTvHeaderToggle.addEventListener('click', () => {
      const isCollapsed = document.body.classList.toggle('tv-header-collapsed');
      localStorage.setItem('sas_tv_header_collapsed', isCollapsed);
      // Ensure layout adjusts (if needed for any internal elements)
      window.dispatchEvent(new Event('resize'));
    });
  }

  if (btnSidebarToggle) {
    btnSidebarToggle.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('sas_sidebar_collapsed', isCollapsed);
      // Help any open iframe-based system adapt to the new width
      window.dispatchEvent(new Event('resize'));
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const user = document.getElementById('login-username').value;
      const pass = document.getElementById('login-password').value;
      const btn = loginForm.querySelector('.login-btn');
      const origBtnText = btn.textContent;

      if (user.trim() !== '' && pass.trim() !== '') {
        btn.textContent = 'Authenticating...';
        btn.disabled = true;
        loginError.classList.add('hidden');

        if (BACKEND_GAS_URL === "YOUR_NEW_BACKEND_GAS_URL_HERE" || !BACKEND_GAS_URL.startsWith("https://")) {
          console.error("[Config Error] window.ENV:", window.ENV);
          loginError.textContent = "Developer Error: Please check your env.js file and ensure BACKEND_GAS_URL is set correctly.";
          loginError.classList.remove('hidden');
          btn.textContent = origBtnText;
          btn.disabled = false;
          return;
        }

        try {
          const formData = new URLSearchParams();
          formData.append('action', 'login');
          formData.append('username', user);
          formData.append('password', pass);

          const r = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            // Using x-www-form-urlencoded to avoid CORS preflight issues with GAS
            body: formData
          });

          const responseData = await r.json();

          if (responseData.success) {
            // Note: Storing password in sessionStorage is necessary here to re-authenticate 
            // the 'updateTvSettings' payload against Google Apps Script without a JWT token.
            const sessionObj = { username: responseData.username, role: responseData.role, password: pass };
            sessionStorage.setItem('sas_user_data', JSON.stringify(sessionObj));

            showAppUI(sessionObj);
          } else {
            loginError.textContent = responseData.message || "Invalid credentials.";
            loginError.classList.remove('hidden');
          }
        } catch (err) {
          loginError.textContent = (BACKEND_GAS_URL.includes("YOUR_NEW_BACKEND_GAS_URL_HERE")) 
            ? "Setup Error: Backend URL (BACKEND_GAS_URL) is missing. Set your GitHub Secrets."
            : "Check network. Could not connect to Google Servers.";
          loginError.classList.remove('hidden');
          console.error(err);
        } finally {
          btn.textContent = origBtnText;
          btn.disabled = false;
        }
      } else {
        loginError.textContent = "Please fill in all fields.";
        loginError.classList.remove('hidden');
      }
    });
  }

  function finishInit() {
    document.querySelector('.nav-item[data-page="home"]').addEventListener('click', function (e) {
      e.preventDefault();
      document.body.classList.remove('tv-mode');
      localStorage.removeItem('sas_admin_tv_view');
      window.location.hash = 'home';
      closeNav();
      fetchPosts(); // Reload for admin card view
    });

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        if (!sidebar) return;
        if (sidebar.classList.contains('is-open')) closeNav();
        else openNav();
      });
    }

    if (navOverlay) {
      navOverlay.addEventListener('click', closeNav);
    }

    // If user opens a deep link (/#some-system), show loading page until config loads.
    if (getHashPageId() !== 'home') {
      setActiveNav(null);
      showPage('loading');
    }

    // Load config ONCE from window.ENV
    if (!systemsPromise) {
      systemsPromise = new Promise((resolve) => {
        systems = window.ENV?.systems || [];
        systemsLoaded = true;
        
        if (statSystems) statSystems.textContent = systems.length;
        renderNav();
        initPostSetup();
        fetchPosts(); // Load dynamic posts
        syncFromHash();
        resolve(systems);
      });
    }

    // View Mode Toggle Logic
    const viewMenu = document.getElementById('view-menu');
    const viewMenuBtn = document.getElementById('view-menu-btn');
    const viewMenuDropdown = document.getElementById('view-menu-dropdown');
    const viewOptions = document.querySelectorAll('.view-option');
    const postsContainer = document.getElementById('posts-container');

    function setViewMode(mode) {
      if (!postsContainer) return;
      
      // Remove all view classes
      postsContainer.classList.remove('view-xl', 'view-lg', 'view-md', 'view-sm');
      // Add selected view class
      postsContainer.classList.add(`view-${mode}`);
      
      // Update active state in dropdown
      viewOptions.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-view') === mode);
      });
      
      // Update button label text
      const viewLabel = document.getElementById('view-menu-label');
      if (viewLabel) {
        const modeNames = { 'xl': 'Extra Large', 'lg': 'Large', 'md': 'Medium', 'sm': 'Small' };
        viewLabel.textContent = `View: ${modeNames[mode] || mode}`;
      }

      // Persist choice
      localStorage.setItem('sas_post_view_mode', mode);
      
      // Close menu
      if (viewMenu) viewMenu.classList.remove('is-open');
      if (viewMenuBtn) viewMenuBtn.setAttribute('aria-expanded', 'false');
      
      console.log(`[View] Mode set to: ${mode}`);
      
      // Force layout recalculation for any potential issues
      window.dispatchEvent(new Event('resize'));
    }

    if (viewMenuBtn) {
      viewMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = viewMenu.classList.toggle('is-open');
        viewMenuBtn.setAttribute('aria-expanded', isOpen);
      });
    }

    viewOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        setViewMode(opt.getAttribute('data-view'));
      });
    });

    // Close view menu when clicking outside
    document.addEventListener('click', (e) => {
      if (viewMenu && !viewMenu.contains(e.target)) {
        viewMenu.classList.remove('is-open');
        if (viewMenuBtn) viewMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Initialize View Mode
    const savedViewMode = localStorage.getItem('sas_post_view_mode') || 'md';
    setViewMode(savedViewMode);

    // Register listener ONCE globally inside DOMContentLoaded
    if (!window._sas_hash_bound) {
      window.addEventListener('hashchange', syncFromHash);
      window._sas_hash_bound = true;
    }
    
    // Trigger initial check if needed (though it might handle internally by promise)
    syncFromHash();
  }

  function setupUserMenu(userObj) {
    // Adjust UI based on TV Mode
    if (userObj.role === 'tv') {
      document.body.classList.add('tv-mode');
      tvSettingsBox.classList.remove('hidden');
      if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
      if (navToggle) navToggle.hidden = true; // No sidebar toggle for TV Role
      if (sidebar) sidebar.style.display = 'none'; // Explicitly hide sidebar element

      // Persistence for TV Header collapse
      const tvHeaderCollapsed = localStorage.getItem('sas_tv_header_collapsed') === 'true';
      if (tvHeaderCollapsed) {
        document.body.classList.add('tv-header-collapsed');
      }
      if (btnTvHeaderToggle) btnTvHeaderToggle.classList.remove('hidden');

      // Attempt actual fullscreen via API explicitly for the TV role
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log("Auto-fullscreen blocked by browser. User gesture needed.");
          });
        }
      } catch (err) { }
    } else if (userObj.role === 'admin') {
      const adminTvView = localStorage.getItem('sas_admin_tv_view') === 'true';
      if (adminTvView) {
        document.body.classList.add('tv-mode');
        document.body.classList.remove('dashboard-backdrop');
        if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden'); // Toggle visibility fixed
        if (navToggle) navToggle.hidden = true;
        if (sidebar) sidebar.style.display = 'none';
        if (btnTvHeaderToggle) btnTvHeaderToggle.classList.remove('hidden');
      } else {
        document.body.classList.remove('tv-mode');
        document.body.classList.add('dashboard-backdrop');
        if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
        if (navToggle) navToggle.hidden = false;
        if (sidebar) sidebar.style.display = '';
        if (btnTvHeaderToggle) btnTvHeaderToggle.classList.add('hidden');
      }
      tvSettingsBox.classList.remove('hidden');
      if (btnSidebarToggle) btnSidebarToggle.classList.remove('hidden');
    } else {
      // For uploader and others, keep tv-settings hidden
      document.body.classList.remove('tv-mode');
      document.body.classList.add('dashboard-backdrop');
      tvSettingsBox.classList.add('hidden');
      if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
      if (navToggle) navToggle.hidden = false;
      if (sidebar) sidebar.style.display = '';
      // Sidebar toggle is hidden by default in index.html, we only show it for Admins above
    }

    const displayName = userDisplayName;
    const dropName = userDropdownName;

    // Check if role is admin and format text
    const displayStr = userObj.username;
    let roleBadge = '';

    if (userObj.role === 'admin') {
      roleBadge = '<span style="background:var(--nbsc-gold); color:var(--nbsc-dark); padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">ADMIN</span>';
    } else if (userObj.role === 'uploader') {
      roleBadge = '<span style="background:#3b82f6; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">UPLOADER</span>';
    } else if (userObj.role === 'tv') {
      roleBadge = '<span style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">TV</span>';

      // Trigger TV Mode DOM manipulation
      const homeTitle = document.querySelector('.home-header-title');
      const homeSub = document.querySelector('.home-header-subtitle');
      if (homeTitle) homeTitle.textContent = "ANNOUNCEMENT";
      if (homeSub) homeSub.style.display = 'none';
    }

    if (displayName) displayName.innerHTML = displayStr;
    if (dropName) dropName.innerHTML = `${displayStr} ${roleBadge}`;

    const userMenu = userMenuDropdown;
    const userBtn = userMenuBtn;

    if (userBtn && userMenu) {
      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        userMenu.classList.toggle('is-open');
      });
      document.addEventListener('click', function (e) {
        if (!userMenu.contains(e.target)) {
          userMenu.classList.remove('is-open');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        sessionStorage.removeItem('sas_user_data');
        window.location.reload();
      });
    }

    // Admin/Uploader check for "Add Post" button
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn && (userObj.role === 'admin' || userObj.role === 'uploader')) {
      addPostBtn.classList.remove('hidden');
    }
  }

  function initPostSetup() {
    const addPostBtn = document.getElementById('add-post-btn');
    const modal = document.getElementById('add-post-modal');
    const cancelBtn = document.getElementById('cancel-post-btn');
    const form = document.getElementById('add-post-form');
    const errorMsg = document.getElementById('post-error');
    const imgInput = document.getElementById('post-img');
    const liveInput = document.getElementById('post-live-url');

    // Video Playback Settings (Global references for convenience where needed)
    const videoStartInput = document.getElementById('post-video-start');
    const videoEndInput = document.getElementById('post-video-end');

    const videoPreviewPlayer = document.getElementById('video-preview-player');
    const videoPreviewIframe = document.getElementById('video-preview-iframe-wrapper');
    const videoPreviewLoading = document.getElementById('video-preview-loading');
    const videoStartDisplay = document.getElementById('video-start-display');
    const videoDurationDisplay = document.getElementById('video-duration-display');
    const sliderStart = document.getElementById('post-video-slider-start');
    const sliderEnd = document.getElementById('post-video-slider-end');
    const durationSlider = document.getElementById('post-display-duration');
    const durationValDisplay = document.getElementById('post-display-duration-val');
    
    if (durationSlider && durationValDisplay) {
      durationSlider.addEventListener('input', (e) => {
        durationValDisplay.textContent = e.target.value + 's';
      });
    }
    
    let videoDuration = 0;
    let previewYtPlayer = null;
    let previewFbPlayer = null;

    function formatTimeObj(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    async function compressImage(file, quality = 0.8, maxWidth = 1920) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
             const canvas = document.createElement('canvas');
             let width = img.width;
             let height = img.height;
             if (width > maxWidth || height > maxWidth) {
                 if (width > height) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                 } else {
                    width = (maxWidth / height) * width;
                    height = maxWidth;
                 }
             }
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, width, height);
             canvas.toBlob((blob) => {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
             }, 'image/jpeg', quality);
          };
        };
      });
    }

    async function uploadToGoogleDrive(file, onProgress) {
      // Note: This requires the GAS backend to have an 'uploadToDrive' action.
      // Since GAS has a 50MB payload limit, we use a simple Base64 approach for now.
      // For > 50MB, a chunked approach in GAS would be needed.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            if (onProgress) onProgress(50); // Simple halfway mark
            const response = await fetch(BACKEND_GAS_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: "uploadToDrive",
                fileName: file.name,
                fileData: base64
              })
            });
            const data = await response.json();
            if (data.success) {
               if (onProgress) onProgress(100);
               resolve({ secure_url: data.url, public_id: "gdrive_" + Date.now() });
            } else {
               reject(new Error(data.message || "Google Drive upload failed"));
            }
          } catch(e) { reject(e); }
        };
        reader.onerror = (e) => reject(e);
      });
    }

    async function uploadFileChunked(file, uploadPreset, cloudName, onProgress) {
      const chunkSize = 6 * 1024 * 1024; // 6MB
      const totalSize = file.size;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      const uniqueUploadId = 'sas_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      let lastResponseData = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'sas_repository');
        
        const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;
        
        if (onProgress) onProgress(Math.round((i / totalChunks) * 100));

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          headers: {
            'X-Unique-Upload-Id': uniqueUploadId,
            'Content-Range': contentRange
          },
          body: formData
        });

        lastResponseData = await response.json();
        if (!response.ok) {
           throw new Error(lastResponseData.error ? lastResponseData.error.message : "Chunked upload failed");
        }
      }
      return lastResponseData;
    }

    function updateDualSliderUI(scope) {
      const els = getScopedElements(scope);
      if (!els.vSliderStart || !els.vSliderEnd) return;
      
      const vDuration = parseFloat(els.vSliderStart.max) || 0;
      let sVal = parseInt(els.vSliderStart.value) || 0;
      let eVal = parseInt(els.vSliderEnd.value) || vDuration;

      if (sVal >= eVal) {
         // Determine which slider was moved (hacky but works if called from input listener)
         // Actually, let's just enforce a 1s difference
         sVal = eVal - 1;
         if (sVal < 0) sVal = 0;
         els.vSliderStart.value = sVal;
      }

      if (els.vStartHidden) els.vStartHidden.value = sVal;
      if (els.vEndHidden) els.vEndHidden.value = eVal;
      if (els.vStartDisplay) els.vStartDisplay.textContent = formatTimeObj(sVal);
      if (els.vEndDisplay) els.vEndDisplay.textContent = formatTimeObj(eVal) + " (Max: " + formatTimeObj(vDuration) + ")";
    }

    function onSliderInput(e) {
      const scope = this.getAttribute('data-scope') || 'upload';
      updateDualSliderUI(scope);
      
      const els = getScopedElements(scope);
      const targetTime = parseInt(this.value);
      if (els.videoPlayer && els.videoPlayer.style.display !== 'none' && isFinite(els.videoPlayer.duration)) {
        els.videoPlayer.currentTime = targetTime;
      } else if (window[`previewYtPlayer_${scope}`] && typeof window[`previewYtPlayer_${scope}`].seekTo === 'function') {
        window[`previewYtPlayer_${scope}`].seekTo(targetTime, true);
      }
    }

    // Attachment helper
    function attachSliderListeners(scope) {
      const els = getScopedElements(scope);
      if (els.vSliderStart) {
        els.vSliderStart.setAttribute('data-scope', scope);
        els.vSliderStart.addEventListener('input', onSliderInput);
      }
      if (els.vSliderEnd) {
        els.vSliderEnd.setAttribute('data-scope', scope);
        els.vSliderEnd.addEventListener('input', onSliderInput);
      }
    }
    attachSliderListeners('upload');
    attachSliderListeners('url');

    // Optimized Google Drive Resumable Upload
  async function uploadToGoogleDriveResumable(file, onProgress) {
      // 1. Get OAuth Token from GAS
      const tokenRes = await fetch(BACKEND_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "getDriveToken" })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.success || !tokenData.token) throw new Error("Could not get Drive authorization token.");
      const token = tokenData.token;

      // 2. Initiate Resumable Session
      const metadata = {
        name: file.name,
        mimeType: file.type
      };

      const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(metadata)
      });

      if (!initRes.ok) throw new Error("Failed to initiate Google Drive session.");
      const location = initRes.headers.get('Location');

      // 3. Upload File logic using XHR for progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', location, true);
        xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const finalData = JSON.parse(xhr.responseText);
            const fileId = finalData.id;
            
            // 4. Set Public via GAS
            const setPublicRes = await fetch(BACKEND_GAS_URL, {
              method: 'POST',
              body: JSON.stringify({ action: "setFilePublic", fileId: fileId })
            });
            const setPublicData = await setPublicRes.json();
            
            resolve({ 
              secure_url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`, 
              public_id: fileId,
              drivePreviewUrl: setPublicData.url || `https://drive.google.com/file/d/${fileId}/preview`
            });
          } else {
            reject(new Error("Drive upload failed: " + xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during Drive upload."));
        xhr.send(file);
      });
    }

    window.loadPreviewVideo = async function(url, isFile = false, resetValues = true, scope = 'upload') {
       const els = getScopedElements(scope);
       if (!els.videoGroup) return;

       if (els.videoPlayer) els.videoPlayer.style.display = 'none';
       if (els.videoIframe) {
         els.videoIframe.style.display = 'none';
         els.videoIframe.innerHTML = '';
       }
       
       if (resetValues) {
          if (els.vStartHidden) els.vStartHidden.value = '';
          if (els.vEndHidden) els.vEndHidden.value = '';
          if (els.vSliderStart) els.vSliderStart.value = 0;
          if (els.vSliderEnd) els.vSliderEnd.value = 100;
       }

       window[`previewYtPlayer_${scope}`] = null;
       
       const ytId = getYouTubeVideoId(url);
       const fbEmbedUrl = getFacebookVideoUrl(url);
       
       if (ytId && !isFile) {
         if (els.videoIframe) {
           els.videoIframe.style.display = 'block';
           const anchorId = `preview-yt-anchor-${scope}`;
           els.videoIframe.innerHTML = `<div id="${anchorId}"></div>`;
           
           if (window.YT && window.YT.Player) {
              window[`previewYtPlayer_${scope}`] = new YT.Player(anchorId, {
                videoId: ytId,
                playerVars: { controls: 0, disablekb: 1 },
                events: {
                  'onReady': (event) => {
                     const dur = Math.floor(event.target.getDuration());
                     if (els.vSliderStart) els.vSliderStart.max = dur;
                     if (els.vSliderEnd) els.vSliderEnd.max = dur;
                     if (els.vSliderEnd) els.vSliderEnd.value = els.vEndHidden.value || dur;
                     if (els.vSliderStart) els.vSliderStart.value = els.vStartHidden.value || 0;
                     updateDualSliderUI(scope);
                  }
                }
              });
           }
         }
       } else if (fbEmbedUrl && !isFile) {
          await initFbSdk();
          if (els.videoIframe) {
            els.videoIframe.style.display = 'block';
            const fbId = 'fb-preview-' + scope + '-' + Date.now();
            els.videoIframe.innerHTML = `<div id="${fbId}" class="fb-video" data-href="${url}" data-width="auto" data-allowfullscreen="true" data-autoplay="false"></div>`;
            if (window.FB) {
              FB.XFBML.parse(els.videoIframe, () => {
                 // FB preview state management is complex with scopes, omitting for now to keep code lean unless requested
              });
            }
          }
       } else {
         if (els.videoPlayer) {
           els.videoPlayer.style.display = 'block';
           els.videoPlayer.src = url;
           els.videoPlayer.onloadedmetadata = () => {
              const dur = Math.floor(els.videoPlayer.duration);
              if (els.vSliderStart) els.vSliderStart.max = isFinite(dur) ? dur : 100;
              if (els.vSliderEnd) els.vSliderEnd.max = isFinite(dur) ? dur : 100;
              if (els.vSliderEnd) els.vSliderEnd.value = els.vEndHidden.value || dur || 100;
              if (els.vSliderStart) els.vSliderStart.value = els.vStartHidden.value || 0;
              updateDualSliderUI(scope);
           };
         }
       }
    };

    // === UPLOAD TAB SWITCHING ===
    const uploadTabBtns = document.querySelectorAll('.upload-tab');
    const uploadPanels = { 
      upload: document.getElementById('upload-tab-upload'), 
      url: document.getElementById('upload-tab-url'),
      live: document.getElementById('upload-tab-live')
    };
    let activeUploadTab = 'upload'; // Default to file upload

    uploadTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        uploadTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeUploadTab = btn.dataset.tab;
        Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
        if (uploadPanels[activeUploadTab]) uploadPanels[activeUploadTab].classList.remove('hidden');
        
        const scheduleSection = document.getElementById('post-scheduling-section');

        if (activeUploadTab === 'live') {
           if (scheduleSection) scheduleSection.classList.add('hidden');
        } else {
           if (scheduleSection) scheduleSection.classList.remove('hidden');
        }

        // --- RE-TRIGGER PREVIEWS ON TAB SWITCH ---
        if (activeUploadTab === 'url') {
           const urlInput = document.getElementById('post-img');
           if (urlInput && urlInput.value.trim()) {
              urlInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
           }
        } else if (activeUploadTab === 'upload') {
           const fileInput = document.getElementById('post-file');
           if (fileInput && fileInput.files && fileInput.files[0]) {
              handleFileSelection(fileInput.files[0]);
           }
        } else if (activeUploadTab === 'live') {
           const lInput = document.getElementById('post-live-url');
           if (lInput && lInput.value.trim()) {
              lInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
           }
        }
      });
    });

    // === FILE INPUT + DRAG/DROP FEEDBACK ===
    const fileInput = document.getElementById('post-file');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileLabelText = document.getElementById('file-label-text');

    function handleFileSelection(file) {
      const els = getScopedElements('upload');
      if (!file) {
        if (fileLabelText) fileLabelText.textContent = 'Choose a file or drag it here';
        if (fileUploadLabel) fileUploadLabel.classList.remove('file-selected');
        const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
        if (iconWrapper) iconWrapper.style.color = '';
        if (els.previewGroup) els.previewGroup.style.display = 'none';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        return;
      }

      if (fileLabelText) fileLabelText.textContent = '✅ ' + file.name;
      if (fileUploadLabel) fileUploadLabel.classList.add('file-selected');
      const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
      if (iconWrapper) iconWrapper.style.color = '#16a34a';

      if (file.type.startsWith('image/')) {
        console.log("FILE PREVIEW: Image detected:", file.name);
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        if (els.previewGroup) {
          els.previewGroup.classList.remove('hidden');
          els.previewGroup.style.setProperty('display', 'block', 'important');
        }

        const reader = new FileReader();
        reader.onerror = (e) => console.error("FILE PREVIEW: Reader error:", e);
        reader.onload = (e) => {
          if (els.previewImg) {
            els.previewImg.src = e.target.result;
            if (els.previewGroup) els.previewGroup.style.setProperty('display', 'block', 'important');
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        console.log("FILE PREVIEW: Video detected:", file.name);
        if (els.previewGroup) els.previewGroup.style.setProperty('display', 'none', 'important');
        if (els.videoGroup) els.videoGroup.style.setProperty('display', 'block', 'important');
        
        const fileURL = URL.createObjectURL(file);
        // We need to tell loadPreviewVideo which scope's elements to use
        if (window.loadPreviewVideo) window.loadPreviewVideo(fileURL, true, true, 'upload');
        if (els.videoGroup && els.videoGroup.scrollIntoView) {
          els.videoGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        if (els.previewGroup) els.previewGroup.style.display = 'none';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
      }
    }

    if (fileInput && fileUploadLabel) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          handleFileSelection(fileInput.files[0]);
        } else {
          handleFileSelection(null); // Clear preview if no file selected
        }
      });


      fileUploadLabel.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        fileUploadLabel.classList.add('drag-over');
      });
      fileUploadLabel.addEventListener('dragleave', () => fileUploadLabel.classList.remove('drag-over'));
      fileUploadLabel.addEventListener('drop', (ev) => {
        ev.preventDefault();
        fileUploadLabel.classList.remove('drag-over');
        if (ev.dataTransfer.files && ev.dataTransfer.files[0]) {
          fileInput.files = ev.dataTransfer.files;
          handleFileSelection(ev.dataTransfer.files[0]);
        }
      });
    }

    if (imgInput) {
      let imgInputTimeout;
      imgInput.addEventListener('input', (e) => {
        const els = getScopedElements('url');
        const runInput = () => {
          const url = imgInput.value.trim();
          if (url) {
            const urlLower = url.toLowerCase();
            const ytId = getYouTubeVideoId(url);
            const fbUrl = getFacebookVideoUrl(url);
            const isDirectVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const isVideo = ytId || fbUrl || isDirectVideo || urlLower.includes('drive.google.com') && (urlLower.includes('video') || !urlLower.includes('image'));
            
            if (isVideo) {
              if (els.previewGroup) els.previewGroup.style.display = 'none';
              if (els.videoGroup) els.videoGroup.style.display = 'block';
              if (window.loadPreviewVideo) {
                 const keep = e.detail && e.detail.keepValues;
                 window.loadPreviewVideo(url, false, !keep, 'url');
                 if (els.videoGroup) els.videoGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } else {
              if (els.videoGroup) els.videoGroup.style.display = 'none';
              if (els.previewImg) {
                 els.previewImg.src = url;
                 const dId = window.getDriveId ? getDriveId(url) : null;
                 if (dId && !url.includes('uc?id=')) {
                    els.previewImg.src = `https://drive.google.com/uc?id=${dId}`;
                 }
              }
              if (els.previewGroup) {
                els.previewGroup.style.setProperty('display', 'block', 'important');
                els.previewGroup.classList.remove('hidden');
                if (els.previewGroup.scrollIntoView) {
                  els.previewGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }
          } else {
            if (els.previewGroup) els.previewGroup.style.display = 'none';
            if (els.videoGroup) els.videoGroup.style.display = 'none';
          }
        };
        clearTimeout(imgInputTimeout);
        if (e.detail && e.detail.keepValues) runInput();
        else imgInputTimeout = setTimeout(runInput, 500);
      });
    }

      ['upload', 'url'].forEach(scope => {
        const els = getScopedElements(scope);
        if (els.previewImg && els.previewGroup) {
          els.previewImg.addEventListener('error', () => {
            console.warn(`${scope} preview failed:`, els.previewImg.src);
          });
          els.previewImg.addEventListener('load', () => {
            els.previewGroup.style.display = 'block';
          });
        }
      });

      if (liveInput) {
        let liveInputTimeout;
        liveInput.addEventListener('input', (e) => {
          const els = getScopedElements('live');
          const runLiveInput = () => {
            const url = liveInput.value.trim();
            if (url) {
              const ytId = getYouTubeVideoId(url);
              const fbUrl = getFacebookVideoUrl(url);
              if (ytId || fbUrl) {
                if (els.videoGroup) els.videoGroup.style.display = 'block';
                if (window.loadPreviewVideo) {
                   const keep = e.detail && e.detail.keepValues;
                   window.loadPreviewVideo(url, false, !keep, 'live');
                }
              } else {
                 if (els.videoGroup) els.videoGroup.style.display = 'none';
              }
            } else {
              if (els.videoGroup) els.videoGroup.style.display = 'none';
            }
          };
          clearTimeout(liveInputTimeout);
          if (e.detail && e.detail.keepValues) runLiveInput();
          else liveInputTimeout = setTimeout(runLiveInput, 500);
        });
      }


      window.setPreviewTransformState = function (zoom, x, y, scope = 'upload') {
        const state = transformStates[scope];
        if (!state) return;
        state.zoom = zoom;
        state.x = x;
        state.y = y;
        
        const els = getScopedElements(scope);
        if (els.zoomSlider) els.zoomSlider.value = zoom;
        if (els.zoomVal) els.zoomVal.textContent = zoom.toFixed(2) + 'x';
        updateTransform(scope);
      };

      function initZoomPanControls(scope) {
        const els = getScopedElements(scope);
        if (els.zoomSlider) {
          els.zoomSlider.addEventListener('input', (e) => {
            transformStates[scope].zoom = parseFloat(e.target.value);
            if (els.zoomVal) els.zoomVal.textContent = transformStates[scope].zoom.toFixed(2) + 'x';
            updateTransform(scope);
          });
        }

        if (els.resetBtn) {
          els.resetBtn.addEventListener('click', () => {
            window.setPreviewTransformState(1, 0, 0, scope);
          });
        }

        if (els.previewContainer) {
          let isDragging = false;
          let startMouseX = 0, startMouseY = 0;
          let initialDragX = 0, initialDragY = 0;

          els.previewContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            initialDragX = transformStates[scope].x;
            initialDragY = transformStates[scope].y;
            els.previewContainer.style.cursor = 'grabbing';
          });

          window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = els.previewContainer.getBoundingClientRect();
            const containerWidth = rect.width || 1;
            const containerHeight = rect.height || 1;
            const state = transformStates[scope];

            const deltaX_px = (e.clientX - startMouseX) / state.zoom;
            const deltaY_px = (e.clientY - startMouseY) / state.zoom;

            state.x = initialDragX + (deltaX_px / containerWidth) * 100;
            state.y = initialDragY + (deltaY_px / containerHeight) * 100;

            updateTransform(scope);
          });

          window.addEventListener('mouseup', () => {
            isDragging = false;
            els.previewContainer.style.cursor = 'grab';
          });
        }
      }

      initZoomPanControls('upload');
      initZoomPanControls('url');
    // --- Centralized Form Reset ---
    window.resetAddPostForm = function() {
      const f = document.getElementById('add-post-form');
      if (f) {
        f.reset();
        f.removeAttribute('data-edit-timestamp');
      }
      
      // Clear Files
      const fileInput = document.getElementById('post-file');
      if (fileInput) fileInput.value = '';

      const scopes = ['upload', 'url', 'live'];
      scopes.forEach(scope => {
        const els = getScopedElements(scope);
        if (els.previewGroup) {
          els.previewGroup.style.display = 'none';
          els.previewGroup.classList.add('hidden');
        }
        if (els.previewImg) els.previewImg.src = '';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        if (els.videoPlayer) {
          els.videoPlayer.pause();
          els.videoPlayer.src = '';
        }
        if (els.vStartHidden) els.vStartHidden.value = '';
        if (els.vEndHidden) els.vEndHidden.value = '';
        
        // Reset transform state
        if (transformStates[scope]) {
          transformStates[scope] = { zoom: 1, x: 0, y: 0 };
          updateTransform(scope);
        }
      });

      // Clear Upload Tab specific label
      const fileUploadLabel = document.getElementById('file-upload-label');
      const fileLabelText = document.getElementById('file-label-text');
      if (fileUploadLabel) fileUploadLabel.classList.remove('file-selected', 'drag-over');
      if (fileLabelText) fileLabelText.textContent = 'Choose a file or drag it here';
      const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
      if (iconWrapper) iconWrapper.style.color = '';

      // Reset Tabs
      const uploadTabBtns = document.querySelectorAll('.upload-tab');
      uploadTabBtns.forEach(b => b.classList.remove('active'));
      const defaultTabBtn = document.querySelector('.upload-tab[data-tab="upload"]');
      if (defaultTabBtn) defaultTabBtn.classList.add('active');
      activeUploadTab = 'upload';
      const uploadTabsDiv = document.getElementById('upload-tabs');
      if (uploadTabsDiv) uploadTabsDiv.style.display = 'flex';
      
      const uInput = document.getElementById('post-img');
      const uHint = uInput ? uInput.nextElementSibling : null;
      if (uInput) uInput.style.display = 'block';
      if (uHint && uHint.classList.contains('upload-hint')) uHint.style.display = 'block';

      const uploadPanels = { 
        upload: document.getElementById('upload-tab-upload'), 
        url: document.getElementById('upload-tab-url'),
        live: document.getElementById('upload-tab-live')
      };
      Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
      if (uploadPanels['upload']) uploadPanels['upload'].classList.remove('hidden');

      // Reset Submit Button progress and state
      const sBtn = document.getElementById('submit-post-btn');
      if (sBtn) {
        sBtn.classList.remove('active', 'zz-button-progress-done');
        sBtn.style.setProperty('--zz-progress', 0);
        sBtn.setAttribute('data-progress', 0);
        sBtn.disabled = false;
      }

      // Reset Duration Slider
      const dSlider = document.getElementById('post-display-duration');
      const dValDisp = document.getElementById('post-display-duration-val');
      if (dSlider) {
        dSlider.value = 25;
        if (dValDisp) dValDisp.textContent = '25s';
      }
      
      const err = document.getElementById('post-error');
      if (err) err.classList.add('hidden');
    };

    if (addPostBtn && modal) {
      addPostBtn.addEventListener('click', () => {
        window.resetAddPostForm();
        document.querySelector('.modal-title').textContent = "Create New Update";
        document.getElementById('submit-post-btn').textContent = "Post Update";
        modal.classList.remove('hidden');
      });

      cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        window.resetAddPostForm();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sessionData = sessionStorage.getItem('sas_user_data');
        if (!sessionData) return;

        const activeEls = getScopedElements(activeUploadTab);
        const title = (document.getElementById('post-title').value || '').trim();
        const desc = (document.getElementById('post-desc').value || '').trim();
        const startDate = document.getElementById('post-start-date').value;
        const endDate = document.getElementById('post-end-date').value;
        const displayDuration = parseInt(document.getElementById('post-display-duration').value) || 25;
        const isLive = (activeUploadTab === 'live');

        let imgUrl = "";
        let imgPos = "0 0";
        let imgSize = "1";
        
        const postFileIn = document.getElementById('post-file');
        const file = (activeUploadTab === 'upload' && postFileIn) ? postFileIn.files[0] : null;

        if (activeUploadTab === 'url') {
           imgUrl = imgInput.value.trim();
        } else if (activeUploadTab === 'live') {
           imgUrl = liveInput.value.trim();
        }

        if (activeEls.posInput) imgPos = activeEls.posInput.value || "0 0";
        if (activeEls.sizeInput) imgSize = activeEls.sizeInput.value || "1";

        const startVal = activeEls.vStartHidden ? activeEls.vStartHidden.value : '';
        const endVal = activeEls.vEndHidden ? activeEls.vEndHidden.value : '';
        if (startVal || endVal) {
          imgPos = `${imgPos}|${startVal}|${endVal}`;
        }

        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;
        const zzProgress = {
          start: () => {
             submitBtn.classList.add('active');
             submitBtn.disabled = true;
          },
          update: (pct) => {
             submitBtn.setAttribute('data-progress', Math.round(pct));
             submitBtn.style.setProperty('--zz-progress', pct);
          },
          done: () => {
             return new Promise(resolve => {
                submitBtn.classList.add('zz-button-progress-done');
                setTimeout(resolve, 1000);
             });
          },
          reset: () => {
             submitBtn.classList.remove('active', 'zz-button-progress-done');
             submitBtn.textContent = origText;
             submitBtn.disabled = false;
          }
        };

        if (errorMsg) errorMsg.classList.add('hidden');

        try {
          const userObj = JSON.parse(sessionData);
          const editTimestamp = form.getAttribute('data-edit-timestamp');
          const isEdit = !!editTimestamp;

          const confirmPass = await showConfirm(
            isEdit ? "Confirm Edit" : "Confirm Post",
            `Please enter your password to ${isEdit ? 'update' : 'publish'} this post:`,
            true,
            isEdit ? 'info' : 'success'
          );

          if (!confirmPass) return;
          zzProgress.start();

          // 1. Verify credentials
          const loginCheck = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "login", username: userObj.username, password: confirmPass })
          });
          const loginRes = await loginCheck.json();
          if (!loginRes.success) throw new Error("Invalid credentials.");

          let cloudinaryUrl = imgUrl;
          let cloudinaryPublicId = "";

          // 2. Upload File if needed
          if (activeUploadTab === 'upload' && file) {
            zzProgress.update(10);
            let cloudData;
            // Simplified for brevity, reuse earlier logic
            if (file.size > 10 * 1024 * 1024) {
               cloudData = await uploadFileChunked(file, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME, zzProgress.update);
            } else {
               const fd = new FormData();
               fd.append('file', file);
               fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
               const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
               cloudData = await res.json();
            }
            if (cloudData && cloudData.secure_url) {
               cloudinaryUrl = cloudData.secure_url;
               cloudinaryPublicId = cloudData.public_id;
            }
          }

          // 3. Submit Payload
          const payload = {
            action: isEdit ? "editPost" : "addPost",
            username: userObj.username,
            password: confirmPass,
            title, description: desc,
            imageUrl: cloudinaryUrl,
            cloudinaryPublicId,
            imagePosition: imgPos,
            imageSize: imgSize,
            startDate, endDate, isLive,
            displayDuration
          };
          if (isEdit) payload.timestamp = editTimestamp;

          zzProgress.update(90);
          const r = await fetch(BACKEND_GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
          const responseData = await r.json();
          zzProgress.update(100);

          if (responseData.success) {
            await zzProgress.done();
            modal.classList.add('hidden');
            window.resetAddPostForm();
            showToast(responseData.message || "Success!", 'success');
            fetchPosts();
          } else {
            throw new Error(responseData.message || "Failed to post.");
          }
        } catch (err) {
          zzProgress.reset();
          if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.classList.remove('hidden');
          }
        }
      });
    }
  }

  async function fetchPosts() {
    const loading = document.getElementById('posts-loading');
    const container = document.getElementById('posts-container');
    const empty = document.getElementById('posts-empty');
    if (!loading || !container || !empty) return;

    if (BACKEND_GAS_URL === "YOUR_NEW_BACKEND_GAS_URL_HERE" || !BACKEND_GAS_URL.startsWith("https://")) {
      loading.classList.add('hidden');
      empty.innerHTML = "<p><i>Cannot fetch posts until Backend.gs URL is set.</i></p>";
      empty.classList.remove('hidden');
      return;
    }

    loading.classList.remove('hidden');
    container.classList.add('hidden');
    empty.classList.add('hidden');

    try {
      const r = await fetch(BACKEND_GAS_URL);
      const data = await r.json();

      loading.classList.add('hidden');

      if (data.success && data.posts && data.posts.length > 0) {
        // Determine role to decide which renderer to use
        let role = 'user';
        const sessionData = sessionStorage.getItem('sas_user_data');
        if (sessionData) {
          try { role = JSON.parse(sessionData).role; } catch (e) { }
        }

        // --- PHASE 13: TV SYNC LOGIC ---

        if (role === 'tv') {
          // 1. Sync local toggles from Server Defaults
          if (data.tvSettings) {
            // Only auto-override if the UI buttons haven't triggered a deliberate user override
            tvAudioEnabled = data.tvSettings.tvAudioEnabled;
            tvTheaterEnabled = data.tvSettings.tvTheaterEnabled;

            // Visually update the TV header icons to match
            const btnAudio = document.getElementById('tv-audio-toggle');
            const btnTheater = document.getElementById('tv-fullscreen-toggle');

            if (btnAudio) {
              if (tvAudioEnabled) {
                btnAudio.classList.add('active-setting');
                btnAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
              } else {
                btnAudio.classList.remove('active-setting');
                btnAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
              }
            }
            if (btnTheater) {
              btnTheater.classList.toggle('active-setting', tvTheaterEnabled);
            }
          }

          // 2. Hash Current Data for Background Refreshes
          const newDataString = JSON.stringify(data.posts);

          if (!window.tvPostsDataHash) {
            // First Boot: Save hash and start refresh loop
            window.tvPostsDataHash = newDataString;

            window.tvBackgroundFetch = setInterval(async () => {
              try {
                const bgRes = await fetch(BACKEND_GAS_URL);
                const bgData = await bgRes.json();
                if (bgData.success && bgData.posts) {
                  const bgDataString = JSON.stringify(bgData.posts);
                  // If the hash changed (new/edited/deleted post)
                  if (bgDataString !== window.tvPostsDataHash) {
                    console.log("TV Auto-Refresh: New posts detected! Rebuilding Carousel...");

                  if (globalCarouselTimer) {
                    window.clearInterval(globalCarouselTimer);
                    globalCarouselTimer = null;
                  }
                    window.tvPostsDataHash = bgDataString;

                    // Re-sync TV toggles just in case Admin changed them concurrently
                    if (bgData.tvSettings) {
                      tvAudioEnabled = bgData.tvSettings.tvAudioEnabled;
                      tvTheaterEnabled = bgData.tvSettings.tvTheaterEnabled;
                    }

                    renderPosts(bgData.posts, container, role);
                  }
                }
              } catch (e) {
                console.log("TV Background Refresh skipped: Offline/Network Error");
              }
            }, 60000); // Check every 60 seconds
          }
        }

        // --- END PHASE 13 ---

        renderPosts(data.posts, container, role);
        
        const isActualTvMode = role === 'tv' || document.body.classList.contains('tv-mode');
        if (isActualTvMode) {
          container.className = 'home-news'; 
        } else {
          // Restore grid for admin/user but PRESERVE current view class
          container.classList.add('posts-container');
          container.classList.remove('home-news');
          
          // Re-apply saved view mode to ensure classes are correct after render
          const currentMode = localStorage.getItem('sas_view_mode') || 'md';
          if (typeof setViewMode === 'function') setViewMode(currentMode);
        }
        container.classList.remove('hidden');
      } else {
        empty.classList.remove('hidden');
      }
    } catch (err) {
      loading.classList.add('hidden');
      empty.innerHTML = "<p>Error loading posts. Please try again later.</p>";
      empty.classList.remove('hidden');
      console.error("Fetch Posts Error:", err);
    }
  }


  async function expirePostOnBackend(timestamp) {
    const sessionData = sessionStorage.getItem('sas_user_data');
    if (!sessionData) return;
    
    try {
      const userObj = JSON.parse(sessionData);
      const payload = {
        action: "expirePost",
        username: userObj.username,
        password: userObj.password || "",
        timestamp: timestamp
      };

      const r = await fetch(BACKEND_GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const res = await r.json();
      if (res.success) {
        console.log("Post auto-expired successfully:", timestamp);
        // Refresh the posts list to remove the expired post from all views
        if (typeof fetchPosts === 'function') fetchPosts();
      } else {
        console.warn("Post auto-expiry failed:", res.message);
      }
    } catch (e) {
      console.error("Error during post auto-expiry:", e);
    }
  }

  function renderPosts(posts, container, role) {
    // Prevent duplicate dots/tickers on re-render by clearing elements leaked to body
    const existingDots = document.body.querySelector('.home-news-dots');
    if (existingDots) existingDots.remove();
    const existingTicker = document.body.querySelector('.home-news-ticker');
    if (existingTicker) existingTicker.remove();

    container.innerHTML = '';
    ytPlayers = {}; // Clear previous instances

    const isActualTvMode = role === 'tv' || document.body.classList.contains('tv-mode');

    if (isActualTvMode) {
      const now = new Date();
      let tvPosts = posts.filter(p => {
        // 1. Check showOnTv flag
        if (String(p.showOnTv).toLowerCase() === 'false') return false;
        
        // 2. Check Start Date
        if (p.startDate) {
          const start = new Date(p.startDate);
          if (now < start) return false;
        }
        
        // 3. Check End Date
        if (p.endDate) {
          const end = new Date(p.endDate);
          if (now > end) return false;
        }
        
        return true;
      });

      if (tvPosts.length === 0) {
        tvPosts = [{
          title: "No Announcements",
          description: "There are currently no announcements scheduled for TV display.",
          timestamp: new Date().toLocaleString()
        }];
      }

      // Build Full-screen TV Carousel
      const track = document.createElement('div');
      track.className = 'home-news-track';

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'home-news-dots';
      dotsContainer.setAttribute('role', 'tablist');

      tvPosts.forEach((post, index) => {
        let startVal = '';
        let endVal = '';
        if (post.imagePosition && post.imagePosition.includes('|')) {
           const parts = post.imagePosition.split('|');
           startVal = parts[1] || '';
           endVal = parts[2] || '';
        }

        const slide = document.createElement('article');
        slide.className = 'home-news-slide' + (index === 0 ? ' is-active' : '');
        slide.setAttribute('data-index', index);
        slide.setAttribute('data-title', escapeHtml(post.title || ''));
        slide.setAttribute('data-desc', escapeHtml(post.description || ''));
        slide.setAttribute('data-start', startVal);
        slide.setAttribute('data-end', endVal);
        slide.setAttribute('data-is-live', post.isLive ? 'true' : 'false');
        slide.setAttribute('data-timestamp', post.timestamp || '');
        slide.setAttribute('data-duration', post.displayDuration || '');

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          // Parse saved values. Check if it's a legacy value (cover/contain) or the new zoom format (scale number)
          let parsedPos = post.imagePosition || '50% 50%'; // Legacy default
          let isLegacySize = (post.imageSize === 'cover' || post.imageSize === 'contain' || !post.imageSize);

          let parsedScale = 1;
          let parsedTrX = 0;
          let parsedTrY = 0;

          let styleStr = '';

          if (!isLegacySize && !isNaN(parseFloat(post.imageSize))) {
            parsedScale = parseFloat(post.imageSize);
            // new pos format is "X Y" in percentages
            const pParts = parsedPos.split(' ');
            if (pParts.length >= 2) {
              parsedTrX = parseFloat(pParts[0]) || 0;
              parsedTrY = parseFloat(pParts[1]) || 0;
            }
            styleStr = `object-fit: contain; object-position: center; transform-origin: center center; transform: scale(${parsedScale}) translate(${parsedTrX}%, ${parsedTrY}%);`;
          } else {
            // Legacy
            const objSizeStr = post.imageSize || 'cover';
            styleStr = `object-position: ${parsedPos}; object-fit: ${objSizeStr};`;
          }

          const urlLower = post.imageUrl.toLowerCase();
          const ytId = getYouTubeVideoId(post.imageUrl);
          const fbEmbedUrl = getFacebookVideoUrl(post.imageUrl);

          const isVideo = ytId || fbEmbedUrl || 
            urlLower.includes('/video/upload/') ||
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.endsWith('.mov') ||
            (urlLower.includes('drive.google.com') && urlLower.includes('type=video')) ||
            (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview'));

          if (isVideo) {
            slide.classList.add('has-video');
            const dId = getDriveId(post.imageUrl);
            if (dId) {
              // Convert any Drive link to High-Speed Direct Stream
              post.imageUrl = `https://drive.google.com/uc?id=${dId}&export=download`;
            }
          }

          let bgThumb = '';
          if (ytId) {
            bgThumb = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com')) {
            bgThumb = post.imageUrl.replace(/\.(mp4|webm|mov|mkv|avi)$/i, '.jpg');
          } else if (post.imageUrl && post.imageUrl.trim() !== '') {
            bgThumb = post.imageUrl;
          }

          const bgHtml = bgThumb ? `<div class="home-news-image-bg" style="background-image: url('${bgThumb}')"></div>` : '';

          if (ytId) {
            let ytParams = `autoplay=1&mute=1&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&showinfo=0&autohide=1`;
            if (startVal) ytParams += `&start=${startVal}`;
            // Adjust parameters based on whether we use a proxy or official YT
            let finalParams = ytParams;
            let embedBase = "https://www.youtube.com/embed/";
            
            if (window.ENV && window.ENV.YOUTUBE_PROXY_URL && window.ENV.YOUTUBE_PROXY_URL.trim() !== '') {
               embedBase = window.ENV.YOUTUBE_PROXY_URL;
               if (!embedBase.endsWith('/')) embedBase += '/';
               // Public proxies often don't support YT's enablejsapi or complex flags
               // We only keep essential ones: autoplay, mute, start, end
               let proxyParams = `autoplay=1&mute=1`;
               if (startVal) proxyParams += `&start=${startVal}`;
               if (endVal) proxyParams += `&end=${endVal}`;
               finalParams = proxyParams;
            }

            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 ${bgHtml}
                 <iframe id="ytplayer-${post.timestamp}" src="${embedBase}${ytId}?${finalParams}" class="home-news-image yt-video-frame" style="border: none; width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
              </div>
            `;
          } else if (fbEmbedUrl) {
            initFbSdk();
            const uniqueId = `fbplayer-${post.timestamp}`;
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000;">
                 ${bgHtml}
                 <div id="${uniqueId}" class="fb-video fb-video-wrapper" data-href="${fbEmbedUrl}" data-width="auto" data-show-text="false" data-allowfullscreen="true" data-autoplay="false" style="position: relative; z-index: 2; width: 100%; height: 100%;"></div>
              </div>
            `;
          } else if (
            urlLower.includes('/video/upload/') ||
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.endsWith('.mov') ||
            (urlLower.includes('drive.google.com') && urlLower.includes('type=video'))
          ) {
            // Direct/stream URL — use native <video> with autoplay+muted for TV
            let mediaHash = '';
            if (startVal && endVal) mediaHash = `#t=${startVal},${endVal}`;
            else if (startVal) mediaHash = `#t=${startVal}`;
            else if (endVal) mediaHash = `#t=0,${endVal}`;

            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                ${bgHtml}
                <video src="${post.imageUrl}${mediaHash}" class="home-news-image" style="width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" autoplay muted playsinline></video>
              </div>
            `;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            // Fallback for existing preview iframes (Legacy)
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 <iframe src="${post.imageUrl}" class="home-news-image drive-video-frame" style="border: none; width: 100%; height: 100%; ${styleStr}" allow="autoplay" allowfullscreen></iframe>
              </div>
            `;
          } else {
            const fbPlaceholder = 'https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png';
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 ${bgHtml}
                 <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="home-news-image" style="width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" loading="lazy" onerror="this.onerror=null; this.src='${fbPlaceholder}'; this.style.objectFit='contain'; this.style.opacity='0.2';">
              </div>
            `;
          }
        } else {
          imgHtml = `<div class="home-news-image" style="background:var(--nbsc-dark); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px; text-align: center;"><img src="https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png" style="height:60px; margin-bottom:10px; opacity:0.3"></div>`;
        }

        let liveBadgeHtml = '';
        if (post.isLive) {
          liveBadgeHtml = `<div class="live-badge" style="position: absolute; top: 0.8rem; left: 0.8rem; z-index: 10; background: rgba(185, 28, 28, 0.9); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; animation: pulse-live 4s infinite ease-in-out; border: 1px solid rgba(255,255,255,0.2); pointer-events: none;">Live</div>`;
        }

        slide.innerHTML = `
          <div class="home-news-image-wrap">
            ${liveBadgeHtml}
            ${imgHtml}
          </div>
        `;

        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'home-news-dot' + (index === 0 ? ' is-active' : '');
        dot.type = 'button';
        dot.setAttribute('data-index', index);
        dot.setAttribute('aria-label', 'Slide ' + (index + 1));
        dotsContainer.appendChild(dot);
      });

      const firstTitle = tvPosts.length > 0 ? escapeHtml(tvPosts[0].title || '') : '';
      const firstDesc = tvPosts.length > 0 ? escapeHtml(tvPosts[0].description || '') : '';
      const initialTickerContent = `
        <span class="ticker-title">${firstTitle}</span>
        <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
        <span class="ticker-desc">${firstDesc}</span>
        <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
      `;

      const globalTicker = document.createElement('div');
      globalTicker.className = 'home-news-ticker';
      globalTicker.innerHTML = `
        <div class="ticker-wrap">
          <div class="ticker-content" id="global-ticker-content-1">
            ${initialTickerContent}
          </div>
          <div class="ticker-content" aria-hidden="true" id="global-ticker-content-2">
            ${initialTickerContent}
          </div>
        </div>
      `;

      container.appendChild(track);
      if (posts.length > 1) {
        container.appendChild(dotsContainer);
      }
      container.appendChild(globalTicker);

      initCarousel(container);
    } else {
      // Build Standard Vertical Card Feed for Admins & Users
      posts.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.style.position = 'relative';

        const urlLower = (post.imageUrl || '').toLowerCase();

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          // Parse saved values. Check if it's a legacy value (cover/contain) or the new zoom format (scale number)
          let parsedPos = post.imagePosition || '50% 50%'; // Legacy default
          let isLegacySize = (post.imageSize === 'cover' || post.imageSize === 'contain' || !post.imageSize);

          let parsedScale = 1;
          let parsedTrX = 0;
          let parsedTrY = 0;

          let styleStr = '';

          if (!isLegacySize && !isNaN(parseFloat(post.imageSize))) {
            parsedScale = parseFloat(post.imageSize);
            // new pos format is "X Y" in percentages
            const pParts = parsedPos.split(' ');
            if (pParts.length >= 2) {
              parsedTrX = parseFloat(pParts[0]) || 0;
              parsedTrY = parseFloat(pParts[1]) || 0;
            }
            styleStr = `object-fit: contain; object-position: center; transform-origin: center center; transform: scale(${parsedScale}) translate(${parsedTrX}%, ${parsedTrY}%);`;
          } else {
            // Legacy
            const objSizeStr = post.imageSize || 'cover';
            styleStr = `object-position: ${parsedPos}; object-fit: ${objSizeStr};`;
          }

          let startVal = '';
          let endVal = '';
          if (post.imagePosition && post.imagePosition.includes('|')) {
             const parts = post.imagePosition.split('|');
             startVal = parts[1] || '';
             endVal = parts[2] || '';
          }

          const ytId = getYouTubeVideoId(post.imageUrl);
          const fbEmbedUrl = getFacebookVideoUrl(post.imageUrl);

          if (ytId) {
            imgHtml = `<img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" class="post-image" style="${styleStr}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'">`;
          } else if (fbEmbedUrl) {
            imgHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; color: white;">
              <div style="text-align: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#1877F2" style="margin-bottom: 8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <div style="font-size: 12px; opacity: 0.8;">Facebook Video</div>
              </div>
            </div>`;
          } else if (urlLower && (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com'))) {
            const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const thumbUrl = isVideo ? post.imageUrl.replace(/\.[^.]+$/, '.jpg') : post.imageUrl;
            imgHtml = `<img src="${thumbUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="${styleStr}" loading="lazy">`;
          } else if (urlLower.includes('docs.google.com/uc?') || urlLower.includes('drive.google.com/uc?id=') || urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')) {
            let mediaHash = '';
            if (startVal && endVal) mediaHash = `#t=${startVal},${endVal}`;
            else if (startVal) mediaHash = `#t=${startVal}`;
            else if (endVal) mediaHash = `#t=0,${endVal}`;
            imgHtml = `<video src="${post.imageUrl}${mediaHash}" class="post-image" style="${styleStr}" preload="metadata" muted playsinline></video>`;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            imgHtml = `<iframe src="${post.imageUrl}" class="post-image" style="border: none; ${styleStr}"></iframe>`;
          } else {
            const fallbackSquare = 'https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png';
            imgHtml = `<img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="${styleStr}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackSquare}'; this.style.objectFit='contain'; this.style.opacity='0.2';">`;
          }
          
          if (post.isLive) {
            imgHtml = `<div class="live-badge" style="position: absolute; top: 10px; left: 10px; z-index: 15; background: #b91c1c; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.7rem; animation: pulse-live 2s infinite;">LIVE</div>` + imgHtml;
          }
        }
        
        let schedulingLabel = '';
        if (post.startDate || post.endDate) {
          let sText = post.startDate ? `From: ${new Date(post.startDate).toLocaleString()}` : '';
          let eText = post.endDate ? ` Until: ${new Date(post.endDate).toLocaleString()}` : '';
          schedulingLabel = `<div class="post-scheduled-label">${sText}${eText}</div>`;
        }

        card.innerHTML = `
          <div class="post-image-container">
            ${imgHtml}
          </div>
          <div class="post-content">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-desc">${escapeHtml(post.description)}</p>
            ${schedulingLabel}
          </div>
        `;

        if (role === 'admin' || role === 'uploader') {
          const actionArea = document.createElement('div');
          actionArea.className = 'post-card-actions';

          const editBtn = document.createElement('button');
          editBtn.className = 'secondary-btn edit-btn';
          editBtn.textContent = 'Edit';
          editBtn.onclick = () => {
            const form = document.getElementById('add-post-form');
            const modal = document.getElementById('add-post-modal');

            document.querySelector('.modal-title').textContent = "Edit Update";
            document.getElementById('submit-post-btn').textContent = "Save Changes";

            document.getElementById('post-title').value = post.title;
            document.getElementById('post-desc').value = post.description;
            
            if (document.getElementById('post-start-date')) document.getElementById('post-start-date').value = (post.startDate || '').replace(' ', 'T');
            if (document.getElementById('post-end-date')) document.getElementById('post-end-date').value = (post.endDate || '').replace(' ', 'T');
            
            const dSlider = document.getElementById('post-display-duration');
            const dValDisp = document.getElementById('post-display-duration-val');
            if (dSlider) {
              const dVal = parseInt(post.displayDuration) || 25;
              dSlider.value = dVal;
              if (dValDisp) dValDisp.textContent = dVal + 's';
            }
            
            const urlForEdit = post.imageUrl || '';
            const isLivePost = (post.isLive === true || post.isLive === "true");
            const scope = isLivePost ? 'live' : 'url';
            
            const tabBtn = document.querySelector(`.upload-tab[data-tab="${scope}"]`);
            if (tabBtn) tabBtn.click();
            
            const uploadTabsDiv = document.getElementById('upload-tabs');
            if (uploadTabsDiv) uploadTabsDiv.style.display = 'none';

            const els = getScopedElements(scope);
             if (scope === 'url') {
                const urlIn = document.getElementById('post-img');
                urlIn.value = urlForEdit;
                urlIn.style.display = 'none';
                const hint = urlIn.nextElementSibling;
                if (hint && hint.classList.contains('upload-hint')) hint.style.display = 'none';
             }
             else if (scope === 'live') document.getElementById('post-live-url').value = urlForEdit;

            let p = post.imagePosition || '0 0';
            let startVal = '';
            let endVal = '';
            if (p.includes('|')) {
                const parts = p.split('|');
                p = parts[0];
                startVal = parts[1] || '';
                endVal = parts[2] || '';
            }

            if (els.posInput) els.posInput.value = p;
            if (els.sizeInput) els.sizeInput.value = post.imageSize || '1';
            if (els.vStartHidden) els.vStartHidden.value = startVal;
            if (els.vEndHidden) els.vEndHidden.value = endVal;

            const isVideo = getYouTubeVideoId(urlForEdit) || getFacebookVideoUrl(urlForEdit) || 
                            /\.(mp4|webm|mov|mkv|avi)$/i.test(urlForEdit.toLowerCase()) || 
                            urlForEdit.includes('/video/upload/');

            if (isVideo) {
               if (window.loadPreviewVideo) window.loadPreviewVideo(urlForEdit, true, scope);
            } else if (urlForEdit) {
               if (els.previewImg && els.previewGroup) {
                  els.previewImg.src = urlForEdit;
                  els.previewGroup.classList.remove('hidden');
               }
            }

            const initialZoom = parseFloat(post.imageSize) || 1;
            const pParts = p.split(' ');
            const trX = parseFloat(pParts[0]) || 0;
            const trY = parseFloat(pParts[1]) || 0;
            if (window.updateTransform) window.updateTransform(scope, initialZoom, trX, trY);

            form.setAttribute('data-edit-timestamp', post.timestamp);
            modal.classList.remove('hidden');
          };
          actionArea.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'secondary-btn delete-btn';
          deleteBtn.textContent = 'Delete';
          deleteBtn.onclick = async () => {
            const confirmPass = await showConfirm("Delete Post", "Are you sure you want to delete this specific post?", true, 'danger');
            if (!confirmPass) return;

            const sessionData = sessionStorage.getItem('sas_user_data');
            if (!sessionData) return;

            const userObj = JSON.parse(sessionData);

            deleteBtn.textContent = "Deleting...";
            deleteBtn.disabled = true;

            try {
              const payload = {
                action: "deletePost",
                username: userObj.username,
                password: confirmPass,
                timestamp: post.timestamp
              };

              const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
              });

              const responseData = await r.json();
              if (responseData.success) {
                showToast(responseData.message, 'success');
                fetchPosts(); // Refresh UI instantly
              } else {
                showToast(responseData.message || "Failed to delete post.", 'error');
              }
            } catch (e) {
              showToast("Network error. Could not delete post.", 'error');
            } finally {
              deleteBtn.textContent = "Delete";
              deleteBtn.disabled = false;
            }
          };
          actionArea.appendChild(deleteBtn);

          const toggleTvBtn = document.createElement('button');
          toggleTvBtn.className = 'secondary-btn hide-btn';
          const isHidden = String(post.showOnTv).toLowerCase() === 'false';
          toggleTvBtn.textContent = isHidden ? 'Show on TV' : 'Hide from TV';

          toggleTvBtn.onclick = async () => {
            const sessionData = sessionStorage.getItem('sas_user_data');
            if (!sessionData) return;
            const userObj = JSON.parse(sessionData);

            const msg = isHidden ? 'Are you sure you want to show this on TV?' : 'Are you sure you want to hide this from TV?';
            const confirmPass = await showConfirm("TV Visibility", msg, true, 'warning');
            if (!confirmPass) return;

            toggleTvBtn.textContent = "Updating...";
            toggleTvBtn.disabled = true;

            try {
              const payload = {
                action: "toggleTvVisible",
                username: userObj.username,
                password: confirmPass,
                timestamp: post.timestamp
              };

              const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
              });

              const responseData = await r.json();
              if (responseData.success) {
                showToast(responseData.message || "Visibility updated!", 'success');
                fetchPosts(); // Refresh UI instantly
              } else {
                showToast(responseData.message || "Failed to toggle visibility.", 'error');
              }
            } catch (e) {
              showToast("Network error. Could not toggle visibility.", 'error');
            } finally {
              toggleTvBtn.disabled = false;
            }
          };
          actionArea.appendChild(toggleTvBtn);

          card.appendChild(actionArea);
        }

        container.appendChild(card);
      });

      // --- DASHBOARD BACKDROP SYNC (Static to prevent lag) ---
      if (document.body.classList.contains('dashboard-backdrop')) {
        const blurredBg = document.getElementById('tv-blurred-bg');
        if (blurredBg) {
          const firstPostWithImg = posts.find(p => p.imageUrl && p.imageUrl.trim() !== '');
          if (firstPostWithImg) {
             let bgSource = firstPostWithImg.imageUrl;
             const ytId = getYouTubeVideoId(bgSource);
             if (ytId) bgSource = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
             else if (bgSource.includes('cloudinary.com')) bgSource = bgSource.replace(/\.(mp4|webm|mov|mkv|avi)$/i, '.jpg');
             
             blurredBg.style.backgroundImage = `url('${bgSource}')`;
          }
        }
      }
    }
  }

  function initCarousel(container) {
    var slides = Array.prototype.slice.call(container.querySelectorAll('.home-news-slide'));
    var dots = Array.prototype.slice.call(container.querySelectorAll('.home-news-dot'));
    if (!slides.length) return;

    // Clear ANY existing carousel timer/players to prevent leaks
    if (globalCarouselTimer) clearInterval(globalCarouselTimer);
    globalCarouselTimer = null;

    Object.keys(ytPlayers).forEach(id => {
      try { ytPlayers[id].destroy(); } catch (e) { }
    });
    ytPlayers = {};

    var current = 0;
    var intervalMs = 25000;

    // Force immediate layout update for the first slide (slide 0)
    // This ensures clock reparenting and other immersive states are applied instantly.
    setActive(0);
    preloadNext(0);

    function next() {
      var nextIndex = (current + 1) % slides.length;
      setActive(nextIndex);
      preloadNext(nextIndex);
    }

    function preloadNext(index) {
      const nextIdx = (index + 1) % slides.length;
      const nextSlide = slides[nextIdx];
      const video = nextSlide.querySelector('video.home-news-image');
      if (video) {
        video.preload = "auto";
        // Create a hidden ghost video to force the browser to start buffering the network stream
        const ghost = document.createElement('video');
        ghost.style.display = 'none';
        ghost.preload = 'auto';
        ghost.src = video.src;
        document.body.appendChild(ghost);
        setTimeout(() => ghost.remove(), 10000); // Clean up after a bit
      }
    }

    function setActive(index) {
      // First, iterate over all slides to pause videos that are no longer active
      slides.forEach(function (s, i) {
        if (i === index) {
          s.classList.add('is-active');

          // Update global ticker
          const t1 = document.getElementById('global-ticker-content-1');
          const t2 = document.getElementById('global-ticker-content-2');
          if (t1 && t2) {
            const tempTitle = s.getAttribute('data-title') || '';
            const tempDesc = s.getAttribute('data-desc') || '';
            const tickerHtml = `
              <span class="ticker-title">${tempTitle}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
              <span class="ticker-desc">${tempDesc}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
            `;
            t1.innerHTML = tickerHtml;
            t2.innerHTML = tickerHtml;

            // Update Fullscreen Info Overlay
            const fsTitle = document.getElementById('fs-post-title');
            const fsDesc = document.getElementById('fs-post-desc');
            if (fsTitle) fsTitle.textContent = tempTitle;
            if (fsDesc) fsDesc.textContent = tempDesc;
          }
        } else {
          s.classList.remove('is-active');
          // Perform cleanup for inactive slides
          const oldVideo = s.querySelector('video.home-news-image');
          const oldIframe = s.querySelector('iframe.yt-video-frame');

          if (oldVideo) {
            oldVideo.pause();
            oldVideo.muted = true;
          }
        }
      });
      dots.forEach(function (d, i) {
        if (i === index) d.classList.add('is-active');
        else d.classList.remove('is-active');
      });
      current = index;
      globalSlideGeneration++; // Invalidate any stale YT callbacks from the previous slide
      var myGeneration = globalSlideGeneration;

      // Always stop the running timer first
      stop();

      const activeSlide = slides[index];
      const videoEl = activeSlide.querySelector('video.home-news-image');
      const iframeEl = activeSlide.querySelector('iframe.yt-video-frame');
      const fbIframeEl = activeSlide.querySelector('.fb-video-wrapper');
      const driveIframeEl = activeSlide.querySelector('iframe.drive-video-frame');

      const curStart = parseFloat(activeSlide.dataset.start) || 0;
      const curEnd = parseFloat(activeSlide.dataset.end) || 0;
      const isLive = activeSlide.getAttribute('data-is-live') === 'true';
      const timestamp = activeSlide.getAttribute('data-timestamp');
      const customDuration = activeSlide.getAttribute('data-duration');
      const startMs = (customDuration && !isNaN(customDuration)) ? parseInt(customDuration) * 1000 : undefined;

      // Handle CSS Unified Fullscreen
      const isVideoSlide = (videoEl || iframeEl || fbIframeEl || driveIframeEl);

      if (isVideoSlide) {
        document.body.classList.add('video-fullscreen-active');
        // VIDEOS: only expand if toggle is user-enabled
        if (tvTheaterEnabled && document.body.classList.contains('tv-mode')) {
          document.body.classList.add('fullscreen-active');
          document.body.classList.add('theater-mode');
          if (typeof updateWeather === 'function') updateWeather();
        } else {
          document.body.classList.remove('fullscreen-active');
          document.body.classList.remove('theater-mode');
        }
      } else {
        document.body.classList.remove('video-fullscreen-active');
        document.body.classList.remove('theater-mode');
        // IMAGES: always expand in TV mode by default
        if (document.body.classList.contains('tv-mode')) {
          document.body.classList.add('fullscreen-active');
          if (typeof updateWeather === 'function') updateWeather();
        } else {
          document.body.classList.remove('fullscreen-active');
        }
      }

      // Handle Blurred Immersive Background
      const blurredBg = document.getElementById('tv-blurred-bg');
      if (blurredBg && document.body.classList.contains('tv-mode')) {
        let bgSource = '';

        const slideImg = activeSlide.querySelector('img.home-news-image');
        const bgLayer = activeSlide.querySelector('.home-news-image-bg');

        if (bgLayer) {
          // Extract from style.backgroundImage: url("...")
          const styleBg = bgLayer.style.backgroundImage;
          bgSource = styleBg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
        } else if (slideImg && slideImg.src) {
          bgSource = slideImg.src;
        } else if (videoEl && videoEl.poster) {
          bgSource = videoEl.poster;
        } else if (iframeEl || fbIframeEl) {
          const ytId = getYouTubeVideoId((iframeEl || fbIframeEl).src || '');
          if (ytId) {
            bgSource = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (fbIframeEl) {
            // For FB, we don't have a simple thumb URL, so we rely on the bgLayer if it exists
            // (The bgLayer is already set in renderPosts if it's a FB video)
          }
        }

        if (bgSource) {
          blurredBg.style.backgroundImage = `url('${bgSource}')`;
        }
      }

      // Consistently ensure elements stay at body level in any TV mode
      if (document.body.classList.contains('tv-mode')) {
        const dotsEl = document.querySelector('.home-news-dots');
        const tvClock = document.getElementById('tv-clock');

        if (tvClock && tvClock.parentElement !== document.body) {
          document.body.appendChild(tvClock);
        }
        if (dotsEl && dotsEl.parentElement !== document.body) {
          document.body.appendChild(dotsEl);
        }
      }

      if (videoEl) {
        videoEl.currentTime = curStart;
        videoEl.muted = !tvAudioEnabled;
        videoEl.play().catch(e => console.error('Video play prevented:', e));
        
        videoEl.ontimeupdate = function() {
           if (curEnd > 0 && videoEl.currentTime >= curEnd) {
              if (myGeneration === globalSlideGeneration && slides.length > 1) {
                 videoEl.ontimeupdate = null; // Prevent double trigger
                 next();
              }
           }
        };
        
        videoEl.onended = function () {
          if (isLive) {
            console.log("Native video ended! Expiring live post...");
            expirePostOnBackend(timestamp);
          }
          if (myGeneration === globalSlideGeneration && slides.length > 1) next();
        };
        videoEl.onerror = function() {
          if (isLive) {
            console.log("Native video error! Expiring live post...");
            expirePostOnBackend(timestamp);
          }
          if (myGeneration === globalSlideGeneration && slides.length > 1) next();
        };

        // --- HEARTBEAT FOR NATIVE VIDEO ---
        if (isLive) {
          let lastTime = -1;
          let stalledCount = 0;
          const liveHeartbeat = setInterval(() => {
            if (myGeneration !== globalSlideGeneration) {
              clearInterval(liveHeartbeat);
              return;
            }
            if (!videoEl.paused && videoEl.currentTime === lastTime) {
              stalledCount++;
              if (stalledCount > 15) { // 15 seconds of no progress while playing
                console.log("Live native video stalled! Expiring...");
                clearInterval(liveHeartbeat);
                expirePostOnBackend(timestamp);
              }
            } else {
              stalledCount = 0;
            }
            lastTime = videoEl.currentTime;
          }, 1000);
        }

        // Safety fallback: advance after custom duration or 3 minutes max even if video stalls, UNLESS it's live
        if (!isLive) start(startMs || 180000);
        else stop(); // For live, we rely on the heartbeat/ended events
      } else if (iframeEl && window.YT && window.YT.Player) {
        const iframeId = iframeEl.id;
        const myPlayerId = iframeId;

        function startYTPolling(player) {
          let stalledCount = 0;
          let lastTime = -1;
          const checkInterval = setInterval(() => {
            if (myGeneration !== globalSlideGeneration) {
              clearInterval(checkInterval);
              return;
            }
            try {
              const state = player.getPlayerState();
              const duration = player.getDuration();
              const currentTime = player.getCurrentTime();

              // --- LIVE HEARTBEAT / STALL CHECK ---
              if (isLive) {
                 if (state === 1) { // Playing
                    if (currentTime === lastTime) {
                       stalledCount++;
                       if (stalledCount > 20) { // 20s stall
                          console.log("YouTube Live stalled! Expiring...");
                          clearInterval(checkInterval);
                          expirePostOnBackend(timestamp);
                       }
                    } else { stalledCount = 0; }
                 } else if (state === -1 || state === 5) { // Unstarted or Cued
                    stalledCount++;
                    if (stalledCount > 30) { // 30s stuck in loading
                       console.log("YouTube Live stuck in loading state! Expiring...");
                       clearInterval(checkInterval);
                       expirePostOnBackend(timestamp);
                    }
                 }
                 lastTime = currentTime;
              }

                // Advance if video is within 1.5s of end (not for live)
                const effectiveEnd = (curEnd > 0) ? curEnd : duration;
                if (!isLive && (state === 0 || (effectiveEnd > 0 && currentTime >= (effectiveEnd - 1.5)))) {
                  console.log('YouTube auto-advancing slide:', myPlayerId);
                  clearInterval(checkInterval);
                  next();
                }
            } catch (e) { }
          }, 1000);
        }

        if (!ytPlayers[iframeId]) {
          ytPlayers[iframeId] = new YT.Player(iframeId, {
            events: {
              'onReady': function (event) {
                if (tvAudioEnabled) event.target.unMute();
                else event.target.mute();
                if (curStart > 0) event.target.seekTo(curStart);
                event.target.playVideo();
                startYTPolling(event.target);
              },
              'onStateChange': function (event) {
                if (event.data === YT.PlayerState.ENDED) {
                  // --- LIVE AUTO-EXPIRY LOGIC ---
                  if (isLive) {
                    console.log("Live stream ended! Hiding post from TV automatically...");
                    expirePostOnBackend(timestamp);
                  }
                  if (myGeneration === globalSlideGeneration && slides.length > 1) next();
                }
              },
              'onError': function(event) {
                console.warn("YouTube Player Error:", event.data);
                // Errors: 100 (not found/deleted), 101/150 (embed restricted)
                const fatalErrors = [100, 101, 150];
                if (isLive || fatalErrors.includes(event.data)) {
                  console.log("YouTube Live stream fatal error or unavailable! Expiring post...");
                  expirePostOnBackend(timestamp);
                }
                if (myGeneration === globalSlideGeneration && slides.length > 1) next();
              }
            }
          });
        } else {
          // Player already exists, just restart it
          try {
            const player = ytPlayers[iframeId];
            if (tvAudioEnabled) player.unMute();
            else player.mute();
            player.seekTo(curStart);
            player.playVideo();
            startYTPolling(player);
          } catch (e) {
            console.warn('YT Player error on restart:', e);
          }
        }
        // Safety fallback (not for live)
        if (!isLive) start(startMs || 300000);
        else stop();
      } else if (activeSlide.querySelector('.fb-video-wrapper')) {
        // Facebook video via JS SDK
        const fbEl = activeSlide.querySelector('.fb-video-wrapper');
        if (fbEl) {
          const playerId = fbEl.id;
          let attempts = 0;
          // Poll until the player instance is ready from the SDK
          const tryPlay = setInterval(() => {
             if (myGeneration !== globalSlideGeneration) {
                 clearInterval(tryPlay);
                 return;
             }
             const player = window.fbPlayers && window.fbPlayers[playerId];
             if (player) {
                 clearInterval(tryPlay);
                 try {
                    if (tvAudioEnabled) player.unmute();
                    else player.mute();
                    if (curStart > 0) player.seek(curStart);
                    player.play();

                    if (!player._hasFinishedListener) {
                        player._hasFinishedListener = true;
                        player.subscribe('finishedPlaying', () => {
                            // --- LIVE AUTO-EXPIRY LOGIC ---
                            if (isLive) {
                                console.log("Facebook Live stream finished! Hiding from TV...");
                                expirePostOnBackend(timestamp);
                            }
                            if (myGeneration === globalSlideGeneration && slides.length > 1) {
                                next();
                            }
                        });
                        player.subscribe('error', (err) => {
                            console.warn("Facebook Player Error:", err);
                            if (isLive) {
                                console.log("Facebook Live stream error! Expiring post...");
                                expirePostOnBackend(timestamp);
                            }
                            if (myGeneration === globalSlideGeneration && slides.length > 1) {
                                next();
                            }
                        });
                    }

                    // Poll for custom end time
                    let lastPos = -1;
                    let stalledCount = 0;
                    const fbPoll = setInterval(() => {
                        if (myGeneration !== globalSlideGeneration) {
                            clearInterval(fbPoll);
                            return;
                        }
                        try {
                           const pos = player.getCurrentPosition();
                           
                           if (isLive) {
                              if (pos === lastPos) {
                                 stalledCount++;
                                 if (stalledCount > 20) {
                                    console.log("Facebook Live stalled! Expiring...");
                                    clearInterval(fbPoll);
                                    expirePostOnBackend(timestamp);
                                 }
                              } else { stalledCount = 0; }
                              lastPos = pos;
                           }

                           if (curEnd > 0 && pos >= curEnd) {
                               clearInterval(fbPoll);
                               next();
                           }
                        } catch(e){}
                    }, 1000);
                 } catch(e) {
                    console.error('FB Player Error:', e);
                 }
             }
             attempts++;
             if (attempts > 50) clearInterval(tryPlay); // give up after 10s
          }, 200);
        }

        if (!isLive) start(startMs || 180000); 
        else stop();
      } else if (driveIframeEl) {
        // Drive video iframe — can't hook into events, use standard timer
        start(startMs);
      } else {
        // Static image slide
        start(startMs);
      }
    }

    function start(customMs) {
      stop();
      if (slides.length > 1) {
        globalCarouselTimer = window.setInterval(next, customMs || intervalMs);
      }
    }

    function stop() {
      if (globalCarouselTimer) {
        window.clearInterval(globalCarouselTimer);
        globalCarouselTimer = null;
      }
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = parseInt(this.getAttribute('data-index') || '0', 10);
        if (!isNaN(index)) {
          setActive(index);
        }
      });
    });

    setActive(0);
  }

});
