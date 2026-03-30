// Supabase Client Configuration and Helper Functions
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helper functions
export const auth = {
  // Sign up new user
  async signUp(email, password, options = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...options
    });
    
    if (data.user && !options.data) {
      // Create profile
      await supabase.from('profiles').insert([{
        id: data.user.id,
        email: data.user.email,
        role: options.role || 'customer'
      }]);
    }
    
    return { data, error };
  },

  // Sign in user
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  },

  // Sign out
  async signOut() {
    return await supabase.auth.signOut();
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helper functions
export const db = {
  // Generic fetch function
  async fetch(table, options = {}) {
    let query = supabase.from(table);
    
    if (options.select) query = query.select(options.select);
    if (options.order) query = query.order(options.order.column, options.order.ascending);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.offset(options.offset);
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    if (options.inFilter) {
      Object.entries(options.inFilter).forEach(([key, value]) => {
        query = query.in(key, value);
      });
    }
    if (options.search) {
      query = query.textSearch(options.search.column, options.search.query);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  // Generic insert function
  async insert(table, records) {
    const { data, error } = await supabase.from(table).insert(records);
    return { data, error };
  },

  // Generic update function
  async update(table, updates, filter) {
    let query = supabase.from(table).update(updates);
    
    if (filter.eq) {
      Object.entries(filter.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  // Generic delete function
  async delete(table, filter) {
    let query = supabase.from(table).delete();
    
    if (filter.eq) {
      Object.entries(filter.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  // Real-time subscription
  subscribe(table, callback, options = {}) {
    let subscription = supabase.from(table);
    
    if (options.event) {
      subscription = subscription.on(options.event, callback);
    } else {
      subscription = subscription.on('*', callback);
    }
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        subscription = subscription.eq(key, value);
      });
    }
    
    return subscription.subscribe();
  }
};

// Specific table helpers
export const restaurants = {
  // Get all open restaurants
  async getAll() {
    return await db.fetch('restaurants', {
      filter: { is_open: true },
      order: { column: 'rating', ascending: false }
    });
  },

  // Get restaurant by ID
  async getById(id) {
    return await db.fetch('restaurants', {
      filter: { id }
    });
  },

  // Get restaurants by owner
  async getByOwner(ownerId) {
    return await db.fetch('restaurants', {
      filter: { owner_id: ownerId }
    });
  },

  // Create new restaurant
  async create(restaurantData) {
    return await db.insert('restaurants', restaurantData);
  },

  // Update restaurant
  async update(id, updates) {
    return await db.update('restaurants', updates, {
      filter: { eq: { id } }
    });
  },

  // Subscribe to restaurant changes
  subscribe(callback) {
    return db.subscribe('restaurants', callback, {
      filter: { is_open: true }
    });
  }
};

export const menuItems = {
  // Get menu items for restaurant
  async getByRestaurant(restaurantId) {
    return await db.fetch('menu_items', {
      filter: { restaurant_id: restaurantId, is_available: true },
      order: { column: 'category', ascending: true }
    });
  },

  // Add menu item
  async create(itemData) {
    return await db.insert('menu_items', itemData);
  },

  // Update menu item
  async update(id, updates) {
    return await db.update('menu_items', updates, {
      filter: { eq: { id } }
    });
  },

  // Update stock
  async updateStock(id, stock) {
    return await db.update('menu_items', { stock }, {
      filter: { eq: { id } }
    });
  },

  // Toggle availability
  async toggleAvailability(id, isAvailable) {
    return await db.update('menu_items', { is_available: isAvailable }, {
      filter: { eq: { id } }
    });
  },

  // Subscribe to menu changes
  subscribe(restaurantId, callback) {
    return db.subscribe('menu_items', callback, {
      filter: { restaurant_id: restaurantId }
    });
  }
};

export const orders = {
  // Get orders for customer
  async getForCustomer(customerId, limit = 20) {
    return await db.fetch('orders', {
      filter: { customer_id: customerId },
      order: { column: 'created_at', ascending: false },
      limit
    });
  },

  // Get orders for restaurant
  async getForRestaurant(restaurantId) {
    return await db.fetch('orders', {
      filter: { restaurant_id: restaurantId },
      order: { column: 'created_at', ascending: false }
    });
  },

  // Get orders for driver
  async getForDriver(driverId) {
    return await db.fetch('orders', {
      filter: { driver_id: driverId },
      order: { column: 'created_at', ascending: false }
    });
  },

  // Create new order
  async create(orderData) {
    return await db.insert('orders', orderData);
  },

  // Update order status
  async updateStatus(id, status, additionalData = {}) {
    return await db.update('orders', {
      status,
      ...additionalData,
      updated_at: new Date().toISOString()
    }, {
      filter: { eq: { id } }
    });
  },

  // Subscribe to order changes
  subscribe(callback, options = {}) {
    return db.subscribe('orders', callback, options);
  }
};

export const drivers = {
  // Get all drivers
  async getAll() {
    return await db.fetch('drivers', {
      order: { column: 'status', ascending: false }
    });
  },

  // Get online drivers
  async getOnline() {
    return await db.fetch('drivers', {
      filter: { status: 'online' }
    });
  },

  // Update driver location
  async updateLocation(id, latitude, longitude) {
    return await db.update('drivers', {
      current_latitude: latitude,
      current_longitude: longitude,
      updated_at: new Date().toISOString()
    }, {
      filter: { eq: { id } }
    });
  },

  // Update driver status
  async updateStatus(id, status) {
    return await db.update('drivers', {
      status,
      updated_at: new Date().toISOString()
    }, {
      filter: { eq: { id } }
    });
  },

  // Assign driver to order
  async assignToOrder(driverId, orderId) {
    // Update driver
    await db.update('drivers', {
      current_order_id: orderId,
      status: 'busy'
    }, {
      filter: { eq: { id: driverId } }
    });

    // Update order
    return await db.update('orders', {
      driver_id: driverId,
      status: 'dispatched'
    }, {
      filter: { eq: { id: orderId } }
    });
  },

  // Subscribe to driver changes
  subscribe(callback) {
    return db.subscribe('drivers', callback);
  }
};

export const promotions = {
  // Get active promotions
  async getActive() {
    const now = new Date().toISOString();
    return await db.fetch('promotions', {
      filter: { is_active: true },
      order: { column: 'created_at', ascending: false }
    });
  },

  // Validate promo code
  async validateCode(code) {
    const { data, error } = await db.fetch('promotions', {
      filter: { code: code.toUpperCase(), is_active: true }
    });

    if (error || !data || data.length === 0) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const promo = data[0];
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

    if (validUntil && now > validUntil) {
      return { valid: false, error: 'Promo code expired' };
    }

    if (now < validFrom) {
      return { valid: false, error: 'Promo code not yet active' };
    }

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return { valid: false, error: 'Promo code usage limit reached' };
    }

    return { valid: true, promo };
  },

  // Use promo code
  async useCode(code, orderId) {
    const { promo } = await this.validateCode(code);
    
    if (!promo) {
      throw new Error('Invalid promo code');
    }

    // Increment usage count
    await db.update('promotions', {
      usage_count: promo.usage_count + 1
    }, {
      filter: { eq: { id: promo.id } }
    });

    return promo;
  }
};

export const loyalty = {
  // Get customer loyalty points
  async getPoints(customerId) {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('points_earned, points_spent, expires_at')
      .eq('customer_id', customerId)
      .eq('transaction_type', 'earned');

    if (error) throw error;

    const totalEarned = data.reduce((sum, item) => sum + item.points_earned, 0);
    const totalSpent = data.reduce((sum, item) => sum + item.points_spent, 0);
    
    return {
      available: totalEarned - totalSpent,
      totalEarned,
      totalSpent
    };
  },

  // Add loyalty points
  async addPoints(customerId, points, description, orderId = null) {
    return await db.insert('loyalty_points', {
      customer_id: customerId,
      order_id: orderId,
      points_earned: points,
      transaction_type: 'earned',
      description,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
    });
  }
};

export const analytics = {
  // Get sales analytics
  async getSalesAnalytics(restaurantId = null, days = 30) {
    let query = supabase
      .from('orders')
      .select('total, created_at, status, restaurant_id')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Get popular items
  async getPopularItems(restaurantId = null, limit = 10) {
    const { data, error } = await supabase
      .rpc('get_popular_items', {
        p_restaurant_id: restaurantId,
        p_limit: limit
      });

    return { data, error };
  },

  // Get peak hours
  async getPeakHours(restaurantId = null, days = 30) {
    const { data, error } = await supabase
      .rpc('get_peak_hours', {
        p_restaurant_id: restaurantId,
        p_days: days
      });

    return { data, error };
  }
};

// Storage helper functions
export const storage = {
  // Upload file
  async upload(file, path, options = {}) {
    const { data, error } = await supabase.storage
      .from('food-delivery')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });

    return { data, error };
  },

  // Get public URL
  getPublicUrl(path) {
    const { data } = supabase.storage
      .from('food-delivery')
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Delete file
  async delete(path) {
    return await supabase.storage
      .from('food-delivery')
      .remove([path]);
  }
};

// Real-time subscriptions manager
class SubscriptionManager {
  constructor() {
    this.subscriptions = [];
  }

  // Subscribe to multiple tables
  subscribeAll(callbacks) {
    Object.entries(callbacks).forEach(([table, callback]) => {
      const subscription = db.subscribe(table, callback);
      this.subscriptions.push({ table, subscription });
    });
  }

  // Unsubscribe from all
  unsubscribeAll() {
    this.subscriptions.forEach(({ subscription }) => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }

  // Unsubscribe from specific table
  unsubscribe(table) {
    const index = this.subscriptions.findIndex(sub => sub.table === table);
    if (index !== -1) {
      this.subscriptions[index].subscription.unsubscribe();
      this.subscriptions.splice(index, 1);
    }
  }
}

export const subscriptionManager = new SubscriptionManager();

// Utility functions
export const utils = {
  // Format currency
  formatCurrency(amount, currency = 'TZS') {
    return `${currency} ${amount.toLocaleString()}`;
  },

  // Format date
  formatDate(date, options = {}) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  // Generate order ID
  generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  },

  // Validate phone number (Tanzania format)
  validatePhoneNumber(phone) {
    const tzPhoneRegex = /^(?:\+255|0)?[67]\d{8}$/;
    return tzPhoneRegex.test(phone);
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

export default {
  supabase,
  auth,
  db,
  restaurants,
  menuItems,
  orders,
  drivers,
  promotions,
  loyalty,
  analytics,
  storage,
  subscriptionManager,
  utils
};
