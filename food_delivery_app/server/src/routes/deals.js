const { verifyToken, requireMerchant, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');
const config = require('../config');

async function getDb(req) {
  return req.app.get('db');
}

async function createDeal(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, productIds, dealPrice, discountPercent, startDate, endDate, merchantId, isActive } = req.validated;

    const dealData = {
      name,
      productIds: Array.isArray(productIds) ? productIds : [productIds],
      dealPrice: parseFloat(dealPrice),
      discountPercent: discountPercent || 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      merchantId: merchantId || req.user?.uid || null,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
    };

    const dealRef = await db.add('flashDeals', dealData);
    res.json({ success: true, deal: { id: dealRef.id, ...dealData } });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getDeals(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const deals = await db.getAll('flashDeals');
    const now = new Date();
    const activeDeals = deals.filter(d => {
      const start = new Date(d.startDate);
      const end = d.endDate ? new Date(d.endDate) : null;
      return d.isActive && start <= now && (!end || end >= now);
    });

    res.json({ success: true, deals: activeDeals });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function dealRoutes(app) {
  app.post('/api/deals', verifyToken, requireMerchant, validate(schemas.deal), idempotency(), createDeal);
  app.get('/api/deals', getDeals);
  app.get('/api/v1/deals', getDeals);
}

module.exports = { dealRoutes, createDeal, getDeals };