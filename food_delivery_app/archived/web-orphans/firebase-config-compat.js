/**
 * Firebase Config - Compat Version (no ES6 modules)
 * For use with legacy pages using compat SDK pattern
 */

// Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE",
  authDomain: "fooddelievry-dce15.firebaseapp.com",
  projectId: "fooddelievry-dce15",
  storageBucket: "fooddelievry-dce15.firebasestorage.app",
  messagingSenderId: "727819507148",
  appId: "1:727819507148:web:372bee2608d5c7a9587969",
  measurementId: "G-GZRXRGX60T"
};

// Initialize Firebase when DOM is ready
var db;
var auth;
document.addEventListener('DOMContentLoaded', function() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded yet');
    return;
  }
  
  // Initialize app if not already done
  if (firebase.apps && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // Set up services only if they exist
  if (typeof firebase.firestore === 'function') {
    db = firebase.firestore();
  } else {
    console.warn('Firestore not available');
  }
  
  if (typeof firebase.auth === 'function') {
    auth = firebase.auth();
  } else {
    console.warn('Auth not available');
  }
  
  console.log('Firebase initialized (compat mode)');
});
