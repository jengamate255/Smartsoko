/**
 * Shopify-Style Features API
 * Adds: Product Variants, Inventory, Collections, Coupons, Reviews, Bundles
 */

const express = require('express');
const router = express.Router();

let db = null;
let admin = null;
let auth = null;
let validate = null;

function init(firebaseDb, firebaseAdmin, authMiddleware, validateInput) {
  db = firebaseDb;
  admin = firebaseAdmin;
  auth = authMiddleware;
  validate = validateInput;
}

// Lazy auth middleware wrappers (auth is null at module load time, set via init)
function requireAuth(...roles) {
  return (req, res, next) => {
    if (!auth) return res.status(503).json({ success: false, error: 'Auth not initialized' });
    const middleware = roles.length ? auth.requireRole(...roles) : ((r, r2, n) => n());
    return auth.verifyToken(req, res, (err) => {
      if (err) return next(err);
      if (roles.length) return auth.requireRole(...roles)(req, res, next);
      next();
    });
  };
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT VARIANTS
// ═══════════════════════════════════════════════════════════════

// Create product variant
router.post('/variants', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, name, price, sku, stock, attributes } = req.body;

    if (!productId || !name) {
      return res.status(400).json({ success: false, error: 'Product ID and variant name are required' });
    }

    const variantData = {
      productId,
      name,
      price: price || 0,
      sku: sku || '',
      stock: stock || 0,
      attributes: attributes || {},
      isActive: true,
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('product_variants').add(variantData);

    // Update parent product to indicate it has variants
    if (productId) {
      await db.collection('products').doc(productId).update({
        hasVariants: true,
        updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, id: result.id, variant: { id: result.id, ...variantData } });
  } catch (error) {
    console.error('Error creating variant:', error);
    res.status(500).json({ success: false, error: 'Failed to create variant' });
  }
});

// Get variants for a product
router.get('/variants/:productId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.params;
    const snapshot = await db.collection('product_variants')
      .where('productId', '==', productId)
      .get();

    const variants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, variants });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch variants' });
  }
});

// Update variant
router.put('/variants/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const updates = req.body;

    await db.collection('product_variants').doc(id).update({
      ...updates,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).json({ success: false, error: 'Failed to update variant' });
  }
});

// Delete variant
router.delete('/variants/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    await db.collection('product_variants').doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).json({ success: false, error: 'Failed to delete variant' });
  }
});

// ═══════════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Get inventory for merchant
router.get('/inventory', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId } = req.query;
    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'Merchant ID is required' });
    }

    // Get products with stock info
    const snapshot = await db.collection('products')
      .where('merchantId', '==', merchantId)
      .get();

    let lowStockItems = [];
    let outOfStockItems = [];
    let inStockItems = [];

    snapshot.docs.forEach(doc => {
      const product = { id: doc.id, ...doc.data() };
      const stock = product.stock || 0;

      if (stock === 0) {
        outOfStockItems.push(product);
      } else if (stock <= (product.lowStockThreshold || 10)) {
        lowStockItems.push(product);
      } else {
        inStockItems.push(product);
      }
    });

    // Get variants with stock
    const variantSnapshot = await db.collection('product_variants').get();
    let variantLowStock = [];
    let variantOutOfStock = [];

    variantSnapshot.docs.forEach(doc => {
      const variant = { id: doc.id, ...doc.data() };
      const stock = variant.stock || 0;

      if (stock === 0) {
        variantOutOfStock.push(variant);
      } else if (stock <= 5) {
        variantLowStock.push(variant);
      }
    });

    res.json({
      success: true,
      inventory: {
        inStock: inStockItems.length,
        lowStock: lowStockItems.length + variantLowStock.length,
        outOfStock: outOfStockItems.length + variantOutOfStock.length,
        lowStockItems: [...lowStockItems, ...variantLowStock],
        outOfStockItems: [...outOfStockItems, ...variantOutOfStock]
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Update stock
router.put('/inventory/:type/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { type, id } = req.params;
    const { stock, operation, quantity } = req.body;

    let collection = type === 'variant' ? 'product_variants' : 'products';
    let currentDoc = await db.collection(collection).doc(id).get();

    if (!currentDoc.exists) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    let currentStock = currentDoc.data().stock || 0;
    let newStock;

    if (operation === 'add') {
      newStock = currentStock + (quantity || 0);
    } else if (operation === 'subtract') {
      newStock = Math.max(0, currentStock - (quantity || 0));
    } else {
      newStock = stock;
    }

    await db.collection(collection).doc(id).update({
      stock: newStock,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true, newStock });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: 'Failed to update stock' });
  }
});

// Bulk stock update
router.post('/inventory/bulk', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { updates } = req.body; // Array of { type, id, stock }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Updates array is required' });
    }

    const batch = db.batch();
    const timestamp = admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString();

    updates.forEach(update => {
      const collection = update.type === 'variant' ? 'product_variants' : 'products';
      const ref = db.collection(collection).doc(update.id);
      batch.update(ref, { stock: update.stock, updatedAt: timestamp });
    });

    await batch.commit();

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('Error bulk updating stock:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update stock' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT COLLECTIONS
// ═══════════════════════════════════════════════════════════════

// Create collection
router.post('/collections', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, description, imageUrl, merchantId, productIds } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }

    const collectionData = {
      name,
      description: description || '',
      imageUrl: imageUrl || '',
      merchantId: merchantId || '',
      productIds: productIds || [],
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('collections').add(collectionData);

    res.status(201).json({ success: true, id: result.id, collection: { id: result.id, ...collectionData } });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ success: false, error: 'Failed to create collection' });
  }
});

// Get collections
router.get('/collections', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId } = req.query;
    let query = db.collection('collections');

    if (merchantId) {
      query = query.where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch collections' });
  }
});

// Get single collection with products
router.get('/collections/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const doc = await db.collection('collections').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }

    const collection = { id: doc.id, ...doc.data() };

    // Fetch products in collection
    if (collection.productIds && collection.productIds.length > 0) {
      const productPromises = collection.productIds.map(pid => 
        db.collection('products').doc(pid).get()
      );
      const productDocs = await Promise.all(productPromises);
      collection.products = productDocs.map(d => d.exists ? { id: d.id, ...d.data() } : null).filter(Boolean);
    }

    res.json({ success: true, collection });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch collection' });
  }
});

// Update collection
router.put('/collections/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const updates = req.body;

    await db.collection('collections').doc(id).update({
      ...updates,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ success: false, error: 'Failed to update collection' });
  }
});

// Delete collection
router.delete('/collections/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    await db.collection('collections').doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ success: false, error: 'Failed to delete collection' });
  }
});

// Add products to collection
router.post('/collections/:id/products', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, error: 'Product IDs array is required' });
    }

    const doc = await db.collection('collections').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }

    const currentProducts = doc.data().productIds || [];
    const newProducts = [...new Set([...currentProducts, ...productIds])];

    await db.collection('collections').doc(id).update({
      productIds: newProducts,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true, productCount: newProducts.length });
  } catch (error) {
    console.error('Error adding products to collection:', error);
    res.status(500).json({ success: false, error: 'Failed to add products to collection' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DISCOUNT COUPONS
// ═══════════════════════════════════════════════════════════════

// Create coupon
router.post('/coupons', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, type, value, minPurchase, maxUses, uses, startDate, endDate, merchantId, productIds, isActive } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({ success: false, error: 'Code, type, and value are required' });
    }

    const couponData = {
      code: code.toUpperCase(),
      type: type, // 'percentage' or 'fixed'
      value: parseFloat(value),
      minPurchase: minPurchase || 0,
      maxUses: maxUses || null,
      uses: uses || 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || null,
      merchantId: merchantId || '',
      productIds: productIds || [],
      isActive: isActive !== false,
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('coupons').add(couponData);

    res.status(201).json({ success: true, id: result.id, coupon: { id: result.id, ...couponData } });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to create coupon' });
  }
});

// Get coupons
router.get('/coupons', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId } = req.query;
    let query = db.collection('coupons');

    if (merchantId) {
      query = query.where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    const coupons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
  }
});

// Validate coupon
router.post('/coupons/validate', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { code, merchantId, cartTotal, productIds } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required' });
    }

    const snapshot = await db.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, valid: false, error: 'Coupon not found' });
    }

    const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    // Check if merchant matches
    if (coupon.merchantId && coupon.merchantId !== merchantId) {
      return res.json({ valid: false, error: 'Coupon not valid for this store' });
    }

    // Check if active
    if (!coupon.isActive) {
      return res.json({ valid: false, error: 'Coupon is no longer active' });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
      return res.json({ valid: false, error: 'Coupon usage limit reached' });
    }

    // Check date validity
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return res.json({ valid: false, error: 'Coupon is not yet active' });
    }
    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return res.json({ valid: false, error: 'Coupon has expired' });
    }

    // Check minimum purchase
    if (cartTotal && coupon.minPurchase && cartTotal < coupon.minPurchase) {
      return res.json({ valid: false, error: `Minimum purchase of ${coupon.minPurchase} required` });
    }

    // Check if applicable to cart products
    if (coupon.productIds && coupon.productIds.length > 0 && productIds) {
      const hasApplicableProduct = productIds.some(pid => coupon.productIds.includes(pid));
      if (!hasApplicableProduct) {
        return res.json({ valid: false, error: 'Coupon not applicable to items in cart' });
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cartTotal || 0) * (coupon.value / 100);
    } else {
      discount = Math.min(coupon.value, cartTotal || 0);
    }

    res.json({ 
      valid: true, 
      discount: Math.round(discount * 100) / 100,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to validate coupon' });
  }
});

// Redeem coupon (increment usage)
router.post('/coupons/:id/redeem', requireAuth(), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const doc = await db.collection('coupons').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    const currentUses = doc.data().uses || 0;
    await db.collection('coupons').doc(id).update({
      uses: currentUses + 1
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error redeeming coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem coupon' });
  }
});

// Delete coupon
router.delete('/coupons/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    await db.collection('coupons').doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to delete coupon' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT REVIEWS & RATINGS
// ═══════════════════════════════════════════════════════════════

// Create review
router.post('/reviews', requireAuth(), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, rating, comment, userId, userName, orderId } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: 'Product ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const reviewData = {
      productId,
      rating: parseInt(rating),
      comment: comment || '',
      userId: userId || '',
      userName: userName || 'Anonymous',
      orderId: orderId || null,
      isVerified: !!orderId,
      isApproved: true, // Auto-approve for now
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('reviews').add(reviewData);

    // Update product rating
    await updateProductRating(productId);

    res.status(201).json({ success: true, id: result.id, review: { id: result.id, ...reviewData } });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, error: 'Failed to create review' });
  }
});

// Get reviews for product
router.get('/reviews', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.query;
    
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const snapshot = await db.collection('reviews')
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate stats
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => ratingBreakdown[r.rating]++);

    res.json({ 
      success: true, 
      reviews,
      stats: {
        total: reviews.length,
        average: avgRating,
        breakdown: ratingBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// Get merchant's product reviews
router.get('/reviews/merchant', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId } = req.query;

    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'Merchant ID is required' });
    }

    // Get merchant's products
    const productsSnapshot = await db.collection('products')
      .where('merchantId', '==', merchantId)
      .get();

    const productIds = productsSnapshot.docs.map(d => d.id);

    if (productIds.length === 0) {
      return res.json({ success: true, reviews: [], stats: { total: 0, average: 0 } });
    }

    // Get reviews for all products
    const reviewsSnapshot = await db.collection('reviews').get();
    let reviews = [];
    
    reviewsSnapshot.docs.forEach(doc => {
      const review = { id: doc.id, ...doc.data() };
      if (productIds.includes(review.productId)) {
        reviews.push(review);
      }
    });

    // Sort by date
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.json({ 
      success: true, 
      reviews: reviews.slice(0, 50), // Limit to 50
      stats: {
        total: reviews.length,
        average: avgRating
      }
    });
  } catch (error) {
    console.error('Error fetching merchant reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// Delete review
router.delete('/reviews/:id', requireAuth(), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const doc = await db.collection('reviews').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const productId = doc.data().productId;
    await db.collection('reviews').doc(id).delete();

    // Update product rating
    await updateProductRating(productId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
});

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    const snapshot = await db.collection('reviews')
      .where('productId', '==', productId)
      .get();

    if (snapshot.empty) {
      await db.collection('products').doc(productId).update({
        rating: 0,
        reviewCount: 0
      });
      return;
    }

    let totalRating = 0;
    snapshot.forEach(doc => {
      totalRating += doc.data().rating || 0;
    });

    const avgRating = totalRating / snapshot.size;

    await db.collection('products').doc(productId).update({
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: snapshot.size
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT BUNDLES
// ═══════════════════════════════════════════════════════════════

// Create bundle
router.post('/bundles', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { name, description, productIds, bundlePrice, discountPercent, merchantId, imageUrl, isActive } = req.body;

    if (!name || !productIds || productIds.length < 2) {
      return res.status(400).json({ success: false, error: 'Bundle name and at least 2 products are required' });
    }

    // Calculate original price
    let originalPrice = 0;
    const products = [];
    
    for (const pid of productIds) {
      const doc = await db.collection('products').doc(pid).get();
      if (doc.exists) {
        const product = { id: doc.id, ...doc.data() };
        originalPrice += product.price || 0;
        products.push(product);
      }
    }

    const calculatedDiscount = discountPercent || Math.round((1 - (bundlePrice / originalPrice)) * 100);

    const bundleData = {
      name,
      description: description || '',
      productIds,
      products,
      originalPrice: Math.round(originalPrice * 100) / 100,
      bundlePrice: bundlePrice || Math.round(originalPrice * (100 - calculatedDiscount) / 100),
      discountPercent: calculatedDiscount,
      merchantId: merchantId || '',
      imageUrl: imageUrl || '',
      isActive: isActive !== false,
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('bundles').add(bundleData);

    res.status(201).json({ success: true, id: result.id, bundle: { id: result.id, ...bundleData } });
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ success: false, error: 'Failed to create bundle' });
  }
});

// Get bundles
router.get('/bundles', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { merchantId } = req.query;
    let query = db.collection('bundles').where('isActive', '==', true);

    if (merchantId) {
      query = db.collection('bundles').where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    const bundles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, bundles });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bundles' });
  }
});

// Get single bundle
router.get('/bundles/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const doc = await db.collection('bundles').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Bundle not found' });
    }

    res.json({ success: true, bundle: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error fetching bundle:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bundle' });
  }
});

// Update bundle
router.put('/bundles/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    const updates = req.body;

    // Recalculate if products changed
    if (updates.productIds) {
      let originalPrice = 0;
      for (const pid of updates.productIds) {
        const doc = await db.collection('products').doc(pid).get();
        if (doc.exists) {
          originalPrice += doc.data().price || 0;
        }
      }
      updates.originalPrice = Math.round(originalPrice * 100) / 100;
      if (!updates.bundlePrice && updates.discountPercent) {
        updates.bundlePrice = Math.round(originalPrice * (100 - updates.discountPercent) / 100);
      }
    }

    await db.collection('bundles').doc(id).update({
      ...updates,
      updatedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating bundle:', error);
    res.status(500).json({ success: false, error: 'Failed to update bundle' });
  }
});

// Delete bundle
router.delete('/bundles/:id', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    await db.collection('bundles').doc(id).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({ success: false, error: 'Failed to delete bundle' });
  }
});

// ═══════════════════════════════════════════════════════════════
// WAITLIST (Out of Stock Notifications)
// ═══════════════════════════════════════════════════════════════

// Join waitlist
router.post('/waitlist', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId, email, phone, userId } = req.body;

    if (!productId || (!email && !phone)) {
      return res.status(400).json({ success: false, error: 'Product ID and email or phone are required' });
    }

    // Check if already on waitlist
    const existing = await db.collection('waitlist')
      .where('productId', '==', productId)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.json({ success: true, message: 'Already on waitlist', alreadyOnList: true });
    }

    const waitlistData = {
      productId,
      email: email || '',
      phone: phone || '',
      userId: userId || '',
      notified: false,
      createdAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    };

    const result = await db.collection('waitlist').add(waitlistData);

    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error joining waitlist:', error);
    res.status(500).json({ success: false, error: 'Failed to join waitlist' });
  }
});

// Get waitlist for product
router.get('/waitlist/:productId', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { productId } = req.params;
    const snapshot = await db.collection('waitlist')
      .where('productId', '==', productId)
      .where('notified', '==', false)
      .get();

    const waitlist = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, count: waitlist.length, waitlist });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch waitlist' });
  }
});

// Mark as notified
router.put('/waitlist/:id/notified', requireAuth('merchant', 'admin'), async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { id } = req.params;
    await db.collection('waitlist').doc(id).update({
      notified: true,
      notifiedAt: admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking waitlist notified:', error);
    res.status(500).json({ success: false, error: 'Failed to update waitlist' });
  }
});

module.exports = router;
module.exports.init = init;