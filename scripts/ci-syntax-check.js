const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const { JSDOM } = require('jsdom');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

let errors = 0;

const files = getAllFiles('.');
files.forEach(file => {
  const ext = path.extname(file);
  const content = fs.readFileSync(file, 'utf8');

  if (ext === '.js' && !file.includes('env.js') && !file.includes('scanner.gs')) {
    try {
      acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module' });
      console.log(`✅ ${file} is valid.`);
    } catch (e) {
      console.error(`❌ Syntax Error in ${file}: ${e.message}`);
      errors++;
    }
  } else if (ext === '.html') {
    try {
      const dom = new JSDOM(content);
      const scripts = dom.window.document.querySelectorAll('script');
      scripts.forEach((script, idx) => {
        if (!script.src && script.textContent.trim()) {
          try {
            acorn.parse(script.textContent, { ecmaVersion: 'latest' });
          } catch (e) {
            console.error(`❌ Syntax Error in ${file} (Script Tag #${idx + 1}): ${e.message}`);
            errors++;
          }
        }
      });
      console.log(`✅ ${file} HTML and internal scripts are valid.`);
    } catch (e) {
      console.error(`❌ HTML Parsing Error in ${file}: ${e.message}`);
      errors++;
    }
  }
});

if (errors > 0) {
  console.error(`\nFound ${errors} syntax errors. CI Failed.`);
  process.exit(1);
} else {
  console.log('\nAll files passed syntax check. CI Success.');
  process.exit(0);
}
