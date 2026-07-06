/**
 * Pin Accuracy Module Property-Based Tests
 * 
 * Property-based tests for pin accuracy classification and rendering using fast-check
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import fc from 'fast-check';
import { PinAccuracyModule } from './dispatch-map-accuracy.js';

describe('PinAccuracyModule - Property-Based Tests', () => {
  let pinAccuracyModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    // Create mock DispatchMap
    mockDispatchMap = {
      map: {
        getContainer: () => document.createElement('div'),
        on: vi.fn(),
        off: vi.fn()
      },
      config: {},
      state: {
        data: {
          orders: []
        },
        health: {
          mapboxErrors: 0
        },
        modules: {}
      },
      on: vi.fn()
    };
    
    pinAccuracyModule = new PinAccuracyModule(mockDispatchMap);
  });
  
  // Property 47: Pin Accuracy Classification
  // **Validates: Requirements 9.1**
  it('Property 47: Pin accuracy classification is consistent with coordinate source', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // GPS source
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              source: fc.constant('gps')
            })
          }),
          // GPS flag
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 })
            }),
            hasGPS: fc.constant(true)
          }),
          // Geocoded source
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              source: fc.constant('geocoded')
            })
          }),
          // Geocoded flag
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              geocoded: fc.constant(true)
            })
          }),
          // Geocode pending false
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 })
            }),
            geocodePending: fc.constant(false)
          }),
          // Legacy lat/lng
          fc.record({
            id: fc.string(),
            deliveryLat: fc.float({ min: -90, max: 90 }),
            deliveryLng: fc.float({ min: -180, max: 180 })
          }),
          // Missing coordinates
          fc.record({
            id: fc.string(),
            customerName: fc.string()
          })
        ),
        (order) => {
          // Classify accuracy
          const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
          
          // Verify classification is one of the three valid types
          expect(['gps', 'geocoded', 'missing']).toContain(accuracy);
          
          // Verify GPS orders are classified as GPS
          if (order.deliveryLocation?.source === 'gps' || order.hasGPS) {
            expect(accuracy).toBe('gps');
          }
          
          // Verify geocoded orders are classified as geocoded
          if (order.deliveryLocation?.geocoded || 
              order.deliveryLocation?.source === 'geocoded' ||
              order.geocodePending === false ||
              (order.deliveryLat && order.deliveryLng)) {
            expect(accuracy).toBe('geocoded');
          }
          
          // Verify orders without coordinates are classified as missing
          if (!order.deliveryLocation && !order.deliveryLat && !order.deliveryLng) {
            expect(accuracy).toBe('missing');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 48: GPS Pin Rendering
  // **Validates: Requirements 9.2**
  it('Property 48: GPS pins are rendered with solid green border', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          deliveryLocation: fc.record({
            lat: fc.float({ min: -90, max: 90 }),
            lng: fc.float({ min: -180, max: 180 }),
            source: fc.constant('gps')
          })
        }),
        (order) => {
          // Render GPS pin
          const pin = pinAccuracyModule.renderPin(order);
          
          // Verify pin is rendered
          expect(pin).not.toBeNull();
          expect(pin.type).toBe('gps');
          
          // Verify green color
          expect(pin.color).toBe('#22c55e');
          expect(pin.borderColor).toBe('#22c55e');
          
          // Verify no approximation label
          expect(pin.label).toBe('');
          expect(pin.hasApproximation).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 49: Geocoded Pin Rendering
  // **Validates: Requirements 9.2**
  it('Property 49: Geocoded pins are rendered with amber border and (approx.) label', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          deliveryLocation: fc.record({
            lat: fc.float({ min: -90, max: 90 }),
            lng: fc.float({ min: -180, max: 180 }),
            geocoded: fc.constant(true)
          })
        }),
        (order) => {
          // Render geocoded pin
          const pin = pinAccuracyModule.renderPin(order);
          
          // Verify pin is rendered
          expect(pin).not.toBeNull();
          expect(pin.type).toBe('geocoded');
          
          // Verify amber color
          expect(pin.color).toBe('#f59e0b');
          expect(pin.borderColor).toBe('#f59e0b');
          
          // Verify approximation label
          expect(pin.label).toBe(' (approx.)');
          expect(pin.hasApproximation).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 50: Missing Pin Rendering
  // **Validates: Requirements 9.2**
  it('Property 50: Missing pins are rendered with red border and Location unavailable label', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          customerName: fc.string()
        }),
        (order) => {
          // Render missing pin
          const pin = pinAccuracyModule.renderPin(order);
          
          // Verify pin is rendered
          expect(pin).not.toBeNull();
          expect(pin.type).toBe('missing');
          
          // Verify red color
          expect(pin.color).toBe('#ef4444');
          expect(pin.borderColor).toBe('#ef4444');
          
          // Verify unavailable label
          expect(pin.label).toBe(' (Location unavailable)');
          expect(pin.isUnavailable).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 51: Hide Approximate Filter
  // **Validates: Requirements 9.3**
  it('Property 51: Hide approximate filter removes geocoded and missing pins', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              id: fc.string(),
              deliveryLocation: fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 }),
                source: fc.constant('gps')
              })
            }),
            fc.record({
              id: fc.string(),
              deliveryLocation: fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 }),
                geocoded: fc.constant(true)
              })
            }),
            fc.record({
              id: fc.string(),
              customerName: fc.string()
            })
          )
        ),
        (orders) => {
          // Enable hide approximate
          pinAccuracyModule.setHideApproximate(true);
          
          // Classify all orders
          pinAccuracyModule.updatePinAccuracies(orders);
          
          // Check each order
          orders.forEach(order => {
            const accuracy = pinAccuracyModule.getPinAccuracy(order.id);
            const pin = pinAccuracyModule.renderPin(order);
            
            // GPS pins should always be visible
            if (accuracy === 'gps') {
              expect(pin).not.toBeNull();
            }
            
            // Geocoded and missing pins should be hidden
            if (accuracy === 'geocoded' || accuracy === 'missing') {
              expect(pin).toBeNull();
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Property 52: Hidden Pin Count Display
  // **Validates: Requirements 9.4**
  it('Property 52: Hidden pin count is accurate when hide approximate is enabled', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.option(
              fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 }),
                source: fc.oneof(
                  fc.constant('gps'),
                  fc.constant('geocoded')
                )
              })
            ),
            customerName: fc.string()
          })
        ),
        (orders) => {
          // Enable hide approximate
          pinAccuracyModule.setHideApproximate(true);
          
          // Classify all orders
          pinAccuracyModule.updatePinAccuracies(orders);
          
          // Count expected hidden pins
          let expectedHidden = 0;
          orders.forEach(order => {
            const accuracy = pinAccuracyModule.getPinAccuracy(order.id);
            if (accuracy === 'geocoded' || accuracy === 'missing') {
              expectedHidden++;
            }
          });
          
          // Verify hidden count matches
          expect(pinAccuracyModule.getHiddenPinCount()).toBe(expectedHidden);
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Property 53: Three-Tier Label Extension
  // **Validates: Requirements 9.5**
  it('Property 53: Three-tier label extension uses gps/geocoded/missing classification', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              source: fc.constant('gps')
            })
          }),
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              geocoded: fc.constant(true)
            })
          }),
          fc.record({
            id: fc.string(),
            customerName: fc.string()
          })
        ),
        (order) => {
          // Get extended label
          const extendedLabel = pinAccuracyModule.getExtendedLabel(order);
          
          // Verify label contains accuracy type
          const accuracy = pinAccuracyModule.getPinAccuracy(order.id);
          expect(extendedLabel).toContain(`[${accuracy.toUpperCase()}]`);
          
          // Verify appropriate suffix
          if (accuracy === 'gps') {
            expect(extendedLabel).not.toContain('(approx.)');
            expect(extendedLabel).not.toContain('(Location unavailable)');
          }
          if (accuracy === 'geocoded') {
            expect(extendedLabel).toContain('(approx.)');
          }
          if (accuracy === 'missing') {
            expect(extendedLabel).toContain('(Location unavailable)');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Additional property: Accuracy classification is deterministic
  it('Property: Accuracy classification is deterministic', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          deliveryLocation: fc.option(
            fc.record({
              lat: fc.float({ min: -90, max: 90 }),
              lng: fc.float({ min: -180, max: 180 }),
              source: fc.option(fc.oneof(fc.constant('gps'), fc.constant('geocoded'))),
              geocoded: fc.option(fc.constant(true))
            })
          ),
          hasGPS: fc.option(fc.constant(true)),
          geocodePending: fc.option(fc.constant(false)),
          deliveryLat: fc.option(fc.float({ min: -90, max: 90 })),
          deliveryLng: fc.option(fc.float({ min: -180, max: 180 }))
        }),
        (order) => {
          // Classify twice
          const accuracy1 = pinAccuracyModule.classifyPinAccuracy(order);
          const accuracy2 = pinAccuracyModule.classifyPinAccuracy(order);
          
          // Should be identical
          expect(accuracy1).toBe(accuracy2);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Additional property: Hide filter is idempotent
  it('Property: Hide filter is idempotent', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.option(
              fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 }),
                source: fc.option(fc.oneof(fc.constant('gps'), fc.constant('geocoded')))
              })
            ),
            customerName: fc.string()
          })
        ),
        (orders) => {
          // Enable hide approximate
          pinAccuracyModule.setHideApproximate(true);
          
          // Classify and check
          pinAccuracyModule.updatePinAccuracies(orders);
          const count1 = pinAccuracyModule.getHiddenPinCount();
          
          // Enable again (should be same)
          pinAccuracyModule.setHideApproximate(true);
          const count2 = pinAccuracyModule.getHiddenPinCount();
          
          // Should be identical
          expect(count1).toBe(count2);
        }
      ),
      { numRuns: 50 }
    );
  });
  
  // Additional property: Accuracy stats are consistent
  it('Property: Accuracy stats are consistent with actual classifications', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            deliveryLocation: fc.option(
              fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 }),
                source: fc.option(fc.oneof(fc.constant('gps'), fc.constant('geocoded')))
              })
            ),
            customerName: fc.string()
          })
        ),
        (orders) => {
          // Classify all orders
          pinAccuracyModule.updatePinAccuracies(orders);
          
          // Get stats
          const stats = pinAccuracyModule.getAccuracyStats();
          
          // Count actual classifications
          let gpsCount = 0;
          let geocodedCount = 0;
          let missingCount = 0;
          
          orders.forEach(order => {
            const accuracy = pinAccuracyModule.getPinAccuracy(order.id);
            if (accuracy === 'gps') gpsCount++;
            if (accuracy === 'geocoded') geocodedCount++;
            if (accuracy === 'missing') missingCount++;
          });
          
          // Verify stats match
          expect(stats.gps).toBe(gpsCount);
          expect(stats.geocoded).toBe(geocodedCount);
          expect(stats.missing).toBe(missingCount);
          expect(stats.total).toBe(orders.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
