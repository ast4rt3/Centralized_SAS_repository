const fs = require('fs');
const filePath = 'l:/SAS/Centralized_SAS_repository/apps/attendance-scanner/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the duplicated/corrupted block in the middle
// It looks like:
// 732:             <span id="modal-icon">✅</span>
// 733: </head>
// 734: 
// 735: <body>
// 736:     <div id="syncModal">

const corruptedStart = '<span id="modal-icon">✅</span>\n</head>';
const corruptedEnd = '<body>\n    <div id="syncModal">';

content = content.replace(corruptedStart + '\n\n' + corruptedEnd, '');

// 2. Add the button correctly
const homeContentEnd = '<button class="logout-btn-home" onclick="logoutScanner()">Logout from Portal</button>';
const superRefreshBtn = '\n            <button class="home-secondary-btn" onclick="superRefresh()" style="border-color: rgba(220,53,69,0.5); color: #ff8e98; font-size: 9px; opacity: 0.8;">🚨 CLEAR ALL SITE DATA & CACHE</button>';

if (content.indexOf('superRefresh()') === -1) {
    content = content.replace(homeContentEnd, homeContentEnd + '\n            <br>' + superRefreshBtn);
}

// 3. Ensure the Javascript part is clean
const swRegister = "// PWA: register service worker for install & offline";
const superRefreshLogic = `        async function superRefresh() {
            if(!confirm("This will delete ALL local storage, history, and app cache. Your offline queue will be lost. Proceed?")) return;
            
            // Clear Storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let reg of registrations) { await reg.unregister(); }
            }
            
            // Clear Cache API
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            
            // Force reload
            window.location.reload(true);
        }

        `;

if (content.indexOf('async function superRefresh()') === -1) {
    content = content.replace(swRegister, superRefreshLogic + swRegister);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Cleaned up and updated index.html");
