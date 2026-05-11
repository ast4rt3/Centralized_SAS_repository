/**
 * @deprecated
 * Firebase Realtime Database is DEPRECATED.
 * All real-time features (Messaging, TV Config, Activities) have been migrated to Supabase.
 * This file is kept temporarily for backward compatibility with external apps.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

let db = null;
let userDb = null;
let storageCheckDb = null;

if (window.ENV && window.ENV.FIREBASE_CONFIG) {
  try {
    const app = initializeApp(window.ENV.FIREBASE_CONFIG);
    db = getDatabase(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }

  try {
    const userApp = initializeApp(window.ENV.FIREBASE_CONFIG, "userMessagingApp");
    userDb = getDatabase(userApp);
  } catch(e) {
    console.error("User messaging firebase init failed:", e);
  }
}

if (window.ENV && window.ENV.STORAGE_CHECK_FIREBASE_CONFIG) {
  try {
    const storageApp = initializeApp(window.ENV.STORAGE_CHECK_FIREBASE_CONFIG, "storageCheckApp");
    storageCheckDb = getDatabase(storageApp);
  } catch (e) {
    console.error("Storage check firebase init failed:", e);
  }
} else if (userDb) {
  storageCheckDb = userDb;
}

export { db, userDb, storageCheckDb };
