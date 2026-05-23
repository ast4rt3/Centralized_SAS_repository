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

    // 2. Create a hidden iframe to force-clear the external Vercel app session
    const lfIframe = document.createElement('iframe');
    lfIframe.style.display = 'none';
    lfIframe.src = 'https://lost-and-found-liart-seven.vercel.app/logout';
    document.body.appendChild(lfIframe);
  } catch (e) {
    console.error('Cross-domain logout logic failed:', e);
  }

  // Delay reload slightly to allow external requests to process
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}
