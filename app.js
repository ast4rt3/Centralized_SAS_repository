(function () {
  const navSystems = document.getElementById('nav-systems');
  const systemPages = document.getElementById('system-pages');
  const pageTitle = document.getElementById('page-title');
  const statSystems = document.getElementById('stat-systems');
  const homePage = document.getElementById('home');

  let systems = [];

  function setActiveNav(item) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (item) item.classList.add('active');
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = pageId === 'home' ? homePage : document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    const system = systems.find(s => s.id === pageId);
    pageTitle.textContent = system ? system.name : 'Home';
  }

  function renderNav() {
    navSystems.innerHTML = systems
      .map(
        (s) =>
          '<a href="' + (s.external ? s.url : '#' + s.id) + '" class="nav-item" data-page="' + s.id + '"' + (s.external ? ' target="_blank" rel="noopener"' : '') + '>' +
          '<span class="nav-icon">▣</span><span class="nav-label">' + escapeHtml(s.name) + '</span></a>'
      )
      .join('');

    navSystems.querySelectorAll('.nav-item').forEach(function (a) {
      if (a.getAttribute('target') !== '_blank') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          setActiveNav(this);
          showPage(this.getAttribute('data-page'));
        });
      } else {
        a.addEventListener('click', function () { setActiveNav(null); });
      }
    });
  }

  function renderSystemPages() {
    systemPages.innerHTML = systems
      .map(function (s) {
        var link = (s.url && s.url !== '#') ? '<a href="' + escapeHtml(s.url) + '" class="system-link-box"' + (s.external ? ' target="_blank" rel="noopener"' : '') + '>Open system →</a>' : '';
        var desc = s.description ? '<p class="system-desc">' + escapeHtml(s.description) + '</p>' : '';
        return '<section id="page-' + s.id + '" class="page system-page"><h2>' + escapeHtml(s.name) + '</h2>' + desc + link + '</section>';
      })
      .join('');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function init() {
    document.querySelector('.nav-item[data-page="home"]').addEventListener('click', function (e) {
      e.preventDefault();
      setActiveNav(this);
      showPage('home');
    });

    fetch('systems/config.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Config not found');
        return r.json();
      })
      .then(function (data) {
        systems = Array.isArray(data) ? data : (data.systems || []);
        statSystems.textContent = systems.length;
        renderNav();
        renderSystemPages();
        var hash = (window.location.hash || '#home').replace('#', '');
        if (hash && hash !== 'home') {
          var sys = systems.find(function (s) { return s.id === hash; });
          if (sys) {
            var el = document.querySelector('.nav-item[data-page="' + hash + '"]');
            if (el) { setActiveNav(el); showPage(hash); }
          }
        }
      })
      .catch(function () {
        systems = [];
        statSystems.textContent = '0';
        navSystems.innerHTML = '<span class="nav-section-label" style="padding: 0.5rem 1rem; color: var(--text-muted);">No systems loaded. Add systems/config.json</span>';
      });

  }

  init();
})();
