const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Auth verification middleware
async function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.use('/admin*', verifyAdminToken);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(500).get();
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ orders, total: orders.length });
  } catch (e) {
    console.error('load orders error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('orders').doc(req.params.id).update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/orders/:id/assign', async (req, res) => {
  try {
    const { driverId, driverName } = req.body;
    await db.collection('orders').doc(req.params.id).update({ driverId, driverName, status: 'assigned', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    if (driverId) await db.collection('drivers').doc(driverId).update({ available: false, currentOrderId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    await db.collection('orders').doc(req.params.id).update({ status: 'cancelled', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sellers
app.get('/api/admin/sellers', async (req, res) => {
  try {
    const snapshot = await db.collection('sellers').orderBy('createdAt', 'desc').limit(500).get();
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/sellers/:id', async (req, res) => {
  try {
    const doc = await db.collection('sellers').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/sellers/:id', async (req, res) => {
  try {
    const { action } = req.body;
    const ref = db.collection('sellers').doc(req.params.id);
    if (action === 'approve') await ref.update({ isApproved: true, approvedAt: admin.firestore.FieldValue.serverTimestamp() });
    else if (action === 'suspend') await ref.update({ isSuspended: true });
    else if (action === 'activate') await ref.update({ isSuspended: false });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/sellers/:id', async (req, res) => {
  try {
    await db.collection('sellers').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users
app.get('/api/admin/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(500).get();
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/users/export', async (req, res) => {
  try {
    const role = req.query.role;
    let q = db.collection('users').orderBy('createdAt', 'desc');
    if (role && role !== 'all') q = q.where('role', '==', role);
    const snapshot = await q.limit(5000).get();
    const rows = [['ID','Name','Email','Phone','Role','Status','Joined']];
    snapshot.docs.forEach(d => {
      const u = d.data();
      rows.push([d.id, u.fullName||'', u.email||'', u.phone||'', u.role||'', u.status||'active', u.createdAt?.toDate?.().toISOString?.() || '']);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    res.send(rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Drivers
app.get('/api/admin/drivers', async (req, res) => {
  try {
    const snapshot = await db.collection('drivers').orderBy('createdAt', 'desc').limit(500).get();
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Log endpoint (no-op)
app.get('/api/admin/log', (req, res) => res.json({ ok: true }));
app.post('/api/admin/log', (req, res) => res.json({ ok: true }));

// Vendor analytics (placeholder)
app.get('/api/vendor/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const ordersSnap = await db.collection('orders').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start)).get();
    let revenue = 0;
    ordersSnap.docs.forEach(d => { revenue += Number(d.data().total || 0); });
    res.json({
      sales: { revenue, orders: ordersSnap.size, avgOrder: ordersSnap.size ? revenue / ordersSnap.size : 0 },
      users: { new: 0, total: 0, returning: 0 },
      products: { total: 0, sold: 0 }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/vendor/orders', async (req, res) => {
  try {
    const sellerId = req.query.sellerId;
    let q = db.collection('orders').orderBy('createdAt', 'desc');
    if (sellerId) q = q.where('sellerId', '==', sellerId);
    const snap = await q.limit(parseInt(req.query.limit) || 20).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/vendor/products', async (req, res) => {
  try {
    const sellerId = req.query.sellerId;
    let q = db.collection('products');
    if (sellerId) q = q.where('sellerId', '==', sellerId);
    const snap = await q.limit(parseInt(req.query.limit) || 20).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data, pagination: { page: 1, limit: 20, total: data.length, pages: 1 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export
exports.api = functions.https.onRequest(app);