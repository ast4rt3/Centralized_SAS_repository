// REPLACE THIS WITH YOUR NEW SPREADSHEET DEPLOYMENT URL
const BACKEND_GAS_URL = "https://script.google.com/macros/s/AKfycbw_oXLQzYrXgQ5NorparafTXZSNdUDFkvsAUjjAcCc1mJZAlooP1BPIeMvFiclGM2VwsA/exec";

(function () {
  const navDynamic = document.getElementById('nav-dynamic');
  const statSystems = document.getElementById('stat-systems');
  const homePage = document.getElementById('home');
  const loadingPage = document.getElementById('loading');
  const systemViewPage = document.getElementById('system-view');
  const systemFrame = document.getElementById('system-frame');
  const sidebar = document.querySelector('.sidebar');
  const navToggle = document.getElementById('nav-toggle');
  const navOverlay = document.getElementById('nav-overlay');

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

  function init() {
    // Basic Session Management
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Check if user is already logged in
    const sessionData = sessionStorage.getItem('sas_user_data');
    if (!sessionData) {
      // Must authenticate
      document.body.classList.remove('system-mode');
      if (loginOverlay) loginOverlay.classList.remove('hidden');
      if (navToggle) navToggle.hidden = true;
    } else {
      // Already authenticated
      const userObj = JSON.parse(sessionData);

      if (loginOverlay) loginOverlay.classList.add('hidden');
      if (navToggle) navToggle.hidden = false;
      setupUserMenu(userObj);
      finishInit();
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

              loginOverlay.classList.add('hidden');
              if (navToggle) navToggle.hidden = false;
              setupUserMenu(sessionObj);
              finishInit();
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
    const displayName = document.getElementById('user-display-name');
    const dropName = document.getElementById('user-dropdown-name');

    // Check if role is admin and format text
    const displayStr = userObj.username;
    const roleBadge = userObj.role === 'admin' ? '<span style="background:var(--nbsc-gold); color:var(--nbsc-dark); padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">ADMIN</span>' : '';

    if (displayName) displayName.innerHTML = displayStr;
    if (dropName) dropName.innerHTML = `${displayStr} ${roleBadge}`;

    const userMenu = document.getElementById('user-menu');
    const userBtn = document.getElementById('user-menu-btn');
    const logoutBtn = document.getElementById('logout-btn');

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

    if (addPostBtn && modal) {
      addPostBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (errorMsg) errorMsg.classList.add('hidden');
      });

      cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset();
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
        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;

        submitBtn.textContent = "Posting...";
        submitBtn.disabled = true;
        if (errorMsg) errorMsg.classList.add('hidden');

        try {
          const userObj = JSON.parse(sessionData);
          const confirmPass = prompt("Please re-enter your admin password to confirm this post:");
          if (!confirmPass) {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
            return;
          }

          const payload = {
            action: "addPost",
            username: userObj.username,
            password: confirmPass,
            title: title,
            description: desc,
            imageUrl: img
          };

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
        renderPosts(data.posts, container);
        container.className = 'home-news'; // Override container grid settings to fit carousel
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

  function renderPosts(posts, container) {
    container.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'home-news-track';

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'home-news-dots';
    dotsContainer.setAttribute('role', 'tablist');

    posts.forEach((post, index) => {
      const slide = document.createElement('article');
      slide.className = 'home-news-slide' + (index === 0 ? ' is-active' : '');
      slide.setAttribute('data-index', index);

      let imgHtml = '';
      if (post.imageUrl && post.imageUrl.trim() !== '') {
        imgHtml = `<img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="home-news-image" loading="lazy">`;
      } else {
        imgHtml = `<div class="home-news-image" style="background:var(--nbsc-dark); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px; text-align: center;"><img src="https://nbsc.edu.ph/wp-content/uploads/2024/03/cropped-NBSC_NewLogo_icon.png" style="height:60px; margin-bottom:10px; opacity:0.3"></div>`;
      }

      slide.innerHTML = `
        <div class="home-news-image-wrap">
          ${imgHtml}
        </div>
        <div class="home-news-caption">
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.description)}</p>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px">${escapeHtml(post.timestamp)}</div>
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
  }

  function initCarousel(container) {
    var slides = Array.prototype.slice.call(container.querySelectorAll('.home-news-slide'));
    var dots = Array.prototype.slice.call(container.querySelectorAll('.home-news-dot'));
    if (!slides.length) return;

    var current = 0;
    var intervalMs = 7000;
    var timer;

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
    }

    function next() {
      var nextIndex = (current + 1) % slides.length;
      setActive(nextIndex);
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

  init();
})();
