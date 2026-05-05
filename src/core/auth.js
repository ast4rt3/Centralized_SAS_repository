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
  window.location.reload();
}
