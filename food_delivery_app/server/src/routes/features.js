/**
 * Feature Routes
 * Inline business-logic endpoints extracted from server-production.js:
 *   - Flash Deals
 *   - Gift Cards
 *   - Subscription Plans
 *   - Referral System
 *   - Reviews & Ratings
 */

const express = require('express');
const router = express.Router();

// ─── Flash Deals / Daily Deals ──────────────────────────────────────

router.post('/deals', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, productIds, dealPrice, discountPercent, startDate, endDate, merchantId, isActive } = req.body;

    if (!name || !productIds || !dealPrice) {
      return res.status(400).json({ success: false, error: 'Name, products, and deal price are required' });
    }

    const dealData = {
      name,
      productIds: Array.isArray(productIds) ? productIds : [productIds],
      dealPrice: parseFloat(dealPrice),
      discountPercent: discountPercent || 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      merchantId: merchantId || null,
      isActive: isActive !== false,
      createdAt: new Date().toISOString()
    };

    const dealRef = await db.add('flashDeals', dealData);
    res.json({ success: true, deal: { id: dealRef.id, ...dealData } });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Create deal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals', async (req, res) => {
  try {
    const db = req.app.get('db');
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
    req.app.get('logger') && req.app.get('logger').error('Get deals error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Gift Cards ─────────────────────────────────────────────────────

router.post('/gift-cards', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, amount, currency, purchaserId, recipientEmail, message, expiresAt } = req.body;

    if (!code || !amount) {
      return res.status(400).json({ success: false, error: 'Code and amount are required' });
    }

    const giftCardData = {
      code: code.toUpperCase(),
      amount: parseFloat(amount),
      currency: currency || 'TZS',
      purchaserId: purchaserId || null,
      recipientEmail: recipientEmail || null,
      message: message || '',
      expiresAt: expiresAt || null,
      balance: parseFloat(amount),
      isRedeemed: false,
      createdAt: new Date().toISOString()
    };

    const gcRef = await db.add('giftCards', giftCardData);
    res.json({ success: true, giftCard: { id: gcRef.id, ...giftCardData } });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Create gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gift-cards/redeem', async (req, res) => {
  try {
    const db = req.app.get('db');
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

    // Add balance to user's wallet
    const wallet = await db.get('wallets', userId);
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'User wallet not found' });
    }

    const newBalance = (wallet.balance || 0) + giftCard.balance;
    await db.update('wallets', userId, { balance: newBalance });
    await db.update('giftCards', giftCard.id, { isRedeemed: true, redeemedBy: userId, redeemedAt: new Date().toISOString() });

    res.json({ success: true, newBalance, giftCardAmount: giftCard.balance });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Redeem gift card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Subscription Plans ─────────────────────────────────────────────

router.post('/subscriptions', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, description, price, currency, interval, features, merchantId } = req.body;

    if (!name || !price || !interval) {
      return res.status(400).json({ success: false, error: 'Name, price, and interval are required' });
    }

    const subData = {
      name,
      description: description || '',
      price: parseFloat(price),
      currency: currency || 'TZS',
      interval, // 'monthly', 'yearly'
      features: features || [],
      merchantId: merchantId || null,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const subRef = await db.add('subscriptionPlans', subData);
    res.json({ success: true, plan: { id: subRef.id, ...subData } });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Create subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const plans = await db.where('subscriptionPlans', 'isActive', '==', true);
    res.json({ success: true, plans });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Get subscriptions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Referral System ────────────────────────────────────────────────

router.post('/referrals', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referrerId, refereeId, rewardAmount, rewardType } = req.body;

    if (!referrerId || !refereeId) {
      return res.status(400).json({ success: false, error: 'Referrer and referee IDs are required' });
    }

    // Check if referral already exists
    const existing = await db.where('referrals', 'refereeId', '==', refereeId);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'User already referred' });
    }

    const referralData = {
      referrerId,
      refereeId,
      rewardAmount: rewardAmount || 0,
      rewardType: rewardType || 'wallet_credit',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const refRef = await db.add('referrals', referralData);
    res.json({ success: true, referral: { id: refRef.id, ...referralData } });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Create referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/referrals/complete', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referralId } = req.body;
    if (!referralId) {
      return res.status(400).json({ success: false, error: 'Referral ID required' });
    }

    const referral = await db.get('referrals', referralId);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found' });
    }
    if (referral.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Referral already processed' });
    }

    // Award reward to referrer
    if (referral.rewardAmount > 0 && referral.rewardType === 'wallet_credit') {
      const wallet = await db.get('wallets', referral.referrerId);
      if (wallet) {
        const newBalance = (wallet.balance || 0) + referral.rewardAmount;
        await db.update('wallets', referral.referrerId, { balance: newBalance });
      }
    }

    await db.update('referrals', referralId, { status: 'completed', completedAt: new Date().toISOString() });

    res.json({ success: true, message: 'Referral completed and reward awarded' });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Complete referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Reviews & Ratings ──────────────────────────────────────────────

router.post('/reviews', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, userId, rating, comment, orderId } = req.body;

    if (!productId || !userId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID, user ID, and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const reviewData = {
      productId,
      userId,
      rating: parseInt(rating),
      comment: comment || '',
      orderId: orderId || null,
      createdAt: new Date().toISOString(),
      verified: !!orderId
    };

    const reviewRef = await db.add('reviews', reviewData);

    // Update product rating
    const reviews = await db.where('reviews', 'productId', '==', productId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db.update('products', productId, {
      rating: parseFloat(avgRating.toFixed(1)),
      reviewCount: reviews.length
    });

    res.json({ success: true, review: { id: reviewRef.id, ...reviewData } });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Create review error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reviews/:productId', async (req, res) => {
  try {
    const db = req.app.get('db');
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.params;
    const reviews = await db.where('reviews', 'productId', '==', productId);
    res.json({ success: true, reviews });
  } catch (error) {
    req.app.get('logger') && req.app.get('logger').error('Get reviews error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
