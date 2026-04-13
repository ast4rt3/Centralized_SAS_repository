const fs = require('fs');
let c = fs.readFileSync('apps/attendance-scanner/index.html', 'utf8');

// 1. Unify localStorage keys to nbsc_offline_scans
c = c.replace(/localStorage\.getItem\('offlineScans'\)/g, "localStorage.getItem('nbsc_offline_scans')");
c = c.replace(/localStorage\.setItem\('offlineScans'/g, "localStorage.setItem('nbsc_offline_scans'");

// 2. Fix the Queue mapping in renderQueue (it needs to handle the object structure of nbsc_offline_scans)
const newRenderQueue = `
        function renderQueue() {
            const list = document.getElementById('queueList');
            const queue = JSON.parse(localStorage.getItem('nbsc_offline_scans') || '[]');
            updateQueueCountBadge();

            if (queue.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="bx bx-cloud-off"></i><p>Offline queue is empty</p></div>';
                return;
            }

            list.innerHTML = queue.map((item, index) => \`
                <div class="data-card">
                    <div class="data-icon" style="background: \${item.isFlagged ? '#fee2e2' : '#f1f5f9'}; color: \${item.isFlagged ? '#dc2626' : 'var(--nbsc-blue)'}">
                        <i class='bx \${item.isFlagged ? 'bx-flag' : 'bx-barcode-reader'}'></i>
                    </div>
                    <div class="data-info">
                        <div class="data-title">\${item.code}</div>
                        <div class="data-sub">\${item.isFlagged ? 'Flag: ' + item.reason : 'Pending Sync'}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <div class="data-time">\${new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        <button onclick="deleteOfflineItem(\${index})" style="background:none; border:none; color:#dc2626; font-size:1.1rem; cursor:pointer; padding:5px;">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            \`).join('');
        }
`;

// Replace renderQueue
const renderQueuePattern = /function renderQueue\(\) \{[\s\S]*?\}\s+\}/; // Error in regex likely
// Let's use simpler search/replace
const oldRenderQueueStart = 'function renderQueue() {';
const oldRenderQueueEnd = "}).join('');\r\n        }";

if(c.includes(oldRenderQueueStart)) {
    // Find matching closing brace is hard with regex, let's just replace the whole block I know is there
    const startIdx = c.indexOf(oldRenderQueueStart);
    const endIdx = c.indexOf("}).join('');", startIdx) + 14; // include the rest
    // This is risky. Let's just use the unique whole function string.
}

// Better way: use the exact output from earlier
const exactFunc = `function renderQueue() {
            const list = document.getElementById('queueList');
            const queue = JSON.parse(localStorage.getItem('nbsc_offline_scans') || '[]');
            const label = document.getElementById('queueCountLabel');
            if(label) label.innerText = queue.length > 0 ? \`Queue (\${queue.length})\` : 'Queue';

            if (queue.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="bx bx-cloud-off"></i><p>Offline queue is empty</p></div>';
                return;
            }

            list.innerHTML = queue.map((item, index) => \`
                <div class="data-card">
                    <div class="data-icon"><i class='bx bx-barcode-reader'></i></div>
                    <div class="data-info">
                        <div class="data-title">\${item.scannedID}</div>
                        <div class="data-sub">Waiting for internet connection...</div>
                    </div>
                    <button onclick="deleteOfflineItem(\${index})" style="background:none; border:none; color:#dc2626; font-size:1.2rem; cursor:pointer;">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            \`).join('');
        }`;

if(c.includes(exactFunc)) {
    c = c.replace(exactFunc, newRenderQueue);
} else {
    // try with \n only
    const exactFuncN = exactFunc.replace(/\r/g, '');
    c = c.replace(exactFuncN, newRenderQueue);
}

// 3. Initialize History and Queue badge on load
const onLoadHook = "updateQueueCountBadge();\n            renderHistory();";
c = c.replace("// --- ON LOAD ---", "// --- ON LOAD ---\n            " + onLoadHook);

// 4. Update switchScreen to also update badge count
c = c.replace("if(navEl) navEl.classList.add('active');", "if(navEl) navEl.classList.add('active');\n            updateQueueCountBadge();");

// 5. Hide the old "In-Screen" scanner UI elements that are duplicated
c = c.replace('<div id="oldScannerContainer" style="display:none">', '<div style="display:none">');

fs.writeFileSync('apps/attendance-scanner/index.html', c, 'utf8');
console.log("Success: Unified queue data and improved mobile navigation experience");
