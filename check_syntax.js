const fs = require('fs');
try {
    const code = fs.readFileSync('app.js', 'utf8');
    new Function(code);
    console.log("Syntax is VALID");
} catch (e) {
    console.log("Syntax ERROR: " + e.message);
    if (e.loc) {
        console.log("Location: line " + e.loc.line + ", col " + e.loc.column);
    }
    // Attempt to find where the error is
    const lines = code.split('\n');
    const match = e.message.match(/line (\d+)/);
    if (match) {
        const lineNum = parseInt(match[1]);
        console.log("Context around error line " + lineNum + ":");
        for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
            console.log((i + 1) + ": " + lines[i]);
        }
    }
}
