// REPLACE THIS WITH YOUR NEW SPREADSHEET DEPLOYMENT URL
const BACKEND_GAS_URL = "https://script.google.com/macros/s/AKfycbza2QFzH0B3XkMFX9RITeSj1f3v4Ox8j5lYxBtxnTUTdqyTlWeE0SieK1n4fTdIRPmbvw/exec";

// --- CLOUDINARY CONFIGURATION ---
// Get these from your Cloudinary Dashboard: https://cloudinary.com/console
const CLOUDINARY_CLOUD_NAME = "dj8ugtlrl"; // e.g. "yourname"
const CLOUDINARY_UPLOAD_PRESET = "sas_uploads"; // e.g. "sas_uploads" (Must be Unsigned)

// Load YouTube IFrame APIs
if (!window.YT) {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global TV Settings State
let tvAudioEnabled = false;
let tvTheaterEnabled = false;

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

document.addEventListener('DOMContentLoaded', () => {
  // --- TV Clock Logic ---
  function updateClock() {
    const clock = document.getElementById('tv-clock');
    const timeEl = document.getElementById('tv-time');
    const dateEl = document.getElementById('tv-date');
    if (!clock || !timeEl || !dateEl) return;

    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
  }
  updateClock();
  setInterval(updateClock, 1000);

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

  let systems = [];
  let ytPlayers = {}; // Persistent store for YT players
  let globalCarouselTimer = null;
  let globalSlideGeneration = 0;

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
    if (!sys) {
      setActiveNav(document.querySelector('.nav-item[data-page="home"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('home');
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
    // Uploader role cannot access other services
    const sessionData = sessionStorage.getItem('sas_user_data');
    if (sessionData) {
      try {
        const role = JSON.parse(sessionData).role;
        if (role === 'uploader') {
          navDynamic.innerHTML = '<div class="nav-section-label">Restricted</div><div style="padding:10px 16px; font-size:0.85rem; color:var(--text-muted);">Uploader role has limited access to external systems.</div>';
          return;
        }
      } catch (e) { }
    }

    var groups = groupBySection(systems);
    var sectionNames = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });

    navDynamic.innerHTML = sectionNames
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

    navDynamic.querySelectorAll('.nav-item').forEach(function (a) {
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

  function showConfirm(title, message, showPassword = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const inputGroup = document.getElementById('confirm-modal-input-group');
      const passwordInput = document.getElementById('confirm-modal-password');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const okBtn = document.getElementById('confirm-modal-ok');

      titleEl.textContent = title;
      messageEl.textContent = message;
      passwordInput.value = '';

      if (showPassword) {
        inputGroup.classList.remove('hidden');
      } else {
        inputGroup.classList.add('hidden');
      }

      modal.classList.remove('hidden');

      const cleanup = (result) => {
        modal.classList.add('hidden');
        cancelBtn.onclick = null;
        okBtn.onclick = null;
        resolve(result);
      };

      cancelBtn.onclick = () => cleanup(null);
      okBtn.onclick = () => {
        if (showPassword) {
          const pass = passwordInput.value.trim();
          if (!pass) {
            showToast("Password is required", "error");
            return;
          }
          cleanup(pass);
        } else {
          cleanup(true);
        }
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
      if (tvTheaterEnabled) {
        btnTvTheater.classList.add('active-setting');
      } else {
        btnTvTheater.classList.remove('active-setting');
        document.body.classList.remove('video-fullscreen-active'); // Force exit if disabling
      }
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
          loginError.textContent = "Developer Error: Please paste your deployed Backend.gs URL into app.js Line 2!";
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
      window.location.hash = 'home';
      closeNav();
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

    // Fetch config with cache bypassing
    fetch('systems/config.json?v=' + new Date().getTime())
      .then(function (r) {
        if (!r.ok) throw new Error('Config not found');
        return r.json();
      })
      .then(function (data) {
        systems = Array.isArray(data) ? data : (data.systems || []);
        if (statSystems) statSystems.textContent = systems.length;
        renderNav();
        initPostSetup();
        fetchPosts(); // Load dynamic posts
        window.addEventListener('hashchange', syncFromHash);
        syncFromHash();
      })
      .catch(function () {
        systems = [];
        if (statSystems) statSystems.textContent = '0';
        navDynamic.innerHTML = '<div class="nav-section-label" style="padding: 0.5rem 1rem; color: rgba(255,255,255,0.72);">No systems loaded</div>';
      });
  }

  function setupUserMenu(userObj) {
    // Adjust UI based on TV Mode
    if (userObj.role === 'tv') {
      document.body.classList.add('tv-mode');
      tvSettingsBox.classList.remove('hidden');

      // Attempt actual fullscreen via API explicitly for the TV role
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log("Auto-fullscreen blocked by browser. User gesture needed.");
          });
        }
      } catch (err) { }
    } else if (userObj.role === 'admin') {
      document.body.classList.remove('tv-mode');
      tvSettingsBox.classList.remove('hidden'); // Admin can change TV defaults
    } else {
      document.body.classList.remove('tv-mode');
      tvSettingsBox.classList.add('hidden'); // Uploader / Other restricted
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

    // === UPLOAD TAB SWITCHING ===
    const uploadTabBtns = document.querySelectorAll('.upload-tab');
    const uploadPanels = { upload: document.getElementById('upload-tab-upload'), url: document.getElementById('upload-tab-url') };
    let activeUploadTab = 'upload'; // Default to file upload

    uploadTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        uploadTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeUploadTab = btn.dataset.tab;
        Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
        if (uploadPanels[activeUploadTab]) uploadPanels[activeUploadTab].classList.remove('hidden');
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
          fileLabelText.textContent = '✅ ' + file.name;
          fileUploadLabel.classList.add('file-selected');
          fileUploadLabel.classList.remove('drag-over');

          // --- Show Local Preview ---
          if (file.type.startsWith('image/') && previewImg && previewGroup) {
            const reader = new FileReader();
            reader.onload = (e) => {
              previewImg.src = e.target.result;
              previewGroup.style.display = 'block';
            };
            reader.readAsDataURL(file);
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
          fileLabelText.textContent = '✅ ' + ev.dataTransfer.files[0].name;
          fileUploadLabel.classList.add('file-selected');
        }
      });
    }

    if (imgInput && previewGroup && previewImg && previewContainer) {
      imgInput.addEventListener('input', () => {
        const url = imgInput.value.trim();
        if (url) {
          previewImg.src = url;
          previewGroup.style.display = 'block';
        } else {
          previewGroup.style.display = 'none';
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

      window.setPreviewTransformState = function(zoom, x, y) {
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
        Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
        if (uploadPanels['upload']) uploadPanels['upload'].classList.remove('hidden');
        if (fileUploadLabel) {
          fileUploadLabel.classList.remove('file-selected');
          if (fileLabelText) fileLabelText.textContent = 'Click to choose an image/video or drag & drop';
        }

        if (previewGroup) previewGroup.style.display = 'none';
        if (previewImg) previewImg.style.objectPosition = '50% 50%';
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
        const imgPos = document.getElementById('post-img-pos') ? document.getElementById('post-img-pos').value : '0 0';
        const imgSize = document.getElementById('post-img-size-val') ? document.getElementById('post-img-size-val').value : '1';
        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;

        submitBtn.textContent = "Saving...";
        submitBtn.disabled = true;
        if (errorMsg) errorMsg.classList.add('hidden');

        try {
          const userObj = JSON.parse(sessionData);

          const editTimestamp = form.getAttribute('data-edit-timestamp');
          const isEdit = !!editTimestamp;

          const confirmPass = await showConfirm(
            isEdit ? "Confirm Edit" : "Confirm Post",
            `Please enter your password to ${isEdit ? 'update' : 'publish'} this post:`,
            true
          );

          if (!confirmPass) {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
            return;
          }

          // --- 1. PRE-VERIFY CREDENTIALS ---
          // This stops the process immediately if the password is wrong, before uploading files.
          submitBtn.textContent = 'Verifying credentials...';
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

            const file = fileInput.files[0];
            submitBtn.textContent = 'Uploading to Cloudinary...';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'sas_repository'); // Organizes files into this folder

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
              method: 'POST',
              body: formData
            });

            const cloudData = await cloudRes.json();
            if (cloudData.secure_url) {
              cloudinaryUrl = cloudData.secure_url;
              cloudinaryPublicId = cloudData.public_id; // Capture the ID for deletion
            } else {
              throw new Error("Cloudinary Upload Error: " + (cloudData.error ? cloudData.error.message : "Unknown error"));
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
            imageSize: imgSize
          };

          if (isEdit) payload.timestamp = editTimestamp;
          console.log("Submitting Payload to Backend:", payload);

          submitBtn.textContent = 'Updating Spreadsheet...';

          const r = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          const responseData = await r.json();
          console.log("Backend Response:", responseData);
          if (responseData.success) {
            modal.classList.add('hidden');
            form.reset();
            showToast(responseData.message || "Post updated successfully!", 'success');
            fetchPosts(); // Refresh the feed
          } else {
            if (errorMsg) {
              errorMsg.textContent = responseData.message || "Failed to post.";
              errorMsg.classList.remove('hidden');
            }
          }
        } catch (err) {
          if (errorMsg) {
            errorMsg.textContent = err.message || "Network error. Could not post.";
            errorMsg.classList.remove('hidden');
          }
          console.error("Upload Error:", err);
        } finally {
          submitBtn.textContent = origText;
          submitBtn.disabled = false;
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

        if (role === 'tv') {
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

  function renderPosts(posts, container, role) {
    container.innerHTML = '';
    ytPlayers = {}; // Clear previous instances

    if (role === 'tv') {
      let tvPosts = posts.filter(p => String(p.showOnTv).toLowerCase() !== 'false');

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
        const slide = document.createElement('article');
        slide.className = 'home-news-slide' + (index === 0 ? ' is-active' : '');
        slide.setAttribute('data-index', index);
        slide.setAttribute('data-title', escapeHtml(post.title || ''));
        slide.setAttribute('data-desc', escapeHtml(post.description || ''));

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

          if (ytId) {
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 <iframe id="ytplayer-${post.timestamp}" src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&showinfo=0&autohide=1" class="home-news-image yt-video-frame" style="border: none; width: 100%; height: 100%; ${styleStr}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
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
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                <video src="${post.imageUrl}" class="home-news-image" style="width: 100%; height: 100%; ${styleStr}" autoplay muted playsinline></video>
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
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="home-news-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy">
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

          if (ytId) {
            // Admin/Uploader view: Show thumbnail instead of iframe
            imgHtml = `<div style="position: relative; width: 100%; height: 200px; overflow: hidden;"><img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${ytId}/default.jpg'"></div>`;
          } else if (
            urlLower && (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com'))
          ) {
            // Cloudinary: Only transform to .jpg if it's a video file extension
            const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const thumbUrl = isVideo ? post.imageUrl.replace(/\.[^.]+$/, '.jpg') : post.imageUrl;
            imgHtml = `<div style="position: relative; width: 100%; height: 200px; overflow: hidden;"><img src="${thumbUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy"></div>`;
          } else if (
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')
          ) {
            // Direct video link (non-Cloudinary): Remove autoplay to prevent multiple videos playing
            imgHtml = `<div style="position: relative; width: 100%; height: 200px; overflow: hidden;"><video src="${post.imageUrl}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" preload="metadata"></video></div>`;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            // Legacy preview (static iframe)
            imgHtml = `<div style="position: relative; width: 100%; height: 200px; overflow: hidden;"><iframe src="${post.imageUrl}" class="post-image" style="border: none; width: 100%; height: 100%; ${styleStr}"></iframe></div>`;
          } else {
            imgHtml = `<div style="position: relative; width: 100%; height: 200px; overflow: hidden;"><img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="width: 100%; height: 100%; ${styleStr}" loading="lazy"></div>`;
          }
        }

        card.innerHTML = `
          ${imgHtml}
          <div class="post-content">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-desc">${escapeHtml(post.description)}</p>
          </div>
        `;

        if (role === 'admin' || role === 'uploader') {
          const editBtn = document.createElement('button');
          editBtn.className = 'secondary-btn edit-post-btn';
          editBtn.style.cssText = 'position: absolute; top: 12px; right: 12px; padding: 6px 16px; font-size: 0.8rem; background: rgba(0,0,0,0.6); color: white; border-radius: 6px; backdrop-filter: blur(4px); cursor: pointer;';
          editBtn.textContent = 'Edit';
          editBtn.onclick = () => {
            const form = document.getElementById('add-post-form');
            const modal = document.getElementById('add-post-modal');

            document.querySelector('.modal-title').textContent = "Edit Update";
            document.getElementById('submit-post-btn').textContent = "Save Changes";

            document.getElementById('post-title').value = post.title;
            document.getElementById('post-desc').value = post.description;

            const imgInput = document.getElementById('post-img');
            if (imgInput) {
              imgInput.value = post.imageUrl;
              imgInput.dispatchEvent(new Event('input'));
            }

            const posInput = document.getElementById('post-img-pos');
            if (posInput) {
              const p = post.imagePosition || '50% 50%';
              posInput.value = p;
              const coordsDisplay = document.getElementById('post-preview-coords');
              if (coordsDisplay) coordsDisplay.textContent = p;
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
              const pParts = (post.imagePosition || '0 0').split(' ');
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
          card.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'secondary-btn delete-post-btn';
          deleteBtn.style.cssText = 'position: absolute; top: 12px; right: 80px; padding: 6px 16px; font-size: 0.8rem; background: rgba(220, 38, 38, 0.8); color: white; border-radius: 6px; backdrop-filter: blur(4px); cursor: pointer; border: none;';
          deleteBtn.textContent = 'Delete';
          deleteBtn.onclick = async () => {
            const confirmPass = await showConfirm("Delete Post", "Are you sure you want to delete this specific post?", true);
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
          card.appendChild(deleteBtn);

          const toggleTvBtn = document.createElement('button');
          toggleTvBtn.className = 'secondary-btn toggle-tv-btn';
          const isHidden = String(post.showOnTv).toLowerCase() === 'false';
          toggleTvBtn.textContent = isHidden ? 'Show on TV' : 'Hide from TV';
          const btnColor = isHidden ? 'rgba(34, 197, 94, 0.8)' : 'rgba(249, 115, 22, 0.8)';
          toggleTvBtn.style.cssText = `position: absolute; top: 12px; right: 155px; padding: 6px 16px; font-size: 0.8rem; background: ${btnColor}; color: white; border-radius: 6px; backdrop-filter: blur(4px); cursor: pointer; border: none;`;

          toggleTvBtn.onclick = async () => {
            const sessionData = sessionStorage.getItem('sas_user_data');
            if (!sessionData) return;
            const userObj = JSON.parse(sessionData);

            const msg = isHidden ? 'Are you sure you want to show this on TV?' : 'Are you sure you want to hide this from TV?';
            const confirmPass = await showConfirm("TV Visibility", msg, true);
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
              // fetchPosts will re-render anyway, so button text will be corrected
            }
          };
          card.appendChild(toggleTvBtn);
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
    var intervalMs = 7000;

    function next() {
      var nextIndex = (current + 1) % slides.length;
      setActive(nextIndex);
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
      const driveIframeEl = activeSlide.querySelector('iframe.drive-video-frame');

      // Handle CSS Theater Mode
      if ((videoEl || iframeEl || driveIframeEl) && tvTheaterEnabled) {
        document.body.classList.add('video-fullscreen-active');
      } else {
        document.body.classList.remove('video-fullscreen-active');
      }

      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.muted = !tvAudioEnabled;
        videoEl.play().catch(e => console.error('Video play prevented:', e));
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
              if (state === 0 || (duration > 0 && currentTime >= (duration - 1.5))) {
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
                event.target.playVideo();
                startYTPolling(event.target);
              },
              'onStateChange': function (event) {
                if (event.data === YT.PlayerState.ENDED) {
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
            player.seekTo(0);
            player.playVideo();
            startYTPolling(player);
          } catch (e) {
            console.warn('YT Player error on restart:', e);
          }
        }
        // Safety fallback
        start(300000);
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
