/**
 * Dispatch Filters Module - Filter Application for SmartSoko Dispatch Map
 * 
 * This module implements filter application logic that:
 * - Applies filters to orders and drivers
 * - Updates map pins based on filter results (show/hide)
 * - Supports filters: unassigned only, assigned no pickup, late deliveries, COD, specific merchant
 * - Manages filter presets (save/load/delete)
 * - Integrates with the DispatchMap class
 * 
 * @module FiltersModule
 */

/**
 * Filter criteria structure
 * @typedef {Object} FilterCriteria
 * @property {boolean} unassignedOnly - Filter unassigned orders
 * @property {boolean} assignedNotPickedUp - Filter assigned but not picked up
 * @property {boolean} lateDeliveries - Filter late deliveries
 * @property {boolean} cashOnDelivery - Filter COD orders
 * @property {string|null} merchantId - Filter by specific merchant ID
 */

/**
 * Filter preset structure
 * @typedef {Object} FilterPreset
 * @property {string} id - Unique identifier
 * @property {string} name - Preset name
 * @property {FilterCriteria} criteria - Filter criteria
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Filters module for dispatch map
 */
export class FiltersModule {
  /**
   * Create a new FiltersModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    
    // Filter state
    this.state = {
      criteria: {
        unassignedOnly: false,
        assignedNotPickedUp: false,
        lateDeliveries: false,
        cashOnDelivery: false,
        merchantId: null
      },
      presets: [],
      activePresetId: null
    };
    
    // UI elements
    this.ui = {
      container: null,
      filterControls: {},
      activeFiltersDisplay: null,
      presetsList: null,
      savePresetModal: null,
      presetNameInput: null
    };
    
    // Filter active count
    this.activeFilterCount = 0;
    
    // Track filtered order IDs for pin visibility
    this.filteredOrderIds = new Set();
  }
  
  /**
   * Initialize the Filters module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Load saved presets from localStorage
      await this._loadPresets();
      
      // Create filter controls UI
      this._createFilterControls();
      
      // Create active filters display
      this._createActiveFiltersDisplay();
      
      // Create presets list
      this._createPresetsList();
      
      // Create save preset modal
      this._createSavePresetModal();
      
      // Update filter count
      this._updateActiveFilterCount();
      
      // Set up event listeners for data updates
      this.dispatchMap.on('ordersUpdated', (orders) => this._onOrdersUpdated(orders));
      this.dispatchMap.on('driversUpdated', (drivers) => this._onDriversUpdated(drivers));
      
      console.log('Filters module initialized');
    } catch (error) {
      console.error('Filters module initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Handle orders update event
   * @param {Array} orders - Updated orders
   * @private
   */
  _onOrdersUpdated(orders) {
    // Re-apply filters when orders change
    this._applyFilters();
  }
  
  /**
   * Handle drivers update event
   * @param {Array} drivers - Updated drivers
   * @private
   */
  _onDriversUpdated(drivers) {
    // Re-apply filters when drivers change
    this._applyFilters();
  }
  
  /**
   * Destroy the Filters module and clean up resources
   */
  destroy() {
    // Remove event listeners
    this._removeEventListeners();
    
    // Remove UI elements
    if (this.ui.container) {
      this.ui.container.remove();
    }
    
    if (this.ui.savePresetModal) {
      this.ui.savePresetModal.remove();
    }
    
    console.log('Filters module destroyed');
  }
  
  /**
   * Create filter controls UI
   * @private
   */
  _createFilterControls() {
    // Create filter controls container
    this.ui.container = document.createElement('div');
    this.ui.container.className = 'dispatch-filter-controls';
    this.ui.container.style.cssText = `
      position: absolute;
      top: 120px;
      right: 16px;
      z-index: 1000;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 16px;
      width: 320px;
      max-height: 600px;
      overflow-y: auto;
    `;
    
    // Create filter controls content
    this.ui.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #012d1d;">Dispatch Filters</h3>
        <button id="clear-filters-btn" style="
          background: none;
          border: none;
          cursor: pointer;
          color: #717973;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 4px;
        ">Clear All</button>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Unassigned Only -->
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="filter-unassigned" style="
            width: 18px;
            height: 18px;
            accent-color: #012d1d;
          "/>
          <span style="font-size: 14px; color: #414844;">Unassigned Only</span>
        </label>
        
        <!-- Assigned but not picked up -->
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="filter-assigned-not-picked" style="
            width: 18px;
            height: 18px;
            accent-color: #012d1d;
          "/>
          <span style="font-size: 14px; color: #414844;">Assigned, Not Picked Up</span>
        </label>
        
        <!-- Late Deliveries -->
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="filter-late" style="
            width: 18px;
            height: 18px;
            accent-color: #012d1d;
          "/>
          <span style="font-size: 14px; color: #414844;">Late Deliveries</span>
        </label>
        
        <!-- Cash on Delivery -->
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="filter-cod" style="
            width: 18px;
            height: 18px;
            accent-color: #012d1d;
          "/>
          <span style="font-size: 14px; color: #414844;">Cash on Delivery</span>
        </label>
        
        <!-- Specific Merchant -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 14px; color: #414844; font-weight: 500;">Merchant</label>
          <select id="filter-merchant" style="
            padding: 8px 12px;
            border: 1px solid #c1c8c2;
            border-radius: 6px;
            font-size: 14px;
            color: #414844;
            background: white;
            cursor: pointer;
          ">
            <option value="">All Merchants</option>
          </select>
        </div>
      </div>
    `;
    
    // Store references to filter controls
    this.ui.filterControls = {
      unassignedOnly: this.ui.container.querySelector('#filter-unassigned'),
      assignedNotPickedUp: this.ui.container.querySelector('#filter-assigned-not-picked'),
      lateDeliveries: this.ui.container.querySelector('#filter-late'),
      cashOnDelivery: this.ui.container.querySelector('#filter-cod'),
      merchantId: this.ui.container.querySelector('#filter-merchant'),
      clearAll: this.ui.container.querySelector('#clear-filters-btn')
    };
    
    // Add event listeners
    this._addEventListeners();
    
    // Add to map container
    this.dispatchMap.map.getContainer().appendChild(this.ui.container);
    
    // Load merchants for dropdown
    this._loadMerchantsDropdown();
  }
  
  /**
   * Create active filters display
   * @private
   */
  _createActiveFiltersDisplay() {
    // Create active filters display container
    this.ui.activeFiltersDisplay = document.createElement('div');
    this.ui.activeFiltersDisplay.className = 'dispatch-active-filters';
    this.ui.activeFiltersDisplay.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 1000;
      display: flex;
      gap: 8px;
    `;
    
    // Create active filter badges
    this.ui.activeFiltersDisplay.innerHTML = `
      <div id="active-filters-badge" style="
        background: #012d1d;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        display: none;
        align-items: center;
        gap: 8px;
      ">
        <span id="active-filter-count">0</span>
        <span>Active</span>
      </div>
    `;
    
    this.dispatchMap.map.getContainer().appendChild(this.ui.activeFiltersDisplay);
  }
  
  /**
   * Create presets list UI
   * @private
   */
  _createPresetsList() {
    // Create presets list container
    this.ui.presetsList = document.createElement('div');
    this.ui.presetsList.className = 'dispatch-filter-presets';
    this.ui.presetsList.style.cssText = `
      position: absolute;
      top: 420px;
      right: 16px;
      z-index: 1000;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 16px;
      width: 320px;
    `;
    
    // Create presets list content
    this.ui.presetsList.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #012d1d;">Filter Presets</h3>
        <button id="save-preset-btn" style="
          background: #012d1d;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        ">Save</button>
      </div>
      
      <div id="presets-list" style="display: flex; flex-direction: column; gap: 8px;">
        <p style="text-align: center; color: #717973; font-size: 14px;">No presets saved yet</p>
      </div>
    `;
    
    // Store reference to presets list
    this.ui.presetsListElement = this.ui.presetsList.querySelector('#presets-list');
    this.ui.savePresetButton = this.ui.presetsList.querySelector('#save-preset-btn');
    
    // Add event listeners
    this.ui.savePresetButton.addEventListener('click', () => this._showSavePresetModal());
    
    // Add to map container
    this.dispatchMap.map.getContainer().appendChild(this.ui.presetsList);
    
    // Render presets
    this._renderPresets();
  }
  
  /**
   * Create save preset modal
   * @private
   */
  _createSavePresetModal() {
    // Create modal container
    this.ui.savePresetModal = document.createElement('div');
    this.ui.savePresetModal.className = 'dispatch-save-preset-modal';
    this.ui.savePresetModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    `;
    
    // Create modal content
    this.ui.savePresetModal.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
      ">
        <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #012d1d;">Save Filter Preset</h3>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #414844; font-weight: 500;">
            Preset Name
          </label>
          <input type="text" id="preset-name-input" style="
            width: 100%;
            padding: 12px;
            border: 1px solid #c1c8c2;
            border-radius: 8px;
            font-size: 14px;
            color: #414844;
          " placeholder="Enter preset name (e.g., 'Urgent Deliveries')"/>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancel-save-btn" style="
            padding: 10px 20px;
            border: none;
            background: #eae8e4;
            color: #414844;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
          ">Cancel</button>
          <button id="confirm-save-btn" style="
            padding: 10px 20px;
            border: none;
            background: #012d1d;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
          ">Save Preset</button>
        </div>
      </div>
    `;
    
    // Store references
    this.ui.presetNameInput = this.ui.savePresetModal.querySelector('#preset-name-input');
    this.ui.cancelSaveButton = this.ui.savePresetModal.querySelector('#cancel-save-btn');
    this.ui.confirmSaveButton = this.ui.savePresetModal.querySelector('#confirm-save-btn');
    
    // Add event listeners
    this.ui.cancelSaveButton.addEventListener('click', () => this._hideSavePresetModal());
    this.ui.confirmSaveButton.addEventListener('click', () => this._savePreset());
    
    // Add to document
    document.body.appendChild(this.ui.savePresetModal);
    
    // Close modal on background click
    this.ui.savePresetModal.addEventListener('click', (e) => {
      if (e.target === this.ui.savePresetModal) {
        this._hideSavePresetModal();
      }
    });
  }
  
  /**
   * Add event listeners for filter controls
   * @private
   */
  _addEventListeners() {
    // Filter change handlers
    this.ui.filterControls.unassignedOnly.addEventListener('change', (e) => {
      this.state.criteria.unassignedOnly = e.target.checked;
      this._applyFilters();
      this._updateActiveFilterCount();
    });
    
    this.ui.filterControls.assignedNotPickedUp.addEventListener('change', (e) => {
      this.state.criteria.assignedNotPickedUp = e.target.checked;
      this._applyFilters();
      this._updateActiveFilterCount();
    });
    
    this.ui.filterControls.lateDeliveries.addEventListener('change', (e) => {
      this.state.criteria.lateDeliveries = e.target.checked;
      this._applyFilters();
      this._updateActiveFilterCount();
    });
    
    this.ui.filterControls.cashOnDelivery.addEventListener('change', (e) => {
      this.state.criteria.cashOnDelivery = e.target.checked;
      this._applyFilters();
      this._updateActiveFilterCount();
    });
    
    this.ui.filterControls.merchantId.addEventListener('change', (e) => {
      this.state.criteria.merchantId = e.target.value || null;
      this._applyFilters();
      this._updateActiveFilterCount();
    });
    
    // Clear all filters
    this.ui.filterControls.clearAll.addEventListener('click', () => {
      this._clearAllFilters();
    });
  }
  
  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    if (this.ui.filterControls.unassignedOnly) {
      this.ui.filterControls.unassignedOnly.removeEventListener('change', () => {});
    }
    if (this.ui.filterControls.assignedNotPickedUp) {
      this.ui.filterControls.assignedNotPickedUp.removeEventListener('change', () => {});
    }
    if (this.ui.filterControls.lateDeliveries) {
      this.ui.filterControls.lateDeliveries.removeEventListener('change', () => {});
    }
    if (this.ui.filterControls.cashOnDelivery) {
      this.ui.filterControls.cashOnDelivery.removeEventListener('change', () => {});
    }
    if (this.ui.filterControls.merchantId) {
      this.ui.filterControls.merchantId.removeEventListener('change', () => {});
    }
    if (this.ui.filterControls.clearAll) {
      this.ui.filterControls.clearAll.removeEventListener('click', () => {});
    }
  }
  
  /**
   * Load merchants into dropdown
   * @private
   */
  async _loadMerchantsDropdown() {
    try {
      const merchants = this.dispatchMap.state.data.merchants;
      
      // Clear existing options except the first one
      const select = this.ui.filterControls.merchantId;
      select.innerHTML = '<option value="">All Merchants</option>';
      
      // Add merchant options
      merchants.forEach(merchant => {
        const option = document.createElement('option');
        option.value = merchant.id;
        option.textContent = merchant.name || merchant.storeName || merchant.id;
        select.appendChild(option);
      });
      
      console.log(`Loaded ${merchants.length} merchants into filter dropdown`);
    } catch (error) {
      console.error('Failed to load merchants for filter dropdown:', error);
    }
  }
  
  /**
   * Apply filters to orders and drivers
   * Updates map pins based on filter results
   * @private
   */
  _applyFilters() {
    const { orders, drivers } = this.dispatchMap.state.data;
    const { criteria } = this.state;
    
    // Filter orders based on criteria
    const filteredOrders = orders.filter(order => {
      // Unassigned only
      if (criteria.unassignedOnly && order.driverId) {
        return false;
      }
      
      // Assigned but not picked up
      if (criteria.assignedNotPickedUp) {
        if (!order.driverId) return false;
        if (order.status === 'picked_up' || order.status === 'delivered') return false;
      }
      
      // Late deliveries
      if (criteria.lateDeliveries) {
        if (!order.estimatedDeliveryTime) return false;
        
        const now = new Date();
        const estimatedTime = new Date(order.estimatedDeliveryTime);
        
        // Check if elapsed time exceeds estimated duration by more than 10 minutes
        const elapsedMinutes = (now - new Date(order.createdAt)) / (1000 * 60);
        const estimatedMinutes = (estimatedTime - new Date(order.createdAt)) / (1000 * 60);
        
        if (elapsedMinutes > estimatedMinutes + 10) {
          return true;
        }
        return false;
      }
      
      // Cash on delivery
      if (criteria.cashOnDelivery && order.paymentType !== 'cash') {
        return false;
      }
      
      // Specific merchant
      if (criteria.merchantId && order.merchantId !== criteria.merchantId) {
        return false;
      }
      
      return true;
    });
    
    // Get filtered order IDs
    const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
    
    // Update filtered order IDs for pin visibility
    this.filteredOrderIds = filteredOrderIds;
    
    // Update filtered orders in state
    this.dispatchMap.state.ui.filteredOrders = filteredOrders;
    
    // Notify modules of filtered orders
    this.dispatchMap._notifyModules('ordersFiltered', filteredOrders);
    
    // Update pin visibility based on filters
    this._updatePinVisibility(filteredOrderIds);
    
    console.log(`Applied filters: ${this.activeFilterCount} active, ${filteredOrders.length} orders matched`);
  }
  
  /**
   * Update pin visibility based on filtered order IDs
   * @param {Set<string>} filteredOrderIds - Set of order IDs to show
   * @private
   */
  _updatePinVisibility(filteredOrderIds) {
    // Get the merchants module to access pin markers
    const merchantsModule = this.dispatchMap.getMerchantsModule();
    
    if (!merchantsModule) {
      console.warn('Merchants module not available for pin visibility update');
      return;
    }
    
    // Hide all pins first
    for (const [key, marker] of merchantsModule.state.merchantPins) {
      marker.remove();
    }
    for (const [key, marker] of merchantsModule.state.customerPins) {
      marker.remove();
    }
    
    // Re-add visible pins
    const visibleMerchantPins = new Map();
    const visibleCustomerPins = new Map();
    
    // Re-add merchant pins for filtered orders
    filteredOrderIds.forEach(orderId => {
      const order = this.dispatchMap.state.data.orders.find(o => o.id === orderId);
      if (order && order.merchantId) {
        const merchant = this.dispatchMap.state.data.merchants.find(m => m.id === order.merchantId);
        if (merchant && merchant.pickupLocation) {
          // Create merchant pin element
          const el = document.createElement('div');
          el.className = 'merchant-pin';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.backgroundSize = 'contain';
          el.style.backgroundImage = `url(${this._getMerchantIcon()})`;
          el.style.backgroundColor = '#FFF8F0';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid #FF6B35';
          el.style.boxShadow = '0 2px 8px rgba(255, 107, 53, 0.3)';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          
          // Create popup content
          const popupContent = this._createMerchantPopupContent(merchant, order);
          
          // Create marker
          const marker = new mapboxgl.Marker(el)
            .setLngLat([merchant.pickupLocation.lng, merchant.pickupLocation.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)
            )
            .addTo(this.map);
          
          const pinKey = `merchant-${merchant.id}`;
          visibleMerchantPins.set(pinKey, marker);
        }
      }
      
      // Re-add customer pin
      const order = this.dispatchMap.state.data.orders.find(o => o.id === orderId);
      if (order && order.deliveryLocation) {
        // Create customer pin element
        const el = document.createElement('div');
        el.className = 'customer-pin';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = 'contain';
        el.style.backgroundImage = `url(${this._getCustomerIcon()})`;
        el.style.backgroundColor = '#F0F8FF';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #0066CC';
        el.style.boxShadow = '0 2px 8px rgba(0, 102, 204, 0.3)';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        
        // Create popup content
        const popupContent = this._createCustomerPopupContent(order);
        
        // Create marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)
          )
          .addTo(this.map);
        
        const pinKey = `customer-${order.id}`;
        visibleCustomerPins.set(pinKey, marker);
      }
    });
    
    // Update merchants module state
    merchantsModule.state.merchantPins = visibleMerchantPins;
    merchantsModule.state.customerPins = visibleCustomerPins;
    merchantsModule.state.merchantPinCount = visibleMerchantPins.size;
    merchantsModule.state.customerPinCount = visibleCustomerPins.size;
    
    console.log(`Updated pin visibility: ${visibleMerchantPins.size} merchant pins, ${visibleCustomerPins.size} customer pins`);
  }
  
  /**
   * Get merchant icon (restaurant)
   * @returns {string} - Data URI for merchant icon
   * @private
   */
  _getMerchantIcon() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2">
        <path d="M6 9c0-1 1-2 2-2h8c1 0 2 1 2 2v8c0 1-1 2-2 2H8c-1 0-2-1-2-2V9z"/>
        <path d="M12 5v4"/>
        <path d="M9 9h6"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  
  /**
   * Get customer icon (home/destination)
   * @returns {string} - Data URI for customer icon
   * @private
   */
  _getCustomerIcon() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0066CC" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  
  /**
   * Create popup content for merchant pin
   * @param {Object} merchant - Merchant document
   * @param {Object} order - Order document
   * @returns {string} - HTML popup content
   * @private
   */
  _createMerchantPopupContent(merchant, order) {
    const ordersForMerchant = this.dispatchMap.state.data.orders.filter(o => o.merchantId === merchant.id);
    const orderIds = ordersForMerchant.map(o => o.id).join(', ');
    
    return `
      <div class="p-3 bg-white rounded-lg shadow-lg max-w-xs">
        <h3 class="font-bold text-lg mb-2 text-gray-800">${merchant.name || 'Unnamed Merchant'}</h3>
        <p class="text-sm text-gray-600 mb-2">
          <strong>Address:</strong> ${merchant.pickupLocation?.label || 'No address'}
        </p>
        <p class="text-sm text-gray-600 mb-2">
          <strong>Awaiting Pickup:</strong> ${ordersForMerchant.length} order(s)
        </p>
        <p class="text-xs text-gray-500 break-words">
          <strong>Order IDs:</strong> ${orderIds}
        </p>
      </div>
    `;
  }
  
  /**
   * Create popup content for customer pin
   * @param {Object} order - Order document
   * @returns {string} - HTML popup content
   * @private
   */
  _createCustomerPopupContent(order) {
    const customerName = order.customerName || order.customerId || 'Unknown Customer';
    const merchant = this.dispatchMap.state.data.merchants.find(m => m.id === order.merchantId);
    const merchantName = merchant?.name || 'Unknown Merchant';
    const driverName = order.driverName || order.driverId || 'Unassigned';
    
    const statusMap = {
      'pending': 'Pending',
      'assigned': 'Assigned',
      'picked_up': 'Picked Up',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    const status = statusMap[order.status] || order.status || 'Unknown';
    
    return `
      <div class="p-3 bg-white rounded-lg shadow-lg max-w-xs">
        <h3 class="font-bold text-lg mb-2 text-gray-800">${customerName}</h3>
        <p class="text-sm text-gray-600 mb-2">
          <strong>Delivery Address:</strong> ${order.deliveryLocation?.label || 'No address'}
        </p>
        <p class="text-sm text-gray-600 mb-2">
          <strong>From:</strong> ${merchantName}
        </p>
        <p class="text-sm text-gray-600 mb-2">
          <strong>Driver:</strong> ${driverName}
        </p>
        <p class="text-sm text-gray-600 mb-2">
          <strong>Status:</strong> <span class="font-semibold">${status}</span>
        </p>
        <p class="text-xs text-gray-500">
          <strong>Order ID:</strong> ${order.id}
        </p>
      </div>
    `;
  }
  
  /**
   * Update active filter count display
   * @private
   */
  _updateActiveFilterCount() {
    let count = 0;
    
    if (this.state.criteria.unassignedOnly) count++;
    if (this.state.criteria.assignedNotPickedUp) count++;
    if (this.state.criteria.lateDeliveries) count++;
    if (this.state.criteria.cashOnDelivery) count++;
    if (this.state.criteria.merchantId) count++;
    
    this.activeFilterCount = count;
    
    // Update badge display
    const badge = this.ui.activeFiltersDisplay.querySelector('#active-filters-badge');
    const countSpan = this.ui.activeFiltersDisplay.querySelector('#active-filter-count');
    
    if (count > 0) {
      badge.style.display = 'flex';
      countSpan.textContent = count;
    } else {
      badge.style.display = 'none';
    }
  }
  
  /**
   * Clear all filters
   * @private
   */
  _clearAllFilters() {
    // Reset all filter criteria
    this.state.criteria = {
      unassignedOnly: false,
      assignedNotPickedUp: false,
      lateDeliveries: false,
      cashOnDelivery: false,
      merchantId: null
    };
    
    // Reset UI controls
    this.ui.filterControls.unassignedOnly.checked = false;
    this.ui.filterControls.assignedNotPickedUp.checked = false;
    this.ui.filterControls.lateDeliveries.checked = false;
    this.ui.filterControls.cashOnDelivery.checked = false;
    this.ui.filterControls.merchantId.value = '';
    
    // Apply empty filters (show all)
    this._applyFilters();
    this._updateActiveFilterCount();
  }
  
  /**
   * Show save preset modal
   * @private
   */
  _showSavePresetModal() {
    this.ui.presetNameInput.value = '';
    this.ui.savePresetModal.style.opacity = '1';
    this.ui.savePresetModal.style.pointerEvents = 'auto';
    this.ui.presetNameInput.focus();
  }
  
  /**
   * Hide save preset modal
   * @private
   */
  _hideSavePresetModal() {
    this.ui.savePresetModal.style.opacity = '0';
    this.ui.savePresetModal.style.pointerEvents = 'none';
  }
  
  /**
   * Save current filter criteria as preset
   * @private
   */
  _savePreset() {
    const name = this.ui.presetNameInput.value.trim();
    
    if (!name) {
      alert('Please enter a preset name');
      return;
    }
    
    // Check if preset with same name exists
    const existingPreset = this.state.presets.find(p => p.name === name);
    if (existingPreset) {
      const confirmOverwrite = confirm(`A preset named "${name}" already exists. Overwrite?`);
      if (!confirmOverwrite) {
        return;
      }
    }
    
    const preset = {
      id: existingPreset ? existingPreset.id : crypto.randomUUID(),
      name: name,
      criteria: { ...this.state.criteria },
      createdAt: existingPreset ? existingPreset.createdAt : new Date(),
      updatedAt: new Date()
    };
    
    // Update or add preset
    if (existingPreset) {
      const index = this.state.presets.indexOf(existingPreset);
      this.state.presets[index] = preset;
    } else {
      this.state.presets.push(preset);
    }
    
    // Save to localStorage
    this._savePresetsToLocalStorage();
    
    // Render presets
    this._renderPresets();
    
    // Close modal
    this._hideSavePresetModal();
    
    console.log(`Saved filter preset: ${name}`);
  }
  
  /**
   * Load presets from localStorage
   * @private
   */
  async _loadPresets() {
    try {
      const presetsJson = localStorage.getItem('dispatch_filter_presets');
      
      if (presetsJson) {
        const presets = JSON.parse(presetsJson);
        this.state.presets = presets.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
        
        console.log(`Loaded ${this.state.presets.length} filter presets from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    }
  }
  
  /**
   * Save presets to localStorage
   * @private
   */
  _savePresetsToLocalStorage() {
    try {
      const presetsJson = JSON.stringify(this.state.presets);
      localStorage.setItem('dispatch_filter_presets', presetsJson);
      
      console.log(`Saved ${this.state.presets.length} filter presets to localStorage`);
    } catch (error) {
      console.error('Failed to save filter presets:', error);
      throw error;
    }
  }
  
  /**
   * Render presets list
   * @private
   */
  _renderPresets() {
    if (!this.ui.presetsListElement) return;
    
    if (this.state.presets.length === 0) {
      this.ui.presetsListElement.innerHTML = '<p style="text-align: center; color: #717973; font-size: 14px;">No presets saved yet</p>';
      return;
    }
    
    this.ui.presetsListElement.innerHTML = this.state.presets.map(preset => `
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: #f5f3ef;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      " data-preset-id="${preset.id}">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #012d1d; font-size: 14px;">${preset.name}</div>
          <div style="font-size: 12px; color: #717973;">
            ${this._getFilterDescription(preset.criteria)}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button style="
            background: none;
            border: none;
            color: #012d1d;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
          " title="Apply preset" data-action="apply">
            ✓
          </button>
          <button style="
            background: none;
            border: none;
            color: #ba1a1a;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
          " title="Delete preset" data-action="delete">
            ✕
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners to preset buttons
    this.ui.presetsListElement.querySelectorAll('[data-action="apply"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = e.target.closest('[data-preset-id]').dataset.presetId;
        this._applyPreset(presetId);
      });
    });
    
    this.ui.presetsListElement.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetId = e.target.closest('[data-preset-id]').dataset.presetId;
        this._deletePreset(presetId);
      });
    });
  }
  
  /**
   * Get filter description string
   * @param {FilterCriteria} criteria - Filter criteria
   * @returns {string} Description string
   * @private
   */
  _getFilterDescription(criteria) {
    const descriptions = [];
    
    if (criteria.unassignedOnly) descriptions.push('Unassigned');
    if (criteria.assignedNotPickedUp) descriptions.push('Not Picked Up');
    if (criteria.lateDeliveries) descriptions.push('Late');
    if (criteria.cashOnDelivery) descriptions.push('COD');
    if (criteria.merchantId) {
      const merchant = this.dispatchMap.state.data.merchants.find(m => m.id === criteria.merchantId);
      descriptions.push(merchant ? merchant.name : 'Merchant');
    }
    
    return descriptions.join(' • ');
  }
  
  /**
   * Apply a saved preset
   * @param {string} presetId - Preset ID
   * @private
   */
  _applyPreset(presetId) {
    const preset = this.state.presets.find(p => p.id === presetId);
    
    if (!preset) {
      console.error('Preset not found:', presetId);
      return;
    }
    
    // Apply preset criteria
    this.state.criteria = { ...preset.criteria };
    
    // Update UI controls
    this.ui.filterControls.unassignedOnly.checked = preset.criteria.unassignedOnly;
    this.ui.filterControls.assignedNotPickedUp.checked = preset.criteria.assignedNotPickedUp;
    this.ui.filterControls.lateDeliveries.checked = preset.criteria.lateDeliveries;
    this.ui.filterControls.cashOnDelivery.checked = preset.criteria.cashOnDelivery;
    this.ui.filterControls.merchantId.value = preset.criteria.merchantId || '';
    
    // Apply filters
    this._applyFilters();
    this._updateActiveFilterCount();
    
    console.log(`Applied filter preset: ${preset.name}`);
  }
  
  /**
   * Delete a preset
   * @param {string} presetId - Preset ID
   * @private
   */
  _deletePreset(presetId) {
    const preset = this.state.presets.find(p => p.id === presetId);
    
    if (!preset) {
      console.error('Preset not found:', presetId);
      return;
    }
    
    if (confirm(`Delete preset "${preset.name}"?`)) {
      this.state.presets = this.state.presets.filter(p => p.id !== presetId);
      this._savePresetsToLocalStorage();
      this._renderPresets();
      
      console.log(`Deleted filter preset: ${preset.name}`);
    }
  }
  
  /**
   * Get current filter criteria
   * @returns {FilterCriteria} Current filter criteria
   */
  getCriteria() {
    return { ...this.state.criteria };
  }
  
  /**
   * Set filter criteria
   * @param {FilterCriteria} criteria - New filter criteria
   */
  setCriteria(criteria) {
    this.state.criteria = { ...criteria };
    
    // Update UI controls
    this.ui.filterControls.unassignedOnly.checked = criteria.unassignedOnly || false;
    this.ui.filterControls.assignedNotPickedUp.checked = criteria.assignedNotPickedUp || false;
    this.ui.filterControls.lateDeliveries.checked = criteria.lateDeliveries || false;
    this.ui.filterControls.cashOnDelivery.checked = criteria.cashOnDelivery || false;
    this.ui.filterControls.merchantId.value = criteria.merchantId || '';
    
    // Apply filters
    this._applyFilters();
    this._updateActiveFilterCount();
  }
  
  /**
   * Get all saved presets
   * @returns {Array<FilterPreset>} Saved presets
   */
  getPresets() {
    return [...this.state.presets];
  }
  
  /**
   * Export current filter state as JSON
   * @returns {Object} Filter state
   */
  exportState() {
    return {
      criteria: { ...this.state.criteria },
      presets: this.state.presets.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      }))
    };
  }
  
  /**
   * Import filter state from JSON
   * @param {Object} state - Filter state to import
   */
  importState(state) {
    if (state.criteria) {
      this.state.criteria = { ...state.criteria };
    }
    
    if (state.presets) {
      this.state.presets = state.presets.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
    }
    
    // Update UI controls
    this.ui.filterControls.unassignedOnly.checked = this.state.criteria.unassignedOnly || false;
    this.ui.filterControls.assignedNotPickedUp.checked = this.state.criteria.assignedNotPickedUp || false;
    this.ui.filterControls.lateDeliveries.checked = this.state.criteria.lateDeliveries || false;
    this.ui.filterControls.cashOnDelivery.checked = this.state.criteria.cashOnDelivery || false;
    this.ui.filterControls.merchantId.value = this.state.criteria.merchantId || '';
    
    // Apply filters
    this._applyFilters();
    this._updateActiveFilterCount();
    
    // Render presets
    this._renderPresets();
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FiltersModule };
}
