const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

let stack = [];
let inString = null;
let inComment = null;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i+1];

    if (inComment === 'line') {
        if (char === '\n') inComment = null;
        continue;
    }
    if (inComment === 'block') {
        if (char === '*' && next === '/') {
            inComment = null;
            i++;
        }
        continue;
    }
    if (inString) {
        if (char === inString && content[i-1] !== '\\') inString = null;
        continue;
    }

    if (char === '/' && next === '/') { inComment = 'line'; i++; continue; }
    if (char === '/' && next === '*') { inComment = 'block'; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { inString = char; continue; }

    if (char === '{') stack.push({ type: '{', line: content.slice(0, i).split('\n').length });
    if (char === '}') {
        if (stack.length === 0) {
            console.log("EXTRANEOUS closing brace at line " + content.slice(0, i).split('\n').length);
        } else {
            stack.pop();
        }
    }
}

if (stack.length > 0) {
    stack.forEach(s => console.log("UNCLOSED brace at line " + s.line));
} else {
    console.log("All braces balanced!");
}
