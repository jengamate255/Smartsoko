/**
 * Merchant Pins Module - Customer Drop-Off and Merchant Pickup Pin Rendering
 * 
 * This module renders both merchant pickup pins and customer drop-off pins on the map:
 * - Merchant pickup pins with restaurant icon
 * - Customer drop-off pins with home/destination icon
 * - Visual differentiation between pin types
 * - Popup content showing merchant/customer details
 * - Graceful handling of missing location data
 * - Integration with pin accuracy indicators
 * 
 * @module MerchantsModule
 */

/**
 * Pin rendering state
 * @typedef {Object} PinRenderingState
 * @property {Map<string, Object>} merchantPins - Map of merchant ID to pin marker
 * @property {Map<string, Object>} customerPins - Map of order ID to pin marker
 * @property {boolean} initialized - Whether pins have been rendered
 * @property {number} merchantPinCount - Total merchant pins rendered
 * @property {number} customerPinCount - Total customer pins rendered
 */

/**
 * Merchants module for dispatch map
 */
export class MerchantsModule {
  /**
   * Create a new MerchantsModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    this.config = dispatchMap.config;
    
    // Rendering state
    this.state = {
      merchantPins: new Map(),
      customerPins: new Map(),
      initialized: false,
      merchantPinCount: 0,
      customerPinCount: 0,
      orders: [],
      merchants: []
    };
    
    // Icon URLs (using emoji or data URIs for simplicity)
    this.icons = {
      merchant: this._createMerchantIcon(),
      customer: this._createCustomerIcon()
    };
  }
  
  /**
   * Initialize the merchants module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Render initial pins
      await this.renderPins(
        this.dispatchMap.state.data.orders,
        this.dispatchMap.state.data.merchants
      );
      
      console.log('Merchants module initialized');
    } catch (error) {
      console.error('Merchants module initialization failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Create merchant icon (restaurant)
   * @returns {string} - Data URI for merchant icon
   * @private
   */
  _createMerchantIcon() {
    // Create a simple restaurant icon using SVG
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
   * Create customer icon (home/destination)
   * @returns {string} - Data URI for customer icon
   * @private
   */
  _createCustomerIcon() {
    // Create a simple home/destination icon using SVG
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0066CC" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  
  /**
   * Render merchant and customer pins on the map
   * @param {Array} orders - Array of order documents
   * @param {Array} merchants - Array of merchant documents
   * @returns {Promise<void>}
   */
  async renderPins(orders, merchants) {
    try {
      // Validate input
      if (!orders || !Array.isArray(orders)) {
        console.warn('Invalid orders data provided to renderPins');
        return;
      }
      
      if (!merchants || !Array.isArray(merchants)) {
        console.warn('Invalid merchants data provided to renderPins');
        return;
      }
      
      // Store data for reference
      this.state.orders = orders;
      this.state.merchants = merchants;
      
      // Clear existing pins if re-rendering
      if (this.state.initialized) {
        this.clearPins();
      }
      
      // If no orders, handle gracefully
      if (orders.length === 0) {
        console.log('No orders to render pins for');
        this.state.initialized = true;
        return;
      }
      
      // Create a map of merchants by ID for quick lookup
      const merchantMap = new Map(merchants.map(m => [m.id, m]));
      
      // Render pins for each order
      orders.forEach((order) => {
        try {
          // Render merchant pickup pin
          this._renderMerchantPin(order, merchantMap);
          
          // Render customer drop-off pin
          this._renderCustomerPin(order);
        } catch (error) {
          console.error(`Failed to render pins for order ${order.id}:`, error);
          // Continue rendering other orders
        }
      });
      
      this.state.initialized = true;
      console.log(
        `Rendered ${this.state.merchantPinCount} merchant pins and ${this.state.customerPinCount} customer pins`
      );
      
    } catch (error) {
      console.error('Error rendering pins:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Render a merchant pickup pin for an order
   * @param {Object} order - Order document
   * @param {Map} merchantMap - Map of merchants by ID
   * @private
   */
  _renderMerchantPin(order, merchantMap) {
    // Validate order has merchant reference
    if (!order.merchantId) {
      console.warn(`Order ${order.id} has no merchant reference`);
      return;
    }
    
    // Get merchant data
    const merchant = merchantMap.get(order.merchantId);
    if (!merchant) {
      console.warn(`Merchant ${order.merchantId} not found for order ${order.id}`);
      return;
    }
    
    // Validate merchant has location
    if (!merchant.pickupLocation || !merchant.pickupLocation.lat || !merchant.pickupLocation.lng) {
      console.warn(`Merchant ${merchant.id} has no valid pickup location`);
      this.dispatchMap.state.health.geocodeFailures++;
      return;
    }
    
    // Create merchant pin element
    const el = document.createElement('div');
    el.className = 'merchant-pin';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.backgroundSize = 'contain';
    el.style.backgroundImage = `url(${this.icons.merchant})`;
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
    
    // Store marker reference
    const pinKey = `merchant-${merchant.id}`;
    this.state.merchantPins.set(pinKey, marker);
    this.state.merchantPinCount++;
    
    // Add click handler
    el.addEventListener('click', () => {
      marker.togglePopup();
    });
  }
  
  /**
   * Render a customer drop-off pin for an order
   * @param {Object} order - Order document
   * @private
   */
  _renderCustomerPin(order) {
    // Validate order has delivery location
    if (!order.deliveryLocation || !order.deliveryLocation.lat || !order.deliveryLocation.lng) {
      console.warn(`Order ${order.id} has no valid delivery location`);
      return;
    }
    
    // Create customer pin element
    const el = document.createElement('div');
    el.className = 'customer-pin';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.backgroundSize = 'contain';
    el.style.backgroundImage = `url(${this.icons.customer})`;
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
    
    // Store marker reference
    const pinKey = `customer-${order.id}`;
    this.state.customerPins.set(pinKey, marker);
    this.state.customerPinCount++;
    
    // Add click handler
    el.addEventListener('click', () => {
      marker.togglePopup();
    });
  }
  
  /**
   * Create popup content for merchant pin
   * @param {Object} merchant - Merchant document
   * @param {Object} order - Order document
   * @returns {string} - HTML popup content
   * @private
   */
  _createMerchantPopupContent(merchant, order) {
    // Get all orders for this merchant
    const ordersForMerchant = this.state.orders.filter(o => o.merchantId === merchant.id);
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
    // Get customer name from order (if available)
    const customerName = order.customerName || order.customerId || 'Unknown Customer';
    
    // Get merchant name
    const merchant = this.state.merchants.find(m => m.id === order.merchantId);
    const merchantName = merchant?.name || 'Unknown Merchant';
    
    // Get driver name if assigned
    const driverName = order.driverName || order.driverId || 'Unassigned';
    
    // Format status
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
   * Clear all rendered pins
   */
  clearPins() {
    try {
      // Remove all merchant pins
      for (const marker of this.state.merchantPins.values()) {
        marker.remove();
      }
      this.state.merchantPins.clear();
      
      // Remove all customer pins
      for (const marker of this.state.customerPins.values()) {
        marker.remove();
      }
      this.state.customerPins.clear();
      
      // Reset counts
      this.state.merchantPinCount = 0;
      this.state.customerPinCount = 0;
      
      console.log('Pins cleared');
    } catch (error) {
      console.error('Error clearing pins:', error);
    }
  }
  
  /**
   * Update pins when data changes
   * @param {Array} orders - Updated orders
   * @param {Array} merchants - Updated merchants
   * @returns {Promise<void>}
   */
  async update(orders, merchants) {
    await this.renderPins(orders, merchants);
  }
  
  /**
   * Handle orders updated event
   * @param {Array} orders - Updated orders
   */
  ordersUpdated(orders) {
    this.update(orders, this.state.merchants);
  }
  
  /**
   * Handle merchants updated event
   * @param {Array} merchants - Updated merchants
   */
  merchantsUpdated(merchants) {
    this.update(this.state.orders, merchants);
  }
  
  /**
   * Get merchant pin by merchant ID
   * @param {string} merchantId - Merchant ID
   * @returns {Object|null} - Marker object or null
   */
  getMerchantPin(merchantId) {
    return this.state.merchantPins.get(`merchant-${merchantId}`) || null;
  }
  
  /**
   * Get customer pin by order ID
   * @param {string} orderId - Order ID
   * @returns {Object|null} - Marker object or null
   */
  getCustomerPin(orderId) {
    return this.state.customerPins.get(`customer-${orderId}`) || null;
  }
  
  /**
   * Destroy the merchants module
   */
  destroy() {
    try {
      this.clearPins();
      console.log('Merchants module destroyed');
    } catch (error) {
      console.error('Error destroying merchants module:', error);
    }
  }
}
