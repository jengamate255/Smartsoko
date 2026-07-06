/**
 * Search Module - Search and Fly-To Functionality for SmartSoko Dispatch Map
 * 
 * This module provides search functionality for orders, drivers, and addresses,
 * with fly-to animation and popup auto-open capabilities.
 * 
 * Features:
 * - Case-insensitive search
 * - Partial string matching
 * - Fuzzy matching for better UX
 * - Relevance ranking
 * - Debouncing for performance
 * - 500ms SLA for search results
 * 
 * @module SearchModule
 */

/**
 * Search result type
 * @typedef {'order' | 'driver' | 'merchant'} SearchResultType
 */

/**
 * Search result object
 * @typedef {Object} SearchResult
 * @property {SearchResultType} type - Type of result (order, driver, merchant)
 * @property {string} id - Document ID
 * @property {string} label - Display label
 * @property {Object|null} coordinates - { lat, lng } coordinates or null
 * @property {Object} originalData - Original document data
 * @property {number} relevance - Relevance score (0-100)
 */

/**
 * Search module for dispatch map
 */
export class SearchModule {
  /**
   * Create a new SearchModule instance
   * @param {Object} dispatchMap - The DispatchMap instance
   */
  constructor(dispatchMap) {
    this.dispatchMap = dispatchMap;
    this.map = dispatchMap.map;
    
    // Search state
    this.state = {
      query: '',
      results: [],
      selectedIndex: 0,
      isOpen: false,
      previousViewport: null
    };
    
    // DOM elements
    this.searchInput = null;
    this.resultsPanel = null;
    this.noResultsMessage = null;
    
    // Debounce timer
    this.debounceTimer = null;
    
    // Search timeout
    this.searchTimeout = null;
  }
  
  /**
   * Initialize the search module
   * @returns {Promise<void>}
   */
  async init() {
    // Set up search input and results panel
    this._setupSearchUI();
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('Search module initialized');
  }
  
  /**
   * Set up search UI elements
   * @private
   */
  _setupSearchUI() {
    // Create search container if it doesn't exist
    const searchContainer = document.createElement('div');
    searchContainer.id = 'dispatch-search-container';
    searchContainer.className = 'absolute top-4 left-4 z-20 w-96';
    
    // Create search input
    const searchInput = document.createElement('div');
    searchInput.className = 'relative';
    
    searchInput.innerHTML = `
      <input 
        type="text" 
        id="dispatch-search-input" 
        class="w-full pl-10 pr-4 py-3 bg-white rounded-lg shadow-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        placeholder="Search orders, drivers, addresses..."
      />
      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
    `;
    
    // Create results panel
    const resultsPanel = document.createElement('div');
    resultsPanel.id = 'dispatch-search-results';
    resultsPanel.className = 'absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden hidden';
    
    // Create results list
    const resultsList = document.createElement('div');
    resultsList.id = 'dispatch-search-results-list';
    resultsList.className = 'max-h-96 overflow-y-auto';
    
    // Create no results message
    const noResultsMessage = document.createElement('div');
    noResultsMessage.id = 'dispatch-search-no-results';
    noResultsMessage.className = 'p-4 text-center text-gray-500 hidden';
    noResultsMessage.innerHTML = `
      <span class="material-symbols-outlined text-4xl mb-2 block">search_off</span>
      <p>No results found</p>
    `;
    
    resultsList.appendChild(noResultsMessage);
    resultsPanel.appendChild(resultsList);
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(resultsPanel);
    
    // Add to map container
    this.map.getContainer().appendChild(searchContainer);
    
    // Store references
    this.searchInput = document.getElementById('dispatch-search-input');
    this.resultsPanel = document.getElementById('dispatch-search-results');
    this.resultsList = document.getElementById('dispatch-search-results-list');
    this.noResultsMessage = document.getElementById('dispatch-search-no-results');
    
    // Add keyboard navigation support
    this.resultsList.addEventListener('keydown', (e) => this._handleKeyboardNavigation(e));
  }
  
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Search input events
    this.searchInput.addEventListener('input', (e) => this._handleSearchInput(e));
    this.searchInput.addEventListener('focus', () => this._handleFocus());
    this.searchInput.addEventListener('blur', () => this._handleBlur());
    this.searchInput.addEventListener('keydown', (e) => this._handleInputKeydown(e));
    
    // Click outside to close
    document.addEventListener('click', (e) => this._handleClickOutside(e));
    
    // Map events
    this.map.on('moveend', () => this._handleMapMoveEnd());
  }
  
  /**
   * Handle search input changes with debouncing
   * @param {Event} e - Input event
   * @private
   */
  _handleSearchInput(e) {
    const query = e.target.value.trim();
    
    // Clear previous debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Clear previous search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Update state
    this.state.query = query;
    
    if (!query) {
      // Empty query - close results panel
      this.closeResults();
      return;
    }
    
    // Debounce search
    this.debounceTimer = setTimeout(async () => {
      try {
        // Set timeout for search operation
        this.searchTimeout = setTimeout(() => {
          console.warn('Search operation timed out');
          this.state.results = [];
          this._renderResults();
        }, this.dispatchMap.config.searchTimeoutMs);
        
        // Perform search
        const results = await this._search(query);
        
        // Clear timeout if search completed
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = null;
        }
        
        // Update results
        this.state.results = results;
        this.state.selectedIndex = 0;
        this._renderResults();
        
      } catch (error) {
        console.error('Search failed:', error);
        this.state.results = [];
        this._renderResults();
      }
    }, this.dispatchMap.config.searchDebounceMs);
  }
  
  /**
   * Handle focus on search input
   * @private
   */
  _handleFocus() {
    if (this.state.results.length > 0) {
      this.resultsPanel.classList.remove('hidden');
    }
  }
  
  /**
   * Handle blur on search input
   * @private
   */
  _handleBlur() {
    // Close after a short delay to allow clicking on results
    setTimeout(() => {
      this.closeResults();
    }, 200);
  }
  
  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _handleKeyboardNavigation(e) {
    if (!this.state.isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._selectNextResult();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._selectPreviousResult();
        break;
      case 'Enter':
        e.preventDefault();
        this._selectCurrentResult();
        break;
      case 'Escape':
        this.closeResults();
        break;
    }
  }
  
  /**
   * Handle keydown on search input
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _handleInputKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (this.state.results.length > 0) {
          this.resultsPanel.classList.remove('hidden');
          this.state.isOpen = true;
          this._selectNextResult();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this.state.results.length > 0) {
          this.resultsPanel.classList.remove('hidden');
          this.state.isOpen = true;
          this._selectPreviousResult();
        }
        break;
      case 'Enter':
        if (this.state.results.length > 0) {
          e.preventDefault();
          this._selectCurrentResult();
        }
        break;
      case 'Escape':
        this.closeResults();
        break;
    }
  }
  
  /**
   * Handle click outside search panel
   * @param {Event} e - Click event
   * @private
   */
  _handleClickOutside(e) {
    if (!this.resultsPanel.contains(e.target) && e.target !== this.searchInput) {
      this.closeResults();
    }
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
   * Select next result
   * @private
   */
  _selectNextResult() {
    if (this.state.results.length === 0) return;
    
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.results.length;
    this._highlightResult();
  }
  
  /**
   * Select previous result
   * @private
   */
  _selectPreviousResult() {
    if (this.state.results.length === 0) return;
    
    this.state.selectedIndex = (this.state.selectedIndex - 1 + this.state.results.length) % this.state.results.length;
    this._highlightResult();
  }
  
  /**
   * Select current result
   * @private
   */
  _selectCurrentResult() {
    if (this.state.results.length === 0) return;
    
    const result = this.state.results[this.state.selectedIndex];
    this._flyToResult(result);
  }
  
  /**
   * Render search results
   * @private
   */
  _renderResults() {
    if (this.state.results.length === 0) {
      this.resultsList.innerHTML = '';
      this.noResultsMessage.classList.remove('hidden');
      this.resultsPanel.classList.remove('hidden');
      this.state.isOpen = true;
      return;
    }
    
    this.noResultsMessage.classList.add('hidden');
    
    // Generate result items
    const items = this.state.results.map((result, index) => {
      const isSelected = index === this.state.selectedIndex;
      const icon = this._getResultIcon(result.type);
      
      return `
        <div 
          class="p-3 hover:bg-primary/5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : ''}"
          data-index="${index}"
        >
          <div class="flex items-start gap-3">
            <span class="text-gray-400 mt-0.5">${icon}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 truncate">${result.label}</div>
              <div class="text-xs text-gray-500 mt-0.5">
                ${result.type === 'order' ? 'Order' : result.type === 'driver' ? 'Driver' : 'Merchant'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    this.resultsList.innerHTML = items;
    this.resultsPanel.classList.remove('hidden');
    this.state.isOpen = true;
    
    // Add click handlers to result items
    this.resultsList.querySelectorAll('[data-index]').forEach(item => {
      item.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index, 10);
        this.state.selectedIndex = index;
        this._selectCurrentResult();
      });
    });
    
    this._highlightResult();
  }
  
  /**
   * Get icon for result type
   * @param {SearchResultType} type - Result type
   * @returns {string} Icon SVG
   * @private
   */
  _getResultIcon(type) {
    switch (type) {
      case 'order':
        return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>`;
      case 'driver':
        return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>`;
      case 'merchant':
        return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>`;
      default:
        return '';
    }
  }
  
  /**
   * Highlight selected result
   * @private
   */
  _highlightResult() {
    if (this.state.results.length === 0) return;
    
    // Remove previous highlight
    this.resultsList.querySelectorAll('[data-index]').forEach(item => {
      item.classList.remove('bg-primary/10');
    });
    
    // Add highlight to current selection
    const selectedItem = this.resultsList.querySelector(`[data-index="${this.state.selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.classList.add('bg-primary/10');
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }
  
  /**
   * Fly to result location
   * @param {SearchResult} result - Search result
   * @private
   */
  _flyToResult(result) {
    if (!result.coordinates) {
      console.warn('Result has no coordinates:', result);
      return;
    }
    
    // Store previous viewport
    this.state.previousViewport = {
      center: this.map.getCenter(),
      zoom: this.map.getZoom()
    };
    
    // Fly to location
    this.map.flyTo({
      center: [result.coordinates.lng, result.coordinates.lat],
      zoom: this.dispatchMap.config.flyToZoom,
      essential: true
    });
    
    // Close results panel
    this.closeResults();
    
    // Open popup after animation completes
    setTimeout(() => {
      this._openPopup(result);
    }, 1000);
  }
  
  /**
   * Open popup for result
   * @param {SearchResult} result - Search result
   * @private
   */
  _openPopup(result) {
    // Find the marker for this result
    // This will be implemented when the pin rendering modules are created
    console.log('Opening popup for result:', result);
    
    // For now, just log the result
    // The actual popup implementation will depend on the pin rendering modules
  }
  
  /**
   * Close search results panel
   */
  closeResults() {
    this.resultsPanel.classList.add('hidden');
    this.state.isOpen = false;
    this.state.selectedIndex = 0;
    
    // Restore previous viewport if available
    if (this.state.previousViewport) {
      this.map.flyTo({
        center: this.state.previousViewport.center,
        zoom: this.state.previousViewport.zoom,
        essential: true
      });
      this.state.previousViewport = null;
    }
  }
  
  /**
   * Perform search query matching
   * Searches orders by ID, customer name, driver name, or address
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results sorted by relevance
   */
  async search(query) {
    return this._search(query);
  }
  
  /**
   * Internal search implementation
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   * @private
   */
  async _search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const startTime = Date.now();
    const searchTerm = query.toLowerCase().trim();
    const results = [];

    try {
      // Search orders
      const orderResults = this._searchOrders(searchTerm);
      results.push(...orderResults);

      // Search drivers
      const driverResults = this._searchDrivers(searchTerm);
      results.push(...driverResults);

      // Search merchants
      const merchantResults = this._searchMerchants(searchTerm);
      results.push(...merchantResults);

      // Sort by relevance (highest first)
      results.sort((a, b) => b.relevance - a.relevance);

      // Enforce 500ms SLA
      const elapsed = Date.now() - startTime;
      if (elapsed > this.dispatchMap.config.searchTimeoutMs) {
        console.warn(`Search exceeded SLA: ${elapsed}ms > ${this.dispatchMap.config.searchTimeoutMs}ms`);
      }

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      this.dispatchMap.state.health.mapboxErrors++;
      return [];
    }
  }

  /**
   * Search orders by ID, customer name, or delivery address
   * @param {string} searchTerm - Lowercase search term
   * @returns {Array} Order search results
   * @private
   */
  _searchOrders(searchTerm) {
    const results = [];
    const { orders } = this.dispatchMap.state.data;

    orders.forEach(order => {
      let relevance = 0;

      // Exact ID match (highest priority)
      if (order.id && order.id.toLowerCase() === searchTerm) {
        relevance = 100;
      }
      // ID contains search term
      else if (order.id && order.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      }
      // Exact customer name match
      else if (order.customerName && order.customerName.toLowerCase() === searchTerm) {
        relevance = 85;
      }
      // Customer name starts with search term
      else if (order.customerName && order.customerName.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      }
      // Customer name contains search term
      else if (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      }
      // Fuzzy match on customer name
      else if (order.customerName && this._fuzzyMatch(order.customerName.toLowerCase(), searchTerm)) {
        relevance = 50;
      }
      // Address contains search term
      else if (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm)) {
        relevance = 60;
      }
      // Fuzzy match on address
      else if (order.deliveryAddress && this._fuzzyMatch(order.deliveryAddress.toLowerCase(), searchTerm)) {
        relevance = 40;
      }

      if (relevance > 0) {
        results.push({
          type: 'order',
          id: order.id,
          label: `Order ${order.id} - ${order.customerName || 'Unknown'}`,
          coordinates: order.deliveryLocation || null,
          originalData: order,
          relevance
        });
      }
    });

    return results;
  }

  /**
   * Search drivers by ID or name
   * @param {string} searchTerm - Lowercase search term
   * @returns {Array} Driver search results
   * @private
   */
  _searchDrivers(searchTerm) {
    const results = [];
    const { drivers } = this.dispatchMap.state.data;

    drivers.forEach(driver => {
      let relevance = 0;

      // Exact ID match (highest priority)
      if (driver.id && driver.id.toLowerCase() === searchTerm) {
        relevance = 100;
      }
      // ID contains search term
      else if (driver.id && driver.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      }
      // Exact driver name match
      else if (driver.name && driver.name.toLowerCase() === searchTerm) {
        relevance = 85;
      }
      // Driver name starts with search term
      else if (driver.name && driver.name.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      }
      // Driver name contains search term
      else if (driver.name && driver.name.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      }
      // Fuzzy match on driver name
      else if (driver.name && this._fuzzyMatch(driver.name.toLowerCase(), searchTerm)) {
        relevance = 50;
      }

      if (relevance > 0) {
        const coordinates = driver.currentLocation || { lat: driver.lat, lng: driver.lng };
        results.push({
          type: 'driver',
          id: driver.id,
          label: `Driver: ${driver.name || 'Unknown'}`,
          coordinates: coordinates || null,
          originalData: driver,
          relevance
        });
      }
    });

    return results;
  }

  /**
   * Search merchants by name or address
   * @param {string} searchTerm - Lowercase search term
   * @returns {Array} Merchant search results
   * @private
   */
  _searchMerchants(searchTerm) {
    const results = [];
    const { merchants } = this.dispatchMap.state.data;

    merchants.forEach(merchant => {
      let relevance = 0;

      // Exact ID match (highest priority)
      if (merchant.id && merchant.id.toLowerCase() === searchTerm) {
        relevance = 100;
      }
      // ID contains search term
      else if (merchant.id && merchant.id.toLowerCase().includes(searchTerm)) {
        relevance = 90;
      }
      // Exact merchant name match
      else if (merchant.name && merchant.name.toLowerCase() === searchTerm) {
        relevance = 85;
      }
      // Merchant name starts with search term
      else if (merchant.name && merchant.name.toLowerCase().startsWith(searchTerm)) {
        relevance = 75;
      }
      // Merchant name contains search term
      else if (merchant.name && merchant.name.toLowerCase().includes(searchTerm)) {
        relevance = 65;
      }
      // Fuzzy match on merchant name
      else if (merchant.name && this._fuzzyMatch(merchant.name.toLowerCase(), searchTerm)) {
        relevance = 50;
      }
      // Address contains search term
      else if (merchant.address && merchant.address.toLowerCase().includes(searchTerm)) {
        relevance = 60;
      }
      // Fuzzy match on address
      else if (merchant.address && this._fuzzyMatch(merchant.address.toLowerCase(), searchTerm)) {
        relevance = 40;
      }

      if (relevance > 0) {
        const coordinates = merchant.pickupLocation || { lat: merchant.lat, lng: merchant.lng };
        results.push({
          type: 'merchant',
          id: merchant.id,
          label: `Merchant: ${merchant.name || 'Unknown'}`,
          coordinates: coordinates || null,
          originalData: merchant,
          relevance
        });
      }
    });

    return results;
  }

  /**
   * Fuzzy match algorithm - checks if all characters of pattern appear in text in order
   * @param {string} text - Text to search in
   * @param {string} pattern - Pattern to search for
   * @returns {boolean} True if pattern fuzzy matches text
   * @private
   */
  _fuzzyMatch(text, pattern) {
    let patternIdx = 0;
    let textIdx = 0;

    while (patternIdx < pattern.length && textIdx < text.length) {
      if (pattern[patternIdx] === text[textIdx]) {
        patternIdx++;
      }
      textIdx++;
    }

    return patternIdx === pattern.length;
  }
  
  /**
   * Fly to coordinates
   * @param {Object} coordinates - { lat, lng } coordinates
   */
  flyTo(coordinates) {
    this.dispatchMap.flyTo(coordinates);
  }
  
  /**
   * Destroy the search module
   */
  destroy() {
    // Remove event listeners
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', () => {});
      this.searchInput.removeEventListener('focus', () => {});
      this.searchInput.removeEventListener('blur', () => {});
      this.searchInput.removeEventListener('keydown', () => {});
    }
    
    // Remove map event listeners
    if (this.map) {
      this.map.off('moveend', () => {});
    }
    
    // Remove DOM elements
    const container = document.getElementById('dispatch-search-container');
    if (container) {
      container.remove();
    }
    
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    
    console.log('Search module destroyed');
  }
}
