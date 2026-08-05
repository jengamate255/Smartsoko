/**
 * SmartSoko Logout Module
 * Comprehensive logout functionality for Firebase Auth
 */

(function(window) {
  'use strict';

  const SmartSokoLogout = {
    // Configuration
    config: {
      loginPage: '/login',
      storagePrefix: 'smartsoko_',
      broadcastChannel: 'smartsoko_logout',
      clearCookies: true,
      redirectDelay: 100
    },

    /**
     * Main logout function - handles all auth cleanup
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<boolean>} - Success status
     */
    async logout(options = {}) {
      const config = { ...this.config, ...options };
      
      try {
        console.log('[SmartSoko] Initiating logout...');

        // 1. Sign out from Firebase Auth
        await this.signOutFirebase();

        // 2. Clear all auth-related storage
        this.clearAuthStorage(config.storagePrefix);

        // 3. Clear session storage
        this.clearSessionStorage();
        this.clearSavePasswordSession();

        // 4. Clear cookies if enabled
        if (config.clearCookies) {
          this.clearAllCookies();
        }

        // 5. Broadcast logout to other tabs
        this.broadcastLogout(config.broadcastChannel);

        // 6. Clear any cached data
        this.clearCachedData();

        // 7. Clear save password settings
        this.clearSavePasswordSettings();

        console.log('[SmartSoko] Logout successful');

        // 8. Redirect to login page
        this.redirectToLogin(config.loginPage, config.redirectDelay);

        return true;
      } catch (error) {
        console.error('[SmartSoko] Logout error:', error);
        // Still redirect even if there's an error
        this.redirectToLogin(config.loginPage, config.redirectDelay);
        return false;
      }
    },

    /**
     * Sign out from Firebase Authentication
     */
    async signOutFirebase() {
      try {
        const auth = window.auth;
        
        if (auth) {
          await auth.signOut();
          console.log('[SmartSoko] Firebase signOut successful');
        } else {
          console.log('[SmartSoko] Firebase auth not available');
        }
      } catch (error) {
        console.warn('[SmartSoko] Firebase signOut error:', error.message);
        // Don't throw - continue with logout
      }
    },

    /**
     * Clear all auth-related localStorage items
     * @param {string} prefix - Storage key prefix to match
     */
    clearAuthStorage(prefix = 'smartsoko_') {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[SmartSoko] Cleared localStorage: ${key}`);
      });

      // Also clear common auth keys
      const authKeys = [
        'firebase:authUser',
        'firebase:previousAuthUserId',
        'firebase:host',
        'user',
        'token',
        'auth_token',
        'refresh_token',
        // Clear save password related keys
        'smartsoko_email',
        'smartsoko_password',
        'smartsoko_save_password'
      ];

      authKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`[SmartSoko] Cleared auth key: ${key}`);
        }
      });
    },

    /**
     * Clear save password settings specifically
     */
    clearSavePasswordSettings() {
      localStorage.removeItem('smartsoko_email');
      localStorage.removeItem('smartsoko_password');
      localStorage.removeItem('smartsoko_save_password');
      console.log('[SmartSoko] Cleared save password settings');
    },

    /**
     * Clear all sessionStorage
     */
    clearSessionStorage() {
      const keysToRemove = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`[SmartSoko] Cleared sessionStorage: ${key}`);
      });

      console.log(`[SmartSoko] Cleared ${keysToRemove.length} sessionStorage items`);
    },

    /**
     * Clear save password settings from sessionStorage
     */
    clearSavePasswordSession() {
      sessionStorage.removeItem('smartsoko_email');
      sessionStorage.removeItem('smartsoko_password');
      sessionStorage.removeItem('smartsoko_save_password');
      console.log('[SmartSoko] Cleared save password settings from sessionStorage');
    },

    /**
     * Clear all cookies
     */
    clearAllCookies() {
      const cookies = document.cookie.split(';');
      
      cookies.forEach(cookie => {
        const [name] = cookie.split('=');
        const trimmedName = name.trim();
        
        // Clear cookie with various domain/path combinations
        const domains = ['', window.location.hostname, `.${window.location.hostname}`];
        const paths = ['/', '/web', '/food_delivery_app/web'];
        
        domains.forEach(domain => {
          paths.forEach(path => {
            let cookieString = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
            if (domain) {
              cookieString += `; domain=${domain}`;
            }
            document.cookie = cookieString;
          });
        });
      });

      console.log(`[SmartSoko] Cleared ${cookies.length} cookies`);
    },

    /**
     * Broadcast logout event to other tabs
     * @param {string} channelName - Broadcast channel name
     */
    broadcastLogout(channelName = 'smartsoko_logout') {
      // Use BroadcastChannel API if available
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel(channelName);
          channel.postMessage({ type: 'logout', timestamp: Date.now() });
          channel.close();
          console.log('[SmartSoko] Logout broadcast sent');
        } catch (error) {
          console.warn('[SmartSoko] BroadcastChannel error:', error);
        }
      }

      // Fallback: use localStorage event
      try {
        localStorage.setItem(`${channelName}_event`, JSON.stringify({
          type: 'logout',
          timestamp: Date.now()
        }));
        // Remove immediately to not leave traces
        setTimeout(() => localStorage.removeItem(`${channelName}_event`), 100);
      } catch (error) {
        console.warn('[SmartSoko] localStorage broadcast error:', error);
      }
    },

    /**
     * Listen for logout events from other tabs
     * @param {Function} callback - Optional callback function
     */
    listenForLogout(callback) {
      const channelName = this.config.broadcastChannel;

      // BroadcastChannel API
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel(channelName);
          channel.onmessage = (event) => {
            if (event.data && event.data.type === 'logout') {
              console.log('[SmartSoko] Logout received from another tab');
              this.handleExternalLogout(callback);
            }
          };
          console.log('[SmartSoko] Listening for logout broadcasts');
        } catch (error) {
          console.warn('[SmartSoko] BroadcastChannel setup error:', error);
        }
      }

      // localStorage fallback
      window.addEventListener('storage', (event) => {
        if (event.key === `${channelName}_event`) {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.type === 'logout') {
              console.log('[SmartSoko] Logout received via localStorage');
              this.handleExternalLogout(callback);
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
      });
    },

    /**
     * Handle logout triggered from another tab
     * @param {Function} callback - Optional callback
     */
    handleExternalLogout(callback) {
      // Clear storage without Firebase signOut (already done in other tab)
      this.clearAuthStorage(this.config.storagePrefix);
      this.clearSessionStorage();
      
      if (typeof callback === 'function') {
        callback();
      } else {
        // Default: reload page or redirect
        window.location.href = this.config.loginPage;
      }
    },

    /**
     * Clear cached application data
     */
    clearCachedData() {
      // Clear any app-specific caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('smartsoko') || cacheName.includes('firebase')) {
              caches.delete(cacheName);
              console.log(`[SmartSoko] Cleared cache: ${cacheName}`);
            }
          });
        });
      }

      // Unregister service workers if any
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('[SmartSoko] Unregistered service worker');
          });
        });
      }
    },

    /**
     * Redirect to login page
     * @param {string} loginPage - Login page URL
     * @param {number} delay - Delay in milliseconds
     */
    redirectToLogin(loginPage = '/login', delay = 100) {
      setTimeout(() => {
        // Add logout parameter to prevent automatic re-login
        const separator = loginPage.includes('?') ? '&' : '?';
        const logoutUrl = `${loginPage}${separator}logout=true&t=${Date.now()}`;
        
        // Replace current history entry so back button doesn't return to authenticated page
        window.location.replace(logoutUrl);
      }, delay);
    },

    /**
     * Quick logout button handler
     * Usage: onclick="SmartSokoLogout.handleLogoutClick(event)"
     * @param {Event} event - Click event
     * @param {Object} options - Logout options
     */
    async handleLogoutClick(event, options = {}) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Optional: Show confirmation
      if (options.confirm && !window.confirm('Are you sure you want to log out?')) {
        return;
      }

      // Optional: Show loading state
      const button = event ? event.target : null;
      if (button && options.showLoading !== false) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Logging out...';
      }

      // Perform logout
      await this.logout(options);

      return false;
    },

    /**
     * Check if user is currently logged in
     * @returns {Object|null} - User data or null
     */
    getCurrentUser() {
      const auth = window.auth;
      
      if (auth && auth.currentUser) {
        return auth.currentUser;
      }

      return null;
    },

    /**
     * Initialize logout listeners on page load
     */
    init() {
      // Listen for logout from other tabs
      this.listenForLogout();

      // Handle logout parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === 'true') {
        console.log('[SmartSoko] Logout parameter detected');
        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      console.log('[SmartSoko] Logout module initialized');
    }
  };

  // Expose to global scope
  window.SmartSokoLogout = SmartSokoLogout;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartSokoLogout.init());
  } else {
    SmartSokoLogout.init();
  }

})(window);
