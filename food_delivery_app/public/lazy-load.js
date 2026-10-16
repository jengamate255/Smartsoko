/**
 * Lazy Loading Utility for Code Splitting
 * Provides safe dynamic imports with loading states and error handling
 */

const LazyLoader = {
  // Cache for loaded modules
  cache: new Map(),

  // Track retry history
  loadHistory: {},

  /**
   * Load a module dynamically with loading state management
   * @param {string} id - Unique identifier for the module
   * @param {string} url - URL of the module to load
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - The loaded module or error object
   */
  async loadModule(id, url, options = {}) {
    const { 
      loadingElementId, 
      containerElementId, 
      loaderType = 'skeleton',
      errorCallback 
    } = options;

    // Return cached module if available
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    // Show loading state
    this.showLoading(id, { 
      loadingElementId, 
      containerElementId, 
      loaderType 
    });

    try {
      // Dynamically import the module
      const module = await import(url);

      // Cache the module
      this.cache.set(id, module);

      // Hide loading state
      this.hideLoading(id);

      return module;

    } catch (error) {
      console.error(`Failed to load module ${id}:`, error);
      
      // Hide loading state
      this.hideLoading(id);
      
      // Show error state
      this.showError(id, error.message);

      // Call error callback if provided
      if (errorCallback) {
        errorCallback(error);
      }

      // Return error object
      return { error: true, message: error.message };
    }
  },

  /**
   * Show loading indicator
   */
  showLoading(id, options) {
    if (options.loadingElementId) {
      const element = document.getElementById(options.loadingElementId);
      if (element) {
        element.style.display = 'flex';
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('aria-label', 'Loading...');
      }
    }

    if (options.containerElementId && options.loaderType === 'skeleton') {
      const container = document.getElementById(options.containerElementId);
      if (container) {
        container.innerHTML = this.getSkeletonHTML(options.loaderType);
      }
    }
  },

  /**
   * Hide loading indicator
   */
  hideLoading(id) {
    // Find all elements with loading id
    const elements = document.querySelectorAll(`[data-loading-id="${id}"]`);
    elements.forEach(element => {
      element.style.display = 'none';
      element.removeAttribute('aria-busy');
      element.removeAttribute('aria-label');
    });
  },

  /**
   * Show error state
   */
  showError(id, errorMessage) {
    const elements = document.querySelectorAll(`[data-loading-id="${id}"]`);
    elements.forEach(element => {
      element.style.display = 'flex';
      element.innerHTML = `
        <div class="flex flex-col items-center justify-center p-6 text-center">
          <span class="material-symbols-outlined text-red-500 text-4xl mb-4">error</span>
          <p class="text-sm text-red-600 font-medium">Failed to load analytics</p>
          <p class="text-xs text-red-500 mt-2">${errorMessage}</p>
          <button onclick="LazyLoader.retryLoad('${id}')" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm">
            Try Again
          </button>
        </div>
      `;
    });
  },

  /**
   * Get skeleton HTML for loading state
   */
  getSkeletonHTML(loaderType) {
    if (loaderType === 'skeleton') {
      return `
        <div class="skeleton w-full h-64 rounded-lg animate-pulse" data-loading-id="analytics">
          Loading analytics...
        </div>
      `;
    }
    return '';
  },

  /**
   * Retry loading a module
   */
  async retryLoad(id) {
    // Clear cache for failed module
    if (this.cache.has(id)) {
      this.cache.delete(id);
    }

    // Implement retry logic based on stored module info
    if (this.loadHistory[id]) {
      const { attempts, lastAttempt, maxAttempts = 3 } = this.loadHistory[id];
      const now = Date.now();
      const lastTime = lastAttempt ? Date.parse(lastAttempt) : 0;
      const cooldown = 5000; // 5 second cooldown between retries

      if (now - lastTime < cooldown) {
        console.log(`Retry too soon for module: ${id}. Please wait ${cooldown}ms.`);
        return;
      }

      if (attempts >= maxAttempts) {
        console.log(`Max retry attempts (${maxAttempts}) reached for module: ${id}`);
        return;
      }
    }

    // Reset attempt counter and retry
    this.loadHistory[id] = {
      attempts: (this.loadHistory[id]?.attempts || 0) + 1,
      lastAttempt: new Date().toISOString(),
    };

    console.log(`Retrying load for module: ${id} (attempt ${this.loadHistory[id].attempts})`);
    // Call the actual load logic here
    this.loadModule(id, this.loadHistory[id]?.url || id);
  }
};

// Export for global access
if (typeof window !== 'undefined') {
  window.LazyLoader = LazyLoader;
}
