/**
 * Structured Address Module - Location Object Storage and Validation
 * 
 * This module handles structured address storage for both checkout and merchant locations:
 * - Validates coordinate format and ranges
 * - Stores LocationObject { lat, lng, label } on orders and merchants
 * - Falls back to geocoding if structured address not available
 * - Resolves geocode pending status when location available
 * - Integrates with DispatchMap class
 * 
 * @module StructuredAddressModule
 */

/**
 * Location Object structure
 * @typedef {Object} LocationObject
 * @property {number} lat - Latitude in range [-90, 90]
 * @property {number} lng - Longitude in range [-180, 180]
 * @property {string} label - Human-readable address string
 */

/**
 * Structured address module for dispatch map
 */
export class StructuredAddressModule {
  /**
   * Create a new StructuredAddressModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    this.config = dispatchMap.config;
    
    // State
    this.state = {
      geocodePendingOrders: [],
      geocodeFailures: 0
    };
  }
  
  /**
   * Initialize the structured address module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Check for orders with geocodePending flag
      await this._resolveGeocodePending();
      
      console.log('Structured address module initialized');
    } catch (error) {
      console.error('Structured address module initialization failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Validate coordinate values
   * @param {number} lat - Latitude value
   * @param {number} lng - Longitude value
   * @returns {boolean} - True if coordinates are valid
   */
  validateCoordinates(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }
    
    if (lat < -90 || lat > 90) {
      return false;
    }
    
    if (lng < -180 || lng > 180) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate a LocationObject
   * @param {Object} location - LocationObject to validate
   * @returns {boolean} - True if location object is valid
   */
  validateLocationObject(location) {
    if (!location || typeof location !== 'object') {
      return false;
    }
    
    if (!this.validateCoordinates(location.lat, location.lng)) {
      return false;
    }
    
    if (typeof location.label !== 'string' || location.label.trim() === '') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create a LocationObject from coordinates and address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} label - Address label
   * @returns {Object|null} - LocationObject or null if invalid
   */
  createLocationObject(lat, lng, label) {
    if (!this.validateCoordinates(lat, lng)) {
      return null;
    }
    
    return {
      lat,
      lng,
      label: typeof label === 'string' ? label.trim() : `${lat}, ${lng}`
    };
  }
  
  /**
   * Store merchant pickup location as LocationObject
   * @param {string} merchantId - Merchant document ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} label - Address label
   * @returns {Promise<boolean>} - True if storage successful
   */
  async storeMerchantLocation(merchantId, lat, lng, label) {
    try {
      // Validate coordinates
      if (!this.validateCoordinates(lat, lng)) {
        console.error('Invalid coordinates for merchant location:', { lat, lng });
        return false;
      }
      
      // Create location object
      const locationObject = this.createLocationObject(lat, lng, label);
      if (!locationObject) {
        console.error('Failed to create location object for merchant:', merchantId);
        return false;
      }
      
      // Update merchant document
      const { doc, updateDoc } = require('firebase/firestore');
      const merchantRef = doc(this.dispatchMap.db, 'sellers', merchantId);
      
      await updateDoc(merchantRef, {
        pickupLocation: locationObject,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Stored merchant location for ${merchantId}:`, locationObject);
      return true;
      
    } catch (error) {
      console.error('Failed to store merchant location:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      return false;
    }
  }
  
  /**
   * Store order delivery location as LocationObject
   * @param {string} orderId - Order document ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} label - Address label
   * @returns {Promise<boolean>} - True if storage successful
   */
  async storeDeliveryLocation(orderId, lat, lng, label) {
    try {
      // Validate coordinates
      if (!this.validateCoordinates(lat, lng)) {
        console.error('Invalid coordinates for delivery location:', { lat, lng });
        return false;
      }
      
      // Create location object
      const locationObject = this.createLocationObject(lat, lng, label);
      if (!locationObject) {
        console.error('Failed to create location object for order:', orderId);
        return false;
      }
      
      // Update order document
      const { doc, updateDoc } = require('firebase/firestore');
      const orderRef = doc(this.dispatchMap.db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        deliveryLocation: locationObject,
        geocodePending: false,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`Stored delivery location for ${orderId}:`, locationObject);
      return true;
      
    } catch (error) {
      console.error('Failed to store delivery location:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      return false;
    }
  }
  
  /**
   * Attempt to geocode an address string
   * @param {string} address - Address string to geocode
   * @returns {Promise<Object|null>} - LocationObject or null if geocoding failed
   */
  async geocodeAddress(address) {
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return null;
    }
    
    try {
      const mapboxToken = this.config.mapboxToken;
      if (!mapboxToken) {
        console.warn('No Mapbox token configured for geocoding');
        return null;
      }
      
      const query = encodeURIComponent(address.trim());
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?types=address,place,locality&limit=1&access_token=${mapboxToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.warn('No geocoding results for address:', address);
        return null;
      }
      
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      
      return this.createLocationObject(
        lat,
        lng,
        feature.place_name || address
      );
      
    } catch (error) {
      console.error('Geocoding failed for address:', address, error);
      this.dispatchMap.state.health.mapboxErrors++;
      return null;
    }
  }
  
  /**
   * Resolve geocode pending orders by attempting to geocode their addresses
   * @private
   */
  async _resolveGeocodePending() {
    try {
      const { orders } = this.dispatchMap.state.data;
      
      // Find orders with geocodePending flag
      const pendingOrders = orders.filter(
        order => order.geocodePending && order.deliveryAddress
      );
      
      this.state.geocodePendingOrders = pendingOrders;
      
      // Attempt to geocode each pending order
      for (const order of pendingOrders) {
        const locationObject = await this.geocodeAddress(order.deliveryAddress);
        
        if (locationObject) {
          // Update order with resolved location
          await this.storeDeliveryLocation(
            order.id,
            locationObject.lat,
            locationObject.lng,
            locationObject.label
          );
        } else {
          // Increment geocode failure counter
          this.state.geocodeFailures++;
          this.dispatchMap.state.health.geocodeFailures++;
        }
      }
      
      console.log(`Resolved ${pendingOrders.length - this.state.geocodeFailures} geocode pending orders`);
      
    } catch (error) {
      console.error('Failed to resolve geocode pending orders:', error);
    }
  }
  
  /**
   * Handle orders updated event
   * @param {Array} orders - Updated orders
   */
  ordersUpdated(orders) {
    // Check for new geocode pending orders
    const newPending = orders.filter(
      order => order.geocodePending && order.deliveryAddress
    );
    
    if (newPending.length > 0) {
      this.state.geocodePendingOrders = newPending;
      this._resolveGeocodePending();
    }
  }
  
  /**
   * Get geocode pending orders
   * @returns {Array} - Array of orders with geocodePending flag
   */
  getGeocodePendingOrders() {
    return this.state.geocodePendingOrders;
  }
  
  /**
   * Get geocode failure count
   * @returns {number} - Number of geocode failures
   */
  getGeocodeFailures() {
    return this.state.geocodeFailures;
  }
  
  /**
   * Destroy the structured address module
   */
  destroy() {
    try {
      this.state.geocodePendingOrders = [];
      this.state.geocodeFailures = 0;
      console.log('Structured address module destroyed');
    } catch (error) {
      console.error('Error destroying structured address module:', error);
    }
  }
}
