const https = require('https');

async function checkURL(name, url) {
    return new Promise((resolve) => {
        console.log(`🔍 Checking ${name}...`);
        const req = https.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log(`✅ ${name} is reachable (HTTP ${res.statusCode})`);
                resolve(true);
            } else if (res.statusCode === 405 || res.statusCode === 401) {
                // Some APIs (like GAS POST endpoints) might return 405 on GET, but it means they are alive
                console.log(`✅ ${name} is alive (HTTP ${res.statusCode} - Service is up)`);
                resolve(true);
            } else {
                console.error(`❌ ${name} returned error (HTTP ${res.statusCode})`);
                resolve(false);
            }
        });

        req.on('error', (err) => {
            console.error(`❌ ${name} connection failed: ${err.message}`);
            resolve(false);
        });

        req.end();
    });
}

async function runAudit() {
    const configs = {
        "Google Apps Script (Main)": process.env.BACKEND_GAS_URL,
        "Google Apps Script (Scanner)": process.env.SCANNER_GAS_URL,
        "Firebase Runtime": "https://centralized-messaging-storage.firebaseapp.com",
        "Firebase Database": "https://centralized-messaging-storage-default-rtdb.firebaseio.com/.json",
        "Cloudinary CDN": `https://res.cloudinary.com/dj8ugtlrl/image/upload/sample.jpg`
    };

    let allOk = true;
    for (const [name, url] of Object.entries(configs)) {
        if (!url) {
            console.warn(`⚠️ Skipping ${name}: URL not provided (Check GitHub Secrets)`);
            continue;
        }
        const ok = await checkURL(name, url);
        if (!ok) allOk = false;
    }

    if (!allOk) {
        console.error("\n🔴 Integration Audit Failed: One or more external services are unreachable.");
        process.exit(1);
    } else {
        console.log("\n🟢 Integration Audit Passed: All third-party services are online.");
        process.exit(0);
    }
}

runAudit();
