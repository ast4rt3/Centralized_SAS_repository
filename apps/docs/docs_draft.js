// Documents App — Draft Auto-Save (Simplest Possible)
// Stores upload form state per user in localStorage.
// Auto-saves on beforeunload, pre-fills on load, clears after upload.

(function () {
    const STORAGE_PREFIX = 'sas_docs_drafts_';

    function getStorageKey() {
        const user = window.docsState?.currentUser || 'Anonymous';
        return STORAGE_PREFIX + user;
    }

    function saveDraft() {
        const key = getStorageKey();
        const categoryEl = document.querySelector('#upload-form select[name="category"]');
        const publicEl = document.querySelector('#upload-form input[name="isPublic"]');
        const category = categoryEl ? categoryEl.value : '';
        const isPublic = publicEl ? publicEl.checked : false;
        localStorage.setItem(key, JSON.stringify({ category, isPublic }));
    }

    function loadDraft() {
        const key = getStorageKey();
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
            const { category, isPublic } = JSON.parse(raw);
            const categoryEl = document.querySelector('#upload-form select[name="category"]');
            const publicEl = document.querySelector('#upload-form input[name="isPublic"]');
            if (categoryEl && category) categoryEl.value = category;
            if (publicEl) publicEl.checked = isPublic;
        } catch (e) { /* ignore corrupt draft */ }
    }

    function clearDraft() {
        localStorage.removeItem(getStorageKey());
    }

    window.addEventListener('beforeunload', saveDraft);

    window.docsDraft = { saveDraft, loadDraft, clearDraft };

    document.addEventListener('change', (e) => {
        if (e.target.closest('#upload-modal')) saveDraft();
    });
})();