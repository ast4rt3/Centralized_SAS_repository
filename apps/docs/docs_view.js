// Documents App - View Layer
(function () {
    const STORAGE_PREFIX = 'sas_docs_view_';

    function getCurrentUser() {
        return window.docsState?.currentUser || 'Anonymous';
    }

    function saveViewState() {
        const key = STORAGE_PREFIX + getCurrentUser();
        const state = {
            filter: window.docsState?.currentFilter || 'all',
            viewMode: localStorage.getItem('docs_view_mode') || 'medium'
        };
        localStorage.setItem(key, JSON.stringify(state));
    }

    function loadViewState() {
        const key = STORAGE_PREFIX + getCurrentUser();
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
            const state = JSON.parse(raw);
            if (state.filter) {
                window.docsState.currentFilter = state.filter;
                window.docsSetFilter(state.filter);
            }
            if (state.viewMode) {
                localStorage.setItem('docs_view_mode', state.viewMode);
            }
        } catch (e) {}
    }

    function initViewListeners() {
        const viewMenuBtn = document.getElementById('view-menu-btn');
        const viewMenuDropdown = document.getElementById('view-menu-dropdown');
        const viewOptions = document.querySelectorAll('.view-option');
        const docsGrid = document.getElementById('docs-grid');

        if (viewMenuBtn && viewMenuDropdown) {
            viewMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewMenuDropdown.classList.toggle('show');
            });
        }

        document.addEventListener('click', () => {
            if (viewMenuDropdown) viewMenuDropdown.classList.remove('show');
        });

        viewOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.view;
                if (docsGrid) applyViewMode(mode);
                saveViewState();
                if (viewMenuDropdown) viewMenuDropdown.classList.remove('show');
            });
        });
    }

    function applyViewMode(mode) {
        const grid = document.getElementById('docs-grid');
        if (!grid) return;

        grid.classList.remove('list-view', 'small-grid', 'medium-grid', 'large-grid', 'xl-grid');

        if (mode === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.add(`${mode}-grid`);
        }

        localStorage.setItem('docs_view_mode', mode);
        updateViewActiveState(mode);
        updateViewLabel(mode);
    }

    function updateViewLabel(mode) {
        const label = document.getElementById('current-view-label');
        if (!label) return;
        const names = { 'xl': 'Extra Large', 'large': 'Large', 'medium': 'Medium', 'small': 'Small', 'list': 'List' };
        label.innerText = names[mode] || 'Medium';
    }

    function updateViewActiveState(mode) {
        const viewOptions = document.querySelectorAll('.view-option');
        viewOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.view === mode);
        });
    }

    window.docsView = {
        init: function () {
            loadViewState();
            initViewListeners();
        },
        applyViewMode: applyViewMode,
        saveViewState: saveViewState
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (window.docsView) {
        window.docsView.init();
    }
});