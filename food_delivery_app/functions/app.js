// SmartSoko API Server - Improved Version
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// CORS configuration - allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Simple in-memory rate limiting
const rateLimits = new Map();
const RATE_WINDOW = 60 * 1000; // 1 minute
const RATE_MAX = 100; // requests per window

function rateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }
  
  const requests = rateLimits.get(key).filter(time => time > windowStart);
  
  if (requests.length >= RATE_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }
  
  requests.push(now);
  rateLimits.set(key, requests);
  next();
}

app.use(rateLimit);

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  for (const [key, requests] of rateLimits.entries()) {
    const valid = requests.filter(time => time > windowStart);
    if (valid.length === 0) {
      rateLimits.delete(key);
    } else {
      rateLimits.set(key, valid);
    }
  }
}, RATE_WINDOW);

// Firebase initialization
let db = null;
let admin = null;
let FieldValue = null;

const adminModule = require('firebase-admin');
admin = adminModule;

if (admin.apps.length === 0) {
  admin.initializeApp();
}

db = admin.firestore();
FieldValue = admin.firestore.FieldValue;
const firebaseInitialized = true;
console.log('✅ Firebase initialized for Cloud Functions');

// Authentication middleware
async function authMiddleware(req, res, next) {
  if (!admin) return res.status(503).json({ error: 'Auth service not initialized' });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Role middleware
function roleMiddleware(allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uid) return res.status(401).json({ error: 'Unauthorized' });
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userData = userDoc.data();
      if (!userData || !allowedRoles.includes(userData.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      req.user.role = userData.role;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error checking roles' });
    }
  };
}

// Async error handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Seller Categories: food (restaurants), dairy, fruits, groceries, bakery
// Sellers can be any type of vendor - restaurants are just one category
const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
const CATEGORY_LABELS = {
  food: 'Restaurants & Food',
  dairy: 'Dairy Shops',
  fruits: 'Fruit Vendors',
  groceries: 'Grocery Stores',
  bakery: 'Bakeries'
};

function getCategoryIcon(category) {
  const icons = {
    food: 'restaurant',
    dairy: 'local_drink',
    fruits: 'nutrition',
    groceries: 'shopping_basket',
    bakery: 'bakery_dining'
  };
  return icons[category] || 'store';
}

// Pagination helper
function getPagination(req) {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
  const offset = parseInt(req.query.offset) || 0;
  return { limit, offset };
}

// ============ STATIC FILES & HTML ROUTES ============
// REMOVED: In the Cloud Functions environment, Firebase Hosting handles static files.

// ============ API ROUTES ============

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// ============ SELLER / RESTAURANT ROUTES ============

// Get all sellers
app.get('/api/sellers', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { category, search } = req.query;
  const { limit, offset } = getPagination(req);
  
  // Simple query to avoid composite index requirements
  let query = db.collection('sellers').limit(limit * 2);
  
  if (category && CATEGORIES.includes(category)) {
    query = query.where('category', '==', category);
  }
  
  const snapshot = await query.get();
  let sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter isOpen and search client-side to avoid composite indexes
  sellers = sellers.filter(s => s.isOpen === true);
  
  if (search) {
    const searchLower = search.toLowerCase();
    sellers = sellers.filter(s => 
      s.name?.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by name client-side
  sellers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  // Apply pagination
  const paginated = sellers.slice(offset, offset + limit);
  
  res.json({
    data: paginated,
    pagination: {
      limit,
      offset,
      returned: paginated.length,
      total: sellers.length,
      hasMore: sellers.length > offset + limit
    }
  });
}));

// Alias: /api/restaurants -> returns food sellers (restaurants are sellers with category='food')
app.get('/api/restaurants', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  const { search } = req.query;
  
  // Restaurants = food category sellers
  let query = db.collection('sellers')
    .where('category', '==', 'food')
    .limit(limit * 2);
  
  const snapshot = await query.get();
  let sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter isOpen and search client-side
  sellers = sellers.filter(s => s.isOpen === true);
  
  if (search) {
    const searchLower = search.toLowerCase();
    sellers = sellers.filter(s => 
      s.name?.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by name client-side
  sellers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  // Apply pagination
  const paginated = sellers.slice(offset, offset + limit);
  
  res.json({
    note: 'Restaurants are sellers with category="food". All sellers available at /api/sellers',
    data: paginated,
    pagination: {
      limit,
      offset,
      returned: paginated.length,
      total: sellers.length,
      hasMore: sellers.length > offset + limit
    }
  });
}));

// Get categories with seller counts - FIXED N+1 query
app.get('/api/categories', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  // Simple query - filter isOpen client-side to avoid composite index
  const allSellers = await db.collection('sellers').select('category', 'isOpen').get();
  
  // Count in memory (more efficient than 5 separate queries)
  const counts = {};
  for (const cat of CATEGORIES) {
    counts[cat] = 0;
  }
  
  allSellers.docs.forEach(doc => {
    const data = doc.data();
    const cat = data.category;
    // Only count open sellers
    if (cat && counts.hasOwnProperty(cat) && data.isOpen === true) {
      counts[cat]++;
    }
  });
  
  const categories = CATEGORIES.map(cat => ({
    name: cat,
    count: counts[cat],
    displayName: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
    icon: getCategoryIcon(cat)
  }));
  
  res.json({
    categories,
    totalSellers: allSellers.size,
    message: 'Sellers include restaurants, dairies, fruit vendors, grocery stores, and bakeries'
  });
}));

// Get sellers by category type (e.g., /api/sellers/type/food for restaurants)
app.get('/api/sellers/type/:category', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { category } = req.params;
  
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ 
      error: 'Invalid seller type',
      validTypes: CATEGORIES.map(c => ({ type: c, label: CATEGORY_LABELS[c] }))
    });
  }
  
  const { limit, offset } = getPagination(req);
  const { search } = req.query;
  
  // Simple query to avoid composite index requirements
  let query = db.collection('sellers')
    .where('category', '==', category)
    .limit(limit * 2); // Fetch more to filter isOpen client-side
  
  const snapshot = await query.get();
  let sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Filter by isOpen and search term client-side to avoid composite indexes
  sellers = sellers.filter(s => s.isOpen === true);
  
  if (search) {
    const searchLower = search.toLowerCase();
    sellers = sellers.filter(s => 
      s.name?.toLowerCase().includes(searchLower) ||
      s.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply pagination after filtering
  sellers = sellers.slice(offset, offset + limit);
  
  res.json({
    sellerType: category,
    sellerTypeLabel: CATEGORY_LABELS[category],
    data: sellers,
    pagination: {
      limit,
      offset,
      returned: sellers.length,
      hasMore: snapshot.docs.length === limit
    }
  });
}));

// Get seller by ID
app.get('/api/sellers/:sellerId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const doc = await db.collection('sellers').doc(req.params.sellerId).get();
  if (!doc.exists) {
    return res.status(404).json({ error: 'Seller not found' });
  }
  
  res.json({ id: doc.id, ...doc.data() });
}));

// Alias: /api/restaurants/:id
app.get('/api/restaurants/:restaurantId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const doc = await db.collection('sellers').doc(req.params.restaurantId).get();
  if (!doc.exists) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  
  res.json({ id: doc.id, ...doc.data() });
}));

// ============ PRODUCT / MENU ITEM ROUTES ============

// Get products for a seller
app.get('/api/products/:sellerId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  const { category } = req.query;
  
  let query = db.collection('products')
    .where('sellerId', '==', req.params.sellerId)
    .where('isAvailable', '==', true);
  
  if (category) {
    query = query.where('category', '==', category);
  }
  
  query = query.orderBy('name').limit(limit);
  
  const snapshot = await query.get();
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: products,
    pagination: { limit, offset, returned: products.length, hasMore: products.length === limit }
  });
}));

// Alias: /api/menu-items/:restaurantId
app.get('/api/menu-items/:restaurantId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  
  let query = db.collection('products')
    .where('sellerId', '==', req.params.restaurantId)
    .where('isAvailable', '==', true)
    .orderBy('name')
    .limit(limit);
  
  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: items,
    pagination: { limit, offset, returned: items.length, hasMore: items.length === limit }
  });
}));


// Get all products (for discovery/popular items)
app.get('/api/products', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit } = getPagination(req);
  
  // Simple query for popular/recent items
  const snapshot = await db.collection('products')
    .where('isAvailable', '==', true)
    .limit(limit)
    .get();
    
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Return direct array as frontend expects it in index.html
  res.json(products);
}));

// ============ ORDER ROUTES ============

// Create order
app.post('/api/orders', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  // Basic validation
  const {
    customerId,
    sellerId,
    items,
    total,
    deliveryAddress,
    customerAddress,
    customerPhone,
    contactPhone,
    sellerName,
    deliveryLat,
    deliveryLng,
    customerLat,
    customerLng,
    sellerLat,
    sellerLng,
    pickupLat,
    pickupLng
  } = req.body;
  if (!customerId || !sellerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: customerId, sellerId, items' });
  }
  
  const orderData = {
    customerId,
    sellerId,
    items,
    total: total || 0,
    deliveryAddress: deliveryAddress || {},
    customerAddress: customerAddress || deliveryAddress || '',
    customerPhone: customerPhone || contactPhone || '',
    contactPhone: contactPhone || customerPhone || '',
    sellerName: sellerName || '',
    deliveryLat: deliveryLat ?? null,
    deliveryLng: deliveryLng ?? null,
    customerLat: customerLat ?? deliveryLat ?? null,
    customerLng: customerLng ?? deliveryLng ?? null,
    sellerLat: sellerLat ?? null,
    sellerLng: sellerLng ?? null,
    pickupLat: pickupLat ?? sellerLat ?? null,
    pickupLng: pickupLng ?? sellerLng ?? null,
    status: 'pending',
    currency: 'TSh',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('orders').add(orderData);
  res.status(201).json({ id: docRef.id, ...orderData });
}));

// Get customer orders
app.get('/api/orders/:customerId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  const { status } = req.query;
  
  let query = db.collection('orders')
    .where('customerId', '==', req.params.customerId);
  
  if (status) {
    query = query.where('status', '==', status);
  }
  
  query = query.orderBy('createdAt', 'desc').limit(limit);
  
  const snapshot = await query.get();
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: orders,
    pagination: { limit, offset, returned: orders.length, hasMore: orders.length === limit }
  });
}));

// Get all orders (admin)
app.get('/api/admin/orders', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset, status, sellerId } = req.query;
  const pageSize = Math.min(parseInt(limit) || 50, 100);
  
  let query = db.collection('orders');
  
  if (status) {
    query = query.where('status', '==', status);
  }
  
  if (sellerId) {
    query = query.where('sellerId', '==', sellerId);
  }
  
  query = query.orderBy('createdAt', 'desc').limit(pageSize);
  
  const snapshot = await query.get();
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: orders,
    pagination: { limit: pageSize, returned: orders.length, hasMore: orders.length === pageSize }
  });
}));

// ============ DRIVER ROUTES ============

// Driver: Get dashboard stats
app.get('/api/driver/dashboard/:driverId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { driverId } = req.params;
  
  // Get driver's current orders
  const activeOrdersSnap = await db.collection('orders')
    .where('driverId', '==', driverId)
    .where('status', 'in', ['accepted', 'picked_up', 'in_transit'])
    .get();
  
  // Get today's completed deliveries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrdersSnap = await db.collection('orders')
    .where('driverId', '==', driverId)
    .where('status', '==', 'delivered')
    .where('deliveredAt', '>=', today)
    .get();
  
  // Calculate earnings
  const earnings = todayOrdersSnap.docs.reduce((sum, doc) => sum + (doc.data().deliveryFee || 0), 0);
  
  res.json({
    driverId,
    activeDeliveries: activeOrdersSnap.size,
    todayDeliveries: todayOrdersSnap.size,
    todayEarnings: earnings,
    activeOrders: activeOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  });
}));

// Driver: Get available orders
app.get('/api/driver/available-orders', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit } = getPagination(req);
  
  const snapshot = await db.collection('orders')
    .where('status', '==', 'ready_for_delivery')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ data: orders, count: orders.length });
}));

// Alias: /api/driver/orders
app.get('/api/driver/orders', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit } = getPagination(req);
  
  const snapshot = await db.collection('orders')
    .where('status', '==', 'ready_for_delivery')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ data: orders, count: orders.length });
}));

// Driver: Get earnings
app.get('/api/driver/earnings/:driverId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { driverId } = req.params;
  const { period = 'week' } = req.query; // week, month, all
  
  let query = db.collection('orders')
    .where('driverId', '==', driverId)
    .where('status', '==', 'delivered');
  
  if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.where('deliveredAt', '>=', weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    query = query.where('deliveredAt', '>=', monthAgo);
  }
  
  const snapshot = await query.get();
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const totalEarnings = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  const totalDeliveries = orders.length;
  
  res.json({
    driverId,
    period,
    totalEarnings,
    totalDeliveries,
    averagePerDelivery: totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0,
    orders: orders.slice(0, 50) // Limit details
  });
}));

// Driver: Accept order
app.put('/api/driver/orders/:orderId/accept', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { driverId, driverName } = req.body;
  if (!driverId) {
    return res.status(400).json({ error: 'driverId is required' });
  }
  
  const orderRef = db.collection('orders').doc(req.params.orderId);
  const orderDoc = await orderRef.get();
  
  if (!orderDoc.exists) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  const orderData = orderDoc.data();
  if (orderData.status !== 'ready_for_delivery') {
    return res.status(409).json({ error: `Order is not available (status: ${orderData.status})` });
  }
  
  if (orderData.driverId) {
    return res.status(409).json({ error: 'Order already assigned to another driver' });
  }
  
  await orderRef.update({
    driverId,
    driverName: driverName || 'Unknown Driver',
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  
  res.json({ success: true, message: 'Order accepted', orderId: req.params.orderId });
}));

// Driver: Update order status
app.put('/api/driver/orders/:orderId/status', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });

  const { status, location } = req.body;
  const validStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const updateData = {
    status,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (status === 'delivered') {
    updateData.deliveredAt = FieldValue.serverTimestamp();
  }

  if (location) {
    updateData.driverLocation = location;
  }

  await db.collection('orders').doc(req.params.orderId).update(updateData);

  res.json({ success: true, message: `Status updated to ${status}`, orderId: req.params.orderId });
}));

// Driver: Update current location (for live tracking)
app.put('/api/driver/:driverId/location', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });

  const { latitude, longitude, isOnline } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const updateData = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    lastLocationUpdate: FieldValue.serverTimestamp()
  };

  if (isOnline !== undefined) {
    updateData.isOnline = isOnline;
  }

  await db.collection('drivers').doc(req.params.driverId).update(updateData);

  res.json({
    success: true,
    message: 'Location updated',
    driverId: req.params.driverId,
    location: { latitude: updateData.latitude, longitude: updateData.longitude }
  });
}));

// Get driver location (for customer order tracking)
app.get('/api/driver/:driverId/location', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });

  const driverDoc = await db.collection('drivers').doc(req.params.driverId).get();

  if (!driverDoc.exists) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  const driverData = driverDoc.data();

  res.json({
    driverId: req.params.driverId,
    name: driverData.name,
    phone: driverData.phone,
    latitude: driverData.latitude,
    longitude: driverData.longitude,
    isOnline: driverData.isOnline,
    lastLocationUpdate: driverData.lastLocationUpdate,
    vehicleNumber: driverData.vehicleNumber
  });
}));

// ============ SELLER / MERCHANT / RESTAURANT ROUTES ============

// Merchant: Get dashboard stats
app.get('/api/merchant/dashboard/:restaurantId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { restaurantId } = req.params;
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrdersSnap = await db.collection('orders')
    .where('sellerId', '==', restaurantId)
    .where('createdAt', '>=', today)
    .get();
  
  // Get pending orders
  const pendingOrdersSnap = await db.collection('orders')
    .where('sellerId', '==', restaurantId)
    .where('status', 'in', ['pending', 'accepted', 'preparing'])
    .get();
  
  // Get menu items count
  const menuSnap = await db.collection('products')
    .where('sellerId', '==', restaurantId)
    .get();
  
  // Calculate today's revenue
  const todayRevenue = todayOrdersSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
  
  res.json({
    restaurantId,
    todayOrders: todayOrdersSnap.size,
    todayRevenue,
    pendingOrders: pendingOrdersSnap.size,
    menuItems: menuSnap.size,
    recentOrders: todayOrdersSnap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() }))
  });
}));

// Seller/Merchant: Get orders
app.get('/api/seller/orders/:sellerId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { status } = req.query;
  const { limit, offset } = getPagination(req);
  
  let query = db.collection('orders').where('sellerId', '==', req.params.sellerId);
  
  if (status) {
    query = query.where('status', '==', status);
  }
  
  query = query.orderBy('createdAt', 'desc').limit(limit);
  
  const snapshot = await query.get();
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: orders,
    pagination: { limit, offset, returned: orders.length, hasMore: orders.length === limit }
  });
}));

// Alias: /api/merchant/orders/:restaurantId
app.get('/api/merchant/orders/:restaurantId', asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { status } = req.query;
  const { limit } = getPagination(req);
  
  let query = db.collection('orders').where('sellerId', '==', req.params.restaurantId);
  
  if (status) {
    query = query.where('status', '==', status);
  }
  
  query = query.orderBy('createdAt', 'desc').limit(limit);
  
  const snapshot = await query.get();
  const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({ data: orders, count: orders.length });
}));

// Seller/Merchant: Update order status
app.put('/api/seller/orders/:orderId/status', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { status } = req.body;
  const validStatuses = ['pending', 'accepted', 'preparing', 'ready_for_delivery', 'cancelled'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  
  await db.collection('orders').doc(req.params.orderId).update({
    status,
    updatedAt: FieldValue.serverTimestamp()
  });
  
  res.json({ success: true, message: `Status updated to ${status}`, orderId: req.params.orderId });
}));

// Alias: /api/restaurant/orders/:restaurantId/status
app.put('/api/restaurant/orders/:orderId/status', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { status } = req.body;
  
  await db.collection('orders').doc(req.params.orderId).update({
    status,
    updatedAt: FieldValue.serverTimestamp()
  });
  
  res.json({ success: true, message: `Status updated to ${status}` });
}));

// Seller/Merchant: Add product
app.post('/api/seller/:sellerId/products', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { name, price, description, category, imageUrl } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  
  const productData = {
    name,
    price: parseFloat(price),
    description: description || '',
    category: category || 'general',
    imageUrl: imageUrl || '',
    sellerId: req.params.sellerId,
    isAvailable: true,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('products').add(productData);
  res.status(201).json({ id: docRef.id, ...productData });
}));

// Alias: /api/merchant/menu
app.post('/api/merchant/menu', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { restaurantId, name, price, description, category, imageUrl } = req.body;
  if (!restaurantId || !name || price === undefined) {
    return res.status(400).json({ error: 'restaurantId, name, and price are required' });
  }
  
  const productData = {
    name,
    price: parseFloat(price),
    description: description || '',
    category: category || 'general',
    imageUrl: imageUrl || '',
    sellerId: restaurantId,
    isAvailable: true,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('products').add(productData);
  res.status(201).json({ id: docRef.id, ...productData });
}));

// Seller: Update product
app.put('/api/products/:productId', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const updateData = {
    ...req.body,
    updatedAt: FieldValue.serverTimestamp()
  };
  
  delete updateData.createdAt; // Prevent overwriting creation date
  delete updateData.sellerId;  // Prevent changing ownership
  
  await db.collection('products').doc(req.params.productId).update(updateData);
  res.json({ success: true, message: 'Product updated', productId: req.params.productId });
}));

// Alias: /api/merchant/menu/:itemId
app.put('/api/merchant/menu/:itemId', asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const updateData = {
    ...req.body,
    updatedAt: FieldValue.serverTimestamp()
  };
  
  delete updateData.createdAt;
  delete updateData.sellerId;
  
  await db.collection('products').doc(req.params.itemId).update(updateData);
  res.json({ success: true, message: 'Menu item updated', itemId: req.params.itemId });
}));

// ============ ADMIN ROUTES ============

// Admin: Dashboard stats - FIXED: doesn't load entire collections
app.get('/api/admin/dashboard', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  // Use aggregation queries instead of loading all documents
  const [
    ordersCountSnap,
    sellersCountSnap,
    driversCountSnap,
    activeSellersSnap,
    activeDriversSnap
  ] = await Promise.all([
    db.collection('orders').count().get(),
    db.collection('sellers').count().get(),
    db.collection('drivers').count().get(),
    db.collection('sellers').where('isOpen', '==', true).count().get(),
    db.collection('drivers').where('isOnline', '==', true).count().get()
  ]);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrdersSnap = await db.collection('orders')
    .where('createdAt', '>=', today)
    .count().get();
  
  // Category counts (single query with aggregation)
  const allSellers = await db.collection('sellers').select('category').get();
  const categoryCounts = {};
  const categoryBreakdown = {};
  
  CATEGORIES.forEach(c => {
    categoryCounts[c] = 0;
    categoryBreakdown[c] = {
      count: 0,
      label: CATEGORY_LABELS[c],
      icon: getCategoryIcon(c)
    };
  });
  
  allSellers.docs.forEach(doc => {
    const cat = doc.data().category;
    if (cat && categoryCounts.hasOwnProperty(cat)) {
      categoryCounts[cat]++;
      categoryBreakdown[cat].count++;
    }
  });
  
  res.json({
    stats: {
      totalOrders: ordersCountSnap.data().count,
      todayOrders: todayOrdersSnap.data().count,
      totalSellers: sellersCountSnap.data().count,
      activeSellers: activeSellersSnap.data().count,
      totalDrivers: driversCountSnap.data().count,
      activeDrivers: activeDriversSnap.data().count,
      sellerTypes: categoryBreakdown,
      sellerTypeCounts: categoryCounts
    },
    sellerCategories: CATEGORIES.map(c => ({
      type: c,
      label: CATEGORY_LABELS[c],
      count: categoryCounts[c],
      icon: getCategoryIcon(c)
    })),
    timestamp: new Date().toISOString(),
    note: 'Sellers include restaurants (food), dairies, fruit vendors, grocery stores, and bakeries'
  });
}));

// Admin: Get all sellers (primary endpoint)
app.get('/api/admin/sellers', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  const { category, isOpen, search } = req.query;
  
  // Simple query to avoid composite indexes - fetch more for client-side filtering
  let query = db.collection('sellers').limit(limit * 3);
  
  if (category) {
    query = query.where('category', '==', category);
  }
  
  const snapshot = await query.get();
  let sellers = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    typeLabel: CATEGORY_LABELS[doc.data().category] || 'Unknown'
  }));
  
  // Client-side filtering for isOpen
  if (isOpen !== undefined) {
    const isOpenBool = isOpen === 'true';
    sellers = sellers.filter(s => s.isOpen === isOpenBool);
  }
  
  // Client-side search
  if (search) {
    const searchLower = search.toLowerCase();
    sellers = sellers.filter(s => 
      s.name?.toLowerCase().includes(searchLower) ||
      s.email?.toLowerCase().includes(searchLower) ||
      s.phone?.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by name client-side
  sellers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  // Apply pagination
  const paginated = sellers.slice(offset, offset + limit);
  
  // Group by category for easy consumption
  const byCategory = {};
  CATEGORIES.forEach(c => byCategory[c] = []);
  paginated.forEach(s => {
    if (byCategory.hasOwnProperty(s.category)) {
      byCategory[s.category].push(s);
    }
  });
  
  res.json({
    data: paginated,
    byCategory,
    categoryCounts: CATEGORIES.map(c => ({ type: c, label: CATEGORY_LABELS[c], count: byCategory[c].length })),
    pagination: { limit, offset, returned: paginated.length, total: sellers.length, hasMore: sellers.length > offset + limit },
    note: 'Sellers include restaurants (food), dairies, fruit vendors, grocery stores, and bakeries'
  });
}));

// Alias: /api/admin/restaurants (for backward compatibility) - filters to food sellers only
app.get('/api/admin/restaurants', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  // Redirect to admin/sellers with food category filter
  req.query.category = 'food';
  
  const { limit, offset } = getPagination(req);
  
  let query = db.collection('sellers')
    .where('category', '==', 'food')
    .limit(limit * 2);
  
  const snapshot = await query.get();
  let sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Client-side isOpen filter if specified
  if (req.query.isOpen !== undefined) {
    const isOpenBool = req.query.isOpen === 'true';
    sellers = sellers.filter(s => s.isOpen === isOpenBool);
  }
  
  // Sort by name client-side
  sellers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  // Apply pagination
  const paginated = sellers.slice(offset, offset + limit);
  
  res.json({
    note: 'Restaurants are food sellers. Use /api/admin/sellers for all seller types.',
    data: paginated,
    pagination: { limit, offset, returned: paginated.length, total: sellers.length, hasMore: sellers.length > offset + limit }
  });
}));

// Admin: Add new restaurant/seller
app.post('/api/admin/restaurants', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db || !FieldValue) return res.status(503).json({ error: 'Database not connected' });
  
  const { name, category, description, address, phone, email } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }
  
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
  }
  
  const sellerData = {
    name,
    category,
    description: description || '',
    address: address || {},
    phone: phone || '',
    email: email || '',
    isOpen: false,
    isVerified: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await db.collection('sellers').add(sellerData);
  res.status(201).json({ id: docRef.id, ...sellerData });
}));

// Admin: Get all drivers
app.get('/api/admin/drivers', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { limit, offset } = getPagination(req);
  const { isOnline } = req.query;
  
  let query = db.collection('drivers').orderBy('name').limit(limit);
  
  if (isOnline !== undefined) {
    query = query.where('isOnline', '==', isOnline === 'true');
  }
  
  const snapshot = await query.get();
  const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  res.json({
    data: drivers,
    pagination: { limit, offset, returned: drivers.length, hasMore: drivers.length === limit }
  });
}));

// Admin: Analytics endpoint
app.get('/api/admin/analytics', authMiddleware, roleMiddleware(['admin']), asyncHandler(async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  
  const { period = '7d' } = req.query; // 7d, 30d, 90d
  const days = parseInt(period) || 7;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  // Get orders in period
  const ordersSnap = await db.collection('orders')
    .where('createdAt', '>=', startDate)
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get();
  
  const orders = ordersSnap.docs.map(d => d.data());
  
  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Orders by status
  const byStatus = {};
  orders.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });
  
  // Orders by day (last 7 days)
  const byDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay[d.toISOString().split('T')[0]] = 0;
  }
  orders.forEach(o => {
    if (o.createdAt) {
      const date = o.createdAt.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : null;
      if (date && byDay.hasOwnProperty(date)) {
        byDay[date]++;
      }
    }
  });
  
  res.json({
    period,
    summary: {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      completedOrders: byStatus.delivered || 0,
      cancelledOrders: byStatus.cancelled || 0
    },
    byStatus,
    byDay,
    generatedAt: new Date().toISOString()
  });
}));

// ============ API 404 HANDLER ============
// This MUST come BEFORE the HTML catch-all
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    sellerTypes: CATEGORIES.map(c => ({ type: c, label: CATEGORY_LABELS[c], endpoint: `/api/sellers/type/${c}` })),
    note: 'Sellers include: Restaurants (food), Dairies, Fruit vendors, Grocery stores, and Bakeries',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/sellers                    # All sellers (all types)',
      'GET /api/sellers/type/:category     # Sellers by type: food, dairy, fruits, groceries, bakery',
      'GET /api/sellers/:sellerId          # Get specific seller',
      'GET /api/restaurants                # Alias: sellers with category=food',
      'GET /api/categories                 # List all seller categories/types',
      'GET /api/products/:sellerId         # Products for any seller',
      'GET /api/menu-items/:restaurantId   # Alias: products for food sellers',
      'POST /api/orders                    # Create order',
      'GET /api/orders/:customerId         # Customer order history',
      'GET /api/admin/dashboard            # Admin stats with seller type breakdown',
      'GET /api/admin/orders               # All orders',
      'GET /api/admin/sellers              # All sellers (any type)',
      'POST /api/admin/sellers             # Register new seller',
      'GET /api/admin/drivers              # All drivers',
      'GET /api/admin/analytics            # Platform analytics',
      'GET /api/driver/dashboard/:driverId # Driver stats',
      'GET /api/driver/orders              # Available delivery orders',
      'PUT /api/driver/orders/:orderId/accept',
      'PUT /api/driver/orders/:orderId/status # Update order status + location',
      'PUT /api/driver/:driverId/location    # Update driver location for tracking',
      'GET /api/driver/:driverId/location    # Get driver location (for tracking)',
      'GET /api/driver/earnings/:driverId  # Driver earnings',
      'GET /api/merchant/dashboard/:sellerId # Seller dashboard (any type)',
      'GET /api/merchant/orders/:sellerId    # Seller orders',
      'POST /api/merchant/products           # Add product for seller',
      'PUT /api/seller/orders/:orderId/status # Update order status'
    ]
  });
});

// ============ HTML FALLBACK ROUTES ============
// REMOVED: Handled by Firebase Hosting.

// ============ GLOBAL ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose internal errors to client in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (err.name === 'FirebaseError') {
    return res.status(503).json({
      error: 'Database error',
      message: isDevelopment ? err.message : 'Service temporarily unavailable'
    });
  }
  
  if (err.code === 'permission-denied') {
    return res.status(403).json({
      error: 'Permission denied',
      message: isDevelopment ? err.message : 'You do not have permission to perform this action'
    });
  }
  
  // Generic error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack, name: err.name })
  });
});

// Only start server if run directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmartSoko Server v2.0 running on http://localhost:${PORT}`);
    console.log(`📱 API available at http://localhost:${PORT}/api`);
    console.log(`🔥 Firebase: ${firebaseInitialized ? 'Connected' : 'Disconnected'}`);
    console.log(`🏪 Seller Types: ${CATEGORIES.map(c => `${c} (${CATEGORY_LABELS[c]})`).join(', ')}`);
    console.log(`🛡️  Rate limiting: ${RATE_MAX} requests per ${RATE_WINDOW/1000}s`);
    console.log(`📄 HTML Routes: /login, /, /admin, /customer, /driver, /merchant, /track-order`);
    console.log(`   - Login:      http://localhost:${PORT}/login (start here)`);
    console.log(`   - Admin:      http://localhost:${PORT}/admin`);
    console.log(`   - Customer:   http://localhost:${PORT}/customer`);
    console.log(`   - Driver:     http://localhost:${PORT}/driver`);
    console.log(`   - Merchant:   http://localhost:${PORT}/merchant (all seller types)`);
    console.log(`   - Track Order: http://localhost:${PORT}/track-order`);
    console.log(`📚 API Examples:`);
    console.log(`   - All sellers:        GET /api/sellers`);
    console.log(`   - Restaurants only:   GET /api/sellers/type/food`);
    console.log(`   - Dairies only:       GET /api/sellers/type/dairy`);
    console.log(`   - Seller categories:  GET /api/categories`);
    console.log(`💰 SmartSoko - Your Local Marketplace`);
  });
}

module.exports = app;
