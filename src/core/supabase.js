import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { getUserData } from "./auth.js";

let supabase = null;
let envKeys = null;

export function initSupabase(env) {
  if (env && env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    envKeys = env;
    try {
      supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    } catch (err) {
      console.error("Supabase initialization failed:", err);
    }
  }
}

// Auto-initialize if session exists on load
const sessionData = getUserData();
if (sessionData && sessionData.env) {
  initSupabase(sessionData.env);
}

export { supabase };

// Global helper for legacy code to fetch from Supabase
window.supabaseFetch = async (path, options = {}) => {
  // Use session env keys if available, otherwise try window.ENV (for fallback)
  const currentEnv = envKeys || (sessionData ? sessionData.env : null) || window.ENV || {};
  
  if (!currentEnv.SUPABASE_URL || !currentEnv.SUPABASE_ANON_KEY) {
    console.warn("[Supabase] Configuration missing for supabaseFetch (Not logged in?)");
    return { error: "Config missing" };
  }
  const url = `${currentEnv.SUPABASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'apikey': currentEnv.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentEnv.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return await response.json();
  } catch (err) {
    console.error("[Supabase] Fetch failed:", err);
    return { error: err.message };
  }
};
