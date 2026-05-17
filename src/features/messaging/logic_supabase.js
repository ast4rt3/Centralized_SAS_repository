import { supabase } from "../../core/supabase.js";
import { state } from "./state.js";
import { updateUnreadBadges } from "./ui.js";
import { getMyUsername } from "../../core/auth.js";

/**
 * Text optimization to keep messages "light"
 */
function optimizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // 1. Trim whitespace
  let optimized = text.trim();
  
  // 2. Reduce consecutive newlines to maximum of 2
  optimized = optimized.replace(/\n{3,}/g, '\n\n');
  
  // 3. Character limit (2000 chars)
  if (optimized.length > 2000) {
    optimized = optimized.substring(0, 2000) + '... [truncated]';
  }
  
  return optimized;
}

function sanitizeCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('kcxbdeqlwfkfan7nwodj')) return '';
  return url.replace(/dj8ugtlrl/gi, 'dbytj36mv');
}

/**
 * Synchronize user metadata (Display names and Profile pics) from Supabase
 */
async function syncUserMetadata() {
  try {
    const users = await fetchAllUsers();
    users.forEach(user => {
      if (!state.contactsMap[user.username]) {
        state.contactsMap[user.username] = {
          unread: 0,
          history: [],
          isOnline: false
        };
      }
      contactsMap[user.username].displayName = user.display_name;
      contactsMap[user.username].profilePic = user.profile_pic ? sanitizeCloudinaryUrl(user.profile_pic) : '';
    });
    
    // Refresh UI if necessary
    if (typeof window.refreshFullMessengerUI === 'function') {
      window.refreshFullMessengerUI();
    }
  } catch (err) {
    console.warn("[Messaging] Failed to sync user metadata:", err);
  }
}

/**
 * Initialize Supabase messaging listeners
 */
export async function initSharedMessaging(onMessageReceived) {
  const myUsername = getMyUsername();
  if (!supabase || !myUsername || myUsername === 'Unknown' || state.sharedMessagingInitialized) return;

  state.sharedMessagingInitialized = true;
  if (window.contactsMap) {
    state.contactsMap = window.contactsMap;
  } else {
    window.contactsMap = state.contactsMap;
  }
  // console.log(`[Messaging] Initializing Supabase Realtime for ${myUsername}`);

  // 1. Sync User Metadata (Display Names & Profile Pics)
  await syncUserMetadata();

  // 2. Initial Load of History
  loadInitialHistory(myUsername, onMessageReceived);

  // 2. Presence handling
  const presenceChannel = supabase.channel('online-users', {
    config: {
      presence: {
        key: myUsername,
      },
    },
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const newState = presenceChannel.presenceState();
      updatePresence(newState);
    })
    .on('presence', { event: 'join', key: myUsername }, () => {
      // console.log(`[Presence] Joined as ${myUsername}`);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user: myUsername
          });
        } catch (e) {
          console.warn("[Presence] Tracking failed:", e);
        }
      }
    });

  // 3. Subscribe to new messages
  const messageChannel = supabase
    .channel('public:user_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_messages',
        filter: `receiver=eq.${myUsername}`
      },
      (payload) => handleIncomingMessage(payload.new, onMessageReceived)
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_messages',
        filter: `sender=eq.${myUsername}`
      },
      (payload) => handleIncomingMessage(payload.new, onMessageReceived)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_messages'
      },
      (payload) => handleMessageUpdate(payload.new)
    )
    .subscribe();

  // Background fallback poll (every 10 minutes for Supabase)
  setInterval(() => syncUnreadCountFromDb(myUsername), 600000);
}

async function loadInitialHistory(myUsername, onMessageReceived) {
  // console.log(`[Messaging] Loading history for ${myUsername}...`);
  try {
    const { data, error } = await supabase
      .from('user_messages')
      .select('*')
      .or(`sender.eq.${myUsername},receiver.eq.${myUsername}`)
      .order('timestamp', { ascending: true })
      .limit(500); // Keep it light

    if (error) {
      console.error('[Messaging] History fetch error:', error);
      throw error;
    }
    
    // console.log(`[Messaging] Loaded ${data ? data.length : 0} messages from Supabase.`);
    if (data) {
      data.forEach(msg => handleIncomingMessage(msg, onMessageReceived, false));
    }
    
    // Refresh the contact list to show newly loaded conversations
    if (typeof window.refreshFullMessengerUI === 'function') {
      window.refreshFullMessengerUI();
    }
  } catch (err) {
    console.warn('[Messaging] Initial load failed:', err);
  }
}

function handleIncomingMessage(data, onMessageReceived, notify = true) {
  if (!data) return;
  const myUsername = getMyUsername();
  const otherUser = data.sender === myUsername ? data.receiver : data.sender;
  const { contactsMap } = state;

  if (!contactsMap[otherUser]) {
    contactsMap[otherUser] = { unread: 0, history: [], isOnline: false };
  }

  // Prevent duplicates
  if (contactsMap[otherUser].history.some(m => m.id === data.id)) return;

  contactsMap[otherUser].history.push(data);

  if (data.sender === otherUser && !data.read) {
    contactsMap[otherUser].unread++;
  }
  if (notify) {
      // console.log(`[Messaging] Notify triggered for message from ${data.sender}. receiver=${data.receiver}`);
      if (onMessageReceived) {
        onMessageReceived(otherUser, data);
      } else if (typeof window.showNotification === 'function') {
        // Only show toast if chat is not active
        const currentChat = window.activeChatUser || window.activeMessengerUser;
        // console.log(`[Messaging] Checking notify: currentChat=${currentChat}, otherUser=${otherUser}, sender=${data.sender}`);
        if (currentChat !== otherUser && data.sender === otherUser) {
          // console.log(`[Messaging] SUCCESS: Triggering notification for ${otherUser}`);
          window.showNotification(otherUser, data.text, (sender) => {
             if (typeof window.selectContact === 'function') {
               window.selectContact(sender);
             }
          });
        } else {
          // console.log(`[Messaging] Skip notify: currentChat matches otherUser or sender is NOT otherUser`);
        }
      } else {
        console.warn("[Messaging] window.showNotification is NOT a function!");
      }
  }

  // UI Triggers for Legacy Compatibility
  const currentChatUser = window.activeChatUser || null;
  const currentMessengerUser = window.activeMessengerUser || null;

  if (currentChatUser === otherUser && typeof window.renderMessage === 'function') {
    window.renderMessage(data, data.sender === myUsername);
  }

  if (currentMessengerUser === otherUser && typeof window.refreshFullMessengerUI === 'function') {
    window.refreshFullMessengerUI();
  }

  updateUnreadBadges();
}

function handleMessageUpdate(data) {
  if (!data) return;
  const myUsername = getMyUsername();
  const otherUser = data.sender === myUsername ? data.receiver : data.sender;
  const { contactsMap } = state;

  if (contactsMap[otherUser]) {
    const history = contactsMap[otherUser].history;
    const msgIdx = history.findIndex(m => m.id === data.id);

    if (msgIdx !== -1) {
      const wasRead = history[msgIdx].read;
      history[msgIdx] = data;
      
      if (!wasRead && data.read && data.receiver === myUsername) {
        if (contactsMap[otherUser].unread > 0) contactsMap[otherUser].unread--;
      }
      updateUnreadBadges();

      // UI Triggers for Legacy Compatibility
      const currentMessengerUser = window.activeMessengerUser || null;
      if (currentMessengerUser === otherUser && typeof window.refreshFullMessengerUI === 'function') {
        window.refreshFullMessengerUI();
      }
    }
  }
}

/**
 * Fallback sync to ensure unread counts are correct
 */
export async function syncUnreadCountFromDb(myUsername) {
  if (!supabase || !myUsername || myUsername === 'Unknown') return;

  try {
    const { data, error } = await supabase
      .from('user_messages')
      .select('sender, read')
      .eq('receiver', myUsername)
      .eq('read', false);

    if (error) throw error;

    const { contactsMap } = state;
    const unreadCounts = {};

    data.forEach(msg => {
      unreadCounts[msg.sender] = (unreadCounts[msg.sender] || 0) + 1;
    });

    // Reset current unreads before update
    Object.keys(contactsMap).forEach(k => contactsMap[k].unread = 0);

    Object.keys(unreadCounts).forEach(sender => {
      if (contactsMap[sender]) contactsMap[sender].unread = unreadCounts[sender];
    });

    updateUnreadBadges();
  } catch (err) {
    console.warn('[Messaging] Periodic sync failed:', err);
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(otherUser) {
  const myUsername = getMyUsername();
  if (!supabase || !myUsername || !otherUser) return;

  try {
    const { error } = await supabase
      .from('user_messages')
      .update({ read: true })
      .eq('receiver', myUsername)
      .eq('sender', otherUser)
      .eq('read', false);

    if (error) throw error;

    const { contactsMap } = state;
    if (contactsMap[otherUser]) contactsMap[otherUser].unread = 0;
    if (window.contactsMap && window.contactsMap[otherUser]) window.contactsMap[otherUser].unread = 0;
    
    // Locally update history state to avoid waiting for DB sync
    if (contactsMap[otherUser]) {
        contactsMap[otherUser].history.forEach(m => {
            if (m.receiver === myUsername) m.read = true;
        });
    }

    updateUnreadBadges();
  } catch (err) {
    console.error("[Messaging] Failed to mark messages as read:", err);
  }
}

/**
 * Send a message (Supabase implementation)
 */
export async function sendMessage(receiver, text) {
  const myUsername = getMyUsername();
  if (!supabase || !myUsername || !receiver || !text) return;

  const optimizedText = optimizeText(text);

  try {
    const { data, error } = await supabase
      .from('user_messages')
      .insert([{
        sender: myUsername,
        receiver: receiver,
        text: optimizedText,
        read: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[Messaging] Failed to send message:", err);
    throw err;
  }
}

/**
 * Fetch all available users from Supabase for the "New Message" list
 */
export async function fetchAllUsers() {
  if (!supabase) {
    console.warn("[Messaging] Supabase client not initialized.");
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('sas_accounts')
      .select('username, display_name, profile_pic, role')
      .not('username', 'eq', getMyUsername());

    if (error) {
      console.error("[Messaging] Supabase user fetch error:", error);
      throw error;
    }
    
    // console.log("[Messaging] Raw accounts from Supabase:", data ? data.length : 0);
    
    // Filter out system/tv roles if desired (sync with Backend.gs logic)
    const EXCLUDED_ROLES = ['tv', 'scanner', 'uploader'];
    const filtered = (data || []).filter(u => !EXCLUDED_ROLES.includes(u.role?.toLowerCase()));
    
    // console.log("[Messaging] Filtered users:", filtered.length);
    return filtered;
  } catch (err) {
    console.error("[Messaging] Failed to fetch users from Supabase:", err);
    return [];
  }
}

/**
 * Update presence state across the application
 */
function updatePresence(presenceState) {
  const { contactsMap } = state;
  const myUsername = getMyUsername();

  // Reset online status
  Object.keys(contactsMap).forEach(user => {
    contactsMap[user].isOnline = false;
  });
  if (window.contactsMap) {
    Object.keys(window.contactsMap).forEach(user => {
      window.contactsMap[user].isOnline = false;
    });
  }

  // Update based on presence state
  Object.keys(presenceState).forEach(user => {
    if (user !== myUsername) {
      if (!contactsMap[user]) {
        contactsMap[user] = { unread: 0, history: [], isOnline: true };
      } else {
        contactsMap[user].isOnline = true;
      }
    }
  });

  updateUnreadBadges();
}

// Expose to window for legacy support
window.initSharedMessaging = initSharedMessaging;
window.markMessagesAsRead = markMessagesAsRead;
window.sendMessage = sendMessage;
window.syncUnreadCountFromDb = syncUnreadCountFromDb;
window.fetchAllUsers = fetchAllUsers;
