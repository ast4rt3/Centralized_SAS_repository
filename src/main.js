import "./legacy.js";
import { performImmediateAuthCheck, getMyUsername } from "./core/auth.js";
import { initSharedMessaging } from "./features/messaging/logic_supabase.js";
import "./features/messaging/ui.js";
import { updateClock, updateWeather } from "./features/tv/clock.js";
import { syncFromHash, ensureAppVisible } from "./ui/navigation.js";
import { initFileConverter } from "./features/converter/logic.js";
import { initErrorMonitor } from "./core/error-monitor.js";

// 0. Initialize On-Screen Error Monitor
initErrorMonitor();

// 1. Immediate Auth Check
performImmediateAuthCheck();

// 2. Global State & Initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('--- SAS APP INITIALIZING (Modular) ---');

  // Initialize UI State
  const systems = await fetchSystems();
  if (window.ENV) window.ENV.systems = systems; // Sync back to global ENV for legacy.js compatibility
  syncFromHash(systems);

  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (sessionData) {
    ensureAppVisible();
  }

  window.addEventListener('hashchange', () => syncFromHash(systems));


  // Initialize Messaging
  const myUsername = getMyUsername();
  if (myUsername !== 'Unknown') {
    initSharedMessaging();
  }

  // Initialize File Converter
  initFileConverter();

  // Initialize TV Features
  updateClock();
  updateWeather();
  setInterval(updateClock, 1000);
  setInterval(updateWeather, 1800000); // 30 mins

  // Version Check
  setInterval(checkForUpdates, 3600000); // 1 hour
});

async function fetchSystems() {
  try {
    const res = await fetch('systems.txt?v=' + Date.now());
    const data = await res.json();
    if (window.ENV) window.ENV.systems = data;
    return data;
  } catch (e) {
    console.error("Failed to load systems:", e);
    return [];
  }
}

async function checkForUpdates() {
  try {
    const response = await fetch('version.txt?t=' + Date.now());
    if (!response.ok) return;
    const data = await response.json();
    const localVersion = localStorage.getItem('sas_app_version');
    if (localVersion && localVersion !== data.version) {
      localStorage.setItem('sas_app_version', data.version);
      setTimeout(() => window.location.reload(true), 1000);
    }
  } catch (err) { }
}
