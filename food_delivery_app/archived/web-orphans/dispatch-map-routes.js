/**
 * Route Preview Module - Route Display Functionality for SmartSoko Dispatch Map
 * 
 * This module provides route preview functionality for orders, displaying:
 * - Driving routes on the map using Mapbox Directions API
 * - Distance in kilometers
 * - Estimated duration in minutes
 * - Support for multiple routes simultaneously
 * - Graceful error handling
 * 
 * Features:
 * - Route caching by coordinates to avoid duplicate API calls
 * - Automatic route replacement when selecting new orders
 * - Route removal on order deselection
 * - Error handling with health panel integration
 * - Polyline rendering with customizable styling
 * 
 * @module RoutesModule
 */

import { drawRoute } from './config/mapbox-config.js';

/**
 * Route object
 * @typedef {Object} Route
 * @property {string} orderId - Order ID
 * @property {Object} startCoords - Start coordinates [lng, lat]
 * @property {Object} endCoords - End coordinates [lng, lat]
 * @property {Object} routeData - Mapbox Directions API response
 * @property {number} distance - Distance in kilometers
 * @property {number} duration - Duration in minutes
 * @property {string} layerId - Mapbox layer ID for this route
 * @property {string} sourceId - Mapbox source ID for this route
 */

/**
 * Route cache entry
 * @typedef {Object} RouteCacheEntry
 * @property {Object} routeData - Cached route data
 * @property {number} distance - Distance in kilometers
 * @property {number} duration - Duration in minutes
 * @property {number} timestamp - Cache timestamp
 */

/**
 * Routes module for dispatch map
 */
export class RoutesModule {
  /**
   * Create a new RoutesModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    
    // Route state
    this.state = {
      activeRoute: null,
      selectedOrderId: null,
      routes: new Map() // Map of orderId -> Route
    };
    
    // Route cache to avoid duplicate API calls
    this.routeCache = new Map(); // Map of "lng1,lat1;lng2,lat2" -> RouteCacheEntry
    
    // Cache TTL in milliseconds (5 minutes)
    this.CACHE_TTL = 5 * 60 * 1000;
    
    // Route styling
    this.routeStyle = {
      color: '#012d1d',
      width: 5,
      opacity: 0.8
    };
    
    // Mapbox API configuration
    this.mapboxToken = dispatchMap.config.mapboxToken;
    
    // Event listeners
    this.listeners = [];
  }
  
  /**
   * Initialize the routes module
   * @returns {Promise<void>}
   */
  async init() {
    // Set up event listeners for order selection
    this._setupEventListeners();
    
    console.log('Routes module initialized');
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for order selection events
    // This will be triggered by the merchant pins module or other UI components
    
    // Listen for order deselection
    // This will be triggered when the user closes a popup or clicks elsewhere
  }
  
  /**
   * Display a route for an order
   * @param {Object} order - Order document
   * @returns {Promise<Object|null>} Route data or null if failed
   */
  async displayRoute(order) {
    try {
      // Validate order has required data
      if (!order || !order.id) {
        console.warn('Invalid order for route display');
        return null;
      }
      
      // Get merchant and delivery locations
      const merchant = this._getMerchantForOrder(order);
      if (!merchant) {
        console.warn('Merchant not found for order:', order.id);
        this.dispatchMap.state.health.geocodeFailures++;
        this.dispatchMap._updateHealthPanel();
        return null;
      }
      
      const startCoords = this._getCoordinates(merchant);
      const endCoords = this._getCoordinates(order);
      
      if (!startCoords || !endCoords) {
        console.warn('Missing coordinates for route:', order.id);
        this.dispatchMap.state.health.geocodeFailures++;
        this.dispatchMap._updateHealthPanel();
        return null;
      }
      
      // Remove previous route if exists
      if (this.state.activeRoute) {
        this.removeRoute(this.state.activeRoute.orderId);
      }
      
      // Check cache first
      const cacheKey = this._getCacheKey(startCoords, endCoords);
      let routeData = this._getFromCache(cacheKey);
      
      if (!routeData) {
        // Fetch route from Mapbox Directions API
        routeData = await this._fetchRoute(startCoords, endCoords);
        
        if (!routeData) {
          console.error('Failed to fetch route for order:', order.id);
          this.dispatchMap.state.health.mapboxErrors++;
          this.dispatchMap._updateHealthPanel();
          return null;
        }
        
        // Cache the route
        this._addToCache(cacheKey, routeData);
      }
      
      // Extract distance and duration
      const distance = routeData.distance / 1000; // Convert to km
      const duration = Math.round(routeData.duration / 60); // Convert to minutes
      
      // Create route object
      const route = {
        orderId: order.id,
        startCoords,
        endCoords,
        routeData,
        distance,
        duration,
        layerId: `route-${order.id}`,
        sourceId: `route-source-${order.id}`
      };
      
      // Render route on map
      await this._renderRoute(route);
      
      // Update state
      this.state.activeRoute = route;
      this.state.selectedOrderId = order.id;
      this.state.routes.set(order.id, route);
      
      // Update order popup with route info
      this._updateOrderPopup(order, route);
      
      console.log(`Route displayed for order ${order.id}: ${distance.toFixed(1)}km, ${duration}min`);
      
      return route;
    } catch (error) {
      console.error('Error displaying route:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      this.dispatchMap._updateHealthPanel();
      return null;
    }
  }
  
  /**
   * Remove a route from the map
   * @param {string} orderId - Order ID
   */
  removeRoute(orderId) {
    try {
      const route = this.state.routes.get(orderId);
      if (!route) {
        return;
      }
      
      // Remove layer and source from map
      if (this.map.getLayer(route.layerId)) {
        this.map.removeLayer(route.layerId);
      }
      
      if (this.map.getSource(route.sourceId)) {
        this.map.removeSource(route.sourceId);
      }
      
      // Remove from state
      this.state.routes.delete(orderId);
      
      if (this.state.activeRoute && this.state.activeRoute.orderId === orderId) {
        this.state.activeRoute = null;
        this.state.selectedOrderId = null;
      }
      
      console.log(`Route removed for order ${orderId}`);
    } catch (error) {
      console.error('Error removing route:', error);
    }
  }
  
  /**
   * Remove all routes from the map
   */
  removeAllRoutes() {
    const orderIds = Array.from(this.state.routes.keys());
    orderIds.forEach(orderId => this.removeRoute(orderId));
  }
  
  /**
   * Get merchant for an order
   * @param {Object} order - Order document
   * @returns {Object|null} Merchant document or null
   * @private
   */
  _getMerchantForOrder(order) {
    if (!order.merchantId) {
      return null;
    }
    
    const { merchants } = this.dispatchMap.state.data;
    return merchants.find(m => m.id === order.merchantId) || null;
  }
  
  /**
   * Get coordinates from a document
   * @param {Object} doc - Document with location data
   * @returns {Array|null} [lng, lat] or null
   * @private
   */
  _getCoordinates(doc) {
    // Try structured location object first
    if (doc.pickupLocation && doc.pickupLocation.lng && doc.pickupLocation.lat) {
      return [doc.pickupLocation.lng, doc.pickupLocation.lat];
    }
    
    if (doc.deliveryLocation && doc.deliveryLocation.lng && doc.deliveryLocation.lat) {
      return [doc.deliveryLocation.lng, doc.deliveryLocation.lat];
    }
    
    // Fall back to direct coordinates
    if (doc.lng && doc.lat) {
      return [doc.lng, doc.lat];
    }
    
    return null;
  }
  
  /**
   * Get cache key for coordinates
   * @param {Array} startCoords - [lng, lat]
   * @param {Array} endCoords - [lng, lat]
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey(startCoords, endCoords) {
    return `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
  }
  
  /**
   * Get route from cache
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached route data or null
   * @private
   */
  _getFromCache(cacheKey) {
    const entry = this.routeCache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.routeCache.delete(cacheKey);
      return null;
    }
    
    return entry.routeData;
  }
  
  /**
   * Add route to cache
   * @param {string} cacheKey - Cache key
   * @param {Object} routeData - Route data from Mapbox API
   * @private
   */
  _addToCache(cacheKey, routeData) {
    this.routeCache.set(cacheKey, {
      routeData,
      distance: routeData.distance,
      duration: routeData.duration,
      timestamp: Date.now()
    });
  }
  
  /**
   * Fetch route from Mapbox Directions API
   * @param {Array} startCoords - [lng, lat]
   * @param {Array} endCoords - [lng, lat]
   * @returns {Promise<Object|null>} Route data or null
   * @private
   */
  async _fetchRoute(startCoords, endCoords) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?` +
        `geometries=geojson&overview=full&access_token=${this.mapboxToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Mapbox API error:', response.status, response.statusText);
        this.dispatchMap.state.health.mapboxErrors++;
        this.dispatchMap._updateHealthPanel();
        return null;
      }
      
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        console.warn('No routes found in Mapbox response');
        return null;
      }
      
      return data.routes[0];
    } catch (error) {
      console.error('Error fetching route from Mapbox:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      this.dispatchMap._updateHealthPanel();
      return null;
    }
  }
  
  /**
   * Render route on map
   * @param {Route} route - Route object
   * @returns {Promise<void>}
   * @private
   */
  async _renderRoute(route) {
    try {
      // Create GeoJSON feature from route geometry
      const routeFeature = {
        type: 'Feature',
        properties: {
          orderId: route.orderId,
          distance: route.distance,
          duration: route.duration
        },
        geometry: route.routeData.geometry
      };
      
      // Add source to map
      if (!this.map.getSource(route.sourceId)) {
        this.map.addSource(route.sourceId, {
          type: 'geojson',
          data: routeFeature
        });
      } else {
        this.map.getSource(route.sourceId).setData(routeFeature);
      }
      
      // Add layer to map
      if (!this.map.getLayer(route.layerId)) {
        this.map.addLayer({
          id: route.layerId,
          type: 'line',
          source: route.sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': this.routeStyle.color,
            'line-width': this.routeStyle.width,
            'line-opacity': this.routeStyle.opacity
          }
        });
      }
      
      console.log(`Route rendered for order ${route.orderId}`);
    } catch (error) {
      console.error('Error rendering route:', error);
      throw error;
    }
  }
  
  /**
   * Update order popup with route information
   * @param {Object} order - Order document
   * @param {Route} route - Route object
   * @private
   */
  _updateOrderPopup(order, route) {
    try {
      // Find the popup element for this order
      // This will be implemented when the merchant pins module is created
      // For now, we'll just log the information
      
      const popupContent = `
        <div class="p-3">
          <h3 class="font-bold text-sm mb-2">Order ${order.id}</h3>
          <div class="text-xs space-y-1">
            <div><strong>Distance:</strong> ${route.distance.toFixed(1)} km</div>
            <div><strong>Duration:</strong> ${route.duration} min</div>
            <div><strong>Status:</strong> ${order.status || 'Unknown'}</div>
          </div>
        </div>
      `;
      
      console.log('Route info for popup:', popupContent);
    } catch (error) {
      console.error('Error updating order popup:', error);
    }
  }
  
  /**
   * Handle order selection event
   * @param {Object} order - Selected order
   */
  async onOrderSelected(order) {
    if (!order) {
      return;
    }
    
    await this.displayRoute(order);
  }
  
  /**
   * Handle order deselection event
   * @param {string} orderId - Deselected order ID
   */
  onOrderDeselected(orderId) {
    if (orderId) {
      this.removeRoute(orderId);
    }
  }
  
  /**
   * Handle orders updated event
   * @param {Array} orders - Updated orders
   */
  ordersUpdated(orders) {
    // Update routes if order data has changed
    // This is called when orders are refreshed from Firestore
  }
  
  /**
   * Handle merchants updated event
   * @param {Array} merchants - Updated merchants
   */
  merchantsUpdated(merchants) {
    // Update routes if merchant data has changed
    // This is called when merchants are refreshed from Firestore
  }
  
  /**
   * Get route information for an order
   * @param {string} orderId - Order ID
   * @returns {Route|null} Route object or null
   */
  getRoute(orderId) {
    return this.state.routes.get(orderId) || null;
  }
  
  /**
   * Get all active routes
   * @returns {Array} Array of Route objects
   */
  getAllRoutes() {
    return Array.from(this.state.routes.values());
  }
  
  /**
   * Clear route cache
   */
  clearCache() {
    this.routeCache.clear();
    console.log('Route cache cleared');
  }
  
  /**
   * Destroy the routes module
   */
  destroy() {
    // Remove all routes
    this.removeAllRoutes();
    
    // Clear cache
    this.clearCache();
    
    // Remove event listeners
    this.listeners.forEach(listener => {
      if (typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = [];
    
    console.log('Routes module destroyed');
  }
}
