const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createPromo(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, discountPercent, maxDiscount, minOrderAmount, usageLimit, expiresAt } = req.validated;

    const existing = await db.where('promoCodes', 'code', '==', code.toUpperCase());
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Promo code already exists' });
    }

    const promoData = {
      code: code.toUpperCase(),
      discountPercent,
      maxDiscount: maxDiscount || null,
      minOrderAmount: minOrderAmount || 0,
      usageLimit: usageLimit || null,
      usedCount: 0,
      expiresAt: expiresAt || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const promoRef = await db.add('promoCodes', promoData);
    res.json({ success: true, promoCode: { id: promoRef.id, ...promoData } });
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getPromoCodes(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const promos = await db.where('promoCodes', 'isActive', '==', true);
    res.json({ success: true, promoCodes: promos });
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function validatePromo(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, orderAmount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Promo code required' });
    }

    const promos = await db.where('promoCodes', 'code', '==', code.toUpperCase());
    if (promos.length === 0) {
      return res.json({ success: false, error: 'Invalid promo code' });
    }

    const promo = promos[0];
    if (!promo.isActive) {
      return res.json({ success: false, error: 'Promo code is inactive' });
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.json({ success: false, error: 'Promo code has expired' });
    }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.json({ success: false, error: 'Promo code usage limit reached' });
    }
    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return res.json({ success: false, error: `Minimum order amount is ${promo.minOrderAmount}` });
    }

    const discount = Math.min(
      Math.round(orderAmount * promo.discountPercent / 100),
      promo.maxDiscount || Infinity
    );

    res.json({ 
      success: true, 
      valid: true, 
      discount,
      promoCode: { 
        code: promo.code, 
        discountPercent: promo.discountPercent,
        maxDiscount: promo.maxDiscount 
      } 
    });
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function promoRoutes(app) {
  const { verifyToken, requireAdmin } = require('../middleware/auth');
  const { validate } = require('../middleware/validate');
  const { schemas } = require('../middleware/validate');
  const { idempotency } = require('../middleware/idempotency');

  app.post('/api/promo-codes', verifyToken, requireAdmin, validate(schemas.promo), idempotency(), createPromo);
  app.get('/api/promo-codes', verifyToken, requireAdmin, getPromoCodes);
  app.post('/api/promo-codes/validate', optionalAuth, validatePromo);
  app.post('/api/v1/promo-codes', verifyToken, requireAdmin, validate(schemas.promo), idempotency(), createPromo);
  app.get('/api/v1/promo-codes', verifyToken, requireAdmin, getPromoCodes);
  app.post('/api/v1/promo-codes/validate', optionalAuth, validatePromo);
}

module.exports = { promoRoutes };