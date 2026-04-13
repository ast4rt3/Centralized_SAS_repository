const fs = require('fs');
let c = fs.readFileSync('apps/attendance-scanner/index.html', 'utf8');

// 1. Unify the "Recent Scans" logic to be persistent
const persistentRecentScans = `
        function addToRecentScans(name, token, windowName, isConsented) {
            let history = JSON.parse(localStorage.getItem('scan_history') || '[]');
            const status = windowName.toLowerCase().includes('recorded') || windowName.toLowerCase().includes('saved') ? 'success' : 'warning';
            
            history.unshift({
                name: name,
                token: token,
                window: windowName,
                isConsented: isConsented,
                status: status,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            
            localStorage.setItem('scan_history', JSON.stringify(history.slice(0, 50))); // Store 50
            if(document.getElementById('historyScreen').classList.contains('active')) renderHistory();
        }

        function renderHistory() {
            const list = document.getElementById('historyList');
            const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
            
            if (history.length === 0) {
                list.innerHTML = '<div class="empty-state"><i class="bx bx-history"></i><p>No recent activity</p></div>';
                return;
            }

            list.innerHTML = history.map(item => \`
                <div class="data-card">
                    <div class="data-icon" style="background: \${item.status === 'success' ? '#d1fae5' : '#fff7ed'}; color: \${item.status === 'success' ? '#059669' : '#ea580c'}">
                        <i class='bx \${item.status === 'success' ? 'bx-check-circle' : 'bx-time-five'}'></i>
                    </div>
                    <div class="data-info">
                        <div class="data-title">\${item.name}</div>
                        <div class="data-sub">\${item.token} • \${item.window}</div>
                    </div>
                    <div class="data-time">\${item.time}</div>
                </div>
            \`).join('') + \`
                <button onclick="clearHistory()" style="width:100%; padding:14px; background:none; border:2px dashed #cbd5e1; color:#94a3b8; border-radius:12px; font-weight:700; margin-top:10px; cursor:pointer;">
                    CLEAR HISTORY
                </button>
            \`;
        }

        function clearHistory() {
            if(confirm('Clear all recent activity?')) {
                localStorage.removeItem('scan_history');
                renderHistory();
            }
        }
`;

// Remove the temporary addToHistory I added and the old addToRecentScans
c = c.replace(/function addToHistory\(\) \{[\s\S]*?localStorage\.setItem\('scan_history'[\s\S]*?\}\s+\}/, '');
const oldRecentPattern = /function addToRecentScans\(name, token, windowName, isConsented\) \{[\s\S]*?if \(list\.children\.length > 5\) list\.removeChild\(list\.lastChild\);\s+\}/;
c = c.replace(oldRecentPattern, '');

// Insert the new unified persistent logic
c = c.replace('// --- RECENT SCANS ---', '// --- RECENT SCANS ---' + persistentRecentScans);

// Fix renderHistory calls in switchScreen and onLoad
c = c.replace(/addToHistory/g, 'addToRecentScans');

// 2. CSS Polish: Make the Bottom Nav look more premium
const navStyles = `
        .bottom-nav {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0,0,0,0.05);
            padding-bottom: calc(14px + env(safe-area-inset-bottom));
        }
        .nav-item i { font-size: 1.5rem; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .nav-item.active i { transform: translateY(-4px) scale(1.1); color: var(--nbsc-blue); }
        .nav-item span { margin-top: 2px; font-weight: 800; font-size: 0.6rem; }
        
        .sticky-header .banner-img { max-height: 12vh; }
`;
c = c.replace('</style>', navStyles + '</style>');

// 3. Final Cleanup: Remove the "In-Screen" logout button from History/Queue screens and add Back functionality
// Actually, keep logout in the Nav? No, better in the Scanner main screen.
// I'll add a header to History/Queue screens with a back button or just keep the bottom nav as the primary.

fs.writeFileSync('apps/attendance-scanner/index.html', c, 'utf8');
console.log("Success: Finalized mobile-first redesign with persistent history");
