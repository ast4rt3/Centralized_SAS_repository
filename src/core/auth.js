/**
 * Auth and Session Management Module
 */

export function performImmediateAuthCheck() {
  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  const isLoginPage = window.location.hash === '#login';
  
  if (!sessionData && !isLoginPage) {
    const lp = document.getElementById('landing-page');
    if (lp) lp.classList.remove('hidden');
    document.body.classList.add('lp-mode');
  } else if (!sessionData && isLoginPage) {
    const lo = document.getElementById('login-overlay');
    if (lo) lo.classList.remove('hidden');
  }
}

export function getUserData() {
  try {
    const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (raw) return JSON.parse(raw);
  } catch(e) {
    console.error("Failed to parse user data:", e);
  }
  return null;
}

export function getMyUsername() {
  const data = getUserData();
  return data?.username || 'Unknown';
}

export function logout() {
  localStorage.removeItem('sas_user_data');
  sessionStorage.removeItem('sas_user_data');
  
  try {
    // 1. Post message to all active iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'logout' }, '*');
      }
    });

    // 2. Trigger external logout via background fetch instead of iframe
    // An iframe causes InfinityFree to trigger its bot protection when the Vercel app redirects back to kesug.com.
    fetch('https://lost-and-found-liart-seven.vercel.app/logout', {
      method: 'GET',
      mode: 'no-cors',
      credentials: 'omit' // We just hit the endpoint, but wait, if it needs cookies to log out, we might need 'include'.
      // Actually, since SameSite restricts cross-origin cookies, postMessage is the only reliable way.
    }).catch(() => {});

  } catch (e) {
    console.error('Cross-domain logout logic failed:', e);
  }

  // Delay reload slightly to allow external requests to process
  setTimeout(() => {
    window.location.reload();
  }, 500);
}
