const fs = require('fs');
const filePath = 'l:/SAS/Centralized_SAS_repository/apps/attendance-scanner/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted block:
// 731:         <div class="modal-content">
// 732:             <span id="modal-icon">✅</span>
// 733: </head>
// 734: 
// 735: <body>
// 736:     <div id="syncModal">
// 737:         <div class="modal-content">

const lines = content.split(/\r?\n/);
let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<span id="modal-icon">✅</span>') && lines[i+1]?.includes('</head>')) {
        start = i;
    }
    if (start !== -1 && lines[i].includes('<div id="syncModal">') && lines[i+1]?.includes('<div class="modal-content">')) {
        end = i;
        break;
    }
}

if (start !== -1 && end !== -1) {
    console.log(`Removing lines ${start + 1} to ${end}`);
    lines.splice(start, end - start);
}

// Ensure the button is there
const buttonSearch = 'Logout from Portal</button>';
const superBtn = '<button class="home-secondary-btn" onclick="superRefresh()" style="border-color: rgba(220,53,69,0.5); color: #ff8e98; font-size: 9px; opacity: 0.8;">🚨 CLEAR ALL SITE DATA & CACHE</button>';

let foundButton = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('superRefresh()')) {
        foundButton = true;
        break;
    }
}

if (!foundButton) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(buttonSearch)) {
            lines.splice(i + 1, 0, '            <br>', '            ' + superBtn);
            break;
        }
    }
}

// Ensure the logic is there
let foundLogic = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function superRefresh()')) {
        foundLogic = true;
        break;
    }
}

if (!foundLogic) {
    const swLine = '// PWA: register service worker';
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(swLine)) {
            lines.splice(i, 0, 
                '        async function superRefresh() {',
                '            if(!confirm("This will delete ALL local storage, history, and app cache. Your offline queue will be lost. Proceed?")) return;',
                '            localStorage.clear();',
                '            sessionStorage.clear();',
                '            if (\'serviceWorker\' in navigator) {',
                '                const registrations = await navigator.serviceWorker.getRegistrations();',
                '                for (let reg of registrations) { await reg.unregister(); }',
                '            }',
                '            if (\'caches\' in window) {',
                '                const keys = await caches.keys();',
                '                await Promise.all(keys.map(k => caches.delete(k)));',
                '            }',
                '            window.location.reload(true);',
                '        }',
                ''
            );
            break;
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log("Cleanup complete.");
