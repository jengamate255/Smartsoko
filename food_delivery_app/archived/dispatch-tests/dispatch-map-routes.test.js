/**
 * Unit Tests for Routes Module
 * 
 * Tests for route display functionality including:
 * - Route fetching and caching
 * - Route rendering on map
 * - Route removal and cleanup
 * - Error handling
 * - Coordinate extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoutesModule } from './dispatch-map-routes.js';

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
const mockDispatchMap = {
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
  _updateHealthPanel: vi.fn()
};

describe('RoutesModule', () => {
  let routesModule;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create new instance
    routesModule = new RoutesModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (routesModule) {
      routesModule.destroy();
    }
  });
  
  describe('initialization', () => {
    it('should initialize with correct state', () => {
      expect(routesModule.state.activeRoute).toBeNull();
      expect(routesModule.state.selectedOrderId).toBeNull();
      expect(routesModule.state.routes.size).toBe(0);
    });
    
    it('should initialize with empty route cache', () => {
      expect(routesModule.routeCache.size).toBe(0);
    });
    
    it('should have correct route styling', () => {
      expect(routesModule.routeStyle.color).toBe('#012d1d');
      expect(routesModule.routeStyle.width).toBe(5);
      expect(routesModule.routeStyle.opacity).toBe(0.8);
    });
  });
  
  describe('coordinate extraction', () => {
    it('should extract coordinates from structured location object', () => {
      const doc = {
        pickupLocation: { lat: 10, lng: 20, label: 'Test' }
      };
      
      const coords = routesModule._getCoordinates(doc);
      expect(coords).toEqual([20, 10]);
    });
    
    it('should extract delivery coordinates from order', () => {
      const order = {
        deliveryLocation: { lat: -6.7924, lng: 39.2083, label: 'Dar es Salaam' }
      };
      
      const coords = routesModule._getCoordinates(order);
      expect(coords).toEqual([39.2083, -6.7924]);
    });
    
    it('should fall back to direct coordinates', () => {
      const doc = {
        lat: 10,
        lng: 20
      };
      
      const coords = routesModule._getCoordinates(doc);
      expect(coords).toEqual([20, 10]);
    });
    
    it('should return null for document without coordinates', () => {
      const doc = {};
      
      const coords = routesModule._getCoordinates(doc);
      expect(coords).toBeNull();
    });
  });
  
  describe('cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const start = [39.2083, -6.7924];
      const end = [39.2100, -6.7950];
      
      const key1 = routesModule._getCacheKey(start, end);
      const key2 = routesModule._getCacheKey(start, end);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('39.2083');
      expect(key1).toContain('-6.7924');
      expect(key1).toContain('39.21');
      expect(key1).toContain('-6.795');
    });
    
    it('should generate different keys for different coordinates', () => {
      const start1 = [39.2083, -6.7924];
      const end1 = [39.2100, -6.7950];
      
      const start2 = [39.2000, -6.8000];
      const end2 = [39.2100, -6.7950];
      
      const key1 = routesModule._getCacheKey(start1, end1);
      const key2 = routesModule._getCacheKey(start2, end2);
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('route caching', () => {
    it('should add route to cache', () => {
      const cacheKey = 'test-key';
      const routeData = {
        distance: 5000,
        duration: 300,
        geometry: { type: 'LineString', coordinates: [] }
      };
      
      routesModule._addToCache(cacheKey, routeData);
      
      expect(routesModule.routeCache.has(cacheKey)).toBe(true);
    });
    
    it('should retrieve route from cache', () => {
      const cacheKey = 'test-key';
      const routeData = {
        distance: 5000,
        duration: 300,
        geometry: { type: 'LineString', coordinates: [] }
      };
      
      routesModule._addToCache(cacheKey, routeData);
      const cached = routesModule._getFromCache(cacheKey);
      
      expect(cached).toEqual(routeData);
    });
    
    it('should return null for expired cache entry', () => {
      const cacheKey = 'test-key';
      const routeData = {
        distance: 5000,
        duration: 300,
        geometry: { type: 'LineString', coordinates: [] }
      };
      
      routesModule._addToCache(cacheKey, routeData);
      
      // Manually set timestamp to past
      const entry = routesModule.routeCache.get(cacheKey);
      entry.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      
      const cached = routesModule._getFromCache(cacheKey);
      
      expect(cached).toBeNull();
      expect(routesModule.routeCache.has(cacheKey)).toBe(false);
    });
    
    it('should clear cache', () => {
      const cacheKey = 'test-key';
      const routeData = {
        distance: 5000,
        duration: 300,
        geometry: { type: 'LineString', coordinates: [] }
      };
      
      routesModule._addToCache(cacheKey, routeData);
      expect(routesModule.routeCache.size).toBe(1);
      
      routesModule.clearCache();
      
      expect(routesModule.routeCache.size).toBe(0);
    });
  });
  
  describe('merchant lookup', () => {
    it('should find merchant for order', () => {
      const merchant = { id: 'merchant-1', name: 'Test Restaurant' };
      mockDispatchMap.state.data.merchants = [merchant];
      
      const order = { id: 'order-1', merchantId: 'merchant-1' };
      
      const found = routesModule._getMerchantForOrder(order);
      
      expect(found).toEqual(merchant);
    });
    
    it('should return null if merchant not found', () => {
      mockDispatchMap.state.data.merchants = [];
      
      const order = { id: 'order-1', merchantId: 'merchant-1' };
      
      const found = routesModule._getMerchantForOrder(order);
      
      expect(found).toBeNull();
    });
    
    it('should return null if order has no merchantId', () => {
      const merchant = { id: 'merchant-1', name: 'Test Restaurant' };
      mockDispatchMap.state.data.merchants = [merchant];
      
      const order = { id: 'order-1' };
      
      const found = routesModule._getMerchantForOrder(order);
      
      expect(found).toBeNull();
    });
  });
  
  describe('route removal', () => {
    it('should remove route from map', () => {
      const route = {
        orderId: 'order-1',
        layerId: 'route-order-1',
        sourceId: 'route-source-order-1'
      };
      
      routesModule.state.routes.set('order-1', route);
      mockMapboxMap.getLayer.mockReturnValue(true);
      mockMapboxMap.getSource.mockReturnValue(true);
      
      routesModule.removeRoute('order-1');
      
      expect(mockMapboxMap.removeLayer).toHaveBeenCalledWith('route-order-1');
      expect(mockMapboxMap.removeSource).toHaveBeenCalledWith('route-source-order-1');
      expect(routesModule.state.routes.has('order-1')).toBe(false);
    });
    
    it('should handle removal of non-existent route gracefully', () => {
      expect(() => {
        routesModule.removeRoute('non-existent');
      }).not.toThrow();
    });
    
    it('should remove all routes', () => {
      const route1 = {
        orderId: 'order-1',
        layerId: 'route-order-1',
        sourceId: 'route-source-order-1'
      };
      
      const route2 = {
        orderId: 'order-2',
        layerId: 'route-order-2',
        sourceId: 'route-source-order-2'
      };
      
      routesModule.state.routes.set('order-1', route1);
      routesModule.state.routes.set('order-2', route2);
      
      mockMapboxMap.getLayer.mockReturnValue(true);
      mockMapboxMap.getSource.mockReturnValue(true);
      
      routesModule.removeAllRoutes();
      
      expect(routesModule.state.routes.size).toBe(0);
      expect(mockMapboxMap.removeLayer).toHaveBeenCalledTimes(2);
      expect(mockMapboxMap.removeSource).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('route retrieval', () => {
    it('should get route by order ID', () => {
      const route = {
        orderId: 'order-1',
        distance: 5.5,
        duration: 15
      };
      
      routesModule.state.routes.set('order-1', route);
      
      const retrieved = routesModule.getRoute('order-1');
      
      expect(retrieved).toEqual(route);
    });
    
    it('should return null for non-existent route', () => {
      const retrieved = routesModule.getRoute('non-existent');
      
      expect(retrieved).toBeNull();
    });
    
    it('should get all active routes', () => {
      const route1 = { orderId: 'order-1', distance: 5.5 };
      const route2 = { orderId: 'order-2', distance: 3.2 };
      
      routesModule.state.routes.set('order-1', route1);
      routesModule.state.routes.set('order-2', route2);
      
      const allRoutes = routesModule.getAllRoutes();
      
      expect(allRoutes).toHaveLength(2);
      expect(allRoutes).toContainEqual(route1);
      expect(allRoutes).toContainEqual(route2);
    });
  });
  
  describe('event handlers', () => {
    it('should handle order selection', async () => {
      const merchant = {
        id: 'merchant-1',
        pickupLocation: { lat: -6.7924, lng: 39.2083 }
      };
      
      const order = {
        id: 'order-1',
        merchantId: 'merchant-1',
        deliveryLocation: { lat: -6.8000, lng: 39.2100 }
      };
      
      mockDispatchMap.state.data.merchants = [merchant];
      
      // Mock fetch for route
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            routes: [{
              distance: 5000,
              duration: 300,
              geometry: { type: 'LineString', coordinates: [] }
            }]
          })
        })
      );
      
      await routesModule.onOrderSelected(order);
      
      expect(routesModule.state.selectedOrderId).toBe('order-1');
    });
    
    it('should handle order deselection', () => {
      const route = {
        orderId: 'order-1',
        layerId: 'route-order-1',
        sourceId: 'route-source-order-1'
      };
      
      routesModule.state.routes.set('order-1', route);
      mockMapboxMap.getLayer.mockReturnValue(true);
      mockMapboxMap.getSource.mockReturnValue(true);
      
      routesModule.onOrderDeselected('order-1');
      
      expect(routesModule.state.routes.has('order-1')).toBe(false);
    });
  });
  
  describe('cleanup', () => {
    it('should destroy module and clean up resources', () => {
      const route = {
        orderId: 'order-1',
        layerId: 'route-order-1',
        sourceId: 'route-source-order-1'
      };
      
      routesModule.state.routes.set('order-1', route);
      routesModule._addToCache('test-key', { distance: 5000 });
      
      mockMapboxMap.getLayer.mockReturnValue(true);
      mockMapboxMap.getSource.mockReturnValue(true);
      
      routesModule.destroy();
      
      expect(routesModule.state.routes.size).toBe(0);
      expect(routesModule.routeCache.size).toBe(0);
    });
  });
});
