/**
 * Shared Messaging State
 */

export const state = {
  contactsMap: {},
  unreadCount: 0,
  activeChatUser: null,
  activeMessengerUser: null,
  sharedMessagingInitialized: false,
  userChatInitialized: false,
  pageLoadTime: Date.now()
};

export function updateState(key, value) {
  state[key] = value;
}
