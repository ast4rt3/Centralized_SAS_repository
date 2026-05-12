const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const distPath = path.resolve('dist', 'env.js');

if (fs.existsSync(distPath)) {
    console.log('🔒 Obfuscating dist/env.js for production...');
    const code = fs.readFileSync(distPath, 'utf8');
    
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1,
        renameProperties: false
    });

    fs.writeFileSync(distPath, obfuscatedCode.getObfuscatedCode());
    console.log('✅ dist/env.js obfuscated successfully!');
} else {
    console.error('❌ dist/env.js not found! Skipping obfuscation.');
    process.exit(1);
}
