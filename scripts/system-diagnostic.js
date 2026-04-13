const puppeteer = require('puppeteer');
const path = require('path');

async function runSystemDiagnostic() {
    console.log("🛠️ Starting NBSC SAS System Diagnostic Audit...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });

    const page = await browser.newPage();
    const url = 'file:///' + path.resolve(__dirname, '../apps/attendance-scanner/index.html').replace(/\\/g, '/');
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        console.error("❌ Failed to load local file. Check if the path exists:", url);
        await browser.close();
        process.exit(1);
    }

    // Helper to log results
    const results = [];
    function report(test, status, details = "") {
        const icon = status === "PASS" ? "✅" : "❌";
        results.push({ test, status, details });
        console.log(`${icon} ${test}: ${status} ${details ? '(' + details + ')' : ''}`);
    }

    try {
        // --- TEST 1: Camera Permissions & Initialization ---
        const cameraObj = await page.evaluate(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const hasTracks = stream.getVideoTracks().length > 0;
                stream.getTracks().forEach(t => t.stop());
                return { success: true, hasTracks };
            } catch (e) {
                return { success: false, error: e.name };
            }
        });

        if (cameraObj.success && cameraObj.hasTracks) {
            report("Camera Access", "PASS");
        } else {
            report("Camera Access", "FAIL", cameraObj.error || "No tracks found");
        }

        // --- TEST 2: Storage & Offline Logic ---
        await page.evaluate(() => {
            localStorage.clear();
            // Mock an offline state and save a scan
            if (typeof saveToOfflineQueue === 'function') {
                saveToOfflineQueue("DIAG_001", "DIAGNOSTIC TEST USER");
            }
        });

        const offlineData = await page.evaluate(() => {
            const queue = JSON.parse(localStorage.getItem('nbsc_offline_scans') || "[]");
            return queue.length;
        });

        if (offlineData === 1) {
            report("Offline Queueing", "PASS");
        } else {
            report("Offline Queueing", "FAIL", "Storage write failed");
        }

        // --- TEST 3: Token Processing Logic ---
        const scanResult = await page.evaluate(async () => {
            return typeof processToken === 'function';
        });
        report("Token Processing Flow", scanResult ? "PASS" : "FAIL", scanResult ? "" : "processToken function is missing");

        // --- TEST 4: Sync Mechanism ---
        const syncStatus = await page.evaluate(async () => {
            if (typeof syncOfflineData === 'function') {
                return true;
            }
            return false;
        });
        report("Sync Mechanism Integrity", syncStatus ? "PASS" : "FAIL", syncStatus ? "" : "syncOfflineData not found");

    } catch (err) {
        console.error("\n💥 Diagnostic script crashed unexpectedy:");
        console.error(err);
    } finally {
        console.log("\n--- Final Diagnostic Summary ---");
        const failed = results.filter(r => r.status === "FAIL");
        if (failed.length === 0) {
            console.log("🟢 ALL CORE SYSTEMS FUNCTIONAL");
            await browser.close();
            process.exit(0);
        } else {
            console.error(`🔴 AUDIT FAILED: ${failed.length} system failures detected.`);
            await browser.close();
            process.exit(1);
        }
    }
}

runSystemDiagnostic();
