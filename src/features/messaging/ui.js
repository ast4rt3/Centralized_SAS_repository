import { state } from "./state.js";
import { getEl, escapeHtml } from "../../utils/dom.js";

/**
 * Update unread badges in header and widgets
 */
export function updateUnreadBadges() {
  const { contactsMap } = state;
  
  // Re-calculate unreadCount from individual contact counts
  const totalUnread = Object.values(contactsMap).reduce((sum, contact) => sum + (contact.unread || 0), 0);
  state.unreadCount = totalUnread;

  // Update badges
  const unreadBadge = getEl('fb-chat-unread');
  if (unreadBadge) {
    unreadBadge.textContent = totalUnread;
    unreadBadge.classList.toggle('hidden', totalUnread === 0);
  }

  const headerBadge = getEl('header-unread-badge');
  if (headerBadge) {
    headerBadge.textContent = totalUnread;
    headerBadge.classList.toggle('hidden', totalUnread === 0);
  }
}

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
