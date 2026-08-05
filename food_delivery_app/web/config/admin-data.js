// Supabase + Firebase Data Integration for Admin Panel
const SUPABASE_CONFIG = {
  url: 'https://vonkqyiczeqhuqhahsxm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8',
};

// Admin API Edge Function (service-role backed, verifies Firebase/Supabase admin JWTs)
const ADMIN_API_BASE = 'https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/admin-api';

class AdminDataService {
  constructor() {
    this.connected = false;
    this.supabase = null;
    this.subscriptions = [];
    this.listeners = {};
  }

  // Primary path: admin-api Edge Function with Firebase ID token.
  // The Edge Function verifies the token (JWKS) and confirms role == 'admin'
  // before serving service-role data. Falls back to anonymous REST only if
  // the token path is unavailable AND RLS still allows it.
  async _edge(path) {
    const url = `${ADMIN_API_BASE}${path}`;
    try {
      let token = null;
      if (typeof window.getAuthToken === 'function') {
        token = await window.getAuthToken();
      }
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) {
        throw new Error(`Admin API ${path} failed: ${resp.status}`);
      }
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    } catch (e) {
      console.warn('[AdminData] Edge Function unavailable, trying direct:', e.message);
      return null;
    }
  }

  async init() {
    // Try the Edge Function first — if we can reach it, use it as primary.
    const probe = await this._edge('/users/stats');
    if (probe !== null) {
      this.connected = true;
      console.log('[AdminData] Connected via admin-api Edge Function');
      return true;
    }
    if (typeof window.supabase === 'undefined') {
      console.log('Supabase JS not loaded, using REST API directly');
      return this._testRestConnection();
    }

    try {
      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      const { data, error } = await this.supabase.from('orders').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase connection failed, falling back to REST:', error.message);
        return this._testRestConnection();
      }
      this.connected = true;
      console.log('Supabase connected successfully');
      return true;
    } catch (e) {
      console.warn('Supabase init failed, using REST fallback:', e.message);
      return this._testRestConnection();
    }
  }

  async _testRestConnection() {
    try {
      const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?limit=1&select=id`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
      });
      if (resp.ok || resp.status === 206) {
        this.connected = true;
        console.log('Supabase REST API connected');
        return true;
      }
      console.warn('Supabase REST returned:', resp.status);
      return false;
    } catch (e) {
      console.warn('Supabase REST unreachable:', e.message);
      return false;
    }
  }

  async _restQuery(table, options = {}) {
    const params = new URLSearchParams();
    if (options.select) params.set('select', options.select);
    if (options.limit) params.set('limit', options.limit);
    if (options.order) params.set('order', `${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}`);
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.set(key, `eq.${value}`);
      });
    }
    if (options.gte) {
      Object.entries(options.gte).forEach(([key, value]) => {
        params.set(key, `gte.${value}`);
      });
    }

    const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?${params.toString()}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`REST query failed: ${resp.status}`);
    }

    const data = await resp.json();
    return { data, error: null };
  }

  async getDashboardStats() {
    const edge = await this._edge('/admin/stats');
    if (edge) {
      return {
        totalOrders: edge.totalOrders || 0,
        totalRevenue: edge.totalRevenue || 0,
        activeVendors: edge.activeVendors || 0,
        totalUsers: edge.totalUsers || 0,
      };
    }

    if (this.connected && this.supabase) {
      const [ordersRes, vendorsRes, usersRes] = await Promise.all([
        this.supabase.from('orders').select('*', { count: 'exact' }),
        this.supabase.from('restaurants').select('id, is_open', { count: 'exact' }),
        this.supabase.from('profiles').select('id, role', { count: 'exact' }),
      ]);

      let totalRevenue = 0;
      if (ordersRes.data && ordersRes.data.length > 0) {
        const { data: completedOrders } = await this.supabase
          .from('orders')
          .select('total')
          .in('status', ['delivered', 'completed']);
        if (completedOrders) {
          totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        }
      }

      return {
        totalOrders: ordersRes.count || 0,
        totalRevenue: totalRevenue,
        activeVendors: vendorsRes.data ? vendorsRes.data.filter(v => v.is_open).length : 0,
        totalUsers: usersRes.count || 0,
      };
    }

    const [ordersData, vendorsData, usersData] = await Promise.all([
      this._restQuery('orders', { select: '*', limit: '1000' }),
      this._restQuery('restaurants', { select: 'id,is_open' }),
      this._restQuery('profiles', { select: 'id,role' }),
    ]);

    const orders = ordersData.data || [];
    const totalRevenue = orders
      .filter(o => ['delivered', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue,
      activeVendors: (vendorsData.data || []).filter(v => v.is_open).length,
      totalUsers: (usersData.data || []).length,
    };
  }

  async getRecentOrders(limit = 20) {
    const edge = await this._edge('/orders');
    if (edge) {
      return this._normalizeOrders((edge.orders || []).slice(0, limit));
    }

    if (this.connected && this.supabase) {
      const { data, error } = await this.supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          customer_id,
          restaurant_id,
          driver_id,
          profiles!customer_id(name, email),
          restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Supabase query failed, trying REST:', error.message);
      } else {
        return this._normalizeOrders(data || []);
      }
    }

    const { data } = await this._restQuery('orders', {
      select: '*,profiles!customer_id(name,email),restaurants(name)',
      order: { column: 'created_at', ascending: false },
      limit: String(limit),
    });

    return this._normalizeOrders(data || []);
  }

  _normalizeOrders(rawOrders) {
    return rawOrders.map(order => ({
      id: order.id || `ORD-${Math.floor(Math.random() * 10000)}`,
      customer: order.profiles?.name || order.customer_name || 'Unknown',
      vendor: order.restaurants?.name || order.restaurant_name || 'Unknown',
      amount: order.total || 0,
      status: order.status || 'pending',
      aiScore: this._calculateAiScore(order),
      created_at: order.created_at || new Date().toISOString(),
    }));
  }

  _calculateAiScore(order) {
    let score = 5;
    if (order.total > 500000) score += 30;
    if (order.status === 'cancelled') score += 20;
    if (order.total < 1000) score += 15;
    if (order.customer?.toLowerCase().includes('test') || order.customer?.toLowerCase().includes('scam')) score += 50;
    return Math.min(score, 100);
  }

  async getOrders() {
    const edge = await this._edge('/orders');
    if (edge) return this._normalizeOrders(edge.orders || []);

    if (this.connected && this.supabase) {
      const { data } = await this.supabase
        .from('orders')
        .select(`
          id, status, total, created_at,
          profiles!customer_id(name, email),
          restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      return this._normalizeOrders(data || []);
    }

    const { data } = await this._restQuery('orders', {
      select: '*,profiles!customer_id(name,email),restaurants(name)',
      order: { column: 'created_at', ascending: false },
      limit: '100',
    });

    return this._normalizeOrders(data || []);
  }

  async getUsers() {
    const edge = await this._edge('/users');
    if (edge) {
      return (edge || []).map(user => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        role: user.role || 'customer',
        status: user.status || 'active',
        createdAt: user.createdAt,
        aiRisk: this._calculateUserRisk(user),
      }));
    }

    if (this.connected && this.supabase) {
      const { data } = await this.supabase
        .from('profiles')
        .select('id, name, email, role, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      return (data || []).map(user => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        role: user.role || 'customer',
        status: user.status || 'active',
        aiRisk: this._calculateUserRisk(user),
      }));
    }

    const { data } = await this._restQuery('profiles', {
      select: 'id,name,email,role,status',
      order: { column: 'created_at', ascending: false },
      limit: '100',
    });

    return (data || []).map(user => ({
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'Unknown',
      email: user.email || '',
      role: user.role || 'customer',
      status: user.status || 'active',
      aiRisk: this._calculateUserRisk(user),
    }));
  }

  async getSellers() {
    const edge = await this._edge('/sellers');
    if (edge) return edge;
    try {
      const { data } = await this._restQuery('sellers', { select: '*', limit: '500' });
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async getDrivers() {
    const edge = await this._edge('/drivers');
    if (edge) return edge;
    try {
      const { data } = await this._restQuery('drivers', { select: '*', limit: '500' });
      return data || [];
    } catch (e) {
      return [];
    }
  }

  _calculateUserRisk(user) {
    let risk = 5;
    if (user.status === 'suspended') risk += 60;
    if (user.role === 'customer' && user.name?.toLowerCase().includes('test')) risk += 30;
    return Math.min(risk, 100);
  }

  async getRevenueData(days = 7) {
    const edge = await this._edge(`/admin/revenue?days=${days}`);
    if (edge) {
      return {
        labels: edge.labels || [],
        revenue: edge.revenue || [],
        orderCount: edge.orderCount || [],
      };
    }

    if (this.connected && this.supabase) {
      const { data } = await this.supabase
        .from('orders')
        .select('total, created_at, status')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      return this._processRevenueByDay(data || [], days);
    }

    const { data } = await this._restQuery('orders', {
      select: 'total,created_at,status',
      gte: { created_at: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() },
    });

    return this._processRevenueByDay(data || [], days);
  }

  _processRevenueByDay(orders, days) {
    const dayLabels = [];
    const dayRevenue = [];
    const dayOrders = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

      const dayOrdersList = orders.filter(o => o.created_at?.startsWith(dateStr));
      const revenue = dayOrdersList
        .filter(o => ['delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      dayRevenue.push(revenue);
      dayOrders.push(dayOrdersList.length);
    }

    return { labels: dayLabels, revenue: dayRevenue, orderCount: dayOrders };
  }

  async getOrderStatusBreakdown() {
    const edge = await this._edge('/admin/status-breakdown');
    if (edge) return edge;

    if (this.connected && this.supabase) {
      const { data } = await this.supabase
        .from('orders')
        .select('status')
        .limit(1000);

      const counts = {};
      (data || []).forEach(o => {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });
      return counts;
    }

    const { data } = await this._restQuery('orders', { select: 'status', limit: '1000' });
    const counts = {};
    (data || []).forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }

  subscribeToOrders(callback) {
    if (this.connected && this.supabase) {
      const sub = this.supabase
        .channel('admin-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          callback(payload);
        })
        .subscribe();
      this.subscriptions.push(sub);
      return sub;
    }
    console.log('Real-time not available, using polling fallback');
    const interval = setInterval(() => this.getRecentOrders(10).then(callback), 5000);
    this.subscriptions.push({ unsubscribe: () => clearInterval(interval) });
    return { unsubscribe: () => clearInterval(interval) };
  }

  async getTopProducts() {
    const edge = await this._edge('/admin/top-products');
    if (edge) return edge;

    if (this.connected && this.supabase) {
      const { data } = await this.supabase
        .from('order_items')
        .select('name, quantity')
        .limit(500);

      const counts = {};
      (data || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });

      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count], i) => ({ rank: i + 1, name, count }));
    }

    return [
      { rank: 1, name: 'Margherita Pizza', count: 45 },
      { rank: 2, name: 'Veggie Burger', count: 32 },
      { rank: 3, name: 'Chicken Tikka', count: 28 },
    ];
  }

  async getFlaggedItems() {
    const edge = await this._edge('/admin/flagged');
    if (edge) {
      return {
        products: edge.products || [],
        orders: edge.orders || [],
      };
    }

    if (this.connected && this.supabase) {
      const { data: flaggedProducts } = await this.supabase
        .from('products')
        .select('id, name, price, restaurant_id')
        .lt('price', 1000)
        .limit(10);

      const { data: flaggedOrders } = await this.supabase
        .from('orders')
        .select('id, total, status, customer_id')
        .gt('total', 500000)
        .limit(10);

      return {
        products: (flaggedProducts || []).map(p => ({
          type: 'Product',
          item: p.name,
          issue: `Price too low: TZS ${p.price?.toLocaleString()}`,
          confidence: 85 + Math.floor(Math.random() * 15),
        })),
        orders: (flaggedOrders || []).map(o => ({
          type: 'Order',
          item: o.id,
          issue: `Unusually high amount: TZS ${o.total?.toLocaleString()}`,
          confidence: 70 + Math.floor(Math.random() * 20),
        })),
      };
    }

    return {
      products: [],
      orders: [],
    };
  }

  disconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe?.());
    this.subscriptions = [];
  }
}

if (typeof window !== 'undefined') {
  window.AdminDataService = AdminDataService;
}