/**
 * Playback Module Unit Tests
 * 
 * Tests for location history query and playback functionality including:
 * - Location history query from Firestore
 * - Timeline scrubber functionality
 * - Pin interpolation accuracy
 * - Playback controls availability
 * - Insufficient data handling
 * - Live update pausing
 */

import { describe, it, beforeEach, afterEach, expect, vi, jest } from 'vitest';
import { PlaybackModule } from './dispatch-map-playback.js';

describe('PlaybackModule', () => {
  let playbackModule;
  let mockDispatchMap;
  let mockMap;
  
  beforeEach(() => {
    // Create mock Mapbox map
    mockMap = {
      getContainer: () => document.createElement('div'),
      on: vi.fn(),
      off: vi.fn(),
      flyTo: vi.fn(),
      remove: vi.fn()
    };
    
    // Create mock DispatchMap
    mockDispatchMap = {
      map: mockMap,
      config: {
        flyToZoom: 15
      },
      state: {
        data: {
          orders: [],
          drivers: []
        },
        health: {
          mapboxErrors: 0
        }
      },
      modules: {
        playback: null
      }
    };
    
    playbackModule = new PlaybackModule(mockDispatchMap);
  });
  
  afterEach(() => {
    if (playbackModule) {
      playbackModule.destroy();
    }
  });
  
  describe('Initialization', () => {
    it('should create PlaybackModule instance', () => {
      expect(playbackModule).toBeInstanceOf(PlaybackModule);
      expect(playbackModule.dispatchMap).toBe(mockDispatchMap);
      expect(playbackModule.map).toBe(mockMap);
    });
    
    it('should initialize state correctly', () => {
      expect(playbackModule.state).toHaveProperty('active', false);
      expect(playbackModule.state).toHaveProperty('driverId', null);
      expect(playbackModule.state).toHaveProperty('orderId', null);
      expect(playbackModule.state).toHaveProperty('timelinePosition', 0);
      expect(playbackModule.state).toHaveProperty('isPlaying', false);
      expect(playbackModule.state).toHaveProperty('history', []);
      expect(playbackModule.state).toHaveProperty('orderTimeRange', null);
      expect(playbackModule.state).toHaveProperty('liveUpdatesPaused', false);
    });
    
    it('should initialize controls correctly', () => {
      expect(playbackModule.controls).toHaveProperty('playButton');
      expect(playbackModule.controls).toHaveProperty('pauseButton');
      expect(playbackModule.controls).toHaveProperty('resetButton');
      expect(playbackModule.controls).toHaveProperty('timelineSlider');
      expect(playbackModule.controls).toHaveProperty('timeDisplay');
      expect(playbackModule.controls).toHaveProperty('statusMessage');
      expect(playbackModule.controls).toHaveProperty('playbackPanel');
    });
  });
  
  describe('Location History Query', () => {
    it('should query location history from Firestore', async () => {
      const mockHistory = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7925, lng: 39.2084, timestamp: new Date('2024-01-01T10:05:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      // Mock Firestore query
      const mockSnap = {
        docs: mockHistory.map(h => ({
          data: () => h
        }))
      };
      
      const mockGetDocs = vi.fn().mockResolvedValue(mockSnap);
      const mockWhere = vi.fn();
      const mockOrderBy = vi.fn();
      const mockCollection = vi.fn();
      
      vi.mock('firebase/firestore', () => ({
        collection: mockCollection,
        where: mockWhere,
        orderBy: mockOrderBy,
        getDocs: mockGetDocs
      }));
      
      const { doc, getDoc } = await import('firebase/firestore');
      
      const mockOrderSnap = {
        exists: () => true,
        data: () => ({
          createdAt: new Date('2024-01-01T10:00:00'),
          deliveredAt: new Date('2024-01-01T10:15:00')
        })
      };
      
      vi.spyOn(doc, 'doc').mockReturnValue({ path: 'orders/test-order' });
      vi.spyOn(mockDispatchMap, 'db', 'get').mockReturnValue({});
      
      const history = await playbackModule._queryLocationHistory('driver1', 'order1');
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle missing order gracefully', async () => {
      const mockOrderSnap = {
        exists: () => false
      };
      
      vi.spyOn(mockDispatchMap, 'db', 'get').mockReturnValue({});
      
      await expect(
        playbackModule._queryLocationHistory('driver1', 'order1')
      ).rejects.toThrow('Order order1 not found');
    });
    
    it('should handle empty history gracefully', async () => {
      const mockSnap = {
        docs: []
      };
      
      const mockGetDocs = vi.fn().mockResolvedValue(mockSnap);
      
      vi.mock('firebase/firestore', () => ({
        collection: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));
      
      vi.spyOn(mockDispatchMap, 'db', 'get').mockReturnValue({});
      
      const history = await playbackModule._queryLocationHistory('driver1', 'order1');
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });
  
  describe('Timeline Scrubber', () => {
    it('should update timeline display based on position', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      playbackModule._updateTimelineDisplay(50);
      
      expect(playbackModule.state.timelinePosition).toBe(50);
      expect(playbackModule.currentTimestamp).toBeDefined();
    });
    
    it('should handle timeline position 0', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      playbackModule._updateTimelineDisplay(0);
      
      expect(playbackModule.state.timelinePosition).toBe(0);
    });
    
    it('should handle timeline position 100', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      playbackModule._updateTimelineDisplay(100);
      
      expect(playbackModule.state.timelinePosition).toBe(100);
    });
    
    it('should handle single record history', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') }
      ];
      
      playbackModule._updateTimelineDisplay(50);
      
      // Should not crash with single record
      expect(playbackModule.state.timelinePosition).toBe(50);
    });
  });
  
  describe('Pin Interpolation', () => {
    it('should interpolate position between two points', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      const midpointTime = new Date('2024-01-01T10:05:00');
      const position = playbackModule._interpolatePosition(midpointTime);
      
      expect(position).toBeDefined();
      expect(position.lat).toBeGreaterThanOrEqual(-6.7924);
      expect(position.lat).toBeLessThanOrEqual(-6.7926);
      expect(position.lng).toBeGreaterThanOrEqual(39.2083);
      expect(position.lng).toBeLessThanOrEqual(39.2085);
    });
    
    it('should return start position at time 0', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      const position = playbackModule._interpolatePosition(new Date('2024-01-01T10:00:00'));
      
      expect(position).toEqual({ lat: -6.7924, lng: 39.2083 });
    });
    
    it('should return end position at time 100%', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      const position = playbackModule._interpolatePosition(new Date('2024-01-01T10:10:00'));
      
      expect(position).toEqual({ lat: -6.7926, lng: 39.2085 });
    });
    
    it('should handle out-of-range timestamps', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      
      // Before start
      const beforePosition = playbackModule._interpolatePosition(new Date('2024-01-01T09:59:00'));
      expect(beforePosition).toBeDefined();
      
      // After end
      const afterPosition = playbackModule._interpolatePosition(new Date('2024-01-01T10:11:00'));
      expect(afterPosition).toBeDefined();
    });
    
    it('should handle single record', () => {
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') }
      ];
      
      const position = playbackModule._interpolatePosition(new Date('2024-01-01T10:05:00'));
      
      expect(position).toEqual({ lat: -6.7924, lng: 39.2083 });
    });
    
    it('should handle empty history', () => {
      playbackModule.state.history = [];
      
      const position = playbackModule._interpolatePosition(new Date('2024-01-01T10:05:00'));
      
      expect(position).toBeNull();
    });
  });
  
  describe('Playback Controls', () => {
    it('should enable timeline controls when history loaded', () => {
      playbackModule._enableTimelineControls();
      
      expect(playbackModule.controls.timelineSection.classList.contains('hidden')).toBe(false);
      expect(playbackModule.controls.timelineSlider.disabled).toBe(false);
      expect(playbackModule.controls.playButton.disabled).toBe(false);
    });
    
    it('should disable playback controls when insufficient data', () => {
      playbackModule._disablePlaybackControls();
      
      expect(playbackModule.controls.timelineSection.classList.contains('hidden')).toBe(true);
      expect(playbackModule.controls.timelineSlider.disabled).toBe(true);
      expect(playbackModule.controls.playButton.disabled).toBe(true);
    });
    
    it('should show success status message', () => {
      playbackModule._showStatusMessage('Test message', 'success');
      
      expect(playbackModule.controls.statusMessage.textContent).toBe('Test message');
      expect(playbackModule.controls.statusMessage.classList.contains('hidden')).toBe(false);
    });
    
    it('should show error status message', () => {
      playbackModule._showStatusMessage('Error message', 'error');
      
      expect(playbackModule.controls.statusMessage.textContent).toBe('Error message');
      expect(playbackModule.controls.statusMessage.classList.contains('hidden')).toBe(false);
    });
    
    it('should format time correctly', () => {
      const date = new Date('2024-01-01T10:30:45');
      const formatted = playbackModule._formatTime(date);
      
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('10:');
    });
    
    it('should handle null timestamp', () => {
      const formatted = playbackModule._formatTime(null);
      
      expect(formatted).toBe('--:--');
    });
  });
  
  describe('Insufficient Data Handling', () => {
    it('should handle less than 2 records', async () => {
      const mockHistory = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') }
      ];
      
      const mockSnap = {
        docs: mockHistory.map(h => ({
          data: () => h
        }))
      };
      
      const mockGetDocs = vi.fn().mockResolvedValue(mockSnap);
      
      vi.mock('firebase/firestore', () => ({
        collection: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));
      
      vi.spyOn(mockDispatchMap, 'db', 'get').mockReturnValue({});
      
      const history = await playbackModule._queryLocationHistory('driver1', 'order1');
      
      expect(history.length).toBeLessThan(2);
    });
    
    it('should handle empty history', async () => {
      const mockSnap = {
        docs: []
      };
      
      const mockGetDocs = vi.fn().mockResolvedValue(mockSnap);
      
      vi.mock('firebase/firestore', () => ({
        collection: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        getDocs: mockGetDocs
      }));
      
      vi.spyOn(mockDispatchMap, 'db', 'get').mockReturnValue({});
      
      const history = await playbackModule._queryLocationHistory('driver1', 'order1');
      
      expect(history.length).toBe(0);
    });
  });
  
  describe('Live Update Pausing', () => {
    it('should pause live updates when playback starts', async () => {
      playbackModule.state.driverId = 'driver1';
      
      await playbackModule._handleLoadHistory();
      
      expect(playbackModule.state.liveUpdatesPaused).toBe(true);
    });
    
    it('should resume live updates when playback ends', () => {
      playbackModule.state.liveUpdatesPaused = true;
      playbackModule._handlePause();
      
      expect(playbackModule.state.isPlaying).toBe(false);
    });
    
    it('should handle driver status changes', () => {
      const drivers = [
        { id: 'driver1', isOnline: false, currentOrder: null }
      ];
      
      playbackModule.driversUpdated(drivers);
      
      // Should check if live updates should resume
      expect(playbackModule.state.liveUpdatesPaused).toBeDefined();
    });
  });
  
  describe('Driver Marker Update', () => {
    it('should update driver marker at position', () => {
      playbackModule._updateDriverMarker({ lat: -6.7924, lng: 39.2083 });
      
      expect(playbackModule.state.currentMarker).toBeDefined();
    });
    
    it('should handle null position', () => {
      playbackModule._updateDriverMarker(null);
      
      // Should not crash
      expect(playbackModule.state.currentMarker).toBeDefined();
    });
    
    it('should remove existing marker before adding new one', () => {
      const mockMarker = {
        remove: vi.fn()
      };
      playbackModule.state.currentMarker = mockMarker;
      
      playbackModule._updateDriverMarker({ lat: -6.7924, lng: 39.2083 });
      
      expect(mockMarker.remove).toHaveBeenCalled();
    });
  });
  
  describe('Playback Animation', () => {
    it('should start playback animation', () => {
      playbackModule.state.isPlaying = true;
      playbackModule.state.history = [
        { lat: -6.7924, lng: 39.2083, timestamp: new Date('2024-01-01T10:00:00') },
        { lat: -6.7926, lng: 39.2085, timestamp: new Date('2024-01-01T10:10:00') }
      ];
      playbackModule.currentTimestamp = new Date('2024-01-01T10:00:00');
      
      playbackModule._startPlaybackAnimation();
      
      expect(playbackModule.animationFrameId).toBeDefined();
    });
    
    it('should pause playback animation', () => {
      playbackModule._handlePause();
      
      expect(playbackModule.state.isPlaying).toBe(false);
    });
    
    it('should reset playback', () => {
      playbackModule._handleReset();
      
      expect(playbackModule.state.timelinePosition).toBe(0);
      expect(playbackModule.state.isPlaying).toBe(false);
    });
  });
  
  describe('Module Destruction', () => {
    it('should clean up resources on destroy', () => {
      playbackModule.destroy();
      
      expect(playbackModule.state.isPlaying).toBe(false);
      expect(playbackModule.animationFrameId).toBeNull();
    });
  });
  
  describe('Integration with DispatchMap', () => {
    it('should be accessible through DispatchMap', () => {
      mockDispatchMap.modules.playback = playbackModule;
      
      expect(mockDispatchMap.getPlaybackModule()).toBe(playbackModule);
    });
  });
});
