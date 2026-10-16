/**
 * SmartSoko Centralized State Management
 * Provides a lightweight observable store synced with localStorage.
 */

export class StateStore {
  constructor(initialState = {}, storageKey = 'smartsoko_app_state') {
    this.storageKey = storageKey;
    
    // Attempt to hydrate state from localStorage
    try {
      const storedState = localStorage.getItem(this.storageKey);
      this.state = storedState ? JSON.parse(storedState) : initialState;
    } catch (e) {
      console.warn('Failed to parse stored state, falling back to initial state');
      this.state = initialState;
    }
    
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  setState(updater) {
    const newState = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...newState };
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
    
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Error in state subscriber', e);
      }
    }
  }
}

// Export a global singleton instance for immediate use
export const globalStore = new StateStore({
  cart: [],
  user: null
});
