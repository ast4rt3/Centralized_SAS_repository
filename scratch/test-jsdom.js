const fs = require('fs');
const { JSDOM } = require('jsdom');

try {
  console.log("Loading index.html...");
  const content = fs.readFileSync('index.html', 'utf8');
  console.log("File loaded. Length:", content.length);
  console.log("Initializing JSDOM...");
  const dom = new JSDOM(content);
  console.log("JSDOM initialization successful!");
} catch (e) {
  console.error("Caught JSDOM Error:", e);
}
