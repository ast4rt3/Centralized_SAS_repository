import { state } from "./state.js";
import { getEl, escapeHtml } from "../../utils/dom.js";

/**
 * Update unread badges in header and widgets
 */
export function updateUnreadBadges() {
  const { contactsMap } = state;
  
  // Re-calculate unreadCount from individual contact counts
  const totalUnread = Object.values(contactsMap).reduce((sum, contact) => sum + (contact.unread || 0), 0);
  // console.log(`[Messaging] Total Unread Count: ${totalUnread}`);
  state.unreadCount = totalUnread;

  // 1. Update Legacy Contact Cards in Sidebar
  Object.keys(contactsMap).forEach(username => {
    if (typeof window.renderContact === 'function') {
      const isOnline = contactsMap[username].isOnline || false;
      window.renderContact(username, isOnline);
    }
  });

  // 2. Update Messenger Page Sidebar
  if (typeof window.refreshFullMessengerUI === 'function') {
    const messagesPage = document.getElementById('messages');
    if (messagesPage && (messagesPage.classList.contains('active') || messagesPage.style.display !== 'none')) {
       window.refreshFullMessengerUI();
    }
  }

  // 3. Update Badge Elements
  const badges = ['fb-chat-unread', 'header-unread-badge', 'messenger-badge'];
  badges.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = totalUnread;
      if (totalUnread > 0) {
        el.style.display = 'flex';
        el.classList.remove('hidden');
      } else {
        el.style.display = 'none';
        el.classList.add('hidden');
      }
    }
  });
}

// Inject Notification Styles
(function injectStyles() {
  const styleId = 'messaging-ui-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .fb-chat-notifications {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      pointer-events: none;
    }
    .fb-chat-toast {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-left: 4px solid #f59e0b;
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1);
      cursor: pointer;
      min-width: 280px;
      max-width: 380px;
      animation: fb-toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fb-chat-toast:hover {
      transform: translateY(-4px) scale(1.02);
      background: rgba(15, 23, 42, 0.95);
      box-shadow: 0 15px 35px -5px rgba(245, 158, 11, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1);
    }
    .fb-chat-toast-sender {
      font-weight: 800;
      font-size: 0.95rem;
      color: #f59e0b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fb-chat-toast-sender::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
    }
    .fb-chat-toast-text {
      font-size: 0.95rem;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      font-weight: 400;
    }
    @keyframes fb-toast-in {
      from { opacity: 0; transform: translateX(30px) scale(0.9); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    .fb-broadcast-banner-container {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      padding-top: 20px;
      width: 100%;
      max-width: 600px;
      align-items: center;
    }
    .fb-broadcast-banner {
      pointer-events: auto;
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3);
      cursor: pointer;
      width: 90%;
      animation: fb-banner-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .fb-broadcast-banner:hover {
      transform: scale(1.02);
      box-shadow: 0 20px 40px rgba(220, 38, 38, 0.6), inset 0 2px 4px rgba(255,255,255,0.4);
    }
    .fb-broadcast-icon {
      font-size: 1.5rem;
      background: rgba(255,255,255,0.2);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .fb-broadcast-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fb-broadcast-title {
      font-weight: 800;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.8);
    }
    .fb-broadcast-text {
      font-size: 1.05rem;
      font-weight: 600;
      line-height: 1.4;
      margin: 0;
      color: white;
    }
    @keyframes fb-banner-drop {
      from { opacity: 0; transform: translateY(-50px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
})();

/**
 * Show a toast notification for new messages
 */
export function showNotification(sender, text, onClick) {
  let container = getEl('fb-chat-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fb-chat-notifications';
    container.className = 'fb-chat-notifications';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'fb-chat-toast';
  toast.onclick = () => {
    if (onClick) onClick(sender);
    toast.remove();
  };
  
  const displaySender = document.createElement('span');
  displaySender.className = 'fb-chat-toast-sender';
  displaySender.textContent = sender;
  
  const displayText = document.createElement('p');
  displayText.className = 'fb-chat-toast-text';
  displayText.textContent = text;
  
  toast.appendChild(displaySender);
  toast.appendChild(displayText);
  container.appendChild(toast);
  
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
}

/**
 * Show a top-down news banner for Broadcasts
 */
export function showBroadcastBanner(sender, text, onClick) {
  let container = getEl('fb-broadcast-banner-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fb-broadcast-banner-container';
    container.className = 'fb-broadcast-banner-container';
    document.body.appendChild(container);
  }
  
  const banner = document.createElement('div');
  banner.className = 'fb-broadcast-banner';
  banner.onclick = () => {
    if (onClick) onClick(sender);
    banner.remove();
  };
  
  banner.innerHTML = `
    <div class="fb-broadcast-icon">📢</div>
    <div class="fb-broadcast-content">
      <span class="fb-broadcast-title">SYSTEM BROADCAST FROM ${sender}</span>
      <p class="fb-broadcast-text">${text}</p>
    </div>
  `;
  
  container.appendChild(banner);
  
  // Banner stays a bit longer (12s) to read
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
}

/**
 * Create a chat bubble element
 */
export function createMessageBubble(data, isMe) {
  const bubble = document.createElement('div');
  bubble.className = `fb-chat-bubble ${isMe ? 'fb-chat-bubble-me' : 'fb-chat-bubble-other'}`;
  
  let timeStr = "";
  if (data.timestamp) {
    timeStr = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  bubble.innerHTML = `
    <div class="fb-chat-text">${escapeHtml(data.text || '')}</div>
    <div class="fb-chat-time">${timeStr}</div>
  `;
  
  return bubble;
}
/**
 * Refresh the legacy Messenger UI
 */
export function refreshFullMessengerUI() {
  if (typeof window.renderFullContacts === 'function') {
    window.renderFullContacts();
  }
}

// Expose to window for legacy compatibility
window.updateUnreadBadges = updateUnreadBadges;
window.showNotification = showNotification;
window.showBroadcastBanner = showBroadcastBanner;
window.refreshFullMessengerUI = refreshFullMessengerUI;
