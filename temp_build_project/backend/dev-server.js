const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'dev-secret-key';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const users = [
  { id: 'u1', email: 'demo@uber.com', phone: '+1234567890', fullName: 'Alex Johnson', role: 'customer', avatarUrl: null, isVerified: true, isActive: true }
];

const wallets = { 'u1': { id: 'w1', userId: 'u1', balance: 250.00, currency: 'USD' } };
const transactions = [
  { id: 't1', walletId: 'w1', type: 'deposit', amount: 100, description: 'Wallet top-up', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 7) },
  { id: 't2', walletId: 'w1', type: 'payment', amount: -45.50, description: 'Trip to Downtown', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 3) },
  { id: 't3', walletId: 'w1', type: 'deposit', amount: 200, description: 'Wallet top-up', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 1) },
];

const serviceTypes = [
  { id: 'st1', name: 'Economy', description: 'Affordable rides', baseFare: 2.50, perKmRate: 1.20, perMinRate: 0.15, minFare: 5.00, capacity: 4, iconUrl: 'car', isActive: true },
  { id: 'st2', name: 'Premium', description: 'Luxury vehicles', baseFare: 5.00, perKmRate: 2.50, perMinRate: 0.30, minFare: 10.00, capacity: 4, iconUrl: 'premium', isActive: true },
  { id: 'st3', name: 'XL', description: 'Extra space', baseFare: 4.00, perKmRate: 1.80, perMinRate: 0.25, minFare: 8.00, capacity: 6, iconUrl: 'suv', isActive: true },
  { id: 'st4', name: 'Delivery', description: 'Food & packages', baseFare: 3.00, perKmRate: 1.00, perMinRate: 0.10, minFare: 4.00, capacity: 1, iconUrl: 'delivery', isActive: true },
];

const trips = [
  { id: 'tr1', customerId: 'u1', driverId: 'd1', serviceTypeId: 'st1', status: 'completed', pickupAddress: '123 Main St', dropoffAddress: '456 Oak Ave', estimatedPrice: 12.50, finalPrice: 14.20, distanceKm: 8.5, durationMin: 18, paymentMethod: 'wallet', paymentStatus: 'completed', rating: 5, review: 'Great ride!', requestedAt: new Date(Date.now() - 86400000 * 5), completedAt: new Date(Date.now() - 86400000 * 5 + 1800000) },
  { id: 'tr2', customerId: 'u1', driverId: 'd2', serviceTypeId: 'st2', status: 'completed', pickupAddress: '789 Pine Rd', dropoffAddress: '321 Elm St', estimatedPrice: 25.00, finalPrice: 28.50, distanceKm: 12.0, durationMin: 25, paymentMethod: 'card', paymentStatus: 'completed', rating: 4, review: 'Comfortable ride', requestedAt: new Date(Date.now() - 86400000 * 2), completedAt: new Date(Date.now() - 86400000 * 2 + 2400000) },
  { id: 'tr3', customerId: 'u1', driverId: 'd1', serviceTypeId: 'st3', status: 'in_progress', pickupAddress: 'Current Location', dropoffAddress: 'Airport Terminal 2', estimatedPrice: 35.00, finalPrice: null, distanceKm: 18.0, durationMin: 35, paymentMethod: 'wallet', paymentStatus: 'pending', rating: null, review: null, requestedAt: new Date(), acceptedAt: new Date() },
];

const savedLocations = [
  { id: 'loc1', userId: 'u1', name: 'Home', address: '123 Main St, New York, NY', latitude: 40.7128, longitude: -74.0060, isFavorite: true },
  { id: 'loc2', userId: 'u1', name: 'Work', address: '456 Oak Ave, New York, NY', latitude: 40.7580, longitude: -73.9855, isFavorite: true },
];

const drivers = [
  { id: 'd1', fullName: 'Sarah Williams', rating: 4.8, vehicleType: 'Toyota Camry', vehicleColor: 'White', vehiclePlate: 'ABC-1234', avatarUrl: null, isOnline: true, latitude: 40.7150, longitude: -74.0100 },
  { id: 'd2', fullName: 'Mike Chen', rating: 4.6, vehicleType: 'Honda Accord', vehicleColor: 'Black', vehiclePlate: 'XYZ-5678', avatarUrl: null, isOnline: true, latitude: 40.7200, longitude: -74.0020 },
  { id: 'd3', fullName: 'Jessica Park', rating: 4.9, vehicleType: 'Tesla Model 3', vehicleColor: 'Red', vehiclePlate: 'TES-LA01', avatarUrl: null, isOnline: false, latitude: 40.7250, longitude: -73.9900 },
];

const paymentMethods = [
  { id: 'pm1', userId: 'u1', type: 'card', provider: 'Visa', identifier: '**** 4242', isDefault: true, isActive: true },
  { id: 'pm2', userId: 'u1', type: 'mobile_money', provider: 'M-Pesa', identifier: '+1234567890', isDefault: false, isActive: true },
];

const notifications = [
  { id: 'n1', userId: 'u1', title: 'Driver arriving', body: 'Sarah is 2 minutes away', type: 'trip', referenceId: 'tr3', isRead: false, createdAt: new Date() },
  { id: 'n2', userId: 'u1', title: 'Trip completed', body: 'Your trip to 456 Oak Ave cost $14.20', type: 'trip', referenceId: 'tr1', isRead: true, createdAt: new Date(Date.now() - 86400000 * 5) },
  { id: 'n3', userId: 'u1', title: 'Payment received', body: '$100.00 added to your wallet', type: 'payment', referenceId: 't1', isRead: false, createdAt: new Date(Date.now() - 86400000 * 7) },
];

const chatMessages = {
  'tr3': [
    { id: 'm1', tripId: 'tr3', senderId: 'd1', senderName: 'Sarah', message: 'Hi! I\'m on my way to your pickup location.', messageType: 'text', createdAt: new Date(Date.now() - 300000) },
    { id: 'm2', tripId: 'tr3', senderId: 'u1', senderName: 'You', message: 'Great, I\'m waiting outside the main entrance.', messageType: 'text', createdAt: new Date(Date.now() - 240000) },
    { id: 'm3', tripId: 'tr3', senderId: 'd1', senderName: 'Sarah', message: 'Perfect, I see you! I\'ll be there in 1 minute.', messageType: 'text', createdAt: new Date(Date.now() - 60000) },
  ],
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, phone, fullName, password } = req.body;
  const user = { id: uuidv4(), email, phone, fullName, role: 'customer', isVerified: true, isActive: true };
  users.push(user);
  wallets[user.id] = { id: uuidv4(), userId: user.id, balance: 0, currency: 'USD' };
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ status: 'success', data: { user, token, refreshToken: token } });
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email || u.phone === email);
  if (!user) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ status: 'success', data: { user, token, refreshToken: token } });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ status: 'error', message: 'User not found' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ status: 'success', data: { token, refreshToken: token } });
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ status: 'success', message: 'Logged out successfully' });
});

// User routes
app.get('/api/users/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
  res.json({ status: 'success', data: user });
});

app.patch('/api/users/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
  Object.assign(user, req.body);
  res.json({ status: 'success', data: user });
});

app.get('/api/users/locations', authMiddleware, (req, res) => {
  const locs = savedLocations.filter(l => l.userId === req.user.id);
  res.json({ status: 'success', data: locs });
});

app.post('/api/users/locations', authMiddleware, (req, res) => {
  const loc = { id: uuidv4(), userId: req.user.id, ...req.body };
  savedLocations.push(loc);
  res.json({ status: 'success', data: loc });
});

app.delete('/api/users/locations/:id', authMiddleware, (req, res) => {
  const idx = savedLocations.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ status: 'error', message: 'Location not found' });
  savedLocations.splice(idx, 1);
  res.json({ status: 'success', message: 'Location deleted' });
});

// Trip routes
app.post('/api/trips/estimate', authMiddleware, (req, res) => {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
  const distanceKm = Math.sqrt(Math.pow((dropoffLat - pickupLat) * 111, 2) + Math.pow((dropoffLng - pickupLng) * 111 * Math.cos(pickupLat * Math.PI / 180), 2));
  const durationMin = distanceKm / 0.5;
  const estimates = serviceTypes.map(st => ({
    ...st,
    estimatedPrice: Math.max(st.minFare, st.baseFare + st.perKmRate * distanceKm + st.perMinRate * durationMin),
    estimatedDistance: Math.round(distanceKm * 10) / 10,
    estimatedDuration: Math.round(durationMin),
  }));
  res.json({ status: 'success', data: estimates });
});

app.post('/api/trips', authMiddleware, (req, res) => {
  const { pickupAddress, dropoffAddress, serviceTypeId, paymentMethod } = req.body;
  const st = serviceTypes.find(s => s.id === serviceTypeId);
  const distanceKm = 5.0;
  const durationMin = 15;
  const trip = {
    id: uuidv4(), customerId: req.user.id, driverId: null, serviceTypeId,
    status: 'requested', pickupAddress, dropoffAddress,
    estimatedPrice: st ? Math.max(st.minFare, st.baseFare + st.perKmRate * distanceKm + st.perMinRate * durationMin) : 10,
    finalPrice: null, distanceKm, durationMin, paymentMethod: paymentMethod || 'cash',
    paymentStatus: 'pending', rating: null, review: null,
    requestedAt: new Date(), acceptedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
  };
  trips.push(trip);
  setTimeout(() => {
    const driver = drivers.find(d => d.isOnline);
    if (driver) {
      trip.driverId = driver.id;
      trip.status = 'accepted';
      trip.acceptedAt = new Date();
    }
  }, 2000);
  res.json({ status: 'success', data: trip });
});

app.get('/api/trips', authMiddleware, (req, res) => {
  const userTrips = trips.filter(t => t.customerId === req.user.id);
  res.json({ status: 'success', data: userTrips });
});

app.get('/api/trips/active', authMiddleware, (req, res) => {
  const active = trips.find(t => t.customerId === req.user.id && ['requested', 'accepted', 'in_progress'].includes(t.status));
  res.json({ status: 'success', data: active || null });
});

app.get('/api/trips/:id', authMiddleware, (req, res) => {
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ status: 'error', message: 'Trip not found' });
  const driver = trip.driverId ? drivers.find(d => d.id === trip.driverId) : null;
  res.json({ status: 'success', data: { ...trip, driver } });
});

app.patch('/api/trips/:id/cancel', authMiddleware, (req, res) => {
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ status: 'error', message: 'Trip not found' });
  trip.status = 'cancelled';
  trip.cancelledAt = new Date();
  trip.cancellationReason = req.body.reason || 'Cancelled by user';
  res.json({ status: 'success', data: trip });
});

app.post('/api/trips/:id/rate', authMiddleware, (req, res) => {
  const trip = trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ status: 'error', message: 'Trip not found' });
  trip.rating = req.body.rating;
  trip.review = req.body.review || '';
  res.json({ status: 'success', data: trip });
});

// Payment routes
app.get('/api/payments/methods', authMiddleware, (req, res) => {
  const methods = paymentMethods.filter(p => p.userId === req.user.id);
  res.json({ status: 'success', data: methods });
});

app.post('/api/payments/methods', authMiddleware, (req, res) => {
  const method = { id: uuidv4(), userId: req.user.id, ...req.body, isActive: true };
  if (method.isDefault) {
    paymentMethods.filter(p => p.userId === req.user.id).forEach(p => p.isDefault = false);
  }
  paymentMethods.push(method);
  res.json({ status: 'success', data: method });
});

app.post('/api/payments/process', authMiddleware, (req, res) => {
  res.json({ status: 'success', data: { transactionId: uuidv4(), status: 'completed', message: 'Payment processed successfully' } });
});

// Wallet routes
app.get('/api/wallets/balance', authMiddleware, (req, res) => {
  const wallet = wallets[req.user.id];
  res.json({ status: 'success', data: wallet || { balance: 0, currency: 'USD' } });
});

app.post('/api/wallets/deposit', authMiddleware, (req, res) => {
  const wallet = wallets[req.user.id] || { id: uuidv4(), userId: req.user.id, balance: 0, currency: 'USD' };
  wallets[req.user.id] = wallet;
  wallet.balance += req.body.amount;
  wallet.updatedAt = new Date();
  const tx = { id: uuidv4(), walletId: wallet.id, type: 'deposit', amount: req.body.amount, description: 'Wallet top-up', status: 'completed', createdAt: new Date() };
  transactions.push(tx);
  res.json({ status: 'success', data: { balance: wallet.balance, transaction: tx } });
});

app.post('/api/wallets/withdraw', authMiddleware, (req, res) => {
  const wallet = wallets[req.user.id];
  if (!wallet || wallet.balance < req.body.amount) {
    return res.status(400).json({ status: 'error', message: 'Insufficient balance' });
  }
  wallet.balance -= req.body.amount;
  const tx = { id: uuidv4(), walletId: wallet.id, type: 'withdrawal', amount: -req.body.amount, description: 'Withdrawal', status: 'completed', createdAt: new Date() };
  transactions.push(tx);
  res.json({ status: 'success', data: { balance: wallet.balance, transaction: tx } });
});

app.get('/api/wallets/transactions', authMiddleware, (req, res) => {
  const wallet = wallets[req.user.id];
  if (!wallet) return res.json({ status: 'success', data: [] });
  const txs = transactions.filter(t => t.walletId === wallet.id);
  res.json({ status: 'success', data: txs });
});

// Location routes
app.get('/api/locations/drivers', authMiddleware, (req, res) => {
  const { lat, lng, radius } = req.query;
  const nearby = drivers.filter(d => d.isOnline);
  res.json({ status: 'success', data: nearby });
});

// Notification routes
app.get('/api/notifications', authMiddleware, (req, res) => {
  const userNotifications = notifications.filter(n => n.userId === req.user.id);
  res.json({ status: 'success', data: userNotifications });
});

app.get('/api/notifications/unread-count', authMiddleware, (req, res) => {
  const count = notifications.filter(n => n.userId === req.user.id && !n.isRead).length;
  res.json({ status: 'success', data: { count } });
});

app.patch('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const notification = notifications.find(n => n.id === req.params.id);
  if (notification) notification.isRead = true;
  res.json({ status: 'success', data: notification });
});

app.patch('/api/notifications/read-all', authMiddleware, (req, res) => {
  notifications.filter(n => n.userId === req.user.id).forEach(n => n.isRead = true);
  res.json({ status: 'success', data: { message: 'All marked as read' } });
});

// Chat routes
app.get('/api/chat/:tripId/messages', authMiddleware, (req, res) => {
  const messages = chatMessages[req.params.tripId] || [];
  res.json({ status: 'success', data: messages });
});

app.post('/api/chat/:tripId/messages', authMiddleware, (req, res) => {
  const msg = { id: uuidv4(), tripId: req.params.tripId, senderId: req.user.id, senderName: 'You', message: req.body.message, messageType: 'text', createdAt: new Date() };
  if (!chatMessages[req.params.tripId]) chatMessages[req.params.tripId] = [];
  chatMessages[req.params.tripId].push(msg);
  res.json({ status: 'success', data: msg });
});

// Service types
app.get('/api/services', authMiddleware, (req, res) => {
  res.json({ status: 'success', data: serviceTypes });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Food Delivery Customer API running on http://localhost:${PORT}`);
  console.log(`📋 API base: http://localhost:${PORT}/api`);
  console.log(`🔑 Demo login: POST /api/auth/login { "email": "demo@uber.com" }`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
});
