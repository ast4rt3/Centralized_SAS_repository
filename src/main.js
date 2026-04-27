import "./legacy.js";
import { performImmediateAuthCheck, getMyUsername } from "./core/auth.js";
import { initSharedMessaging } from "./features/messaging/logic.js";
import { updateClock, updateWeather } from "./features/tv/clock.js";
import { syncFromHash } from "./ui/navigation.js";

// 1. Immediate Auth Check
performImmediateAuthCheck();

// 2. Global State & Initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('--- SAS APP INITIALIZING (Modular) ---');
  
  // Initialize UI State
  const systems = await fetchSystems();
  syncFromHash(systems);
  
  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (sessionData) {
    import("./ui/navigation.js").then(m => m.ensureAppVisible());
  }
  
  window.addEventListener('hashchange', () => syncFromHash(systems));

  
  // Initialize Messaging
  const myUsername = getMyUsername();
  if (myUsername !== 'Unknown') {
    initSharedMessaging();
  }
  
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
    const res = await fetch('systems.json?v=' + Date.now());
    return await res.json();
  } catch (e) {
    console.error("Failed to load systems:", e);
    return [];
  }
}

async function checkForUpdates() {
  try {
    const response = await fetch('version.json?t=' + Date.now());
    if (!response.ok) return;
    const data = await response.json();
    const localVersion = localStorage.getItem('sas_app_version');
    if (localVersion && localVersion !== data.version) {
      localStorage.setItem('sas_app_version', data.version);
      setTimeout(() => window.location.reload(true), 1000);
    }
  } catch (err) {}
}
