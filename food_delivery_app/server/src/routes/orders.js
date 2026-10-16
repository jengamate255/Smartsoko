const { quoteOrder, customerIdFor } = require('../services/checkout');
const { issueOrderAccess, verifyOrderAccess } = require('../services/order-access');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createOrder(req, res) {
  req.idempotencySafeToRetry = true;
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const input = req.validated;
    const customerId = await customerIdFor(db, req.user);
    if (input.paymentMethod !== 'cod' && !customerId) return res.status(401).json({ success: false, error: 'Sign in to pay online' });
    const quote = await quoteOrder(db, input, req.app.get('config'));
    if (input.quotedTotal !== undefined && input.quotedTotal !== quote.total) return res.status(409).json({ success: false, error: 'Prices changed. Review your basket and try again.', quote });
    const orderData = {
      customer_name: input.name || input.customerName,
      customer_phone: input.phone || input.customerPhone || input.contactPhone,
      customer_id: customerId,
      restaurant_id: quote.sellerId,
      delivery_address: input.deliveryAddress,
      delivery_latitude: input.deliveryLat ?? null,
      delivery_longitude: input.deliveryLng ?? null,
      items: quote.items, subtotal: quote.subtotal, delivery_fee: quote.deliveryFee,
      tax: quote.taxAmount, discount_amount: quote.discount, total: quote.total,
      payment_method: input.paymentMethod,
      payment_status: input.paymentMethod === 'cod' ? 'cod' : 'pending_confirmation',
      status: 'pending', promo_code: quote.promoCode,
    };
    if (!customerId) issueOrderAccess('prepare-secret');
    req.idempotencySafeToRetry = false;
    const ref = await db.add('orders', orderData);
    try {
      const bus = require('../services/event-bus');
      bus.publish(bus.EVENTS.ORDER_CREATED, { merchantId: quote.sellerId, data: { orderId: ref.id, total: quote.total, customerName: orderData.customer_name } });
    } catch (_) { /* notifications must not turn a committed order into a retry */ }
    return res.json({ success: true, order: { id: ref.id, ...orderData }, ...(!customerId ? { accessToken: issueOrderAccess(ref.id) } : {}) });
  } catch (error) {
    console.error('Create order error:', error.message);
    if (error.code === 'P0001') {
      req.idempotencySafeToRetry = true; // Postgres rolled the entire insertion back.
      return res.status(409).json({ success: false, error: error.message });
    }
    return res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'Order could not be saved. Please retry with the same checkout.' });
  }
}

async function quoteCheckout(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    return res.json({ success: true, quote: await quoteOrder(db, req.body || {}, req.app.get('config')) });
  } catch (error) {
    return res.status(error.status || 503).json({ success: false, error: error.status ? error.message : 'Unable to calculate your order' });
  }
}

async function getOrders(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const customerId = await customerIdFor(db, req.user);
    const orders = await db.where('orders', 'customerId', '==', customerId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getOrder(req, res) {
  try {
    const guestAccess = verifyOrderAccess(req.headers['x-order-access-token'], req.params.orderId);
    if (!req.user && !guestAccess) return res.status(401).json({ success: false, error: 'Sign in or use the browser where you placed this order' });
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { orderId } = req.params;
    const order = await db.get('orders', orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const owner = order.customerId || order.customer_id;
    const customerId = req.user ? await customerIdFor(db, req.user) : null;
    if (!(guestAccess && !owner) && owner !== customerId && !req.user?.roles?.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function orderRoutes(app, options = {}) {
  const { verifyToken, optionalAuth } = options.authMiddleware || require('../middleware/auth');
  const { validate } = require('../middleware/validate');
  const { schemas } = require('../middleware/validate');
  const { idempotency } = require('../middleware/idempotency');

  app.post('/api/orders/quote', quoteCheckout);
  app.post('/api/v1/orders/quote', quoteCheckout);
  const authenticate = (req, res, next) => req.headers.authorization ? verifyToken(req, res, next) : optionalAuth(req, res, next);
  const protect = options.idempotencyMiddleware || idempotency();
  app.post('/api/orders', authenticate, validate(schemas.order), protect, createOrder);
  app.get('/api/orders', verifyToken, getOrders);
  app.get('/api/orders/:orderId', authenticate, getOrder);
  app.post('/api/v1/orders', authenticate, validate(schemas.order), protect, createOrder);
  app.get('/api/v1/orders', verifyToken, getOrders);
  app.get('/api/v1/orders/:orderId', authenticate, getOrder);
}

module.exports = { orderRoutes };
