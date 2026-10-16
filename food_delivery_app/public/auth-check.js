(function() {
  /**
   * SmartSoko Auth & Route Guard
   * Handles authentication state and role-based access control.
   */

  // Configuration: Define roles required for specific paths.
  // Keys are page names; both /<name> (extensionless server route) and
  // /<name>.html must match, e.g. /admin and /admin.html.
  const PROTECTED_PAGES = {
    'admin': ['admin'],
    // 'admin' included to match the server's requireMerchant policy (auth.js),
    // which lets admins view the merchant portal. Without it, an admin signing
    // in on the merchant tab gets bounced back to login ("logged out" loop).
    'merchant': ['merchant', 'seller', 'admin'],
    'driver': ['driver'],
    'profile': ['customer', 'admin', 'merchant', 'driver', 'seller'],
    'orders': ['customer', 'admin', 'merchant', 'driver', 'seller'],
    'cart': ['customer', 'admin', 'merchant', 'driver', 'seller'],
    'fleet-manager': ['admin', 'driver'],
    'admin-panel': ['admin']
  };

  const currentPath = window.location.pathname;
  const currentPage = currentPath.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  const requiredRoles = Object.entries(PROTECTED_PAGES).find(([page]) => currentPage === page)?.[1];

  let cachedUserRole = null;
  let cachedUserId = null;

  // Initialize Auth Check
  console.log(`AuthCheck: Checking access for ${currentPath}`);

  // Get user role from server API first, then fallback to Firestore
  async function getUserRole(uid) {
    if (cachedUserId === uid && cachedUserRole) return cachedUserRole;

    // Try server API first (avoids Firestore permission issues)
    try {
      const token = await window.auth?.currentUser?.getIdToken();
      if (token) {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.role) {
            cachedUserId = uid;
            cachedUserRole = data.user.role;
            console.log(`AuthCheck: Found user role via API as ${data.user.role}`);
            return data.user.role;
          }
        }
      }
    } catch (e) {
      console.log('AuthCheck: API role lookup failed, trying Firestore');
    }

    // Fallback to Firestore
    try {
      const db = window.db;
      if (!db) throw new Error('Database not initialized');
      
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const role = userSnap.data().role || 'customer';
        cachedUserId = uid;
        cachedUserRole = role;
        return role;
      }
      
      // Fallback: check legacy collections
      const legacyCollections = ['drivers', 'restaurants', 'sellers'];
      for (const colName of legacyCollections) {
        try {
          const legacyDocRef = doc(db, colName, uid);
          const legacySnap = await getDoc(legacyDocRef);
          
          if (legacySnap.exists()) {
            let role = 'customer';
            if (colName === 'drivers') role = 'driver';
            else if (colName === 'restaurants' || colName === 'sellers') role = 'merchant';
            
            cachedUserId = uid;
            cachedUserRole = role;
            console.log(`AuthCheck: Found user in legacy ${colName} as ${role}`);
            return role;
          }
        } catch (e) { /* collection might not exist */ }
      }
      
      return 'customer';
    } catch (error) {
      console.warn('Error fetching user role from Firestore:', error.message);
      return 'customer';
    }
  }

  // Check authentication and authorization
  async function checkAuth() {
    // Check for demo/mock login first
    const demoUser = JSON.parse(localStorage.getItem('smartsoko_demo_user') || 'null');
    const authMode = localStorage.getItem('smartsoko_auth_mode');

    if (demoUser && authMode === 'demo') {
      console.log('AuthCheck: Using demo user from localStorage');
      const userRole = demoUser.role;

      if (requiredRoles && !requiredRoles.includes(userRole)) {
        console.log(`AuthCheck: Demo role '${userRole}' not authorized for ${currentPath}`);
        redirectToLogin('unauthorized');
        return;
      }

      console.log(`AuthCheck: Access granted to ${currentPath} for demo role '${userRole}'`);
      window.currentUser = demoUser;
      return;
    }

    // Firebase Auth
    const auth = window.auth;
    if (!auth) {
      console.warn('AuthCheck: Firebase Auth not available');
      if (requiredRoles) {
        redirectToLogin('firebase_not_ready');
      }
      return;
    }

    const firebaseUser = auth.currentUser;

    // Check if authenticated
    if (!firebaseUser) {
      if (requiredRoles) {
        console.log('AuthCheck: Not authenticated, redirecting to login');
        redirectToLogin('auth_required');
      }
      return;
    }

    // Check role-based access
    try {
      const userRole = await getUserRole(firebaseUser.uid);

      if (requiredRoles && !requiredRoles.includes(userRole)) {
        console.log(`AuthCheck: Role '${userRole}' not authorized for ${currentPath}`);
        redirectToLogin('unauthorized');
        return;
      }

      console.log(`AuthCheck: Access granted to ${currentPath} for role '${userRole}'`);

      // Store user info globally
      window.currentUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: userRole,
        photoURL: firebaseUser.photoURL
      };

    } catch (error) {
      console.error('AuthCheck: Authorization check failed:', error);
      redirectToLogin('error');
    }
  }

  function redirectToLogin(reason) {
    // Don't redirect if we're already on the login page
    if (window.location.pathname.includes('login.html')) return;

    const isMerchantPage = window.location.pathname.includes('merchant') || window.location.pathname.includes('seller');
    // Remember where the user was trying to go so login can send them back
    // (previously: sign-in with a customer account on a merchant page
    // bounced to /home and the user appeared "logged out").
    try {
      const dest = window.location.pathname + window.location.search;
      if (!dest.includes('login')) sessionStorage.setItem('smartsoko_auth_redirect', dest);
    } catch (_) { /* storage unavailable */ }

    const roleParam = isMerchantPage ? 'role=merchant&' : '';
    const loginUrl = 'login.html' + (reason ? `?${roleParam}reason=${reason}` : (isMerchantPage ? '?role=merchant' : ''));
    window.location.replace(loginUrl);
  }

  // Run check when Firebase is ready
  let authCheckRetries = 0;
  const MAX_AUTH_RETRIES = 20; // 10 seconds total (20 * 500ms)
  let authCheckStarted = false;
  
  function runAuthCheck() {
    if (authCheckStarted) return; // Prevent multiple runs
    
    const auth = window.auth;
    
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      // Firebase is initialized, run check
      authCheckStarted = true;
      console.log('AuthCheck: Firebase initialized, starting auth check');
      auth.onAuthStateChanged((user) => {
        checkAuth();
      });
    } else if (authCheckRetries >= MAX_AUTH_RETRIES) {
      // Max retries reached
      authCheckStarted = true;
      console.warn('AuthCheck: Max retries reached, proceeding without Firebase auth');
      checkAuth();
    } else {
      // Firebase not ready yet, wait and retry
      authCheckRetries++;
      if (authCheckRetries % 5 === 0) { // Only log every 5th retry to reduce spam
        console.log(`AuthCheck: Waiting for Firebase initialization... (retry ${authCheckRetries}/${MAX_AUTH_RETRIES})`);
      }
      setTimeout(runAuthCheck, 500);
    }
  }

  // Listen for Firebase / cross-platform initialization events
  document.addEventListener('firebase-initialized', () => {
    console.log('AuthCheck: Received firebase-initialized event');
    runAuthCheck();
  });
  document.addEventListener('data-service-ready', () => {
    console.log('AuthCheck: Received data-service-ready event');
    runAuthCheck();
  });

  // Start checking when DOM is ready (fallback)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Give a small delay for the firebase-initialized event to fire first
      setTimeout(runAuthCheck, 100);
    });
  } else {
    // DOM already ready, give firebase event a chance to fire first
    setTimeout(runAuthCheck, 100);
  }

  // Logout function (global)
  window.logout = async function() {
    try {
      // Clear cache
      cachedUserRole = null;
      cachedUserId = null;
      window.currentUser = null;

      // Sign out from Firebase
      const auth = window.auth;
      if (auth && auth.currentUser) {
        await auth.signOut();
      }

      // Redirect to login
      const isMerchantPage = window.location.pathname.includes('merchant') || window.location.pathname.includes('seller');
      window.location.href = isMerchantPage ? 'login.html?role=merchant' : 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = 'login.html';
    }
  };

  // Get current user info (global) - Firebase only
  window.getCurrentUser = function() {
    if (window.currentUser) {
      return window.currentUser;
    }

    const auth = window.auth;
    if (auth && auth.currentUser) {
      const firebaseUser = auth.currentUser;
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: cachedUserRole || 'customer',
        photoURL: firebaseUser.photoURL
      };
    }

    return null;
  };
})();
