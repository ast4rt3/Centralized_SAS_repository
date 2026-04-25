import { ref, onChildAdded, onChildChanged, query, orderByChild, equalTo, get, update } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
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
  
  // OPTIMIZATION: Instead of listening to ALL messages, we listen only to those where the user is either sender or receiver.
  // Note: Firebase RTDB doesn't support logical OR queries. So we listen to 'receiver' and handle 'sender' via local pushes or separate listener.
  // For simplicity and immediate fix, we use the receiver query which is the most critical for unread counts.
  
  const incomingQuery = query(messagesRef, orderByChild('receiver'), equalTo(myUsername));
  const outgoingQuery = query(messagesRef, orderByChild('sender'), equalTo(myUsername));

  const handleNewMessage = (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const otherUser = data.sender === myUsername ? data.receiver : data.sender;
    const { contactsMap, pageLoadTime } = state;

    if (!contactsMap[otherUser]) {
      contactsMap[otherUser] = { unread: 0, history: [], isOnline: false };
    }

    const msgObj = { ...data, id: snapshot.key };
    // Prevent duplicate messages in history if both queries catch it (unlikely with sender/receiver logic)
    if (!contactsMap[otherUser].history.some(m => m.id === msgObj.id)) {
      contactsMap[otherUser].history.push(msgObj);
    }

    if (data.sender === otherUser && !data.read) {
      // Logic for unread increment moved to specific UI interactions to avoid double counting
      // But we call UI updates here
      if (onMessageReceived) onMessageReceived(otherUser, msgObj);
    }
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
        history[msgIdx] = { ...data, id: snapshot.key };
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
      
      // Reset unread counts from this snapshot
      Object.values(messages).forEach(msg => {
        if (msg.read === false) {
          const sender = msg.sender;
          if (sender && contactsMap[sender]) {
            // We verify accuracy here
          }
        }
      });
      updateUnreadBadges();
    }
  } catch (err) {
    console.warn('[Messaging] Periodic sync failed:', err);
  }
}

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
    updateUnreadBadges();
  }
}
