const https = require('https');

async function checkURL(name, url) {
    return new Promise((resolve) => {
        console.log(`🔍 Auditing ${name}...`);
        const req = https.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`✅ ${name}: HEALTHY (HTTP ${res.statusCode})`);
                resolve("HEALTHY");
            } else if ([302, 401, 404, 405].includes(res.statusCode)) {
                // Service is up but the specific endpoint is restricted, missing, or redirecting
                console.log(`::warning::⚠️ ${name}: CAREFUL STATE (HTTP ${res.statusCode}) - Service responded (Redirect/Restricted/Missing) but it is alive.`);
                resolve("CAREFUL");
            } else {
                console.log(`::error::❌ ${name}: CRITICAL (HTTP ${res.statusCode}) - Service appears down or non-responsive.`);
                resolve("CRITICAL");
            }
        });

        req.on('error', (err) => {
            console.log(`::error::❌ ${name}: OFFLINE - Connection failed: ${err.message}`);
            resolve("CRITICAL");
        });

        req.end();
    });
}

async function runAudit() {
    const configs = {
        "Google Apps Script (Main)": process.env.BACKEND_GAS_URL,
        "Google Apps Script (Scanner)": process.env.SCANNER_GAS_URL,
        "Supabase API": process.env.SUPABASE_URL,
        "Cloudinary API": "https://api.cloudinary.com/v1_1"
    };

    let criticalCount = 0;
    let carefulCount = 0;

    for (const [name, url] of Object.entries(configs)) {
        if (!url) {
            console.log(`::warning::⚠️ Skipping ${name}: Configuration missing.`);
            continue;
        }
        const state = await checkURL(name, url);
        if (state === "CRITICAL") criticalCount++;
        if (state === "CAREFUL") carefulCount++;
    }

    if (criticalCount > 0) {
        console.error(`\n🔴 AUDIT FAILED: ${criticalCount} Critical issues found.`);
        process.exit(1); 
    } else if (carefulCount > 0) {
        console.warn(`\n🟡 AUDIT WARNING: ${carefulCount} Careful states detected. Proceeding with caution.`);
        process.exit(0); // Proceed but show the warning
    } else {
        console.log("\n🟢 AUDIT PASSED: All services healthy.");
        process.exit(0);
    }
}

runAudit();
