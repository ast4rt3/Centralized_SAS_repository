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
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      pointer-events: none;
    }
    .fb-chat-toast {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 4px solid #7c3aed;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      cursor: pointer;
      min-width: 250px;
      max-width: 350px;
      animation: fb-toast-in 0.3s ease-out;
      transition: all 0.2s;
    }
    .fb-chat-toast:hover {
      transform: translateX(-5px);
      background: rgba(30, 41, 59, 1);
    }
    .fb-chat-toast-sender {
      font-weight: 800;
      font-size: 0.85rem;
      margin-bottom: 4px;
      color: #a78bfa;
      display: block;
    }
    .fb-chat-toast-text {
      font-size: 0.9rem;
      color: #e2e8f0;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @keyframes fb-toast-in {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
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
window.refreshFullMessengerUI = refreshFullMessengerUI;
