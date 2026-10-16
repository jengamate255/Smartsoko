const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createGiftCard(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, amount, currency, purchaserId, recipientEmail, message, expiresAt } = req.validated;

    const giftCardData = {
      code: code.toUpperCase(),
      amount: parseFloat(amount),
      currency: currency || 'TZS',
      purchaserId: purchaserId || req.user?.uid || null,
      recipientEmail: recipientEmail || null,
      message: message || '',
      expiresAt: expiresAt || null,
      balance: parseFloat(amount),
      isRedeemed: false,
      createdAt: new Date().toISOString(),
    };

    const gcRef = await db.add('giftCards', giftCardData);
    res.json({ success: true, giftCard: { id: gcRef.id, ...giftCardData } });
  } catch (error) {
    console.error('Create gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function redeemGiftCard(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, userId } = req.body;
    if (!code || !userId) {
      return res.status(400).json({ success: false, error: 'Code and userId are required' });
    }

    const giftCards = await db.where('giftCards', 'code', '==', code.toUpperCase());
    if (giftCards.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid gift card code' });
    }

    const giftCard = giftCards[0];
    if (giftCard.isRedeemed) {
      return res.status(400).json({ success: false, error: 'Gift card already redeemed' });
    }
    if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'Gift card has expired' });
    }

    const wallet = await db.get('wallets', userId);
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'User wallet not found' });
    }

    const newBalance = (wallet.balance || 0) + giftCard.balance;
    await db.update('wallets', userId, { balance: newBalance });
    await db.update('giftCards', giftCard.id, { 
      isRedeemed: true, 
      redeemedBy: userId, 
      redeemedAt: new Date().toISOString() 
    });

    res.json({ success: true, newBalance, giftCardAmount: giftCard.balance });
  } catch (error) {
    console.error('Redeem gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function giftCardRoutes(app) {
  app.post('/api/gift-cards', verifyToken, requireAdmin, idempotency(), createGiftCard);
  app.post('/api/gift-cards/redeem', optionalAuth, idempotency(), redeemGiftCard);
  app.post('/api/v1/gift-cards', verifyToken, requireAdmin, idempotency(), createGiftCard);
  app.post('/api/v1/gift-cards/redeem', optionalAuth, idempotency(), redeemGiftCard);
}

module.exports = { createGiftCard: null, redeemGiftCard: null };