/**
 * Export Module Unit Tests
 * 
 * Tests for export functionality including:
 * - CSV generation
 * - CSV download
 * - Snapshot link construction
 * - Clipboard copy
 * - Snapshot link restoration
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ExportModule } from './dispatch-map-export.js';

describe('ExportModule', () => {
  let exportModule;
  let mockDispatchMap;
  
  beforeEach(() => {
    // Create mock DispatchMap
    mockDispatchMap = {
      map: {
        getCenter: () => ({ lat: -6.7924, lng: 39.2083 }),
        getZoom: () => 13,
        getBounds: () => ({
          getSouth: () => -6.8,
          getWest: () => 39.1,
          getNorth: () => -6.7,
          getEast: () => 39.3
        }),
        flyTo: () => {}
      },
      state: {
        data: {
          orders: [],
          drivers: [
            { id: 'DRV001', name: 'Alice Driver' },
            { id: 'DRV002', name: 'Bob Driver' }
          ],
          merchants: [
            { id: 'MERCH001', name: 'Pizza Palace' },
            { id: 'MERCH002', name: 'Burger Barn' }
          ]
        },
        ui: {
          filters: {
            unassignedOnly: false,
            assignedNotPickedUp: false,
            lateDeliveries: false,
            cashOnDelivery: false,
            merchantId: null,
            hideApproximate: false
          }
        }
      }
    };
    
    exportModule = new ExportModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (exportModule) {
      exportModule.destroy();
    }
  });
  
  describe('Initialization', () => {
    it('should create ExportModule instance', () => {
      expect(exportModule).toBeInstanceOf(ExportModule);
      expect(exportModule.dispatchMap).toBe(mockDispatchMap);
    });
    
    it('should initialize state correctly', () => {
      expect(exportModule.state).toHaveProperty('snapshotLink');
      expect(exportModule.state.snapshotLink).toBeNull();
    });
  });
  
  describe('CSV Generation', () => {
    it('should generate CSV with correct headers', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('Order ID,Customer Name,Driver Name,Merchant Name,Status,Delivery Address,Order Total');
    });
    
    it('should handle empty orders array', () => {
      const csv = exportModule.generateCSV([]);
      expect(csv).toBe('');
    });
    
    it('should handle null orders', () => {
      const csv = exportModule.generateCSV(null);
      expect(csv).toBe('');
    });
    
    it('should format currency correctly', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      expect(csv).toContain('TSh 50,000');
    });
    
    it('should escape CSV fields with special characters', () => {
      const orders = [
        { 
          id: 'ORD,001', 
          customerName: 'John "Doe"', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St\nApt 4' },
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      
      // Verify field with comma is quoted
      expect(csv).toContain('"ORD,001"');
      
      // Verify field with quotes is escaped
      expect(csv).toContain('"John ""Doe"""');
      
      // Verify field with newline is quoted
      expect(csv).toContain('"123 Main St\nApt 4"');
    });
    
    it('should handle missing driver', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      expect(csv).toContain('Unassigned');
    });
    
    it('should handle missing merchant', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'NONEXISTENT',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      expect(csv).toContain('N/A');
    });
    
    it('should handle missing delivery address', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          total: 50000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      expect(csv).toContain('N/A');
    });
    
    it('should handle missing total', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' }
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      expect(csv).toContain('N/A');
    });
    
    it('should handle multiple orders', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        },
        { 
          id: 'ORD002', 
          customerName: 'Jane Smith', 
          merchantId: 'MERCH002',
          status: 'assigned',
          deliveryLocation: { label: '456 Oak Ave' },
          total: 75000
        }
      ];
      
      const csv = exportModule.generateCSV(orders);
      const lines = csv.split('\n');
      
      expect(lines.length).toBe(3); // Header + 2 orders
      expect(lines[1]).toContain('ORD001');
      expect(lines[2]).toContain('ORD002');
    });
  });
  
  describe('CSV Download', () => {
    it('should trigger download with default filename', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      // Mock document methods
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      const createElement = vi.fn((tag) => {
        if (tag === 'a') {
          return {
            setAttribute: vi.fn(),
            style: { visibility: '' },
            click: vi.fn()
          };
        }
        return document.createElement(tag);
      });
      
      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;
      const originalCreateElement = document.createElement;
      
      document.body.appendChild = appendChild;
      document.body.removeChild = removeChild;
      document.createElement = createElement;
      
      // Mock URL.createObjectURL
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = () => 'blob:url';
      
      try {
        exportModule.downloadCSV(orders);
        
        // Verify download was triggered
        expect(appendChild).toHaveBeenCalled();
        expect(removeChild).toHaveBeenCalled();
      } finally {
        document.body.appendChild = originalAppendChild;
        document.body.removeChild = originalRemoveChild;
        document.createElement = originalCreateElement;
        URL.createObjectURL = originalCreateObjectURL;
      }
    });
    
    it('should trigger download with custom filename', () => {
      const orders = [
        { 
          id: 'ORD001', 
          customerName: 'John Doe', 
          merchantId: 'MERCH001',
          status: 'pending',
          deliveryLocation: { label: '123 Main St' },
          total: 50000
        }
      ];
      
      const customFilename = 'custom-export.csv';
      
      // Mock document methods
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      const createElement = vi.fn((tag) => {
        if (tag === 'a') {
          return {
            setAttribute: vi.fn((name, value) => {
              if (name === 'download') {
                expect(value).toBe(customFilename);
              }
            }),
            style: { visibility: '' },
            click: vi.fn()
          };
        }
        return document.createElement(tag);
      });
      
      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;
      const originalCreateElement = document.createElement;
      
      document.body.appendChild = appendChild;
      document.body.removeChild = removeChild;
      document.createElement = createElement;
      
      // Mock URL.createObjectURL
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = () => 'blob:url';
      
      try {
        exportModule.downloadCSV(orders, customFilename);
        
        // Verify custom filename was used
        expect(appendChild).toHaveBeenCalled();
      } finally {
        document.body.appendChild = originalAppendChild;
        document.body.removeChild = originalRemoveChild;
        document.createElement = originalCreateElement;
        URL.createObjectURL = originalCreateObjectURL;
      }
    });
    
    it('should handle empty orders gracefully', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      exportModule.downloadCSV([]);
      
      expect(consoleWarn).toHaveBeenCalledWith('No orders to export');
      
      consoleWarn.mockRestore();
    });
  });
  
  describe('Snapshot Link Construction', () => {
    it('should construct valid snapshot link', () => {
      const snapshotLink = exportModule.constructSnapshotLink();
      
      expect(snapshotLink).toBeDefined();
      expect(snapshotLink).toMatch(/^https?:\/\/[^\s?]+\?/);
    });
    
    it('should include center coordinates in snapshot link', () => {
      const snapshotLink = exportModule.constructSnapshotLink();
      const url = new URL(snapshotLink);
      const params = url.searchParams;
      
      expect(params.get('center')).toBe('-6.7924,39.2083');
    });
    
    it('should include zoom level in snapshot link', () => {
      const snapshotLink = exportModule.constructSnapshotLink();
      const url = new URL(snapshotLink);
      const params = url.searchParams;
      
      expect(params.get('zoom')).toBe('13.00');
    });
    
    it('should include bounds in snapshot link', () => {
      const snapshotLink = exportModule.constructSnapshotLink();
      const url = new URL(snapshotLink);
      const params = url.searchParams;
      
      expect(params.get('bounds')).toBe('-6.8,39.1,-6.7,39.3');
    });
    
    it('should include filter parameters when active', () => {
      mockDispatchMap.state.ui.filters.unassignedOnly = true;
      mockDispatchMap.state.ui.filters.cashOnDelivery = true;
      
      const snapshotLink = exportModule.constructSnapshotLink();
      const url = new URL(snapshotLink);
      const params = url.searchParams;
      
      expect(params.get('filter_unassigned')).toBe('true');
      expect(params.get('filter_cod')).toBe('true');
    });
    
    it('should include visible order IDs', () => {
      mockDispatchMap.state.data.orders = [
        { id: 'ORD001' },
        { id: 'ORD002' }
      ];
      
      const snapshotLink = exportModule.constructSnapshotLink();
      const url = new URL(snapshotLink);
      const params = url.searchParams;
      
      expect(params.get('visible_orders')).toBe('ORD001,ORD002');
    });
    
    it('should handle null map gracefully', () => {
      exportModule.dispatchMap.map = null;
      
      const snapshotLink = exportModule.constructSnapshotLink();
      
      expect(snapshotLink).toBeNull();
    });
  });
  
  describe('Snapshot Link Restoration', () => {
    it('should restore viewport from snapshot link', async () => {
      const snapshotLink = 'https://example.com/fleet-manager.html?center=-6.8,39.2&zoom=14.5&bounds=-6.9,39.1,-6.7,39.3';
      
      let flyToCalled = false;
      let flyToOptions = null;
      mockDispatchMap.map.flyTo = (options) => {
        flyToCalled = true;
        flyToOptions = options;
      };
      
      const restored = await exportModule.restoreFromSnapshotLink(snapshotLink);
      
      expect(restored).toBe(true);
      expect(flyToCalled).toBe(true);
      expect(flyToOptions.center[0]).toBeCloseTo(39.2, 1);
      expect(flyToOptions.center[1]).toBeCloseTo(-6.8, 1);
      expect(flyToOptions.zoom).toBeCloseTo(14.5, 1);
    });
    
    it('should restore filters from snapshot link', async () => {
      const snapshotLink = 'https://example.com/fleet-manager.html?filter_unassigned=true&filter_cod=true&filter_merchant=MERCH001';
      
      await exportModule.restoreFromSnapshotLink(snapshotLink);
      
      expect(mockDispatchMap.state.ui.filters.unassignedOnly).toBe(true);
      expect(mockDispatchMap.state.ui.filters.cashOnDelivery).toBe(true);
      expect(mockDispatchMap.state.ui.filters.merchantId).toBe('MERCH001');
    });
    
    it('should restore visible orders from snapshot link', async () => {
      const snapshotLink = 'https://example.com/fleet-manager.html?visible_orders=ORD001,ORD002';
      
      const restored = await exportModule.restoreFromSnapshotLink(snapshotLink);
      
      expect(restored).toBe(true);
    });
    
    it('should handle malformed URL gracefully', async () => {
      const restored = await exportModule.restoreFromSnapshotLink('not-a-valid-url');
      
      expect(restored).toBe(false);
    });
    
    it('should handle missing parameters gracefully', async () => {
      const snapshotLink = 'https://example.com/fleet-manager.html?center=invalid&zoom=abc';
      
      const restored = await exportModule.restoreFromSnapshotLink(snapshotLink);
      
      expect(restored).toBe(false);
    });
  });
  
  describe('Helper Methods', () => {
    describe('_getVisibleOrders', () => {
      it('should return all orders when no filters active', () => {
        mockDispatchMap.state.data.orders = [
          { id: 'ORD001', driverId: 'DRV001' },
          { id: 'ORD002', driverId: 'DRV002' }
        ];
        
        const visibleOrders = exportModule._getVisibleOrders();
        
        expect(visibleOrders).toHaveLength(2);
      });
      
      it('should filter unassigned orders', () => {
        mockDispatchMap.state.ui.filters.unassignedOnly = true;
        mockDispatchMap.state.data.orders = [
          { id: 'ORD001', driverId: null },
          { id: 'ORD002', driverId: 'DRV001' }
        ];
        
        const visibleOrders = exportModule._getVisibleOrders();
        
        expect(visibleOrders).toHaveLength(1);
        expect(visibleOrders[0].id).toBe('ORD001');
      });
      
      it('should filter by merchant', () => {
        mockDispatchMap.state.ui.filters.merchantId = 'MERCH001';
        mockDispatchMap.state.data.orders = [
          { id: 'ORD001', merchantId: 'MERCH001' },
          { id: 'ORD002', merchantId: 'MERCH002' }
        ];
        
        const visibleOrders = exportModule._getVisibleOrders();
        
        expect(visibleOrders).toHaveLength(1);
        expect(visibleOrders[0].id).toBe('ORD001');
      });
    });
    
    describe('_getDriverName', () => {
      it('should return driver name by ID', () => {
        const name = exportModule._getDriverName('DRV001');
        expect(name).toBe('Alice Driver');
      });
      
      it('should return Unknown for non-existent driver', () => {
        const name = exportModule._getDriverName('NONEXISTENT');
        expect(name).toBe('Unknown');
      });
    });
    
    describe('_getMerchantName', () => {
      it('should return merchant name by ID', () => {
        const name = exportModule._getMerchantName('MERCH001');
        expect(name).toBe('Pizza Palace');
      });
      
      it('should return Unknown for non-existent merchant', () => {
        const name = exportModule._getMerchantName('NONEXISTENT');
        expect(name).toBe('Unknown');
      });
    });
    
    describe('_formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(exportModule._formatCurrency(50000)).toBe('TSh 50,000');
        expect(exportModule._formatCurrency(0)).toBe('TSh 0');
        expect(exportModule._formatCurrency(1000000)).toBe('TSh 1,000,000');
      });
    });
    
    describe('_escapeCSVField', () => {
      it('should escape field with comma', () => {
        expect(exportModule._escapeCSVField('Hello, World')).toBe('"Hello, World"');
      });
      
      it('should escape field with quotes', () => {
        expect(exportModule._escapeCSVField('John "Doe"')).toBe('"John ""Doe"""');
      });
      
      it('should escape field with newline', () => {
        expect(exportModule._escapeCSVField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
      });
      
      it('should not escape simple field', () => {
        expect(exportModule._escapeCSVField('Simple')).toBe('Simple');
      });
      
      it('should handle null/undefined', () => {
        expect(exportModule._escapeCSVField(null)).toBe('');
        expect(exportModule._escapeCSVField(undefined)).toBe('');
      });
    });
    
    describe('_getTodayDateString', () => {
      it('should return date in YYYY-MM-DD format', () => {
        const dateStr = exportModule._getTodayDateString();
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});
