/**
 * Zones Module Unit Tests
 * 
 * Tests for delivery zone polygon rendering including:
 * - Zone polygon rendering with correct opacity and colors
 * - Out-of-zone pin warnings
 * - Unassigned zone indicators
 * - Missing zones graceful degradation
 * - Zone click tooltips
 * - Invalid zone data handling
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ZonesModule } from './dispatch-map-zones.js';

describe('ZonesModule', () => {
  let zonesModule;
  let mockDispatchMap;
  let mockMap;
  
  beforeEach(() => {
    // Create mock Mapbox map
    mockMap = {
      getSource: vi.fn(() => null),
      addSource: vi.fn(),
      getLayer: vi.fn(() => null),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      on: vi.fn(),
      getCanvas: () => ({ style: { cursor: '' } })
    };
    
    // Create mock DispatchMap
    mockDispatchMap = {
      map: mockMap,
      config: {
        zonesFillOpacity: 0.2,
        zonesBorderOpacity: 1.0
      },
      state: {
        data: {
          orders: [],
          drivers: [],
          merchants: [],
          deliveryZones: []
        },
        health: {
          mapboxErrors: 0
        }
      },
      on: vi.fn()
    };
    
    zonesModule = new ZonesModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (zonesModule) {
      zonesModule.destroy();
    }
  });
  
  describe('Zone Polygon Rendering', () => {
    it('should render a valid zone polygon with correct opacity', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Downtown',
        color: '#FF6B6B',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [39.2, -6.8],
            [39.3, -6.8],
            [39.3, -6.7],
            [39.2, -6.7],
            [39.2, -6.8]
          ]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      expect(mockMap.addSource).toHaveBeenCalled();
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fill',
          paint: expect.objectContaining({
            'fill-opacity': 0.2
          })
        })
      );
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'line',
          paint: expect.objectContaining({
            'line-opacity': 1.0
          })
        })
      );
    });
    
    it('should render multiple zones with different colors', async () => {
      const zones = [
        {
          id: 'zone-1',
          name: 'Zone 1',
          polygon: {
            type: 'Polygon',
            coordinates: [[
              [39.2, -6.8],
              [39.3, -6.8],
              [39.3, -6.7],
              [39.2, -6.7],
              [39.2, -6.8]
            ]]
          }
        },
        {
          id: 'zone-2',
          name: 'Zone 2',
          polygon: {
            type: 'Polygon',
            coordinates: [[
              [39.3, -6.8],
              [39.4, -6.8],
              [39.4, -6.7],
              [39.3, -6.7],
              [39.3, -6.8]
            ]]
          }
        }
      ];
      
      await zonesModule.renderZones(zones);
      
      expect(zonesModule.state.zoneCount).toBe(2);
      expect(mockMap.addSource).toHaveBeenCalledTimes(2);
    });
    
    it('should use default color when zone color is not specified', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [39.2, -6.8],
            [39.3, -6.8],
            [39.3, -6.7],
            [39.2, -6.7],
            [39.2, -6.8]
          ]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      // Should use first default color
      expect(mockMap.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          paint: expect.objectContaining({
            'fill-color': '#FF6B6B'
          })
        })
      );
    });
    
    it('should handle empty zones array gracefully', async () => {
      await zonesModule.renderZones([]);
      
      expect(zonesModule.state.initialized).toBe(true);
      expect(zonesModule.state.zoneCount).toBe(0);
    });
    
    it('should handle null zones gracefully', async () => {
      await zonesModule.renderZones(null);
      
      expect(zonesModule.state.initialized).toBe(false);
    });
  });
  
  describe('Invalid Zone Data Handling', () => {
    it('should skip zone with missing polygon', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1'
        // Missing polygon
      };
      
      await zonesModule.renderZones([zone]);
      
      expect(mockMap.addSource).not.toHaveBeenCalled();
    });
    
    it('should skip zone with invalid polygon type', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1',
        polygon: {
          type: 'LineString', // Invalid for zone
          coordinates: [[39.2, -6.8], [39.3, -6.7]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      expect(mockMap.addSource).not.toHaveBeenCalled();
    });
    
    it('should skip zone with invalid coordinates', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [39.2, -6.8],
            [39.3, -6.8],
            [39.3, -6.7]
            // Only 3 points, need at least 4 for closed ring
          ]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      expect(mockMap.addSource).not.toHaveBeenCalled();
    });
    
    it('should skip zone with out-of-range coordinates', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [39.2, -6.8],
            [39.3, -6.8],
            [39.3, 95], // Invalid latitude > 90
            [39.2, -6.7],
            [39.2, -6.8]
          ]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      expect(mockMap.addSource).not.toHaveBeenCalled();
    });
    
    it('should continue rendering other zones if one fails', async () => {
      const zones = [
        {
          id: 'zone-1',
          name: 'Zone 1'
          // Missing polygon - will fail
        },
        {
          id: 'zone-2',
          name: 'Zone 2',
          polygon: {
            type: 'Polygon',
            coordinates: [[
              [39.3, -6.8],
              [39.4, -6.8],
              [39.4, -6.7],
              [39.3, -6.7],
              [39.3, -6.8]
            ]]
          }
        }
      ];
      
      await zonesModule.renderZones(zones);
      
      // Should still render zone 2
      expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Point-in-Polygon Detection', () => {
    it('should detect point inside polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [39.2, -6.8],
          [39.3, -6.8],
          [39.3, -6.7],
          [39.2, -6.7],
          [39.2, -6.8]
        ]]
      };
      
      const point = [39.25, -6.75]; // Inside
      
      expect(zonesModule.isPointInPolygon(point, polygon)).toBe(true);
    });
    
    it('should detect point outside polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [39.2, -6.8],
          [39.3, -6.8],
          [39.3, -6.7],
          [39.2, -6.7],
          [39.2, -6.8]
        ]]
      };
      
      const point = [39.4, -6.75]; // Outside
      
      expect(zonesModule.isPointInPolygon(point, polygon)).toBe(false);
    });
    
    it('should handle null polygon gracefully', () => {
      const point = [39.25, -6.75];
      
      expect(zonesModule.isPointInPolygon(point, null)).toBe(false);
    });
  });
  
  describe('Out-of-Zone Detection', () => {
    beforeEach(() => {
      zonesModule.state.zones = [
        {
          id: 'zone-1',
          name: 'Zone 1',
          polygon: {
            type: 'Polygon',
            coordinates: [[
              [39.2, -6.8],
              [39.3, -6.8],
              [39.3, -6.7],
              [39.2, -6.7],
              [39.2, -6.8]
            ]]
          }
        }
      ];
    });
    
    it('should identify order outside all zones', () => {
      const order = {
        id: 'order-1',
        deliveryLocation: {
          lat: -6.75,
          lng: 39.4 // Outside zone
        }
      };
      
      expect(zonesModule.isOrderOutOfZone(order)).toBe(true);
    });
    
    it('should identify order inside a zone', () => {
      const order = {
        id: 'order-1',
        deliveryLocation: {
          lat: -6.75,
          lng: 39.25 // Inside zone
        }
      };
      
      expect(zonesModule.isOrderOutOfZone(order)).toBe(false);
    });
    
    it('should handle order without delivery location', () => {
      const order = {
        id: 'order-1'
        // No deliveryLocation
      };
      
      expect(zonesModule.isOrderOutOfZone(order)).toBe(false);
    });
  });
  
  describe('Unassigned Zone Detection', () => {
    it('should identify order without zone assignment', () => {
      const order = {
        id: 'order-1',
        deliveryLocation: { lat: -6.75, lng: 39.25 }
        // No deliveryZoneId
      };
      
      expect(zonesModule.isOrderUnassignedZone(order)).toBe(true);
    });
    
    it('should identify order with zone assignment', () => {
      const order = {
        id: 'order-1',
        deliveryZoneId: 'zone-1',
        deliveryLocation: { lat: -6.75, lng: 39.25 }
      };
      
      expect(zonesModule.isOrderUnassignedZone(order)).toBe(false);
    });
  });
  
  describe('Zone Clearing', () => {
    it('should clear all rendered zones', async () => {
      const zone = {
        id: 'zone-1',
        name: 'Zone 1',
        polygon: {
          type: 'Polygon',
          coordinates: [[
            [39.2, -6.8],
            [39.3, -6.8],
            [39.3, -6.7],
            [39.2, -6.7],
            [39.2, -6.8]
          ]]
        }
      };
      
      await zonesModule.renderZones([zone]);
      
      mockMap.getLayer = vi.fn(() => ({})); // Simulate layer exists
      mockMap.getSource = vi.fn(() => ({})); // Simulate source exists
      
      zonesModule.clearZones();
      
      expect(mockMap.removeLayer).toHaveBeenCalled();
      expect(mockMap.removeSource).toHaveBeenCalled();
      expect(zonesModule.state.zoneCount).toBe(0);
    });
  });
  
  describe('Module Lifecycle', () => {
    it('should initialize module', async () => {
      await zonesModule.init();
      
      expect(mockDispatchMap.on).toHaveBeenCalledWith('zonesUpdated', expect.any(Function));
    });
    
    it('should destroy module', () => {
      zonesModule.destroy();
      
      expect(zonesModule.state.zoneCount).toBe(0);
    });
  });
});
