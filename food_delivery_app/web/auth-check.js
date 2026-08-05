(function() {
  /**
   * SmartSoko Auth & Route Guard
   * Handles authentication state and role-based access control.
   */

  // Configuration: Define roles required for specific paths
  const PROTECTED_PAGES = {
    '/admin': ['admin'],
    '/admin.html': ['admin'],
    '/fleet-manager': ['admin'],
    '/fleet-manager.html': ['admin'],
    '/merchant': ['merchant', 'seller'],
    '/merchant.html': ['merchant', 'seller'],
    '/driver': ['driver'],
    '/driver.html': ['driver'],
    '/customer': ['customer'],
    '/customer.html': ['customer'],
    '/profile': ['customer', 'admin', 'merchant', 'driver'],
    '/profile.html': ['customer', 'admin', 'merchant', 'driver'],
    '/orders': ['customer', 'admin', 'merchant', 'driver'],
    '/orders.html': ['customer', 'admin', 'merchant', 'driver']
  };

  const currentPath = window.location.pathname;
  const requiredRoles = Object.entries(PROTECTED_PAGES).find(([path]) => currentPath === path || currentPath.endsWith(path))?.[1];

  // Skip auth check if page doesn't require specific roles
  if (!requiredRoles) {
    console.log(`AuthCheck: Page ${currentPath} doesn't require auth, skipping check`);
    return;
  }

  let cachedUserRole = null;
  let cachedUserId = null;

  // Initialize Auth Check
  console.log(`AuthCheck: Checking access for ${currentPath}, required roles: ${requiredRoles.join(', ')}`);

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
        const data = userSnap.data();
        const role = data.role || 'customer';
        
        cachedUserId = uid;
        cachedUserRole = role;
        console.log(`AuthCheck: Found user in users collection as ${role}`);
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

      const onboardingPath = currentPath === '/onboarding' || currentPath.endsWith('/onboarding');
      if (!onboardingPath && requiredRoles) {
        try {
          const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
          const db = window.db;
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            if (ud.onboardingComplete === false) {
              console.log('AuthCheck: Profile onboarding required, redirecting');
              window.location.replace('/onboarding');
              return;
            }
          }
        } catch (e) {
          console.warn('AuthCheck: onboarding gate skipped', e);
        }
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
    var p = window.location.pathname;
    if (p === '/login' || p.endsWith('/login') || p.includes('login.html')) return;

    var loginUrl = '/login' + (reason ? '?reason=' + encodeURIComponent(reason) : '');
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
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
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
