/**
 * Pin Accuracy Module - GPS, Geocoded, and Missing Pin Rendering for SmartSoko Dispatch Map
 * 
 * This module implements the three-tier pin accuracy classification system:
 * - GPS pins: Solid green border (most accurate)
 * - Geocoded pins: Amber border with "(approx.)" label
 * - Missing pins: Red border with "Location unavailable" label
 * 
 * Features:
 * - Pin accuracy classification based on coordinate source
 * - GPS pin rendering with distinct visual indicators
 * - Geocoded pin rendering with approximation indicators
 * - Missing pin rendering with unavailable indicators
 * - "Hide approximate" filter to remove geocoded and missing pins
 * - Hidden pin count display in health panel
 * - Three-tier label extension for all pin types
 * 
 * @module PinAccuracyModule
 */

/**
 * Pin accuracy classification
 * @typedef {'gps' | 'geocoded' | 'missing'} PinAccuracy
 */

/**
 * Pin rendering state
 * @typedef {Object} PinAccuracyState
 * @property {Map<string, PinAccuracy>} pinAccuracies - Map of order ID to accuracy classification
 * @property {boolean} hideApproximate - Whether to hide approximate pins
 * @property {number} hiddenPinCount - Count of hidden pins
 * @property {boolean} initialized - Whether module is initialized
 */

/**
 * Pin accuracy module for dispatch map
 */
export class PinAccuracyModule {
  /**
   * Create a new PinAccuracyModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    this.config = dispatchMap.config;
    
    // Module state
    this.state = {
      pinAccuracies: new Map(),
      hideApproximate: false,
      hiddenPinCount: 0,
      initialized: false
    };
    
    // Default colors for pin accuracy types
    this.colors = {
      gps: '#22c55e',      // Green
      geocoded: '#f59e0b', // Amber
      missing: '#ef4444'   // Red
    };
    
    // Layer IDs for cleanup
    this.layerIds = {
      gps: 'pin-gps',
      geocoded: 'pin-geocoded',
      missing: 'pin-missing'
    };
  }
  
  /**
   * Initialize the pin accuracy module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Set up event listeners for data updates
      this.dispatchMap.on('ordersUpdated', (orders) => {
        this.updatePinAccuracies(orders);
        this.updateHiddenPinCount();
      });
      
      // Set up filter change listener
      this.dispatchMap.on('filterChanged', (filters) => {
        if (filters.hideApproximate !== undefined) {
          this.state.hideApproximate = filters.hideApproximate;
          this.updateHiddenPinCount();
        }
      });
      
      // Initialize with current orders
      this.updatePinAccuracies(this.dispatchMap.state.data.orders);
      this.updateHiddenPinCount();
      
      this.state.initialized = true;
      console.log('PinAccuracyModule initialized');
    } catch (error) {
      console.error('PinAccuracyModule initialization failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Classify pin accuracy based on coordinate source
   * @param {Object} order - Order document
   * @returns {PinAccuracy} - Accuracy classification
   */
  classifyPinAccuracy(order) {
    if (!order) {
      return 'missing';
    }
    
    // Check for deliveryLocation with valid coordinates
    if (order.deliveryLocation && 
        typeof order.deliveryLocation.lat === 'number' && 
        typeof order.deliveryLocation.lng === 'number') {
      
      // Check if coordinates came from GPS
      if (order.deliveryLocation.source === 'gps' || order.hasGPS) {
        return 'gps';
      }
      
      // Check if coordinates were geocoded
      if (order.deliveryLocation.geocoded || 
          order.deliveryLocation.source === 'geocoded' ||
          order.geocodePending === false) {
        return 'geocoded';
      }
      
      // Default to GPS if coordinates exist but source is unknown
      return 'gps';
    }
    
    // Check for legacy lat/lng fields
    if (typeof order.deliveryLat === 'number' && 
        typeof order.deliveryLng === 'number') {
      return 'geocoded';
    }
    
    // No coordinates available
    return 'missing';
  }
  
  /**
   * Update pin accuracies for all orders
   * @param {Array} orders - Array of order documents
   */
  updatePinAccuracies(orders) {
    if (!Array.isArray(orders)) {
      console.warn('Invalid orders data provided to updatePinAccuracies');
      return;
    }
    
    // Clear existing accuracies
    this.state.pinAccuracies.clear();
    
    // Classify each order
    orders.forEach(order => {
      const accuracy = this.classifyPinAccuracy(order);
      this.state.pinAccuracies.set(order.id, accuracy);
    });
    
    console.log(`Classified ${orders.length} pins by accuracy`);
  }
  
  /**
   * Get accuracy classification for a specific order
   * @param {string} orderId - Order ID
   * @returns {PinAccuracy} - Accuracy classification
   */
  getPinAccuracy(orderId) {
    return this.state.pinAccuracies.get(orderId) || 'missing';
  }
  
  /**
   * Get color for a specific accuracy type
   * @param {PinAccuracy} accuracy - Accuracy type
   * @returns {string} - Color hex code
   */
  getAccuracyColor(accuracy) {
    return this.colors[accuracy] || this.colors.missing;
  }
  
  /**
   * Get label suffix for a specific accuracy type
   * @param {PinAccuracy} accuracy - Accuracy type
   * @returns {string} - Label suffix
   */
  getAccuracyLabel(accuracy) {
    switch (accuracy) {
      case 'gps':
        return '';
      case 'geocoded':
        return ' (approx.)';
      case 'missing':
        return ' (Location unavailable)';
      default:
        return ' (unknown)';
    }
  }
  
  /**
   * Check if a pin should be hidden based on accuracy
   * @param {PinAccuracy} accuracy - Accuracy classification
   * @returns {boolean} - True if pin should be hidden
   */
  shouldHidePin(accuracy) {
    if (!this.state.hideApproximate) {
      return false;
    }
    
    return accuracy === 'geocoded' || accuracy === 'missing';
  }
  
  /**
   * Update hidden pin count
   */
  updateHiddenPinCount() {
    const orders = this.dispatchMap.state.data.orders;
    let hiddenCount = 0;
    
    orders.forEach(order => {
      const accuracy = this.getPinAccuracy(order.id);
      if (this.shouldHidePin(accuracy)) {
        hiddenCount++;
      }
    });
    
    this.state.hiddenPinCount = hiddenCount;
    
    // Update health panel
    if (this.dispatchMap.modules.health) {
      this.dispatchMap.modules.health.update();
    }
    
    console.log(`Hidden pin count: ${hiddenCount}`);
  }
  
  /**
   * Get hidden pin count for health panel display
   * @returns {number} - Count of hidden pins
   */
  getHiddenPinCount() {
    return this.state.hiddenPinCount;
  }
  
  /**
   * Toggle hide approximate filter
   */
  toggleHideApproximate() {
    this.state.hideApproximate = !this.state.hideApproximate;
    
    // Notify dispatch map of filter change
    this.dispatchMap.on('filterChanged', {
      hideApproximate: this.state.hideApproximate
    });
    
    this.updateHiddenPinCount();
    
    console.log(`Hide approximate: ${this.state.hideApproximate}`);
  }
  
  /**
   * Set hide approximate filter
   * @param {boolean} value - New value
   */
  setHideApproximate(value) {
    this.state.hideApproximate = !!value;
    
    // Notify dispatch map of filter change
    this.dispatchMap.on('filterChanged', {
      hideApproximate: this.state.hideApproximate
    });
    
    this.updateHiddenPinCount();
  }
  
  /**
   * Get hide approximate filter state
   * @returns {boolean} - Current state
   */
  getHideApproximate() {
    return this.state.hideApproximate;
  }
  
  /**
   * Render GPS pins with distinct visual indicators
   * @param {Object} order - Order document
   * @returns {Object} - Pin configuration for GPS pins
   */
  renderGpsPin(order) {
    const accuracy = this.classifyPinAccuracy(order);
    
    if (accuracy !== 'gps') {
      return null;
    }
    
    return {
      type: 'gps',
      color: this.colors.gps,
      borderColor: this.colors.gps,
      label: '',
      hasApproximation: false,
      isUnavailable: false
    };
  }
  
  /**
   * Render geocoded pins with approximation indicators
   * @param {Object} order - Order document
   * @returns {Object} - Pin configuration for geocoded pins
   */
  renderGeocodedPin(order) {
    const accuracy = this.classifyPinAccuracy(order);
    
    if (accuracy !== 'geocoded') {
      return null;
    }
    
    return {
      type: 'geocoded',
      color: this.colors.geocoded,
      borderColor: this.colors.geocoded,
      label: ' (approx.)',
      hasApproximation: true,
      isUnavailable: false
    };
  }
  
  /**
   * Render missing pins with unavailable indicators
   * @param {Object} order - Order document
   * @returns {Object} - Pin configuration for missing pins
   */
  renderMissingPin(order) {
    const accuracy = this.classifyPinAccuracy(order);
    
    if (accuracy !== 'missing') {
      return null;
    }
    
    return {
      type: 'missing',
      color: this.colors.missing,
      borderColor: this.colors.missing,
      label: ' (Location unavailable)',
      hasApproximation: false,
      isUnavailable: true
    };
  }
  
  /**
   * Render pin based on accuracy classification
   * @param {Object} order - Order document
   * @returns {Object|null} - Pin configuration or null if should be hidden
   */
  renderPin(order) {
    const accuracy = this.classifyPinAccuracy(order);
    
    // Check if pin should be hidden
    if (this.shouldHidePin(accuracy)) {
      return null;
    }
    
    // Render based on accuracy type
    switch (accuracy) {
      case 'gps':
        return this.renderGpsPin(order);
      case 'geocoded':
        return this.renderGeocodedPin(order);
      case 'missing':
        return this.renderMissingPin(order);
      default:
        return this.renderMissingPin(order);
    }
  }
  
  /**
   * Get extended label with three-tier classification
   * @param {Object} order - Order document
   * @returns {string} - Extended label
   */
  getExtendedLabel(order) {
    const accuracy = this.classifyPinAccuracy(order);
    const baseLabel = this.getAccuracyLabel(accuracy);
    
    // Add accuracy type prefix for clarity
    const accuracyPrefix = `[${accuracy.toUpperCase()}]`;
    
    return `${accuracyPrefix}${baseLabel}`;
  }
  
  /**
   * Get accuracy statistics for all orders
   * @returns {Object} - Statistics object
   */
  getAccuracyStats() {
    const stats = {
      gps: 0,
      geocoded: 0,
      missing: 0,
      total: 0
    };
    
    this.state.pinAccuracies.forEach(accuracy => {
      stats[accuracy]++;
      stats.total++;
    });
    
    return stats;
  }
  
  /**
   * Destroy the pin accuracy module
   */
  destroy() {
    try {
      this.state.pinAccuracies.clear();
      this.state.initialized = false;
      console.log('PinAccuracyModule destroyed');
    } catch (error) {
      console.error('Error destroying PinAccuracyModule:', error);
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PinAccuracyModule, PinAccuracy: /** @type {PinAccuracy} */ ('gps') };
}
