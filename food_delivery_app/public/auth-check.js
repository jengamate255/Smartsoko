(function() {
  /**
   * SmartSoko Auth & Route Guard
   * Handles authentication state and role-based access control.
   */

  // Configuration: Define roles required for specific paths
  const PROTECTED_PAGES = {
    '/admin.html': ['admin'],
    '/merchant.html': ['merchant', 'seller'],
    '/driver.html': ['driver'],
    '/customer.html': ['customer'],
    '/profile.html': ['customer', 'admin', 'merchant', 'driver'],
    '/orders.html': ['customer', 'admin', 'merchant', 'driver']
  };

  const currentPath = window.location.pathname;
  const requiredRoles = Object.entries(PROTECTED_PAGES).find(([path]) => currentPath.endsWith(path))?.[1];

  let cachedUserRole = null;
  let cachedUserId = null;

  // Initialize Auth Check
  console.log(`AuthCheck: Checking access for ${currentPath}`);

  // Get user role from Firestore
  async function getUserRole(uid) {
    if (cachedUserId === uid && cachedUserRole) return cachedUserRole;

    try {
      const db = window.db;
      if (!db) throw new Error('Database not initialized');
      
      // Dynamic import for Modular SDK
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const role = userSnap.data().role || 'customer';
        cachedUserId = uid;
        cachedUserRole = role;
        return role;
      }
      return 'customer'; // Default role
    } catch (error) {
      console.error('Error fetching user role:', error);
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
    
    const loginUrl = 'login.html' + (reason ? `?reason=${reason}` : '');
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
      // Max retries reached - proceed anyway (might be demo mode or Firebase not available)
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

  // Listen for Firebase initialization event
  document.addEventListener('firebase-initialized', () => {
    console.log('AuthCheck: Received firebase-initialized event');
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
      window.location.href = 'login.html';
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
