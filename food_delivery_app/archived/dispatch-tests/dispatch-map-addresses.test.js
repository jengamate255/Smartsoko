/**
 * Unit Tests for Structured Address Module
 * 
 * Tests for structured address storage functionality including:
 * - Coordinate validation
 * - LocationObject creation
 * - Merchant location storage
 * - Delivery location storage
 * - Geocoding fallback
 * - Geocode pending resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StructuredAddressModule } from './dispatch-map-addresses.js';

// Mock Mapbox GL JS
const mockMapboxMap = {
  getLayer: vi.fn(() => null),
  getSource: vi.fn(() => null),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

// Mock DispatchMap
const createMockDispatchMap = () => ({
  map: mockMapboxMap,
  config: {
    mapboxToken: 'pk.test_token',
    flyToZoom: 15,
    searchDebounceMs: 300,
    searchTimeoutMs: 500
  },
  state: {
    data: {
      orders: [],
      drivers: [],
      merchants: [],
      deliveryZones: []
    },
    health: {
      geocodeFailures: 0,
      mapboxErrors: 0
    }
  },
  _updateHealthPanel: vi.fn(),
  db: null // Will be set in tests
});

describe('StructuredAddressModule', () => {
  let structuredAddressModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create new instance
    mockDispatchMap = createMockDispatchMap();
    structuredAddressModule = new StructuredAddressModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (structuredAddressModule) {
      structuredAddressModule.destroy();
    }
  });
  
  describe('initialization', () => {
    it('should initialize with correct state', () => {
      expect(structuredAddressModule.state.geocodePendingOrders).toEqual([]);
      expect(structuredAddressModule.state.geocodeFailures).toBe(0);
    });
    
    it('should have access to dispatchMap', () => {
      expect(structuredAddressModule.dispatchMap).toBe(mockDispatchMap);
    });
    
    it('should have access to map', () => {
      expect(structuredAddressModule.map).toBe(mockMapboxMap);
    });
    
    it('should have access to config', () => {
      expect(structuredAddressModule.config).toBe(mockDispatchMap.config);
    });
  });
  
  describe('coordinate validation', () => {
    it('should validate valid coordinates', () => {
      expect(structuredAddressModule.validateCoordinates(-6.7924, 39.2083)).toBe(true);
      expect(structuredAddressModule.validateCoordinates(0, 0)).toBe(true);
      expect(structuredAddressModule.validateCoordinates(90, 180)).toBe(true);
      expect(structuredAddressModule.validateCoordinates(-90, -180)).toBe(true);
    });
    
    it('should reject invalid latitude', () => {
      expect(structuredAddressModule.validateCoordinates(91, 0)).toBe(false);
      expect(structuredAddressModule.validateCoordinates(-91, 0)).toBe(false);
      expect(structuredAddressModule.validateCoordinates('90', 0)).toBe(false);
      expect(structuredAddressModule.validateCoordinates(null, 0)).toBe(false);
    });
    
    it('should reject invalid longitude', () => {
      expect(structuredAddressModule.validateCoordinates(0, 181)).toBe(false);
      expect(structuredAddressModule.validateCoordinates(0, -181)).toBe(false);
      expect(structuredAddressModule.validateCoordinates(0, '180')).toBe(false);
      expect(structuredAddressModule.validateCoordinates(0, null)).toBe(false);
    });
    
    it('should reject non-numeric values', () => {
      expect(structuredAddressModule.validateCoordinates('abc', 'def')).toBe(false);
      expect(structuredAddressModule.validateCoordinates({}, {})).toBe(false);
      expect(structuredAddressModule.validateCoordinates([], [])).toBe(false);
    });
  });
  
  describe('location object validation', () => {
    it('should validate complete location object', () => {
      const location = {
        lat: -6.7924,
        lng: 39.2083,
        label: 'Dar es Salaam'
      };
      
      expect(structuredAddressModule.validateLocationObject(location)).toBe(true);
    });
    
    it('should reject missing lat', () => {
      const location = {
        lng: 39.2083,
        label: 'Dar es Salaam'
      };
      
      expect(structuredAddressModule.validateLocationObject(location)).toBe(false);
    });
    
    it('should reject missing lng', () => {
      const location = {
        lat: -6.7924,
        label: 'Dar es Salaam'
      };
      
      expect(structuredAddressModule.validateLocationObject(location)).toBe(false);
    });
    
    it('should reject missing label', () => {
      const location = {
        lat: -6.7924,
        lng: 39.2083
      };
      
      expect(structuredAddressModule.validateLocationObject(location)).toBe(false);
    });
    
    it('should reject empty label', () => {
      const location = {
        lat: -6.7924,
        lng: 39.2083,
        label: ''
      };
      
      expect(structuredAddressModule.validateLocationObject(location)).toBe(false);
    });
    
    it('should reject null location', () => {
      expect(structuredAddressModule.validateLocationObject(null)).toBe(false);
    });
    
    it('should reject non-object location', () => {
      expect(structuredAddressModule.validateLocationObject('string')).toBe(false);
      expect(structuredAddressModule.validateLocationObject(123)).toBe(false);
      expect(structuredAddressModule.validateLocationObject([])).toBe(false);
    });
  });
  
  describe('location object creation', () => {
    it('should create valid location object', () => {
      const location = structuredAddressModule.createLocationObject(
        -6.7924,
        39.2083,
        'Dar es Salaam'
      );
      
      expect(location).toEqual({
        lat: -6.7924,
        lng: 39.2083,
        label: 'Dar es Salaam'
      });
    });
    
    it('should trim whitespace from label', () => {
      const location = structuredAddressModule.createLocationObject(
        -6.7924,
        39.2083,
        '  Dar es Salaam  '
      );
      
      expect(location.label).toBe('Dar es Salaam');
    });
    
    it('should use coordinates as label if no label provided', () => {
      const location = structuredAddressModule.createLocationObject(
        -6.7924,
        39.2083,
        null
      );
      
      expect(location.label).toBe('-6.7924, 39.2083');
    });
    
    it('should return null for invalid coordinates', () => {
      expect(structuredAddressModule.createLocationObject(91, 0, 'Test')).toBeNull();
      expect(structuredAddressModule.createLocationObject(0, 181, 'Test')).toBeNull();
    });
  });
  
  describe('geocode pending resolution', () => {
    it('should resolve geocode pending orders', async () => {
      // Setup: orders with geocodePending flag
      mockDispatchMap.state.data.orders = [
        {
          id: 'order-1',
          deliveryAddress: '123 Main St',
          geocodePending: true
        },
        {
          id: 'order-2',
          deliveryAddress: '456 Oak Ave',
          geocodePending: true
        }
      ];
      
      // Mock fetch for geocoding
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            features: [{
              center: [39.2083, -6.7924],
              place_name: '123 Main St, Dar es Salaam'
            }]
          })
        })
      );
      
      // Mock Firestore
      mockDispatchMap.db = {
        collection: vi.fn(),
        doc: vi.fn()
      };
      
      const { doc, updateDoc } = require('firebase/firestore');
      vi.spyOn(require('firebase/firestore'), 'doc').mockImplementation(() => ({ path: 'test' }));
      vi.spyOn(require('firebase/firestore'), 'updateDoc').mockImplementation(() => Promise.resolve());
      
      // Execute
      await structuredAddressModule._resolveGeocodePending();
      
      // Assert: geocode pending orders should be tracked
      expect(structuredAddressModule.state.geocodePendingOrders).toHaveLength(2);
    });
    
    it('should handle geocoding failure', async () => {
      // Setup: order with geocodePending flag
      mockDispatchMap.state.data.orders = [
        {
          id: 'order-1',
          deliveryAddress: 'Invalid Address xyz123',
          geocodePending: true
        }
      ];
      
      // Mock fetch to return no results
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            features: []
          })
        })
      );
      
      // Mock Firestore
      mockDispatchMap.db = {};
      
      // Execute
      await structuredAddressModule._resolveGeocodePending();
      
      // Assert: geocode failure counter should be incremented
      expect(structuredAddressModule.state.geocodeFailures).toBe(1);
      expect(mockDispatchMap.state.health.geocodeFailures).toBe(1);
    });
  });
  
  describe('orders updated event handler', () => {
    it('should detect new geocode pending orders', () => {
      const orders = [
        {
          id: 'order-1',
          deliveryAddress: '123 Main St',
          geocodePending: true
        }
      ];
      
      structuredAddressModule.ordersUpdated(orders);
      
      expect(structuredAddressModule.state.geocodePendingOrders).toEqual(orders);
    });
    
    it('should not trigger on orders without geocodePending', () => {
      const orders = [
        {
          id: 'order-1',
          deliveryAddress: '123 Main St',
          geocodePending: false
        }
      ];
      
      structuredAddressModule.ordersUpdated(orders);
      
      expect(structuredAddressModule.state.geocodePendingOrders).toEqual([]);
    });
  });
  
  describe('get geocode pending orders', () => {
    it('should return geocode pending orders', () => {
      const orders = [
        {
          id: 'order-1',
          deliveryAddress: '123 Main St',
          geocodePending: true
        }
      ];
      
      structuredAddressModule.state.geocodePendingOrders = orders;
      
      expect(structuredAddressModule.getGeocodePendingOrders()).toEqual(orders);
    });
    
    it('should return empty array if no pending orders', () => {
      expect(structuredAddressModule.getGeocodePendingOrders()).toEqual([]);
    });
  });
  
  describe('get geocode failures', () => {
    it('should return geocode failure count', () => {
      structuredAddressModule.state.geocodeFailures = 5;
      
      expect(structuredAddressModule.getGeocodeFailures()).toBe(5);
    });
    
    it('should return 0 if no failures', () => {
      expect(structuredAddressModule.getGeocodeFailures()).toBe(0);
    });
  });
  
  describe('cleanup', () => {
    it('should destroy module and reset state', () => {
      structuredAddressModule.state.geocodePendingOrders = [{ id: 'order-1' }];
      structuredAddressModule.state.geocodeFailures = 5;
      
      structuredAddressModule.destroy();
      
      expect(structuredAddressModule.state.geocodePendingOrders).toEqual([]);
      expect(structuredAddressModule.state.geocodeFailures).toBe(0);
    });
  });
});
