// API Configuration - Intelligent Routing between Firebase and Supabase
// Primary API uses Express server, intelligently routes to Firebase or Supabase based on use case

const SUPABASE_PROJECT_ID = 'vonkqyiczeqhuqhahsxm';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // In development, use local Express API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const currentPort = window.location.port;
    return `${protocol}//${hostname}:${currentPort || 3000}/api`;
  }

  // In production, use Express server
  return `${protocol}//${hostname}/api`;
};

const API_BASE_URL = getApiBaseUrl();
const USE_SUPABASE = false; // Primary API is Express, Supabase for specific features

// Intelligent routing: determine best service for each use case
const getBestApiService = (endpoint) => {
  // Use Firebase for:
  // - Real-time data (live listeners)
  // - User authentication and profiles
  // - Core CRUD operations that need real-time updates
  
  // Use Supabase for:
  // - Complex analytics and reporting
  // - File storage and CDN
  // - Advanced search with text search
  // - Geospatial queries
  // - Real-time presence tracking
  
  const analyticsRoutes = ['/analytics/', '/sales/', '/reports/'];
  const storageRoutes = ['/storage/', '/upload/', '/images/'];
  const searchRoutes = ['/search/', '/query/'];
  const presenceRoutes = ['/presence/', '/online/'];
  const geoRoutes = ['/nearby/', '/location/', '/geo/'];
  
  if (analyticsRoutes.some(route => endpoint.includes(route))) {
    return 'supabase';
  }
  if (storageRoutes.some(route => endpoint.includes(route))) {
    return 'supabase';
  }
  if (searchRoutes.some(route => endpoint.includes(route))) {
    return 'supabase';
  }
  if (presenceRoutes.some(route => endpoint.includes(route))) {
    return 'supabase';
  }
  if (geoRoutes.some(route => endpoint.includes(route))) {
    return 'supabase';
  }
  
  // Default to Firebase/Express for core operations
  return 'firebase';
};

console.log('API Configuration:', {
  baseUrl: API_BASE_URL,
  useSupabase: USE_SUPABASE,
  supabaseProject: SUPABASE_PROJECT_ID,
  routing: 'intelligent'
});

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

// API Routes mapping - supports both local API and Supabase Edge Functions
if (typeof API_ROUTES === 'undefined') {
  var API_ROUTES = {
    // Supabase Edge Functions endpoints (for production)
    SUPABASE: {
      HEALTH_CHECK: '/health-check',
      API_STATUS: '/api-status',
      DASHBOARD_STATS: '/dashboard-stats',
      RIDERS: '/riders-management',
      RIDER: (id) => `/riders-management/${id}`,
      DRIVER_PROFILE: '/driver-profile',
      ROUTE_OPTIMIZE: '/route-optimization',
    },
    // Legacy local API endpoints (for development)
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
      DASHBOARD: '/dashboard/stats',
      DASHBOARD_LEGACY: '/admin/dashboard',
      USERS: '/admin/users',
      SELLERS: '/admin/sellers',
      ORDERS: '/admin/orders',
      ANALYTICS: '/admin/analytics',
      // Supabase Edge Functions mappings
      RIDERS: '/riders-management',
      RIDER: (id) => `/riders-management?id=${id}`,
      DASHBOARD_STATS: '/dashboard-stats',
      ROUTE_OPTIMIZE: '/route-optimization',
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

    // Intelligent routing: determine which service to use for each request
    async _makeRequest(endpoint, method = 'GET', data = null, options = {}) {
      const service = getBestApiService(endpoint);
      
      if (service === 'supabase' && typeof window.supabase !== 'undefined') {
        // Use Supabase client for specific features
        return await this._makeSupabaseRequest(endpoint, method, data, options);
      } else {
        // Use Express/Firebase for core operations
        return await this._makeExpressRequest(endpoint, method, data, options);
      }
    },

    // Make request to Express/Firebase (endpoint is relative to API_BASE_URL, e.g. `/orders` not `/api/orders`)
    async _makeExpressRequest(endpoint, method, data, options) {
      const url = `${API_BASE_URL}${endpoint}`;
      let headers = await buildHeaders(options.headers);
      let body;
      if (data instanceof FormData) {
        body = data;
        delete headers['Content-Type'];
      } else if (data != null && method !== 'GET' && method !== 'HEAD') {
        body = JSON.stringify(data);
      }

      const { headers: optHeaders, ...restOptions } = options;
      const response = await fetch(url, {
        method,
        headers,
        body,
        ...restOptions
      });

      return await this._handleResponse(response);
    },

    // Make request to Supabase
    async _makeSupabaseRequest(endpoint, method, data, options) {
      try {
        // Map endpoint to Supabase operations
        if (endpoint.includes('/analytics/sales')) {
          const { days = 30 } = options.params || {};
          const { data: analyticsData, error } = await window.supabase
            .from('orders')
            .select('total, created_at, status, seller_id')
            .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
          
          if (error) throw error;
          return { success: true, data: analyticsData };
        }

        if (endpoint.includes('/storage/upload')) {
          // Handle file upload
          const { data: uploadData, error } = await window.supabase.storage
            .from('food-delivery')
            .upload(data.filePath, data.file);
          
          if (error) throw error;
          return { success: true, data: uploadData };
        }

        if (endpoint.includes('/search/advanced')) {
          const { query, type } = options.params || {};
          const { data: searchData, error } = await window.supabase
            .from(type === 'sellers' ? 'sellers' : 'products')
            .select('*')
            .textSearch('name', query);
          
          if (error) throw error;
          return { success: true, data: searchData };
        }

        // Default Supabase request
        const response = await fetch(`${SUPABASE_URL}/rest/v1${endpoint}`, {
          method,
          headers: {
            ...headers,
            'apikey': window.supabase.supabaseKey,
            'Authorization': `Bearer ${window.supabase.supabaseKey}`
          },
          body: data ? JSON.stringify(data) : undefined
        });

        return await this._handleResponse(response);
      } catch (error) {
        console.error('Supabase request error:', error);
        throw error;
      }
    },

    async get(endpoint, options = {}) {
      try {
        return await this._makeRequest(endpoint, 'GET', null, options);
      } catch (error) {
        console.error('API GET error:', error);
        throw error;
      }
    },

    async post(endpoint, data = {}, options = {}) {
      try {
        return await this._makeRequest(endpoint, 'POST', data, options);
      } catch (error) {
        // Silently fail - caller should fallback to Firestore
        throw error;
      }
    },

    async put(endpoint, data = {}, options = {}) {
      try {
        return await this._makeRequest(endpoint, 'PUT', data, options);
      } catch (error) {
        console.error('API PUT error:', error);
        throw error;
      }
    },

    async delete(endpoint, options = {}) {
      try {
        return await this._makeRequest(endpoint, 'DELETE', null, options);
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
    },

    // Specialized methods for different use cases
    async getAnalytics(params = {}) {
      return await this.get('/analytics/sales', { params });
    },

    async uploadFile(file, fileName) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);

      return await this.post('/storage/upload', formData, {});
    },

    async search(query, type = 'all') {
      return await this.get('/search/advanced', {
        params: { query, type, limit: 20 }
      });
    },

    async getNearbySellers(lat, lng, radius = 5) {
      return await this.get('/nearby/sellers', {
        params: { lat, lng, radius }
      });
    }
  };
}

console.log('✅ API Configuration loaded - Base URL:', API_BASE_URL);
