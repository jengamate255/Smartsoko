/**
 * SmartSoko App Configuration Service
 * Loads application settings from Firestore
 */

(function(window) {
  'use strict';

  const AppConfig = {
    // Default configuration values
    defaults: {
      deliveryFee: 3000,
      defaultLocation: 'Dar es Salaam, Tanzania',
      defaultPhone: '',
      defaultAddress: '',
      currency: 'TZS',
      currencySymbol: 'TSh',
      mapboxToken: '',
      supportPhone: '',
      supportEmail: '',
      appName: 'SmartSoko',
      minOrderAmount: 0,
      maxDeliveryDistance: 10, // km
      estimatedDeliveryTime: 30, // minutes
      businessHours: {
        open: '08:00',
        close: '20:00'
      }
    },

    // Cached config
    config: null,
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000, // 5 minutes

    /**
     * Initialize and load configuration from Firestore
     */
    async init() {
      try {
        // Try to load from cache first
        const cached = localStorage.getItem('smartsoko_app_config');
        const cachedTime = localStorage.getItem('smartsoko_app_config_time');
        
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          if (age < this.cacheDuration) {
            this.config = { ...this.defaults, ...JSON.parse(cached) };
            console.log('[AppConfig] Loaded from cache');
            return this.config;
          }
        }

        // Load from Firestore
        await this.fetchFromFirestore();
        return this.config;
      } catch (error) {
        console.error('[AppConfig] Init error:', error);
        this.config = { ...this.defaults };
        return this.config;
      }
    },

    /**
     * Fetch configuration from Firestore
     */
    async fetchFromFirestore() {
      try {
        const db = window.db;
        if (!db) {
          console.warn('[AppConfig] Firestore not available, using defaults');
          this.config = { ...this.defaults };
          return;
        }

        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        
        // Try to get app config document
        const configRef = doc(db, 'appConfig', 'settings');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const firestoreConfig = configSnap.data();
          this.config = { ...this.defaults, ...firestoreConfig };
          
          // Cache to localStorage
          localStorage.setItem('smartsoko_app_config', JSON.stringify(firestoreConfig));
          localStorage.setItem('smartsoko_app_config_time', Date.now().toString());
          
          console.log('[AppConfig] Loaded from Firestore:', this.config);
        } else {
          console.warn('[AppConfig] No config found in Firestore, using defaults');
          this.config = { ...this.defaults };
          
          // Create default config in Firestore
          await this.createDefaultConfig();
        }
      } catch (error) {
        console.error('[AppConfig] Fetch error:', error);
        this.config = { ...this.defaults };
      }
    },

    /**
     * Create default configuration in Firestore
     */
    async createDefaultConfig() {
      try {
        const db = window.db;
        if (!db) return;

        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        
        const configRef = doc(db, 'appConfig', 'settings');
        await setDoc(configRef, {
          ...this.defaults,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('[AppConfig] Created default config in Firestore');
      } catch (error) {
        console.error('[AppConfig] Create error:', error);
      }
    },

    /**
     * Get a configuration value
     */
    get(key) {
      if (!this.config) {
        console.warn('[AppConfig] Not initialized, returning default for:', key);
        return this.defaults[key];
      }
      return this.config[key] !== undefined ? this.config[key] : this.defaults[key];
    },

    /**
     * Get delivery fee (can be overridden by merchant)
     */
    async getDeliveryFee(merchantId = null) {
      // If merchantId provided, try to get their specific delivery fee
      if (merchantId) {
        try {
          const db = window.db;
          if (db) {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
            const sellerRef = doc(db, 'sellers', merchantId);
            const sellerSnap = await getDoc(sellerRef);
            
            if (sellerSnap.exists()) {
              const sellerData = sellerSnap.data();
              if (sellerData.deliveryFee !== undefined) {
                return sellerData.deliveryFee;
              }
            }
          }
        } catch (error) {
          console.warn('[AppConfig] Error fetching merchant delivery fee:', error);
        }
      }
      
      // Fall back to global config
      return this.get('deliveryFee');
    },

    /**
     * Get merchant-specific configuration
     */
    async getMerchantConfig(merchantId) {
      try {
        const db = window.db;
        if (!db) return null;

        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const sellerRef = doc(db, 'sellers', merchantId);
        const sellerSnap = await getDoc(sellerRef);
        
        if (sellerSnap.exists()) {
          return sellerSnap.data();
        }
        return null;
      } catch (error) {
        console.error('[AppConfig] Error fetching merchant config:', error);
        return null;
      }
    },

    /**
     * Refresh configuration from Firestore
     */
    async refresh() {
      localStorage.removeItem('smartsoko_app_config');
      localStorage.removeItem('smartsoko_app_config_time');
      return await this.fetchFromFirestore();
    },

    /**
     * Update configuration (admin only)
     */
    async update(updates) {
      try {
        const db = window.db;
        if (!db) throw new Error('Firestore not available');

        const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        
        const configRef = doc(db, 'appConfig', 'settings');
        await updateDoc(configRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
        
        // Refresh local config
        await this.refresh();
        
        console.log('[AppConfig] Updated:', updates);
        return true;
      } catch (error) {
        console.error('[AppConfig] Update error:', error);
        return false;
      }
    }
  };

  // Expose to global scope
  window.AppConfig = AppConfig;

  // Auto-initialize when Firebase is ready
  document.addEventListener('firebase-initialized', () => {
    AppConfig.init();
  });

  // Fallback: initialize after a delay if firebase event doesn't fire
  setTimeout(() => {
    if (!AppConfig.config) {
      AppConfig.init();
    }
  }, 2000);

})(window);
