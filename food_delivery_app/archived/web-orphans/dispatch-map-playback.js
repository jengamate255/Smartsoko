/**
 * Historical Playback Module - Location History Query for SmartSoko Dispatch Map
 * 
 * This module provides historical driver playback functionality including:
 * - Location history query from Firestore sub-collection
 * - Timeline scrubber with time range display
 * - Pin interpolation between location points
 * - Play, pause, and reset controls
 * - Insufficient data handling
 * - Live update pausing during playback
 * 
 * @module PlaybackModule
 */

/**
 * Location history record structure
 * @typedef {Object} LocationHistoryRecord
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {Timestamp} timestamp - Location timestamp
 */

/**
 * Playback state structure
 * @typedef {Object} PlaybackState
 * @property {boolean} active - Whether playback is active
 * @property {string|null} driverId - Current driver ID
 * @property {string|null} orderId - Current order ID
 * @property {number} timelinePosition - Current timeline position (0-100)
 * @property {boolean} isPlaying - Whether playback is playing
 * @property {Array<LocationHistoryRecord>} history - Location history records
 * @property {Object|null} orderTimeRange - Order start and end times
 * @property {boolean} liveUpdatesPaused - Whether live updates are paused
 */

/**
 * Playback controls state
 * @typedef {Object} PlaybackControls
 * @property {HTMLButtonElement|null} playButton - Play button element
 * @property {HTMLButtonElement|null} pauseButton - Pause button element
 * @property {HTMLButtonElement|null} resetButton - Reset button element
 * @property {HTMLInputElement|null} timelineSlider - Timeline slider element
 * @property {HTMLElement|null} timeDisplay - Time display element
 * @property {HTMLElement|null} statusMessage - Status message element
 */

/**
 * Playback module for dispatch map
 */
export class PlaybackModule {
  /**
   * Create a new PlaybackModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    this.config = dispatchMap.config;
    
    // Playback state
    this.state = {
      active: false,
      driverId: null,
      orderId: null,
      timelinePosition: 0,
      isPlaying: false,
      history: [],
      orderTimeRange: null,
      liveUpdatesPaused: false,
      currentMarker: null,
      originalDriverMarker: null
    };
    
    // DOM elements
    this.controls = {
      playButton: null,
      pauseButton: null,
      resetButton: null,
      timelineSlider: null,
      timeDisplay: null,
      statusMessage: null,
      playbackPanel: null,
      driverInput: null,
      orderInput: null
    };
    
    // Animation frame ID
    this.animationFrameId = null;
    
    // Playback interval ID
    this.playbackIntervalId = null;
    
    // Current timestamp for interpolation
    this.currentTimestamp = null;
  }
  
  /**
   * Initialize the playback module
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Set up playback UI
      this._setupPlaybackUI();
      
      // Set up event listeners
      this._setupEventListeners();
      
      console.log('Playback module initialized');
    } catch (error) {
      console.error('Playback module initialization failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Set up playback UI elements
   * @private
   */
  _setupPlaybackUI() {
    // Create playback panel container
    const playbackPanel = document.createElement('div');
    playbackPanel.id = 'dispatch-playback-panel';
    playbackPanel.className = 'absolute bottom-4 right-4 z-20 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden';
    
    playbackPanel.innerHTML = `
      <div class="p-4 border-b border-gray-200 bg-[#012d1d] text-white">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="material-symbols-outlined">replay</span>
          Driver Playback
        </h3>
      </div>
      
      <div class="p-4 space-y-4">
        <!-- Input Section -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-[#414844] mb-1">Driver ID</label>
            <input 
              type="text" 
              id="playback-driver-id" 
              class="w-full px-3 py-2 border border-[#c1c8c2] rounded-lg text-sm focus:ring-2 focus:ring-[#012d1d] focus:border-transparent"
              placeholder="Driver ID"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#414844] mb-1">Order ID</label>
            <input 
              type="text" 
              id="playback-order-id" 
              class="w-full px-3 py-2 border border-[#c1c8c2] rounded-lg text-sm focus:ring-2 focus:ring-[#012d1d] focus:border-transparent"
              placeholder="Order ID"
            />
          </div>
        </div>
        
        <!-- Load Button -->
        <button 
          id="playback-load-history" 
          class="w-full bg-[#012d1d] text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-[#002114] transition-colors"
        >
          Load History
        </button>
        
        <!-- Status Message -->
        <div 
          id="playback-status-message" 
          class="p-3 rounded-lg text-sm hidden"
        ></div>
        
        <!-- Timeline Section -->
        <div id="playback-timeline-section" class="hidden space-y-3">
          <!-- Time Display -->
          <div class="flex justify-between items-center text-xs text-[#414844]">
            <span id="playback-start-time">Start</span>
            <span id="playback-current-time">--:--</span>
            <span id="playback-end-time">End</span>
          </div>
          
          <!-- Timeline Slider -->
          <input 
            type="range" 
            id="playback-timeline" 
            min="0" 
            max="100" 
            value="0" 
            class="w-full h-2 bg-[#eae8e4] rounded-lg appearance-none cursor-pointer"
            disabled
          />
          
          <!-- Playback Controls -->
          <div class="flex items-center justify-center gap-3">
            <button 
              id="playback-play" 
              class="w-10 h-10 bg-[#012d1d] text-white rounded-full flex items-center justify-center hover:bg-[#002114] transition-colors"
              disabled
            >
              <span class="material-symbols-outlined">play_arrow</span>
            </button>
            <button 
              id="playback-pause" 
              class="w-10 h-10 bg-[#eae8e4] text-[#414844] rounded-full flex items-center justify-center hover:bg-[#dcdad5] transition-colors"
              disabled
            >
              <span class="material-symbols-outlined">pause</span>
            </button>
            <button 
              id="playback-reset" 
              class="w-10 h-10 bg-[#eae8e4] text-[#414844] rounded-full flex items-center justify-center hover:bg-[#dcdad5] transition-colors"
              disabled
            >
              <span class="material-symbols-outlined">replay</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add to map container
    this.map.getContainer().appendChild(playbackPanel);
    
    // Store references
    this.controls.playbackPanel = playbackPanel;
    this.controls.driverInput = document.getElementById('playback-driver-id');
    this.controls.orderInput = document.getElementById('playback-order-id');
    this.controls.loadButton = document.getElementById('playback-load-history');
    this.controls.statusMessage = document.getElementById('playback-status-message');
    this.controls.timelineSection = document.getElementById('playback-timeline-section');
    this.controls.startTimeDisplay = document.getElementById('playback-start-time');
    this.controls.currentTimeDisplay = document.getElementById('playback-current-time');
    this.controls.endTimeDisplay = document.getElementById('playback-end-time');
    this.controls.timelineSlider = document.getElementById('playback-timeline');
    this.controls.playButton = document.getElementById('playback-play');
    this.controls.pauseButton = document.getElementById('playback-pause');
    this.controls.resetButton = document.getElementById('playback-reset');
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Load button click
    this.controls.loadButton.addEventListener('click', () => this._handleLoadHistory());
    
    // Timeline slider input
    this.controls.timelineSlider.addEventListener('input', (e) => this._handleTimelineInput(e));
    
    // Play button click
    this.controls.playButton.addEventListener('click', () => this._handlePlay());
    
    // Pause button click
    this.controls.pauseButton.addEventListener('click', () => this._handlePause());
    
    // Reset button click
    this.controls.resetButton.addEventListener('click', () => this._handleReset());
    
    // Map events
    this.map.on('moveend', () => this._handleMapMoveEnd());
  }
  
  /**
   * Handle load history button click
   * @private
   */
  async _handleLoadHistory() {
    const driverId = this.controls.driverInput.value.trim();
    const orderId = this.controls.orderInput.value.trim();
    
    if (!driverId || !orderId) {
      this._showStatusMessage('Please enter both Driver ID and Order ID', 'error');
      return;
    }
    
    try {
      this._showStatusMessage('Loading location history...', 'loading');
      
      // Query location history
      const history = await this._queryLocationHistory(driverId, orderId);
      
      if (history.length < 2) {
        this._showStatusMessage('Insufficient location data for this order', 'error');
        this._disablePlaybackControls();
        return;
      }
      
      // Store history and time range
      this.state.history = history;
      this.state.driverId = driverId;
      this.state.orderId = orderId;
      this.state.orderTimeRange = {
        start: history[0].timestamp,
        end: history[history.length - 1].timestamp
      };
      
      // Enable timeline controls
      this._enableTimelineControls();
      
      // Set initial timeline position
      this.controls.timelineSlider.value = 0;
      this._updateTimelineDisplay(0);
      
      // Show success message
      this._showStatusMessage(`Loaded ${history.length} location records`, 'success');
      
      // Pause live updates for this driver
      this.state.liveUpdatesPaused = true;
      
      // Store original driver marker if exists
      this.state.originalDriverMarker = this.dispatchMap.modules.playback?.state?.currentMarker;
      
      console.log('Location history loaded successfully');
      
    } catch (error) {
      console.error('Failed to load location history:', error);
      this._showStatusMessage('Failed to load location history', 'error');
      this.dispatchMap.state.health.mapboxErrors++;
    }
  }
  
  /**
   * Query location history from Firestore
   * @param {string} driverId - Driver ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Array<LocationHistoryRecord>>} Location history records
   * @private
   */
  async _queryLocationHistory(driverId, orderId) {
    try {
      const { db } = this.dispatchMap;
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      // Get order to determine time range
      const { doc, getDoc } = await import('firebase/firestore');
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const orderData = orderSnap.data();
      const startTime = orderData.createdAt;
      const endTime = orderData.deliveredAt || new Date();
      
      // Query location history sub-collection
      const historyRef = collection(db, 'drivers', driverId, 'location_history');
      const q = query(
        historyRef,
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime),
        orderBy('timestamp', 'asc')
      );
      
      const snap = await getDocs(q);
      
      const history = snap.docs.map(doc => ({
        lat: doc.data().lat,
        lng: doc.data().lng,
        timestamp: doc.data().timestamp
      }));
      
      return history;
      
    } catch (error) {
      console.error('Error querying location history:', error);
      throw error;
    }
  }
  
  /**
   * Enable timeline controls
   * @private
   */
  _enableTimelineControls() {
    this.controls.timelineSection.classList.remove('hidden');
    this.controls.timelineSlider.disabled = false;
    this.controls.playButton.disabled = false;
    this.controls.pauseButton.disabled = false;
    this.controls.resetButton.disabled = false;
    
    // Update time display
    if (this.state.history.length > 0) {
      const startTime = this.state.history[0].timestamp;
      const endTime = this.state.history[this.state.history.length - 1].timestamp;
      
      this.controls.startTimeDisplay.textContent = this._formatTime(startTime);
      this.controls.endTimeDisplay.textContent = this._formatTime(endTime);
    }
  }
  
  /**
   * Disable playback controls
   * @private
   */
  _disablePlaybackControls() {
    this.controls.timelineSection.classList.add('hidden');
    this.controls.timelineSlider.disabled = true;
    this.controls.playButton.disabled = true;
    this.controls.pauseButton.disabled = true;
    this.controls.resetButton.disabled = true;
  }
  
  /**
   * Show status message
   * @param {string} message - Message text
   * @param {string} type - Message type (success, error, loading)
   * @private
   */
  _showStatusMessage(message, type) {
    this.controls.statusMessage.textContent = message;
    this.controls.statusMessage.className = `p-3 rounded-lg text-sm ${type === 'error' ? 'bg-red-50 text-red-600' : type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`;
    this.controls.statusMessage.classList.remove('hidden');
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        this.controls.statusMessage.classList.add('hidden');
      }, 3000);
    }
  }
  
  /**
   * Handle timeline slider input
   * @param {Event} e - Input event
   * @private
   */
  _handleTimelineInput(e) {
    const position = parseInt(e.target.value, 10);
    this._updateTimelineDisplay(position);
  }
  
  /**
   * Update timeline display based on position
   * @param {number} position - Timeline position (0-100)
   * @private
   */
  _updateTimelineDisplay(position) {
    this.state.timelinePosition = position;
    
    // Calculate current timestamp
    if (this.state.history.length < 2) return;
    
    const startTime = this.state.history[0].timestamp;
    const endTime = this.state.history[this.state.history.length - 1].timestamp;
    const totalTime = endTime - startTime;
    const currentTime = startTime + (totalTime * position / 100);
    
    this.currentTimestamp = currentTime;
    this.controls.currentTimeDisplay.textContent = this._formatTime(currentTime);
    
    // Interpolate position
    const positionData = this._interpolatePosition(currentTime);
    
    // Update marker
    this._updateDriverMarker(positionData);
  }
  
  /**
   * Interpolate position at given timestamp
   * @param {number} timestamp - Target timestamp
   * @returns {Object|null} Interpolated position { lat, lng } or null
   * @private
   */
  _interpolatePosition(timestamp) {
    if (this.state.history.length < 2) return null;
    
    // Find the two closest records
    let prevRecord = this.state.history[0];
    let nextRecord = this.state.history[1];
    
    for (let i = 0; i < this.state.history.length - 1; i++) {
      const curr = this.state.history[i];
      const next = this.state.history[i + 1];
      
      if (curr.timestamp <= timestamp && next.timestamp >= timestamp) {
        prevRecord = curr;
        nextRecord = next;
        break;
      }
    }
    
    // Calculate interpolation factor
    const totalTime = nextRecord.timestamp - prevRecord.timestamp;
    const elapsed = timestamp - prevRecord.timestamp;
    const factor = totalTime > 0 ? elapsed / totalTime : 0;
    
    // Interpolate coordinates
    const lat = prevRecord.lat + (nextRecord.lat - prevRecord.lat) * factor;
    const lng = prevRecord.lng + (nextRecord.lng - prevRecord.lng) * factor;
    
    return { lat, lng };
  }
  
  /**
   * Update driver marker at position
   * @param {Object|null} position - Position { lat, lng } or null
   * @private
   */
  _updateDriverMarker(position) {
    if (!position || !this.map) return;
    
    // Remove existing marker if present
    if (this.state.currentMarker) {
      this.state.currentMarker.remove();
    }
    
    // Create new marker
    const el = document.createElement('div');
    el.className = 'map-marker';
    el.style.backgroundColor = '#934b00'; // Amber color for playback
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';
    el.innerHTML = `<span class="material-symbols-outlined text-white text-sm" style="font-variation-settings: 'FILL' 1;">history</span>`;
    
    const marker = new mapboxgl.Marker(el)
      .setLngLat([position.lng, position.lat])
      .addTo(this.map);
    
    this.state.currentMarker = marker;
    
    // Fly to position
    this.map.flyTo({
      center: [position.lng, position.lat],
      zoom: 15,
      essential: true
    });
  }
  
  /**
   * Handle play button click
   * @private
   */
  _handlePlay() {
    if (this.state.isPlaying || this.state.history.length < 2) return;
    
    this.state.isPlaying = true;
    this.controls.playButton.disabled = true;
    this.controls.pauseButton.disabled = false;
    
    // Start playback animation
    this._startPlaybackAnimation();
  }
  
  /**
   * Start playback animation
   * @private
   */
  _startPlaybackAnimation() {
    const startTime = this.state.history[0].timestamp;
    const endTime = this.state.history[this.state.history.length - 1].timestamp;
    const totalTime = endTime - startTime;
    
    const animate = () => {
      if (!this.state.isPlaying) return;
      
      const currentTime = this.currentTimestamp || startTime;
      const elapsed = currentTime - startTime;
      
      if (elapsed >= totalTime) {
        // Playback complete
        this._handlePause();
        this.controls.timelineSlider.value = 100;
        this._updateTimelineDisplay(100);
        return;
      }
      
      // Update position
      const position = (elapsed / totalTime) * 100;
      this.controls.timelineSlider.value = position;
      this._updateTimelineDisplay(position);
      
      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Handle pause button click
   * @private
   */
  _handlePause() {
    this.state.isPlaying = false;
    this.controls.playButton.disabled = false;
    this.controls.pauseButton.disabled = true;
    
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Handle reset button click
   * @private
   */
  _handleReset() {
    this._handlePause();
    
    // Reset to start
    this.controls.timelineSlider.value = 0;
    this._updateTimelineDisplay(0);
    
    // Reset state
    this.state.timelinePosition = 0;
    this.currentTimestamp = null;
  }
  
  /**
   * Handle map move end
   * @private
   */
  _handleMapMoveEnd() {
    // Update previous viewport state
    if (this.state.previousViewport) {
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      this.state.previousViewport = { center, zoom };
    }
  }
  
  /**
   * Format timestamp to readable time
   * @param {Timestamp|Date} timestamp - Timestamp to format
   * @returns {string} Formatted time string
   * @private
   */
  _formatTime(timestamp) {
    if (!timestamp) return '--:--';
    
    const date = timestamp.toDate ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  /**
   * Update playback state when data changes
   * @param {Array} orders - Updated orders
   */
  ordersUpdated(orders) {
    // Check if current order is in the updated list
    if (this.state.orderId) {
      const order = orders.find(o => o.id === this.state.orderId);
      if (order && order.deliveredAt) {
        // Order was delivered, update end time
        this.state.orderTimeRange.end = order.deliveredAt;
      }
    }
  }
  
  /**
   * Update playback state when drivers change
   * @param {Array} drivers - Updated drivers
   */
  driversUpdated(drivers) {
    // Check if current driver is in the updated list
    if (this.state.driverId) {
      const driver = drivers.find(d => d.id === this.state.driverId);
      if (driver && this.state.liveUpdatesPaused) {
        // Check if driver is no longer active
        if (!driver.isOnline && !driver.currentOrder) {
          // Resume live updates
          this.state.liveUpdatesPaused = false;
        }
      }
    }
  }
  
  /**
   * Destroy the playback module
   */
  destroy() {
    // Pause playback
    this._handlePause();
    
    // Remove marker
    if (this.state.currentMarker) {
      this.state.currentMarker.remove();
      this.state.currentMarker = null;
    }
    
    // Remove DOM elements
    if (this.controls.playbackPanel) {
      this.controls.playbackPanel.remove();
    }
    
    // Remove map event listeners
    this.map.off('moveend', () => {});
    
    console.log('Playback module destroyed');
  }
}
