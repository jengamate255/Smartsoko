/**
 * SmartSoko API Client
 * Centralized API client for all backend communication
 */

const API = (() => {
  const baseURL = window.location.origin + '/api';
  
  // Default headers for all requests
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };
  
  // Helper to handle responses
  async function handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }
  
  // Generic request method
  async function request(endpoint, options = {}) {
    const url = `${baseURL}${endpoint}`;
    const config = {
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      return handleResponse(response);
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }
  
  return {
    // Health check
    health: () => request('/health'),
    
    // Sellers
    getSellers: (category) => {
      const query = category ? `?category=${encodeURIComponent(category)}` : '';
      return request(`/sellers${query}`);
    },
    getSeller: (sellerId) => request(`/sellers/${encodeURIComponent(sellerId)}`),
    
    // Categories
    getCategories: () => request('/categories'),
    
    // Products
    getProducts: (sellerId) => request(`/products/${encodeURIComponent(sellerId)}`),
    updateProduct: (productId, data) => request(`/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    // Orders
    createOrder: (orderData) => request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    }),
    getCustomerOrders: (customerId) => request(`/orders/${encodeURIComponent(customerId)}`),
    
    // Driver
    getAvailableOrders: () => request('/driver/available-orders'),
    acceptOrder: (orderId, driverId, driverName) => request(`/driver/orders/${encodeURIComponent(orderId)}/accept`, {
      method: 'PUT',
      body: JSON.stringify({ driverId, driverName })
    }),
    updateOrderStatus: (orderId, status) => request(`/driver/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    
    // Seller
    getSellerOrders: (sellerId) => request(`/seller/orders/${encodeURIComponent(sellerId)}`),
    updateSellerOrderStatus: (orderId, status) => request(`/seller/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    addProduct: (sellerId, productData) => request(`/seller/${encodeURIComponent(sellerId)}/products`, {
      method: 'POST',
      body: JSON.stringify(productData)
    }),
    
    // Admin
    getDashboardStats: () => request('/admin/dashboard')
  };
})();

// Make available globally
window.API = API;
