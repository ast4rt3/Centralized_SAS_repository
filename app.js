// REPLACE THIS WITH YOUR NEW SPREADSHEET DEPLOYMENT URL
const BACKEND_GAS_URL = "https://script.google.com/macros/s/AKfycbyj18L5_tHOfQeNnU-tH6nOf_gYgG5f_a51yM9nS6qgQONy-57Z1aON7_EerqN3sL4k/exec"; // <-- Update with new URL

// Load YouTube IFrame API
if (!window.YT) {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global TV Settings State
let tvAudioEnabled = false;
let tvTheaterEnabled = false;

document.addEventListener('DOMContentLoaded', () => {
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
            const sessionObj = { username: responseData.username, role: responseData.role };
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
    } else {
      document.body.classList.remove('tv-mode');
      tvSettingsBox.classList.add('hidden');
    }

    const displayName = userDisplayName;
    const dropName = userDropdownName;

    // Check if role is admin and format text
    const displayStr = userObj.username;
    let roleBadge = '';

    if (userObj.role === 'admin') {
      roleBadge = '<span style="background:var(--nbsc-gold); color:var(--nbsc-dark); padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">ADMIN</span>';
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

    // Admin check for "Add Post" button
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn && userObj.role === 'admin') {
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

      if (sizeSelect) {
        sizeSelect.addEventListener('change', () => {
          previewImg.style.objectFit = sizeSelect.value;
        });
      }

      let isDragging = false;
      let startX = 0, startY = 0;
      let initialPosX = 50, initialPosY = 50;

      previewContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const currentPos = posInput.value || '50% 50%';
        const parts = currentPos.split(' ');
        initialPosX = parseFloat(parts[0]) || 50;
        initialPosY = parseFloat(parts[1]) || 50;

        previewContainer.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const rect = previewContainer.getBoundingClientRect();

        const pctX = (deltaX / rect.width) * 100 * -1;
        const pctY = (deltaY / rect.height) * 100 * -1;

        let newX = Math.max(0, Math.min(100, initialPosX + pctX));
        let newY = Math.max(0, Math.min(100, initialPosY + pctY));

        const posStr = `${Math.round(newX)}% ${Math.round(newY)}%`;

        previewImg.style.objectPosition = posStr;
        posInput.value = posStr;
        coordsDisplay.textContent = posStr;
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

        if (previewGroup) previewGroup.style.display = 'none';
        if (posInput) posInput.value = '50% 50%';
        if (previewImg) previewImg.style.objectPosition = '50% 50%';
        if (coordsDisplay) coordsDisplay.textContent = '50% 50%';

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
        const img = document.getElementById('post-img').value;
        const imgPos = document.getElementById('post-img-pos') ? document.getElementById('post-img-pos').value : '50% 50%';
        const imgSize = document.getElementById('post-img-size') ? document.getElementById('post-img-size').value : 'cover';
        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;

        submitBtn.textContent = "Saving...";
        submitBtn.disabled = true;
        if (errorMsg) errorMsg.classList.add('hidden');

        try {
          const userObj = JSON.parse(sessionData);
          const confirmPass = prompt("Please re-enter your admin password to confirm this action:");
          if (!confirmPass) {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
            return;
          }

          const editTimestamp = form.getAttribute('data-edit-timestamp');
          const isEdit = !!editTimestamp;

          const payload = {
            action: isEdit ? "editPost" : "addPost",
            username: userObj.username,
            password: confirmPass,
            title: title,
            description: desc,
            imageUrl: img,
            imagePosition: imgPos,
            imageSize: imgSize
          };

          if (isEdit) {
            payload.timestamp = editTimestamp;
          }

          const r = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          const responseData = await r.json();
          if (responseData.success) {
            modal.classList.add('hidden');
            form.reset();
            fetchPosts(); // Refresh the feed
          } else {
            if (errorMsg) {
              errorMsg.textContent = responseData.message || "Failed to post.";
              errorMsg.classList.remove('hidden');
            }
          }
        } catch (err) {
          if (errorMsg) {
            errorMsg.textContent = "Network error. Could not post.";
            errorMsg.classList.remove('hidden');
          }
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

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          const objPos = post.imagePosition || 'center';
          const objSize = post.imageSize || 'cover';
          const urlLower = post.imageUrl.toLowerCase();
          const ytId = getYouTubeVideoId(post.imageUrl);

          if (ytId) {
            imgHtml = `
              <img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" class="home-news-image-blur" style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(40px); opacity: 0.5; z-index: 0; pointer-events: none;" aria-hidden="true" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'">
              <iframe id="ytplayer-${post.timestamp}" src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&enablejsapi=1" class="home-news-image yt-video-frame" style="position: relative; z-index: 1; border: none; width: 100%; height: 100%; object-position: ${objPos}; object-fit: ${objSize};" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            `;
          } else if (urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')) {
            imgHtml = `
              <video src="${post.imageUrl}" class="home-news-image-blur" style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(40px); opacity: 0.5; z-index: 0; pointer-events: none;" autoplay muted playsinline></video>
              <video src="${post.imageUrl}" class="home-news-image" style="position: relative; z-index: 1; object-position: ${objPos}; object-fit: ${objSize};" autoplay muted playsinline></video>
            `;
          } else {
            imgHtml = `
              <img src="${post.imageUrl}" class="home-news-image-blur" style="position: absolute; top: -10%; left: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(40px); opacity: 0.5; z-index: 0; pointer-events: none;" aria-hidden="true" loading="lazy">
              <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="home-news-image" style="position: relative; z-index: 1; object-position: ${objPos}; object-fit: ${objSize};" loading="lazy">
            `;
          }
        } else {
          imgHtml = `<div class="home-news-image" style="background:var(--nbsc-dark); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px; text-align: center;"><img src="https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png" style="height:60px; margin-bottom:10px; opacity:0.3"></div>`;
        }

        slide.innerHTML = `
        <div class="home-news-image-wrap">
          ${imgHtml}
        </div>
        <div class="home-news-ticker">
          <div class="ticker-wrap">
            <div class="ticker-content">
              <span class="ticker-title">${escapeHtml(post.title)}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
              <span class="ticker-desc">${escapeHtml(post.description)}</span>
            </div>
            <div class="ticker-content" aria-hidden="true">
              <span class="ticker-title">${escapeHtml(post.title)}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
              <span class="ticker-desc">${escapeHtml(post.description)}</span>
            </div>
          </div>
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

      container.appendChild(track);
      if (posts.length > 1) {
        container.appendChild(dotsContainer);
      }

      initCarousel(container);
    } else {
      // Build Standard Vertical Card Feed for Admins & Users
      posts.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.style.position = 'relative';

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          const objPos = post.imagePosition || 'center';
          const objSize = post.imageSize || 'cover';
          const urlLower = post.imageUrl.toLowerCase();
          const ytId = getYouTubeVideoId(post.imageUrl);

          if (ytId) {
            imgHtml = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=0&mute=1&loop=1&playlist=${ytId}&controls=1" class="post-image" style="border: none; object-position: ${objPos}; object-fit: ${objSize};" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
          } else if (urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')) {
            imgHtml = `<video src="${post.imageUrl}" class="post-image" style="object-position: ${objPos}; object-fit: ${objSize};" autoplay muted loop playsinline></video>`;
          } else {
            imgHtml = `<img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="object-position: ${objPos}; object-fit: ${objSize};" loading="lazy">`;
          }
        }

        card.innerHTML = `
          ${imgHtml}
          <div class="post-content">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-desc">${escapeHtml(post.description)}</p>
          </div>
        `;

        if (role === 'admin') {
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
              const previewImg = document.getElementById('post-preview-img');
              const coordsDisplay = document.getElementById('post-preview-coords');
              if (previewImg) previewImg.style.objectPosition = p;
              if (coordsDisplay) coordsDisplay.textContent = p;
            }

            const sizeSelect = document.getElementById('post-img-size');
            if (sizeSelect) {
              sizeSelect.value = post.imageSize || 'cover';
              sizeSelect.dispatchEvent(new Event('change'));
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
            const confirmAction = confirm("Are you sure you want to delete this specific post?");
            if (!confirmAction) return;

            const sessionData = sessionStorage.getItem('sas_user_data');
            if (!sessionData) return;

            const userObj = JSON.parse(sessionData);
            const confirmPass = prompt("Please enter your admin password to confirm deletion:");
            if (!confirmPass) return;

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
                fetchPosts(); // Refresh UI instantly
              } else {
                alert(responseData.message || "Failed to delete post.");
              }
            } catch (e) {
              alert("Network error. Could not delete post.");
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

            const confirmPass = prompt(`Please enter your admin password to ${isHidden ? 'show this on TV' : 'hide this from TV'}:`);
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
                fetchPosts(); // Refresh UI instantly
              } else {
                alert(responseData.message || "Failed to toggle visibility.");
              }
            } catch (e) {
              alert("Network error. Could not toggle visibility.");
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

  let ytPlayers = {}; // Global store for YT players

  function initCarousel(container) {
    var slides = Array.prototype.slice.call(container.querySelectorAll('.home-news-slide'));
    var dots = Array.prototype.slice.call(container.querySelectorAll('.home-news-dot'));
    if (!slides.length) return;

    var current = 0;
    var intervalMs = 7000;
    var timer;

    function next() {
      var nextIndex = (current + 1) % slides.length;
      setActive(nextIndex);
    }

    function setActive(index) {
      slides.forEach(function (s, i) {
        if (i === index) s.classList.add('is-active');
        else s.classList.remove('is-active');
      });
      dots.forEach(function (d, i) {
        if (i === index) d.classList.add('is-active');
        else d.classList.remove('is-active');
      });
      current = index;

      // Check for video auto-advance logic
      stop(); // Stop the standard interval timer

      const activeSlide = slides[index];
      const videoEl = activeSlide.querySelector('video.home-news-image');
      const iframeEl = activeSlide.querySelector('iframe.home-news-image');

      // Handle CSS Theater Mode
      if ((videoEl || iframeEl) && tvTheaterEnabled) {
        document.body.classList.add('video-fullscreen-active');
      } else {
        document.body.classList.remove('video-fullscreen-active');
      }

      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.muted = !tvAudioEnabled;
        videoEl.play().catch(e => console.error("Video play prevented:", e));
        videoEl.onended = function () {
          if (slides.length > 1) next();
        };
      } else if (iframeEl && window.YT && window.YT.Player) {
        const iframeId = iframeEl.id;
        if (!ytPlayers[iframeId]) {
          ytPlayers[iframeId] = new YT.Player(iframeId, {
            events: {
              'onReady': function (event) {
                if (tvAudioEnabled) event.target.unMute();
                else event.target.mute();
                event.target.playVideo();
              },
              'onStateChange': function (event) {
                // When video naturally ends (State 0), go to next slide
                if (event.data === YT.PlayerState.ENDED) {
                  if (slides.length > 1) next();
                }
              }
            }
          });
        } else {
          try {
            if (tvAudioEnabled) ytPlayers[iframeId].unMute();
            else ytPlayers[iframeId].mute();
            ytPlayers[iframeId].seekTo(0);
            ytPlayers[iframeId].playVideo();
          } catch (e) {
            console.warn("YT Player not fully ready yet.");
          }
        }
      } else {
        // Standard static image slide
        start();
      }
    }

    function start() {
      stop();
      if (slides.length > 1) {
        timer = window.setInterval(next, intervalMs);
      }
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
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
