/**
 * Global Firebase Initialization for SmartSoko (Compat Mode)
 * This file is kept for backward compatibility with pages using legacy SDK.
 * For new code, use: import { db, auth } from './config/firebase-config.js';
 */
(function() {
  // If modular SDK already initialized (window.db exists), skip compat init
  if (window.db && window.auth) {
    console.log('Firebase already initialized via modular SDK');
    return;
  }
  
  // Fallback to compat SDK if available
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not found. Some features may not work.');
    return;
  }
  
  // Initialize Firebase only if config exists and not already initialized
  if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // Set up global references
  if (typeof firebase.firestore === 'function' && !window.db) {
    window.db = firebase.firestore();
  }
  if (typeof firebase.auth === 'function' && !window.auth) {
    window.auth = firebase.auth();
  }
})();
