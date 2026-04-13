const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// 1. Clean up the corrupted section between logoutBtn and initPostSetup
const startMarker = 'if (logoutBtn) {';
const endMarker = 'function initPostSetup() {';

const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);

const cleanSection = `
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies if any
        document.cookie.split(";").forEach((cookie) => {
          document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = window.location.pathname + "#home";
        window.location.reload();
      });
    }

    // Admin/Uploader/Superadmin check for "Add Post" button
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn && userObj && (userObj.role === 'admin' || userObj.role === 'uploader' || userObj.role === 'superadmin')) {
      addPostBtn.classList.remove('hidden');
    }

    // Superadmin-only: Clear Cache/Data button
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn && userObj && userObj.role === 'superadmin') {
      clearCacheBtn.classList.remove('hidden');
      clearCacheBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
          "System Data Reset",
          "This will clear all browser storage (cache, local data, and session). You will be logged out. Continue?"
        );
        if (confirmed) {
          localStorage.clear();
          sessionStorage.clear();
          showToast("All data cleared. Refreshing...", "success");
          setTimeout(() => window.location.reload(), 1000);
        }
      });
    }
  }
`;

if (startIdx !== -1 && endIdx !== -1) {
    c = c.slice(0, startIdx) + cleanSection + '\n\n  ' + c.slice(endIdx);
}

fs.writeFileSync('app.js', c, 'utf8');
console.log("Success: Cleaned up the corrupted logout/cache-clear section");
