/**
 * Health Panel Module Unit Tests
 * 
 * Tests for the Map Health Panel module functionality.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { HealthModule } from './dispatch-map-health.js';
import { DispatchMap } from './dispatch-map.js';

describe('HealthModule', () => {
  let dispatchMap;
  let healthModule;
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
    
    // Create HealthModule instance
    healthModule = new HealthModule(dispatchMap);
  });
  
  afterEach(() => {
    // Clean up
    if (healthModule) {
      healthModule.destroy();
    }
    
    if (dispatchMap) {
      dispatchMap.destroy();
    }
    
    const container = document.getElementById(testMapElementId);
    if (container) {
      container.remove();
    }
    
    // Remove injected styles
    const styleElement = document.getElementById('health-panel-styles');
    if (styleElement) {
      styleElement.remove();
    }
  });
  
  describe('Initialization', () => {
    it('should create instance with correct properties', () => {
      expect(healthModule).toBeInstanceOf(HealthModule);
      expect(healthModule.dispatchMap).toBe(dispatchMap);
      expect(healthModule.panelElement).toBeNull();
      expect(healthModule.updateInterval).toBeNull();
    });
    
    it('should initialize with default config', () => {
      expect(healthModule.config).toHaveProperty('updateIntervalMs');
      expect(healthModule.config).toHaveProperty('warningThreshold');
      expect(healthModule.config).toHaveProperty('disconnectionTimeoutMs');
      expect(healthModule.config.updateIntervalMs).toBe(1000);
      expect(healthModule.config.warningThreshold).toBe(0);
      expect(healthModule.config.disconnectionTimeoutMs).toBe(5000);
    });
    
    it('should create panel UI on init', async () => {
      await healthModule.init();
      
      expect(healthModule.panelElement).not.toBeNull();
      expect(healthModule.panelElement.id).toBe('dispatch-map-health-panel');
      expect(healthModule.panelElement.className).toContain('health-panel');
      
      // Verify element references
      expect(healthModule.lastRefreshElement).not.toBeNull();
      expect(healthModule.driverCountElement).not.toBeNull();
      expect(healthModule.geocodeFailuresElement).not.toBeNull();
      expect(healthModule.mapboxErrorsElement).not.toBeNull();
      expect(healthModule.firestoreStatusElement).not.toBeNull();
    });
    
    it('should set up update interval on init', async () => {
      await healthModule.init();
      
      expect(healthModule.updateInterval).not.toBeNull();
      expect(typeof healthModule.updateInterval).toBe('number');
    });
    
    it('should inject CSS styles on init', async () => {
      await healthModule.init();
      
      const styleElement = document.getElementById('health-panel-styles');
      expect(styleElement).not.toBeNull();
      expect(styleElement.textContent).toContain('.health-panel');
    });
    
    it('should append panel to map container', async () => {
      await healthModule.init();
      
      const container = document.getElementById(testMapElementId);
      expect(container.contains(healthModule.panelElement)).toBe(true);
    });
  });
  
  describe('Panel Display Updates', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should display last refresh timestamp', () => {
      const now = new Date();
      dispatchMap.state.health.lastRefresh = now;
      
      healthModule.update();
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const expectedTime = `${hours}:${minutes}:${seconds}`;
      
      expect(healthModule.lastRefreshElement.textContent).toBe(expectedTime);
    });
    
    it('should display -- when no refresh timestamp', () => {
      dispatchMap.state.health.lastRefresh = null;
      
      healthModule.update();
      
      expect(healthModule.lastRefreshElement.textContent).toBe('--:--:--');
    });
    
    it('should display GPS driver count', () => {
      dispatchMap.state.health.driversWithGPS = 5;
      dispatchMap.state.health.totalDrivers = 10;
      
      healthModule.update();
      
      expect(healthModule.driverCountElement.textContent).toBe('5 / 10');
    });
    
    it('should display 0 / 0 when no drivers', () => {
      dispatchMap.state.health.driversWithGPS = 0;
      dispatchMap.state.health.totalDrivers = 0;
      
      healthModule.update();
      
      expect(healthModule.driverCountElement.textContent).toBe('0 / 0');
    });
    
    it('should display geocode failure count', () => {
      dispatchMap.state.health.geocodeFailures = 3;
      
      healthModule.update();
      
      expect(healthModule.geocodeFailuresElement.textContent).toBe('3');
    });
    
    it('should display Mapbox error count', () => {
      dispatchMap.state.health.mapboxErrors = 2;
      
      healthModule.update();
      
      expect(healthModule.mapboxErrorsElement.textContent).toBe('2');
    });
    
    it('should display Firestore connected status', () => {
      dispatchMap.state.health.firestoreConnected = true;
      
      healthModule.update();
      
      expect(healthModule.firestoreStatusElement.textContent).toBe('Connected');
      expect(healthModule.firestoreStatusElement.classList.contains('disconnected')).toBe(false);
    });
    
    it('should display Firestore disconnected status', () => {
      dispatchMap.state.health.firestoreConnected = false;
      
      healthModule.update();
      
      expect(healthModule.firestoreStatusElement.textContent).toBe('Disconnected');
      expect(healthModule.firestoreStatusElement.classList.contains('disconnected')).toBe(true);
    });
  });
  
  describe('Warning Counter Coloring', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should apply warning class when geocode failures > 0', () => {
      dispatchMap.state.health.geocodeFailures = 1;
      
      healthModule.update();
      
      expect(healthModule.geocodeFailuresElement.classList.contains('warning')).toBe(true);
    });
    
    it('should not apply warning class when geocode failures = 0', () => {
      dispatchMap.state.health.geocodeFailures = 0;
      
      healthModule.update();
      
      expect(healthModule.geocodeFailuresElement.classList.contains('warning')).toBe(false);
    });
    
    it('should apply warning class when Mapbox errors > 0', () => {
      dispatchMap.state.health.mapboxErrors = 1;
      
      healthModule.update();
      
      expect(healthModule.mapboxErrorsElement.classList.contains('warning')).toBe(true);
    });
    
    it('should not apply warning class when Mapbox errors = 0', () => {
      dispatchMap.state.health.mapboxErrors = 0;
      
      healthModule.update();
      
      expect(healthModule.mapboxErrorsElement.classList.contains('warning')).toBe(false);
    });
    
    it('should remove warning class when counter decreases to 0', () => {
      dispatchMap.state.health.geocodeFailures = 5;
      healthModule.update();
      expect(healthModule.geocodeFailuresElement.classList.contains('warning')).toBe(true);
      
      dispatchMap.state.health.geocodeFailures = 0;
      healthModule.update();
      expect(healthModule.geocodeFailuresElement.classList.contains('warning')).toBe(false);
    });
  });
  
  describe('Event Handlers', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should update on ordersUpdated event', () => {
      const updateSpy = vi.spyOn(healthModule, 'update');
      
      healthModule.ordersUpdated([]);
      
      expect(updateSpy).toHaveBeenCalled();
    });
    
    it('should update on driversUpdated event', () => {
      const updateSpy = vi.spyOn(healthModule, 'update');
      
      healthModule.driversUpdated([]);
      
      expect(updateSpy).toHaveBeenCalled();
    });
    
    it('should update on merchantsUpdated event', () => {
      const updateSpy = vi.spyOn(healthModule, 'update');
      
      healthModule.merchantsUpdated([]);
      
      expect(updateSpy).toHaveBeenCalled();
    });
    
    it('should update on zonesUpdated event', () => {
      const updateSpy = vi.spyOn(healthModule, 'update');
      
      healthModule.zonesUpdated([]);
      
      expect(updateSpy).toHaveBeenCalled();
    });
  });
  
  describe('Cleanup', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should clear update interval on destroy', () => {
      const intervalId = healthModule.updateInterval;
      expect(intervalId).not.toBeNull();
      
      healthModule.destroy();
      
      expect(healthModule.updateInterval).toBeNull();
    });
    
    it('should remove panel element on destroy', () => {
      const container = document.getElementById(testMapElementId);
      expect(container.contains(healthModule.panelElement)).toBe(true);
      
      healthModule.destroy();
      
      expect(healthModule.panelElement).toBeNull();
    });
    
    it('should clear element references on destroy', () => {
      healthModule.destroy();
      
      expect(healthModule.lastRefreshElement).toBeNull();
      expect(healthModule.driverCountElement).toBeNull();
      expect(healthModule.geocodeFailuresElement).toBeNull();
      expect(healthModule.mapboxErrorsElement).toBeNull();
      expect(healthModule.firestoreStatusElement).toBeNull();
    });
  });
  
  describe('Edge Cases', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should handle update when panel element is null', () => {
      healthModule.panelElement = null;
      
      expect(() => {
        healthModule.update();
      }).not.toThrow();
    });
    
    it('should handle large counter values', () => {
      dispatchMap.state.health.geocodeFailures = 999999;
      
      healthModule.update();
      
      expect(healthModule.geocodeFailuresElement.textContent).toBe('999999');
    });
    
    it('should handle rapid timestamp updates', () => {
      const now = new Date();
      dispatchMap.state.health.lastRefresh = now;
      
      healthModule.update();
      const firstText = healthModule.lastRefreshElement.textContent;
      
      // Update again immediately
      healthModule.update();
      const secondText = healthModule.lastRefreshElement.textContent;
      
      // Should be the same or very similar
      expect(firstText).toBe(secondText);
    });
    
    it('should handle driver count edge cases', () => {
      // More drivers with GPS than total (shouldn't happen but handle gracefully)
      dispatchMap.state.health.driversWithGPS = 10;
      dispatchMap.state.health.totalDrivers = 5;
      
      healthModule.update();
      
      expect(healthModule.driverCountElement.textContent).toBe('10 / 5');
    });
  });
  
  describe('Accessibility', () => {
    beforeEach(async () => {
      await healthModule.init();
    });
    
    it('should have proper ARIA attributes', () => {
      expect(healthModule.panelElement.getAttribute('role')).toBe('status');
      expect(healthModule.panelElement.getAttribute('aria-label')).toBe('Map health status');
    });
    
    it('should have semantic HTML structure', () => {
      const content = healthModule.panelElement.querySelector('.health-panel-content');
      expect(content).not.toBeNull();
      
      const metrics = healthModule.panelElement.querySelectorAll('.health-metric');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});
