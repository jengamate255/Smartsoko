const { verifyToken, requireMerchant, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createSubscription(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, description, price, currency, interval, features, merchantId, isActive } = req.validated;

    const subData = {
      name,
      description: description || '',
      price: parseFloat(price),
      currency: currency || 'TZS',
      interval,
      features: features || [],
      merchantId: merchantId || req.user?.uid || null,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
    };

    const subRef = await db.add('subscriptionPlans', subData);
    res.json({ success: true, plan: { id: subRef.id, ...subData } });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getSubscriptions(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const plans = await db.where('subscriptionPlans', 'isActive', '==', true);
    res.json({ success: true, plans });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function subscriptionRoutes(app) {
  app.post('/api/subscriptions', verifyToken, requireMerchant, idempotency(), createSubscription);
  app.get('/api/subscriptions', getSubscriptions);
  app.get('/api/v1/subscriptions', getSubscriptions);
}

module.exports = { subscriptionRoutes };