/**
 * Search Module Unit Tests
 * 
 * Tests for search query matching functionality including:
 * - Case-insensitive matching
 * - Partial string matching
 * - Fuzzy matching
 * - Relevance ranking
 * - Debouncing
 * - 500ms SLA compliance
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { SearchModule } from './dispatch-map-search.js';

describe('SearchModule', () => {
  let searchModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    // Create mock DispatchMap
    mockDispatchMap = {
      map: {
        getContainer: () => document.createElement('div'),
        on: vi.fn(),
        off: vi.fn(),
        flyTo: vi.fn()
      },
      config: {
        searchDebounceMs: 300,
        searchTimeoutMs: 500,
        flyToZoom: 15
      },
      state: {
        data: {
          orders: [],
          drivers: [],
          merchants: []
        },
        health: {
          mapboxErrors: 0
        }
      }
    };
    
    searchModule = new SearchModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (searchModule) {
      searchModule.destroy();
    }
  });
  
  describe('Initialization', () => {
    it('should create SearchModule instance', () => {
      expect(searchModule).toBeInstanceOf(SearchModule);
      expect(searchModule.dispatchMap).toBe(mockDispatchMap);
    });
    
    it('should initialize state correctly', () => {
      expect(searchModule.state).toHaveProperty('query');
      expect(searchModule.state).toHaveProperty('results');
      expect(searchModule.state).toHaveProperty('selectedIndex');
      expect(searchModule.state).toHaveProperty('isOpen');
      expect(searchModule.state).toHaveProperty('previousViewport');
      
      expect(searchModule.state.query).toBe('');
      expect(searchModule.state.results).toEqual([]);
      expect(searchModule.state.selectedIndex).toBe(0);
      expect(searchModule.state.isOpen).toBe(false);
    });
  });
  
  describe('Order Search', () => {
    it('should search orders by exact ID match', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' },
        { id: 'ORD002', customerName: 'Jane Smith', deliveryAddress: '456 Oak Ave' }
      ];
      
      const results = await searchModule.search('ORD001');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('ORD001');
      expect(results[0].type).toBe('order');
      expect(results[0].relevance).toBe(100);
    });
    
    it('should search orders by partial ID match', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' },
        { id: 'ORD002', customerName: 'Jane Smith', deliveryAddress: '456 Oak Ave' }
      ];
      
      const results = await searchModule.search('ORD00');
      
      expect(results).toHaveLength(2);
      expect(results[0].relevance).toBe(90);
    });
    
    it('should search orders by exact customer name match', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('john doe');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(85);
    });
    
    it('should search orders by customer name prefix', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('john');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(75);
    });
    
    it('should search orders by customer name substring', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('doe');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(65);
    });
    
    it('should search orders by delivery address', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main Street' }
      ];
      
      const results = await searchModule.search('main');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(60);
    });
    
    it('should be case-insensitive', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results1 = await searchModule.search('JOHN');
      const results2 = await searchModule.search('john');
      const results3 = await searchModule.search('JoHn');
      
      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results3).toHaveLength(1);
      expect(results1[0].relevance).toBe(results2[0].relevance);
    });
    
    it('should handle empty customer name gracefully', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: null, deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('john');
      
      expect(results).toHaveLength(0);
    });
    
    it('should return coordinates from deliveryLocation', async () => {
      mockDispatchMap.state.data.orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          deliveryAddress: '123 Main St',
          deliveryLocation: { lat: -6.7924, lng: 39.2083 }
        }
      ];
      
      const results = await searchModule.search('ORD001');
      
      expect(results[0].coordinates).toEqual({ lat: -6.7924, lng: 39.2083 });
    });
  });
  
  describe('Driver Search', () => {
    it('should search drivers by exact ID match', async () => {
      mockDispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'Alice Driver', lat: -6.7, lng: 39.2 },
        { id: 'DRV002', name: 'Bob Driver', lat: -6.8, lng: 39.3 }
      ];
      
      const results = await searchModule.search('DRV001');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('DRV001');
      expect(results[0].type).toBe('driver');
      expect(results[0].relevance).toBe(100);
    });
    
    it('should search drivers by name', async () => {
      mockDispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'Alice Driver', lat: -6.7, lng: 39.2 }
      ];
      
      const results = await searchModule.search('alice');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(75);
    });
    
    it('should return driver coordinates', async () => {
      mockDispatchMap.state.data.drivers = [
        { 
          id: 'DRV001', 
          name: 'Alice Driver', 
          currentLocation: { lat: -6.7924, lng: 39.2083 }
        }
      ];
      
      const results = await searchModule.search('DRV001');
      
      expect(results[0].coordinates).toEqual({ lat: -6.7924, lng: 39.2083 });
    });
  });
  
  describe('Merchant Search', () => {
    it('should search merchants by name', async () => {
      mockDispatchMap.state.data.merchants = [
        { id: 'MERCH001', name: 'Pizza Palace', address: '789 Food St', lat: -6.75, lng: 39.25 }
      ];
      
      const results = await searchModule.search('pizza');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('merchant');
      expect(results[0].relevance).toBe(75);
    });
    
    it('should search merchants by address', async () => {
      mockDispatchMap.state.data.merchants = [
        { id: 'MERCH001', name: 'Pizza Palace', address: '789 Food Street', lat: -6.75, lng: 39.25 }
      ];
      
      const results = await searchModule.search('food');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(60);
    });
  });
  
  describe('Fuzzy Matching', () => {
    it('should fuzzy match customer names', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'Christopher Johnson', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('cjohn');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(50);
    });
    
    it('should fuzzy match driver names', async () => {
      mockDispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'Alexander Anderson', lat: -6.7, lng: 39.2 }
      ];
      
      const results = await searchModule.search('aand');
      
      expect(results).toHaveLength(1);
      expect(results[0].relevance).toBe(50);
    });
    
    it('should not fuzzy match if pattern not found', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('xyz');
      
      expect(results).toHaveLength(0);
    });
  });
  
  describe('Relevance Ranking', () => {
    it('should rank exact ID match highest', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      mockDispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'ORD001 Driver', lat: -6.7, lng: 39.2 }
      ];
      
      const results = await searchModule.search('ORD001');
      
      // Order exact ID match (100) should rank higher than driver name match (65)
      expect(results[0].id).toBe('ORD001');
      expect(results[0].type).toBe('order');
    });
    
    it('should sort results by relevance descending', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' },
        { id: 'ORD002', customerName: 'John Smith', deliveryAddress: '456 Oak Ave' }
      ];
      
      const results = await searchModule.search('john');
      
      // Both should match, but exact match should rank higher
      expect(results).toHaveLength(2);
      expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
    });
  });
  
  describe('Empty Query Handling', () => {
    it('should return empty results for empty query', async () => {
      const results = await searchModule.search('');
      expect(results).toEqual([]);
    });
    
    it('should return empty results for whitespace-only query', async () => {
      const results = await searchModule.search('   ');
      expect(results).toEqual([]);
    });
  });
  
  describe('SLA Compliance', () => {
    it('should complete search within 500ms SLA', async () => {
      mockDispatchMap.state.data.orders = Array.from({ length: 100 }, (_, i) => ({
        id: `ORD${String(i).padStart(3, '0')}`,
        customerName: `Customer ${i}`,
        deliveryAddress: `${i} Main St`
      }));
      
      const startTime = Date.now();
      const results = await searchModule.search('customer');
      const elapsed = Date.now() - startTime;
      
      expect(elapsed).toBeLessThanOrEqual(500);
      expect(results.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockDispatchMap.state.data.orders = null; // Invalid data
      
      const results = await searchModule.search('test');
      
      expect(results).toEqual([]);
      expect(mockDispatchMap.state.health.mapboxErrors).toBeGreaterThan(0);
    });
  });
  
  describe('Fuzzy Match Algorithm', () => {
    it('should correctly implement fuzzy matching', () => {
      expect(searchModule._fuzzyMatch('christopher', 'cjohn')).toBe(true);
      expect(searchModule._fuzzyMatch('alexander', 'aand')).toBe(true);
      expect(searchModule._fuzzyMatch('john', 'jn')).toBe(true);
      expect(searchModule._fuzzyMatch('john', 'xyz')).toBe(false);
      expect(searchModule._fuzzyMatch('john', 'nj')).toBe(false); // Wrong order
    });
    
    it('should handle empty pattern', () => {
      expect(searchModule._fuzzyMatch('john', '')).toBe(true);
    });
    
    it('should handle pattern longer than text', () => {
      expect(searchModule._fuzzyMatch('john', 'christopher')).toBe(false);
    });
  });
  
  describe('Search Result Structure', () => {
    it('should return properly structured search results', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      
      const results = await searchModule.search('ORD001');
      
      expect(results[0]).toHaveProperty('type');
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('label');
      expect(results[0]).toHaveProperty('coordinates');
      expect(results[0]).toHaveProperty('originalData');
      expect(results[0]).toHaveProperty('relevance');
      
      expect(results[0].type).toBe('order');
      expect(results[0].id).toBe('ORD001');
      expect(typeof results[0].label).toBe('string');
      expect(typeof results[0].relevance).toBe('number');
    });
  });
  
  describe('Multiple Result Types', () => {
    it('should return mixed result types sorted by relevance', async () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
      ];
      mockDispatchMap.state.data.drivers = [
        { id: 'DRV001', name: 'John Driver', lat: -6.7, lng: 39.2 }
      ];
      mockDispatchMap.state.data.merchants = [
        { id: 'MERCH001', name: 'John\'s Pizza', address: '789 Food St', lat: -6.75, lng: 39.25 }
      ];
      
      const results = await searchModule.search('john');
      
      expect(results.length).toBeGreaterThan(1);
      
      // Verify results are sorted by relevance
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].relevance).toBeGreaterThanOrEqual(results[i + 1].relevance);
      }
    });
  });
});
