// Unified Firebase Configuration for Food Delivery System
// Using Firebase Modular SDK v9+
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, connectFirestoreEmulator, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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

// Initialize Analytics (only in browser environment)
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.log('Analytics not initialized:', e.message);
}

// Make available globally for legacy code compatibility
window.app = app;
window.db = db;
window.auth = auth;
window.storage = storage;
window.analytics = analytics;

// Dispatch event to notify that Firebase is initialized
document.dispatchEvent(new CustomEvent('firebase-initialized', { detail: { app, db, auth } }));
console.log('Firebase initialized and globals set (window.db, window.auth)');

export { app, db, auth, storage, analytics, firebaseConfig };

// Auto-detect Local Emulator - only connect if emulators are actually running
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🌐 Running locally — using production Firebase (live Firestore).');
  console.log('💡 Tip: Click "Demo Login" button to bypass authentication for testing');
  
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
      // Detect if running on Firebase Hosting (no API server available)
      const isFirebaseHosting = window.location.hostname.includes('web.app') || 
                                window.location.hostname.includes('firebaseapp.com');
      const isVercel = window.location.hostname.includes('vercel.app');
      const isNetlify = window.location.hostname.includes('netlify.app');
      
      if (isFirebaseHosting || isVercel || isNetlify) {
        // Static hosting - no API server, will use Firestore directly
        console.log('📡 Static hosting detected - using Firestore direct access');
        return null;
      }
      
      // For localhost with Node.js server
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const port = window.location.port || '3000';
        return `http://localhost:${port}/api`;
      }
      
      return '/api';
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

    // Admin Routes (paths relative to API_ROUTES.BASE_URL, which ends with /api)
    ADMIN: {
      DASHBOARD: '/dashboard/stats',
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
        // Silently fail - caller will fallback to Firestore
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
