/**
 * Merchant Enhancements Module — API-backed data layer.
 *
 * Every function talks to /api/merchant/* which resolves the tenant
 * (req.merchantId) from the verified Firebase ID token server-side, so no
 * sellerId / window.currentSeller is needed here. The previous Firestore-direct
 * implementation silently broke because window.currentSeller was never
 * populated and the live dataset lives in Supabase behind the API.
 *
 * Exports are unchanged — merchant-app.js imports keep working.
 */

import { auth } from '../config/firebase-config.js';

// ─── tiny authed fetch helpers ────────────────────────────────────────
export async function getAuthToken() {
  try {
    const user = auth?.currentUser || window.auth?.currentUser;
    return user ? await user.getIdToken() : null;
  } catch (_) { return null; }
}

/** Endpoints that must never be answered with fabricated data. */
const NEVER_DEMO = ['balance', 'payouts', 'payout', 'payments'];

/**
 * Demo data is served only when ALL of these hold:
 *   - the demo flag is set,
 *   - a demo user record exists,
 *   - no real Firebase user is signed in,
 *   - the endpoint is not a money endpoint.
 * Previously ANY failure to mint a token (offline blip, expired refresh token)
 * fell through to DEMO_DATA, so a signed-in merchant could be shown a
 * fabricated TSh 284,500 balance as their own wallet.
 */
function demoModeAllowed(path) {
  try {
    if (localStorage.getItem('smartsoko_auth_mode') !== 'demo') return false;
    const demoUser = JSON.parse(localStorage.getItem('smartsoko_demo_user') || 'null');
    if (!demoUser || !demoUser.uid) return false;
    if (auth?.currentUser || window.auth?.currentUser) return false;
    const base = '/' + String(path).split('?')[0].split('/').filter(Boolean)[0];
    return !NEVER_DEMO.includes(base.replace(/^\//, ''));
  } catch (_) { return false; }
}

/**
 * Demo-mode dataset — realistic placeholder rows so the dashboard is fully
 * explorable without a Firebase session. NEVER used when a real token exists.
 */
const DEMO_DATA = {
  '/orders': { success: true, data: [
    { id: 'demo-o1', customerName: 'Amina Juma', total: 12500, status: 'pending', createdAt: new Date(Date.now() - 36e5).toISOString(), items: [{ name: 'Chapati Wrap', quantity: 2, price: 4500 }] },
    { id: 'demo-o2', customerName: 'Joseph Mwakalinga', total: 8900, status: 'preparing', createdAt: new Date(Date.now() - 72e5).toISOString(), items: [{ name: 'Ndizi Nyekundu', quantity: 3, price: 1800 }] },
    { id: 'demo-o3', customerName: 'Neema Kileo', total: 15400, status: 'delivered', createdAt: new Date(Date.now() - 26e6).toISOString(), items: [{ name: 'Mchuzi wa Kuku', quantity: 1, price: 9500 }] },
  ]},
  '/products': { success: true, data: [
    { id: 'demo-p1', name: 'Chapati Wrap', category: 'Food', price: 4500, stockQuantity: 24, isAvailable: true },
    { id: 'demo-p2', name: 'Ndizi Nyekundu', category: 'Fruits', price: 1800, stockQuantity: 60, isAvailable: true },
    { id: 'demo-p3', name: 'Maziwa Lala 500ml', category: 'Dairy', price: 1500, stockQuantity: 3, isAvailable: true },
    { id: 'demo-p4', name: 'Mchuzi wa Kuku', category: 'Food', price: 9500, stockQuantity: 0, isAvailable: false },
  ]},
  '/reviews': { success: true, data: [
    { id: 'demo-r1', rating: 5, comment: 'Haraka na fresh!', customerName: 'Amina', createdAt: new Date().toISOString() },
    { id: 'demo-r2', rating: 4, comment: 'Good service', customerName: 'Joseph', createdAt: new Date().toISOString() },
  ]},
  // NOTE: no '/balance' or '/payouts' entries on purpose. Money must never be
  // fabricated, so those endpoints are excluded by NEVER_DEMO above.
  '/promos': { success: true, data: [
    { id: 'demo-pr1', code: 'KARIBU10', discount: 10, usageCount: 45, active: true, startsAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() },
  ]},
  '/staff': { success: true, data: [
    { id: 'demo-s1', name: 'Bi. Rehema', email: 'rehema@demo.smartsoko.com', role: 'cashier', status: 'active' },
  ]},
  '/drivers': { success: true, data: [
    { id: 'demo-d1', name: 'Fundi Ali', isOnline: true, vehicleType: 'motorcycle' },
  ]},
  '/inventory': { success: true, data: [
    { id: 'demo-i1', productId: 'demo-p1', name: 'Chapati Wrap', stockQuantity: 24, minStock: 5 },
    { id: 'demo-i2', productId: 'demo-p3', name: 'Maziwa Lala 500ml', stockQuantity: 3, minStock: 5 },
  ]},
  '/config/low-stock-threshold': { success: true, data: { threshold: 5 } },
};

function demoResponseFor(path) {
  // Exact match first, then prefix match (handles /orders?limit=..., /orders/xyz)
  if (DEMO_DATA[path]) return DEMO_DATA[path];
  const base = '/' + String(path).split('?')[0].split('/').filter(Boolean)[0];
  return DEMO_DATA[base] || { success: true, data: [] };
}

export async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  if (!token && !options.allowAnon) {
    // Demo mode: serve in-memory placeholder rows instead of throwing — the
    // dashboard stays explorable for demo merchants without a Firebase login.
    // Guarded by demoModeAllowed() so a real merchant whose token could not be
    // minted never sees placeholder data (see the comment on that function).
    if (demoModeAllowed(path) && (options.method || 'GET').toUpperCase() === 'GET') {
      return demoResponseFor(path);
    }
    throw new Error('Not signed in');
  }
  const res = await fetch('/api/merchant' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
  let body = {};
  try { body = await res.json(); } catch (_) { /* empty body */ }
  if (!res.ok || body.success === false) {
    const err = new Error(body.error || ('Request failed (' + res.status + ')'));
    err.status = res.status;
    err.code = body.code;
    throw err;
  }
  return body;
}

/** GET an endpoint and return its `data` payload. */
export async function apiGet(path) {
  const body = await apiFetch(path);
  return body.data !== undefined ? body.data : body;
}

/** POST an endpoint and return its `data` payload. */
export async function apiPost(path, data = {}) {
  const body = await apiFetch(path, { method: 'POST', body: JSON.stringify(data) });
  return body.data !== undefined ? body.data : body;
}

/** PUT an endpoint and return its `data` payload. */
export async function apiPut(path, data = {}) {
  const body = await apiFetch(path, { method: 'PUT', body: JSON.stringify(data) });
  return body.data !== undefined ? body.data : body;
}

/** DELETE an endpoint and return its `data` payload. */
export async function apiDelete(path) {
  const body = await apiFetch(path, { method: 'DELETE' });
  return body.data !== undefined ? body.data : body;
}

/** GET /orders (tenant-scoped server-side) as a plain array. */
export async function apiGetOrders(limit = 500) {
  const data = await apiGet('/orders?limit=' + limit);
  return Array.isArray(data) ? data : [];
}

/**
 * Load merchant products (menu) via the API.
 * @returns {Promise<Array>} Array of normalized product objects
 */
export async function loadMerchantProducts() {
  const rows = await apiGet('/products');
  const list = Array.isArray(rows) ? rows : [];
  return list
    .filter((p) => !p.archived)
    .map((p) => ({
      ...p,
      name: p.name || p.title || 'Untitled',
      price: Number(p.price) || 0,
      stockQuantity: p.stockQuantity ?? p.stock ?? 0,
      isActive: p.isActive ?? p.isAvailable ?? p.is_available ?? true,
      imageUrl: p.imageUrl || p.image_url || p.image || null,
    }));
}

/**
 * Get sales analytics for a period (orders come from the API).
 * @param {string} period - '7' | '30' | '365' (days)
 */
export async function getSalesAnalytics(period = '30') {
  const days = parseInt(period) || 30;
  try {
    const orders = await apiGetOrders(500);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = orders.filter((o) => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : new Date(o.createdAt || 0).getTime();
      return d >= cutoff;
    });
    return calculateAnalytics(recent, days);
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return getEmptyAnalytics();
  }
}

function calculateAnalytics(orders, days) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  let todaySales = 0, todayOrders = 0, pendingCount = 0;
  let yestSales = 0, yestOrders = 0;
  let totalSales = 0, totalOrders = 0, completedOrders = 0;

  orders.forEach(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    const amount = o.totalAmount || o.total || 0;
    const status = o.status || 'unknown';

    if (status === 'completed' || status === 'delivered') {
      totalSales += amount;
      totalOrders++;
      completedOrders++;

      if (d >= startOfToday) {
        todaySales += amount;
        todayOrders++;
      } else if (d >= startOfYesterday) {
        yestSales += amount;
        yestOrders++;
      }
    }

    if (status !== 'completed' && status !== 'delivered' && status !== 'cancelled') {
      pendingCount++;
    }
  });

  const avgOrderValue = completedOrders > 0 ? Math.round(totalSales / completedOrders) : 0;
  const avgToday = todayOrders > 0 ? Math.round(todaySales / todayOrders) : 0;
  const avgYesterday = yestOrders > 0 ? Math.round(yestSales / yestOrders) : 0;

  return {
    todaySales,
    todayOrders,
    pendingCount,
    totalSales,
    totalOrders,
    completedOrders,
    avgOrderValue,
    avgToday,
    avgYesterday,
    yestSales,
    yestOrders,
    salesChange: yestSales > 0 ? ((todaySales - yestSales) / yestSales) * 100 : (todaySales > 0 ? 100 : 0),
    ordersChange: yestOrders > 0 ? ((todayOrders - yestOrders) / yestOrders) * 100 : (todayOrders > 0 ? 100 : 0),
    aovChange: avgYesterday > 0 ? ((avgToday - avgYesterday) / avgYesterday) * 100 : (avgToday > 0 ? 100 : 0),
    orders: orders
  };
}

function getEmptyAnalytics() {
  return {
    todaySales: 0,
    todayOrders: 0,
    pendingCount: 0,
    totalSales: 0,
    totalOrders: 0,
    completedOrders: 0,
    avgOrderValue: 0,
    avgToday: 0,
    avgYesterday: 0,
    yestSales: 0,
    yestOrders: 0,
    salesChange: 0,
    ordersChange: 0,
    aovChange: 0,
    orders: []
  };
}

/**
 * Update order status in Firestore
 * @param {string} orderId - Order document ID
 * @param {string} newStatus - New status value
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (!orderId) throw new Error('Order ID required');

  const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  await apiFetch('/orders/' + encodeURIComponent(orderId) + '/status', {
    method: 'POST',
    body: JSON.stringify({ status: newStatus }),
  });
}

/**
 * Subscribe to realtime orders for a seller
 * @param {Function} callback - Called with orders array on each update
 * @param {string} sellerId - Optional seller ID
 * @returns {Function} Unsubscribe function
 */
export async function loadOrdersRealtime(callback, sellerId = null) {
  // The API is tenant-scoped from the token; poll for near-realtime updates.
  let stopped = false;
  const push = async () => {
    if (stopped) return;
    try {
      const orders = await apiGetOrders(100);
      if (!stopped) callback(orders);
    } catch (error) {
      console.error('Realtime orders error:', error);
      if (!stopped) callback([]);
    }
  };
  await push();
  const timer = setInterval(push, 30000);
  return function unsubscribe() { stopped = true; clearInterval(timer); };
}

/**
 * Format currency as TSh
 * @param {number} amount
 * @returns {string}
 */
export function formatTSh(amount) {
  return 'TSh ' + (amount || 0).toLocaleString();
}

/**
 * Get order status display color class
 * @param {string} status
 * @returns {string}
 */
export function getOrderStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    delivered: 'bg-teal-100 text-teal-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Add a new menu item
 * @param {Object} itemData - Product data
 * @returns {Promise<string>} Document ID
 */
export async function addMenuItem(itemData) {
  // Server contract: name+price required; `image` (URL) not `imageUrl`;
  // stock goes through the inventory ledger as opening stock.
  const body = {
    name: itemData.name,
    description: itemData.description || '',
    price: Number(itemData.price) || 0,
    category: itemData.category || 'other',
    stockQuantity: Number(itemData.stock ?? itemData.stockQuantity ?? 0),
    image: itemData.imageUrl || itemData.image || '',
    isAvailable: itemData.available !== false,
  };
  const body2 = await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
  return (body2.data && body2.data.id) || null;
}

/**
 * Delete a menu item
 * @param {string} productId - Product document ID
 * @returns {Promise<void>}
 */
export async function deleteMenuItem(productId) {
  if (!productId) throw new Error('Product ID required');
  await apiFetch('/products/' + encodeURIComponent(productId), { method: 'DELETE' });
}

/**
 * Toggle menu item availability
 * @param {string} productId - Product document ID
 * @param {boolean} available - New availability status
 * @returns {Promise<void>}
 */
export async function toggleMenuItemAvailability(productId, available) {
  if (!productId) throw new Error('Product ID required');
  await apiFetch('/products/' + encodeURIComponent(productId), {
    method: 'PUT',
    body: JSON.stringify({ isAvailable: !!available }),
  });
}

/**
 * Create a promo code
 * @param {Object} promoData - Promo code data
 * @returns {Promise<string>} Document ID
 */
export async function createPromoCode(promoData) {
  const body = await apiFetch('/promos', {
    method: 'POST',
    body: JSON.stringify({
      code: String(promoData.code || '').toUpperCase(),
      discount: Number(promoData.discount) || 0,
      // Forward the caller's discount type instead of dropping it and making
      // the server infer percent-vs-amount from the magnitude.
      discountType: promoData.discountType || (Number(promoData.discount) > 100 ? 'amount' : 'percent'),
      maxUses: Number(promoData.maxUses) || 100,
      minOrder: Number(promoData.minOrder) || 0,
      expiresAt: promoData.expiresAt || null,
      isActive: promoData.isActive !== false,
    }),
  });
  return (body.data && body.data.id) || null;
}

/**
 * Update a promo code
 * @param {string} promoId - Promo document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updatePromoCode(promoId, updates) {
  if (!promoId) throw new Error('Promo ID required');
  await apiFetch('/promos/' + encodeURIComponent(promoId), {
    method: 'PUT',
    body: JSON.stringify(updates || {}),
  });
}

/**
 * Delete a promo code
 * @param {string} promoId - Promo document ID
 * @returns {Promise<void>}
 */
export async function deletePromoCode(promoId) {
  if (!promoId) throw new Error('Promo ID required');
  await apiFetch('/promos/' + encodeURIComponent(promoId), { method: 'DELETE' });
}

/**
 * Request a payout (prompts for the amount; validated against the available
 * balance server-side).
 * @returns {Promise<Object>} Payout response
 */
export async function requestPayout() {
  const input = prompt('Payout amount (TZS):');
  if (input === null) throw new Error('cancelled');
  const amount = Math.round(Number(input.replace(/[^\d.]/g, '')) || 0);
  if (!amount) throw new Error('Enter a valid amount');
  return apiFetch('/payout', { method: 'POST', body: JSON.stringify({ amount }) });
}

/**
 * Load promotions for a seller
 * @param {string} sellerId - Optional seller ID
 * @returns {Promise<Array>} Array of promo objects
 */
export async function loadPromotions() {
  const rows = await apiGet('/promos');
  return Array.isArray(rows) ? rows : [];
}

/**
 * Load payout history
 * @param {string} sellerId - Optional seller ID
 * @returns {Promise<Array>} Array of payout objects
 */
export async function loadPayoutHistory() {
  const res = await apiGet('/payouts');
  return (res && Array.isArray(res.data)) ? res.data : [];
}

/**
 * Load customers for a seller
 * @param {string} sellerId - Optional seller ID
 * @returns {Promise<Array>} Array of customer objects
 */
export async function loadCustomers() {
  const rows = await apiGet('/customers');
  return Array.isArray(rows) ? rows : [];
}