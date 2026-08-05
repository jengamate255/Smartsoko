const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 8234;

app.use(express.static(__dirname));
app.use(express.json({ limit: '1mb' }));

// Simple in-memory data store
let orders = [
  { id: 'ORD-001', customer: 'John Doe', status: 'Delivered', items: 3, amount: 45.99 },
  { id: 'ORD-002', customer: 'Jane Smith', status: 'Preparing', items: 2, amount: 32.50 },
  { id: 'ORD-003', customer: 'Mike Johnson', status: 'Pending', items: 1, amount: 12.99 },
  { id: 'ORD-004', customer: 'Sarah Wilson', status: 'Confirmed', items: 5, amount: 78.25 },
  { id: 'ORD-005', customer: 'Chris Brown', status: 'Ready', items: 2, amount: 24.75 }
];

let products = [
  { id: 1, name: 'Margherita Pizza', category: 'Main Dishes', price: 12.99, stock: 15 },
  { id: 2, name: 'Pepperoni Pizza', category: 'Main Dishes', price: 14.99, stock: 8 },
  { id: 3, name: 'Caesar Salad', category: 'Salads', price: 8.99, stock: 12 },
  { id: 4, name: 'Garlic Bread', category: 'Sides', price: 5.99, stock: 20 },
  { id: 5, name: 'Italian Soda', category: 'Beverages', price: 3.99, stock: 25 }
];

let transactions = [
  { id: 'TXN-001', amount: 1250.00, date: '2026-07-23', type: 'Revenue' },
  { id: 'TXN-002', amount: 450.75, date: '2026-07-22', type: 'Withdrawal' },
  { id: 'TXN-003', amount: 89.99, date: '2026-07-21', type: 'Revenue' },
  { id: 'TXN-004', amount: 320.50, date: '2026-07-20', type: 'Refund' },
  { id: 'TXN-005', amount: 670.25, date: '2026-07-19', type: 'Revenue' }
];

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'SmartSoko',
    currency: 'TSh',
    pricing: { deliveryFee: 2000, taxRate: 18, freeDeliveryThreshold: 50000 },
    support: { phone: '0620771067' }
  });
});

app.post('/api/orders', (req, res) => {
  let body = {};
  try { body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}'); } catch (e) { /* ignore malformed body */ }
  const order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    customer: body.customerName || 'Anonymous',
    items: Array.isArray(body.items) ? body.items.length : 0,
    amount: body.total || body.subtotal || 0,
    status: 'Pending',
    receivedAt: new Date().toISOString()
  };
  orders.unshift(order);
  if (orders.length > 100) orders.pop();
  res.json({ ok: true, status: 'accepted', order });
});

app.get('/api/auth/verify', (req, res) => {
  res.json({ success: false, message: 'Token verification is handled client-side' });
});

app.get('/api/admin/orders', (req, res) => {
  res.json({ orders, total: orders.length });
});
app.get('/api/admin/users', (req, res) => {
  res.json({ data: [
    { id: 'u-001', name: 'David Kimaro', email: 'david@example.com', phone: '+255 712 345 678', role: 'customer', status: 'active', joined: '2026-01-12' },
    { id: 'u-002', name: 'Amina Hassan', email: 'amina@example.com', phone: '+255 713 456 789', role: 'seller', status: 'active', joined: '2026-02-03' },
    { id: 'u-003', name: 'Joseph Mwangi', email: 'joseph@example.com', phone: '+255 714 567 890', role: 'driver', status: 'active', joined: '2026-03-21' },
    { id: 'u-004', name: 'Neema Jackson', email: 'neema@example.com', phone: '+255 715 678 901', role: 'customer', status: 'suspended', joined: '2026-04-15' },
    { id: 'u-005', name: 'Kevin Otieno', email: 'kevin@example.com', phone: '+255 716 789 012', role: 'customer', status: 'active', joined: '2026-05-30' }
  ] });
});
app.get('/api/admin/sellers', (req, res) => {
  res.json({ data: [
    { id: 's-001', name: 'SmartSoko Restaurant', phone: '+255 621 345 678', category: 'Biryani & Rice', city: 'Dar es Salaam', address: '123 Main St', rating: 4.8, isOpen: true },
    { id: 's-002', name: 'Kilimanjaro Kitchen', phone: '+255 622 456 789', category: 'Grill & BBQ', city: 'Arusha', address: '45 Uhuru Road', rating: 4.5, isOpen: true },
    { id: 's-003', name: 'Zanzibar Sweets', phone: '+255 623 567 890', category: 'Desserts', city: 'Zanzibar', address: '8 Stone Town', rating: 4.2, isOpen: false },
    { id: 's-004', name: 'Diamond Cafe', phone: '+255 624 678 901', category: 'Coffee & Snacks', city: 'Dodoma', address: '12 Market St', rating: 4.0, isOpen: true }
  ] });
});
app.get('/api/admin/log', (req, res) => {
  res.json({ ok: true });
});
app.post('/api/admin/log', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/vendor/analytics', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const revenue = 15000 + (Math.random() * 3000);
  const orders = 450 + Math.floor(Math.random() * 100);
  const avgOrder = revenue / orders;

  res.json({
    sales: { revenue, orders, avgOrder },
    users: { new: 50, total: 1250, returning: 32 },
    products: { total: 5, sold: 120 }
  });
});

app.get('/api/vendor/orders', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(orders.slice(0, limit));
});

app.get('/api/vendor/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = products.slice(startIndex, endIndex);

  res.json({
    data: paginatedProducts,
    pagination: {
      page,
      limit,
      total: products.length,
      pages: Math.ceil(products.length / limit)
    }
  });
});

// Static HTML page routes
app.get('/login', (req, res) => res.sendFile('login.html', { root: __dirname }));
app.get('/register', (req, res) => res.sendFile('signup.html', { root: __dirname }));
app.get('/forgot-password', (req, res) => res.sendFile('check-user.html', { root: __dirname }));
app.get('/dashboard', (req, res) => res.sendFile('merchant.html', { root: __dirname }));
app.get('/merchant', (req, res) => res.sendFile('merchant.html', { root: __dirname }));
app.get('/home', (req, res) => res.sendFile('home.html', { root: __dirname }));
app.get('/', (req, res) => res.sendFile('home.html', { root: __dirname }));

// Remaining static pages (kept simple so UI links like /cart, /checkout, /product work locally)
const staticPages = ['cart', 'checkout', 'product', 'track-order', 'discovery', 'customer', 'profile', 'wallet', 'messages', 'chat', 'social', 'social-profile', 'store', 'seller', 'driver', 'fleet-manager', 'admin', 'admin-panel', 'orders', 'restaurant', 'wishlists', 'supabase', 'onboarding', 'store-settings', 'create-store', 'index', 'main', 'check-user', 'signup', 'referral'];
staticPages.forEach(p => app.get('/' + p, (req, res) => res.sendFile(p + '.html', { root: __dirname })));

app.listen(PORT, () => {
  console.log(`Merchant portal backend server running on http://localhost:${PORT}`);
});
