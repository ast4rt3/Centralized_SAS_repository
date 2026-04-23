import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, onChildChanged, onValue, onDisconnect, set, remove, get, update, serverTimestamp, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// IMMEDIATE AUTH CHECK - Run BEFORE any UI is shown to prevent flash of unauthorized content
// IMMEDIATE AUTH CHECK - Show landing page or dashboard depending on session
(function() {
  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  const isLoginPage = window.location.hash === '#login';
  
  if (!sessionData && !isLoginPage) {
    // Proactively show landing page to avoid blank screen while waiting for full init
    const lp = document.getElementById('landing-page');
    if (lp) lp.classList.remove('hidden');
  } else if (!sessionData && isLoginPage) {
    // Show login overlay immediately if explicitly requested
    const lo = document.getElementById('login-overlay');
    if (lo) lo.classList.remove('hidden');
  }
})();

const BACKEND_GAS_URL = window.ENV?.BACKEND_GAS_URL || "YOUR_NEW_BACKEND_GAS_URL_HERE";

// Global Utility: Escape HTML to prevented XSS
const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Initialize Firebase Realtime Database for Admin Chat
let db;
let chatInitialized = false;

if (window.ENV && window.ENV.FIREBASE_CONFIG) {
  try {
    const app = initializeApp(window.ENV.FIREBASE_CONFIG);
    db = getDatabase(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

function initAdminChat() {
  if (!db || chatInitialized) return;
  
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  if (!chatMessages || !chatForm || !chatInput) return;

  chatInitialized = true;
  const messagesRef = ref(db, 'admin_messages');
  
  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  let myUsername = 'Admin';
  if (sessionData) {
    try { myUsername = JSON.parse(sessionData).username || 'Admin'; } catch(e) {}
  }

  onChildAdded(messagesRef, (snapshot) => {
    const data = snapshot.val();
    displayMessage(data, data.sender === myUsername);
  });
  
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
      push(messagesRef, {
        sender: myUsername,
        text: text,
        timestamp: serverTimestamp()
      }).catch(err => {
        console.error("Failed to send message:", err);
      });
      chatInput.value = '';
    }
  });
}

function displayMessage(data, isMe) {
  const chatMessages = document.getElementById('chat-messages');
  if(!chatMessages) return;
  
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`;
  
  let timeStr = "";
  if (data.timestamp) {
    const d = new Date(data.timestamp);
    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  
  
  bubble.innerHTML = `
    ${!isMe ? `<div class="chat-sender">${escapeHtml(data.sender || 'Unknown')}</div>` : ''}
    <div class="chat-text">${escapeHtml(data.text || '')}</div>
    <div class="chat-time">${timeStr}</div>
  `;
  
  chatMessages.appendChild(bubble);
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 10);
}

// --- USER TO USER MESSAGING (Firebase) ---
let userDb;
let userChatInitialized = false;
if (window.ENV && window.ENV.FIREBASE_CONFIG) {
  try {
    const userApp = initializeApp(window.ENV.FIREBASE_CONFIG, "userMessagingApp");
    userDb = getDatabase(userApp);
  } catch(e) {
    console.error("User messaging firebase init failed:", e);
  }
}

// Optional second database used by superadmin database health checks.
let storageCheckDb = null;
if (window.ENV && window.ENV.STORAGE_CHECK_FIREBASE_CONFIG) {
  try {
    const storageApp = initializeApp(window.ENV.STORAGE_CHECK_FIREBASE_CONFIG, "storageCheckApp");
    storageCheckDb = getDatabase(storageApp);
  } catch (e) {
    console.error("Storage check firebase init failed:", e);
  }
}

let contactsMap = {};

async function fetchSpreadsheetUsers() {
  try {
    const res = await fetch(BACKEND_GAS_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getUsers" })
    });
    const data = await res.json();
    const usersList = data.users || data.data || [];
    usersList.forEach(u => {
      const userObj = typeof u === 'object' ? u : { username: u };
      const username = userObj.username;
      if (username && username !== myUsername) {
        if (!contactsMap[username]) {
          contactsMap[username] = { 
            unread: 0, 
            el: null, 
            history: [],
            profilePic: userObj.profilePic || "",
            displayName: userObj.displayName || username
          };
        } else {
          contactsMap[username].profilePic = userObj.profilePic || "";
          contactsMap[username].displayName = userObj.displayName || username;
        }
      }
    });
  } catch(e) { console.error("Failed to fetch spreadsheet users:", e); }
}
window.fetchSpreadsheetUsers = fetchSpreadsheetUsers;

// Resolve myUsername IMMEDIATELY from session storage so it is always available
// before any messaging function runs, regardless of initialization order.
let myUsername = (() => {
  try {
    const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username) return parsed.username;
    }
  } catch(e) {}
  return 'Unknown';
})();

// --- SHARED MESSAGING STATE (GLOBAL) ---
let unreadCount = 0;
let activeChatUser = null; 
let activeMessengerUser = null; 
const pageLoadTime = Date.now();

function updateUnreadBadges() {
  // Re-calculate unreadCount from individual contact counts to prevent desync
  unreadCount = Object.values(contactsMap).reduce((sum, contact) => sum + (contact.unread || 0), 0);

  // Update individual contact cards in sidebar if they are rendered
  Object.keys(contactsMap).forEach(username => {
    if (typeof window.renderContact === 'function') {
      const isOnline = contactsMap[username].isOnline || false;
      window.renderContact(username, isOnline);
    }
  });

  const unreadBadge = document.getElementById('fb-chat-unread');
  if (unreadBadge) {
    unreadBadge.textContent = unreadCount;
    unreadBadge.classList.toggle('hidden', unreadCount === 0);
  }

  const headerBadge = document.getElementById('header-unread-badge');
  if (headerBadge) {
    headerBadge.textContent = unreadCount;
    headerBadge.classList.toggle('hidden', unreadCount === 0);
  }
  
  if (typeof renderFullContacts === 'function') {
     const messagesPage = document.getElementById('messages');
     if (messagesPage && (messagesPage.classList.contains('active') || messagesPage.style.display !== 'none')) {
       renderFullContacts();
     }
  }
}

function showNotification(sender, text) {
  let container = document.getElementById('fb-chat-notifications');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fb-chat-notifications';
    container.className = 'fb-chat-notifications';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'fb-chat-toast';
  toast.onclick = () => {
    // If widget exists, open it. Otherwise show warning or redirect.
    if (typeof openConversation === 'function') {
        openConversation(sender);
    } else {
        window.location.hash = 'messages';
    }
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

function markMessagesAsRead(otherUser) {
  if (!userDb || !myUsername || !otherUser) return;
  const history = contactsMap[otherUser] ? (contactsMap[otherUser].history || []) : [];
  const updates = {};
  
  history.forEach(msg => {
    if (msg.receiver === myUsername && !msg.read && msg.id) {
      updates[`user_messages/${msg.id}/read`] = true;
      msg.read = true; // Update local state immediately
    }
  });

  if (Object.keys(updates).length > 0) {
    console.log(`[Messaging] Marking ${Object.keys(updates).length} messages from ${otherUser} as read.`);
    update(ref(userDb), updates).catch(err => console.error("Failed to update read status:", err));
    
    // Optimistically clear counts locally to ensure UI updates instantly
    if (contactsMap[otherUser]) {
      contactsMap[otherUser].unread = 0;
    }
    
    // Update global counter via re-calculating from all users to ensure accuracy
    updateUnreadBadges();
  }
}

// Mark all conversations as read
function markAllMessagesAsRead() {
  Object.keys(contactsMap).forEach(username => {
    markMessagesAsRead(username);
  });
}

// Background polling fallback to ensure count stays synced even if real-time listener stalls
async function syncUnreadCountFromDb() {
  if (!userDb || !myUsername || myUsername === 'Unknown') return;
  
  try {
    const messagesRef = ref(userDb, 'user_messages');
    // Normalize identity check to prevent case mismatches
    const myId = myUsername.toLowerCase();
    
    // In Firebase RTDB, we can only filter by one child efficiently. 
    // We'll query all messages received by the user and then filter 'read' status locally.
    const q = query(messagesRef, orderByChild('receiver'), equalTo(myUsername));
    const snapshot = await get(q);
    
    if (snapshot.exists()) {
      const messages = snapshot.val();
      const unreadPerUser = {};
      
      Object.values(messages).forEach(msg => {
        if (msg.read === false) {
          const sender = msg.sender;
          if (sender) {
            unreadPerUser[sender] = (unreadPerUser[sender] || 0) + 1;
          }
        }
      });
      
      // Update contactsMap with correct unread counts
      Object.keys(unreadPerUser).forEach(username => {
        if (contactsMap[username]) {
          contactsMap[username].unread = unreadPerUser[username];
        }
      });
      
      console.log(`[Messaging] Polling sync complete. Total unread recalculated.`);
      updateUnreadBadges();
    }
  } catch (err) {
    console.warn('[Messaging] Periodic sync failed:', err);
  }
}

function initSharedMessaging() {
  if (!userDb || !myUsername || myUsername === 'Unknown') return;
  const baseRef = ref(userDb, 'user_messages');
  
  onChildAdded(baseRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.sender || !data.receiver) return;
    
    if (data.sender === myUsername || data.receiver === myUsername) {
      const otherUser = data.sender === myUsername ? data.receiver : data.sender;
      
      if (!contactsMap[otherUser]) {
        contactsMap[otherUser] = { unread: 0, el: null, history: [], isOnline: false };
        if (typeof renderContact === 'function') renderContact(otherUser, false);
      }
      
      const msgObj = { ...data, id: snapshot.key };
      contactsMap[otherUser].history.push(msgObj);
      
      const isWidgetOpen = !document.getElementById('fb-chat-body')?.classList.contains('hidden');
      const isWidgetConvOpen = !document.getElementById('fb-chat-conversation')?.classList.contains('hidden');
      const isMessengerPage = window.location.hash === '#messages';

      // Only suppress notifications if the specific conversation is actually VISIBLE on screen
      const isChatOpen = (activeChatUser === otherUser && isWidgetOpen && isWidgetConvOpen) || 
                         (activeMessengerUser === otherUser && isMessengerPage) || 
                         (window.activeMessengerUser === otherUser && isMessengerPage);
      
      if (data.sender === otherUser && !isChatOpen && !data.read) {
        contactsMap[otherUser].unread++;
        unreadCount++;
        console.log(`[Messaging] Real-time unread increment: ${unreadCount} (from ${otherUser})`);
        updateUnreadBadges();
        
        if (typeof showNotification === 'function') {
          const msgTime = data.timestamp ? new Date(data.timestamp).getTime() : 0;
          // Only show pop-up notification if it's a NEW message sent after page load
          if (msgTime > pageLoadTime) {
            showNotification(otherUser, data.text);
          }
        }
      }
      
      if (activeChatUser === otherUser && typeof renderMessage === 'function') {
        renderMessage(msgObj, data.sender === myUsername);
      }
      
      if ((activeMessengerUser === otherUser || window.activeMessengerUser === otherUser) && typeof window.refreshFullMessengerUI === 'function') {
        window.refreshFullMessengerUI();
      }
    }
  });

  onChildChanged(baseRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.sender || !data.receiver) return;
    
    const otherUser = data.sender === myUsername ? data.receiver : data.sender;
    if (contactsMap[otherUser]) {
      const history = contactsMap[otherUser].history;
      const msgIdx = history.findIndex(m => m.id === snapshot.key);
      
      if (msgIdx !== -1) {
        const oldRead = history[msgIdx].read;
        const newRead = data.read;
        
        // Update local object
        history[msgIdx] = { ...data, id: snapshot.key };
        
        // If message was marked as read remotely, update local counts
        if (!oldRead && newRead && data.receiver === myUsername) {
          if (contactsMap[otherUser].unread > 0) {
             contactsMap[otherUser].unread--;
             unreadCount = Math.max(0, unreadCount - 1);
             console.log(`[Messaging] Message marked read remotely. New unreadCount: ${unreadCount}`);
             updateUnreadBadges();
          }
        }
      }
    }
  });

  // Start background fallback poll (every 2 minutes)
  setInterval(syncUnreadCountFromDb, 120000);
  // Perform initial sync on startup
  setTimeout(syncUnreadCountFromDb, 5000);
}

function initUserMessaging() {
  if (!userDb || userChatInitialized) return;
  
  const widget = document.getElementById('fb-chat-widget');
  if (!widget) return;
  userChatInitialized = true;
  
  const header = document.getElementById('fb-chat-header');
  const body = document.getElementById('fb-chat-body');
  const toggleIcon = document.getElementById('fb-chat-toggle-icon');
  
  const contactsList = document.getElementById('fb-chat-contacts');
  const conversation = document.getElementById('fb-chat-conversation');
  const activeUserEl = document.getElementById('fb-chat-active-user');
  const messagesDiv = document.getElementById('fb-chat-messages');
  const form = document.getElementById('fb-chat-form');
  const input = document.getElementById('fb-chat-input');
  const backBtn = document.getElementById('fb-chat-back-btn');
  const unreadBadge = document.getElementById('fb-chat-unread');
  
  let isWidgetOpen = false;
  // activeChatUser and unreadCount moved to shared scope
  
  const sessionData = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (sessionData) {
    try { myUsername = JSON.parse(sessionData).username || 'Unknown'; } catch(e) {}
  }
  const sessionData2 = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
  if (sessionData2) { try { myUsername = JSON.parse(sessionData2).username || 'Unknown'; } catch(e) {} }
  if (myUsername === 'Unknown') {
    widget.style.display = 'none'; // hide if not logged in
    return;
  }
  
  // UI Setup
  const contactHeader = document.createElement('div');
  contactHeader.style.cssText = 'padding:10px; border-bottom:1px solid #e2e8f0; background:#f1f5f9; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;';
  contactHeader.textContent = 'Available Users';
  contactsList.appendChild(contactHeader);
  
  const contactItems = document.createElement('div');
  contactsList.appendChild(contactItems);
  

  
  // 1. Fetch Users From Spreadsheet GAS
  fetchSpreadsheetUsers();

  // 2. Presence System Overlay
  const connectedRef = ref(userDb, '.info/connected');
  const myPresenceRef = ref(userDb, `presence/${myUsername}`);
  
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(myPresenceRef).remove();
      set(myPresenceRef, { status: 'online', timestamp: serverTimestamp() });
    }
  });

  // Listen for online status updates
  const presenceRef = ref(userDb, 'presence');
  onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() || {};
    
    // Read online users
    for (const [user, info] of Object.entries(data)) {
      if (user !== myUsername && info.status === 'online') {
        if (!contactsMap[user]) {
          contactsMap[user] = { unread: 0, el: null, history: [], isOnline: true };
        } else {
          contactsMap[user].isOnline = true;
        }
        renderContact(user, true); // Mark online
      }
    }
    
    // Update users who went offline
    for (const user in contactsMap) {
      if (!data[user] || data[user].status !== 'online') {
         contactsMap[user].isOnline = false;
         renderContact(user, false); // Mark offline but KEEP in UI list
      }
    }
  });
  
  header.addEventListener('click', (e) => {
    if (e.target.closest('#fb-chat-toggle-btn') || e.target === header || header.contains(e.target)) {
      isWidgetOpen = !isWidgetOpen;
      body.classList.toggle('hidden', !isWidgetOpen);
      if (isWidgetOpen) {
        toggleIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
      } else {
        toggleIcon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
      }
    }
  });
  
  backBtn.addEventListener('click', () => {
    activeChatUser = null;
    conversation.classList.add('hidden');
    contactsList.classList.remove('hidden');
  });
  
  // This listener is now moved to the shared scope to support both UIs

  
  function renderContact(username, isOnline = true) {
    window.renderContact = renderContact;

    let div = contactsMap[username].el;
    if (!div) {
      div = document.createElement('div');
      div.className = 'fb-chat-contact';
      div.onclick = () => openConversation(username);
      contactItems.insertBefore(div, contactItems.firstChild);
      contactsMap[username].el = div;
    }
    const unread = contactsMap[username].unread || 0;
    
    const statusIndicator = isOnline 
       ? '<span style="display:inline-block; width:8px; height:8px; background:#16a34a; border-radius:50%; margin-right:8px; box-shadow:0 0 4px #16a34a;"></span>'
       : '<span style="display:inline-block; width:8px; height:8px; background:#94a3b8; border-radius:50%; margin-right:8px;"></span>';
    
    const user = contactsMap[username];
    const displayName = user.displayName || username;
    const initial = displayName.charAt(0).toUpperCase();
    const profilePicHtml = user.profilePic && user.profilePic.startsWith('http')
      ? `<img src="${user.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
      : `<span>${initial}</span>`;
    
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
         <div style="width:32px; height:32px; border-radius:50%; background:#003366; color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem; flex-shrink:0; overflow:hidden;">
           ${profilePicHtml}
         </div>
         ${statusIndicator}
         <div class="fb-chat-contact-name">${escapeHtml(displayName)}</div>
      </div>
      ${unread > 0 ? `<div class="fb-chat-contact-unread">${unread}</div>` : ''}
    `;
    
    // Ensure the element is in the correct container
    if (div.parentNode !== contactItems) {
      contactItems.insertBefore(div, contactItems.firstChild);
    }
  }
  
  // Global updateUnreadBadges handles these now
  
  function openConversation(username) {
    activeChatUser = username;
    activeUserEl.textContent = username;
    contactsList.classList.add('hidden');
    conversation.classList.remove('hidden');
    messagesDiv.innerHTML = '';
    
    markMessagesAsRead(username);
    
    // Render past messages
    contactsMap[username].history.forEach(msg => {
      renderMessage(msg, msg.sender === myUsername);
    });
    
    // Scroll to bottom
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 10);
  }
  
  function renderMessage(data, isMe) {
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
    
    messagesDiv.appendChild(bubble);
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 10);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text && activeChatUser) {
      push(baseRef, {
        sender: myUsername,
        receiver: activeChatUser,
        text: text,
        timestamp: serverTimestamp(),
        read: false
      }).catch(err => console.error("Send failed:", err));
      input.value = '';
    }
  });
}

// Call on startup

window.addEventListener('DOMContentLoaded', () => {
    initUserMessaging();
    initSharedMessaging(); // Initialize the universal listener
    setTimeout(initFullMessenger, 2000); // Give Firebase a moment to sync
    initLpActivities(); // Load dynamic landing page activities (public)
    initLpDocuments();  // Load dynamic landing page documents (public)
});




// --- FULL PAGE MESSENGER LOGIC ---

function initFullMessenger() {

  window.toggleMessengerMobile = function(active) {
    const container = document.querySelector('.messenger-container');
    if(container) {
      if(active) container.classList.add('chat-active');
      else container.classList.remove('chat-active');
    }
  };

  const container = document.querySelector('.messenger-container');
  if(!container || !userDb) return;

  const contactsList = document.getElementById('messenger-contacts');
  const chatView = document.getElementById('messenger-chat-view');
  const emptyView = document.getElementById('messenger-empty');
  const messagesDiv = document.getElementById('messenger-messages');
  const form = document.getElementById('messenger-form');
  const input = document.getElementById('messenger-input');
  const activeCountEl = document.getElementById('active-count');
  
  const activeName = document.getElementById('active-chat-name');
  const activeAvatar = document.getElementById('active-avatar');
  const activeStatus = document.getElementById('active-chat-status');

  // activeMessengerUser is now in shared scope

  
  // Immediate initial render
  setTimeout(() => {
    fetchSpreadsheetUsers();
    renderFullContacts();
    
    // AUTO-SELECT: Find the user with the most recent message
    setTimeout(() => {
      let latestUser = null;
      let latestTime = 0;
      
      for (const user in contactsMap) {
        const history = contactsMap[user].history || [];
        if (history.length > 0) {
          const lastMsgTime = new Date(history[history.length - 1].timestamp).getTime();
          if (lastMsgTime > latestTime) {
            latestTime = lastMsgTime;
            latestUser = user;
          }
        }
      }
      
      if (latestUser) {
        selectContact(latestUser);
      }
    }, 1000); // Give time for history to populate
  }, 500);


  // Sync loop for UI
  setInterval(() => {
     if (document.getElementById('messages').classList.contains('active') || document.getElementById('messages').style.display !== 'none') {
        renderFullContacts();
        updateActiveStats();
     }
  }, 3000);

  function updateActiveStats() {
    let count = 0;
    for (const u in contactsMap) { if(contactsMap[u].isOnline) count++; }
    if(activeCountEl) activeCountEl.textContent = count;
  }

  function renderFullContacts() {
    if(!contactsList) return;
    const scrollPos = contactsList.scrollTop;
    contactsList.innerHTML = '';
    
    // FILTER: Only show users with history OR forced active
    const sorted = Object.keys(contactsMap).filter(user => {
       const info = contactsMap[user];
        const hasHistory = info.history && info.history.length > 0;
        return hasHistory || user === activeMessengerUser;
     }).sort((a,b) => {
        const aOnline = contactsMap[a].isOnline ? 1 : 0;
        const bOnline = contactsMap[b].isOnline ? 1 : 0;
        return bOnline - aOnline;
     });

     if (sorted.length === 0) {
       contactsList.innerHTML = '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:0.8rem;">No conversations yet.<br>Click "+" to start one.</div>';
       return;
     }

sorted.forEach(user => {
      const info = contactsMap[user];
      const card = document.createElement('div');
      card.className = `contact-card ${activeMessengerUser === user ? 'active' : ''}`;
      card.onclick = () => selectContact(user);

      const displayName = info.displayName || user;
      const initial = displayName.charAt(0).toUpperCase();
      const profilePicHtml = info.profilePic && info.profilePic.startsWith('http')
        ? `<img src="${info.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
        : `<span>${initial}</span>`;

      const lastMsg = info.history && info.history.length > 0 ? info.history[info.history.length-1].text : 'No messages yet';
      const unread = info.unread || 0;

      card.innerHTML = `
        <div class="contact-avatar">
          ${profilePicHtml}
          <span class="contact-status-dot ${info.isOnline ? 'online' : ''}"></span>
        </div>
        <div class="contact-info">
          <span class="contact-name">${displayName}</span>
          <span class="contact-preview">${lastMsg}</span>
        </div>
        ${unread > 0 ? `<span class="unread-count">${unread}</span>` : ''}
      `;
      contactsList.appendChild(card);
    });
    contactsList.scrollTop = scrollPos;
  }

  function selectContact(user) {
    activeMessengerUser = user;
    window.activeMessengerUser = user;
    if(emptyView) emptyView.style.display = 'none';
    if(chatView) chatView.classList.remove('hidden');
    
    // Update Header
    const info = contactsMap[user];
    const displayName = info ? (info.displayName || user) : user;
    if(activeName) activeName.textContent = displayName;
    if(activeAvatar) {
      const initial = displayName.charAt(0).toUpperCase();
      if (info && info.profilePic && info.profilePic.startsWith('http')) {
        activeAvatar.innerHTML = `<img src="${info.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      } else {
        activeAvatar.textContent = initial;
      }
    }
    if(activeStatus) {
      const isOnline = info ? info.isOnline : false;
      activeStatus.textContent = isOnline ? 'Active Now' : 'Offline';
      activeStatus.className = isOnline ? 'status-online' : 'status-offline';
    }

    // Badge Sync Logic
    markMessagesAsRead(user);
    
    // Cross-sync with side chat
    activeChatUser = user; 


    renderFullMessages();
    renderFullContacts();
    if(window.toggleMessengerMobile) window.toggleMessengerMobile(true);
  }

  function renderFullMessages() {
    if(!activeMessengerUser || !messagesDiv) return;
    messagesDiv.innerHTML = '';
    const history = contactsMap[activeMessengerUser] ? (contactsMap[activeMessengerUser].history || []) : [];
    
    console.log(`[Messenger] Rendering ${history.length} messages for ${activeMessengerUser}`);

    history.forEach(data => {
      const isMe = data.sender === myUsername;
      const bubble = document.createElement('div');
      bubble.className = `msg-bubble ${isMe ? 'msg-bubble-me' : 'msg-bubble-other'}`;
      const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
      bubble.innerHTML = `
        <div class="msg-text">${data.text || ''}</div>
        <span class="msg-time">${time}</span>
      `;
      messagesDiv.appendChild(bubble);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Create fixed global hook
  window.refreshFullMessengerUI = renderFullMessages;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text && activeMessengerUser) {
      // Re-read identity
      if (myUsername === 'Unknown') {
        try {
          const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
          if (raw) { const p = JSON.parse(raw); if (p && p.username) myUsername = p.username; }
        } catch(e) {}
      }
      if (myUsername === 'Unknown') {
        console.warn('[Messenger] Cannot send: identity unknown.');
        return;
      }
      const baseRef = ref(userDb, 'user_messages');
      push(baseRef, {
        sender: myUsername,
        receiver: activeMessengerUser,
        text: text,
        timestamp: serverTimestamp(),
        read: false
      });
      input.value = '';
      setTimeout(renderFullMessages, 100);
    }
  });

  // Global onChildAdded listener in Shared Scope handles this now

  window.openNewMessageModal = async function() {
    const modal = document.getElementById('new-message-modal');
    const list = document.getElementById('all-users-list');
    const search = document.getElementById('user-search-input');
    if(!modal || !list) return;
    modal.style.display = 'flex';
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#64748b;">Loading users...</div>';
    await fetchSpreadsheetUsers();
    
    const renderModalList = (filter = '') => {
      list.innerHTML = '';
      Object.keys(contactsMap).sort().forEach(user => {
        if(user === myUsername) return;
        if(filter && !user.toLowerCase().includes(filter.toLowerCase())) return;
        
        const item = document.createElement('div');
        item.style.cssText = "padding:12px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:12px;";
        item.onmouseover = () => item.style.background = "#f8fafc";
        item.onmouseout = () => item.style.background = "transparent";
        const info = contactsMap[user];
        const displayName = info.displayName || user;
        const initial = displayName.charAt(0).toUpperCase();
        const avatarHtml = info.profilePic && info.profilePic.startsWith('http')
          ? `<img src="${info.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
          : `<span>${initial}</span>`;

        item.innerHTML = `
          <div style="width:36px; height:36px; background:#003366; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:800; flex-shrink:0; overflow:hidden;">${avatarHtml}</div>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:700; color:#1e293b;">${displayName}</span>
            <span style="font-size:0.7rem; color:#94a3b8;">${info.isOnline ? 'Online' : 'Offline'}</span>
          </div>
        `;
        item.onclick = () => { selectContact(user); closeNewMessageModal(); };
        list.appendChild(item);
      });
    };
    search.oninput = (e) => renderModalList(e.target.value);
    renderModalList();
    search.focus();
  };

  window.closeNewMessageModal = function() {
    const modal = document.getElementById('new-message-modal');
    if(modal) modal.style.display = 'none';
  };
}


// --- CLOUDINARY CONFIGURATION ---
// Get these from your Cloudinary Dashboard: https://cloudinary.com/console
const CLOUDINARY_CLOUD_NAME = window.ENV?.CLOUDINARY_CLOUD_NAME || ""; // e.g. "yourname"
const CLOUDINARY_UPLOAD_PRESET = window.ENV?.CLOUDINARY_UPLOAD_PRESET || ""; // e.g. "sas_uploads" (Must be Unsigned)

// Load YouTube IFrame APIs
if (!window.YT) {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Global TV Settings State
let tvAudioEnabled = localStorage.getItem('sas_tv_audio_enabled') === 'true';
let tvTheaterEnabled = localStorage.getItem('sas_tv_theater_enabled') === 'true'; // Default to non-fullscreen for VIDEOS

// Offline banner — automatically shown/hidden based on connectivity
(function () {
  const banner = document.getElementById('offline-banner');
  function updateBanner() {
    if (banner) banner.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner(); // Check immediately on page load
})();

  // --- AUTO-UPDATE LOGIC ---
  // Periodically check for new versions on the server to bypass aggressive caching
  async function checkForUpdates() {
    try {
      // Use timestamp query param to bypass middle-man caches
      const response = await fetch('version.json?t=' + new Date().getTime());
      if (!response.ok) return;
      
      const data = await response.json();
      const localVersion = localStorage.getItem('sas_app_version');

      if (localVersion && localVersion !== data.version) {
        console.log(`[Update] New version ${data.version} found! (Local: ${localVersion})`);
        localStorage.setItem('sas_app_version', data.version);
        
        // Brief delay to allow console logs to be seen, then hard refresh
        setTimeout(() => {
          window.location.reload(true);
        }, 1000);
      } else {
        localStorage.setItem('sas_app_version', data.version);
      }
    } catch (err) {
      console.warn("Update check failed (likely offline):", err);
    }
  }

  // Initial check on startup
  checkForUpdates();
  // Check every 60 minutes
  setInterval(checkForUpdates, 3600000);
  
  // 12-HOUR PERIODIC AUTO-RELOAD (For TV stability)
  setInterval(() => {
    const isTv = document.body.classList.contains('tv-mode');
    const modalOpen = document.getElementById('add-post-modal') && !document.getElementById('add-post-modal').classList.contains('hidden');
    
    // Only reload if in TV mode and NOT currently editing a post OR if it's 3 AM-ish (quiet time)
    if (isTv && !modalOpen) {
      console.log("[Maintenance] Performing scheduled 12-hour hard reset...");
      window.location.reload();
    }
  }, 12 * 60 * 60 * 1000); 

console.log('--- SAS APP LOADING (v11 + Sidebar Fix) ---');
document.addEventListener('DOMContentLoaded', () => {

  // --- TV Clock Logic ---
  // Utility to extract Drive ID
  function getDriveId(url) {
    if (!url) return null;
    const match = url.match(/[?&]id=([^&#]+)/) || url.match(/\/file\/d\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function getYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  let fbInitPromise = null;
  window.fbPlayers = {};
  // --- GLOBAL HELPERS FOR MEDIA SCOPES ---
  function getScopedElements(scope) {
    return {
      previewGroup: document.getElementById(`${scope}-img-preview-group`),
      previewImg: document.getElementById(`${scope}-preview-img`),
      previewContainer: document.getElementById(`${scope}-preview-container`),
      previewWrapper: document.getElementById(`${scope}-preview-transform-wrapper`),
      videoGroup: document.getElementById(`${scope}-video-settings-group`),
      videoPlayer: document.getElementById(`${scope}-video-preview-player`),
      videoIframe: document.getElementById(`${scope}-video-preview-iframe-wrapper`),
      zoomSlider: document.getElementById(`${scope}-img-zoom`),
      zoomVal: document.getElementById(`${scope}-preview-zoom-val`),
      resetBtn: document.getElementById(`${scope}-preview-reset-btn`),
      posInput: document.getElementById(`${scope}-img-pos`),
      sizeInput: document.getElementById(`${scope}-img-size-val`),
      coordsDisplay: document.getElementById(`${scope}-preview-coords`),
      // Video range elements
      vStartDisplay: document.getElementById(`${scope}-video-start-display`),
      vEndDisplay: document.getElementById(`${scope}-video-duration-display`),
      vSliderStart: document.getElementById(`${scope}-video-slider-start`),
      vSliderEnd: document.getElementById(`${scope}-video-slider-end`),
      vStartHidden: document.getElementById(`${scope}-video-start`),
      vEndHidden: document.getElementById(`${scope}-video-end`)
    };
  }

  const transformStates = {
    upload: { zoom: 1, x: 0, y: 0 },
    url: { zoom: 1, x: 0, y: 0 }
  };

  function updateTransform(scope, zoom, x, y) {
    const els = getScopedElements(scope);
    const state = transformStates[scope];
    if (!els.previewWrapper || !state) return;
    
    if (zoom !== undefined) state.zoom = zoom;
    if (x !== undefined) state.x = x;
    if (y !== undefined) state.y = y;
    
    els.previewWrapper.style.transform = `scale(${state.zoom}) translate(${state.x}%, ${state.y}%)`;
    const posStr = `${Math.round(state.x)}%, ${Math.round(state.y)}%`;

    if (els.posInput) els.posInput.value = `${state.x} ${state.y}`;
    if (els.sizeInput) els.sizeInput.value = state.zoom;
    if (els.coordsDisplay) els.coordsDisplay.textContent = posStr;
  }
  window.updateTransform = updateTransform;

  function initFbSdk() {
    if (fbInitPromise) return fbInitPromise;
    
    fbInitPromise = new Promise((resolve) => {
      if (window.FB) {
         resolve();
         return;
      }
      
      window.fbAsyncInit = function() {
        FB.init({ xfbml: true, version: 'v19.0' });
        FB.Event.subscribe('xfbml.ready', function(msg) {
          if (msg.type === 'video') {
            window.fbPlayers[msg.id] = msg.instance;
            const el = document.getElementById(msg.id);
            if (el && el.closest('.home-news-slide.is-active')) {
              try {
                 if (window.tvAudioEnabled) msg.instance.unmute();
                 else msg.instance.mute();
                 msg.instance.play();
              } catch(e) {}
            }
          }
        });
        resolve();
      };
      
      const js = document.createElement('script');
      js.id = 'facebook-jssdk';
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(js);
    });
    
    return fbInitPromise;
  }

  function getFacebookVideoUrl(url) {
    if (!url) return null;
    const urlLower = url.toLowerCase();
    // Support full URLs, mobile URLs, IDs, and paths
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fb.com') || urlLower.includes('/videos/') || urlLower.includes('watch?v=')) {
      let fbHref = url;
      
      // Try to normalize to a very standard format if possible
      const vMatch = url.match(/[?&]v=([^&#]+)/) || url.match(/\/videos\/([^/?#]+)/) || url.match(/\/reel\/([^/?#]+)/);
      if (vMatch) {
         fbHref = `https://www.facebook.com/video.php?v=${vMatch[1]}`;
      } else if (url.startsWith('/')) {
         fbHref = 'https://www.facebook.com' + url;
      } else if (!url.includes('://')) {
         fbHref = 'https://www.facebook.com/' + url;
      }

      return fbHref; // Return raw URL for FB SDK
    }
    return null;
  }

  class DigitCounter {
    constructor(parent, initialValue = '0') {
      this.parent = parent;
      this.currentValue = null; // Set to null to force first update
      this.element = this.createDigitElement();
      this.parent.appendChild(this.element);
      this.container = this.element.querySelector('.counter-column-container');
      this.update(initialValue); // Apply initial position
    }

    createDigitElement() {
      const wrapper = document.createElement('div');
      wrapper.className = 'counter-column-wrapper';
      const container = document.createElement('div');
      container.className = 'counter-column-container';

      // Create digits 0-9
      for (let i = 0; i <= 9; i++) {
        const digit = document.createElement('div');
        digit.className = 'counter-digit';
        digit.textContent = i;
        container.appendChild(digit);
      }

      wrapper.appendChild(container);
      return wrapper;
    }

    update(newValue) {
      // Check for height change as well as value change
      const isImmersive = document.body.classList.contains('tv-mode') || 
                          document.body.classList.contains('fullscreen-active') || 
                          document.body.classList.contains('video-fullscreen-active');
      const digitHeight = isImmersive ? 40 : 60;
      
      if (this.currentValue === newValue && this.lastHeight === digitHeight) return;
      
      this.currentValue = newValue;
      this.lastHeight = digitHeight;
      
      const offset = -parseInt(newValue, 10) * digitHeight;
      this.container.style.transform = `translateY(${offset}px)`;
    }
  }

  let digitCounters = [];

  function updateClock() {
    const clock = document.getElementById('tv-clock');
    const timeEl = document.getElementById('tv-time');
    const dateEl = document.getElementById('tv-date');
    if (!clock || !timeEl || !dateEl) return;

    const now = new Date();

    // Format: "09:41 AM"
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Split into characters: ["0", "9", ":", "4", "1", " ", "A", "M"]
    const chars = timeStr.split('');

    // Initialize counters if they don't exist
    if (digitCounters.length === 0) {
      timeEl.innerHTML = '';
      chars.forEach(char => {
        if (/\d/.test(char)) {
          digitCounters.push(new DigitCounter(timeEl, char));
        } else {
          const sep = document.createElement('div');
          sep.className = 'counter-separator';
          sep.textContent = char;
          timeEl.appendChild(sep);
          digitCounters.push({ update: (val) => { sep.textContent = val; } });
        }
      });
    }

    // Update existing counters
    chars.forEach((char, i) => {
      if (digitCounters[i]) {
        digitCounters[i].update(char);
      }
    });

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    dateEl.textContent = dateStr;

    // --- New Header Clock Sync ---
    const headerTime = document.getElementById('header-time-val');
    const headerDate = document.getElementById('header-date-val');
    if (headerTime) headerTime.textContent = timeStr.replace(/^0/, ''); // "9:41 AM"
    if (headerDate) {
      const shortDay = now.toLocaleDateString('en-US', { weekday: 'short' });
      const shortMonth = now.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = now.getDate();
      headerDate.textContent = `${shortDay}, ${shortMonth} ${dayNum}`;
    }
  }

  async function updateWeather() {
    const weatherEl = document.getElementById('tv-weather');
    if (!weatherEl) return;

    try {
      // Coordinates for Manolo Fortich, Bukidnon
      const lat = 8.3569;
      const lon = 124.8622;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

      const response = await fetch(url);
      const data = await response.json();

      if (data && data.current) {
        const temp = Math.round(data.current.temperature_2m);
        weatherEl.innerHTML = `<span class="weather-temp">${temp}°C</span>`;
      }
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }
  }

  updateClock();
  updateWeather();
  setInterval(updateClock, 1000);
  setInterval(updateWeather, 1800000); // 30 minutes

  const navDynamic = document.getElementById('nav-dynamic');
  const statSystems = document.getElementById('stat-systems');
  const homePage = document.getElementById('home');
  const loadingPage = document.getElementById('loading');
  const systemViewPage = document.getElementById('system-view');
  const systemFrame = document.getElementById('system-frame');
  const sidebar = document.querySelector('.sidebar');
  const navToggle = document.getElementById('nav-toggle');
  const navOverlay = document.getElementById('nav-overlay');

  // Landing Page Elements
  const landingPage = document.getElementById('landing-page');
  const lpLoginBtn = document.getElementById('lp-login-btn');
  const lpMobileToggle = document.getElementById('lp-mobile-toggle');
  const lpNavLinks = document.getElementById('lp-nav-links');

  // Landing Page variables moved to appropriate scopes or hoisted functions

  // Initialize Landing Page UI
  if (landingPage) {
    lpLoginBtn?.addEventListener('click', () => {
      window.location.hash = 'login';
      if (loginOverlay) loginOverlay.classList.remove('hidden');
    });

    lpMobileToggle?.addEventListener('click', () => {
      lpNavLinks?.classList.toggle('active');
    });

    // Smooth scroll for LP links
    lpNavLinks?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('#lp-')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            lpNavLinks.classList.remove('active');
          }
        }
      });
    });
  }

  window.showLandingPage = showLandingPage;
  window.hideLandingPage = hideLandingPage;

  // New UI elements for login/user menu
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenuDropdown = document.getElementById('user-menu-dropdown');
  const userDisplayName = document.getElementById('user-display-name');
  const userDropdownName = document.getElementById('user-dropdown-name');
  const logoutBtn = document.getElementById('logout-btn');

  const btnSidebarToggle = document.getElementById('sidebar-toggle');
  const btnAdminExitTv = document.getElementById('admin-exit-tv');

  function showLandingPage() {
    const lp = document.getElementById('landing-page');
    const lo = document.getElementById('login-overlay');
    const sb = document.querySelector('.sidebar');
    const ct = document.querySelector('.content');
    if (lp) {
      lp.classList.remove('hidden');
      document.body.classList.add('lp-mode');
      if (sb) sb.classList.add('hidden');
      if (ct) ct.classList.add('hidden');
      if (lo) lo.classList.add('hidden');
    }
  }

  function hideLandingPage() {
    const lp = document.getElementById('landing-page');
    const sb = document.querySelector('.sidebar');
    const ct = document.querySelector('.content');
    if (lp) {
      lp.classList.add('hidden');
      document.body.classList.remove('lp-mode');
      if (sb && !document.body.classList.contains('tv-mode')) sb.classList.remove('hidden');
      if (ct) ct.classList.remove('hidden');
    }
  }

  // TV View Settings (Restore missing definitions)
  const tvSettingsBox = document.getElementById('tv-settings');
  const btnTvAudio = document.getElementById('btn-tv-audio');
  const btnTvTheater = document.getElementById('btn-tv-theater');
  const btnTvHeaderToggle = document.getElementById('btn-tv-header-toggle');

  let tvAudioEnabled = localStorage.getItem('sas_tv_audio_enabled') !== 'false'; // Default to true
  let tvTheaterEnabled = localStorage.getItem('sas_tv_theater_enabled') === 'true'; // Default to false

  // Scroll listener for landing page navbar
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.lp-navbar');
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    if (navbar && document.body.classList.contains('lp-mode')) {
      if (scrollPos > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  let systems = [];
  let systemsLoaded = false;
  let systemsPromise = null;
  let ytPlayers = {}; // Persistent store for YT players
  let globalCarouselTimer = null;
  let globalSlideGeneration = 0;
  // Messaging state moved to top level
;

  // TV Carousel State Exporters (for toggle responsiveness)
  window.currentTvSlide = 0;
  window.setTvActiveSlide = null;

  // Sidebar Collapse Persistence
  const isSidebarCollapsed = localStorage.getItem('sas_sidebar_collapsed') === 'true';
  if (isSidebarCollapsed && sidebar) {
    sidebar.classList.add('collapsed');
  }

  // Global TV Permanent URL & Duration Sync (via Firebase)
  window.tvPermanentUrl = "";
  window.tvPermanentDuration = 60; // Default 60s
  if (userDb) {
    const permUrlRef = ref(userDb, 'config/tv_permanent_url');
    onValue(permUrlRef, (snapshot) => {
      const globalUrl = snapshot.val();
      if (globalUrl !== window.tvPermanentUrl) {
        window.tvPermanentUrl = globalUrl || "";
        console.log("Global TV URL Updated:", window.tvPermanentUrl);
        // Force a re-render if we are in a state that shows posts
        if (typeof fetchPosts === 'function') fetchPosts();
      }
    });

    const permDurRef = ref(userDb, 'config/tv_permanent_duration');
    onValue(permDurRef, (snapshot) => {
      const globalDur = snapshot.val();
      if (globalDur !== null && globalDur !== window.tvPermanentDuration) {
        window.tvPermanentDuration = parseInt(globalDur) || 60;
        console.log("Global TV Duration Updated:", window.tvPermanentDuration);
        if (typeof fetchPosts === 'function') fetchPosts();
      }
    });
  }

  // --- Smart Cursor Logic (TV Mode) ---
  let lastActivityTime = Date.now();
  
  function updateActivity() {
    lastActivityTime = Date.now();
    if (document.body.classList.contains('tv-mode')) {
      document.body.classList.remove('cursor-none');
    }
  }

  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('mousedown', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('touchstart', updateActivity);
  window.addEventListener('keydown', updateActivity); // Catch keyboard too

  // Continually verify inactivity instead of relying purely on event-driven timeouts
  setInterval(() => {
    if (document.body.classList.contains('tv-mode')) {
      if (Date.now() - lastActivityTime > 5000) {
        document.body.classList.add('cursor-none');
      }
    } else {
      document.body.classList.remove('cursor-none');
    }
  }, 1000);

  // Admin Exit TV Logic
  if (btnAdminExitTv) {
    btnAdminExitTv.addEventListener('click', () => {
      localStorage.removeItem('sas_admin_tv_view');
      document.body.classList.remove('tv-mode');
      document.body.classList.remove('tv-header-collapsed');
      
      window.location.hash = 'home';
      setTimeout(() => {
        window.location.reload();
      }, 50);
    });
  }

  function setActiveNav(item) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (item) item.classList.add('active');
  }

  function showPage(pageId) {
    // Reset active messenger state when navigating away to ensure notifications resume
    if (pageId !== 'messages') {
      activeMessengerUser = null;
      window.activeMessengerUser = null;
    }
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = pageId === 'home'
      ? homePage
      : (pageId === 'loading' ? loadingPage : (pageId === 'system-view' ? systemViewPage : (pageId === 'database' || pageId === 'messages' ? document.getElementById(pageId) : null)));
    if (page) page.classList.add('active');
  }

  function getHashPageId() {
    var hash = (window.location.hash || '#home').replace('#', '');
    if (!hash) return 'home';
    return hash;
  }

  function syncFromHash() {
    if (!systemsLoaded) {
      if (systemsPromise) {
        systemsPromise.then(() => syncFromHash());
      }
      return;
    }
    
    // Check if we should show landing page
    const sessionLP = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data');
    if (!sessionLP) {
      if (window.location.hash === '#login') {
        hideLandingPage();
        const lo = document.getElementById('login-overlay');
        if (lo) lo.classList.remove('hidden');
      } else {
        showLandingPage();
        return;
      }
    } else {
      hideLandingPage();
      const lo = document.getElementById('login-overlay');
      if (lo) lo.classList.add('hidden');
    }

    var pageId = getHashPageId();
    
    // Lock scanner role to #attendance-scanner only
    const sd = localStorage.getItem('sas_user_data');
    if (sd) {
      try {
        const u = JSON.parse(sd);
        
        if (u.role) {
          const r = u.role.toLowerCase();
          if (r === 'scanner' && pageId !== 'attendance-scanner') {
            window.location.hash = 'attendance-scanner';
            return;
          }
          if (r === 'user' && pageId !== 'messages') {
            window.location.hash = 'messages';
            return;
          }
        }

      } catch(e) {}
    }

    if (pageId === 'messages') {
      setActiveNav(document.querySelector('.nav-item[data-page="messages"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('messages');
      return;
    }

    if (pageId === 'database') {
      setActiveNav(document.querySelector('.nav-item[data-page="database"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('database');
      initDatabaseManagement();
      return;
    }

    if (pageId === 'home') {
      setActiveNav(document.querySelector('.nav-item[data-page="home"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('home');
      fetchPosts();
      return;
    }
    
    // Fallback for unauthorized/public hash navigation
    if (!localStorage.getItem('sas_user_data') && pageId !== 'login') {
      showLandingPage();
      return;
    }

    var sys = systems.find(function (s) { return s.id === pageId; });
    
    // --- RBAC CHECK ---
    let userRole = 'guest';
    const rbacSession = localStorage.getItem('sas_user_data');
    if (rbacSession) {
      try { userRole = JSON.parse(rbacSession).role; } catch(e) {}
    }

    if (!sys) {
      setActiveNav(document.querySelector('.nav-item[data-page="home"]'));
      document.body.classList.remove('system-mode');
      closeNav();
      if (systemFrame) systemFrame.src = 'about:blank';
      showPage('home');
      return;
    }

    // Determine if user has permission
    const allowedRoles = sys.roles || ['admin'];
    const hasAccess = (userRole === 'superadmin') || allowedRoles.some(r => r.toLowerCase() === (userRole || '').toLowerCase());

    console.log(`[RBAC] User: ${userRole}, System: ${pageId}, Allowed: ${allowedRoles}, Success: ${hasAccess}`);

    if (!hasAccess) {
      console.warn(`[Security] ${userRole} attempted to access restricted system: ${pageId}`);
      showToast(`Access Denied: ${userRole} is not authorized for ${sys.name}`, "error");
      window.location.hash = 'home';
      return;
    }

    // If user navigates to an external system via hash, open it in a new tab
    // and return them to home (so the iframe view isn't used for external apps).
    if (sys.external) {
      window.open(sys.url, '_blank', 'noopener');
      window.location.hash = 'home';
      return;
    }

    var el = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (el) setActiveNav(el);

    document.body.classList.add('system-mode');
    closeNav();
    showPage('system-view');
    if (systemFrame) {
      const glue = sys.url.includes('?') ? '&' : '?';
      const currentUser = JSON.parse(localStorage.getItem('sas_user_data') || '{}').username || 'Unknown';
      systemFrame.src = sys.url + glue + 'portalUser=' + encodeURIComponent(currentUser);
    }
  }

  function openNav() {
    if (!sidebar || !navOverlay || !navToggle) return;
    sidebar.classList.add('is-open');
    navOverlay.hidden = false;
    navToggle.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    if (!sidebar || !navOverlay || !navToggle) return;
    sidebar.classList.remove('is-open');
    navOverlay.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
  }

  function groupBySection(items) {
    var groups = {};
    items.forEach(function (s) {
      var section = s.section || 'Systems';
      if (!groups[section]) groups[section] = [];
      groups[section].push(s);
    });
    return groups;
  }

  function renderNav() {
    const navSession = localStorage.getItem('sas_user_data');
    let userRole = 'guest';

    if (navSession) {
      try {
        const userData = JSON.parse(navSession);
        userRole = userData.role;
      } catch (e) { }
    }
    
    // System Icon Mapping (Lucide-style SVGs)
    const SYSTEM_ICONS = {
      'tv-view': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
      'attendance-scanner': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>`,
      'schedule-manager': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      'foundation-day-attendance': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
      'nbsc-mailer': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2-2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
      'lost-and-found': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      'borrowers-log': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
      'default': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`
    };

    console.log('[Sidebar] User Role:', userRole);
    console.log('[Sidebar] Total Systems in Config:', systems.length);

    // Filter systems based on role
    const allowedSystems = systems.filter(s => {
      // Superadmin bypass: grant access to everything regardless of roles list
      if (userRole === 'superadmin') return true;

      const allowedRoles = s.roles || ['admin'];
      const hasAccess = allowedRoles.some(r => r.toLowerCase() === (userRole || '').toLowerCase());
      return hasAccess;
    });
    console.log('[Sidebar] Allowed Systems for User:', allowedSystems.length);

    var groups = groupBySection(allowedSystems);
    var sectionNames = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });

    let adminTvNav = '';
    if (userRole === 'admin' || userRole === 'superadmin') {
      adminTvNav = `
        <div class="nav-section-label">Admin Tools</div>
        <a href="#home" class="nav-item" id="nav-toggle-tv" data-page="home">
          <span class="nav-icon">${SYSTEM_ICONS['tv-view']}</span>
          <span class="nav-label">TV View</span>
        </a>
      `;
    }

    if (allowedSystems.length === 0 && userRole !== 'admin' && userRole !== 'superadmin') {
      navDynamic.innerHTML = '<div class="nav-section-label">Protected Content</div><div style="padding:10px 16px; font-size:0.85rem; color:var(--text-muted);">Your account has limited access to internal systems. Contact admin for permissions.</div>';
      return;
    }

    navDynamic.innerHTML = adminTvNav + sectionNames
      .map(function (sectionName) {
        var itemsHtml = groups[sectionName]
          .map(function (s) {
            return (
              '<a href="' + (s.external ? s.url : '#' + s.id) + '" class="nav-item" data-page="' + s.id + '"' +
              (s.external ? ' target="_blank" rel="noopener"' : '') + '>' +
              '<span class="nav-icon">' + (SYSTEM_ICONS[s.id] || SYSTEM_ICONS['default']) + '</span><span class="nav-label">' + escapeHtml(s.name) + '</span></a>'
            );
          })
          .join('');
        return '<div class="nav-section-label">' + escapeHtml(sectionName) + '</div>' + itemsHtml;
      })
      .join('');

    // Re-bind listeners
    navDynamic.querySelectorAll('.nav-item').forEach(function (a) {
      if (a.id === 'nav-toggle-tv') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          document.body.classList.add('tv-mode');
          localStorage.setItem('sas_admin_tv_view', 'true');
          if (btnAdminExitTv) btnAdminExitTv.classList.remove('hidden');
          if (navToggle) navToggle.classList.add('hidden'); // Lock down sidebar
          if (tvSettingsBox) tvSettingsBox.classList.remove('hidden');
          window.location.hash = 'home';
          closeNav();
          fetchPosts(); // Trigger carousel
        });
        return;
      }

      if (a.getAttribute('target') !== '_blank') {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.hash = this.getAttribute('data-page');
          closeNav();
        });
      } else {
        a.addEventListener('click', function () { setActiveNav(null); });
      }
    });
  }


  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 4000);
  }
  window.showToast = showToast;

  function showConfirm(title, message, showPassword = false, type = 'info') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const card = modal.querySelector('.modal-card');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const iconEl = document.getElementById('confirm-modal-icon');
      const inputGroup = document.getElementById('confirm-modal-input-group');
      const passwordInput = document.getElementById('confirm-modal-password');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const okBtn = document.getElementById('confirm-modal-ok');

      // Clear previous types
      card.classList.remove('modal-danger', 'modal-warning', 'modal-success', 'modal-info');
      card.classList.add(`modal-${type}`);

      // Set Icon
      const icons = {
        danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      };
      iconEl.innerHTML = icons[type] || icons.info;

      titleEl.textContent = title;
      messageEl.textContent = message;
      passwordInput.value = '';

      if (showPassword) {
        inputGroup.classList.remove('hidden');
      } else {
        inputGroup.classList.add('hidden');
      }

      modal.classList.remove('hidden');
      
      // Accessibility: Autofocus
      if (showPassword) {
        passwordInput.focus();
      } else {
        okBtn.focus();
      }

      const cleanup = (result) => {
        modal.classList.add('hidden');
        cancelBtn.onclick = null;
        okBtn.onclick = null;
        document.removeEventListener('keydown', handleEsc);
        resolve(result);
      };

      const handleEsc = (e) => {
        if (e.key === 'Escape') cleanup(null);
      };
      document.addEventListener('keydown', handleEsc);

      cancelBtn.onclick = () => cleanup(null);
      okBtn.onclick = () => {
        if (showPassword) {
          const pass = passwordInput.value.trim();
          if (!pass) {
            showToast("Password is required", "error");
            passwordInput.focus();
            return;
          }
          cleanup(pass);
        } else {
          cleanup(true);
        }
      };

      // Close on overlay click
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(null);
      };
    });
  }

  // Helper functions for UI state
  function showLoginUI() {
    hideLandingPage(); // Hide landing page when showing login
    document.body.classList.remove('system-mode');
    const lo = document.getElementById('login-overlay');
    if (lo) lo.classList.remove('hidden');
    if (navToggle) navToggle.classList.add('hidden');
    if (userMenuBtn) userMenuBtn.hidden = true;
    const widget = document.getElementById('fb-chat-widget');
    if (widget) widget.classList.add('hidden');
    if (tvSettingsBox) tvSettingsBox.classList.add('hidden');
  }

    
    
function showAppUI(userObj) {
  if (loginOverlay) loginOverlay.classList.add('hidden');
  
  // Apply theme immediately from localStorage or user data
  const theme = userObj?.theme || localStorage.getItem('sas_theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  localStorage.setItem('sas_theme', theme);
  
  if (userObj && userObj.role) {
    const role = userObj.role.toLowerCase();
    document.body.className = document.body.className.replace(/role-\S+/g, '') + ' role-' + role; 
    
    if (role === 'scanner') {
      if (navToggle) navToggle.classList.add('hidden');
      if (userMenuBtn) userMenuBtn.hidden = false;
      if (window.location.hash !== '#attendance-scanner') window.location.hash = 'attendance-scanner';
    } else if (role === 'user') {
      if (navToggle) navToggle.classList.add('hidden');
      if (userMenuBtn) userMenuBtn.hidden = false;
      if (window.location.hash !== '#messages') window.location.hash = 'messages';
    } else {
      if (navToggle) navToggle.classList.remove('hidden');
      if (userMenuBtn) userMenuBtn.hidden = false;
      if (window.location.hash === '#attendance-scanner') {
        window.location.hash = 'home';
      }
    }
  }
    setupUserMenu(userObj);
    finishInit();
    initUserMessaging();
    initLpActivitiesAdmin(userObj); // Admin LP activities management
    initLpDocumentsAdmin(userObj);  // Admin LP documents management
}




  // Check login state on load
  const initialSession = localStorage.getItem('sas_user_data');
  if (initialSession) {
    const userObj = JSON.parse(initialSession);
    hideLandingPage();
    showAppUI(userObj);
  } else {
    // If no session, show landing page unless hash is explicitly #login
    if (window.location.hash === '#login') {
      showLoginUI();
    } else {
      showLandingPage();
    }
  }

  // Function to sync TV UI elements to global state
  function syncTvSettingsUI() {
    if (btnTvAudio) {
      btnTvAudio.classList.toggle('active-setting', tvAudioEnabled);
      if (tvAudioEnabled) {
        btnTvAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`; // Unmuted Icon
      } else {
        btnTvAudio.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`; // Muted Icon
      }
    }
    if (btnTvTheater) {
      btnTvTheater.classList.toggle('active-setting', tvTheaterEnabled);
    }
    if (btnTvHeaderToggle) {
       btnTvHeaderToggle.classList.toggle('active-setting', document.body.classList.contains('tv-header-collapsed'));
    }
  }

  // Initial Sync
  syncTvSettingsUI();

  // Bind TV Settings Toggles
  if (btnTvAudio) {
    btnTvAudio.addEventListener('click', () => {
      tvAudioEnabled = !tvAudioEnabled;
      localStorage.setItem('sas_tv_audio_enabled', tvAudioEnabled);
      syncTvSettingsUI();
      // Apply to any running videos immediately if possible
      if (window.setTvActiveSlide) window.setTvActiveSlide(window.currentTvSlide);
    });
  }

  if (btnTvTheater) {
    btnTvTheater.addEventListener('click', () => {
      tvTheaterEnabled = !tvTheaterEnabled;
      localStorage.setItem('sas_tv_theater_enabled', tvTheaterEnabled);
      syncTvSettingsUI();
      if (window.setTvActiveSlide) window.setTvActiveSlide(window.currentTvSlide);
    });
  }

  if (btnTvHeaderToggle) {
    btnTvHeaderToggle.addEventListener('click', () => {
      const isCollapsed = document.body.classList.toggle('tv-header-collapsed');
      localStorage.setItem('sas_tv_header_collapsed', isCollapsed);
      syncTvSettingsUI();
      // Ensure layout adjusts (if needed for any internal elements)
      window.dispatchEvent(new Event('resize'));
    });
  }

  if (btnSidebarToggle) {
    btnSidebarToggle.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('sas_sidebar_collapsed', isCollapsed);
      // Help any open iframe-based system adapt to the new width
      window.dispatchEvent(new Event('resize'));
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const user = document.getElementById('login-username').value.trim();
      const pass = document.getElementById('login-password').value.trim();
      const btn = loginForm.querySelector('.login-btn');
      const origBtnText = btn.textContent;

      if (user !== '' && pass !== '') {
        btn.textContent = 'Authenticating...';
        btn.disabled = true;
        loginError.classList.add('hidden');

        if (BACKEND_GAS_URL === "YOUR_NEW_BACKEND_GAS_URL_HERE" || !BACKEND_GAS_URL.startsWith("https://")) {
          console.error("[Config Error] window.ENV:", window.ENV);
          loginError.textContent = "Developer Error: Please check your env.js file and ensure BACKEND_GAS_URL is set correctly.";
          loginError.classList.remove('hidden');
          btn.textContent = origBtnText;
          btn.disabled = false;
          return;
        }

        try {
          const formData = new URLSearchParams();
          formData.append('action', 'login');
          formData.append('username', user);
          formData.append('password', pass);

          const r = await fetch(BACKEND_GAS_URL, {
            method: 'POST',
            // Using x-www-form-urlencoded to avoid CORS preflight issues with GAS
            body: formData
          });

          const responseData = await r.json();

          if (responseData.success) {
            // Note: Storing password in localStorage is necessary here to re-authenticate 
            // the 'updateTvSettings' payload against Google Apps Script without a JWT token.
            const sessionObj = { 
              username: responseData.username, 
              role: responseData.role, 
              password: pass,
              displayName: responseData.displayName || responseData.username,
              profilePic: responseData.profilePic || "",
              theme: responseData.theme || "light"
            };
            localStorage.setItem('sas_user_data', JSON.stringify(sessionObj));

            showAppUI(sessionObj);
          } else {
            loginError.textContent = responseData.message || "Invalid credentials.";
            loginError.classList.remove('hidden');
          }
        } catch (err) {
          loginError.textContent = "Check network. Could not connect to Google Servers.";
          loginError.classList.remove('hidden');
          console.error(err);
        } finally {
          btn.textContent = origBtnText;
          btn.disabled = false;
        }
      } else {
        loginError.textContent = "Please fill in all fields.";
        loginError.classList.remove('hidden');
      }
    });
  }

  // Clear unread notifications when clicking the messages button
  const headerMsgBtn = document.getElementById('header-msg-btn');
  if (headerMsgBtn) {
    headerMsgBtn.addEventListener('click', () => {
      if (typeof markAllMessagesAsRead === 'function') {
        markAllMessagesAsRead();
      }
    });
  }

  function finishInit() {
    document.querySelector('.nav-item[data-page="home"]').addEventListener('click', function (e) {
      e.preventDefault();
      document.body.classList.remove('tv-mode');
      localStorage.removeItem('sas_admin_tv_view');
      window.location.hash = 'home';
      closeNav();
      fetchPosts(); // Reload for admin card view
    });

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        if (!sidebar) return;
        if (sidebar.classList.contains('is-open')) closeNav();
        else openNav();
      });
    }

    if (navOverlay) {
      navOverlay.addEventListener('click', closeNav);
    }

    // If user opens a deep link (/#some-system), show loading page until config loads.
    if (getHashPageId() !== 'home') {
      setActiveNav(null);
      showPage('loading');
    }

    // Load config ONCE from window.ENV
    if (!systemsPromise) {
      systemsPromise = new Promise((resolve) => {
        systems = window.ENV?.systems || [];
        systemsLoaded = true;
        
        if (statSystems) statSystems.textContent = systems.length;
        renderNav();
        initPostSetup();
        fetchPosts(); // Load dynamic posts
        syncFromHash();
        resolve(systems);
      });
    }

    // View Mode Toggle Logic
    const viewMenu = document.getElementById('view-menu');
    const viewMenuBtn = document.getElementById('view-menu-btn');
    const viewMenuDropdown = document.getElementById('view-menu-dropdown');
    const viewOptions = document.querySelectorAll('.view-option');
    const postsContainer = document.getElementById('posts-container');

    function setViewMode(mode) {
      if (!postsContainer) return;
      
      // Remove all view classes
      postsContainer.classList.remove('view-xl', 'view-lg', 'view-md', 'view-sm');
      // Add selected view class
      postsContainer.classList.add(`view-${mode}`);
      
      // Update active state in dropdown
      viewOptions.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-view') === mode);
      });
      
      // Update button label text
      const viewLabel = document.getElementById('view-menu-label');
      if (viewLabel) {
        const modeNames = { 'xl': 'Extra Large', 'lg': 'Large', 'md': 'Medium', 'sm': 'Small' };
        viewLabel.textContent = `View: ${modeNames[mode] || mode}`;
      }

      // Persist choice
      localStorage.setItem('sas_post_view_mode', mode);
      
      // Close menu
      if (viewMenu) viewMenu.classList.remove('is-open');
      if (viewMenuBtn) viewMenuBtn.setAttribute('aria-expanded', 'false');
      
      console.log(`[View] Mode set to: ${mode}`);
      
      // Force layout recalculation for any potential issues
      window.dispatchEvent(new Event('resize'));
    }

    if (viewMenuBtn) {
      viewMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = viewMenu.classList.toggle('is-open');
        viewMenuBtn.setAttribute('aria-expanded', isOpen);
      });
    }

    viewOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        setViewMode(opt.getAttribute('data-view'));
      });
    });

    // Close view menu when clicking outside
    document.addEventListener('click', (e) => {
      if (viewMenu && !viewMenu.contains(e.target)) {
        viewMenu.classList.remove('is-open');
        if (viewMenuBtn) viewMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Initialize View Mode
    const savedViewMode = localStorage.getItem('sas_post_view_mode') || 'md';
    setViewMode(savedViewMode);

    // Register listener ONCE globally inside DOMContentLoaded
    if (!window._sas_hash_bound) {
      window.addEventListener('hashchange', syncFromHash);
      window._sas_hash_bound = true;
    }
    
    // Trigger initial check if needed (though it might handle internally by promise)
    syncFromHash();
  }

  function setupUserMenu(userObj) {

    window.appLogout = function() {
      const btn = document.getElementById('logout-btn');
      if (btn) btn.click();
      else {
        // Fallback if button is missing
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    };

    // Adjust UI based on TV Mode
    if (userObj.role === 'tv') {
      document.body.classList.add('tv-mode');
      if (tvSettingsBox) tvSettingsBox.classList.remove('hidden');
      if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
      if (navToggle) navToggle.classList.add('hidden'); // No sidebar toggle for TV Role
      if (sidebar) sidebar.style.display = 'none'; // Explicitly hide sidebar element

      // Persistence for TV Header collapse
      const tvHeaderCollapsed = localStorage.getItem('sas_tv_header_collapsed') === 'true';
      if (tvHeaderCollapsed) {
        document.body.classList.add('tv-header-collapsed');
      }
      if (btnTvHeaderToggle) btnTvHeaderToggle.classList.remove('hidden');
      // Re-sync toggle buttons to reflect persisted state
      syncTvSettingsUI();

      // Attempt actual fullscreen via API explicitly for the TV role
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log("Auto-fullscreen blocked by browser. User gesture needed.");
          });
        }
      } catch (err) { }
    } else if (userObj.role === 'admin' || userObj.role === 'superadmin') {
      const adminTvView = localStorage.getItem('sas_admin_tv_view') === 'true';
      if (adminTvView) {
        document.body.classList.add('tv-mode');
        document.body.classList.remove('dashboard-backdrop');
        if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden'); // Toggle visibility fixed
        if (navToggle) navToggle.classList.add('hidden');
        if (sidebar) sidebar.style.display = 'none';
        if (btnTvHeaderToggle) btnTvHeaderToggle.classList.remove('hidden');
      } else {
        document.body.classList.remove('tv-mode');
        document.body.classList.add('dashboard-backdrop');
        if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
        if (navToggle) navToggle.classList.remove('hidden');
        if (sidebar) sidebar.style.display = '';
        if (btnTvHeaderToggle) btnTvHeaderToggle.classList.add('hidden');
      }
      if (tvSettingsBox) tvSettingsBox.classList.remove('hidden');
      if (btnSidebarToggle) btnSidebarToggle.classList.remove('hidden');
      // Re-sync toggle buttons to reflect persisted state
      syncTvSettingsUI();
    } else {
      // For uploader and others, keep tv-settings hidden
      document.body.classList.remove('tv-mode');
      document.body.classList.add('dashboard-backdrop');
      if (tvSettingsBox) tvSettingsBox.classList.add('hidden');
      if (btnAdminExitTv) btnAdminExitTv.classList.add('hidden');
      if (navToggle) navToggle.classList.remove('hidden');
      if (sidebar) sidebar.style.display = '';
    }

    const navMessages = document.getElementById('nav-messages');
    const navDatabase = document.getElementById('nav-database');
    if (userObj.role === 'admin' || userObj.role === 'superadmin') {
      if (navMessages) {
        navMessages.style.display = 'flex';
        navMessages.classList.remove('hidden');
      }
      initAdminChat();
    } else {
      if (navMessages) {
        navMessages.style.display = 'none';
        navMessages.classList.add('hidden');
      }
    }

    if (userObj.role === 'superadmin') {
      if (navDatabase) {
        navDatabase.style.display = 'flex';
        navDatabase.classList.remove('hidden');
      }
    } else {
      if (navDatabase) {
        navDatabase.style.display = 'none';
        navDatabase.classList.add('hidden');
      }
    }

    const displayName = userDisplayName;
    const dropName = userDropdownName;

    // Check if role is admin and format text
    const displayStr = userObj.username;
    let roleBadge = '';

    if (userObj.role === 'superadmin') {
      roleBadge = '<span style="background:#7c3aed; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">SUPERADMIN</span>';
    } else if (userObj.role === 'admin') {
      roleBadge = '<span style="background:var(--nbsc-gold); color:var(--nbsc-dark); padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">ADMIN</span>';
    } else if (userObj.role === 'uploader') {
      roleBadge = '<span style="background:#3b82f6; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">UPLOADER</span>';
    } else if (userObj.role === 'tv') {
      roleBadge = '<span style="background:#10b981; color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:8px;">TV</span>';

      // Trigger TV Mode DOM manipulation
      const homeTitle = document.querySelector('.home-header-title');
      const homeSub = document.querySelector('.home-header-subtitle');
      if (homeTitle) homeTitle.textContent = "ANNOUNCEMENT";
      if (homeSub) homeSub.style.display = 'none';
    }

    if (displayName) displayName.innerHTML = displayStr;
    if (dropName) dropName.innerHTML = `${displayStr} ${roleBadge}`;

    const userMenu = userMenuDropdown;
    const userBtn = userMenuBtn;

    if (userBtn && userMenu) {
      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        userMenu.classList.toggle('is-open');
      });
      document.addEventListener('click', function (e) {
        if (!userMenu.contains(e.target)) {
          userMenu.classList.remove('is-open');
        }
      });

      // Add Settings button to dropdown
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'user-settings-btn';
      settingsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        Settings
      `;
      settingsBtn.style.cssText = 'width:100%; padding:10px 16px; background:none; border:none; display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.9rem; color:#1e293b; text-align:left;';
      settingsBtn.onmouseover = () => settingsBtn.style.background = '#f1f5f9';
      settingsBtn.onmouseout = () => settingsBtn.style.background = 'transparent';
      settingsBtn.onclick = () => { userMenu.classList.remove('is-open'); openSettingsModal(); };
      
      const divider = document.createElement('div');
      divider.className = 'user-menu-divider';
      
      // Insert before logout button
      if (logoutBtn && logoutBtn.parentNode) {
        logoutBtn.parentNode.insertBefore(settingsBtn, logoutBtn);
        logoutBtn.parentNode.insertBefore(divider, logoutBtn);
      }
    }

    
    
if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies if any
        document.cookie.split(";").forEach((cookie) => {
          document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        // Hide all pages and show loading first to prevent flash of unauthorized content
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const loadingPage = document.getElementById('loading');
        if (loadingPage) loadingPage.classList.add('active');
        // Go to home without hash to prevent loading old content
        window.location.hash = '';
        window.location.reload();
      });
    }

    // Admin/Uploader/Superadmin check for "Add Post" button
    const addPostBtn = document.getElementById('add-post-btn');
    if (addPostBtn && userObj && (userObj.role === 'admin' || userObj.role === 'uploader' || userObj.role === 'superadmin')) {
      addPostBtn.classList.remove('hidden');
    }

    // Superadmin-only: Clear Cache/Data button
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn && userObj && userObj.role === 'superadmin') {
      clearCacheBtn.classList.remove('hidden');
      clearCacheBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm(
          "System Data Reset",
          "This will clear all browser storage (cache, local data, and session). You will be logged out. Continue?"
        );
        if (confirmed) {
          localStorage.clear();
          sessionStorage.clear();
          showToast("All data cleared. Refreshing...", "success");
          setTimeout(() => window.location.reload(), 1000);
        }
      });
    }
  }


  function initPostSetup() {
    const addPostBtn = document.getElementById('add-post-btn');
    const modal = document.getElementById('add-post-modal');
    const cancelBtn = document.getElementById('cancel-post-btn');
    const form = document.getElementById('add-post-form');
    const errorMsg = document.getElementById('post-error');
    const imgInput = document.getElementById('post-img');
    const liveInput = document.getElementById('post-live-url');

    // Video Playback Settings (Global references for convenience where needed)
    const videoStartInput = document.getElementById('post-video-start');
    const videoEndInput = document.getElementById('post-video-end');

    const videoPreviewPlayer = document.getElementById('video-preview-player');
    const videoPreviewIframe = document.getElementById('video-preview-iframe-wrapper');
    const videoPreviewLoading = document.getElementById('video-preview-loading');
    const videoStartDisplay = document.getElementById('video-start-display');
    const videoDurationDisplay = document.getElementById('video-duration-display');
    const sliderStart = document.getElementById('post-video-slider-start');
    const sliderEnd = document.getElementById('post-video-slider-end');
    const durationSlider = document.getElementById('post-display-duration');
    const durationValDisplay = document.getElementById('post-display-duration-val');
    
    if (durationSlider && durationValDisplay) {
      durationSlider.addEventListener('input', (e) => {
        durationValDisplay.textContent = e.target.value + 's';
      });
    }
    
    let videoDuration = 0;
    let previewYtPlayer = null;
    let previewFbPlayer = null;

    function formatTimeObj(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    async function compressImage(file, quality = 0.8, maxWidth = 1920) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
             const canvas = document.createElement('canvas');
             let width = img.width;
             let height = img.height;
             if (width > maxWidth || height > maxWidth) {
                 if (width > height) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                 } else {
                    width = (maxWidth / height) * width;
                    height = maxWidth;
                 }
             }
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, width, height);
             canvas.toBlob((blob) => {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
             }, 'image/jpeg', quality);
          };
        };
      });
    }

    async function uploadToGoogleDrive(file, onProgress) {
      // Note: This requires the GAS backend to have an 'uploadToDrive' action.
      // Since GAS has a 50MB payload limit, we use a simple Base64 approach for now.
      // For > 50MB, a chunked approach in GAS would be needed.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            if (onProgress) onProgress(50); // Simple halfway mark
            const response = await fetch(BACKEND_GAS_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: "uploadToDrive",
                fileName: file.name,
                fileData: base64
              })
            });
            const data = await response.json();
            if (data.success) {
               if (onProgress) onProgress(100);
               resolve({ secure_url: data.url, public_id: "gdrive_" + Date.now() });
            } else {
               reject(new Error(data.message || "Google Drive upload failed"));
            }
          } catch(e) { reject(e); }
        };
        reader.onerror = (e) => reject(e);
      });
    }

    async function uploadFileChunked(file, uploadPreset, cloudName, onProgress) {
      const chunkSize = 6 * 1024 * 1024; // 6MB
      const totalSize = file.size;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      const uniqueUploadId = 'sas_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      let lastResponseData = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'sas_repository');
        
        const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;
        
        if (onProgress) onProgress(Math.round((i / totalChunks) * 100));

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          headers: {
            'X-Unique-Upload-Id': uniqueUploadId,
            'Content-Range': contentRange
          },
          body: formData
        });

        lastResponseData = await response.json();
        if (!response.ok) {
           throw new Error(lastResponseData.error ? lastResponseData.error.message : "Chunked upload failed");
        }
      }
      return lastResponseData;
    }

    function updateDualSliderUI(scope) {
      const els = getScopedElements(scope);
      if (!els.vSliderStart || !els.vSliderEnd) return;
      
      const vDuration = parseFloat(els.vSliderStart.max) || 0;
      let sVal = parseInt(els.vSliderStart.value) || 0;
      let eVal = parseInt(els.vSliderEnd.value) || vDuration;

      if (sVal >= eVal) {
         // Determine which slider was moved (hacky but works if called from input listener)
         // Actually, let's just enforce a 1s difference
         sVal = eVal - 1;
         if (sVal < 0) sVal = 0;
         els.vSliderStart.value = sVal;
      }

      if (els.vStartHidden) els.vStartHidden.value = sVal;
      if (els.vEndHidden) els.vEndHidden.value = eVal;
      if (els.vStartDisplay) els.vStartDisplay.textContent = formatTimeObj(sVal);
      if (els.vEndDisplay) els.vEndDisplay.textContent = formatTimeObj(eVal) + " (Max: " + formatTimeObj(vDuration) + ")";
    }

    function onSliderInput(e) {
      const scope = this.getAttribute('data-scope') || 'upload';
      updateDualSliderUI(scope);
      
      const els = getScopedElements(scope);
      const targetTime = parseInt(this.value);
      if (els.videoPlayer && els.videoPlayer.style.display !== 'none' && isFinite(els.videoPlayer.duration)) {
        els.videoPlayer.currentTime = targetTime;
      } else if (window[`previewYtPlayer_${scope}`] && typeof window[`previewYtPlayer_${scope}`].seekTo === 'function') {
        window[`previewYtPlayer_${scope}`].seekTo(targetTime, true);
      }
    }

    // Attachment helper
    function attachSliderListeners(scope) {
      const els = getScopedElements(scope);
      if (els.vSliderStart) {
        els.vSliderStart.setAttribute('data-scope', scope);
        els.vSliderStart.addEventListener('input', onSliderInput);
      }
      if (els.vSliderEnd) {
        els.vSliderEnd.setAttribute('data-scope', scope);
        els.vSliderEnd.addEventListener('input', onSliderInput);
      }
    }
    attachSliderListeners('upload');
    attachSliderListeners('url');

    // Optimized Google Drive Resumable Upload
  async function uploadToGoogleDriveResumable(file, onProgress) {
      // 1. Get OAuth Token from GAS
      const tokenRes = await fetch(BACKEND_GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "getDriveToken" })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.success || !tokenData.token) throw new Error("Could not get Drive authorization token.");
      const token = tokenData.token;

      // 2. Initiate Resumable Session
      const metadata = {
        name: file.name,
        mimeType: file.type
      };

      const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(metadata)
      });

      if (!initRes.ok) throw new Error("Failed to initiate Google Drive session.");
      const location = initRes.headers.get('Location');

      // 3. Upload File logic using XHR for progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', location, true);
        xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const finalData = JSON.parse(xhr.responseText);
            const fileId = finalData.id;
            
            // 4. Set Public via GAS
            const setPublicRes = await fetch(BACKEND_GAS_URL, {
              method: 'POST',
              body: JSON.stringify({ action: "setFilePublic", fileId: fileId })
            });
            const setPublicData = await setPublicRes.json();
            
            resolve({ 
              secure_url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`, 
              public_id: fileId,
              drivePreviewUrl: setPublicData.url || `https://drive.google.com/file/d/${fileId}/preview`
            });
          } else {
            reject(new Error("Drive upload failed: " + xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during Drive upload."));
        xhr.send(file);
      });
    }

    window.loadPreviewVideo = async function(url, isFile = false, resetValues = true, scope = 'upload') {
       const els = getScopedElements(scope);
       if (!els.videoGroup) return;

       if (els.videoPlayer) els.videoPlayer.style.display = 'none';
       if (els.videoIframe) {
         els.videoIframe.style.display = 'none';
         els.videoIframe.innerHTML = '';
       }
       
       if (resetValues) {
          if (els.vStartHidden) els.vStartHidden.value = '';
          if (els.vEndHidden) els.vEndHidden.value = '';
          if (els.vSliderStart) els.vSliderStart.value = 0;
          if (els.vSliderEnd) els.vSliderEnd.value = 100;
       }

       window[`previewYtPlayer_${scope}`] = null;
       
       const ytId = getYouTubeVideoId(url);
       const fbEmbedUrl = getFacebookVideoUrl(url);
       
       if (ytId && !isFile) {
         if (els.videoIframe) {
           els.videoIframe.style.display = 'block';
           const anchorId = `preview-yt-anchor-${scope}`;
           els.videoIframe.innerHTML = `<div id="${anchorId}"></div>`;
           
           if (window.YT && window.YT.Player) {
              window[`previewYtPlayer_${scope}`] = new YT.Player(anchorId, {
                videoId: ytId,
                playerVars: { controls: 0, disablekb: 1 },
                events: {
                  'onReady': (event) => {
                     const dur = Math.floor(event.target.getDuration());
                     if (els.vSliderStart) els.vSliderStart.max = dur;
                     if (els.vSliderEnd) els.vSliderEnd.max = dur;
                     if (els.vSliderEnd) els.vSliderEnd.value = els.vEndHidden.value || dur;
                     if (els.vSliderStart) els.vSliderStart.value = els.vStartHidden.value || 0;
                     updateDualSliderUI(scope);
                  }
                }
              });
           }
         }
       } else if (fbEmbedUrl && !isFile) {
          await initFbSdk();
          if (els.videoIframe) {
            els.videoIframe.style.display = 'block';
            const fbId = 'fb-preview-' + scope + '-' + Date.now();
            els.videoIframe.innerHTML = `<div id="${fbId}" class="fb-video" data-href="${url}" data-width="auto" data-allowfullscreen="true" data-autoplay="false"></div>`;
            if (window.FB) {
              FB.XFBML.parse(els.videoIframe, () => {
                 // FB preview state management is complex with scopes, omitting for now to keep code lean unless requested
              });
            }
          }
       } else {
         if (els.videoPlayer) {
           els.videoPlayer.style.display = 'block';
           els.videoPlayer.src = url;
           els.videoPlayer.onloadedmetadata = () => {
              const dur = Math.floor(els.videoPlayer.duration);
              if (els.vSliderStart) els.vSliderStart.max = isFinite(dur) ? dur : 100;
              if (els.vSliderEnd) els.vSliderEnd.max = isFinite(dur) ? dur : 100;
              if (els.vSliderEnd) els.vSliderEnd.value = els.vEndHidden.value || dur || 100;
              if (els.vSliderStart) els.vSliderStart.value = els.vStartHidden.value || 0;
              updateDualSliderUI(scope);
           };
         }
       }
    };

    // === UPLOAD TAB SWITCHING ===
    const uploadTabBtns = document.querySelectorAll('.upload-tab');
    const uploadPanels = { 
      upload: document.getElementById('upload-tab-upload'), 
      url: document.getElementById('upload-tab-url'),
      live: document.getElementById('upload-tab-live')
    };
    let activeUploadTab = 'upload'; // Default to file upload

    uploadTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        uploadTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeUploadTab = btn.dataset.tab;
        Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
        if (uploadPanels[activeUploadTab]) uploadPanels[activeUploadTab].classList.remove('hidden');
        
        const scheduleSection = document.getElementById('post-scheduling-section');

        if (activeUploadTab === 'live') {
           if (scheduleSection) scheduleSection.classList.add('hidden');
        } else {
           if (scheduleSection) scheduleSection.classList.remove('hidden');
        }

        // --- RE-TRIGGER PREVIEWS ON TAB SWITCH ---
        if (activeUploadTab === 'url') {
           const urlInput = document.getElementById('post-img');
           if (urlInput && urlInput.value.trim()) {
              urlInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
           }
        } else if (activeUploadTab === 'upload') {
           const fileInput = document.getElementById('post-file');
           if (fileInput && fileInput.files && fileInput.files[0]) {
              handleFileSelection(fileInput.files[0]);
           }
        } else if (activeUploadTab === 'live') {
           const lInput = document.getElementById('post-live-url');
           if (lInput && lInput.value.trim()) {
              lInput.dispatchEvent(new CustomEvent('input', { detail: { keepValues: true } }));
           }
        }
      });
    });

    // === FILE INPUT + DRAG/DROP FEEDBACK ===
    const fileInput = document.getElementById('post-file');
    const fileUploadLabel = document.getElementById('file-upload-label');
    const fileLabelText = document.getElementById('file-label-text');

    function handleFileSelection(file) {
      const els = getScopedElements('upload');
      if (!file) {
        if (fileLabelText) fileLabelText.textContent = 'Choose a file or drag it here';
        if (fileUploadLabel) fileUploadLabel.classList.remove('file-selected');
        const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
        if (iconWrapper) iconWrapper.style.color = '';
        if (els.previewGroup) els.previewGroup.style.display = 'none';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        return;
      }

      if (fileLabelText) fileLabelText.textContent = '✅ ' + file.name;
      if (fileUploadLabel) fileUploadLabel.classList.add('file-selected');
      const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
      if (iconWrapper) iconWrapper.style.color = '#16a34a';

      if (file.type.startsWith('image/')) {
        console.log("FILE PREVIEW: Image detected:", file.name);
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        if (els.previewGroup) {
          els.previewGroup.classList.remove('hidden');
          els.previewGroup.style.setProperty('display', 'block', 'important');
        }

        const reader = new FileReader();
        reader.onerror = (e) => console.error("FILE PREVIEW: Reader error:", e);
        reader.onload = (e) => {
          if (els.previewImg) {
            els.previewImg.src = e.target.result;
            if (els.previewGroup) els.previewGroup.style.setProperty('display', 'block', 'important');
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        console.log("FILE PREVIEW: Video detected:", file.name);
        if (els.previewGroup) els.previewGroup.style.setProperty('display', 'none', 'important');
        if (els.videoGroup) els.videoGroup.style.setProperty('display', 'block', 'important');
        
        const fileURL = URL.createObjectURL(file);
        // We need to tell loadPreviewVideo which scope's elements to use
        if (window.loadPreviewVideo) window.loadPreviewVideo(fileURL, true, true, 'upload');
        if (els.videoGroup && els.videoGroup.scrollIntoView) {
          els.videoGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        if (els.previewGroup) els.previewGroup.style.display = 'none';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
      }
    }

    if (fileInput && fileUploadLabel) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          handleFileSelection(fileInput.files[0]);
        } else {
          handleFileSelection(null); // Clear preview if no file selected
        }
      });


      fileUploadLabel.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        fileUploadLabel.classList.add('drag-over');
      });
      fileUploadLabel.addEventListener('dragleave', () => fileUploadLabel.classList.remove('drag-over'));
      fileUploadLabel.addEventListener('drop', (ev) => {
        ev.preventDefault();
        fileUploadLabel.classList.remove('drag-over');
        if (ev.dataTransfer.files && ev.dataTransfer.files[0]) {
          fileInput.files = ev.dataTransfer.files;
          handleFileSelection(ev.dataTransfer.files[0]);
        }
      });
    }

    if (imgInput) {
      let imgInputTimeout;
      imgInput.addEventListener('input', (e) => {
        const els = getScopedElements('url');
        const runInput = () => {
          const url = imgInput.value.trim();
          if (url) {
            const urlLower = url.toLowerCase();
            const ytId = getYouTubeVideoId(url);
            const fbUrl = getFacebookVideoUrl(url);
            const isDirectVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const isVideo = ytId || fbUrl || isDirectVideo || urlLower.includes('drive.google.com') && (urlLower.includes('video') || !urlLower.includes('image'));
            
            if (isVideo) {
              if (els.previewGroup) els.previewGroup.style.display = 'none';
              if (els.videoGroup) els.videoGroup.style.display = 'block';
              if (window.loadPreviewVideo) {
                 const keep = e.detail && e.detail.keepValues;
                 window.loadPreviewVideo(url, false, !keep, 'url');
                 if (els.videoGroup) els.videoGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } else {
              if (els.videoGroup) els.videoGroup.style.display = 'none';
              if (els.previewImg) {
                 els.previewImg.src = url;
                 const dId = window.getDriveId ? getDriveId(url) : null;
                 if (dId && !url.includes('uc?id=')) {
                    els.previewImg.src = `https://drive.google.com/uc?id=${dId}`;
                 }
              }
              if (els.previewGroup) {
                els.previewGroup.style.setProperty('display', 'block', 'important');
                els.previewGroup.classList.remove('hidden');
                if (els.previewGroup.scrollIntoView) {
                  els.previewGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }
          } else {
            if (els.previewGroup) els.previewGroup.style.display = 'none';
            if (els.videoGroup) els.videoGroup.style.display = 'none';
          }
        };
        clearTimeout(imgInputTimeout);
        if (e.detail && e.detail.keepValues) runInput();
        else imgInputTimeout = setTimeout(runInput, 500);
      });
    }

      ['upload', 'url'].forEach(scope => {
        const els = getScopedElements(scope);
        if (els.previewImg && els.previewGroup) {
          els.previewImg.addEventListener('error', () => {
            console.warn(`${scope} preview failed:`, els.previewImg.src);
          });
          els.previewImg.addEventListener('load', () => {
            els.previewGroup.style.display = 'block';
          });
        }
      });

      if (liveInput) {
        let liveInputTimeout;
        liveInput.addEventListener('input', (e) => {
          const els = getScopedElements('live');
          const runLiveInput = () => {
            const url = liveInput.value.trim();
            if (url) {
              const ytId = getYouTubeVideoId(url);
              const fbUrl = getFacebookVideoUrl(url);
              if (ytId || fbUrl) {
                if (els.videoGroup) els.videoGroup.style.display = 'block';
                if (window.loadPreviewVideo) {
                   const keep = e.detail && e.detail.keepValues;
                   window.loadPreviewVideo(url, false, !keep, 'live');
                }
              } else {
                 if (els.videoGroup) els.videoGroup.style.display = 'none';
              }
            } else {
              if (els.videoGroup) els.videoGroup.style.display = 'none';
            }
          };
          clearTimeout(liveInputTimeout);
          if (e.detail && e.detail.keepValues) runLiveInput();
          else liveInputTimeout = setTimeout(runLiveInput, 500);
        });
      }


      window.setPreviewTransformState = function (zoom, x, y, scope = 'upload') {
        const state = transformStates[scope];
        if (!state) return;
        state.zoom = zoom;
        state.x = x;
        state.y = y;
        
        const els = getScopedElements(scope);
        if (els.zoomSlider) els.zoomSlider.value = zoom;
        if (els.zoomVal) els.zoomVal.textContent = zoom.toFixed(2) + 'x';
        updateTransform(scope);
      };

      function initZoomPanControls(scope) {
        const els = getScopedElements(scope);
        if (els.zoomSlider) {
          els.zoomSlider.addEventListener('input', (e) => {
            transformStates[scope].zoom = parseFloat(e.target.value);
            if (els.zoomVal) els.zoomVal.textContent = transformStates[scope].zoom.toFixed(2) + 'x';
            updateTransform(scope);
          });
        }

        if (els.resetBtn) {
          els.resetBtn.addEventListener('click', () => {
            window.setPreviewTransformState(1, 0, 0, scope);
          });
        }

        if (els.previewContainer) {
          let isDragging = false;
          let startMouseX = 0, startMouseY = 0;
          let initialDragX = 0, initialDragY = 0;

          els.previewContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            initialDragX = transformStates[scope].x;
            initialDragY = transformStates[scope].y;
            els.previewContainer.style.cursor = 'grabbing';
          });

          window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const rect = els.previewContainer.getBoundingClientRect();
            const containerWidth = rect.width || 1;
            const containerHeight = rect.height || 1;
            const state = transformStates[scope];

            const deltaX_px = (e.clientX - startMouseX) / state.zoom;
            const deltaY_px = (e.clientY - startMouseY) / state.zoom;

            state.x = initialDragX + (deltaX_px / containerWidth) * 100;
            state.y = initialDragY + (deltaY_px / containerHeight) * 100;

            updateTransform(scope);
          });

          window.addEventListener('mouseup', () => {
            isDragging = false;
            els.previewContainer.style.cursor = 'grab';
          });
        }
      }

      initZoomPanControls('upload');
      initZoomPanControls('url');
    // --- Centralized Form Reset ---
    window.resetAddPostForm = function() {
      const f = document.getElementById('add-post-form');
      if (f) {
        f.reset();
        f.removeAttribute('data-edit-timestamp');
      }
      
      // Clear Files
      const fileInput = document.getElementById('post-file');
      if (fileInput) fileInput.value = '';

      const scopes = ['upload', 'url', 'live'];
      scopes.forEach(scope => {
        const els = getScopedElements(scope);
        if (els.previewGroup) {
          els.previewGroup.style.display = 'none';
          els.previewGroup.classList.add('hidden');
        }
        if (els.previewImg) els.previewImg.src = '';
        if (els.videoGroup) els.videoGroup.style.display = 'none';
        if (els.videoPlayer) {
          els.videoPlayer.pause();
          els.videoPlayer.src = '';
        }
        if (els.vStartHidden) els.vStartHidden.value = '';
        if (els.vEndHidden) els.vEndHidden.value = '';
        
        // Reset transform state
        if (transformStates[scope]) {
          transformStates[scope] = { zoom: 1, x: 0, y: 0 };
          updateTransform(scope);
        }
      });

      // Clear Upload Tab specific label
      const fileUploadLabel = document.getElementById('file-upload-label');
      const fileLabelText = document.getElementById('file-label-text');
      if (fileUploadLabel) fileUploadLabel.classList.remove('file-selected', 'drag-over');
      if (fileLabelText) fileLabelText.textContent = 'Choose a file or drag it here';
      const iconWrapper = fileUploadLabel ? fileUploadLabel.querySelector('.upload-icon-wrapper') : null;
      if (iconWrapper) iconWrapper.style.color = '';

      // Reset Tabs
      const uploadTabBtns = document.querySelectorAll('.upload-tab');
      uploadTabBtns.forEach(b => b.classList.remove('active'));
      const defaultTabBtn = document.querySelector('.upload-tab[data-tab="upload"]');
      if (defaultTabBtn) defaultTabBtn.classList.add('active');
      activeUploadTab = 'upload';
      const uploadTabsDiv = document.getElementById('upload-tabs');
      if (uploadTabsDiv) uploadTabsDiv.style.display = 'flex';
      
      const uInput = document.getElementById('post-img');
      const uHint = uInput ? uInput.nextElementSibling : null;
      if (uInput) uInput.style.display = 'block';
      if (uHint && uHint.classList.contains('upload-hint')) uHint.style.display = 'block';

      const uploadPanels = { 
        upload: document.getElementById('upload-tab-upload'), 
        url: document.getElementById('upload-tab-url'),
        live: document.getElementById('upload-tab-live')
      };
      Object.values(uploadPanels).forEach(p => p && p.classList.add('hidden'));
      if (uploadPanels['upload']) uploadPanels['upload'].classList.remove('hidden');

      // Reset Submit Button progress and state
      const sBtn = document.getElementById('submit-post-btn');
      if (sBtn) {
        sBtn.classList.remove('active', 'zz-button-progress-done');
        sBtn.style.setProperty('--zz-progress', 0);
        sBtn.setAttribute('data-progress', 0);
        sBtn.disabled = false;
      }

      // Reset Duration Slider
      const dSlider = document.getElementById('post-display-duration');
      const dValDisp = document.getElementById('post-display-duration-val');
      if (dSlider) {
        dSlider.value = 25;
        if (dValDisp) dValDisp.textContent = '25s';
      }
      
      const err = document.getElementById('post-error');
      if (err) err.classList.add('hidden');
    };

    if (addPostBtn && modal) {
      addPostBtn.addEventListener('click', () => {
        window.resetAddPostForm();
        document.querySelector('.modal-title').textContent = "Create New Update";
        document.getElementById('submit-post-btn').textContent = "Post Update";
        modal.classList.remove('hidden');
      });

      cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        window.resetAddPostForm();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sessionData = localStorage.getItem('sas_user_data');
        if (!sessionData) return;

        const activeEls = getScopedElements(activeUploadTab);
        const title = (document.getElementById('post-title').value || '').trim();
        const desc = (document.getElementById('post-desc').value || '').trim();
        const startDate = document.getElementById('post-start-date').value;
        const endDate = document.getElementById('post-end-date').value;
        const displayDuration = parseInt(document.getElementById('post-display-duration').value) || 25;
        const isLive = (activeUploadTab === 'live');

        let imgUrl = "";
        let imgPos = "0 0";
        let imgSize = "1";
        
        const postFileIn = document.getElementById('post-file');
        const file = (activeUploadTab === 'upload' && postFileIn) ? postFileIn.files[0] : null;

        if (activeUploadTab === 'url') {
           imgUrl = imgInput.value.trim();
        } else if (activeUploadTab === 'live') {
           imgUrl = liveInput.value.trim();
        }

        if (activeEls.posInput) imgPos = activeEls.posInput.value || "0 0";
        if (activeEls.sizeInput) imgSize = activeEls.sizeInput.value || "1";

        const startVal = activeEls.vStartHidden ? activeEls.vStartHidden.value : '';
        const endVal = activeEls.vEndHidden ? activeEls.vEndHidden.value : '';
        if (startVal || endVal) {
          imgPos = `${imgPos}|${startVal}|${endVal}`;
        }

        const submitBtn = document.getElementById('submit-post-btn');
        const origText = submitBtn.textContent;
        const zzProgress = {
          start: () => {
             submitBtn.classList.add('active');
             submitBtn.disabled = true;
          },
          update: (pct) => {
             submitBtn.setAttribute('data-progress', Math.round(pct));
             submitBtn.style.setProperty('--zz-progress', pct);
          },
          done: () => {
             return new Promise(resolve => {
                submitBtn.classList.add('zz-button-progress-done');
                setTimeout(resolve, 1000);
             });
          },
          reset: () => {
             submitBtn.classList.remove('active', 'zz-button-progress-done');
             submitBtn.textContent = origText;
             submitBtn.disabled = false;
          }
        };

        if (errorMsg) errorMsg.classList.add('hidden');

        try {
          const userObj = JSON.parse(sessionData);
          const editTimestamp = form.getAttribute('data-edit-timestamp');
          const isEdit = !!editTimestamp;

          const confirmed = await showConfirm(
            isEdit ? "Confirm Edit" : "Confirm Post",
            `Are you sure you want to ${isEdit ? 'update' : 'publish'} this post?`,
            false,
            isEdit ? 'info' : 'success'
          );

          if (!confirmed) return;
          zzProgress.start();

          // Use stored credentials from session
          const userPassword = userObj.password;

          let cloudinaryUrl = imgUrl;
          let cloudinaryPublicId = "";

          // 2. Upload File if needed
          if (activeUploadTab === 'upload' && file) {
            zzProgress.update(10);
            let cloudData;
            // Simplified for brevity, reuse earlier logic
            if (file.size > 10 * 1024 * 1024) {
               cloudData = await uploadFileChunked(file, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME, zzProgress.update);
            } else {
               const fd = new FormData();
               fd.append('file', file);
               fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
               const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: fd });
               cloudData = await res.json();
            }
            if (cloudData && cloudData.secure_url) {
               cloudinaryUrl = cloudData.secure_url;
               cloudinaryPublicId = cloudData.public_id;
            }
          } else if (isEdit && activeUploadTab === 'upload' && !file) {
            // CRITICAL FIX: Preserve existing image data if no new file is uploaded during an edit!
            cloudinaryUrl = form.getAttribute('data-existing-image-url') || "";
            cloudinaryPublicId = form.getAttribute('data-existing-public-id') || "";
            
            // Re-apply existing position/size as well to prevent zoom reset
            if (!imgPos || imgPos === "0 0") imgPos = form.getAttribute('data-existing-pos') || "0 0";
            if (!imgSize || imgSize === "1") imgSize = form.getAttribute('data-existing-size') || "1";
          }

          // 3. Submit Payload
          const payload = {
            action: isEdit ? "editPost" : "addPost",
            username: userObj.username,
            password: userPassword,
            title, description: desc,
            imageUrl: cloudinaryUrl,
            cloudinaryPublicId,
            imagePosition: imgPos,
            imageSize: imgSize,
            startDate, endDate, isLive,
            displayDuration
          };
          if (isEdit) payload.timestamp = editTimestamp;

          zzProgress.update(90);
          const r = await fetch(BACKEND_GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
          const responseData = await r.json();
          zzProgress.update(100);

          if (responseData.success) {
            await zzProgress.done();
            modal.classList.add('hidden');
            window.resetAddPostForm();
            showToast(responseData.message || "Success!", 'success');
            fetchPosts();
          } else {
            throw new Error(responseData.message || "Failed to post.");
          }
        } catch (err) {
          zzProgress.reset();
          if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.classList.remove('hidden');
          }
        }
      });
    }
  }

  async function fetchPosts() {
    const loading = document.getElementById('posts-loading');
    const container = document.getElementById('posts-container');
    const empty = document.getElementById('posts-empty');
    if (!loading || !container || !empty) return;

    if (BACKEND_GAS_URL === "YOUR_NEW_BACKEND_GAS_URL_HERE" || !BACKEND_GAS_URL.startsWith("https://")) {
      loading.classList.add('hidden');
      empty.innerHTML = "<p><i>Cannot fetch posts until Backend.gs URL is set.</i></p>";
      empty.classList.remove('hidden');
      return;
    }

    loading.classList.remove('hidden');
    container.classList.add('hidden');
    empty.classList.add('hidden');

    try {
      const r = await fetch(BACKEND_GAS_URL);
      const data = await r.json();

      loading.classList.add('hidden');

      // We proceed if data is success, even if posts are empty (to show permanent slides or admin tools)
      if (data.success && data.posts) {
        // Determine role to decide which renderer to use
        let role = 'user';
        const sessionData = localStorage.getItem('sas_user_data');
        if (sessionData) {
          try { role = JSON.parse(sessionData).role; } catch (e) { }
        }

        // --- PHASE 13: TV SYNC LOGIC ---

        if (role === 'tv') {
          // TV toggle state is managed entirely via localStorage (like the view-menu)
          syncTvSettingsUI();

          // Hash Current Data for Background Refreshes
          const newDataString = JSON.stringify(data.posts);

          if (!window.tvPostsDataHash) {
            // First Boot: Save hash and start refresh loop
            window.tvPostsDataHash = newDataString;

            window.tvBackgroundFetch = setInterval(async () => {
              try {
                const bgRes = await fetch(BACKEND_GAS_URL);
                const bgData = await bgRes.json();
                if (bgData.success && bgData.posts) {
                  const bgDataString = JSON.stringify(bgData.posts);
                  // If the hash changed (new/edited/deleted post)
                  if (bgDataString !== window.tvPostsDataHash) {
                    console.log("TV Auto-Refresh: New posts detected! Rebuilding Carousel...");

                  if (globalCarouselTimer) {
                    window.clearInterval(globalCarouselTimer);
                    globalCarouselTimer = null;
                  }
                    window.tvPostsDataHash = bgDataString;

                    renderPosts(bgData.posts, container, role);
                  }
                }
              } catch (e) {
                console.log("TV Background Refresh skipped: Offline/Network Error");
              }
            }, 60000); // Check every 60 seconds
          }
        }

        // --- END PHASE 13 ---

        renderPosts(data.posts, container, role);
        
        const isActualTvMode = role === 'tv' || document.body.classList.contains('tv-mode');
        if (isActualTvMode) {
          container.className = 'home-news'; 
        } else {
          // Restore grid for admin/user but PRESERVE current view class
          container.classList.add('posts-container');
          container.classList.remove('home-news');
          
          // Re-apply saved view mode to ensure classes are correct after render
          const currentMode = localStorage.getItem('sas_view_mode') || 'md';
          if (typeof setViewMode === 'function') setViewMode(currentMode);
        }
        container.classList.remove('hidden');
      } else {
        empty.classList.remove('hidden');
      }
    } catch (err) {
      loading.classList.add('hidden');
      empty.innerHTML = "<p>Error loading posts. Please try again later.</p>";
      empty.classList.remove('hidden');
      console.error("Fetch Posts Error:", err);
    }
  }


  async function expirePostOnBackend(timestamp) {
    const sessionData = localStorage.getItem('sas_user_data');
    if (!sessionData) return;
    
    try {
      const userObj = JSON.parse(sessionData);
      const payload = {
        action: "expirePost",
        username: userObj.username,
        password: userObj.password || "",
        timestamp: timestamp
      };

      const r = await fetch(BACKEND_GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const res = await r.json();
      if (res.success) {
        console.log("Post auto-expired successfully:", timestamp);
        // Refresh the posts list to remove the expired post from all views
        if (typeof fetchPosts === 'function') fetchPosts();
      } else {
        console.warn("Post auto-expiry failed:", res.message);
      }
    } catch (e) {
      console.error("Error during post auto-expiry:", e);
    }
  }

  function renderPosts(posts, container, role) {
    // Prevent duplicate dots/tickers on re-render by clearing elements leaked to body
    const existingDots = document.body.querySelectorAll('.home-news-dots');
    existingDots.forEach(el => el.remove());
    const existingTicker = document.body.querySelectorAll('.home-news-ticker');
    existingTicker.forEach(el => el.remove());

    container.innerHTML = '';

    // --- INJECT PERMANENT WEBSITE SLIDE ---
    const isAdmin = role === 'admin' || role === 'superadmin';
    const hasValidUrl = window.tvPermanentUrl && window.tvPermanentUrl.startsWith('http');
    const isActualTvMode = role === 'tv' || document.body.classList.contains('tv-mode');
    
    // Always show to admins (so they can configure it) OR to everyone if it's a valid TV slide
    if (isAdmin || (isActualTvMode && hasValidUrl)) {
      // Check if already injected to prevent duplicates
      if (!posts.some(p => p.timestamp && p.timestamp.startsWith('perm-website-'))) {
        posts.push({
          title: "Portal Access",
          description: "Interactive Web Portal",
          imageUrl: window.tvPermanentUrl || "",
          type: "website",
          displayDuration: window.tvPermanentDuration || 60,
          timestamp: "perm-website-fixed",
          showOnTv: "true"
        });
      }
    }

    container.innerHTML = '';
    ytPlayers = {}; // Clear previous instances

    if (isActualTvMode) {
      const now = new Date();
      let tvPosts = posts.filter(p => {
        // Keep the permanent website slide ONLY if the URL is valid
        if (p.type === 'website') return hasValidUrl;

        // 1. Check showOnTv flag
        if (String(p.showOnTv).toLowerCase() === 'false') return false;
        
        // 2. Check Start Date
        if (p.startDate) {
          const start = new Date(p.startDate);
          if (now < start) return false;
        }
        
        // 3. Check End Date
        if (p.endDate) {
          const end = new Date(p.endDate);
          if (now > end) return false;
        }
        
        return true;
      });


      if (tvPosts.length === 0) {
        tvPosts = [{
          title: "No Announcements",
          description: "There are currently no announcements scheduled for TV display.",
          timestamp: new Date().toLocaleString()
        }];
      }

      // Build Full-screen TV Carousel
      const track = document.createElement('div');
      track.className = 'home-news-track';

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'home-news-dots';
      dotsContainer.setAttribute('role', 'tablist');

      tvPosts.forEach((post, index) => {
        let startVal = '';
        let endVal = '';
        if (post.imagePosition && post.imagePosition.includes('|')) {
           const parts = post.imagePosition.split('|');
           startVal = parts[1] || '';
           endVal = parts[2] || '';
        }

        const slide = document.createElement('article');
        slide.className = 'home-news-slide' + (index === 0 ? ' is-active' : '');
        slide.setAttribute('data-index', index);
        slide.setAttribute('data-title', escapeHtml(post.title || ''));
        slide.setAttribute('data-desc', escapeHtml(post.description || ''));
        slide.setAttribute('data-start', startVal);
        slide.setAttribute('data-end', endVal);
        slide.setAttribute('data-is-live', post.isLive ? 'true' : 'false');
        slide.setAttribute('data-timestamp', post.timestamp || '');
        slide.setAttribute('data-duration', post.displayDuration || '');

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          // Parse saved values. Check if it's a legacy value (cover/contain) or the new zoom format (scale number)
          let parsedPos = post.imagePosition || '50% 50%'; // Legacy default
          let isLegacySize = (post.imageSize === 'cover' || post.imageSize === 'contain' || !post.imageSize);

          let parsedScale = 1;
          let parsedTrX = 0;
          let parsedTrY = 0;

          let styleStr = '';

          if (!isLegacySize && !isNaN(parseFloat(post.imageSize))) {
            parsedScale = parseFloat(post.imageSize);
            // new pos format is "X Y" in percentages
            const pParts = parsedPos.split(' ');
            if (pParts.length >= 2) {
              parsedTrX = parseFloat(pParts[0]) || 0;
              parsedTrY = parseFloat(pParts[1]) || 0;
            }
            styleStr = `object-fit: contain; object-position: center; transform-origin: center center; transform: scale(${parsedScale}) translate(${parsedTrX}%, ${parsedTrY}%);`;
          } else {
            // Legacy
            const objSizeStr = post.imageSize || 'cover';
            styleStr = `object-position: ${parsedPos}; object-fit: ${objSizeStr};`;
          }

          const urlLower = post.imageUrl.toLowerCase();
          const ytId = getYouTubeVideoId(post.imageUrl);
          const fbEmbedUrl = getFacebookVideoUrl(post.imageUrl);

          const isWebsite = post.type === "website" || (!ytId && !fbEmbedUrl && !urlLower.includes('image') && !urlLower.includes('video') && urlLower.startsWith('http') && !urlLower.endsWith('.png') && !urlLower.endsWith('.jpg') && !urlLower.endsWith('.jpeg') && !urlLower.endsWith('.gif'));

          const isVideo = !isWebsite && (ytId || fbEmbedUrl || 
            urlLower.includes('/video/upload/') ||
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.endsWith('.mov') ||
            (urlLower.includes('drive.google.com') && urlLower.includes('type=video')) ||
            (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')));

          if (isWebsite) {
            slide.classList.add('has-website');
            slide.setAttribute('data-is-website', 'true');
          } else if (isVideo) {
            slide.classList.add('has-video');
            const dId = getDriveId(post.imageUrl);
            if (dId) {
              // Convert any Drive link to High-Speed Direct Stream
              post.imageUrl = `https://drive.google.com/uc?id=${dId}&export=download`;
            }
          }

          let bgThumb = '';
          if (ytId) {
            bgThumb = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com')) {
            bgThumb = post.imageUrl.replace(/\.(mp4|webm|mov|mkv|avi)$/i, '.jpg');
          } else if (post.imageUrl && post.imageUrl.trim() !== '') {
            bgThumb = post.imageUrl;
          }

          const bgHtml = bgThumb ? `<div class="home-news-image-bg" style="background-image: url('${bgThumb}')"></div>` : '';

          if (isWebsite) {
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 <iframe src="${post.imageUrl}" class="home-news-image website-slide-frame" style="border: none; width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
              </div>
            `;
          } else if (ytId) {
            let ytParams = `autoplay=1&mute=1&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&showinfo=0&autohide=1`;
            if (startVal) ytParams += `&start=${startVal}`;
            // Adjust parameters based on whether we use a proxy or official YT
            let finalParams = ytParams;
            let embedBase = "https://www.youtube.com/embed/";
            
            if (window.ENV && window.ENV.YOUTUBE_PROXY_URL && window.ENV.YOUTUBE_PROXY_URL.trim() !== '') {
               embedBase = window.ENV.YOUTUBE_PROXY_URL;
               if (!embedBase.endsWith('/')) embedBase += '/';
               // Public proxies often don't support YT's enablejsapi or complex flags
               // We only keep essential ones: autoplay, mute, start, end
               let proxyParams = `autoplay=1&mute=1`;
               if (startVal) proxyParams += `&start=${startVal}`;
               if (endVal) proxyParams += `&end=${endVal}`;
               finalParams = proxyParams;
            }

            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 ${bgHtml}
                 <iframe id="ytplayer-${post.timestamp}" src="${embedBase}${ytId}?${finalParams}" class="home-news-image yt-video-frame" style="border: none; width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
              </div>
            `;
          } else if (fbEmbedUrl) {
            initFbSdk();
            const uniqueId = `fbplayer-${post.timestamp}`;
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000;">
                 ${bgHtml}
                 <div id="${uniqueId}" class="fb-video fb-video-wrapper" data-href="${fbEmbedUrl}" data-width="auto" data-show-text="false" data-allowfullscreen="true" data-autoplay="false" style="position: relative; z-index: 2; width: 100%; height: 100%;"></div>
              </div>
            `;
          } else if (
            urlLower.includes('/video/upload/') ||
            urlLower.includes('docs.google.com/uc?') ||
            urlLower.includes('drive.google.com/uc?id=') ||
            urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.endsWith('.mov') ||
            (urlLower.includes('drive.google.com') && urlLower.includes('type=video'))
          ) {
            // Direct/stream URL — use native <video> with autoplay+muted for TV
            let mediaHash = '';
            if (startVal && endVal) mediaHash = `#t=${startVal},${endVal}`;
            else if (startVal) mediaHash = `#t=${startVal}`;
            else if (endVal) mediaHash = `#t=0,${endVal}`;

            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                ${bgHtml}
                <video src="${post.imageUrl}${mediaHash}" class="home-news-image" style="width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" autoplay muted playsinline></video>
              </div>
            `;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            // Fallback for existing preview iframes (Legacy)
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 <iframe src="${post.imageUrl}" class="home-news-image drive-video-frame" style="border: none; width: 100%; height: 100%; ${styleStr}" allow="autoplay" allowfullscreen></iframe>
              </div>
            `;
          } else {
            const fbPlaceholder = 'assets/sas_logo_real.png';
            imgHtml = `
              <div style="position: relative; z-index: 1; width: 100%; height: 100%; overflow: hidden;">
                 ${bgHtml}
                 <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="home-news-image" style="width: 100%; height: 100%; position: relative; z-index: 2; ${styleStr}" loading="lazy" onerror="this.onerror=null; this.src='${fbPlaceholder}'; this.style.objectFit='contain'; this.style.opacity='0.2';">
              </div>
            `;
          }
        } else {
          imgHtml = `<div class="home-news-image" style="background:var(--nbsc-dark); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px; text-align: center;"><img src="assets/sas_logo_real.png" style="height:60px; margin-bottom:10px; opacity:0.3"></div>`;
        }

        let liveBadgeHtml = '';
        if (post.isLive) {
          liveBadgeHtml = `<div class="live-badge" style="position: absolute; top: 0.8rem; left: 0.8rem; z-index: 10; background: rgba(185, 28, 28, 0.9); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; animation: pulse-live 4s infinite ease-in-out; border: 1px solid rgba(255,255,255,0.2); pointer-events: none;">Live</div>`;
        }

        slide.innerHTML = `
          <div class="home-news-image-wrap">
            ${liveBadgeHtml}
            ${imgHtml}
          </div>
        `;

        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'home-news-dot' + (index === 0 ? ' is-active' : '');
        dot.type = 'button';
        dot.setAttribute('data-index', index);
        dot.setAttribute('aria-label', 'Slide ' + (index + 1));
        dotsContainer.appendChild(dot);
      });

      const firstTitle = tvPosts.length > 0 ? escapeHtml(tvPosts[0].title || '') : '';
      const firstDesc = tvPosts.length > 0 ? escapeHtml(tvPosts[0].description || '') : '';
      const initialTickerContent = `
        <span class="ticker-title">${firstTitle}</span>
        <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
        <span class="ticker-desc">${firstDesc}</span>
        <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
      `;

      const globalTicker = document.createElement('div');
      globalTicker.className = 'home-news-ticker';
      globalTicker.innerHTML = `
        <div class="ticker-wrap">
          <div class="ticker-content" id="global-ticker-content-1">
            ${initialTickerContent}
          </div>
          <div class="ticker-content" aria-hidden="true" id="global-ticker-content-2">
            ${initialTickerContent}
          </div>
        </div>
      `;

      container.appendChild(track);
      if (posts.length > 1) {
        container.appendChild(dotsContainer);
      }
      container.appendChild(globalTicker);

      initCarousel(container);
    } else {
      // Build Standard Vertical Card Feed for Admins & Users
      posts.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.style.position = 'relative';

        const urlLower = (post.imageUrl || '').toLowerCase();

        let imgHtml = '';
        if (post.imageUrl && post.imageUrl.trim() !== '') {
          // Parse saved values. Check if it's a legacy value (cover/contain) or the new zoom format (scale number)
          let parsedPos = post.imagePosition || '50% 50%'; // Legacy default
          let isLegacySize = (post.imageSize === 'cover' || post.imageSize === 'contain' || !post.imageSize);

          let parsedScale = 1;
          let parsedTrX = 0;
          let parsedTrY = 0;

          let styleStr = '';

          if (!isLegacySize && !isNaN(parseFloat(post.imageSize))) {
            parsedScale = parseFloat(post.imageSize);
            // new pos format is "X Y" in percentages
            const pParts = parsedPos.split(' ');
            if (pParts.length >= 2) {
              parsedTrX = parseFloat(pParts[0]) || 0;
              parsedTrY = parseFloat(pParts[1]) || 0;
            }
            styleStr = `object-fit: contain; object-position: center; transform-origin: center center; transform: scale(${parsedScale}) translate(${parsedTrX}%, ${parsedTrY}%);`;
          } else {
            // Legacy
            const objSizeStr = post.imageSize || 'cover';
            styleStr = `object-position: ${parsedPos}; object-fit: ${objSizeStr};`;
          }

          let startVal = '';
          let endVal = '';
          if (post.imagePosition && post.imagePosition.includes('|')) {
             const parts = post.imagePosition.split('|');
             startVal = parts[1] || '';
             endVal = parts[2] || '';
          }

          const ytId = getYouTubeVideoId(post.imageUrl);
          const fbEmbedUrl = getFacebookVideoUrl(post.imageUrl);

          if (post.type === 'website') {
            imgHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #facc15; border: 2px solid #facc15; border-radius: 8px;">
              <div style="text-align: center;">
                <i class='bx bx-tv' style="font-size: 40px; margin-bottom: 8px;"></i>
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">System Portal</div>
              </div>
            </div>`;
          } else if (ytId) {
            imgHtml = `<img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" class="post-image" style="${styleStr}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'">`;
          } else if (fbEmbedUrl) {
            imgHtml = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; color: white;">
              <div style="text-align: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#1877F2" style="margin-bottom: 8px;"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <div style="font-size: 12px; opacity: 0.8;">Facebook Video</div>
              </div>
            </div>`;
          } else if (urlLower && (urlLower.includes('res.cloudinary.com') || urlLower.includes('cloudinary.com'))) {
            const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(urlLower) || urlLower.includes('/video/upload/');
            const thumbUrl = isVideo ? post.imageUrl.replace(/\.[^.]+$/, '.jpg') : post.imageUrl;
            imgHtml = `<img src="${thumbUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="${styleStr}" loading="lazy">`;
          } else if (urlLower.includes('docs.google.com/uc?') || urlLower.includes('drive.google.com/uc?id=') || urlLower.endsWith('.mp4') || urlLower.endsWith('.webm')) {
            let mediaHash = '';
            if (startVal && endVal) mediaHash = `#t=${startVal},${endVal}`;
            else if (startVal) mediaHash = `#t=${startVal}`;
            else if (endVal) mediaHash = `#t=0,${endVal}`;
            imgHtml = `<video src="${post.imageUrl}${mediaHash}" class="post-image" style="${styleStr}" preload="metadata" muted playsinline></video>`;
          } else if (urlLower.includes('drive.google.com/file/d/') && urlLower.includes('/preview')) {
            imgHtml = `<iframe src="${post.imageUrl}" class="post-image" style="border: none; ${styleStr}"></iframe>`;
          } else {
            const fallbackSquare = 'assets/sas_logo_real.png';
            imgHtml = `<img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" class="post-image" style="${styleStr}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackSquare}'; this.style.objectFit='contain'; this.style.opacity='0.2';">`;
          }
          
          if (post.isLive) {
            imgHtml = `<div class="live-badge" style="position: absolute; top: 10px; left: 10px; z-index: 15; background: #b91c1c; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.7rem; animation: pulse-live 2s infinite;">LIVE</div>` + imgHtml;
          }
        }
        
        let schedulingLabel = '';
        if (post.startDate || post.endDate) {
          let sText = post.startDate ? `From: ${new Date(post.startDate).toLocaleString()}` : '';
          let eText = post.endDate ? ` Until: ${new Date(post.endDate).toLocaleString()}` : '';
          schedulingLabel = `<div class="post-scheduled-label">${sText}${eText}</div>`;
        }

        let cardContentHtml = `
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <p class="post-desc">${escapeHtml(post.description)}</p>
          ${schedulingLabel}
        `;

        // If it's the permanent website slide, show the configuration UI on the card
        if (post.type === 'website' && (role === 'admin' || role === 'superadmin')) {
          cardContentHtml = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 8px;">
              <h3 class="post-title" style="margin:0;">${escapeHtml(post.title)}</h3>
              <span style="background: var(--nbsc-gold); color:var(--nbsc-dark); font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">System</span>
            </div>
            <p class="post-desc" style="margin-bottom:12px;">${escapeHtml(post.description)}</p>
            <div class="portal-config-container">
              <div style="display:flex; gap:8px;">
                <input type="url" class="portal-url-input" value="${window.tvPermanentUrl}" placeholder="Enter Portal URL (https://...)" style="flex: 1;">
                <input type="number" class="portal-duration-input portal-url-input" value="${window.tvPermanentDuration || 60}" min="5" title="Duration in seconds" style="width: 80px; text-align: center;">
              </div>
              <button class="portal-save-btn">
                <i class='bx bx-save'></i> Update Portal Link & Duration
              </button>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="post-image-container">
            ${imgHtml}
          </div>
          <div class="post-content">
            ${cardContentHtml}
          </div>
        `;

        if (role === 'admin' || role === 'uploader' || role === 'superadmin') {
          const actionArea = document.createElement('div');
          actionArea.className = 'post-card-actions';

          // Standard Edit Button
          if (post.type !== 'website') {
            const editBtn = document.createElement('button');
            editBtn.className = 'secondary-btn edit-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
                // ... Existing Edit Functionality ...
                const form = document.getElementById('add-post-form');
                const modal = document.getElementById('add-post-modal');
                document.querySelector('.modal-title').textContent = "Edit Update";
                document.getElementById('submit-post-btn').textContent = "Save Changes";
                document.getElementById('post-title').value = post.title;
                document.getElementById('post-desc').value = post.description;
                if (document.getElementById('post-start-date')) document.getElementById('post-start-date').value = (post.startDate || '').replace(' ', 'T');
                if (document.getElementById('post-end-date')) document.getElementById('post-end-date').value = (post.endDate || '').replace(' ', 'T');
                const dSlider = document.getElementById('post-display-duration');
                if (dSlider) dSlider.value = parseInt(post.displayDuration) || 25;
                
                // Preserve media elements if not modified
                form.setAttribute('data-existing-image-url', post.imageUrl || '');
                form.setAttribute('data-existing-public-id', post.cloudinaryPublicId || '');
                form.setAttribute('data-existing-pos', post.imagePosition || '');
                form.setAttribute('data-existing-size', post.imageSize || '');
                
                form.setAttribute('data-edit-timestamp', post.timestamp);
                modal.classList.remove('hidden');
            };
            actionArea.appendChild(editBtn);
          }

          // Standard Delete Button
          if (post.type !== 'website') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'secondary-btn delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = async () => {
              const confirmDelete = await showConfirm("Delete Post", "Are you sure you want to delete this specific post?", false, 'danger');
              if (!confirmDelete) return;
              const sessionData = localStorage.getItem('sas_user_data');
              if (!sessionData) return;
              const userObj = JSON.parse(sessionData);
              deleteBtn.textContent = "Deleting...";
              deleteBtn.disabled = true;
              try {
                const payload = { action: "deletePost", username: userObj.username, password: userObj.password, timestamp: post.timestamp };
                const r = await fetch(BACKEND_GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
                const res = await r.json();
                if (res.success) { showToast(res.message, 'success'); fetchPosts(); }
                else { showToast(res.message || "Failed to delete.", 'error'); }
              } catch (e) { showToast("Network error.", 'error'); } 
              finally { deleteBtn.textContent = "Delete"; deleteBtn.disabled = false; }
            };
            actionArea.appendChild(deleteBtn);
          }

          // Portal Save Logic (Specific to System Card)
          if (post.type === 'website') {
            const portalInput = card.querySelector('.portal-url-input');
            const durationInput = card.querySelector('.portal-duration-input');
            const portalSave = card.querySelector('.portal-save-btn');
            if (portalInput && portalSave) {
              portalSave.addEventListener('click', async () => {
                const newUrl = portalInput.value.trim();
                const newDuration = parseInt(durationInput ? durationInput.value : "60") || 60;
                
                if (newUrl !== "" && !newUrl.startsWith('http')) {
                  showToast("Please enter a valid URL starting with https://", "error");
                  return;
                }
                portalSave.disabled = true;
                const originalHtml = portalSave.innerHTML;
                portalSave.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Syncing...";
                try {
                  const permUrlRef = ref(userDb, 'config/tv_permanent_url');
                  const permDurRef = ref(userDb, 'config/tv_permanent_duration');
                  await set(permUrlRef, newUrl);
                  await set(permDurRef, newDuration);
                  showToast("Portal settings updated globally!", "success");
                } catch(e) {
                  showToast("Sync failed. Check connection.", "error");
                } finally {
                  portalSave.disabled = false;
                  portalSave.innerHTML = originalHtml;
                }
              });
            }
          }

          const toggleTvBtn = document.createElement('button');
          toggleTvBtn.className = 'secondary-btn hide-btn';
          const isHidden = String(post.showOnTv).toLowerCase() === 'false';
          toggleTvBtn.textContent = isHidden ? 'Show on TV' : 'Hide from TV';

          toggleTvBtn.onclick = async () => {
            const sessionData = localStorage.getItem('sas_user_data');
            if (!sessionData) return;
            const userObj = JSON.parse(sessionData);

            const msg = isHidden ? 'Are you sure you want to show this on TV?' : 'Are you sure you want to hide this from TV?';
            const confirmToggle = await showConfirm("TV Visibility", msg, false, 'warning');
            if (!confirmToggle) return;

            toggleTvBtn.textContent = "Updating...";
            toggleTvBtn.disabled = true;

            try {
              const payload = {
                action: "toggleTvVisible",
                username: userObj.username,
                password: userObj.password,
                timestamp: post.timestamp
              };

              const r = await fetch(BACKEND_GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
              });

              const responseData = await r.json();
              if (responseData.success) {
                showToast(responseData.message || "Visibility updated!", 'success');
                fetchPosts(); // Refresh UI instantly
              } else {
                showToast(responseData.message || "Failed to toggle visibility.", 'error');
              }
            } catch (e) {
              showToast("Network error. Could not toggle visibility.", 'error');
            } finally {
              toggleTvBtn.disabled = false;
            }
          };
          actionArea.appendChild(toggleTvBtn);

          card.appendChild(actionArea);
        }

        container.appendChild(card);
      });

      // --- DASHBOARD BACKDROP SYNC (Static to prevent lag) ---
      if (document.body.classList.contains('dashboard-backdrop')) {
        const blurredBg = document.getElementById('tv-blurred-bg');
        if (blurredBg) {
          const firstPostWithImg = posts.find(p => p.imageUrl && p.imageUrl.trim() !== '');
          if (firstPostWithImg) {
             let bgSource = firstPostWithImg.imageUrl;
             const ytId = getYouTubeVideoId(bgSource);
             if (ytId) bgSource = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
             else if (bgSource.includes('cloudinary.com')) bgSource = bgSource.replace(/\.(mp4|webm|mov|mkv|avi)$/i, '.jpg');
             
             blurredBg.style.backgroundImage = `url('${bgSource}')`;
          }
        }
      }
    }
  }

  function initCarousel(container) {
    var slides = Array.prototype.slice.call(container.querySelectorAll('.home-news-slide'));
    var dots = Array.prototype.slice.call(container.querySelectorAll('.home-news-dot'));
    if (!slides.length) return;

    // Clear ANY existing carousel timer/players to prevent leaks
    if (globalCarouselTimer) clearInterval(globalCarouselTimer);
    globalCarouselTimer = null;

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        setActive(i);
        preloadNext(i);
      });
    });

    Object.keys(ytPlayers).forEach(id => {
      try { ytPlayers[id].destroy(); } catch (e) { }
    });
    ytPlayers = {};

    var current = 0;
    var intervalMs = 25000;

    // Force immediate layout update for the first slide (slide 0)
    // This ensures clock reparenting and other immersive states are applied instantly.
    setActive(0);
    preloadNext(0);

    function next() {
      var nextIndex = (current + 1) % slides.length;
      setActive(nextIndex);
      preloadNext(nextIndex);
    }

    function preloadNext(index) {
      const nextIdx = (index + 1) % slides.length;
      const nextSlide = slides[nextIdx];
      const video = nextSlide.querySelector('video.home-news-image');
      if (video) {
        video.preload = "auto";
        // Create a hidden ghost video to force the browser to start buffering the network stream
        const ghost = document.createElement('video');
        ghost.style.display = 'none';
        ghost.preload = 'auto';
        ghost.src = video.src;
        document.body.appendChild(ghost);
        setTimeout(() => ghost.remove(), 10000); // Clean up after a bit
      }
    }

    function setActive(index) {
      window.currentTvSlide = index;
      window.setTvActiveSlide = setActive;
      // First, iterate over all slides to pause videos that are no longer active
      slides.forEach(function (s, i) {
        if (i === index) {
          s.classList.add('is-active');

          // Update global ticker
          const t1 = document.getElementById('global-ticker-content-1');
          const t2 = document.getElementById('global-ticker-content-2');
          if (t1 && t2) {
            const tempTitle = s.getAttribute('data-title') || '';
            const tempDesc = s.getAttribute('data-desc') || '';
            const tickerHtml = `
              <span class="ticker-title">${tempTitle}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
              <span class="ticker-desc">${tempDesc}</span>
              <span class="ticker-separator"> &nbsp;&bull;&nbsp;&bull;&nbsp; </span>
            `;
            t1.innerHTML = tickerHtml;
            t2.innerHTML = tickerHtml;

            // Update Fullscreen Info Overlay
            const fsTitle = document.getElementById('fs-post-title');
            const fsDesc = document.getElementById('fs-post-desc');
            if (fsTitle) fsTitle.textContent = tempTitle;
            if (fsDesc) fsDesc.textContent = tempDesc;
          }
        } else {
          s.classList.remove('is-active');
          // Perform cleanup for inactive slides
          const oldVideo = s.querySelector('video.home-news-image');
          const oldIframe = s.querySelector('iframe.yt-video-frame');

          if (oldVideo) {
            oldVideo.pause();
            oldVideo.muted = true;
          }
        }
      });
      dots.forEach(function (d, i) {
        if (i === index) d.classList.add('is-active');
        else d.classList.remove('is-active');
      });
      current = index;
      window.currentTvSlide = index;
      globalSlideGeneration++; // Invalidate any stale YT callbacks from the previous slide
      var myGeneration = globalSlideGeneration;

      // Always stop the running timer first
      stop();

      const activeSlide = slides[index];
      const videoEl = activeSlide.querySelector('video.home-news-image');
      const iframeEl = activeSlide.querySelector('iframe.yt-video-frame');
      const fbIframeEl = activeSlide.querySelector('.fb-video-wrapper');
      const driveIframeEl = activeSlide.querySelector('iframe.drive-video-frame');
      const websiteIframeEl = activeSlide.querySelector('iframe.website-slide-frame');

      const curStart = parseFloat(activeSlide.dataset.start) || 0;
      const curEnd = parseFloat(activeSlide.dataset.end) || 0;
      const isLive = activeSlide.getAttribute('data-is-live') === 'true';
      const timestamp = activeSlide.getAttribute('data-timestamp');
      const customDuration = activeSlide.getAttribute('data-duration');
      const startMs = (customDuration && !isNaN(customDuration)) ? parseInt(customDuration) * 1000 : undefined;

      // Handle CSS Unified Fullscreen
      const isVideoSlide = (videoEl || iframeEl || fbIframeEl || driveIframeEl || websiteIframeEl);

      if (isVideoSlide) {
        document.body.classList.add('video-fullscreen-active');
        // VIDEOS: only expand if toggle is user-enabled
        if (tvTheaterEnabled && document.body.classList.contains('tv-mode')) {
          document.body.classList.add('fullscreen-active');
          document.body.classList.add('theater-mode');
          if (typeof updateWeather === 'function') updateWeather();
        } else {
          document.body.classList.remove('fullscreen-active');
          document.body.classList.remove('theater-mode');
        }
      } else {
        document.body.classList.remove('video-fullscreen-active');
        document.body.classList.remove('theater-mode');
        // IMAGES: always expand in TV mode by default
        if (document.body.classList.contains('tv-mode')) {
          document.body.classList.add('fullscreen-active');
          if (typeof updateWeather === 'function') updateWeather();
        } else {
          document.body.classList.remove('fullscreen-active');
        }
      }

      // Handle Blurred Immersive Background
      const blurredBg = document.getElementById('tv-blurred-bg');
      if (blurredBg && document.body.classList.contains('tv-mode')) {
        let bgSource = '';

        const slideImg = activeSlide.querySelector('img.home-news-image');
        const bgLayer = activeSlide.querySelector('.home-news-image-bg');

        if (bgLayer) {
          // Extract from style.backgroundImage: url("...")
          const styleBg = bgLayer.style.backgroundImage;
          bgSource = styleBg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
        } else if (slideImg && slideImg.src) {
          bgSource = slideImg.src;
        } else if (videoEl && videoEl.poster) {
          bgSource = videoEl.poster;
        } else if (iframeEl || fbIframeEl) {
          const ytId = getYouTubeVideoId((iframeEl || fbIframeEl).src || '');
          if (ytId) {
            bgSource = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (fbIframeEl) {
            // For FB, we don't have a simple thumb URL, so we rely on the bgLayer if it exists
            // (The bgLayer is already set in renderPosts if it's a FB video)
          }
        }

        if (bgSource) {
          blurredBg.style.backgroundImage = `url('${bgSource}')`;
        }
      }

      // Consistently ensure elements stay at body level in any TV mode
      if (document.body.classList.contains('tv-mode')) {
        const dotsEl = document.querySelector('.home-news-dots');
        const tvClock = document.getElementById('tv-clock');

        if (tvClock && tvClock.parentElement !== document.body) {
          document.body.appendChild(tvClock);
        }
        if (dotsEl && dotsEl.parentElement !== document.body) {
          document.body.appendChild(dotsEl);
        }
      }

      if (videoEl) {
        videoEl.currentTime = curStart;
        videoEl.muted = !tvAudioEnabled;
        videoEl.play().catch(e => console.error('Video play prevented:', e));
        
        videoEl.ontimeupdate = function() {
           if (curEnd > 0 && videoEl.currentTime >= curEnd) {
              if (myGeneration === globalSlideGeneration && slides.length > 1) {
                 videoEl.ontimeupdate = null; // Prevent double trigger
                 next();
              }
           }
        };
        
        videoEl.onended = function () {
          if (isLive) {
            console.log("Native video ended! Expiring live post...");
            expirePostOnBackend(timestamp);
          }
          if (myGeneration === globalSlideGeneration && slides.length > 1) next();
        };
        videoEl.onerror = function() {
          if (isLive) {
            console.log("Native video error! Expiring live post...");
            expirePostOnBackend(timestamp);
          }
          if (myGeneration === globalSlideGeneration && slides.length > 1) next();
        };

        // --- HEARTBEAT FOR NATIVE VIDEO ---
        if (isLive) {
          let lastTime = -1;
          let stalledCount = 0;
          const liveHeartbeat = setInterval(() => {
            if (myGeneration !== globalSlideGeneration) {
              clearInterval(liveHeartbeat);
              return;
            }
            if (!videoEl.paused && videoEl.currentTime === lastTime) {
              stalledCount++;
              if (stalledCount > 15) { // 15 seconds of no progress while playing
                console.log("Live native video stalled! Expiring...");
                clearInterval(liveHeartbeat);
                expirePostOnBackend(timestamp);
              }
            } else {
              stalledCount = 0;
            }
            lastTime = videoEl.currentTime;
          }, 1000);
        }

        // We rely on the native `onended` event for Cloudinary/direct videos instead of the slide timer.
        // We set a very long 5-minute fallback just in case the browser hangs.
        if (!isLive) start(300000); 
        else stop(); // For live, we strictly rely on the heartbeat/ended events
      } else if (iframeEl && window.YT && window.YT.Player) {
        const iframeId = iframeEl.id;
        const myPlayerId = iframeId;

        function startYTPolling(player) {
          let stalledCount = 0;
          let lastTime = -1;
          const checkInterval = setInterval(() => {
            if (myGeneration !== globalSlideGeneration) {
              clearInterval(checkInterval);
              return;
            }
            try {
              const state = player.getPlayerState();
              const duration = player.getDuration();
              const currentTime = player.getCurrentTime();

              // --- LIVE HEARTBEAT / STALL CHECK ---
              if (isLive) {
                 if (state === 1) { // Playing
                    if (currentTime === lastTime) {
                       stalledCount++;
                       if (stalledCount > 20) { // 20s stall
                          console.log("YouTube Live stalled! Expiring...");
                          clearInterval(checkInterval);
                          expirePostOnBackend(timestamp);
                       }
                    } else { stalledCount = 0; }
                 } else if (state === -1 || state === 5) { // Unstarted or Cued
                    stalledCount++;
                    if (stalledCount > 30) { // 30s stuck in loading
                       console.log("YouTube Live stuck in loading state! Expiring...");
                       clearInterval(checkInterval);
                       expirePostOnBackend(timestamp);
                    }
                 }
                 lastTime = currentTime;
              }

                // Advance if video is within 1.5s of end (not for live)
                const effectiveEnd = (curEnd > 0) ? curEnd : duration;
                if (!isLive && (state === 0 || (effectiveEnd > 0 && currentTime >= (effectiveEnd - 1.5)))) {
                  console.log('YouTube auto-advancing slide:', myPlayerId);
                  clearInterval(checkInterval);
                  next();
                }
            } catch (e) { }
          }, 1000);
        }

        if (!ytPlayers[iframeId]) {
          ytPlayers[iframeId] = new YT.Player(iframeId, {
            events: {
              'onReady': function (event) {
                if (tvAudioEnabled) event.target.unMute();
                else event.target.mute();
                if (curStart > 0) event.target.seekTo(curStart);
                event.target.playVideo();
                startYTPolling(event.target);
              },
              'onStateChange': function (event) {
                if (event.data === YT.PlayerState.ENDED) {
                  // --- LIVE AUTO-EXPIRY LOGIC ---
                  if (isLive) {
                    console.log("Live stream ended! Hiding post from TV automatically...");
                    expirePostOnBackend(timestamp);
                  }
                  if (myGeneration === globalSlideGeneration && slides.length > 1) next();
                }
              },
              'onError': function(event) {
                console.warn("YouTube Player Error:", event.data);
                // Errors: 100 (not found/deleted), 101/150 (embed restricted)
                const fatalErrors = [100, 101, 150];
                if (isLive || fatalErrors.includes(event.data)) {
                  console.log("YouTube Live stream fatal error or unavailable! Expiring post...");
                  expirePostOnBackend(timestamp);
                }
                if (myGeneration === globalSlideGeneration && slides.length > 1) next();
              }
            }
          });
        } else {
          // Player already exists, just restart it
          try {
            const player = ytPlayers[iframeId];
            if (tvAudioEnabled) player.unMute();
            else player.mute();
            player.seekTo(curStart);
            player.playVideo();
            startYTPolling(player);
          } catch (e) {
            console.warn('YT Player error on restart:', e);
          }
        }
        // Safety fallback (not for live)
        if (!isLive) start(startMs || 300000);
        else stop();
      } else if (activeSlide.querySelector('.fb-video-wrapper')) {
        // Facebook video via JS SDK
        const fbEl = activeSlide.querySelector('.fb-video-wrapper');
        if (fbEl) {
          const playerId = fbEl.id;
          let attempts = 0;
          // Poll until the player instance is ready from the SDK
          const tryPlay = setInterval(() => {
             if (myGeneration !== globalSlideGeneration) {
                 clearInterval(tryPlay);
                 return;
             }
             const player = window.fbPlayers && window.fbPlayers[playerId];
             if (player) {
                 clearInterval(tryPlay);
                 try {
                    if (tvAudioEnabled) player.unmute();
                    else player.mute();
                    if (curStart > 0) player.seek(curStart);
                    player.play();

                    if (!player._hasFinishedListener) {
                        player._hasFinishedListener = true;
                        player.subscribe('finishedPlaying', () => {
                            // --- LIVE AUTO-EXPIRY LOGIC ---
                            if (isLive) {
                                console.log("Facebook Live stream finished! Hiding from TV...");
                                expirePostOnBackend(timestamp);
                            }
                            if (myGeneration === globalSlideGeneration && slides.length > 1) {
                                next();
                            }
                        });
                        player.subscribe('error', (err) => {
                            console.warn("Facebook Player Error:", err);
                            if (isLive) {
                                console.log("Facebook Live stream error! Expiring post...");
                                expirePostOnBackend(timestamp);
                            }
                            if (myGeneration === globalSlideGeneration && slides.length > 1) {
                                next();
                            }
                        });
                    }

                    // Poll for custom end time
                    let lastPos = -1;
                    let stalledCount = 0;
                    const fbPoll = setInterval(() => {
                        if (myGeneration !== globalSlideGeneration) {
                            clearInterval(fbPoll);
                            return;
                        }
                        try {
                           const pos = player.getCurrentPosition();
                           
                           if (isLive) {
                              if (pos === lastPos) {
                                 stalledCount++;
                                 if (stalledCount > 20) {
                                    console.log("Facebook Live stalled! Expiring...");
                                    clearInterval(fbPoll);
                                    expirePostOnBackend(timestamp);
                                 }
                              } else { stalledCount = 0; }
                              lastPos = pos;
                           }

                           if (curEnd > 0 && pos >= curEnd) {
                               clearInterval(fbPoll);
                               next();
                           }
                        } catch(e){}
                    }, 1000);
                 } catch(e) {
                    console.error('FB Player Error:', e);
                 }
             }
             attempts++;
             if (attempts > 50) clearInterval(tryPlay); // give up after 10s
          }, 200);
        }

        if (!isLive) start(startMs || 180000); 
        else stop();
      } else if (driveIframeEl) {
        // Drive video iframe — can't hook into events, use standard timer
        start(startMs);
      } else {
        // Static image slide
        start(startMs);
      }
    }

    function start(customMs) {
      stop();
      if (slides.length > 1) {
        globalCarouselTimer = window.setInterval(next, customMs || intervalMs);
      }
    }

    function stop() {
      if (globalCarouselTimer) {
        window.clearInterval(globalCarouselTimer);
        globalCarouselTimer = null;
      }
    }
  }

  // --- DATABASE MANAGEMENT (Superadmin Only) ---
  async function initDatabaseManagement() {
    if (!userDb) return;
    try {
      const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data') || '{}';
      const role = (JSON.parse(raw).role || '').toLowerCase();
      if (role !== 'superadmin') return;
    } catch (e) {
      return;
    }

    const refreshBtn = document.getElementById('db-refresh-btn');
    if (!refreshBtn || !userDb) return;
    const dbSection = document.getElementById('database');
    if (dbSection?.dataset.initialized === 'true') return;
    if (dbSection) dbSection.dataset.initialized = 'true';

    let allMessages = [];
    let filteredMessages = [];
    let currentPage = 1;
    let perPage = 25;
    let uniqueUsers = new Set();
    let cloudinaryStorageInfo = { usedText: '--', ratio: 0 };
    let supabaseStorageInfo = { usedText: '--', ratio: 0 };
    const revealedTargets = { gas: false, fbMsg: false, fbStore: false, supabase: false, cloudinary: false };
    let pendingRevealTarget = null;
    let lastStatusSnapshot = { gasState: 'Checking...', fbMsgState: 'Checking...', fbStoreState: 'Checking...', supabaseState: 'Checking...', cloudinaryState: 'Checking...', storagePath: 'user_messages' };

    const elements = {
      refreshBtn: refreshBtn,
      tbody: document.getElementById('db-messages-tbody'),
      search: document.getElementById('db-search-input'),
      filterType: document.getElementById('db-filter-type'),
      filterUser: document.getElementById('db-filter-user'),
      filterDateFrom: document.getElementById('db-filter-date-from'),
      filterDateTo: document.getElementById('db-filter-date-to'),
      prevBtn: document.getElementById('db-prev-btn'),
      nextBtn: document.getElementById('db-next-btn'),
      pageInfo: document.getElementById('db-page-info'),
      perPage: document.getElementById('db-per-page'),
      selectAll: document.getElementById('db-select-all'),
      exportBtn: document.getElementById('db-export-btn'),
      deleteFilteredBtn: document.getElementById('db-delete-filtered-btn'),
      clearAllBtn: document.getElementById('db-clear-all-btn'),
      totalStat: document.getElementById('db-total-messages'),
      userCount: document.getElementById('db-user-messages-count'),
      adminCount: document.getElementById('db-admin-messages-count'),
      activeUsers: document.getElementById('db-active-users'),
      tabMessaging: document.getElementById('db-tab-messaging'),
      tabStorage: document.getElementById('db-tab-storage'),
      panelMessaging: document.getElementById('db-panel-messaging'),
      panelStorage: document.getElementById('db-panel-storage'),
      storagePath: document.getElementById('db-storage-path'),
      storageRefreshBtn: document.getElementById('db-storage-refresh-btn'),
      storageTbody: document.getElementById('db-storage-tbody'),
      targetModal: document.getElementById('db-target-modal'),
      targetForm: document.getElementById('db-target-form'),
      targetPassword: document.getElementById('db-target-password'),
      targetCancel: document.getElementById('db-target-cancel'),
      targetError: document.getElementById('db-target-error')
    };

    async function checkGasStatus() {
      if (!BACKEND_GAS_URL) return 'Not Configured';
      try {
        const res = await fetch(BACKEND_GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'ping' }) });
        // Even if 'Unknown action' returned, if status is 200/204 it's online
        return res.ok || res.status === 200 ? 'Online' : `Error (${res.status})`;
      } catch (e) { return 'Offline'; }
    }

    async function checkDatabaseStatus(dbInstance, probePath) {
      if (!dbInstance) return 'Not Configured';
      try {
        const snap = await get(ref(dbInstance, probePath));
        return snap.exists() ? 'Online' : 'Online (Empty)';
      } catch (err) {
        return `Offline (${err.message || 'error'})`;
      }
    }

    async function checkSupabaseStatus() {
      const supabaseUrl = window.ENV?.SUPABASE_URL;
      const anonKey = window.ENV?.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) return 'Not Configured';
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
          }
        });
        return `Online (${res.status})`;
      } catch (err) {
        return 'Offline';
      }
    }

    async function checkCloudinaryStatus() {
      const cloudName = window.ENV?.CLOUDINARY_CLOUD_NAME;
      if (!cloudName) return 'Not Configured';
      const testUrl = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/sample`;
      try {
        const res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
        return `Online (${res.status})`;
      } catch (err) {
        return 'Offline';
      }
    }

    function getStatusCheckTimeLabel() {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    function setCloudinaryUsageFallback(text) {
      if (elements.cloudinaryImpressions) elements.cloudinaryImpressions.textContent = text;
      if (elements.cloudinaryAssets) elements.cloudinaryAssets.textContent = text;
      if (elements.cloudinaryTransformations) elements.cloudinaryTransformations.textContent = text;
      if (elements.cloudinaryBandwidth) elements.cloudinaryBandwidth.textContent = text;
      if (elements.cloudinaryStorage) elements.cloudinaryStorage.textContent = text;
      cloudinaryStorageInfo = { usedText: '--', ratio: 0 };
    }

    function formatBytes(value) {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) return '--';
      if (num < 1024) return `${num.toFixed(0)} B`;
      if (num < 1024 * 1024) return `${(num / 1024).toFixed(2)} KB`;
      if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`;
      return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    async function loadSupabaseUsageOverview() {
      const supabaseUrl = window.ENV?.SUPABASE_URL;
      const anonKey = window.ENV?.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) {
        supabaseStorageInfo = { usedText: 'Not Configured', ratio: 0 };
        return;
      }

      const tables = ['sas_attendance_logs', 'sas_schedules'];
      let totalRows = 0;

      try {
        const counts = await Promise.all(tables.map(async (table) => {
          try {
            const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                Range: '0-0',
                Prefer: 'count=exact'
              }
            });
            if (!res.ok) return 0;
            const contentRange = res.headers.get('content-range');
            if (contentRange) {
              const count = parseInt(contentRange.split('/')[1]);
              return Number.isFinite(count) ? count : 0;
            }
            return 0;
          } catch (e) { return 0; }
        }));

        totalRows = counts.reduce((a, b) => a + b, 0);
        
        // Estimation: ~200 bytes per row + some overhead
        const estimatedBytes = totalRows * 200;
        const limitBytes = 500 * 1024 * 1024; // Supabase free tier db limit is 500MB
        const ratio = Math.min(100, Math.max(0.1, (estimatedBytes / limitBytes) * 100));
        
        supabaseStorageInfo = { 
          usedText: `${totalRows.toLocaleString()} rows / ~${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB estimated`,
          ratio: Number(ratio.toFixed(2))
        };
      } catch (err) {
        supabaseStorageInfo = { usedText: 'Error fetching', ratio: 0 };
      }
    }

    async function loadCloudinaryUsageOverview() {
      if (!BACKEND_GAS_URL || !BACKEND_GAS_URL.startsWith('https://')) {
        setCloudinaryUsageFallback('N/A');
        return;
      }

      const defaultLimitGb = Number(window.ENV?.CLOUDINARY_STORAGE_LIMIT_GB || 15);
      const fallbackLimitBytes = Number.isFinite(defaultLimitGb) && defaultLimitGb > 0
        ? defaultLimitGb * 1024 * 1024 * 1024
        : 15 * 1024 * 1024 * 1024;

      const applyUsageToUi = (usage, periodLabel) => {
        const storageBytes = Number(usage.storage);
        const storageLimitBytes = Number(usage.storageLimit || usage.storage_limit || usage.limit);
        const effectiveLimit = Number.isFinite(storageLimitBytes) && storageLimitBytes > 0
          ? storageLimitBytes
          : fallbackLimitBytes;
        const ratio = Number.isFinite(storageBytes) && storageBytes >= 0
          ? Math.min(100, Math.max(0, (storageBytes / effectiveLimit) * 100))
          : 0;
        const usedLine = `${formatBytes(storageBytes)} / ${formatBytes(effectiveLimit)} used`;

        if (elements.cloudinaryImpressions) elements.cloudinaryImpressions.textContent = usage.impressions ?? '--';
        if (elements.cloudinaryAssets) elements.cloudinaryAssets.textContent = usage.assets ?? '--';
        if (elements.cloudinaryTransformations) elements.cloudinaryTransformations.textContent = usage.transformations ?? '--';
        if (elements.cloudinaryBandwidth) elements.cloudinaryBandwidth.textContent = usage.bandwidthFormatted || formatBytes(usage.bandwidth);
        if (elements.cloudinaryStorage) elements.cloudinaryStorage.textContent = usage.storageFormatted || formatBytes(usage.storage);
        if (elements.cloudinaryPeriodLabel && periodLabel) elements.cloudinaryPeriodLabel.textContent = periodLabel;
        cloudinaryStorageInfo = { usedText: usedLine, ratio: Number(ratio.toFixed(1)) };
      };

      const estimateCloudinaryUsageFromPosts = async () => {
        try {
          const postsRes = await fetch(BACKEND_GAS_URL, { method: 'GET' });
          if (!postsRes.ok) throw new Error('Posts fetch failed');
          const postsPayload = await postsRes.json();
          const posts = Array.isArray(postsPayload?.posts) ? postsPayload.posts : [];
          const cloudName = window.ENV?.CLOUDINARY_CLOUD_NAME || '';
          const urls = [...new Set(
            posts
              .map(p => (p?.imageUrl || '').trim())
              .filter(url => url.includes('res.cloudinary.com') && (!cloudName || url.includes(`/res.cloudinary.com/${cloudName}/`) || url.includes(`res.cloudinary.com/${cloudName}/`)))
          )];

          let totalBytes = 0;
          for (const url of urls.slice(0, 50)) {
            try {
              const headRes = await fetch(url, { method: 'HEAD', mode: 'cors' });
              const len = Number(headRes.headers.get('content-length') || 0);
              if (Number.isFinite(len) && len > 0) totalBytes += len;
            } catch (e) {
              // Ignore per-asset failures and continue estimating.
            }
          }

          applyUsageToUi({
            impressions: '--',
            assets: urls.length,
            transformations: '--',
            bandwidth: null,
            storage: totalBytes,
            storageLimit: fallbackLimitBytes
          }, 'Estimated from current posts');
        } catch (e) {
          setCloudinaryUsageFallback('N/A');
          if (elements.cloudinaryPeriodLabel) elements.cloudinaryPeriodLabel.textContent = 'Usage unavailable';
        }
      };

      try {
        const res = await fetch(BACKEND_GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'cloudinaryUsageOverview' })
        });
        if (!res.ok) return estimateCloudinaryUsageFromPosts();

        const payload = await res.json();
        if (payload?.success === false && /Unknown action/i.test(payload?.message || '')) {
          return estimateCloudinaryUsageFromPosts();
        }
        const usage = payload?.usage || payload?.data || {};
        if (!usage || typeof usage !== 'object') {
          return estimateCloudinaryUsageFromPosts();
        }
        applyUsageToUi(usage, 'Last 30 days');
      } catch (err) {
        await estimateCloudinaryUsageFromPosts();
      }
    }

    function renderStorageStatusRows(gasState, fbMsgState, fbStoreState, supabaseState, cloudinaryState, storagePath) {
      if (!elements.storageTbody) return;
      const targetValues = {
        gas: BACKEND_GAS_URL || 'Not Configured',
        fbMsg: window.ENV?.FIREBASE_CONFIG?.databaseURL || 'Not Configured',
        fbStore: window.ENV?.STORAGE_CHECK_FIREBASE_CONFIG?.databaseURL || 'Not Configured',
        supabase: window.ENV?.SUPABASE_URL || 'Not Configured',
        cloudinary: window.ENV?.CLOUDINARY_CLOUD_NAME || 'Not Configured'
      };
      const maskedText = '********';
      const targetCellHtml = (key) => {
        const isRevealed = revealedTargets[key];
        const shownValue = isRevealed ? targetValues[key] : maskedText;
        const icon = isRevealed ? '&#128065;&#65039;' : '&#128584;';
        return `
          <div class="db-target-cell">
            <span class="db-target-value">${escapeHtml(shownValue)}</span>
            <button class="db-target-eye" type="button" title="Reveal target" onclick="dbPromptRevealTarget('${key}')">${icon}</button>
          </div>
        `;
      };
      elements.storageTbody.innerHTML = `
        <tr>
          <td>Google Sheets (GAS Backend)</td>
          <td>${targetCellHtml('gas')}</td>
          <td>${escapeHtml(gasState)}</td>
          <td class="db-table-storage-cell">
            <div class="db-mini-storage-text">~10M Cells Limit</div>
            <div class="db-mini-storage-bar">
              <div class="db-mini-storage-fill" style="width:0.1%;"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td>Firebase Messaging</td>
          <td>${targetCellHtml('fbMsg')}</td>
          <td>${escapeHtml(fbMsgState)}</td>
          <td class="db-table-storage-cell">
            <div class="db-mini-storage-text">1GB Limit (Free)</div>
            <div class="db-mini-storage-bar">
              <div class="db-mini-storage-fill" style="width:0.1%;"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td>Firebase Storage DB</td>
          <td>${targetCellHtml('fbStore')}</td>
          <td>${escapeHtml(fbStoreState)}</td>
          <td class="db-table-storage-cell">
            <div class="db-mini-storage-text">1GB Limit (Free)</div>
            <div class="db-mini-storage-bar">
              <div class="db-mini-storage-fill" style="width:0.1%;"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td>Supabase Database</td>
          <td>${targetCellHtml('supabase')}</td>
          <td>${escapeHtml(supabaseState)}</td>
          <td class="db-table-storage-cell">
            <div class="db-mini-storage-text">${escapeHtml(supabaseStorageInfo.usedText)} (500MB Limit)</div>
            <div class="db-mini-storage-bar">
              <div class="db-mini-storage-fill" style="width:${supabaseStorageInfo.ratio}%;"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td>Cloudinary Media</td>
          <td>${targetCellHtml('cloudinary')}</td>
          <td>${escapeHtml(cloudinaryState)}</td>
          <td class="db-table-storage-cell">
            <div class="db-mini-storage-text">${escapeHtml(cloudinaryStorageInfo.usedText)} (${window.ENV?.CLOUDINARY_STORAGE_LIMIT_GB || 15}GB Limit)</div>
            <div class="db-mini-storage-bar">
              <div class="db-mini-storage-fill" style="width:${cloudinaryStorageInfo.ratio}%;"></div>
            </div>
          </td>
        </tr>
      `;
    }

    function switchDbPanel(view) {
      const showMessaging = view !== 'storage';
      if (elements.panelMessaging) elements.panelMessaging.classList.toggle('hidden', !showMessaging);
      if (elements.panelStorage) elements.panelStorage.classList.toggle('hidden', showMessaging);
      if (elements.tabMessaging) elements.tabMessaging.classList.toggle('active', showMessaging);
      if (elements.tabStorage) elements.tabStorage.classList.toggle('active', !showMessaging);
    }

    async function updateDatabaseStatuses() {
      const storagePath = (elements.storagePath?.value || '').trim() || window.ENV?.STORAGE_CHECK_PATH || 'storage_check_health';
      const [gasState, fbMsgState, fbStoreState, supabaseState, cloudinaryState] = await Promise.all([
        checkGasStatus(),
        checkDatabaseStatus(userDb, 'user_messages'),
        checkDatabaseStatus(storageCheckDb, storagePath),
        checkSupabaseStatus(),
        checkCloudinaryStatus()
      ]);
      lastStatusSnapshot = { gasState, fbMsgState, fbStoreState, supabaseState, cloudinaryState, storagePath };

      renderStorageStatusRows(gasState, fbMsgState, fbStoreState, supabaseState, cloudinaryState, storagePath);
      
      await Promise.all([
        loadCloudinaryUsageOverview(),
        loadSupabaseUsageOverview()
      ]);
      
      // Re-render table so "Storage Currently" reflects the latest usage fetch.
      renderStorageStatusRows(gasState, fbMsgState, fbStoreState, supabaseState, cloudinaryState, storagePath);
    }

    function rerenderStorageRows() {
      renderStorageStatusRows(
        lastStatusSnapshot.gasState,
        lastStatusSnapshot.fbMsgState,
        lastStatusSnapshot.fbStoreState,
        lastStatusSnapshot.supabaseState,
        lastStatusSnapshot.cloudinaryState,
        lastStatusSnapshot.storagePath
      );
    }

    function closeTargetModal() {
      pendingRevealTarget = null;
      if (elements.targetModal) elements.targetModal.classList.add('hidden');
      if (elements.targetPassword) elements.targetPassword.value = '';
      if (elements.targetError) elements.targetError.textContent = '';
    }

    window.dbPromptRevealTarget = function(targetKey) {
      pendingRevealTarget = targetKey;
      if (elements.targetError) elements.targetError.textContent = '';
      if (elements.targetPassword) elements.targetPassword.value = '';
      if (elements.targetModal) elements.targetModal.classList.remove('hidden');
      if (elements.targetPassword) elements.targetPassword.focus();
    };

    elements.targetCancel?.addEventListener('click', closeTargetModal);
    elements.targetModal?.addEventListener('click', (e) => {
      if (e.target === elements.targetModal) closeTargetModal();
    });
    elements.targetForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!pendingRevealTarget) return;
      const enteredPassword = (elements.targetPassword?.value || '').trim();
      let sessionPassword = '';
      try {
        const raw = localStorage.getItem('sas_user_data') || sessionStorage.getItem('sas_user_data') || '{}';
        sessionPassword = JSON.parse(raw).password || '';
      } catch (err) {}

      if (!sessionPassword) {
        if (elements.targetError) elements.targetError.textContent = 'Session password is unavailable. Please sign in again.';
        return;
      }
      if (enteredPassword !== sessionPassword) {
        if (elements.targetError) elements.targetError.textContent = 'Invalid password.';
        return;
      }
      revealedTargets[pendingRevealTarget] = true;
      closeTargetModal();
      rerenderStorageRows();
    });

    async function loadMessages() {
      try {
        await updateDatabaseStatuses();
        const userSnap = await get(ref(userDb, 'user_messages'));
        const adminSnap = await get(ref(userDb, 'admin_messages'));

        const userData = userSnap.val() || {};
        const adminData = adminSnap.val() || {};

        allMessages = [];
        uniqueUsers = new Set();

        Object.entries(userData).forEach(([key, msg]) => {
          allMessages.push({ ...msg, _key: key, _type: 'user' });
          if (msg.sender) uniqueUsers.add(msg.sender);
          if (msg.receiver) uniqueUsers.add(msg.receiver);
        });

        Object.entries(adminData).forEach(([key, msg]) => {
          allMessages.push({ ...msg, _key: key, _type: 'admin' });
          if (msg.sender) uniqueUsers.add(msg.sender);
          if (msg.receiver) uniqueUsers.add(msg.receiver);
        });

        allMessages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        updateUserFilter();
        applyFilters();
        updateStats();
        showToast('Messages loaded', 'success');
      } catch (err) {
        console.error("Failed to load messages:", err);
        await updateDatabaseStatuses();
        showToast('Error loading: ' + err.message, 'error');
      }
    }

    function updateStats() {
      const userMsgs = allMessages.filter(m => m._type === 'user');
      const adminMsgs = allMessages.filter(m => m._type === 'admin');

      if (elements.totalStat) elements.totalStat.textContent = allMessages.length;
      if (elements.userCount) elements.userCount.textContent = userMsgs.length;
      if (elements.adminCount) elements.adminCount.textContent = adminMsgs.length;
      if (elements.activeUsers) elements.activeUsers.textContent = uniqueUsers.size;
    }

    function updateUserFilter() {
      const filterUser = elements.filterUser;
      if (!filterUser) return;

      const currentVal = filterUser.value;
      filterUser.innerHTML = '<option value="">All Users</option>';
      Array.from(uniqueUsers).sort().forEach(user => {
        const opt = document.createElement('option');
        opt.value = user;
        opt.textContent = user;
        filterUser.appendChild(opt);
      });
      filterUser.value = currentVal;
    }

    function applyFilters() {
      const search = elements.search?.value.toLowerCase() || '';
      const typeFilter = elements.filterType?.value || 'all';
      const userFilter = elements.filterUser?.value || '';
      const dateFrom = elements.filterDateFrom?.value || '';
      const dateTo = elements.filterDateTo?.value || '';

      filteredMessages = allMessages.filter(msg => {
        if (typeFilter !== 'all' && msg._type !== typeFilter) return false;
        if (userFilter && msg.sender !== userFilter && msg.receiver !== userFilter) return false;
        if (search) {
          const searchStr = (msg.text || msg.sender || msg.receiver || '').toLowerCase();
          if (!searchStr.includes(search)) return false;
        }
        if (dateFrom || dateTo) {
          const msgDate = msg.timestamp ? new Date(msg.timestamp).toISOString().split('T')[0] : '';
          if (dateFrom && msgDate < dateFrom) return false;
          if (dateTo && msgDate > dateTo) return false;
        }
        return true;
      });

      currentPage = 1;
      renderTable();
    }

    function renderTable() {
      if (!elements.tbody) return;

      const start = (currentPage - 1) * perPage;
      const end = start + perPage;
      const pageMsgs = filteredMessages.slice(start, end);

      elements.tbody.innerHTML = pageMsgs.map((msg, idx) => {
        const globalIdx = start + idx;
        const typeClass = msg._type || 'user';
        const typeLabel = (msg._type || 'user').toUpperCase();
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';
        const messageText = msg.text || '(empty)';
        const fromUser = msg.sender || 'Unknown';
        const toUser = msg.receiver || 'All';

        return `
          <tr>
            <td><input type="checkbox" class="db-msg-check" data-idx="${globalIdx}"></td>
            <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
            <td>${escapeHtml(fromUser)}</td>
            <td>${escapeHtml(toUser)}</td>
            <td class="message-cell" title="${escapeHtml(messageText)}">${escapeHtml(messageText)}</td>
            <td class="timestamp-cell">${timestamp}</td>
            <td>
              <button class="action-btn delete" onclick="deleteMessage('${msg._type}', '${msg._key}')">Delete</button>
            </td>
          </tr>
        `;
      }).join('');

      const totalPages = Math.max(1, Math.ceil(filteredMessages.length / perPage));
      if (elements.pageInfo) {
        elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      }
      if (elements.prevBtn) elements.prevBtn.disabled = currentPage <= 1;
      if (elements.nextBtn) elements.nextBtn.disabled = currentPage >= totalPages;
    }


    window.deleteMessage = async function(type, key) {
      if (!confirm(`Delete this ${type} message?`)) return;
      try {
        await remove(ref(userDb, `${type}_messages/${key}`));
        showToast('Message deleted', 'success');
        loadMessages();
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    };

    elements.search?.addEventListener('input', applyFilters);
    elements.filterType?.addEventListener('change', applyFilters);
    elements.filterUser?.addEventListener('change', applyFilters);
    elements.filterDateFrom?.addEventListener('change', applyFilters);
    elements.filterDateTo?.addEventListener('change', applyFilters);

    elements.perPage?.addEventListener('change', (e) => {
      perPage = parseInt(e.target.value) || 25;
      currentPage = 1;
      renderTable();
    });

    elements.prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderTable(); }
    });

    elements.nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredMessages.length / perPage);
      if (currentPage < totalPages) { currentPage++; renderTable(); }
    });

    elements.selectAll?.addEventListener('change', (e) => {
      document.querySelectorAll('.db-msg-check').forEach(cb => cb.checked = e.target.checked);
    });

    elements.refreshBtn?.addEventListener('click', loadMessages);
    elements.storageRefreshBtn?.addEventListener('click', updateDatabaseStatuses);
    elements.tabMessaging?.addEventListener('click', () => switchDbPanel('messaging'));
    elements.tabStorage?.addEventListener('click', () => switchDbPanel('storage'));

    elements.exportBtn?.addEventListener('click', () => {
      const dataStr = JSON.stringify(filteredMessages, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Messages exported', 'success');
    });

    elements.deleteFilteredBtn?.addEventListener('click', async () => {
      if (filteredMessages.length === 0) {
        showToast('No messages to delete', 'error');
        return;
      }
      if (!confirm(`Delete ${filteredMessages.length} filtered messages? This cannot be undone.`)) return;
      
      let deleted = 0;
      for (const msg of filteredMessages) {
        try {
          await remove(ref(userDb, `${msg._type}_messages/${msg._key}`));
          deleted++;
        } catch (e) { console.error('Delete error:', e); }
      }
      showToast(`Deleted ${deleted} messages`, 'success');
      loadMessages();
    });

    elements.clearAllBtn?.addEventListener('click', async () => {
      if (!confirm('DELETE ALL MESSAGES? This cannot be undone!')) return;
      try {
        await remove(ref(userDb, 'user_messages'));
        await remove(ref(userDb, 'admin_messages'));
        showToast('All messages cleared', 'success');
        loadMessages();
      } catch (err) {
        showToast('Clear failed: ' + err.message, 'error');
      }
    });

    switchDbPanel('messaging');
    loadMessages();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#database') {
      initDatabaseManagement();
    }
  });

  // --- Settings Modal Functions ---
  window.openSettingsModal = function() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    const sessionData = localStorage.getItem('sas_user_data');
    if (!sessionData) return;
    
    const user = JSON.parse(sessionData);
    
    // Populate profile tab
    const profilePicPreview = document.getElementById('settings-profile-pic-preview');
    const profilePicInitial = document.getElementById('settings-profile-pic-initial');
    const displayNameInput = document.getElementById('settings-display-name');
    const previewAvatar = document.getElementById('settings-preview-avatar');
    const previewAvatarInitial = document.getElementById('settings-preview-avatar-initial');
    const previewName = document.getElementById('settings-preview-name');
    const usernameInput = document.getElementById('settings-username');
    
    const displayName = user.displayName || user.username;
    const initial = (user.profilePic && user.profilePic.startsWith('http')) ? '' : displayName.charAt(0).toUpperCase();
    
    if (user.profilePic && user.profilePic.startsWith('http')) {
      profilePicPreview.innerHTML = `<img src="${user.profilePic}" alt="Profile">`;
      previewAvatar.innerHTML = `<img src="${user.profilePic}" alt="Profile">`;
    } else {
      profilePicPreview.innerHTML = `<span>${initial}</span>`;
      previewAvatar.innerHTML = `<span>${initial}</span>`;
    }
    
    displayNameInput.value = displayName;
    previewName.textContent = displayName;
    usernameInput.value = user.username;
    
    // Set theme selection
    const theme = user.theme || 'light';
    document.querySelectorAll('.settings-theme-option').forEach(opt => {
      opt.classList.toggle('selected', opt.getAttribute('data-theme') === theme);
    });
    
    // Clear password fields
    document.getElementById('settings-current-password').value = '';
    document.getElementById('settings-new-password').value = '';
    document.getElementById('settings-confirm-password').value = '';
    
    // Hide messages
    document.getElementById('settings-error').classList.add('hidden');
    document.getElementById('settings-success').classList.add('hidden');
    
    modal.classList.remove('hidden');
  };

  // Close settings modal
  document.addEventListener('click', (e) => {
    if (e.target.id === 'settings-close-btn' || e.target.closest('#settings-close-btn')) {
      document.getElementById('settings-modal').classList.add('hidden');
    }
  });

  // Tab switching
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.add('hidden'));
      document.getElementById(`settings-${tabName}`).classList.remove('hidden');
    });
  });

  // Profile picture upload
  document.getElementById('settings-profile-pic-btn')?.addEventListener('click', () => {
    document.getElementById('settings-profile-pic-input').click();
  });

  document.getElementById('settings-profile-pic-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview locally immediately
    const reader = new FileReader();
    reader.onload = (evt) => {
      const preview = document.getElementById('settings-profile-pic-preview');
      const previewAvatar = document.getElementById('settings-preview-avatar');
      preview.innerHTML = `<img src="${evt.target.result}" alt="Preview">`;
      previewAvatar.innerHTML = `<img src="${evt.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
    
    // Upload to backend
    const sessionData = JSON.parse(localStorage.getItem('sas_user_data'));
    const base64 = await fileToBase64(file);
    
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'uploadProfilePicture');
      formData.append('username', sessionData.username);
      formData.append('password', sessionData.password);
      formData.append('fileData', base64);
      formData.append('fileName', file.name);
      
      const res = await fetch(BACKEND_GAS_URL, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        // Update local storage
        sessionData.profilePic = data.profilePic;
        localStorage.setItem('sas_user_data', JSON.stringify(sessionData));
        
        // Update current user in contactsMap if exists
        if (contactsMap[sessionData.username]) {
          contactsMap[sessionData.username].profilePic = data.profilePic;
        }
        
        // Refresh user list and messenger UI
        fetchSpreadsheetUsers();
        if (typeof renderFullContacts === 'function') renderFullContacts();
        if (typeof initFullMessenger === 'function') {
          // Refresh the active avatar in chat if currently chatting
          const activeAvatar = document.getElementById('active-avatar');
          if (activeAvatar) {
            activeAvatar.innerHTML = `<img src="${data.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
          }
        }
        
        // Also refresh the user's own preview in settings modal
        const settingsPreview = document.getElementById('settings-profile-pic-preview');
        if (settingsPreview) settingsPreview.innerHTML = `<img src="${data.profilePic}" alt="Profile">`;
        const settingsAvatar = document.getElementById('settings-preview-avatar');
        if (settingsAvatar) settingsAvatar.innerHTML = `<img src="${data.profilePic}" alt="Profile">`;
        
        showToast('Profile picture updated!', 'success');
      } else {
        showToast(data.message || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload error: ' + err.message, 'error');
    }
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Save profile (display name)
  document.getElementById('settings-save-profile')?.addEventListener('click', async () => {
    const displayName = document.getElementById('settings-display-name').value.trim();
    if (!displayName) {
      showSettingsError('Please enter a display name');
      return;
    }
    
    const sessionData = JSON.parse(localStorage.getItem('sas_user_data'));
    
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'updateUserSettings');
      formData.append('username', sessionData.username);
      formData.append('password', sessionData.password);
      formData.append('displayName', displayName);
      
      const res = await fetch(BACKEND_GAS_URL, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        sessionData.displayName = data.user.displayName;
        localStorage.setItem('sas_user_data', JSON.stringify(sessionData));
        
        const displayNameEl = document.getElementById('user-display-name');
        const dropNameEl = document.getElementById('user-dropdown-name');
        if (displayNameEl) displayNameEl.textContent = data.user.displayName;
        if (dropNameEl) dropNameEl.textContent = data.user.displayName;
        
        document.getElementById('settings-preview-name').textContent = data.user.displayName;
        showSettingsSuccess('Profile updated successfully!');
      } else {
        showSettingsError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      showSettingsError('Error: ' + err.message);
    }
  });

  // Change password
  document.getElementById('settings-save-password')?.addEventListener('click', async () => {
    const currentPass = document.getElementById('settings-current-password').value;
    const newPass = document.getElementById('settings-new-password').value;
    const confirmPass = document.getElementById('settings-confirm-password').value;
    
    if (!currentPass || !newPass || !confirmPass) {
      showSettingsError('Please fill in all password fields');
      return;
    }
    
    if (newPass !== confirmPass) {
      showSettingsError('New passwords do not match');
      return;
    }
    
    if (newPass.length < 4) {
      showSettingsError('Password must be at least 4 characters');
      return;
    }
    
    const sessionData = JSON.parse(localStorage.getItem('sas_user_data'));
    
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'updateUserSettings');
      formData.append('username', sessionData.username);
      formData.append('password', currentPass);
      formData.append('newPassword', newPass);
      
      const res = await fetch(BACKEND_GAS_URL, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        sessionData.password = newPass;
        localStorage.setItem('sas_user_data', JSON.stringify(sessionData));
        
        document.getElementById('settings-current-password').value = '';
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
        
        showSettingsSuccess('Password changed successfully!');
      } else {
        showSettingsError(data.message || 'Failed to change password');
      }
    } catch (err) {
      showSettingsError('Error: ' + err.message);
    }
  });

  // Theme toggle
  document.querySelectorAll('.settings-theme-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const theme = opt.getAttribute('data-theme');
      
      document.querySelectorAll('.settings-theme-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Apply theme immediately
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('sas_theme', theme);
      
      // Save to backend
      const sessionData = JSON.parse(localStorage.getItem('sas_user_data'));
      
      try {
        const formData = new URLSearchParams();
        formData.append('action', 'updateUserSettings');
        formData.append('username', sessionData.username);
        formData.append('password', sessionData.password);
        formData.append('theme', theme);
        
        const res = await fetch(BACKEND_GAS_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
          sessionData.theme = theme;
          localStorage.setItem('sas_user_data', JSON.stringify(sessionData));
          showToast('Theme updated!', 'success');
        }
      } catch (err) {
        console.error('Theme save error:', err);
      }
    });
  });

  function showSettingsError(msg) {
    const el = document.getElementById('settings-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('settings-success').classList.add('hidden');
  }

  function showSettingsSuccess(msg) {
    const el = document.getElementById('settings-success');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('settings-error').classList.add('hidden');
  }

  // Initialize theme on page load
  (function() {
    const savedTheme = localStorage.getItem('sas_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  })();
});

// =============================================================
// LP ACTIVITIES SYSTEM
// =============================================================

// Cache all activities for the full-page view
let _lpAllActivities = [];

// --- PUBLIC: load & render activities on landing page ---
function initLpActivities() {
  if (!userDb) return;
  const grid = document.getElementById('lp-activities-grid');

  // ---- LP Nav Active State Management ----
  const lpNavLinks = document.querySelectorAll('.lp-nav-links a');

  function setLpActiveLink(href) {
    lpNavLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === href);
    });
  }

  // Click: set immediately
  lpNavLinks.forEach(a => {
    a.addEventListener('click', () => {
      setLpActiveLink(a.getAttribute('href'));
    });
  });

  // Scroll: use IntersectionObserver to detect visible section
  const lpSections = document.querySelectorAll(
    '#lp-hero, #lp-about, #lp-services, #lp-documents, #lp-activities'
  );

  if (lpSections.length && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      // Find the entry that is most in view
      let best = null;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
      });
      if (best) {
        setLpActiveLink('#' + best.target.id);
      }
    }, {
      threshold: [0.3, 0.5],
      rootMargin: '-10% 0px -10% 0px'
    });

    lpSections.forEach(sec => observer.observe(sec));
  }

  // ---- Firebase activities listener ----
  if (!grid) return;

  const lpRef = ref(userDb, 'lp_activities');
  onValue(lpRef, (snapshot) => {
    const data = snapshot.val();
    const activities = data
      ? Object.entries(data)
          .map(([key, val]) => ({ id: key, ...val }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];

    // Cache for full-page view
    _lpAllActivities = activities;

    // Teaser: show latest 6
    renderLpActivities(activities.slice(0, 6), grid);

    // Always show "See More" button
    const viewAllWrap = document.getElementById('lp-view-all-wrap');
    if (viewAllWrap) viewAllWrap.style.display = 'block';

    // Keep full-page grid in sync if it's open
    if (document.getElementById('lp-all-activities-page')?.classList.contains('lp-all-act-open')) {
      renderLpAllActGrid(_lpAllActivities);
    }
  });

  // Wire up the full-page
  initLpAllActivitiesPage();
}

function renderLpActivities(activities, grid) {
  if (!grid) return;
  grid.innerHTML = '';

  if (activities.length === 0) {
    grid.innerHTML = `
      <div class="lp-activities-empty">
        <i class='bx bx-calendar-x'></i>
        <p>No activities yet. Check back soon!</p>
      </div>`;
    return;
  }

  activities.forEach((act, idx) => {
    const card = document.createElement('article');
    card.className = 'lp-activity-card';
    card.style.animationDelay = `${idx * 0.08}s`;

    let dateStr = act.date || '';
    if (dateStr) {
      try {
        const d = new Date(dateStr + 'T00:00:00');
        dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch(e) {}
    }

    const imgHtml = act.imageUrl
      ? `<img class="lp-activity-img" src="${escapeHtml(act.imageUrl)}" alt="${escapeHtml(act.title)}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\'lp-activity-img-placeholder\'><i class=\'bx bx-image-alt\'></i></div>'">`
      : `<div class="lp-activity-img-placeholder"><i class='bx bx-image-alt'></i></div>`;

    card.innerHTML = `
      ${imgHtml}
      <div class="lp-activity-content">
        <span class="lp-activity-date"><i class='bx bx-calendar'></i> ${escapeHtml(dateStr)}</span>
        <h3 class="lp-activity-title">${escapeHtml(act.title)}</h3>
        <p class="lp-activity-excerpt">${escapeHtml(act.excerpt || '')}</p>
      </div>`;

    grid.appendChild(card);
  });
}

// --- FULL-PAGE ACTIVITIES VIEW ---
function initLpAllActivitiesPage() {
  const page       = document.getElementById('lp-all-activities-page');
  const viewAllBtn = document.getElementById('lp-view-all-btn');
  const backBtn    = document.getElementById('lp-all-act-back');
  const searchInput = document.getElementById('lp-all-act-search');
  const yearSelect  = document.getElementById('lp-all-act-year');

  if (!page || !viewAllBtn) return;

  // Open
  viewAllBtn.addEventListener('click', () => {
    page.classList.add('lp-all-act-open');
    page.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Reset search
    if (searchInput) searchInput.value = '';
    if (yearSelect)  yearSelect.value  = '';
    buildYearFilter();
    renderLpAllActGrid(_lpAllActivities);
    if (searchInput) searchInput.focus();
  });

  // Close
  if (backBtn) {
    backBtn.addEventListener('click', closeLpAllPage);
  }

  // Escape key closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && page.classList.contains('lp-all-act-open')) closeLpAllPage();
  });

  function closeLpAllPage() {
    page.classList.remove('lp-all-act-open');
    page.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Build year filter options from data
  function buildYearFilter() {
    if (!yearSelect) return;
    const years = new Set();
    _lpAllActivities.forEach(a => {
      if (a.date) {
        const y = a.date.slice(0, 4);
        if (y) years.add(y);
      }
    });
    // Keep "All Years" option, rebuild the rest
    yearSelect.innerHTML = '<option value="">All Years</option>';
    [...years].sort((a, b) => b - a).forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
  }

  // Search + year filter
  let searchTimeout;
  function applyFilters() {
    const q    = (searchInput?.value || '').trim().toLowerCase();
    const year = yearSelect?.value || '';
    const filtered = _lpAllActivities.filter(a => {
      const matchesQ    = !q || (a.title || '').toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q);
      const matchesYear = !year || (a.date || '').startsWith(year);
      return matchesQ && matchesYear;
    });
    renderLpAllActGrid(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, 250);
    });
  }
  if (yearSelect) {
    yearSelect.addEventListener('change', applyFilters);
  }
}

function renderLpAllActGrid(activities) {
  const grid  = document.getElementById('lp-all-act-grid');
  const empty = document.getElementById('lp-all-act-empty');
  const total = document.getElementById('lp-all-act-total');
  if (!grid) return;

  if (total) total.textContent = `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}`;

  if (activities.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  grid.innerHTML = '';
  activities.forEach((act, idx) => {
    const card = document.createElement('article');
    card.className = 'lp-all-act-card';
    card.style.animationDelay = `${Math.min(idx, 12) * 0.05}s`;

    let dateStr = act.date || '';
    if (dateStr) {
      try {
        const d = new Date(dateStr + 'T00:00:00');
        dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch(e) {}
    }

    const imgHtml = act.imageUrl
      ? `<img class="lp-all-act-card-img" src="${escapeHtml(act.imageUrl)}" alt="${escapeHtml(act.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling?.style.setProperty('display','flex')">`
      : '';
    const placeholderHtml = !act.imageUrl
      ? `<div class="lp-all-act-card-img-placeholder"><i class='bx bx-image-alt'></i></div>`
      : `<div class="lp-all-act-card-img-placeholder" style="display:none"><i class='bx bx-image-alt'></i></div>`;

    card.innerHTML = `
      ${imgHtml}${placeholderHtml}
      <div class="lp-all-act-card-body">
        <div class="lp-all-act-card-date"><i class='bx bx-calendar'></i> ${escapeHtml(dateStr)}</div>
        <h3 class="lp-all-act-card-title">${escapeHtml(act.title)}</h3>
        <p class="lp-all-act-card-excerpt">${escapeHtml(act.excerpt || '')}</p>
      </div>`;

    grid.appendChild(card);
  });
}

// --- ADMIN: modal for managing LP activities ---
function initLpActivitiesAdmin(userObj) {
  if (!userObj || !userDb) return;
  const role = (userObj.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') return;

  // Show the admin button
  const manageBtn = document.getElementById('manage-lp-activities-btn');
  if (manageBtn) manageBtn.classList.remove('hidden');

  // Grab modal elements
  const modal        = document.getElementById('lp-activities-modal');
  const closeBtn     = document.getElementById('lp-act-modal-close');
  const currentList  = document.getElementById('lp-act-current-list');
  const addForm      = document.getElementById('lp-act-add-form');
  const titleInput   = document.getElementById('lp-act-title');
  const excerptInput = document.getElementById('lp-act-excerpt');
  const dateInput    = document.getElementById('lp-act-date');
  const fileInput    = document.getElementById('lp-act-img-file');
  const urlInput     = document.getElementById('lp-act-img-url');
  const fileLabel    = document.getElementById('lp-act-file-label');
  const fileLabelTxt = document.getElementById('lp-act-file-label-text');
  const previewImg   = document.getElementById('lp-act-preview-img');
  const previewWrap  = document.getElementById('lp-act-img-preview');
  const urlPreviewImg  = document.getElementById('lp-act-url-preview-img');
  const urlPreviewWrap = document.getElementById('lp-act-url-preview');
  const submitBtn    = document.getElementById('lp-act-submit-btn');
  const formError    = document.getElementById('lp-act-form-error');

  if (!modal || !addForm) return;

  // Track current active tab and activities snapshot
  let activeLpTab = 'file';
  let lpActivitiesSnapshot = {};

  // ---- Open / Close ----
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      loadCurrentActivities();
      resetLpForm();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // ---- Tab Switching ----
  document.querySelectorAll('#lp-act-upload-tabs .upload-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lp-act-upload-tabs .upload-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLpTab = btn.dataset.lptab;

      document.getElementById('lp-act-panel-file').classList.toggle('hidden', activeLpTab !== 'file');
      document.getElementById('lp-act-panel-url').classList.toggle('hidden', activeLpTab !== 'url');
    });
  });

  // ---- File input preview ----
  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (fileLabelTxt) fileLabelTxt.textContent = '✅ ' + file.name;
      if (fileLabel) fileLabel.classList.add('file-selected');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (previewImg) previewImg.src = e.target.result;
        if (previewWrap) previewWrap.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });

    // Drag-and-drop
    fileLabel.addEventListener('dragover', (e) => { e.preventDefault(); fileLabel.classList.add('drag-over'); });
    fileLabel.addEventListener('dragleave', () => fileLabel.classList.remove('drag-over'));
    fileLabel.addEventListener('drop', (e) => {
      e.preventDefault();
      fileLabel.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
  }

  // ---- URL input preview (debounced) ----
  if (urlInput) {
    let urlTimeout;
    urlInput.addEventListener('input', () => {
      clearTimeout(urlTimeout);
      urlTimeout = setTimeout(() => {
        const url = urlInput.value.trim();
        if (url && urlPreviewImg && urlPreviewWrap) {
          urlPreviewImg.src = url;
          urlPreviewImg.onload  = () => urlPreviewWrap.classList.remove('hidden');
          urlPreviewImg.onerror = () => urlPreviewWrap.classList.add('hidden');
        } else if (urlPreviewWrap) {
          urlPreviewWrap.classList.add('hidden');
        }
      }, 600);
    });
  }

  // ---- Load current activities into list ----
  function loadCurrentActivities() {
    if (!currentList) return;
    currentList.innerHTML = '<div class="lp-act-loading"><div class="spinner" style="width:24px;height:24px;"></div><span>Loading…</span></div>';

    const lpRef = ref(userDb, 'lp_activities');
    get(lpRef).then((snapshot) => {
      lpActivitiesSnapshot = snapshot.val() || {};
      renderCurrentList();
    }).catch(() => {
      currentList.innerHTML = '<div class="lp-act-empty-msg">Could not load activities.</div>';
    });
  }

  function renderCurrentList() {
    if (!currentList) return;
    currentList.innerHTML = '';
    const entries = Object.entries(lpActivitiesSnapshot)
      .sort(([,a],[,b]) => (b.createdAt || 0) - (a.createdAt || 0));

    if (entries.length === 0) {
      currentList.innerHTML = '<div class="lp-act-empty-msg">No activities yet. Add one below!</div>';
      return;
    }

    entries.forEach(([key, act]) => {
      const row = document.createElement('div');
      row.className = 'lp-act-item';

      let dateStr = act.date || '';
      if (dateStr) {
        try {
          const d = new Date(dateStr + 'T00:00:00');
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch(e) {}
      }

      const thumbHtml = act.imageUrl
        ? `<div class="lp-act-item-thumb"><img src="${escapeHtml(act.imageUrl)}" alt="" onerror="this.parentNode.innerHTML='<i class=\'bx bx-image-alt\'></i>'"></div>`
        : `<div class="lp-act-item-thumb"><i class='bx bx-image-alt'></i></div>`;

      row.innerHTML = `
        ${thumbHtml}
        <div class="lp-act-item-info">
          <div class="lp-act-item-title">${escapeHtml(act.title || '')}</div>
          <div class="lp-act-item-date">${escapeHtml(dateStr)}</div>
        </div>
        <button type="button" class="lp-act-delete-btn" data-key="${escapeHtml(key)}" aria-label="Delete activity">Delete</button>`;

      const delBtn = row.querySelector('.lp-act-delete-btn');
      delBtn.addEventListener('click', async () => {
        const confirmed = await lpShowConfirm(
          'Delete Activity',
          `Are you sure you want to remove "${act.title}"? This cannot be undone.`
        );
        if (!confirmed) return;
        delBtn.disabled = true;
        delBtn.textContent = 'Deleting…';
        try {
          await remove(ref(userDb, `lp_activities/${key}`));
          delete lpActivitiesSnapshot[key];
          renderCurrentList();
          showToast('Activity deleted.', 'success');
        } catch(err) {
          delBtn.disabled = false;
          delBtn.textContent = 'Delete';
          showToast('Delete failed: ' + err.message, 'error');
        }
      });

      currentList.appendChild(row);
    });
  }

  // ---- Simple inline confirm (reuses the existing showConfirm if available) ----
  function lpShowConfirm(title, message) {
    if (typeof showConfirm === 'function') return showConfirm(title, message, false, 'danger');
    return Promise.resolve(window.confirm(message));
  }

  // ---- Form Reset ----
  function resetLpForm() {
    if (addForm) addForm.reset();
    if (fileLabelTxt) fileLabelTxt.textContent = 'Click or drag image here';
    if (fileLabel) fileLabel.classList.remove('file-selected', 'drag-over');
    if (previewWrap) previewWrap.classList.add('hidden');
    if (urlPreviewWrap) urlPreviewWrap.classList.add('hidden');
    if (formError) formError.classList.add('hidden');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Add Activity'; }
    // Reset to file tab
    document.querySelectorAll('#lp-act-upload-tabs .upload-tab').forEach(b => b.classList.remove('active'));
    const firstTab = document.querySelector('#lp-act-upload-tabs .upload-tab[data-lptab="file"]');
    if (firstTab) firstTab.classList.add('active');
    activeLpTab = 'file';
    document.getElementById('lp-act-panel-file')?.classList.remove('hidden');
    document.getElementById('lp-act-panel-url')?.classList.add('hidden');
  }

  // ---- Form Submit ----
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (formError) formError.classList.add('hidden');

    const title   = (titleInput?.value || '').trim();
    const excerpt = (excerptInput?.value || '').trim();
    const date    = (dateInput?.value || '').trim();

    if (!title || !excerpt || !date) {
      if (formError) { formError.textContent = 'Title, description and date are required.'; formError.classList.remove('hidden'); }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading…';

    try {
      let imageUrl = '';

      if (activeLpTab === 'url') {
        imageUrl = (urlInput?.value || '').trim();
      } else if (activeLpTab === 'file' && fileInput?.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10 MB).');

        // Upload to Cloudinary
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', window.ENV?.CLOUDINARY_UPLOAD_PRESET || 'sas_uploads');
        fd.append('folder', 'sas_lp_activities');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${window.ENV?.CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: fd
        });
        const cloudData = await res.json();
        if (!cloudData.secure_url) throw new Error(cloudData.error?.message || 'Cloudinary upload failed.');
        imageUrl = cloudData.secure_url;
      }

      // Save to Firebase
      const newActivity = {
        title,
        excerpt,
        date,
        imageUrl,
        uploadedBy: userObj.username || 'admin',
        createdAt: Date.now()
      };

      await push(ref(userDb, 'lp_activities'), newActivity);

      showToast('Activity added to landing page!', 'success');
      resetLpForm();
      loadCurrentActivities(); // refresh list

    } catch(err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Activity';
      if (formError) { formError.textContent = err.message; formError.classList.remove('hidden'); }
    }
  });
}

/* =========================================================
   LP DOCUMENTS SYSTEM
   ========================================================= */

let _lpAllDocuments = [];
let _lpDocFilterCat = '';
let _lpDocFilterYear = '';

function initLpDocuments() {
  if (!userDb) return;
  const grid = document.getElementById('lp-docs-grid');
  const emptyState = document.getElementById('lp-docs-empty');
  const catTabs = document.querySelectorAll('.lp-docs-tab');
  const yearSelect = document.getElementById('lp-docs-year');
  if (!grid) return;

  const docsRef = ref(userDb, 'lp_documents');

  // Sync from Firebase
  onValue(docsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      _lpAllDocuments = [];
      renderLpDocuments();
      return;
    }

    _lpAllDocuments = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    updateLpDocYears();
    renderLpDocuments();
  });

  // Category Filtering
  catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _lpDocFilterCat = tab.getAttribute('data-cat') || '';
      renderLpDocuments();
    });
  });

  // Year Filtering
  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      _lpDocFilterYear = yearSelect.value;
      renderLpDocuments();
    });
  }

  function updateLpDocYears() {
    if (!yearSelect) return;
    const years = [...new Set(_lpAllDocuments.map(d => new Date(d.date).getFullYear()))].sort((a, b) => b - a);
    const current = yearSelect.value;
    yearSelect.innerHTML = '<option value="">All Years</option>' + 
      years.map(y => `<option value="${y}" ${y == current ? 'selected' : ''}>${y}</option>`).join('');
  }

  function renderLpDocuments() {
    grid.innerHTML = '';
    
    const filtered = _lpAllDocuments.filter(doc => {
      const matchCat = !_lpDocFilterCat || doc.category === _lpDocFilterCat;
      const matchYear = !_lpDocFilterYear || new Date(doc.date).getFullYear().toString() === _lpDocFilterYear;
      return matchCat && matchYear;
    });

    if (filtered.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    filtered.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'lp-doc-card';
      card.setAttribute('data-cat', doc.category || 'Memo');
      
      const dateObj = new Date(doc.date);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      card.innerHTML = `
        <div class="lp-doc-card-top">
          <div class="lp-doc-icon">
            <i class='bx ${getDocIcon(doc.category)}'></i>
          </div>
          <div class="lp-doc-meta">
            <span class="lp-doc-badge">${doc.category || 'Memo'}</span>
            <h4 class="lp-doc-title">${escapeHtml(doc.title)}</h4>
            <div class="lp-doc-date">
              <i class='bx bx-calendar'></i> ${dateStr}
            </div>
          </div>
        </div>
        ${doc.description ? `<p class="lp-doc-desc">${escapeHtml(doc.description)}</p>` : '<div style="flex:1"></div>'}
        <a href="${doc.url}" target="_blank" rel="noopener" class="lp-doc-view-btn">
          <i class='bx bx-show-alt'></i> View Document
        </a>
      `;
      grid.appendChild(card);
    });
  }

  function getDocIcon(cat) {
    switch(cat) {
      case 'Memo': return 'bx-file';
      case 'Advisory': return 'bx-info-circle';
      case 'Form': return 'bx-edit-alt';
      case 'Resolution': return 'bx-badge-check';
      case 'Issuance': return 'bx-certification';
      default: return 'bx-file';
    }
  }
}

// ---- ADMIN: Manage Documents ----
function initLpDocumentsAdmin(userObj) {
  if (!userDb || !userObj) return;
  const role = userObj.role?.toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') return;

  const manageBtn = document.getElementById('manage-lp-docs-btn');
  const modal = document.getElementById('lp-docs-modal');
  const closeBtn = document.getElementById('lp-docs-modal-close');
  const currentList = document.getElementById('lp-docs-current-list');
  const addForm = document.getElementById('lp-docs-add-form');
  const submitBtn = document.getElementById('lp-docs-submit-btn');
  const formError = document.getElementById('lp-docs-form-error');

  if (!manageBtn || !modal) return;
  manageBtn.classList.remove('hidden');

  manageBtn.onclick = () => {
    modal.classList.remove('hidden');
    loadCurrentDocs();
  };

  closeBtn.onclick = () => modal.classList.add('hidden');
  
  // Close on Escape
  const handleEsc = (e) => { if (e.key === 'Escape') modal.classList.add('hidden'); };
  document.addEventListener('keydown', handleEsc);

  function loadCurrentDocs() {
    if (!currentList) return;
    currentList.innerHTML = '<div class="lp-act-loading"><div class="spinner" style="width:24px;height:24px;"></div><span>Loading&hellip;</span></div>';

    const docsRef = ref(userDb, 'lp_documents');
    get(docsRef).then(snapshot => {
      const data = snapshot.val();
      currentList.innerHTML = '';
      if (!data) {
        currentList.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:0.85rem;">No documents found.</div>';
        return;
      }

      Object.entries(data).sort((a,b) => new Date(b[1].date) - new Date(a[1].date)).forEach(([id, doc]) => {
        const row = document.createElement('div');
        row.className = 'lp-doc-item';
        row.innerHTML = `
          <div class="lp-doc-item-badge">${doc.category || 'Memo'}</div>
          <div class="lp-doc-item-info">
            <div class="lp-doc-item-title">${escapeHtml(doc.title)}</div>
            <div class="lp-doc-item-date">${doc.date}</div>
          </div>
          <button class="icon-btn delete-doc-btn" data-id="${id}" title="Delete Document" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1.1rem;">
            <i class='bx bx-trash'></i>
          </button>
        `;

        row.querySelector('.delete-doc-btn').onclick = async function() {
          const confirmed = await lpShowConfirm('Delete Document', 'Are you sure you want to delete this document? This cannot be undone.');
          if (confirmed) {
            await remove(ref(userDb, `lp_documents/${id}`));
            showToast('Document deleted', 'info');
            loadCurrentDocs();
          }
        };

        currentList.appendChild(row);
      });
    });
  }

  addForm.onsubmit = async (e) => {
    e.preventDefault();
    if (formError) formError.classList.add('hidden');

    const title = document.getElementById('lp-doc-title').value.trim();
    const category = document.getElementById('lp-doc-category').value;
    const date = document.getElementById('lp-doc-date').value;
    const url = document.getElementById('lp-doc-url').value.trim();
    const description = document.getElementById('lp-doc-desc').value.trim();

    if (!title || !category || !date || !url) {
      if (formError) { formError.textContent = 'All starred fields are required.'; formError.classList.remove('hidden'); }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding Document...';

    try {
      const newDoc = {
        title,
        category,
        date,
        url,
        description,
        createdAt: serverTimestamp()
      };

      await push(ref(userDb, 'lp_documents'), newDoc);
      showToast('Document added successfully!', 'success');
      addForm.reset();
      loadCurrentDocs();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Document';
    } catch(err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Document';
      if (formError) { formError.textContent = err.message; formError.classList.remove('hidden'); }
    }
  };

  function lpShowConfirm(title, message) {
    if (typeof showConfirm === 'function') return showConfirm(title, message, false, 'danger');
    return Promise.resolve(window.confirm(message));
  }
}
