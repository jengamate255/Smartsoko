/**
 * Map Health Panel Module
 * 
 * Displays real-time data quality and connectivity metrics for the dispatch map.
 * Shows last refresh timestamp, GPS driver count, error counts, and connection status.
 * 
 * @module DispatchMapHealth
 */

/**
 * Base class for all dispatch map modules
 */
class ModuleBase {
  /**
   * Create a new module instance
   * @param {DispatchMap} dispatchMap - Reference to parent DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
  }
  
  /**
   * Initialize the module
   * @returns {Promise<void>}
   */
  async init() {
    // Override in subclasses
  }
  
  /**
   * Destroy the module and clean up resources
   */
  destroy() {
    // Override in subclasses
  }
  
  /**
   * Update the module state
   */
  update() {
    // Override in subclasses
  }
}

/**
 * Health Panel Module - Displays map health metrics
 */
export class HealthModule extends ModuleBase {
  /**
   * Create a new HealthModule instance
   * @param {DispatchMap} dispatchMap - Reference to parent DispatchMap instance
   */
  constructor(dispatchMap) {
    super(dispatchMap);
    
    this.panelElement = null;
    this.lastRefreshElement = null;
    this.driverCountElement = null;
    this.geocodeFailuresElement = null;
    this.mapboxErrorsElement = null;
    this.firestoreStatusElement = null;
    this.updateInterval = null;
    
    // Configuration
    this.config = {
      updateIntervalMs: 1000, // Update display every second
      warningThreshold: 0, // Show warning color when counter > 0
      disconnectionTimeoutMs: 5000 // Show disconnection warning after 5 seconds
    };
  }
  
  /**
   * Initialize the health panel UI
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this._createPanelUI();
      this._setupUpdateInterval();
      this._setupFirestoreConnectionListener();
      
      console.log('HealthModule initialized');
    } catch (error) {
      console.error('HealthModule initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Create the health panel UI elements
   * @private
   */
  _createPanelUI() {
    // Create panel container
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'dispatch-map-health-panel';
    this.panelElement.className = 'health-panel';
    this.panelElement.setAttribute('role', 'status');
    this.panelElement.setAttribute('aria-label', 'Map health status');
    
    // Create panel content
    this.panelElement.innerHTML = `
      <div class="health-panel-content">
        <div class="health-metric">
          <span class="health-label">Last Refresh:</span>
          <span id="health-last-refresh" class="health-value">--:--:--</span>
        </div>
        
        <div class="health-metric">
          <span class="health-label">GPS Drivers:</span>
          <span id="health-driver-count" class="health-value">0 / 0</span>
        </div>
        
        <div class="health-metric">
          <span class="health-label">Geocode Failures:</span>
          <span id="health-geocode-failures" class="health-value health-counter">0</span>
        </div>
        
        <div class="health-metric">
          <span class="health-label">Mapbox Errors:</span>
          <span id="health-mapbox-errors" class="health-value health-counter">0</span>
        </div>
        
        <div class="health-metric">
          <span class="health-label">Firestore:</span>
          <span id="health-firestore-status" class="health-value health-status">Connected</span>
        </div>
      </div>
    `;
    
    // Get references to metric elements
    this.lastRefreshElement = this.panelElement.querySelector('#health-last-refresh');
    this.driverCountElement = this.panelElement.querySelector('#health-driver-count');
    this.geocodeFailuresElement = this.panelElement.querySelector('#health-geocode-failures');
    this.mapboxErrorsElement = this.panelElement.querySelector('#health-mapbox-errors');
    this.firestoreStatusElement = this.panelElement.querySelector('#health-firestore-status');
    
    // Add styles
    this._injectStyles();
    
    // Append to map container
    const mapContainer = document.getElementById(this.dispatchMap.mapElementId);
    if (mapContainer) {
      mapContainer.appendChild(this.panelElement);
    } else {
      console.warn('Map container not found, appending health panel to body');
      document.body.appendChild(this.panelElement);
    }
    
    // Initial update
    this.update();
  }
  
  /**
   * Inject CSS styles for the health panel
   * @private
   */
  _injectStyles() {
    // Check if styles already exist
    if (document.getElementById('health-panel-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'health-panel-styles';
    styleElement.textContent = `
      .health-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #ffffff;
        border-top: 1px solid #e0e0e0;
        padding: 12px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 13px;
        z-index: 1000;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .health-panel-content {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .health-metric {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .health-label {
        font-weight: 500;
        color: #666;
      }
      
      .health-value {
        font-weight: 600;
        color: #333;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }
      
      .health-counter {
        padding: 2px 6px;
        border-radius: 3px;
        background-color: #f5f5f5;
      }
      
      .health-counter.warning {
        background-color: #fff3cd;
        color: #856404;
      }
      
      .health-counter.error {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      .health-status {
        padding: 2px 8px;
        border-radius: 3px;
        background-color: #d4edda;
        color: #155724;
      }
      
      .health-status.disconnected {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      @media (max-width: 768px) {
        .health-panel {
          padding: 8px 12px;
          font-size: 12px;
        }
        
        .health-panel-content {
          gap: 12px;
        }
        
        .health-metric {
          gap: 4px;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  /**
   * Set up interval for updating the display
   * @private
   */
  _setupUpdateInterval() {
    this.updateInterval = setInterval(() => {
      this.update();
    }, this.config.updateIntervalMs);
  }
  
  /**
   * Set up Firestore connection listener
   * @private
   */
  _setupFirestoreConnectionListener() {
    // This would be set up by the main DispatchMap class
    // For now, we just listen to state changes
  }
  
  /**
   * Update the health panel display
   */
  update() {
    if (!this.panelElement) {
      return;
    }
    
    const health = this.dispatchMap.state.health;
    
    // Update last refresh timestamp
    this._updateLastRefreshDisplay(health.lastRefresh);
    
    // Update driver count
    this._updateDriverCountDisplay(health.driversWithGPS, health.totalDrivers);
    
    // Update geocode failures
    this._updateCounterDisplay(
      this.geocodeFailuresElement,
      health.geocodeFailures
    );
    
    // Update Mapbox errors
    this._updateCounterDisplay(
      this.mapboxErrorsElement,
      health.mapboxErrors
    );
    
    // Update Firestore status
    this._updateFirestoreStatusDisplay(health.firestoreConnected);
  }
  
  /**
   * Update the last refresh timestamp display
   * @param {Date} timestamp - Last refresh timestamp
   * @private
   */
  _updateLastRefreshDisplay(timestamp) {
    if (!this.lastRefreshElement) {
      return;
    }
    
    if (!timestamp) {
      this.lastRefreshElement.textContent = '--:--:--';
      return;
    }
    
    // Format timestamp as HH:MM:SS
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    
    this.lastRefreshElement.textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  /**
   * Update the driver count display
   * @param {number} withGPS - Count of drivers with GPS
   * @param {number} total - Total driver count
   * @private
   */
  _updateDriverCountDisplay(withGPS, total) {
    if (!this.driverCountElement) {
      return;
    }
    
    this.driverCountElement.textContent = `${withGPS} / ${total}`;
  }
  
  /**
   * Update a counter display with warning coloring
   * @param {HTMLElement} element - Element to update
   * @param {number} count - Counter value
   * @private
   */
  _updateCounterDisplay(element, count) {
    if (!element) {
      return;
    }
    
    element.textContent = String(count);
    
    // Remove existing warning/error classes
    element.classList.remove('warning', 'error');
    
    // Add warning/error class if count > 0
    if (count > 0) {
      element.classList.add('warning');
    }
  }
  
  /**
   * Update the Firestore connection status display
   * @param {boolean} isConnected - Connection status
   * @private
   */
  _updateFirestoreStatusDisplay(isConnected) {
    if (!this.firestoreStatusElement) {
      return;
    }
    
    if (isConnected) {
      this.firestoreStatusElement.textContent = 'Connected';
      this.firestoreStatusElement.classList.remove('disconnected');
    } else {
      this.firestoreStatusElement.textContent = 'Disconnected';
      this.firestoreStatusElement.classList.add('disconnected');
    }
  }
  
  /**
   * Handle orders update event
   * @param {Array} orders - Updated orders
   */
  ordersUpdated(orders) {
    this.update();
  }
  
  /**
   * Handle drivers update event
   * @param {Array} drivers - Updated drivers
   */
  driversUpdated(drivers) {
    this.update();
  }
  
  /**
   * Handle merchants update event
   * @param {Array} merchants - Updated merchants
   */
  merchantsUpdated(merchants) {
    this.update();
  }
  
  /**
   * Handle zones update event
   * @param {Array} zones - Updated zones
   */
  zonesUpdated(zones) {
    this.update();
  }
  
  /**
   * Destroy the health panel and clean up resources
   */
  destroy() {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Remove panel element
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
      this.panelElement = null;
    }
    
    // Clear element references
    this.lastRefreshElement = null;
    this.driverCountElement = null;
    this.geocodeFailuresElement = null;
    this.mapboxErrorsElement = null;
    this.firestoreStatusElement = null;
    
    console.log('HealthModule destroyed');
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HealthModule, ModuleBase };
}
