const { verifyToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createReferral(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { referrerId, refereeId, rewardAmount, rewardType } = req.validated;

    if (!referrerId || !refereeId) {
      return res.status(400).json({ success: false, error: 'Referrer and referee IDs are required' });
    }

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
      createdAt: new Date().toISOString(),
    };

    const refRef = await db.add('referrals', referralData);
    res.json({ success: true, referral: { id: refRef.id, ...referralData } });
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function completeReferral(req, res) {
  try {
    const db = await getDb(req);
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

    if (referral.rewardAmount > 0 && referral.rewardType === 'wallet_credit') {
      const wallet = await db.get('wallets', referral.referrerId);
      if (wallet) {
        const newBalance = (wallet.balance || 0) + referral.rewardAmount;
        await db.update('wallets', referral.referrerId, { balance: newBalance });
      }
    }

    await db.update('referrals', referralId, { 
      status: 'completed', 
      completedAt: new Date().toISOString() 
    });

    res.json({ success: true, message: 'Referral completed and reward awarded' });
  } catch (error) {
    console.error('Complete referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function referralRoutes(app) {
  app.post('/api/referrals', verifyToken, idempotency(), createReferral);
  app.post('/api/referrals/complete', verifyToken, completeReferral);
  app.post('/api/v1/referrals', verifyToken, idempotency(), createReferral);
  app.post('/api/v1/referrals/complete', verifyToken, completeReferral);
}

module.exports = { createReferral: null, completeReferral: null };