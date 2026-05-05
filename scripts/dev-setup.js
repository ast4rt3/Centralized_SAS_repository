/**
 * dev-setup.js
 * Pre-flight check before starting the local dev server.
 * Ensures env.js exists so the app works locally identical to production.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'env.js');
const ENV_EXAMPLE = path.join(ROOT, 'env.example.js');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SAS Portal — Local Dev Pre-flight Check');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Check env.js exists
if (!fs.existsSync(ENV_FILE)) {
  console.error('❌  env.js NOT FOUND.\n');
  console.error('   env.js is gitignored and must be created manually for local dev.');
  console.error('   Copy your env.js from your GitHub Gist:\n');
  console.error('   https://gist.github.com/ast4rt3\n');
  console.error('   Or copy from the template:');
  console.error(`   ${ENV_EXAMPLE}\n`);
  console.error('   Place it at the repo root: env.js\n');
  process.exit(1);
}

// 2. Check BACKEND_GAS_URL is set inside env.js
const envContent = fs.readFileSync(ENV_FILE, 'utf8');
if (!envContent.includes('BACKEND_GAS_URL') || envContent.includes('BACKEND_GAS_URL: ""') || envContent.includes("BACKEND_GAS_URL: ''")) {
  console.warn('⚠️   WARNING: BACKEND_GAS_URL appears to be empty in env.js.');
  console.warn('    The app will load but backend calls will fail.\n');
} else {
  console.log('✅  env.js found and BACKEND_GAS_URL is set.');
}

// 3. Check systems.json exists
const SYSTEMS_FILE = path.join(ROOT, 'systems.json');
if (!fs.existsSync(SYSTEMS_FILE)) {
  console.warn('⚠️   WARNING: systems.json not found. App navigation may break.');
} else {
  console.log('✅  systems.json found.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Starting dev server at http://localhost:3000');
console.log('  File Hub:  http://localhost:3000/apps/file-hub/');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
