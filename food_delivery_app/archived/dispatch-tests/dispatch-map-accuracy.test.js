/**
 * Pin Accuracy Module Unit Tests
 * 
 * Tests for pin accuracy classification and rendering including:
 * - GPS pin classification and rendering
 * - Geocoded pin classification and rendering
 * - Missing pin classification and rendering
 * - Hide approximate filter functionality
 * - Hidden pin count display
 * - Three-tier label extension
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { PinAccuracyModule } from './dispatch-map-accuracy.js';

describe('PinAccuracyModule', () => {
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
  
  afterEach(() => {
    if (pinAccuracyModule) {
      pinAccuracyModule.destroy();
    }
  });
  
  describe('Initialization', () => {
    it('should create PinAccuracyModule instance', () => {
      expect(pinAccuracyModule).toBeInstanceOf(PinAccuracyModule);
      expect(pinAccuracyModule.dispatchMap).toBe(mockDispatchMap);
    });
    
    it('should initialize state correctly', () => {
      expect(pinAccuracyModule.state).toHaveProperty('pinAccuracies');
      expect(pinAccuracyModule.state).toHaveProperty('hideApproximate');
      expect(pinAccuracyModule.state).toHaveProperty('hiddenPinCount');
      expect(pinAccuracyModule.state).toHaveProperty('initialized');
      
      expect(pinAccuracyModule.state.hideApproximate).toBe(false);
      expect(pinAccuracyModule.state.hiddenPinCount).toBe(0);
      expect(pinAccuracyModule.state.initialized).toBe(false);
    });
    
    it('should have correct default colors', () => {
      expect(pinAccuracyModule.colors.gps).toBe('#22c55e');
      expect(pinAccuracyModule.colors.geocoded).toBe('#f59e0b');
      expect(pinAccuracyModule.colors.missing).toBe('#ef4444');
    });
  });
  
  describe('Pin Accuracy Classification', () => {
    it('should classify order with GPS source as gps', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('gps');
    });
    
    it('should classify order with hasGPS flag as gps', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083
        },
        hasGPS: true
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('gps');
    });
    
    it('should classify order with geocoded flag as geocoded', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('geocoded');
    });
    
    it('should classify order with geocodePending false as geocoded', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083
        },
        geocodePending: false
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('geocoded');
    });
    
    it('should classify order with legacy lat/lng as geocoded', () => {
      const order = {
        id: 'ORD001',
        deliveryLat: -6.7924,
        deliveryLng: 39.2083
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('geocoded');
    });
    
    it('should classify order without coordinates as missing', () => {
      const order = {
        id: 'ORD001',
        customerName: 'John Doe'
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('missing');
    });
    
    it('should classify null order as missing', () => {
      const accuracy = pinAccuracyModule.classifyPinAccuracy(null);
      expect(accuracy).toBe('missing');
    });
    
    it('should classify undefined order as missing', () => {
      const accuracy = pinAccuracyModule.classifyPinAccuracy(undefined);
      expect(accuracy).toBe('missing');
    });
    
    it('should classify order with invalid coordinates as missing', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: 'invalid',
          lng: 39.2083
        }
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('missing');
    });
    
    it('should classify order with null coordinates as missing', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: null
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('missing');
    });
  });
  
  describe('Pin Rendering', () => {
    it('should render GPS pin correctly', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      
      expect(pin).not.toBeNull();
      expect(pin.type).toBe('gps');
      expect(pin.color).toBe('#22c55e');
      expect(pin.borderColor).toBe('#22c55e');
      expect(pin.label).toBe('');
      expect(pin.hasApproximation).toBe(false);
      expect(pin.isUnavailable).toBe(false);
    });
    
    it('should render geocoded pin correctly', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      
      expect(pin).not.toBeNull();
      expect(pin.type).toBe('geocoded');
      expect(pin.color).toBe('#f59e0b');
      expect(pin.borderColor).toBe('#f59e0b');
      expect(pin.label).toBe(' (approx.)');
      expect(pin.hasApproximation).toBe(true);
      expect(pin.isUnavailable).toBe(false);
    });
    
    it('should render missing pin correctly', () => {
      const order = {
        id: 'ORD001',
        customerName: 'John Doe'
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      
      expect(pin).not.toBeNull();
      expect(pin.type).toBe('missing');
      expect(pin.color).toBe('#ef4444');
      expect(pin.borderColor).toBe('#ef4444');
      expect(pin.label).toBe(' (Location unavailable)');
      expect(pin.hasApproximation).toBe(false);
      expect(pin.isUnavailable).toBe(true);
    });
    
    it('should return null for hidden approximate pins', () => {
      pinAccuracyModule.state.hideApproximate = true;
      
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).toBeNull();
    });
    
    it('should return null for hidden missing pins', () => {
      pinAccuracyModule.state.hideApproximate = true;
      
      const order = {
        id: 'ORD001',
        customerName: 'John Doe'
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).toBeNull();
    });
    
    it('should not hide GPS pins when hideApproximate is true', () => {
      pinAccuracyModule.state.hideApproximate = true;
      
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).not.toBeNull();
      expect(pin.type).toBe('gps');
    });
  });
  
  describe('Hide Approximate Filter', () => {
    it('should hide geocoded pins when filter is enabled', () => {
      pinAccuracyModule.setHideApproximate(true);
      
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).toBeNull();
    });
    
    it('should hide missing pins when filter is enabled', () => {
      pinAccuracyModule.setHideApproximate(true);
      
      const order = {
        id: 'ORD001',
        customerName: 'John Doe'
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).toBeNull();
    });
    
    it('should not hide GPS pins when filter is enabled', () => {
      pinAccuracyModule.setHideApproximate(true);
      
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const pin = pinAccuracyModule.renderPin(order);
      expect(pin).not.toBeNull();
      expect(pin.type).toBe('gps');
    });
    
    it('should show all pins when filter is disabled', () => {
      pinAccuracyModule.setHideApproximate(false);
      
      const geocodedOrder = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const missingOrder = {
        id: 'ORD002',
        customerName: 'John Doe'
      };
      
      expect(pinAccuracyModule.renderPin(geocodedOrder)).not.toBeNull();
      expect(pinAccuracyModule.renderPin(missingOrder)).not.toBeNull();
    });
    
    it('should toggle hideApproximate state', () => {
      expect(pinAccuracyModule.getHideApproximate()).toBe(false);
      
      pinAccuracyModule.toggleHideApproximate();
      expect(pinAccuracyModule.getHideApproximate()).toBe(true);
      
      pinAccuracyModule.toggleHideApproximate();
      expect(pinAccuracyModule.getHideApproximate()).toBe(false);
    });
  });
  
  describe('Hidden Pin Count', () => {
    it('should count hidden pins correctly', () => {
      mockDispatchMap.state.data.orders = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            source: 'gps'
          }
        },
        {
          id: 'ORD002',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            geocoded: true
          }
        },
        {
          id: 'ORD003',
          customerName: 'John Doe'
        }
      ];
      
      // Update pin accuracies
      pinAccuracyModule.updatePinAccuracies(mockDispatchMap.state.data.orders);
      
      // Enable hide approximate
      pinAccuracyModule.setHideApproximate(true);
      
      // Check hidden count
      expect(pinAccuracyModule.getHiddenPinCount()).toBe(2);
    });
    
    it('should show 0 hidden pins when filter is disabled', () => {
      mockDispatchMap.state.data.orders = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            geocoded: true
          }
        },
        {
          id: 'ORD002',
          customerName: 'John Doe'
        }
      ];
      
      pinAccuracyModule.updatePinAccuracies(mockDispatchMap.state.data.orders);
      
      // Filter is disabled by default
      expect(pinAccuracyModule.getHiddenPinCount()).toBe(0);
    });
    
    it('should update hidden count when orders change', () => {
      const orders1 = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            geocoded: true
          }
        }
      ];
      
      const orders2 = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            source: 'gps'
          }
        }
      ];
      
      pinAccuracyModule.updatePinAccuracies(orders1);
      pinAccuracyModule.setHideApproximate(true);
      
      expect(pinAccuracyModule.getHiddenPinCount()).toBe(1);
      
      pinAccuracyModule.updatePinAccuracies(orders2);
      expect(pinAccuracyModule.getHiddenPinCount()).toBe(0);
    });
  });
  
  describe('Three-Tier Label Extension', () => {
    it('should return empty label for GPS pins', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const label = pinAccuracyModule.getAccuracyLabel('gps');
      expect(label).toBe('');
    });
    
    it('should return (approx.) label for geocoded pins', () => {
      const label = pinAccuracyModule.getAccuracyLabel('geocoded');
      expect(label).toBe(' (approx.)');
    });
    
    it('should return (Location unavailable) label for missing pins', () => {
      const label = pinAccuracyModule.getAccuracyLabel('missing');
      expect(label).toBe(' (Location unavailable)');
    });
    
    it('should return extended label with accuracy type', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          geocoded: true
        }
      };
      
      const extendedLabel = pinAccuracyModule.getExtendedLabel(order);
      expect(extendedLabel).toBe('[GEOCODED] (approx.)');
    });
    
    it('should return GPS extended label', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: {
          lat: -6.7924,
          lng: 39.2083,
          source: 'gps'
        }
      };
      
      const extendedLabel = pinAccuracyModule.getExtendedLabel(order);
      expect(extendedLabel).toBe('[GPS]');
    });
    
    it('should return missing extended label', () => {
      const order = {
        id: 'ORD001',
        customerName: 'John Doe'
      };
      
      const extendedLabel = pinAccuracyModule.getExtendedLabel(order);
      expect(extendedLabel).toBe('[MISSING] (Location unavailable)');
    });
  });
  
  describe('Accuracy Statistics', () => {
    it('should return correct accuracy stats', () => {
      mockDispatchMap.state.data.orders = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            source: 'gps'
          }
        },
        {
          id: 'ORD002',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            geocoded: true
          }
        },
        {
          id: 'ORD003',
          customerName: 'John Doe'
        }
      ];
      
      pinAccuracyModule.updatePinAccuracies(mockDispatchMap.state.data.orders);
      
      const stats = pinAccuracyModule.getAccuracyStats();
      
      expect(stats.gps).toBe(1);
      expect(stats.geocoded).toBe(1);
      expect(stats.missing).toBe(1);
      expect(stats.total).toBe(3);
    });
    
    it('should return zero stats for empty orders', () => {
      const stats = pinAccuracyModule.getAccuracyStats();
      
      expect(stats.gps).toBe(0);
      expect(stats.geocoded).toBe(0);
      expect(stats.missing).toBe(0);
      expect(stats.total).toBe(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid orders data gracefully', () => {
      expect(() => {
        pinAccuracyModule.updatePinAccuracies(null);
      }).not.toThrow();
      
      expect(() => {
        pinAccuracyModule.updatePinAccuracies('invalid');
      }).not.toThrow();
      
      expect(() => {
        pinAccuracyModule.updatePinAccuracies(123);
      }).not.toThrow();
    });
    
    it('should handle missing order fields gracefully', () => {
      const order = {
        id: 'ORD001'
        // Missing deliveryLocation
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('missing');
    });
    
    it('should handle order with null deliveryLocation', () => {
      const order = {
        id: 'ORD001',
        deliveryLocation: null
      };
      
      const accuracy = pinAccuracyModule.classifyPinAccuracy(order);
      expect(accuracy).toBe('missing');
    });
  });
  
  describe('Integration with DispatchMap', () => {
    it('should update when orders are updated', () => {
      const orders = [
        {
          id: 'ORD001',
          deliveryLocation: {
            lat: -6.7924,
            lng: 39.2083,
            source: 'gps'
          }
        }
      ];
      
      // Simulate ordersUpdated event
      pinAccuracyModule.updatePinAccuracies(orders);
      
      const accuracy = pinAccuracyModule.getPinAccuracy('ORD001');
      expect(accuracy).toBe('gps');
    });
  });
});
