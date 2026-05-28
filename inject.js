const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'apps');
const scriptName = 'global-presence.js';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (file.endsWith('.html')) results.push(fullPath);
    }
  });
  return results;
}

const htmlFiles = walk(appsDir);

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('global-presence.js')) {
    console.log('Skipping (already injected):', file);
    return;
  }

  // Calculate relative path to src/core/global-presence.js
  const relPath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'core', 'global-presence.js')).replace(/\\/g, '/');
  
  const injectStr = `  <script src="${relPath}"></script>\n</head>`;
  
  if (content.includes('</head>')) {
    content = content.replace('</head>', injectStr);
    fs.writeFileSync(file, content);
    console.log('Injected into:', file);
  } else {
    console.log('No </head> found in:', file);
  }
});
