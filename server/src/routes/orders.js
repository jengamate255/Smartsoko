const { Router } = require('express');
const { authMiddleware } = require('../auth');
const { orders, wsClients } = require('../store');

const router = Router();

router.get('/available', authMiddleware, (req, res) => {
  const available = [...orders.values()].filter(o => o.status === 'PENDING');
  res.json({ success: true, data: available, message: null });
});

router.post('/accept', authMiddleware, (req, res) => {
  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, message: 'order_id required' });
  const order = orders.get(order_id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.status !== 'PENDING') return res.status(409).json({ success: false, message: 'Order already taken' });
  order.status = 'ACCEPTED';
  order.updated_at = Date.now();
  broadcast({ type: 'order_accepted', order_id });
  res.json({ success: true, data: order, message: 'Accepted' });
});

router.post('/reject', authMiddleware, (req, res) => {
  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, message: 'order_id required' });
  const order = orders.get(order_id);
  if (order && order.status === 'PENDING') {
    order.status = 'CANCELLED';
    order.updated_at = Date.now();
    broadcast({ type: 'order_rejected', order_id });
  }
  res.json({ success: true, data: {}, message: 'Rejected' });
});

router.post('/status', authMiddleware, (req, res) => {
  const { order_id, status, timestamp } = req.body || {};
  if (!order_id || !status) return res.status(400).json({ success: false, message: 'order_id and status required' });
  const order = orders.get(order_id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  order.updated_at = timestamp || Date.now();
  broadcast({ type: 'order_status_changed', order_id, status });
  res.json({ success: true, data: order, message: 'Status updated' });
});

router.get('/history', authMiddleware, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const delivered = [...orders.values()]
    .filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED')
    .sort((a, b) => b.created_at - a.created_at);
  const start = (page - 1) * limit;
  const paged = delivered.slice(start, start + limit);
  res.json({ success: true, data: paged, message: null });
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of wsClients.values()) {
    try { ws.send(data); } catch { /* ignore */ }
  }
}

module.exports = router;
