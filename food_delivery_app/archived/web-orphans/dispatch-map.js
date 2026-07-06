/**
 * DispatchMap Class - Core State Management for SmartSoko Dispatch Map
 * 
 * This class coordinates all dispatch map enhancements including:
 * - Search and fly-to
 * - Delivery zones overlay
 * - Merchant pickup pins
 * - Route preview
 * - Historical driver playback
 * - Dispatch workflow filters
 * - Export and snapshot
 * - Structured address storage
 * - Pin accuracy indicators
 * - Map health panel
 * 
 * @module DispatchMap
 */

import { db } from './config/firebase-config.js';
import { collection, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Default configuration
const DEFAULT_CONFIG = {
  mapboxToken: null,
  mapCenter: [39.2083, -6.7924], // Dar es Salaam
  mapZoom: 13,
  mapStyle: 'mapbox://styles/mapbox/streets-v12',
  searchDebounceMs: 300,
  searchTimeoutMs: 500,
  flyToZoom: 15,
  zonesFillOpacity: 0.2,
  zonesBorderOpacity: 1.0,
  geocodePendingRetryMs: 60000
};

/**
 * Map state constants
 * @typedef {'idle' | 'loading' | 'loaded' | 'error'} MapState
 */

/**
 * Data state structure
 * @typedef {Object} DataState
 * @property {Array} orders - Order documents
 * @property {Array} drivers - Driver documents
 * @property {Array} merchants - Merchant documents
 * @property {Array} deliveryZones - Delivery zone documents
 */

/**
 * UI state structure
 * @typedef {Object} UIState
 * @property {string} searchQuery - Current search query
 * @property {Array} searchResults - Search results
 * @property {Object} filters - Active filter criteria
 * @property {Object} playback - Playback controls state
 */

/**
 * Health state structure
 * @typedef {Object} HealthState
 * @property {Date} lastRefresh - Last successful data refresh
 * @property {number} driversWithGPS - Count of drivers with active GPS
 * @property {number} totalDrivers - Total driver count
 * @property {number} geocodeFailures - Geocode failure count
 * @property {number} mapboxErrors - Mapbox API error count
 * @property {boolean} firestoreConnected - Firestore connection status
 */

/**
 * Main DispatchMap class
 */
export class DispatchMap {
  /**
   * Create a new DispatchMap instance
   * @param {string} mapElementId - ID of the map container element
   * @param {Object} config - Configuration options
   */
  constructor(mapElementId, config = {}) {
    this.mapElementId = mapElementId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Map instance (initialized later)
    this.map = null;
    
    // Firestore database reference
    this.db = db;
    
    // State management
    this.state = {
      // Map state
      mapState: 'idle', // idle, loading, loaded, error
      mapError: null,
      
      // Data state
      data: {
        orders: [],
        drivers: [],
        merchants: [],
        deliveryZones: []
      },
      
      // UI state
      ui: {
        searchQuery: '',
        searchResults: [],
        selectedSearchResult: null,
        filters: {
          unassignedOnly: false,
          assignedNotPickedUp: false,
          lateDeliveries: false,
          cashOnDelivery: false,
          merchantId: null,
          hideApproximate: false
        },
        filterPresets: [],
        playback: {
          active: false,
          driverId: null,
          orderId: null,
          timelinePosition: 0,
          isPlaying: false
        }
      },
      
      // Health state
      health: {
        lastRefresh: null,
        driversWithGPS: 0,
        totalDrivers: 0,
        geocodeFailures: 0,
        mapboxErrors: 0,
        firestoreConnected: true
      }
    };
    
    // Module registry
    this.modules = {};
    
    // Firestore listeners (for cleanup)
    this.listeners = [];
    
    // Search debounce timer
    this.searchDebounceTimer = null;
  }
  
  /**
   * Initialize the DispatchMap and all modules
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this.state.mapState = 'loading';
      
      // Initialize Mapbox
      await this._initMapbox();
      
      // Initialize modules
      await this._initModules();
      
      // Load initial data
      await this._loadInitialData();
      
      // Set up Firestore listeners for real-time updates
      this._setupFirestoreListeners();
      
      this.state.mapState = 'loaded';
      this.state.health.lastRefresh = new Date();
      
      console.log('DispatchMap initialized successfully');
    } catch (error) {
      this.state.mapState = 'error';
      this.state.mapError = error.message;
      console.error('DispatchMap initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Initialize Mapbox GL JS
   * @private
   */
  async _initMapbox() {
    if (!this.config.mapboxToken) {
      throw new Error('Mapbox token is required');
    }
    
    // Set Mapbox token
    mapboxgl.accessToken = this.config.mapboxToken;
    
    // Create map instance
    this.map = new mapboxgl.Map({
      container: this.mapElementId,
      style: this.config.mapStyle,
      center: this.config.mapCenter,
      zoom: this.config.mapZoom,
      pitch: 45,
      bearing: 0
    });
    
    // Wait for map to load
    await new Promise((resolve, reject) => {
      this.map.on('load', () => resolve());
      this.map.on('error', (error) => reject(error));
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Mapbox map load timeout'));
      }, 10000);
    });
    
    console.log('Mapbox initialized');
  }
  
  /**
   * Initialize all modules
   * @private
   */
  async _initModules() {
    // Import modules dynamically
    try {
      // Search Module
      const { SearchModule } = await import('./dispatch-map-search.js');
      this.modules.search = new SearchModule(this);
      
      // Delivery Zones Module
      const { ZonesModule } = await import('./dispatch-map-zones.js');
      this.modules.zones = new ZonesModule(this);
      
      // Merchant Pins Module
      const { MerchantsModule } = await import('./dispatch-map-merchants.js');
      this.modules.merchants = new MerchantsModule(this);
      
      // Route Preview Module
      const { RoutesModule } = await import('./dispatch-map-routes.js');
      this.modules.routes = new RoutesModule(this);
      
      // Historical Playback Module
      const { PlaybackModule } = await import('./dispatch-map-playback.js');
      this.modules.playback = new PlaybackModule(this);
      
      // Dispatch Filters Module
      const { FiltersModule } = await import('./dispatch-map-filters.js');
      this.modules.filters = new FiltersModule(this);
      
      // Export & Snapshot Module
      const { ExportModule } = await import('./dispatch-map-export.js');
      this.modules.export = new ExportModule(this);
      
      // Structured Address Module
      const { StructuredAddressModule } = await import('./dispatch-map-addresses.js');
      this.modules.structuredAddress = new StructuredAddressModule(this);
      
      // Pin Accuracy Module
      const { PinAccuracyModule } = await import('./dispatch-map-accuracy.js');
      this.modules.pinAccuracy = new PinAccuracyModule(this);
      
      // Map Health Panel Module
      const { HealthModule } = await import('./dispatch-map-health.js');
      this.modules.health = new HealthModule(this);
      
      console.log('All modules initialized');
    } catch (error) {
      console.error('Module initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Load initial data from Firestore
   * @private
   */
  async _loadInitialData() {
    try {
      await Promise.all([
        this.loadOrders(),
        this.loadDrivers(),
        this.loadMerchants(),
        this.loadDeliveryZones()
      ]);
      
      console.log('Initial data loaded');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }
  
  /**
   * Set up Firestore listeners for real-time updates
   * @private
   */
  _setupFirestoreListeners() {
    // Orders listener
    const ordersUnsubscribe = this._setupCollectionListener(
      'orders',
      (data) => {
        this.state.data.orders = data;
        this._updateHealthMetrics();
        this._notifyModules('ordersUpdated', data);
      }
    );
    this.listeners.push(ordersUnsubscribe);
    
    // Drivers listener
    const driversUnsubscribe = this._setupCollectionListener(
      'drivers',
      (data) => {
        this.state.data.drivers = data;
        this._updateHealthMetrics();
        this._notifyModules('driversUpdated', data);
      }
    );
    this.listeners.push(driversUnsubscribe);
    
    // Merchants listener
    const merchantsUnsubscribe = this._setupCollectionListener(
      'sellers',
      (data) => {
        this.state.data.merchants = data;
        this._notifyModules('merchantsUpdated', data);
      }
    );
    this.listeners.push(merchantsUnsubscribe);
    
    // Delivery zones listener
    const zonesUnsubscribe = this._setupCollectionListener(
      'delivery_zones',
      (data) => {
        this.state.data.deliveryZones = data;
        this._notifyModules('zonesUpdated', data);
      }
    );
    this.listeners.push(zonesUnsubscribe);
    
    console.log('Firestore listeners set up');
  }
  
  /**
   * Set up a Firestore collection listener
   * @param {string} collectionName - Name of the collection
   * @param {Function} callback - Callback function for updates
   * @returns {Function} Unsubscribe function
   * @private
   */
  _setupCollectionListener(collectionName, callback) {
    const colRef = collection(db, collectionName);
    
    return onSnapshot(
      colRef,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(data);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        this.state.health.firestoreConnected = false;
        this._updateHealthPanel();
      }
    );
  }
  
  /**
   * Update health metrics based on current data
   * @private
   */
  _updateHealthMetrics() {
    const { drivers } = this.state.data;
    
    this.state.health.totalDrivers = drivers.length;
    this.state.health.driversWithGPS = drivers.filter(
      driver => driver.hasGPS || (driver.lat && driver.lng)
    ).length;
    
    // Update health panel
    this._updateHealthPanel();
  }
  
  /**
   * Update health panel display
   * @private
   */
  _updateHealthPanel() {
    if (this.modules.health && typeof this.modules.health.update === 'function') {
      this.modules.health.update();
    }
  }
  
  /**
   * Notify all modules of an event
   * @param {string} eventName - Event name
   * @param  {...any} args - Event arguments
   * @private
   */
  _notifyModules(eventName, ...args) {
    Object.values(this.modules).forEach(module => {
      if (typeof module[eventName] === 'function') {
        module[eventName](...args);
      }
    });
  }
  
  /**
   * Load orders from Firestore
   * @returns {Promise<void>}
   */
  async loadOrders() {
    try {
      const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      
      this.state.data.orders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.state.health.lastRefresh = new Date();
      this._updateHealthPanel();
      
      console.log(`Loaded ${this.state.data.orders.length} orders`);
    } catch (error) {
      console.error('Failed to load orders:', error);
      this.state.health.mapboxErrors++;
      this._updateHealthPanel();
      throw error;
    }
  }
  
  /**
   * Load drivers from Firestore
   * @returns {Promise<void>}
   */
  async loadDrivers() {
    try {
      const snap = await getDocs(collection(db, 'drivers'));
      
      this.state.data.drivers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.state.health.lastRefresh = new Date();
      this._updateHealthMetrics();
      this._updateHealthPanel();
      
      console.log(`Loaded ${this.state.data.drivers.length} drivers`);
    } catch (error) {
      console.error('Failed to load drivers:', error);
      this.state.health.mapboxErrors++;
      this._updateHealthPanel();
      throw error;
    }
  }
  
  /**
   * Load merchants from Firestore
   * @returns {Promise<void>}
   */
  async loadMerchants() {
    try {
      const snap = await getDocs(collection(db, 'sellers'));
      
      this.state.data.merchants = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.state.health.lastRefresh = new Date();
      this._updateHealthPanel();
      
      console.log(`Loaded ${this.state.data.merchants.length} merchants`);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      this.state.health.mapboxErrors++;
      this._updateHealthPanel();
      throw error;
    }
  }
  
  /**
   * Load delivery zones from Firestore
   * @returns {Promise<void>}
   */
  async loadDeliveryZones() {
    try {
      const snap = await getDocs(collection(db, 'delivery_zones'));
      
      this.state.data.deliveryZones = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.state.health.lastRefresh = new Date();
      this._updateHealthPanel();
      
      console.log(`Loaded ${this.state.data.deliveryZones.length} delivery zones`);
    } catch (error) {
      // Zones collection might not exist - this is OK
      console.log('Delivery zones collection not found or empty');
      this.state.data.deliveryZones = [];
    }
  }
  
  /**
   * Search for orders, drivers, or addresses
   * Delegates to SearchModule for actual search logic
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async search(query) {
    if (!query || query.trim() === '') {
      this.state.ui.searchResults = [];
      return [];
    }
    
    // Clear previous debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Debounce search
    this.searchDebounceTimer = setTimeout(async () => {
      try {
        // Delegate to search module
        if (this.modules.search && typeof this.modules.search.search === 'function') {
          const results = await this.modules.search.search(query);
          this.state.ui.searchResults = results;
          this.state.ui.searchQuery = query;
          return results;
        }
        
        // Fallback if search module not initialized
        this.state.ui.searchResults = [];
        return [];
      } catch (error) {
        console.error('Search failed:', error);
        this.state.health.mapboxErrors++;
        this._updateHealthPanel();
        return [];
      }
    }, this.config.searchDebounceMs);
    
    return [];
  }
  
  /**
   * Fly to a location on the map
   * @param {Object} coordinates - { lat, lng } coordinates
   * @param {number} zoom - Zoom level (default: flyToZoom)
   */
  flyTo(coordinates, zoom = this.config.flyToZoom) {
    if (!this.map || !coordinates) {
      return;
    }
    
    this.map.flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: zoom,
      essential: true
    });
  }
  
  /**
   * Get module accessors
   */
  getSearchModule() {
    return this.modules.search;
  }
  
  getZonesModule() {
    return this.modules.zones;
  }
  
  getMerchantsModule() {
    return this.modules.merchants;
  }
  
  getRoutesModule() {
    return this.modules.routes;
  }
  
  getPlaybackModule() {
    return this.modules.playback;
  }
  
  getFiltersModule() {
    return this.modules.filters;
  }
  
  getExportModule() {
    return this.modules.export;
  }
  
  getStructuredAddressModule() {
    return this.modules.structuredAddress;
  }
  
  getPinAccuracyModule() {
    return this.modules.pinAccuracy;
  }
  
  getHealthModule() {
    return this.modules.health;
  }
  
  /**
   * Update state
   * @param {string} path - State path (e.g., 'ui.searchQuery')
   * @param {*} value - New value
   */
  setState(path, value) {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  /**
   * Get state value
   * @param {string} path - State path
   * @returns {*} State value
   */
  getState(path) {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length; i++) {
      current = current[keys[i]];
    }
    
    return current;
  }
  
  /**
   * Destroy the DispatchMap and clean up resources
   */
  destroy() {
    // Remove Firestore listeners
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = [];
    
    // Destroy map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    // Destroy modules
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });
    
    console.log('DispatchMap destroyed');
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DispatchMap, DEFAULT_CONFIG };
}
