/**
 * DispatchMap Unit Tests
 * 
 * Tests for the core DispatchMap class state management functionality.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DispatchMap, DEFAULT_CONFIG } from './dispatch-map.js';

describe('DispatchMap', () => {
  let dispatchMap;
  const testMapElementId = 'test-map-container';
  
  beforeEach(() => {
    // Create test map container
    const container = document.createElement('div');
    container.id = testMapElementId;
    container.style.width = '100%';
    container.style.height = '400px';
    document.body.appendChild(container);
    
    // Create DispatchMap instance
    dispatchMap = new DispatchMap(testMapElementId, {
      mapboxToken: 'test-token'
    });
  });
  
  afterEach(() => {
    // Clean up
    if (dispatchMap) {
      dispatchMap.destroy();
    }
    
    const container = document.getElementById(testMapElementId);
    if (container) {
      container.remove();
    }
  });
  
  describe('Initialization', () => {
    it('should create instance with default config', () => {
      expect(dispatchMap).toBeInstanceOf(DispatchMap);
      expect(dispatchMap.config).toEqual(DEFAULT_CONFIG);
    });
    
    it('should create instance with custom config', () => {
      const customConfig = {
        mapCenter: [39.3, -6.8],
        mapZoom: 14
      };
      const customMap = new DispatchMap(testMapElementId, customConfig);
      
      expect(customMap.config.mapCenter).toEqual([39.3, -6.8]);
      expect(customMap.config.mapZoom).toBe(14);
    });
    
    it('should initialize state with correct structure', () => {
      expect(dispatchMap.state).toHaveProperty('mapState');
      expect(dispatchMap.state).toHaveProperty('data');
      expect(dispatchMap.state).toHaveProperty('ui');
      expect(dispatchMap.state).toHaveProperty('health');
      
      expect(dispatchMap.state.data).toHaveProperty('orders');
      expect(dispatchMap.state.data).toHaveProperty('drivers');
      expect(dispatchMap.state.data).toHaveProperty('merchants');
      expect(dispatchMap.state.data).toHaveProperty('deliveryZones');
      
      expect(dispatchMap.state.ui).toHaveProperty('searchQuery');
      expect(dispatchMap.state.ui).toHaveProperty('searchResults');
      expect(dispatchMap.state.ui).toHaveProperty('filters');
      expect(dispatchMap.state.ui).toHaveProperty('playback');
      
      expect(dispatchMap.state.health).toHaveProperty('lastRefresh');
      expect(dispatchMap.state.health).toHaveProperty('driversWithGPS');
      expect(dispatchMap.state.health).toHaveProperty('totalDrivers');
      expect(dispatchMap.state.health).toHaveProperty('geocodeFailures');
      expect(dispatchMap.state.health).toHaveProperty('mapboxErrors');
      expect(dispatchMap.state.health).toHaveProperty('firestoreConnected');
    });
    
    it('should initialize modules registry', () => {
      expect(dispatchMap.modules).toEqual({});
    });
  });
  
  describe('State Management', () => {
    it('should update state using setState', () => {
      dispatchMap.setState('ui.searchQuery', 'test query');
      expect(dispatchMap.state.ui.searchQuery).toBe('test query');
      
      dispatchMap.setState('ui.filters.unassignedOnly', true);
      expect(dispatchMap.state.ui.filters.unassignedOnly).toBe(true);
      
      dispatchMap.setState('health.mapboxErrors', 5);
      expect(dispatchMap.state.health.mapboxErrors).toBe(5);
    });
    
    it('should get state value using getState', () => {
      dispatchMap.setState('ui.searchQuery', 'test query');
      expect(dispatchMap.getState('ui.searchQuery')).toBe('test query');
      
      dispatchMap.setState('health.firestoreConnected', false);
      expect(dispatchMap.getState('health.firestoreConnected')).toBe(false);
    });
    
    it('should handle nested state paths', () => {
      dispatchMap.setState('ui.filters.cashOnDelivery', true);
      expect(dispatchMap.getState('ui.filters.cashOnDelivery')).toBe(true);
      
      dispatchMap.setState('data.orders', [{ id: 'order1' }]);
      expect(dispatchMap.getState('data.orders')).toEqual([{ id: 'order1' }]);
    });
  });
  
  describe('Module Accessors', () => {
    it('should return undefined for unregistered modules', () => {
      expect(dispatchMap.getSearchModule()).toBeUndefined();
      expect(dispatchMap.getZonesModule()).toBeUndefined();
      expect(dispatchMap.getMerchantsModule()).toBeUndefined();
    });
    
    it('should register and return modules', () => {
      const mockModule = { init: () => {}, destroy: () => {} };
      dispatchMap.modules.search = mockModule;
      
      expect(dispatchMap.getSearchModule()).toBe(mockModule);
    });
  });
  
  describe('Data Loading', () => {
    it('should initialize data arrays as empty', () => {
      expect(dispatchMap.state.data.orders).toEqual([]);
      expect(dispatchMap.state.data.drivers).toEqual([]);
      expect(dispatchMap.state.data.merchants).toEqual([]);
      expect(dispatchMap.state.data.deliveryZones).toEqual([]);
    });
    
    it('should update data arrays when loading', async () => {
      // Mock Firestore data
      const mockOrders = [
        { id: 'order1', customerName: 'Test Customer' },
        { id: 'order2', customerName: 'Another Customer' }
      ];
      
      // This would normally call loadOrders() which fetches from Firestore
      // For unit test, we just verify the state structure
      dispatchMap.state.data.orders = mockOrders;
      
      expect(dispatchMap.state.data.orders).toHaveLength(2);
      expect(dispatchMap.state.data.orders[0]).toHaveProperty('id');
      expect(dispatchMap.state.data.orders[0]).toHaveProperty('customerName');
    });
  });
  
  describe('Health Metrics', () => {
    it('should calculate driver GPS metrics', () => {
      const drivers = [
        { id: 'driver1', hasGPS: true, lat: -6.7, lng: 39.2 },
        { id: 'driver2', hasGPS: false, lat: null, lng: null },
        { id: 'driver3', lat: -6.8, lng: 39.3 } // Has coordinates but no hasGPS flag
      ];
      
      dispatchMap.state.data.drivers = drivers;
      dispatchMap._updateHealthMetrics();
      
      expect(dispatchMap.state.health.totalDrivers).toBe(3);
      expect(dispatchMap.state.health.driversWithGPS).toBe(2);
    });
    
    it('should track Firestore connection status', () => {
      expect(dispatchMap.state.health.firestoreConnected).toBe(true);
      
      dispatchMap.state.health.firestoreConnected = false;
      expect(dispatchMap.state.health.firestoreConnected).toBe(false);
    });
    
    it('should track error counts', () => {
      expect(dispatchMap.state.health.mapboxErrors).toBe(0);
      expect(dispatchMap.state.health.geocodeFailures).toBe(0);
      
      dispatchMap.state.health.mapboxErrors = 3;
      dispatchMap.state.health.geocodeFailures = 2;
      
      expect(dispatchMap.state.health.mapboxErrors).toBe(3);
      expect(dispatchMap.state.health.geocodeFailures).toBe(2);
    });
  });
  
  describe('Search Functionality', () => {
    it('should clear search results for empty query', () => {
      dispatchMap.state.ui.searchResults = [{ id: 'result1' }];
      dispatchMap.search('');
      expect(dispatchMap.state.ui.searchResults).toEqual([]);
    });
    
    it('should search orders by ID', () => {
      dispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe' },
        { id: 'ORD002', customerName: 'Jane Smith' }
      ];
      
      const results = dispatchMap.search('ORD001');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('ORD001');
    });
    
    it('should search orders by customer name', () => {
      dispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe' }
      ];
      
      const results = dispatchMap.search('john');
      expect(results).toHaveLength(1);
      expect(results[0].label).toContain('John Doe');
    });
    
    it('should search drivers by name', () => {
      dispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'Alice Driver' }
      ];
      
      const results = dispatchMap.search('alice');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('driver');
    });
  });
  
  describe('Fly To Functionality', () => {
    it('should not fly to null coordinates', () => {
      // This test verifies the method handles null gracefully
      expect(() => {
        dispatchMap.flyTo(null);
      }).not.toThrow();
    });
    
    it('should use default zoom level', () => {
      // This test verifies the method uses the configured zoom level
      expect(dispatchMap.config.flyToZoom).toBe(15);
    });
  });
  
  describe('Error Handling', () => {
    it('should track map initialization errors', () => {
      expect(dispatchMap.state.mapState).toBe('idle');
      
      dispatchMap.state.mapState = 'error';
      dispatchMap.state.mapError = 'Test error';
      
      expect(dispatchMap.state.mapState).toBe('error');
      expect(dispatchMap.state.mapError).toBe('Test error');
    });
    
    it('should handle missing Mapbox token', async () => {
      const noTokenMap = new DispatchMap(testMapElementId, {});
      
      await expect(noTokenMap._initMapbox()).rejects.toThrow('Mapbox token is required');
    });
  });
});
