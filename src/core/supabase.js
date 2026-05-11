import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabase = null;

if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("Supabase initialization failed:", err);
  }
}

export { supabase };

// Global helper for legacy code to fetch from Supabase
if (window.ENV) {
  window.supabaseFetch = async (path, options = {}) => {
    if (!window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
      console.warn("[Supabase] Configuration missing for supabaseFetch");
      return { error: "Config missing" };
    }
    const url = `${window.ENV.SUPABASE_URL}${path}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'apikey': window.ENV.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${window.ENV.SUPABASE_ANON_KEY}`,
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
}
