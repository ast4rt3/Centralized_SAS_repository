const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const distPath = path.resolve('dist', 'env.js');

if (fs.existsSync(distPath)) {
    console.log('🔒 Obfuscating dist/env.js for production...');
    const code = fs.readFileSync(distPath, 'utf8');
    
    try {
        const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: false,
            stringArray: false // Disable string array to see if it fixes the crash
        });

        fs.writeFileSync(distPath, obfuscatedCode.getObfuscatedCode());
        console.log('✅ dist/env.js obfuscated successfully!');
    } catch (err) {
        console.error('❌ Obfuscation failed!');
        const match = err.message.match(/\((\d+):(\d+)\)/);
        if (match) {
            const line = parseInt(match[1]);
            const lines = code.split('\n');
            console.error(`Error at line ${line}: "${lines[line - 1]}"`);
        }
        console.error(err);
        process.exit(1);
    }
} else {
    console.error('❌ dist/env.js not found!');
    process.exit(1);
}
