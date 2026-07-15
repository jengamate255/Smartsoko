// API Configuration with flexible port detection and authentication
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const currentPort = window.location.port;

  // In development, detect API base URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Try to find the correct API port
    const possiblePorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

    // If we're on a specific port and it matches one of our known ports, use it
    if (currentPort && possiblePorts.includes(parseInt(currentPort))) {
      return `${protocol}//${hostname}:${currentPort}/api`;
    }

    // Default to current port or 3002
    return `${protocol}//${hostname}:${currentPort || 3002}/api`;
  }

  // In production, use same host (API and frontend served from same server)
  return `${protocol}//${hostname}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Get Firebase ID token for authenticated requests
async function getAuthToken() {
  try {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      return await firebase.auth().currentUser.getIdToken(true);
    }
  } catch (error) {
    console.warn('Failed to get auth token:', error);
  }
  return null;
}

// Build headers with optional auth token
async function buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// API Routes mapping - only declare if not already defined
if (typeof API_ROUTES === 'undefined') {
  var API_ROUTES = {
    CUSTOMER: {
      RESTAURANTS: '/sellers',
      CATEGORIES: '/categories',
      PRODUCTS: (sellerId) => `/products/${sellerId}`,
      POPULAR_PRODUCTS: '/products?popular=true',
      ORDERS: '/orders',
      ORDER_DETAILS: (orderId) => `/orders/${orderId}`,
      SEARCH: (query) => `/search?q=${encodeURIComponent(query)}`,
    },
    MERCHANT: {
      PRODUCTS: '/products',
      CATEGORIES: '/categories',
      ORDERS: '/orders',
      SELLER_STATS: '/seller/stats',
    },
    DRIVER: {
      AVAILABLE_ORDERS: '/driver/available-orders',
      ACCEPTED_ORDERS: '/driver/orders',
      ACCEPT_ORDER: (orderId) => `/driver/orders/${orderId}/accept`,
      COMPLETE_ORDER: (orderId) => `/driver/orders/${orderId}/complete`,
      DRIVER_STATS: '/driver/stats',
    },
    ADMIN: {
      DASHBOARD: '/admin/dashboard',
      USERS: '/admin/users',
      SELLERS: '/admin/sellers',
      ORDERS: '/admin/orders',
      ANALYTICS: '/admin/analytics',
    }
  };
}

// API Helper Functions - only declare if not already defined
if (typeof apiHelpers === 'undefined') {
  var apiHelpers = {
    // Helper to handle response and common errors
    async _handleResponse(response) {
      // Handle 401 - redirect to login
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        console.warn('Authentication required:', data.message);
        // Redirect to login if token expired or missing
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?reason=session_expired';
        }
        throw new Error(data.message || 'Authentication required');
      }

      // Handle 403 - forbidden
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        console.warn('Access denied:', data.message);
        throw new Error(data.message || 'Access denied');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    },

    async get(endpoint, options = {}) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await buildHeaders(options.headers);

        const response = await fetch(url, {
          method: 'GET',
          headers,
          ...options
        });

        return await this._handleResponse(response);
      } catch (error) {
        console.error('API GET error:', error);
        throw error;
      }
    },

    async post(endpoint, data = {}, options = {}) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await buildHeaders(options.headers);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          ...options
        });

        return await this._handleResponse(response);
      } catch (error) {
        console.error('API POST error:', error);
        throw error;
      }
    },

    async put(endpoint, data = {}, options = {}) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await buildHeaders(options.headers);

        const response = await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
          ...options
        });

        return await this._handleResponse(response);
      } catch (error) {
        console.error('API PUT error:', error);
        throw error;
      }
    },

    async delete(endpoint, options = {}) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = await buildHeaders(options.headers);

        const response = await fetch(url, {
          method: 'DELETE',
          headers,
          ...options
        });

        return await this._handleResponse(response);
      } catch (error) {
        console.error('API DELETE error:', error);
        throw error;
      }
    },

    // Utility: Check if user is authenticated
    isAuthenticated() {
      return typeof firebase !== 'undefined' &&
             firebase.auth &&
             !!firebase.auth().currentUser;
    },

    // Utility: Get current user info
    async getCurrentUser() {
      if (typeof firebase === 'undefined' || !firebase.auth) return null;
      const user = firebase.auth().currentUser;
      if (!user) return null;

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
    }
  };
}

console.log('✅ API Configuration loaded - Base URL:', API_BASE_URL);
