// Unified Firebase Configuration for Food Delivery System
// Using Firebase Modular SDK v9+
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, connectFirestoreEmulator, collection, onSnapshot, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

let getAnalytics = null;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE",
  authDomain: "fooddelievry-dce15.firebaseapp.com",
  projectId: "fooddelievry-dce15",
  storageBucket: "fooddelievry-dce15.firebasestorage.app",
  messagingSenderId: "727819507148",
  appId: "1:727819507148:web:372bee2608d5c7a9587969",
  measurementId: "G-GZRXRGX60T"
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Get Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Lazy-load Analytics (fail gracefully if blocked)
let analytics = null;
import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js").then(m => {
  try {
    getAnalytics = m.getAnalytics;
    analytics = getAnalytics(app);
  } catch (e) {
    console.log('Analytics not initialized:', e.message);
  }
}).catch(e => console.log('Analytics module not available:', e.message));

// Make available globally for legacy code compatibility
window.app = app;
window.db = db;
window.auth = auth;
window.storage = storage;
window.analytics = analytics;

// Also expose commonly-used Firestore functions so inline scripts
// can use them without a separate dynamic import (which creates a
// new SDK instance with a different auth context).
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.updateDoc = updateDoc;
window.collection = collection;
window.query = query;
window.where = where;
window.orderBy = orderBy;
window.limit = limit;
window.onSnapshot = onSnapshot;
window.getDocs = (...args) => import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js').then(m => m.getDocs(...args));

// Dispatch events to notify that Firebase is initialized
document.dispatchEvent(new CustomEvent('firebase-initialized', { detail: { app, db, auth } }));
document.dispatchEvent(new CustomEvent('data-service-ready', { detail: { service: 'firebase', db, auth } }));
console.log('Firebase initialized and globals set (window.db, window.auth)');

export { app, db, auth, storage, analytics, firebaseConfig, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit };

// Auto-detect Local Emulator - only connect if emulators are actually running
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🌐 Running locally — using production Firebase (live Firestore).');
  
  // Only connect to emulators if explicitly requested via URL param: ?emulator=true
  var useEmulator = new URLSearchParams(window.location.search).get('emulator') === 'true';
  
  if (useEmulator) {
    // Try to connect to Firebase Auth Emulator
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('✅ Firebase Auth Emulator connected at http://localhost:9099');
    } catch (e) {
      console.log('⚠️ Firebase Auth Emulator not available:', e.message);
    }
    
    // Try to connect to Firestore Emulator
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Firestore Emulator connected at localhost:8080');
    } catch (e) {
      console.log('⚠️ Firestore Emulator not available:', e.message);
    }
  }
}

// Backend API Routes Configuration - Only define if not already declared
if (typeof API_ROUTES === 'undefined') {
  var API_ROUTES = {
    // Base URL for API calls - dynamically detect port
    get BASE_URL() {
      // For Firebase Hosting, relative paths work best with rewrites
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return '/api';
      }
      // Server runs on port 3001 by default (from .env)
      const port = window.location.port || '3001';
      return `http://localhost:${port}/api`;
    },

    // Customer Routes
    CUSTOMER: {
      RESTAURANTS: '/restaurants',
      MENU_ITEMS: '/menu-items',
      ORDERS: '/orders',
      CART: '/cart',
      PAYMENTS: '/payments',
      REVIEWS: '/reviews'
    },

    // Admin Routes
    ADMIN: {
      DASHBOARD: '/admin/dashboard',
      RESTAURANTS: '/admin/restaurants',
      DRIVERS: '/admin/drivers',
      ORDERS: '/admin/orders',
      ANALYTICS: '/admin/analytics',
      PROMOTIONS: '/admin/promotions'
    },

    // Merchant Routes
    MERCHANT: {
      DASHBOARD: '/merchant/dashboard',
      ORDERS: '/merchant/orders',
      MENU: '/merchant/menu',
      ANALYTICS: '/merchant/analytics',
      PROFILE: '/merchant/profile'
    },

    // Driver Routes
    DRIVER: {
      DASHBOARD: '/driver/dashboard',
      ORDERS: '/driver/orders',
      EARNINGS: '/driver/earnings',
      PROFILE: '/driver/profile',
      LOCATION: '/driver/location'
    },

    // Restaurant Routes
    RESTAURANT: {
      DASHBOARD: '/restaurant/dashboard',
      ORDERS: '/restaurant/orders',
      KITCHEN: '/restaurant/kitchen',
      INVENTORY: '/restaurant/inventory'
    }
  };
}

// Firestore Collections
const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  MENU_ITEMS: 'menuItems',
  ORDERS: 'orders',
  DRIVERS: 'drivers',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  PROMOTIONS: 'promotions',
  INVENTORY: 'inventory'
};


// Real-time Subscriptions
const subscribeToRealTimeUpdates = (collectionName, callback) => {
  const colRef = collection(db, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}:`, error);
  });
};

// API Helper Functions - Only define if not already declared
if (typeof apiHelpers === 'undefined') {
  var apiHelpers = {
    // Generic GET request
    async get(endpoint) {
      try {
        const response = await fetch(`${API_ROUTES.BASE_URL}${endpoint}`);
        return await response.json();
      } catch (error) {
        console.error('GET request failed:', error);
        throw error;
      }
    },

    // Generic POST request
    async post(endpoint, data) {
      try {
        const response = await fetch(`${API_ROUTES.BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error('POST request failed:', error);
        throw error;
      }
    },

    // Generic PUT request
    async put(endpoint, data) {
      try {
        const response = await fetch(`${API_ROUTES.BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error('PUT request failed:', error);
        throw error;
      }
    },

    // Generic DELETE request
    async delete(endpoint) {
      try {
        const response = await fetch(`${API_ROUTES.BASE_URL}${endpoint}`, {
          method: 'DELETE'
        });
        return await response.json();
      } catch (error) {
        console.error('DELETE request failed:', error);
        throw error;
      }
    }
  };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    firebaseConfig,
    db,
    API_ROUTES,
    COLLECTIONS,
    subscribeToRealTimeUpdates,
    apiHelpers
  };
}
