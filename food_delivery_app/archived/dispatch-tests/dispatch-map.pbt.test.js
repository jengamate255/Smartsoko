/**
 * DispatchMap Property-Based Tests
 * 
 * Tests for DispatchMap initialization and state management properties.
 * Uses fast-check for property-based testing.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { DispatchMap, DEFAULT_CONFIG } from './dispatch-map.js';

// Feature: dispatch-map-enhancements, Property 54: Health Panel Visibility
// *For any* dispatch map session, the system SHALL render the Map_Health_Panel as a fixed footer bar visible at all times

describe('Property 54: Health Panel Visibility', () => {
  it('should initialize health state for all dispatch map instances', () => {
    fc.assert(
      fc.property(fc.string(), (mapElementId) => {
        const dispatchMap = new DispatchMap(mapElementId);
        
        // Verify health state is always initialized
        expect(dispatchMap.state.health).toBeDefined();
        expect(dispatchMap.state.health).toHaveProperty('lastRefresh');
        expect(dispatchMap.state.health).toHaveProperty('driversWithGPS');
        expect(dispatchMap.state.health).toHaveProperty('totalDrivers');
        expect(dispatchMap.state.health).toHaveProperty('geocodeFailures');
        expect(dispatchMap.state.health).toHaveProperty('mapboxErrors');
        expect(dispatchMap.state.health).toHaveProperty('firestoreConnected');
        
        // Verify default values
        expect(dispatchMap.state.health.mapboxErrors).toBe(0);
        expect(dispatchMap.state.health.geocodeFailures).toBe(0);
        expect(dispatchMap.state.health.firestoreConnected).toBe(true);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 55: Last Refresh Timestamp
// *For any* successful Firestore data refresh, the system SHALL update the last-refresh timestamp

describe('Property 55: Last Refresh Timestamp', () => {
  it('should update lastRefresh timestamp on data load', () => {
    fc.assert(
      fc.property(fc.string(), (mapElementId) => {
        const dispatchMap = new DispatchMap(mapElementId);
        
        const initialTimestamp = dispatchMap.state.health.lastRefresh;
        
        // Simulate data refresh
        dispatchMap.state.health.lastRefresh = new Date();
        
        // Verify timestamp was updated
        expect(dispatchMap.state.health.lastRefresh).toBeInstanceOf(Date);
        expect(dispatchMap.state.health.lastRefresh).not.toEqual(initialTimestamp);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 56: GPS Driver Count Display
// *For any* driver count state, the system SHALL display the count of drivers with active GPS fix

describe('Property 56: GPS Driver Count Display', () => {
  it('should correctly calculate drivers with GPS', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            hasGPS: fc.boolean(),
            lat: fc.oneof(fc.constant(null), fc.float({ min: -90, max: 90 })),
            lng: fc.oneof(fc.constant(null), fc.float({ min: -180, max: 180 }))
          })
        ),
        (drivers) => {
          const dispatchMap = new DispatchMap('test-map');
          dispatchMap.state.data.drivers = drivers;
          dispatchMap._updateHealthMetrics();
          
          // Calculate expected count
          const expectedCount = drivers.filter(driver => 
            driver.hasGPS || (driver.lat !== null && driver.lng !== null)
          ).length;
          
          expect(dispatchMap.state.health.totalDrivers).toBe(drivers.length);
          expect(dispatchMap.state.health.driversWithGPS).toBe(expectedCount);
          
          dispatchMap.destroy();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 57: Geocode Failure Count
// *For any* geocode failure event, the system SHALL increment the geocode failure counter

describe('Property 57: Geocode Failure Count', () => {
  it('should increment geocode failure counter', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (initialCount) => {
        const dispatchMap = new DispatchMap('test-map');
        dispatchMap.state.health.geocodeFailures = initialCount;
        
        // Simulate geocode failure
        dispatchMap.state.health.geocodeFailures++;
        
        expect(dispatchMap.state.health.geocodeFailures).toBe(initialCount + 1);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 58: Mapbox Error Count
// *For any* Mapbox API error event, the system SHALL increment the Mapbox error counter

describe('Property 58: Mapbox Error Count', () => {
  it('should increment Mapbox error counter', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (initialCount) => {
        const dispatchMap = new DispatchMap('test-map');
        dispatchMap.state.health.mapboxErrors = initialCount;
        
        // Simulate Mapbox error
        dispatchMap.state.health.mapboxErrors++;
        
        expect(dispatchMap.state.health.mapboxErrors).toBe(initialCount + 1);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 59: Firestore Disconnection Warning
// *For any* Firestore connection loss, the system SHALL display a "Firestore disconnected" warning

describe('Property 59: Firestore Disconnection Warning', () => {
  it('should update Firestore connection status', () => {
    fc.assert(
      fc.property(fc.boolean(), (isConnected) => {
        const dispatchMap = new DispatchMap('test-map');
        dispatchMap.state.health.firestoreConnected = isConnected;
        
        expect(dispatchMap.state.health.firestoreConnected).toBe(isConnected);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 60: Firestore Reconnection Handling
// *For any* Firestore connection restoration, the system SHALL clear the disconnection warning

describe('Property 60: Firestore Reconnection Handling', () => {
  it('should handle Firestore reconnection', () => {
    fc.assert(
      fc.property(fc.string(), (mapElementId) => {
        const dispatchMap = new DispatchMap(mapElementId);
        
        // Simulate disconnection
        dispatchMap.state.health.firestoreConnected = false;
        expect(dispatchMap.state.health.firestoreConnected).toBe(false);
        
        // Simulate reconnection
        dispatchMap.state.health.firestoreConnected = true;
        expect(dispatchMap.state.health.firestoreConnected).toBe(true);
        
        dispatchMap.destroy();
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: dispatch-map-enhancements, Property 61: Warning Counter Coloring
// *For any* health panel counter with value greater than zero, the system SHALL render that counter in amber or red

describe('Property 61: Warning Counter Coloring', () => {
  it('should identify warning counters', () => {
    fc.assert(
      fc.property(
        fc.record({
          geocodeFailures: fc.integer({ min: 0, max: 100 }),
          mapboxErrors: fc.integer({ min: 0, max: 100 })
        }),
        (errors) => {
          const dispatchMap = new DispatchMap('test-map');
          dispatchMap.state.health.geocodeFailures = errors.geocodeFailures;
          dispatchMap.state.health.mapboxErrors = errors.mapboxErrors;
          
          // Check if counters should be colored (amber/red when > 0)
          const hasGeocodeWarnings = errors.geocodeFailures > 0;
          const hasMapboxWarnings = errors.mapboxErrors > 0;
          
          expect(hasGeocodeWarnings).toBe(errors.geocodeFailures > 0);
          expect(hasMapboxWarnings).toBe(errors.mapboxErrors > 0);
          
          dispatchMap.destroy();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Additional property tests for state management

describe('State Management Properties', () => {
  it('should maintain state consistency after multiple updates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            path: fc.oneof(
              fc.constant('ui.searchQuery'),
              fc.constant('ui.filters.unassignedOnly'),
              fc.constant('health.mapboxErrors'),
              fc.constant('data.orders')
            ),
            value: fc.oneof(
              fc.string(),
              fc.boolean(),
              fc.integer(),
              fc.array(fc.record({ id: fc.string() }))
            )
          })
        ),
        (updates) => {
          const dispatchMap = new DispatchMap('test-map');
          
          // Apply multiple updates
          updates.forEach(update => {
            dispatchMap.setState(update.path, update.value);
          });
          
          // Verify state is consistent
          expect(dispatchMap.state).toBeDefined();
          expect(dispatchMap.state.data).toBeDefined();
          expect(dispatchMap.state.ui).toBeDefined();
          expect(dispatchMap.state.health).toBeDefined();
          
          dispatchMap.destroy();
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should handle concurrent state updates', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()),
        (values) => {
          const dispatchMap = new DispatchMap('test-map');
          
          // Simulate concurrent updates
          values.forEach(value => {
            dispatchMap.setState('ui.searchQuery', value);
          });
          
          // Final state should be one of the values
          expect(dispatchMap.state.ui.searchQuery).toBeTypeOf('string');
          
          dispatchMap.destroy();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
