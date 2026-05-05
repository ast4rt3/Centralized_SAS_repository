import { ref, onChildAdded, onChildChanged, query, orderByChild, equalTo, get, update, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { userDb } from "../../core/firebase.js";
import { state } from "./state.js";
import { updateUnreadBadges, showNotification } from "./ui.js";
import { getMyUsername } from "../../core/auth.js";

/**
 * Initialize optimized messaging listeners
 */
export function initSharedMessaging(onMessageReceived) {
  const myUsername = getMyUsername();
  if (!userDb || !myUsername || myUsername === 'Unknown' || state.sharedMessagingInitialized) return;

  state.sharedMessagingInitialized = true;
  const messagesRef = ref(userDb, 'user_messages');

  // Listen to messages where the user is the receiver (for notifications and unread counts)
  const incomingQuery = query(messagesRef, orderByChild('receiver'), equalTo(myUsername));
  // Listen to messages where the user is the sender (for history sync across devices)
  const outgoingQuery = query(messagesRef, orderByChild('sender'), equalTo(myUsername));

  const handleNewMessage = (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const otherUser = data.sender === myUsername ? data.receiver : data.sender;
    const { contactsMap } = state;

    if (!contactsMap[otherUser]) {
      contactsMap[otherUser] = { unread: 0, history: [], isOnline: false };
    }

    const msgObj = { ...data, id: snapshot.key };
    
    // Update local state and legacy state
    if (!contactsMap[otherUser].history.some(m => m.id === msgObj.id)) {
      contactsMap[otherUser].history.push(msgObj);
      
      // Update legacy window.contactsMap if it exists
      if (window.contactsMap && window.contactsMap[otherUser]) {
        if (!window.contactsMap[otherUser].history) window.contactsMap[otherUser].history = [];
        if (!window.contactsMap[otherUser].history.some(m => m.id === msgObj.id)) {
          window.contactsMap[otherUser].history.push(msgObj);
        }
      }
    }

    if (data.sender === otherUser && !data.read) {
      contactsMap[otherUser].unread++;
      if (window.contactsMap && window.contactsMap[otherUser]) {
        window.contactsMap[otherUser].unread++;
      }
      if (onMessageReceived) onMessageReceived(otherUser, msgObj);
    }
    updateUnreadBadges();
  };

  onChildAdded(incomingQuery, handleNewMessage);
  onChildAdded(outgoingQuery, handleNewMessage);

  onChildChanged(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const otherUser = data.sender === myUsername ? data.receiver : data.sender;
    const { contactsMap } = state;

    if (contactsMap[otherUser]) {
      const history = contactsMap[otherUser].history;
      const msgIdx = history.findIndex(m => m.id === snapshot.key);

      if (msgIdx !== -1) {
        const wasRead = history[msgIdx].read;
        history[msgIdx] = { ...data, id: snapshot.key };
        
        // Sync legacy
        if (window.contactsMap && window.contactsMap[otherUser]) {
          const legacyHistory = window.contactsMap[otherUser].history || [];
          const lIdx = legacyHistory.findIndex(m => m.id === snapshot.key);
          if (lIdx !== -1) legacyHistory[lIdx] = { ...data, id: snapshot.key };
        }

        if (!wasRead && data.read && data.receiver === myUsername) {
          if (contactsMap[otherUser].unread > 0) contactsMap[otherUser].unread--;
          if (window.contactsMap && window.contactsMap[otherUser] && window.contactsMap[otherUser].unread > 0) {
            window.contactsMap[otherUser].unread--;
          }
        }
        updateUnreadBadges();
      }
    }
  });

  // Background fallback poll (every 5 minutes)
  setInterval(() => syncUnreadCountFromDb(myUsername), 300000);
}

/**
 * Fallback sync to ensure unread counts are correct
 */
export async function syncUnreadCountFromDb(myUsername) {
  if (!userDb || !myUsername || myUsername === 'Unknown') return;

  try {
    const messagesRef = ref(userDb, 'user_messages');
    const q = query(messagesRef, orderByChild('receiver'), equalTo(myUsername));
    const snapshot = await get(q);

    if (snapshot.exists()) {
      const messages = snapshot.val();
      const { contactsMap } = state;
      const unreadCounts = {};

      Object.values(messages).forEach(msg => {
        if (msg.read === false) {
          unreadCounts[msg.sender] = (unreadCounts[msg.sender] || 0) + 1;
        }
      });

      // Update both new and legacy state
      Object.keys(unreadCounts).forEach(sender => {
        if (contactsMap[sender]) contactsMap[sender].unread = unreadCounts[sender];
        if (window.contactsMap && window.contactsMap[sender]) window.contactsMap[sender].unread = unreadCounts[sender];
      });

      updateUnreadBadges();
    }
  } catch (err) {
    console.warn('[Messaging] Periodic sync failed:', err);
  }
}

/**
 * Mark messages as read
 */
export function markMessagesAsRead(otherUser) {
  const myUsername = getMyUsername();
  if (!userDb || !myUsername || !otherUser) return;

  const { contactsMap } = state;
  const history = contactsMap[otherUser]?.history || [];
  const updates = {};

  history.forEach(msg => {
    if (msg.receiver === myUsername && !msg.read && msg.id) {
      updates[`user_messages/${msg.id}/read`] = true;
      msg.read = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    update(ref(userDb), updates).catch(err => console.error("Failed to update read status:", err));
    if (contactsMap[otherUser]) contactsMap[otherUser].unread = 0;
    if (window.contactsMap && window.contactsMap[otherUser]) window.contactsMap[otherUser].unread = 0;
    updateUnreadBadges();
  }
}

/**
 * Send a message (Firebase implementation)
 */
export async function sendMessage(receiver, text) {
  const myUsername = getMyUsername();
  if (!userDb || !myUsername || !receiver || !text) return;

  try {
    const messagesRef = ref(userDb, 'user_messages');
    const newMsgRef = push(messagesRef);
    const msgData = {
      sender: myUsername,
      receiver: receiver,
      text: text,
      timestamp: serverTimestamp(),
      read: false
    };

    await update(newMsgRef, msgData);
    return { ...msgData, id: newMsgRef.key };
  } catch (err) {
    console.error("[Messaging] Failed to send message:", err);
    throw err;
  }
}

// Expose to window for legacy support
window.initSharedMessaging = initSharedMessaging;
window.markMessagesAsRead = markMessagesAsRead;
window.sendMessage = sendMessage;
window.syncUnreadCountFromDb = syncUnreadCountFromDb;
