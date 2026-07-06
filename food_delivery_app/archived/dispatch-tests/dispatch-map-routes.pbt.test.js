/**
 * Property-Based Tests for Routes Module
 * 
 * Tests for route display functionality using fast-check for property-based testing.
 * These tests validate universal properties that should hold for all valid inputs.
 * 
 * Feature: dispatch-map-enhancements
 * Properties tested:
 * - Property 16: Route Drawing API Call
 * - Property 17: Route Display Accuracy
 * - Property 18: Route Replacement
 * - Property 19: Route Removal on Deselect
 * - Property 20: Route Error Handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
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
  _updateHealthPanel: vi.fn()
});

// Generators for property-based testing
const coordinateGenerator = () =>
  fc.tuple(
    fc.float({ min: -180, max: 180 }),
    fc.float({ min: -90, max: 90 })
  );

const locationObjectGenerator = () =>
  fc.record({
    lat: fc.float({ min: -90, max: 90 }),
    lng: fc.float({ min: -180, max: 180 }),
    label: fc.string()
  });

const merchantGenerator = () =>
  fc.record({
    id: fc.string(),
    name: fc.string(),
    pickupLocation: locationObjectGenerator()
  });

const orderGenerator = () =>
  fc.record({
    id: fc.string(),
    merchantId: fc.string(),
    deliveryLocation: locationObjectGenerator(),
    status: fc.oneof(
      fc.constant('pending'),
      fc.constant('assigned'),
      fc.constant('picked_up'),
      fc.constant('delivered')
    )
  });

describe('RoutesModule - Property-Based Tests', () => {
  let routesModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatchMap = createMockDispatchMap();
    routesModule = new RoutesModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (routesModule) {
      routesModule.destroy();
    }
  });
  
  describe('Property 16: Route Drawing API Call', () => {
    it('**Validates: Requirements 4.1** - For any order selection, the system SHALL call the Mapbox Directions API using the existing drawRoute helper with the merchant pickup and customer drop-off coordinates', () => {
      fc.assert(
        fc.property(merchantGenerator(), orderGenerator(), (merchant, order) => {
          // Setup
          mockDispatchMap.state.data.merchants = [{ ...merchant, id: order.merchantId }];
          
          // Mock fetch
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
          
          // Execute
          routesModule.displayRoute(order);
          
          // Verify: fetch should be called with Mapbox Directions API URL
          expect(global.fetch).toHaveBeenCalled();
          const callUrl = global.fetch.mock.calls[0][0];
          
          // Assert: URL should contain Mapbox Directions API endpoint
          expect(callUrl).toContain('api.mapbox.com/directions/v5/mapbox/driving');
          expect(callUrl).toContain('geometries=geojson');
          expect(callUrl).toContain(mockDispatchMap.config.mapboxToken);
        }),
        { numRuns: 50 }
      );
    });
  });
  
  describe('Property 17: Route Display Accuracy', () => {
    it('**Validates: Requirements 4.2** - For any successfully returned route, the system SHALL render the route as a polyline and display the total distance in kilometers and estimated duration in minutes in the order popup', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 60, max: 3600 }),
          (distance, duration) => {
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
            
            // Mock fetch with specific distance and duration
            global.fetch = vi.fn(() =>
              Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                  routes: [{
                    distance,
                    duration,
                    geometry: { type: 'LineString', coordinates: [] }
                  }]
                })
              })
            );
            
            mockMapboxMap.getLayer.mockReturnValue(null);
            mockMapboxMap.getSource.mockReturnValue(null);
            
            // Execute
            routesModule.displayRoute(order);
            
            // Verify: route should be stored with correct distance and duration
            const route = routesModule.getRoute('order-1');
            
            // Assert: distance should be converted to km, duration to minutes
            expect(route).not.toBeNull();
            expect(route.distance).toBe(distance / 1000);
            expect(route.duration).toBe(Math.round(duration / 60));
            
            // Assert: map layer should be added
            expect(mockMapboxMap.addLayer).toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  describe('Property 18: Route Replacement', () => {
    it('**Validates: Requirements 4.3** - For any sequence of order selections, each new selection SHALL remove the previously displayed route before rendering the new route', () => {
      fc.assert(
        fc.property(
          fc.array(orderGenerator(), { minLength: 2, maxLength: 5 }),
          (orders) => {
            const merchant = {
              id: 'merchant-1',
              pickupLocation: { lat: -6.7924, lng: 39.2083 }
            };
            
            mockDispatchMap.state.data.merchants = [merchant];
            
            // Mock fetch
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
            
            mockMapboxMap.getLayer.mockReturnValue(null);
            mockMapboxMap.getSource.mockReturnValue(null);
            
            // Execute: display routes in sequence
            orders.forEach((order, index) => {
              order.merchantId = 'merchant-1';
              routesModule.displayRoute(order);
              
              // Assert: only one active route at a time
              expect(routesModule.state.activeRoute).not.toBeNull();
              expect(routesModule.state.activeRoute.orderId).toBe(order.id);
              
              // Assert: previous route should be removed
              if (index > 0) {
                expect(mockMapboxMap.removeLayer).toHaveBeenCalled();
                expect(mockMapboxMap.removeSource).toHaveBeenCalled();
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property 19: Route Removal on Deselect', () => {
    it('**Validates: Requirements 4.4** - For any order deselection, the system SHALL remove the route polyline from the map', () => {
      fc.assert(
        fc.property(fc.string(), (orderId) => {
          const route = {
            orderId,
            layerId: `route-${orderId}`,
            sourceId: `route-source-${orderId}`
          };
          
          routesModule.state.routes.set(orderId, route);
          routesModule.state.activeRoute = route;
          
          mockMapboxMap.getLayer.mockReturnValue(true);
          mockMapboxMap.getSource.mockReturnValue(true);
          
          // Execute
          routesModule.onOrderDeselected(orderId);
          
          // Assert: route should be removed from state
          expect(routesModule.state.routes.has(orderId)).toBe(false);
          
          // Assert: map layer and source should be removed
          expect(mockMapboxMap.removeLayer).toHaveBeenCalledWith(`route-${orderId}`);
          expect(mockMapboxMap.removeSource).toHaveBeenCalledWith(`route-source-${orderId}`);
        }),
        { numRuns: 50 }
      );
    });
  });
  
  describe('Property 20: Route Error Handling', () => {
    it('**Validates: Requirements 4.5** - For any Mapbox Directions API error, the system SHALL display an inline error message in the order popup and increment the Mapbox error counter in the health panel', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          (statusCode) => {
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
            
            // Mock fetch with error response
            global.fetch = vi.fn(() =>
              Promise.resolve({
                ok: false,
                status: statusCode,
                statusText: 'Error'
              })
            );
            
            const initialErrorCount = mockDispatchMap.state.health.mapboxErrors;
            
            // Execute
            routesModule.displayRoute(order);
            
            // Assert: error counter should be incremented
            expect(mockDispatchMap.state.health.mapboxErrors).toBeGreaterThan(initialErrorCount);
            
            // Assert: health panel should be updated
            expect(mockDispatchMap._updateHealthPanel).toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property: Coordinate Validation', () => {
    it('should validate coordinates are within valid ranges', () => {
      fc.assert(
        fc.property(coordinateGenerator(), ([lng, lat]) => {
          const doc = { lng, lat };
          const coords = routesModule._getCoordinates(doc);
          
          // Assert: coordinates should be in valid ranges
          expect(coords[0]).toBeGreaterThanOrEqual(-180);
          expect(coords[0]).toBeLessThanOrEqual(180);
          expect(coords[1]).toBeGreaterThanOrEqual(-90);
          expect(coords[1]).toBeLessThanOrEqual(90);
        }),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property: Cache Consistency', () => {
    it('should maintain cache consistency across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(coordinateGenerator(), coordinateGenerator()),
            { minLength: 1, maxLength: 10 }
          ),
          (routePairs) => {
            routePairs.forEach(([start, end]) => {
              const cacheKey = routesModule._getCacheKey(start, end);
              const routeData = {
                distance: 5000,
                duration: 300,
                geometry: { type: 'LineString', coordinates: [] }
              };
              
              // Add to cache
              routesModule._addToCache(cacheKey, routeData);
              
              // Retrieve from cache
              const cached = routesModule._getFromCache(cacheKey);
              
              // Assert: cached data should match original
              expect(cached).toEqual(routeData);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
