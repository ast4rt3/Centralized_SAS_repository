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

document.addEventListener('DOMContentLoaded', () => {

  // --- TV Clock Logic ---
  // Utility to extract Drive ID
  function getDriveId(url) {
    if (!url) return null;
    const match = url.match(/[?&]id=([^&#]+)/) || url.match(/\/file\/d\/([^/?#]+)/);
    return match ? match[1] : null;
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

    // Filter systems based on role
    const allowedSystems = systems.filter(s => {
      const allowedRoles = s.roles || ['admin'];
      return allowedRoles.includes(userRole);
    });

    var groups = groupBySection(allowedSystems);
    var sectionNames = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });

    let adminTvNav = '';
    if (userRole === 'admin') {
      adminTvNav = `
        <div class="nav-section-label">Admin Tools</div>
        <a href="#home" class="nav-item" id="nav-toggle-tv" data-page="home">
          <span class="nav-icon">📺</span>
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
              '<span class="nav-icon">▣</span><span class="nav-label">' + escapeHtml(s.name) + '</span></a>'
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
          loginError.textContent = "Check network. Could not connect to Google Servers.";
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
        if (btnAdminExitTv) btnAdminExitTv.classList.remove('hidden');
        if (navToggle) navToggle.hidden = true; // No sidebar in TV preview
        if (sidebar) sidebar.style.display = 'none'; // Hide sidebar in Admin TV preview too
      } else {
        document.body.classList.remove('tv-mode');
        if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
        if (navToggle) navToggle.hidden = false;
        if (sidebar) sidebar.style.display = ''; // Restore sidebar
      }
      tvSettingsBox.classList.remove('hidden'); // Admin can change TV defaults
    } else {
      document.body.classList.remove('tv-mode');
      tvSettingsBox.classList.add('hidden'); // Uploader / Other restricted
      if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
      if (navToggle) navToggle.hidden = false;
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

    // Elements for Interactive TV Preview
    const imgInput = document.getElementById('post-img');
    const previewGroup = document.getElementById('post-img-preview-group');
    const previewImg = document.getElementById('post-preview-img');
    const previewContainer = document.getElementById('post-preview-container');
    const posInput = document.getElementById('post-img-pos');
    const coordsDisplay = document.getElementById('post-preview-coords');
    const sizeSelect = document.getElementById('post-img-size');

    // Video Playback Settings
    const videoSettingsGroup = document.getElementById('post-video-settings-group');
    const videoStartInput = document.getElementById('post-video-start');
    const videoEndInput = document.getElementById('post-video-end');

    const videoPreviewPlayer = document.getElementById('video-preview-player');
    const videoPreviewIframe = document.getElementById('video-preview-iframe-wrapper');
    const videoPreviewLoading = document.getElementById('video-preview-loading');
    const videoStartDisplay = document.getElementById('video-start-display');
    const videoDurationDisplay = document.getElementById('video-duration-display');
    const sliderStart = document.getElementById('post-video-slider-start');
    const sliderEnd = document.getElementById('post-video-slider-end');
    
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

    function updateDualSliderUI() {
      if (!videoDuration) return;
      let sVal = parseInt(sliderStart.value) || 0;
      let eVal = parseInt(sliderEnd.value) || videoDuration;

      if (sVal >= eVal) {
         if (this === sliderStart) { sVal = eVal - 1; sliderStart.value = sVal; }
         else { eVal = sVal + 1; sliderEnd.value = eVal; }
      }

      videoStartInput.value = sVal;
      videoEndInput.value = eVal;
      if (videoStartDisplay) videoStartDisplay.textContent = formatTimeObj(sVal);
      if (videoDurationDisplay) videoDurationDisplay.textContent = formatTimeObj(eVal) + " (Max: " + formatTimeObj(videoDuration) + ")";
    }

    function onSliderInput(e) {
      updateDualSliderUI.call(this);
      const targetTime = parseInt(this.value);
      if (videoPreviewPlayer && videoPreviewPlayer.style.display !== 'none' && isFinite(videoPreviewPlayer.duration)) {
        videoPreviewPlayer.currentTime = targetTime;
      } else if (previewYtPlayer && typeof previewYtPlayer.seekTo === 'function') {
        previewYtPlayer.seekTo(targetTime, true);
      } else if (previewFbPlayer && typeof previewFbPlayer.seek === 'function') {
        previewFbPlayer.seek(targetTime);
      }
    }

    if (sliderStart) sliderStart.addEventListener('input', onSliderInput);
    if (sliderEnd) sliderEnd.addEventListener('input', onSliderInput);

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

    window.loadPreviewVideo = function(url, isFile = false, resetValues = true) {
       if (!videoPreviewPlayer) return;
       videoPreviewPlayer.style.display = 'none';
       videoPreviewIframe.style.display = 'none';
       videoPreviewIframe.innerHTML = '';
       videoPreviewLoading.style.display = 'flex';
       if (videoPreviewLoading.querySelector('span')) videoPreviewLoading.querySelector('span').textContent = "Loading preview...";
       
       if (resetValues) {
          if (videoStartInput) videoStartInput.value = '';
          if (videoEndInput) videoEndInput.value = '';
          if (sliderStart) sliderStart.value = 0;
          if (sliderEnd) sliderEnd.value = 100;
       }

       videoDuration = 0;
       previewYtPlayer = null;
       previewFbPlayer = null;
       
       const ytId = window.getYouTubeVideoId ? getYouTubeVideoId(url) : null;
       const fbEmbedUrl = window.getFacebookVideoUrl ? getFacebookVideoUrl(url) : null;
       
       if (ytId && !isFile) {
         videoPreviewIframe.style.display = 'block';
         videoPreviewIframe.innerHTML = `<div id="preview-yt-anchor"></div>`;
         
         if (window.YT && window.YT.Player) {
            previewYtPlayer = new YT.Player('preview-yt-anchor', {
              videoId: ytId,
              playerVars: { controls: 0, disablekb: 1 },
              events: {
                'onReady': (event) => {
                   videoPreviewLoading.style.display = 'none';
                   videoDuration = Math.floor(event.target.getDuration());
                   sliderStart.max = videoDuration;
                   sliderEnd.max = videoDuration;
                   sliderEnd.value = videoEndInput.value || videoDuration;
                   sliderStart.value = videoStartInput.value || 0;
                   updateDualSliderUI();
                }
              }
            });
         } else {
             if (videoPreviewLoading.querySelector('span')) videoPreviewLoading.querySelector('span').textContent = "YouTube preview unavailable (API not loaded).";
         }
       } else if (fbEmbedUrl && !isFile) {
          videoPreviewIframe.style.display = 'block';
          const fbId = 'fb-preview-' + Date.now();
          videoPreviewIframe.innerHTML = `<div id="${fbId}" class="fb-video" data-href="${url}" data-width="auto" data-allowfullscreen="true" data-autoplay="false"></div>`;
          
          if (window.FB) {
             FB.XFBML.parse(videoPreviewIframe, () => {
                FB.Event.subscribe('xfbml.ready', (msg) => {
                   if (msg.id === fbId) {
                      videoPreviewLoading.style.display = 'none';
                      previewFbPlayer = msg.instance;
                      // FB SDK doesn't always provide duration immediately. We might have to wait or estimate.
                      // For now, let's try to get it from the instance if available.
                      videoDuration = 300; // Fallback to 5 mins if unknown
                      try {
                        // Some internal FB players allow getDuration()
                        if (previewFbPlayer.getDuration) videoDuration = Math.floor(previewFbPlayer.getDuration());
                      } catch(e){}

                      sliderStart.max = videoDuration;
                      sliderEnd.max = videoDuration;
                      sliderEnd.value = videoEndInput.value || videoDuration;
                      sliderStart.value = videoStartInput.value || 0;
                      updateDualSliderUI();
                   }
                });
             });
          } else {
             if (videoPreviewLoading.querySelector('span')) videoPreviewLoading.querySelector('span').textContent = "Facebook preview unavailable (SDK not loaded).";
          }
       } else {
         videoPreviewPlayer.style.display = 'block';
         videoPreviewPlayer.src = url;
         videoPreviewPlayer.onloadedmetadata = () => {
            videoPreviewLoading.style.display = 'none';
            videoDuration = Math.floor(videoPreviewPlayer.duration);
            if (isNaN(videoDuration) || !isFinite(videoDuration)) videoDuration = 100;
            sliderStart.max = videoDuration;
            sliderEnd.max = videoDuration;
            sliderEnd.value = videoEndInput.value || videoDuration;
            sliderStart.value = videoStartInput.value || 0;
            updateDualSliderUI();
         };
         videoPreviewPlayer.onerror = () => {
            if (videoPreviewLoading.querySelector('span')) videoPreviewLoading.querySelector('span').textContent = "Preview unavailable for this format.";
         };
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

        if (activeUploadTab === 'url') {
           // Handle legacy URL detection if needed
           if (imgInput && imgInput.value.trim()) {
              imgInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
           }
        }
      });
    });

    // === FILE INPUT + DRAG/DROP FEEDBACK ===
    const fileInput = document.getElementById('post-file');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileLabelText = document.getElementById('file-label-text');

    if (fileInput && fileUploadLabel) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          if (fileLabelText) fileLabelText.textContent = '✅ ' + file.name;
          fileUploadLabel.classList.add('file-selected');
          fileUploadLabel.classList.remove('drag-over');
          
          const iconWrapper = fileUploadLabel.querySelector('.upload-icon-wrapper');
          if (iconWrapper) iconWrapper.style.color = '#16a34a';

          // --- Show Local Preview ---
          if (file.type.startsWith('image/') && previewImg && previewGroup) {
            if (videoSettingsGroup) videoSettingsGroup.style.display = 'none';
            const reader = new FileReader();
            reader.onload = (e) => {
              previewImg.src = e.target.result;
              previewGroup.style.display = 'block';
            };
            reader.readAsDataURL(file);
          } else if (file.type.startsWith('video/')) {
            if (previewGroup) previewGroup.style.display = 'none';
            if (videoSettingsGroup) videoSettingsGroup.style.display = 'block';
            
            const fileURL = URL.createObjectURL(file);
            if (window.loadPreviewVideo) window.loadPreviewVideo(fileURL, true, true);
          }
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
          if (fileLabelText) fileLabelText.textContent = '✅ ' + ev.dataTransfer.files[0].name;
          fileUploadLabel.classList.add('file-selected');
          const iconWrapper = fileUploadLabel.querySelector('.upload-icon-wrapper');
          if (iconWrapper) iconWrapper.style.color = '#16a34a';
        }
      });
    }

    if (imgInput && previewGroup && previewImg && previewContainer) {
      let imgInputTimeout;
      imgInput.addEventListener('input', (e) => {
        const runInput = () => {
          const url = imgInput.value.trim();
          if (url) {
            const urlLower = url.toLowerCase();
            const isVideo = (window.getYouTubeVideoId ? getYouTubeVideoId(url) : false) || 
                            (window.getFacebookVideoUrl ? getFacebookVideoUrl(url) : false) || 
                            /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || 
                            urlLower.includes('drive.google.com') || 
                            urlLower.includes('/video/upload/');
            
            const liveToggle = document.querySelector('.live-stream-toggle');
            
            if (isVideo) {
              if (liveToggle) liveToggle.classList.remove('hidden');
              previewGroup.style.display = 'none';
              if (videoSettingsGroup) videoSettingsGroup.style.display = 'block';
              if (window.loadPreviewVideo) {
                 const keep = e.detail && e.detail.keepValues;
                 window.loadPreviewVideo(url, false, !keep);
              }
            } else {
              if (liveToggle) liveToggle.classList.add('hidden');
              if (videoSettingsGroup) videoSettingsGroup.style.display = 'none';
              previewImg.src = url;
              previewGroup.style.display = 'block';
            }
          } else {
            const liveToggle = document.querySelector('.live-stream-toggle');
            if (liveToggle) liveToggle.classList.add('hidden');
            previewGroup.style.display = 'none';
            if (videoSettingsGroup) videoSettingsGroup.style.display = 'none';
          }
        };

        clearTimeout(imgInputTimeout);
        if (e.detail && e.detail.keepValues) {
           runInput();
        } else {
           imgInputTimeout = setTimeout(runInput, 500);
        }
      });

      previewImg.addEventListener('error', () => {
        previewGroup.style.display = 'none';
      });

      previewImg.addEventListener('load', () => {
        previewGroup.style.display = 'block';
      });

      const transformWrapper = document.getElementById('post-preview-transform-wrapper');
      const zoomSlider = document.getElementById('post-img-zoom');
      const zoomValDisplay = document.getElementById('post-preview-zoom-val');
      const resetBtn = document.getElementById('post-preview-reset-btn');
      const hiddenSizeVal = document.getElementById('post-img-size-val');

      let currentZoom = 1;
      let currentX = 0; // %
      let currentY = 0; // %

      function updateTransform() {
        if (!transformWrapper) return;
        transformWrapper.style.transform = `scale(${currentZoom}) translate(${currentX}%, ${currentY}%)`;
        const posStr = `${Math.round(currentX)}%, ${Math.round(currentY)}%`;

        if (posInput) posInput.value = `${currentX} ${currentY}`;
        if (hiddenSizeVal) hiddenSizeVal.value = currentZoom;
        if (coordsDisplay) coordsDisplay.textContent = posStr;
      }

      window.setPreviewTransformState = function (zoom, x, y) {
        currentZoom = zoom;
        currentX = x;
        currentY = y;
        if (zoomSlider) zoomSlider.value = zoom;
        if (zoomValDisplay) zoomValDisplay.textContent = zoom.toFixed(2) + 'x';
        updateTransform();
      };

      if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
          currentZoom = parseFloat(e.target.value);
          if (zoomValDisplay) zoomValDisplay.textContent = currentZoom.toFixed(2) + 'x';
          updateTransform();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (window.setPreviewTransformState) {
            window.setPreviewTransformState(1, 0, 0);
          }
        });
      }


      let isDragging = false;
      let startMouseX = 0, startMouseY = 0;
      let initialDragX = 0, initialDragY = 0;

      previewContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        initialDragX = currentX;
        initialDragY = currentY;

        previewContainer.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const rect = previewContainer.getBoundingClientRect();
        const containerWidth = rect.width || 1;
        const containerHeight = rect.height || 1;

        // Account for current zoom scale so dragging feels 1:1 with mouse movement
        const deltaX_px = (e.clientX - startMouseX) / currentZoom;
        const deltaY_px = (e.clientY - startMouseY) / currentZoom;

        const deltaX_percent = (deltaX_px / containerWidth) * 100;
        const deltaY_percent = (deltaY_px / containerHeight) * 100;

        currentX = initialDragX + deltaX_percent;
        currentY = initialDragY + deltaY_percent;

        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          previewContainer.style.cursor = 'grab';
        }
      });
    }

    if (addPostBtn && modal) {
      addPostBtn.addEventListener('click', () => {
        form.removeAttribute('data-edit-timestamp');
        document.querySelector('.modal-title').textContent = "Create New Update";
        document.getElementById('submit-post-btn').textContent = "Post Update";
        form.reset();

        // Reset upload tab to default
        uploadTabBtns.forEach(b => b.classList.remove('active'));
        const defaultTabBtn = document.querySelector('.upload-tab[data-tab="upload"]');
        if (defaultTabBtn) defaultTabBtn.classList.add('active');
        activeUploadTab = 'upload';
        
        // Hide all panels, show only upload
        Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
        if (uploadPanels['upload']) uploadPanels['upload'].classList.remove('hidden');
        
        const liveInput = document.getElementById('post-live-url');
        if (liveInput) liveInput.value = '';
        if (fileUploadLabel) {
          fileUploadLabel.classList.remove('file-selected');
          if (fileLabelText) fileLabelText.textContent = 'Click or drag image/video here';
          const iconWrapper = fileUploadLabel.querySelector('.upload-icon-wrapper');
          if (iconWrapper) iconWrapper.style.color = '';
        }

        if (previewGroup) previewGroup.style.display = 'none';
        if (previewImg) previewImg.style.objectPosition = '50% 50%';
        if (videoSettingsGroup) videoSettingsGroup.style.display = 'none';
        if (videoStartInput) videoStartInput.value = '';
        if (videoEndInput) videoEndInput.value = '';
        
        // Reset scheduling fields
        const startDateInput = document.getElementById('post-start-date');
        const endDateInput = document.getElementById('post-end-date');
        const isLiveInput = document.getElementById('post-is-live');
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        if (isLiveInput) isLiveInput.checked = false;

        if (window.setPreviewTransformState) {
          window.setPreviewTransformState(1, 0, 0);
        }

        modal.classList.remove('hidden');
        if (errorMsg) errorMsg.classList.add('hidden');
      });

      cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.removeAttribute('data-edit-timestamp');
        form.reset();
        if (previewGroup) previewGroup.style.display = 'none';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sessionData = sessionStorage.getItem('sas_user_data');
        if (!sessionData) return;

        const title = document.getElementById('post-title').value;
        const desc = document.getElementById('post-desc').value;
        const imgUrl = document.getElementById('post-img') ? document.getElementById('post-img').value : '';
        let imgPos = document.getElementById('post-img-pos') ? document.getElementById('post-img-pos').value : '0 0';
        const imgSize = document.getElementById('post-img-size-val') ? document.getElementById('post-img-size-val').value : '1';
        
        const startVal = document.getElementById('post-video-start') ? document.getElementById('post-video-start').value : '';
        const endVal = document.getElementById('post-video-end') ? document.getElementById('post-video-end').value : '';
        if (startVal || endVal) {
          imgPos = `${imgPos}|${startVal}|${endVal}`;
        }

        const startDate = document.getElementById('post-start-date') ? document.getElementById('post-start-date').value : '';
        const endDate = document.getElementById('post-end-date') ? document.getElementById('post-end-date').value : '';
        
        // isLive is now determined by the active tab
        const isLive = (activeUploadTab === 'live');
        
        // Handle URL selection based on tab
        if (activeUploadTab === 'url') {
           imgUrl = document.getElementById('post-img').value || '';
        } else if (activeUploadTab === 'live') {
           imgUrl = document.getElementById('post-live-url').value || '';
        }

        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;

        const zzProgress = {
          start: () => {
            submitBtn.classList.add('active');
            submitBtn.setAttribute('data-progress', '0');
            submitBtn.style.setProperty('--zz-progress', '0');
            submitBtn.disabled = true;
          },
          update: (pct) => {
            submitBtn.setAttribute('data-progress', Math.round(pct));
            submitBtn.style.setProperty('--zz-progress', pct);
          },
          done: () => {
             return new Promise(resolve => {
                submitBtn.classList.remove('active');
                submitBtn.classList.add('progress-done-pre');
                const onAnimEnd = (e) => {
                   if (e.animationName === 'progress-done-pre') {
                      submitBtn.classList.add('zz-button-progress-done');
                      setTimeout(() => {
                         submitBtn.classList.add('zz-button-progress-done-active');
                         setTimeout(() => {
                            submitBtn.removeEventListener('animationend', onAnimEnd);
                            resolve();
                         }, 1500);
                      }, 100);
                   }
                };
                submitBtn.addEventListener('animationend', onAnimEnd);
             });
          },
          reset: () => {
            submitBtn.classList.remove('active', 'progress-done-pre', 'zz-button-progress-done', 'zz-button-progress-done-active');
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
            submitBtn.removeAttribute('data-progress');
            submitBtn.style.removeProperty('--zz-progress');
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

          if (!confirmPass) {
            zzProgress.reset();
            return;
          }

          zzProgress.start();

          // --- 1. PRE-VERIFY CREDENTIALS ---
          zzProgress.update(5);
          const loginCheck = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: "login",
              username: userObj.username,
              password: confirmPass
            })
          });
          const loginRes = await loginCheck.json();
          if (!loginRes.success) {
            throw new Error("Invalid credentials. Action cancelled.");
          }

          let cloudinaryUrl = imgUrl;
          let cloudinaryPublicId = ""; // Store for automatic deletion

          // --- 2. Cloudinary Upload ---
          if (activeUploadTab === 'upload' && fileInput && fileInput.files && fileInput.files[0]) {
            console.log("Starting Cloudinary flow. Active Tab:", activeUploadTab);
            if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
              throw new Error("Cloudinary not configured. Please add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in app.js.");
            }

            let file = fileInput.files[0];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (isImage) {
               zzProgress.update(7);
               try {
                  file = await compressImage(file);
               } catch(e) { console.warn('Image compression failed', e); }
               zzProgress.update(10);
            } 

            zzProgress.update(12);

            let cloudData;
            const isLarge = file.size > 40 * 1024 * 1024;

            if (isVideo && isLarge) {
               zzProgress.update(11);
               try {
                  cloudData = await uploadToGoogleDriveResumable(file, (pct) => {
                     zzProgress.update(12 + (pct * 0.7));
                  });
               } catch(e) {
                  console.warn('Google Drive Fast Mode upload failed', e);
                  throw new Error("Mega Storage (Google Drive) upload failed. " + e.message);
               }
            } else if (file.size > 10 * 1024 * 1024) {
               // Use chunked upload for files over 10MB
               cloudData = await uploadFileChunked(file, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME, (pct) => {
                  zzProgress.update(12 + (pct * 0.7));
               });
            } else {
               const formData = new FormData();
               formData.append('file', file);
               formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
               formData.append('folder', 'sas_repository');

               const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                 method: 'POST',
                 body: formData
               });
               cloudData = await cloudRes.json();
            }

            if (cloudData && (cloudData.secure_url || cloudData.drivePreviewUrl)) {
               cloudinaryUrl = cloudData.drivePreviewUrl || cloudData.secure_url;
               cloudinaryPublicId = cloudData.public_id;
            } else {
               throw new Error("Cloudinary Error: " + (cloudData && cloudData.error ? cloudData.error.message : "Upload failed"));
            }
          }

          // --- Build Payload ---
          const payload = {
            action: isEdit ? "editPost" : "addPost",
            username: userObj.username,
            password: confirmPass,
            title: title,
            description: desc,
            imageUrl: cloudinaryUrl,
            cloudinaryPublicId: cloudinaryPublicId,
            imagePosition: imgPos,
            imageSize: imgSize,
            startDate: startDate,
            endDate: endDate,
            isLive: isLive
          };

          if (isEdit) payload.timestamp = editTimestamp;
          console.log("Submitting Payload to Backend:", payload);

          zzProgress.update(85);
          const r = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          const responseData = await r.json();
          zzProgress.update(100);
          console.log("Backend Response:", responseData);

          if (responseData.success) {
            await zzProgress.done();
            modal.classList.add('hidden');
            form.reset();
            showToast(responseData.message || "Post updated successfully!", 'success');
            zzProgress.reset();
            fetchPosts(); // Refresh the feed
          } else {
            zzProgress.reset();
            if (errorMsg) {
              errorMsg.textContent = responseData.message || "Failed to post.";
              errorMsg.classList.remove('hidden');
            }
          }
        } catch (err) {
          zzProgress.reset();
          if (errorMsg) {
            errorMsg.textContent = err.message || "Network error. Could not post.";
            errorMsg.classList.remove('hidden');
          }
          console.error("Upload Error:", err);
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

                    // Clear old Carousel timers and memory leaks
                    if (window.carouselTimer) {
                      window.clearInterval(window.carouselTimer);
                      window.carouselTimer = null;
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
          container.className = 'home-news'; // Override container grid settings to fit carousel
        } else {
          container.className = 'posts-container'; // Restore grid for admin/user
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

  function getYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  let windowFbInitDone = false;
  window.fbPlayers = {};
  function initFbSdk() {
    if (windowFbInitDone) return;
    windowFbInitDone = true;
    window.fbAsyncInit = function() {
      FB.init({ xfbml: true, version: 'v19.0' });
      FB.Event.subscribe('xfbml.ready', function(msg) {
        if (msg.type === 'video') {
          window.fbPlayers[msg.id] = msg.instance;
          // Play immediately if it's currently active
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
    };
    const js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.head.appendChild(js);
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
        // We don't necessarily need to fetchPosts() immediately here 
        // as the carousel will advance anyway, but we could if we want UI sync.
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

        slide.innerHTML = `
        <div class="home-news-image-wrap">
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
            // Admin/Uploader view: Show thumbnail instead of iframe
            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px;"><img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${ytId}/default.jpg'"></div>`;
          } else if (fbEmbedUrl) {
            // Facebook: No easy thumbnail API for external developers without SDK, show a neat placeholder
            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">
              <div style="text-align: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#1877F2" style="margin-bottom: 8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <div style="font-size: 12px; opacity: 0.8;">Facebook Video</div>
              </div>
            </div>`;
          } else if (
            urlLower && (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com'))
          ) {
            // Cloudinary: Only transform to .jpg if it's a video file extension
            const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const thumbUrl = isVideo ? post.imageUrl.replace(/\.[^.]+$/, '.jpg') : post.imageUrl;
            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px;"><img src="${thumbUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy"></div>`;
          } else if (
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')
          ) {
            // Direct video link (non-Cloudinary): Remove autoplay to prevent multiple videos playing
            let mediaHash = '';
            if (startVal && endVal) mediaHash = `#t=${startVal},${endVal}`;
            else if (startVal) mediaHash = `#t=${startVal}`;
            else if (endVal) mediaHash = `#t=0,${endVal}`;

            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px;"><video src="${post.imageUrl}${mediaHash}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" preload="metadata" controls></video></div>`;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            // Legacy preview (static iframe)
            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px;"><iframe src="${post.imageUrl}" class="post-image" style="border: none; width: 100%; height: 100%; ${styleStr}"></iframe></div>`;
          } else {
            const fallbackSquare = 'https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png';
            imgHtml = `<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #1a1a1a; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackSquare}'; this.style.objectFit='contain'; this.style.opacity='0.2'; this.style.width='50%';"></div>`;
          }

          if (post.isLive) {
            imgHtml = `<div class="live-badge">LIVE</div>` + imgHtml;
          }
        }
        
        let schedulingLabel = '';
        if (post.startDate || post.endDate) {
          let sText = post.startDate ? `From: ${new Date(post.startDate).toLocaleString()}` : '';
          let eText = post.endDate ? ` Until: ${new Date(post.endDate).toLocaleString()}` : '';
          schedulingLabel = `<div class="post-scheduled-label">${sText}${eText}</div>`;
        }

        card.innerHTML = `
          ${imgHtml}
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
          editBtn.className = 'secondary-btn edit-post-btn';
          editBtn.textContent = 'Edit';
          editBtn.onclick = () => {
            const form = document.getElementById('add-post-form');
            const modal = document.getElementById('add-post-modal');

            document.querySelector('.modal-title').textContent = "Edit Update";
            document.getElementById('submit-post-btn').textContent = "Save Changes";

            document.getElementById('post-title').value = post.title;
            document.getElementById('post-desc').value = post.description;
            
            if (document.getElementById('post-start-date')) document.getElementById('post-start-date').value = post.startDate || '';
            if (document.getElementById('post-end-date')) document.getElementById('post-end-date').value = post.endDate || '';
            if (document.getElementById('post-is-live')) document.getElementById('post-is-live').checked = post.isLive;

            const liveToggle = document.querySelector('.live-stream-toggle');
            const urlForEdit = post.imageUrl || '';
            const isVideoForEdit = (window.getYouTubeVideoId ? getYouTubeVideoId(urlForEdit) : false) || 
                                   (window.getFacebookVideoUrl ? getFacebookVideoUrl(urlForEdit) : false) || 
                                   /\.(mp4|webm|mov|mkv|avi)$/i.test(urlForEdit.toLowerCase()) || 
                                   urlForEdit.includes('drive.google.com') || 
                                   urlForEdit.includes('/video/upload/');

            if (isVideoForEdit) {
              if (liveToggle) liveToggle.classList.remove('hidden');
            } else if (liveToggle) {
              liveToggle.classList.add('hidden');
            }

            const posInput = document.getElementById('post-img-pos');
            let p = post.imagePosition || '50% 50%';
            let startVal = '';
            let endVal = '';
            if (p.includes('|')) {
                const parts = p.split('|');
                p = parts[0];
                startVal = parts[1] || '';
                endVal = parts[2] || '';
            }

            if (posInput) {
              posInput.value = p;
              const coordsDisplay = document.getElementById('post-preview-coords');
              if (coordsDisplay) coordsDisplay.textContent = p;

              const vStart = document.getElementById('post-video-start');
              const vEnd = document.getElementById('post-video-end');
              if (vStart) vStart.value = startVal;
              if (vEnd) vEnd.value = endVal;
            }

            const imgInput = document.getElementById('post-img');
            if (imgInput) {
              imgInput.value = post.imageUrl;
              imgInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
            }

            const hiddenSizeVal = document.getElementById('post-img-size-val');

            const zoomSlider = document.getElementById('post-img-zoom');
            const zoomValDisplay = document.getElementById('post-preview-zoom-val');
            const transformWrapper = document.getElementById('post-preview-transform-wrapper');

            // Apply existing scale or fallback
            let initialZoom = 1;
            let initialTrX = 0;
            let initialTrY = 0;

            if (post.imageSize && post.imageSize !== 'cover' && post.imageSize !== 'contain') {
              initialZoom = parseFloat(post.imageSize);
              if (isNaN(initialZoom)) initialZoom = 1;
              const pParts = (p || '0 0').split(' ');
              if (pParts.length >= 2) {
                initialTrX = parseFloat(pParts[0]) || 0;
                initialTrY = parseFloat(pParts[1]) || 0;
              }
            }

            if (window.setPreviewTransformState) {
              window.setPreviewTransformState(initialZoom, initialTrX, initialTrY);
            }


            form.setAttribute('data-edit-timestamp', post.timestamp);

            modal.classList.remove('hidden');
          };
          actionArea.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'secondary-btn delete-post-btn';
          deleteBtn.style.background = 'rgba(220, 38, 38, 0.8)';
          deleteBtn.style.color = 'white';
          deleteBtn.style.border = 'none';
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
          toggleTvBtn.className = 'secondary-btn toggle-tv-btn';
          const isHidden = String(post.showOnTv).toLowerCase() === 'false';
          toggleTvBtn.textContent = isHidden ? 'Show on TV' : 'Hide from TV';
          const btnColor = isHidden ? 'rgba(34, 197, 94, 0.8)' : 'rgba(249, 115, 22, 0.8)';
          toggleTvBtn.style.background = btnColor;
          toggleTvBtn.style.color = 'white';
          toggleTvBtn.style.border = 'none';

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
          if (myGeneration === globalSlideGeneration && slides.length > 1) next();
        };
        // Safety fallback: advance after 3 minutes max even if video stalls
        start(180000);
      } else if (iframeEl && window.YT && window.YT.Player) {
        const iframeId = iframeEl.id;
        const myPlayerId = iframeId;

        function startYTPolling(player) {
          const checkInterval = setInterval(() => {
            if (myGeneration !== globalSlideGeneration) {
              clearInterval(checkInterval);
              return;
            }
            try {
              const state = player.getPlayerState();
              const duration = player.getDuration();
              const currentTime = player.getCurrentTime();
              // Advance if video is within 1.5s of end
              const effectiveEnd = (curEnd > 0) ? curEnd : duration;
              if (state === 0 || (effectiveEnd > 0 && currentTime >= (effectiveEnd - 1.5))) {
                console.log('YouTube auto-advancing slide:', myPlayerId);
                clearInterval(checkInterval);
                next();
              }
            } catch (e) { }
          }, 250);
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
                  if (post.isLive) {
                    console.log("Live stream ended! Hiding post from TV automatically...");
                    expirePostOnBackend(post.timestamp);
                  }
                  if (myGeneration === globalSlideGeneration && slides.length > 1) next();
                }
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
        // Safety fallback
        start(300000);
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
                            if (post.isLive) {
                                console.log("Facebook Live stream finished! Hiding from TV...");
                                expirePostOnBackend(post.timestamp);
                            }
                            if (myGeneration === globalSlideGeneration && slides.length > 1) {
                                next();
                            }
                        });
                    }

                    // Poll for custom end time
                    const fbPoll = setInterval(() => {
                        if (myGeneration !== globalSlideGeneration) {
                            clearInterval(fbPoll);
                            return;
                        }
                        try {
                           const pos = player.getCurrentPosition();
                           if (curEnd > 0 && pos >= curEnd) {
                               clearInterval(fbPoll);
                               next();
                           }
                        } catch(e){}
                    }, 500);
                 } catch(e) {
                    console.error('FB Player Error:', e);
                 }
             }
             attempts++;
             if (attempts > 50) clearInterval(tryPlay); // give up after 10s
          }, 200);
        }

        start(180000); 
      } else if (driveIframeEl) {
        // Drive video iframe — can't hook into events, use standard timer
        start();
      } else {
        // Static image slide
        start();
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
          start();
        }
      });
    });

    setActive(0);
    start();
  }

});
