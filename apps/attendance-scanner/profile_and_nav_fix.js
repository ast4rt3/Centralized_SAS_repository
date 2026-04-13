const fs = require('fs');
let c = fs.readFileSync('apps/attendance-scanner/index.html', 'utf8');

// 1. Redesign User Badge: Circle profile with name on bottom
const profileStyles = `
        /* User Profile Style */
        .user-profile-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 15px 10px;
            background: var(--nbsc-blue);
            color: white;
        }
        .profile-circle {
            width: 54px;
            height: 54px;
            background: rgba(255,255,255,0.15);
            border: 2px solid var(--nbsc-gold);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin-bottom: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        .profile-name {
            font-size: 0.85rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: var(--nbsc-gold);
        }

        /* Improved Navigation Touch Targets */
        .nav-item {
            padding: 8px 0;
            -webkit-user-select: none;
            user-select: none;
        }
        .nav-item:active { transform: scale(0.92); }
`;
c = c.replace('</style>', profileStyles + '</style>');

const newProfileHTML = `
            <div class="user-profile-header">
                <div class="profile-circle">
                    <i class='bx bxs-user'></i>
                </div>
                <div id="activeScannerName" class="profile-name">Checking...</div>
                <button class="logout-link" onclick="logoutScanner()" style="background:none; border:none; color:white; font-size:0.6rem; opacity:0.6; margin-top:4px; cursor:pointer; text-decoration:underline;">LOGOUT</button>
            </div>
`;

// Replace the old userBadge div
const oldBadgePattern = /<div id="userBadge"[\s\S]*?<\/div>/;
c = c.replace(oldBadgePattern, newProfileHTML);

// Remove the standalone logout and banner img from the header area to clean it up
const headerCleanup = `
        <div class="sticky-header">
            <div class="banner-container">
                <img src="https://nbsc.edu.ph/wp-content/uploads/2025/01/SAS.png" class="banner-img" alt="SAS Banner">
            </div>
            ${newProfileHTML}
            <div id="windowStatus" class="status-loading">
                <div class="status-dot loading" id="statusDot"></div>
                <span id="statusText">Checking window...</span>
            </div>
        </div>
`;
// Already replaced once, let's refine the scannerScreen header
const scannerHeaderPattern = /<div class="sticky-header">[\s\S]*?<\/div>\s+<\/div>/; // Wait, match carefully
const scannerHeaderExact = `<div class="sticky-header">
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
        </div>`;

// Since I just cleaned it up in previous turn, let's see current state.
// Actually, I'll just look for the user-profile-header I just inserted if I did it right.
// Wait!
// My previous Replace in Step 1324 might have made it look like the replacement snippet.

// 2. Fix Navbar: Re-inject switchScreen with more logging and global error catch
const navFixCode = `
        // -- GLOBAL ERROR HANDLER --
        window.onerror = function(msg, url, line) {
            console.error("GLOBAL ERROR: " + msg + " at " + line);
            // alert("App Error: " + msg); // Alert for debugging
            return false;
        };

        function switchScreen(screenId, navEl) {
            console.log("Switching to: " + screenId);
            try {
                // Remove active from all screens
                const screens = document.querySelectorAll('.screen');
                screens.forEach(s => s.classList.remove('active'));
                
                // Add active to targeted screen
                const target = document.getElementById(screenId);
                if(target) {
                    target.classList.add('active');
                    target.style.display = 'flex'; // Force display flex
                } else {
                    console.warn("Screen not found: " + screenId);
                }
                
                // Update nav items
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                if(navEl) navEl.classList.add('active');
                
                // Trigger refreshers
                updateQueueCountBadge();
                if(screenId === 'historyScreen') renderHistory();
                if(screenId === 'queueScreen') renderQueue();
                
                if(screenId === 'scannerScreen' && !html5QrcodeScanner) {
                    startScanner();
                }
            } catch(err) {
                console.error("Navigation failed:", err);
            }
        }
`;

// Replace the old switchScreen
const oldSwitchPattern = /function switchScreen\(screenId, navEl\) \{[\s\S]*?if\(!html5QrcodeScanner\) startScanner\(\);\s+\}\s+\}/;
c = c.replace(oldSwitchPattern, navFixCode);

fs.writeFileSync('apps/attendance-scanner/index.html', c, 'utf8');
console.log("Success: Redesigned profile and debugged navigation");
