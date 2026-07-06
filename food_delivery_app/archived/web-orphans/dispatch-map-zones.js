/**
 * Delivery Zones Module - Zone Polygon Rendering for SmartSoko Dispatch Map
 * 
 * This module renders delivery zones as GeoJSON polygons on the map with:
 * - Distinct fill colors with 0.2 opacity
 * - Solid borders with 1.0 opacity
 * - Click tooltips showing zone name and order count
 * - Graceful handling of missing or invalid zone data
 * - Out-of-zone and unassigned-zone pin warnings
 * 
 * @module ZonesModule
 */

/**
 * Delivery zone document structure
 * @typedef {Object} DeliveryZoneDocument
 * @property {string} id - Document ID
 * @property {string} name - Zone name
 * @property {Object} polygon - GeoJSON Polygon geometry
 * @property {string} color - Zone display color (hex or named)
 */

/**
 * Zone rendering state
 * @typedef {Object} ZoneRenderingState
 * @property {Map<string, string>} layerIds - Map of zone ID to layer ID
 * @property {Map<string, string>} sourceIds - Map of zone ID to source ID
 * @property {boolean} initialized - Whether zones have been rendered
 * @property {number} zoneCount - Total number of zones rendered
 */

/**
 * Zones module for dispatch map
 */
export class ZonesModule {
  /**
   * Create a new ZonesModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    this.config = dispatchMap.config;
    
    // Rendering state
    this.state = {
      layerIds: new Map(),
      sourceIds: new Map(),
      initialized: false,
      zoneCount: 0,
      zones: []
    };
    
    // Default zone colors (palette)
    this.defaultColors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#FFA07A', // Light Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#85C1E2'  // Light Blue
    ];
  }
  
  /**
   * Initialize the zones module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Load and render zones
      await this.renderZones(this.dispatchMap.state.data.deliveryZones);
      
      // Set up event listeners for zone updates
      this.dispatchMap.on('zonesUpdated', (zones) => {
        this.renderZones(zones);
      });
      
      console.log('Zones module initialized');
    } catch (error) {
      console.error('Zones module initialization failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Render delivery zones as polygons on the map
   * @param {Array<DeliveryZoneDocument>} zones - Array of zone documents
   * @returns {Promise<void>}
   */
  async renderZones(zones) {
    try {
      // Validate input
      if (!zones || !Array.isArray(zones)) {
        console.warn('Invalid zones data provided to renderZones');
        return;
      }
      
      // Store zones for reference
      this.state.zones = zones;
      
      // Clear existing zones if re-rendering
      if (this.state.initialized) {
        this.clearZones();
      }
      
      // If no zones, handle gracefully
      if (zones.length === 0) {
        console.log('No delivery zones to render');
        this.state.initialized = true;
        return;
      }
      
      // Render each zone
      zones.forEach((zone, index) => {
        try {
          this._renderZonePolygon(zone, index);
        } catch (error) {
          console.error(`Failed to render zone ${zone.id}:`, error);
          // Continue rendering other zones
        }
      });
      
      this.state.initialized = true;
      this.state.zoneCount = zones.length;
      console.log(`Rendered ${zones.length} delivery zones`);
      
    } catch (error) {
      console.error('Error rendering zones:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Render a single zone polygon
   * @param {DeliveryZoneDocument} zone - Zone document
   * @param {number} index - Zone index for color assignment
   * @private
   */
  _renderZonePolygon(zone, index) {
    // Validate zone data
    if (!zone.id || !zone.polygon) {
      console.warn('Zone missing required fields:', zone);
      return;
    }
    
    // Validate polygon geometry
    if (!this._isValidPolygon(zone.polygon)) {
      console.warn('Zone has invalid polygon geometry:', zone.id);
      return;
    }
    
    // Get zone color
    const color = zone.color || this.defaultColors[index % this.defaultColors.length];
    
    // Create source ID and layer ID
    const sourceId = `zone-source-${zone.id}`;
    const layerId = `zone-layer-${zone.id}`;
    
    // Create GeoJSON feature
    const feature = {
      type: 'Feature',
      properties: {
        id: zone.id,
        name: zone.name || `Zone ${index + 1}`,
        color: color
      },
      geometry: zone.polygon
    };
    
    // Add source to map
    if (!this.map.getSource(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: feature
      });
    }
    
    // Add fill layer
    const fillLayerId = `${layerId}-fill`;
    if (!this.map.getLayer(fillLayerId)) {
      this.map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': this.config.zonesFillOpacity || 0.2
        }
      });
    }
    
    // Add border layer
    const borderLayerId = `${layerId}-border`;
    if (!this.map.getLayer(borderLayerId)) {
      this.map.addLayer({
        id: borderLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-opacity': this.config.zonesBorderOpacity || 1.0
        }
      });
    }
    
    // Add click handler for tooltip
    this.map.on('click', fillLayerId, (e) => {
      this._handleZoneClick(zone, e);
    });
    
    // Change cursor on hover
    this.map.on('mouseenter', fillLayerId, () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    
    this.map.on('mouseleave', fillLayerId, () => {
      this.map.getCanvas().style.cursor = '';
    });
    
    // Store layer and source IDs for cleanup
    this.state.layerIds.set(zone.id, { fill: fillLayerId, border: borderLayerId });
    this.state.sourceIds.set(zone.id, sourceId);
  }
  
  /**
   * Handle zone polygon click
   * @param {DeliveryZoneDocument} zone - Clicked zone
   * @param {Object} event - Mapbox click event
   * @private
   */
  _handleZoneClick(zone, event) {
    try {
      // Count orders in this zone
      const ordersInZone = this.dispatchMap.state.data.orders.filter(order => {
        return order.deliveryZoneId === zone.id;
      });
      
      // Create popup content
      const popupContent = `
        <div class="p-3 bg-white rounded-lg shadow-lg">
          <h3 class="font-bold text-lg mb-2">${zone.name || 'Unnamed Zone'}</h3>
          <p class="text-sm text-gray-600">
            <strong>Orders:</strong> ${ordersInZone.length}
          </p>
        </div>
      `;
      
      // Create and show popup
      new mapboxgl.Popup()
        .setLngLat(event.lngLat)
        .setHTML(popupContent)
        .addTo(this.map);
        
    } catch (error) {
      console.error('Error handling zone click:', error);
    }
  }
  
  /**
   * Validate polygon geometry
   * @param {Object} polygon - GeoJSON polygon geometry
   * @returns {boolean} - True if valid
   * @private
   */
  _isValidPolygon(polygon) {
    if (!polygon || polygon.type !== 'Polygon') {
      return false;
    }
    
    if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
      return false;
    }
    
    // Check that coordinates are valid [lng, lat] pairs
    const ring = polygon.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      return false;
    }
    
    // Validate each coordinate
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return false;
      }
      const [lng, lat] = coord;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return false;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if a point is inside a polygon (point-in-polygon test)
   * Uses ray casting algorithm
   * @param {Array} point - [lng, lat] coordinates
   * @param {Array} polygon - GeoJSON polygon coordinates
   * @returns {boolean} - True if point is inside polygon
   */
  isPointInPolygon(point, polygon) {
    if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) {
      return false;
    }
    
    const [lng, lat] = point;
    const ring = polygon.coordinates[0];
    
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }
  
  /**
   * Check if an order is out of zone
   * @param {Object} order - Order document
   * @returns {boolean} - True if order is outside all zones
   */
  isOrderOutOfZone(order) {
    if (!order.deliveryLocation || !order.deliveryLocation.lat || !order.deliveryLocation.lng) {
      return false; // Can't determine without coordinates
    }
    
    const point = [order.deliveryLocation.lng, order.deliveryLocation.lat];
    
    // Check if point is in any zone
    for (const zone of this.state.zones) {
      if (zone.polygon && this.isPointInPolygon(point, zone.polygon)) {
        return false; // Point is in a zone
      }
    }
    
    return true; // Point is outside all zones
  }
  
  /**
   * Check if an order is unassigned to a zone
   * @param {Object} order - Order document
   * @returns {boolean} - True if order has no zone assignment
   */
  isOrderUnassignedZone(order) {
    return !order.deliveryZoneId;
  }
  
  /**
   * Clear all rendered zones
   */
  clearZones() {
    try {
      // Remove all layers and sources
      for (const [zoneId, layerIds] of this.state.layerIds) {
        // Remove fill layer
        if (this.map.getLayer(layerIds.fill)) {
          this.map.removeLayer(layerIds.fill);
        }
        
        // Remove border layer
        if (this.map.getLayer(layerIds.border)) {
          this.map.removeLayer(layerIds.border);
        }
        
        // Remove source
        const sourceId = this.state.sourceIds.get(zoneId);
        if (sourceId && this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId);
        }
      }
      
      // Clear state
      this.state.layerIds.clear();
      this.state.sourceIds.clear();
      this.state.zoneCount = 0;
      
      console.log('Zones cleared');
    } catch (error) {
      console.error('Error clearing zones:', error);
    }
  }
  
  /**
   * Update zones when data changes
   * @param {Array<DeliveryZoneDocument>} zones - Updated zones
   * @returns {Promise<void>}
   */
  async update(zones) {
    await this.renderZones(zones);
  }
  
  /**
   * Destroy the zones module
   */
  destroy() {
    try {
      this.clearZones();
      console.log('Zones module destroyed');
    } catch (error) {
      console.error('Error destroying zones module:', error);
    }
  }
}
