const fs = require('fs');
let c = fs.readFileSync('apps/attendance-scanner/index.html', 'utf8');

// 1. Update Head: Add BoxIcons and modern styles
const extraStyles = `
    <style>
        /* Mobile Navigation */
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            display: flex;
            justify-content: space-around;
            padding: 12px 10px 24px 10px;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
            z-index: 1000;
            border-top: 1px solid #f1f5f9;
        }
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
        }
        .nav-item i { font-size: 1.4rem; }
        .nav-item span { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .nav-item.active { color: var(--nbsc-blue); }
        .nav-item.active i { transform: translateY(-2px); }

        /* Screen Management */
        .screen {
            display: none;
            flex-direction: column;
            min-height: 100dvh;
            padding-bottom: 90px;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .screen.active { display: flex; }

        /* List Styling */
        .data-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .data-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: var(--nbsc-blue);
        }
        .data-info { flex: 1; }
        .data-title { font-size: 0.9rem; font-weight: 700; color: var(--nbsc-dark); }
        .data-sub { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
        .data-time { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
        }
        .empty-state i { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

        /* Banner tweaks for mobile */
        .sticky-header {
            position: sticky;
            top: 0;
            z-index: 999;
            background: white;
        }
    </style>
`;
c = c.replace('</head>', extraStyles + '</head>');

// 2. Wrap screens and add New Screens
const screensChange = `
    <div id="scannerScreen" class="screen active">
        <div class="sticky-header">
            <div class="banner-container">
                <button class="logout-btn-scanner" onclick="logoutScanner()"><i class='bx bx-log-out'></i> Logout</button>
                <img src="https://nbsc.edu.ph/wp-content/uploads/2025/01/SAS.png" class="banner-img" alt="SAS Banner">
                <div id="userBadge" style="text-align:center; padding: 4px; font-size:0.75rem; color:var(--text-muted); background:rgba(0,0,0,0.05); font-weight:700;">
                    <i class='bx bx-user'></i> <span id="activeScannerName">Checking...</span>
                </div>
            </div>
            <div id="windowStatus" class="status-loading">
                <div class="status-dot loading" id="statusDot"></div>
                <span id="statusText">Checking window...</span>
            </div>
        </div>

        <div class="scanner-content">
            <div class="qr-wrapper">
                <div id="reader"></div>
            </div>
            <div id="manual-entry">
                <div class="manual-card">
                    <div class="manual-label">Manual Entry</div>
                    <input type="text" id="tokenInput" class="token-input" placeholder="Enter Token Manually">
                    <button class="submit-token-btn" onclick="submitManualToken()">Submit Token</button>
                </div>
            </div>
            <div id="result"></div>
        </div>
    </div>

    <div id="historyScreen" class="screen">
        <div class="banner-container">
            <div style="padding: 20px; color: white;">
                <h2 style="font-weight: 800; text-transform: uppercase; font-size: 1.2rem;">Recent Scans</h2>
                <p style="font-size: 0.7rem; opacity: 0.8;">YOUR LAST 20 ACTIVITY</p>
            </div>
        </div>
        <div class="scanner-content" id="historyList">
            <!-- Dynamic History -->
        </div>
    </div>

    <div id="queueScreen" class="screen">
        <div class="banner-container">
            <div style="padding: 20px; color: white; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="font-weight: 800; text-transform: uppercase; font-size: 1.2rem;">Offline Queue</h2>
                    <p style="font-size: 0.7rem; opacity: 0.8;">PENDING DATABASE SYNC</p>
                </div>
                <button onclick="syncOfflineData()" class="sync-btn-main" style="background: var(--nbsc-gold); color: black; border-radius: 30px;">
                    <i class='bx bx-sync'></i> Sync All
                </button>
            </div>
        </div>
        <div class="scanner-content" id="queueList">
            <!-- Dynamic Queue -->
        </div>
    </div>

    <nav class="bottom-nav">
        <div class="nav-item active" onclick="switchScreen('scannerScreen', this)">
            <i class='bx bx-qr-scan'></i>
            <span>Scanner</span>
        </div>
        <div class="nav-item" onclick="switchScreen('historyScreen', this)">
            <i class='bx bx-history'></i>
            <span>History</span>
        </div>
        <div class="nav-item" onclick="switchScreen('queueScreen', this)">
            <i class='bx bx-cloud-upload'></i>
            <span id="queueCountLabel">Queue</span>
        </div>
    </nav>
`;

// Replace current scannerScreen
const oldScannerPattern = /<div id="scannerScreen">[\s\S]*?<\/div>[\s]+(\r?\n)[\s]+<div id="windowStatus"[\s\S]*?<\/div>[\s\S]*?<div class="scanner-content">[\s\S]*?<\/div>[\s\S]*?<\/div>/;
// Wait, the regex is complex. Let's do a more targetted replace.
c = c.replace('<div id="scannerScreen">', '<div id="oldScannerContainer" style="display:none">'); // Hide old one first

// Insert new stuff before </body>
c = c.replace('</body>', screensChange + '</body>');

// 3. Logic Improvements
const logicUpdate = `
        // --- SCREEN NAVIGATION ---
        function switchScreen(screenId, navEl) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            if(navEl) navEl.classList.add('active');

            if(screenId === 'historyScreen') renderHistory();
            if(screenId === 'queueScreen') renderQueue();
            
            // Re-sync scanner if needed
            if(screenId === 'scannerScreen') {
                if(!html5QrcodeScanner) startScanner();
            }
        }

        // --- LOCAL HISTORY TRACKER ---
        function addToHistory(scannedID, status, message) {
            let history = JSON.parse(localStorage.getItem('scan_history') || '[]');
            history.unshift({
                id: scannedID,
                status: status,
                msg: message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            localStorage.setItem('scan_history', JSON.stringify(history.slice(0, 20)));
        }

        function renderHistory() {
            const list = document.getElementById('historyList');
            const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
            
            if (history.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="bx bx-history"></i><p>No recent scans yet</p></div>';
                return;
            }

            list.innerHTML = history.map(item => \`
                <div class="data-card">
                    <div class="data-icon" style="background: \${item.status === 'success' ? '#d1fae5' : '#fee2e2'}; color: \${item.status === 'success' ? '#059669' : '#dc2626'}">
                        <i class='bx \${item.status === 'success' ? 'bx-check-circle' : 'bx-error-circle'}'></i>
                    </div>
                    <div class="data-info">
                        <div class="data-title">\${item.id}</div>
                        <div class="data-sub">\${item.msg}</div>
                    </div>
                    <div class="data-time">\${item.time}</div>
                </div>
            \`).join('');
        }

        function renderQueue() {
            const list = document.getElementById('queueList');
            const queue = JSON.parse(localStorage.getItem('offlineScans') || '[]');
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
        }

        function deleteOfflineItem(index) {
            let queue = JSON.parse(localStorage.getItem('offlineScans') || '[]');
            queue.splice(index, 1);
            localStorage.setItem('offlineScans', JSON.stringify(queue));
            renderQueue();
            updateQueueCountBadge();
        }

        function updateQueueCountBadge() {
            const queue = JSON.parse(localStorage.getItem('offlineScans') || '[]');
            const label = document.getElementById('queueCountLabel');
            if(label) label.innerText = queue.length > 0 ? \`Queue (\${queue.length})\` : 'Queue';
        }
`;

// Insert the logic functions
c = c.replace('// --- NAVIGATION ---', logicUpdate + '// --- NAVIGATION ---');

// 4. Hook into processToken to record history
const processTokenHistoryHook = "showResult(res.status, res.message, scannedID);\r\n                addToHistory(scannedID, res.status, res.message);";
c = c.replace("showResult(res.status, res.message, scannedID);", processTokenHistoryHook);

// Hook into saveOffline to record history
const saveOfflineHistoryHook = "saveOfflineScan(scannedID);\r\n            addToHistory(scannedID, 'warning', 'Stored Offline (Pending Sync)');\r\n            updateQueueCountBadge();";
c = c.replace("saveOfflineScan(scannedID);", saveOfflineHistoryHook);

// Remove the old "Offline Notice" bar from the scanner screen since it's now in the Nav/Queue screen
c = c.replace(/<div id="offline-status"[\s\S]*?<\/div>/, '');

fs.writeFileSync('apps/attendance-scanner/index.html', c, 'utf8');
console.log("Success: Implemented Mobile Nav, History, and Queue screens");
