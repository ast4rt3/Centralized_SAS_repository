const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const distPath = path.resolve('dist', 'env.js');

if (fs.existsSync(distPath)) {
    console.log('🔒 Obfuscating dist/env.js for production...');
    try {
        const code = fs.readFileSync(distPath, 'utf8');
        
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            // Simplified settings for maximum compatibility
            controlFlowFlattening: false, 
            deadCodeInjection: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false
        });

        fs.writeFileSync(distPath, obfuscatedCode.getObfuscatedCode());
        console.log('✅ dist/env.js obfuscated successfully!');
    } catch (err) {
        console.error('❌ Obfuscation failed!');
        console.error(err);
        process.exit(1);
    }
} else {
    console.error('❌ dist/env.js not found!');
    process.exit(1);
}
