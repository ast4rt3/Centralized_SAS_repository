const puppeteer = require('puppeteer');
const path = require('path');

async function runStressTest() {
    console.log("🚀 Starting NBSC SAS Stress Test...");
    
    // 1. Launch browser with camera permissions and mocking enabled
    const browser = await puppeteer.launch({
        headless: false, // Set to true for background run
        defaultViewport: { width: 390, height: 844 }, // iPhone 12 Pro size
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });

    const page = await browser.newPage();
    
    // 2. Navigate to the local scanner
    const url = 'file://' + path.resolve(__dirname, '../apps/attendance-scanner/index.html');
    await page.goto(url);

    console.log("📍 Scanner loaded. Simulating user entry...");
    
    // 3. Bypass Home screen
    await page.evaluate(() => {
        if (typeof enterScanner === 'function') enterScanner();
    });

    // 4. Wait for scanner to initialize
    await new Promise(r => setTimeout(r, 2000));

    console.log("⚡ Starting Load Test: 100 Scans in 30 seconds...");

    const startTime = Date.now();
    let scanCount = 0;
    const targetScans = 100;

    for (let i = 0; i < targetScans; i++) {
        // Generate a random token
        const mockToken = `STRESS_TEST_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulate a successful scan by calling the internal processor
        await page.evaluate((token) => {
            if (typeof processToken === 'function') {
                processToken(token);
            }
        }, mockToken);

        scanCount++;
        if (scanCount % 10 === 0) {
            console.log(`📡 Processed ${scanCount}/${targetScans} scans...`);
        }

        // Wait slightly between scans to simulate real-world rapid scanning
        await new Promise(r => setTimeout(r, 200));
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Load test finished: ${scanCount} scans in ${duration.toFixed(2)}s`);

    // 5. Verification
    const historyCount = await page.evaluate(() => {
        const history = JSON.parse(localStorage.getItem('scan_history') || '[]');
        return history.length;
    });

    const queueCount = await page.evaluate(() => {
        const queue = JSON.parse(localStorage.getItem('nbsc_offline_scans') || '[]');
        return queue.length;
    });

    console.log(`📊 Statistics:`);
    console.log(`   - History Count: ${historyCount} / 500 max`);
    console.log(`   - Offline Queue: ${queueCount} pending sync`);
    
    if (historyCount > 0) {
        console.log("🟢 SYSTEM STABILITY: SUCCESS");
    } else {
        console.log("🔴 SYSTEM STABILITY: FAILED (No data saved)");
    }

    console.log("\n⚠️ Scanner will remain open for 10s for visual inspection...");
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();
}

runStressTest().catch(err => {
    console.error("❌ Stress Test Crashed:", err);
});
