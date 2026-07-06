/**
 * Search Module Property-Based Tests
 * 
 * Property-based tests for search query matching using fast-check.
 * These tests validate universal properties that should hold for all inputs.
 * 
 * Feature: dispatch-map-enhancements
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fc from 'fast-check';
import { SearchModule } from './dispatch-map-search.js';

describe('SearchModule - Property-Based Tests', () => {
  let searchModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    mockDispatchMap = {
      map: {
        getContainer: () => document.createElement('div'),
        on: () => {},
        off: () => {},
        flyTo: () => {}
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
  
  // Feature: dispatch-map-enhancements, Property 1: Search Results Within SLA
  // *For any* valid search query and active data set, the search operation SHALL complete and return results within 500 milliseconds of query submission
  describe('Property 1: Search Results Within SLA', () => {
    it('should complete search within 500ms SLA for any valid query', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              customerName: fc.string({ minLength: 1, maxLength: 50 }),
              deliveryAddress: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 0, maxLength: 100 }
          ),
          fc.string({ minLength: 1, maxLength: 20 })
        ),
        async (orders, query) => {
          mockDispatchMap.state.data.orders = orders;
          
          const startTime = Date.now();
          const results = await searchModule.search(query);
          const elapsed = Date.now() - startTime;
          
          expect(elapsed).toBeLessThanOrEqual(500);
          expect(Array.isArray(results)).toBe(true);
        },
        { numRuns: 100 }
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 2: Case-Insensitive Matching
  // *For any* search query, the search operation SHALL match results regardless of case
  describe('Property 2: Case-Insensitive Matching', () => {
    it('should match results regardless of query case', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (customerName) => {
            mockDispatchMap.state.data.orders = [
              { id: 'ORD001', customerName, deliveryAddress: '123 Main St' }
            ];
            
            const lowerResults = await searchModule.search(customerName.toLowerCase());
            const upperResults = await searchModule.search(customerName.toUpperCase());
            const mixedResults = await searchModule.search(
              customerName.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('')
            );
            
            // All should find the same result
            expect(lowerResults.length).toBe(upperResults.length);
            expect(lowerResults.length).toBe(mixedResults.length);
          },
          { numRuns: 50 }
        )
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 3: Partial String Matching
  // *For any* search query that is a substring of a field, the search SHALL return matching results
  describe('Property 3: Partial String Matching', () => {
    it('should match partial strings in customer names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }),
          (customerName) => {
            mockDispatchMap.state.data.orders = [
              { id: 'ORD001', customerName, deliveryAddress: '123 Main St' }
            ];
            
            // Extract a substring
            const substring = customerName.substring(1, Math.min(5, customerName.length));
            if (substring.length > 0) {
              const results = searchModule._searchOrders(substring.toLowerCase());
              expect(results.length).toBeGreaterThan(0);
            }
          },
          { numRuns: 50 }
        )
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 4: Relevance Ranking
  // *For any* search results, results SHALL be sorted by relevance score in descending order
  describe('Property 4: Relevance Ranking', () => {
    it('should sort results by relevance in descending order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              customerName: fc.string({ minLength: 1, maxLength: 50 }),
              deliveryAddress: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        async (orders, query) => {
          mockDispatchMap.state.data.orders = orders;
          
          const results = await searchModule.search(query);
          
          // Verify results are sorted by relevance descending
          for (let i = 0; i < results.length - 1; i++) {
            expect(results[i].relevance).toBeGreaterThanOrEqual(results[i + 1].relevance);
          }
        },
        { numRuns: 50 }
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 5: Empty Query Handling
  // *For any* empty or whitespace-only search query, the search SHALL return an empty results array
  describe('Property 5: Empty Query Handling', () => {
    it('should return empty results for empty or whitespace queries', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/\S/g, ' '))
          ),
          async (query) => {
            mockDispatchMap.state.data.orders = [
              { id: 'ORD001', customerName: 'John Doe', deliveryAddress: '123 Main St' }
            ];
            
            const results = await searchModule.search(query);
            
            expect(results).toEqual([]);
          },
          { numRuns: 20 }
        )
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 6: Result Structure Consistency
  // *For any* search result, the result object SHALL contain all required properties
  describe('Property 6: Result Structure Consistency', () => {
    it('should return results with consistent structure', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              customerName: fc.string({ minLength: 1, maxLength: 50 }),
              deliveryAddress: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        async (orders, query) => {
          mockDispatchMap.state.data.orders = orders;
          
          const results = await searchModule.search(query);
          
          // Verify all results have required properties
          results.forEach(result => {
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('label');
            expect(result).toHaveProperty('coordinates');
            expect(result).toHaveProperty('originalData');
            expect(result).toHaveProperty('relevance');
            
            expect(typeof result.type).toBe('string');
            expect(typeof result.id).toBe('string');
            expect(typeof result.label).toBe('string');
            expect(typeof result.relevance).toBe('number');
            expect(result.relevance).toBeGreaterThanOrEqual(0);
            expect(result.relevance).toBeLessThanOrEqual(100);
          });
        },
        { numRuns: 50 }
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 7: Fuzzy Match Correctness
  // *For any* pattern and text, fuzzy matching SHALL correctly identify if all pattern characters appear in text in order
  describe('Property 7: Fuzzy Match Correctness', () => {
    it('should correctly implement fuzzy matching algorithm', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          (text, pattern) => {
            const result = searchModule._fuzzyMatch(text, pattern);
            
            // Verify the result is correct
            let patternIdx = 0;
            let textIdx = 0;
            
            while (patternIdx < pattern.length && textIdx < text.length) {
              if (pattern[patternIdx] === text[textIdx]) {
                patternIdx++;
              }
              textIdx++;
            }
            
            const expected = patternIdx === pattern.length;
            expect(result).toBe(expected);
          },
          { numRuns: 100 }
        )
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 8: No False Negatives
  // *For any* exact substring match in a field, the search SHALL return that result
  describe('Property 8: No False Negatives', () => {
    it('should not miss exact substring matches', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 30 }),
          (customerName) => {
            mockDispatchMap.state.data.orders = [
              { id: 'ORD001', customerName, deliveryAddress: '123 Main St' }
            ];
            
            // Extract a substring that definitely exists
            const substring = customerName.substring(0, Math.min(3, customerName.length));
            if (substring.length > 0) {
              const results = searchModule._searchOrders(substring.toLowerCase());
              expect(results.length).toBeGreaterThan(0);
            }
          },
          { numRuns: 50 }
        )
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 9: Coordinate Handling
  // *For any* search result with valid coordinates, the coordinates SHALL be properly structured
  describe('Property 9: Coordinate Handling', () => {
    it('should properly handle coordinates in search results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              customerName: fc.string({ minLength: 1, maxLength: 50 }),
              deliveryAddress: fc.string({ minLength: 1, maxLength: 100 }),
              deliveryLocation: fc.oneof(
                fc.constant(null),
                fc.record({
                  lat: fc.float({ min: -90, max: 90 }),
                  lng: fc.float({ min: -180, max: 180 })
                })
              )
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        async (orders, query) => {
          mockDispatchMap.state.data.orders = orders;
          
          const results = await searchModule.search(query);
          
          // Verify coordinates are properly structured
          results.forEach(result => {
            if (result.coordinates !== null) {
              expect(result.coordinates).toHaveProperty('lat');
              expect(result.coordinates).toHaveProperty('lng');
              expect(typeof result.coordinates.lat).toBe('number');
              expect(typeof result.coordinates.lng).toBe('number');
              expect(result.coordinates.lat).toBeGreaterThanOrEqual(-90);
              expect(result.coordinates.lat).toBeLessThanOrEqual(90);
              expect(result.coordinates.lng).toBeGreaterThanOrEqual(-180);
              expect(result.coordinates.lng).toBeLessThanOrEqual(180);
            }
          });
        },
        { numRuns: 50 }
      );
    });
  });
  
  // Feature: dispatch-map-enhancements, Property 10: Search Idempotency
  // *For any* search query and data set, running the same search twice SHALL return identical results
  describe('Property 10: Search Idempotency', () => {
    it('should return identical results for identical queries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              customerName: fc.string({ minLength: 1, maxLength: 50 }),
              deliveryAddress: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          fc.string({ minLength: 1, maxLength: 10 })
        ),
        async (orders, query) => {
          mockDispatchMap.state.data.orders = orders;
          
          const results1 = await searchModule.search(query);
          const results2 = await searchModule.search(query);
          
          // Results should be identical
          expect(results1).toEqual(results2);
        },
        { numRuns: 50 }
      );
    });
  });
});
