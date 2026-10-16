const { verifyToken, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idempotency } = require('../middleware/idempotency');
const { schemas } = require('../middleware/validate');

async function getDb(req) {
  return req.app.get('db');
}

async function createReview(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, userId, rating, comment, orderId } = req.validated;

    const reviewData = {
      productId,
      userId,
      rating: parseInt(rating),
      comment: comment || '',
      orderId: orderId || null,
      createdAt: new Date().toISOString(),
      verified: !!orderId,
    };

    const reviewRef = await db.add('reviews', reviewData);

    const reviews = await db.where('reviews', 'productId', '==', productId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db.update('products', productId, { 
      rating: parseFloat(avgRating.toFixed(1)), 
      reviewCount: reviews.length 
    });

    res.json({ success: true, review: { id: reviewRef.id, ...reviewData } });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReviews(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.params;
    const reviews = await db.where('reviews', 'productId', '==', productId);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function reviewRoutes(app) {
  app.post('/api/reviews', verifyToken, idempotency(), createReview);
  app.get('/api/reviews/:productId', optionalAuth, getReviews);
  app.post('/api/v1/reviews', verifyToken, idempotency(), createReview);
  app.get('/api/v1/reviews/:productId', optionalAuth, getReviews);
}

module.exports = { createReview: null, getReviews: null };