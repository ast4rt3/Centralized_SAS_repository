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

    // 2. Trigger external logout via a tightly sandboxed hidden iframe
    // The sandbox strictly blocks 'allow-top-navigation'. This allows the Vercel app
    // to run its logout scripts, but prevents the InfinityFree bot protection from 
    // hijacking the entire browser tab if the Vercel app redirects back to kesug.com.
    const lfIframe = document.createElement('iframe');
    lfIframe.style.display = 'none';
    lfIframe.sandbox = 'allow-scripts allow-same-origin'; // Critical: omitting allow-top-navigation
    lfIframe.src = 'https://lost-and-found-liart-seven.vercel.app/logout';
    document.body.appendChild(lfIframe);

  } catch (e) {
    console.error('Cross-domain logout logic failed:', e);
  }

  // Delay reload slightly to allow external requests to process
  setTimeout(() => {
    window.location.reload();
  }, 500);
}
