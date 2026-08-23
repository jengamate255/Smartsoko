/**
 * Product & Category Routes
 * Public catalogue endpoints used by web/config/api-config.js:
 *   - GET /api/products          (list products; ?popular=true, ?limit, ?offset)
 *   - GET /api/products/:id
 *   - GET /api/products/seller/:sellerId
 *   - GET /api/categories
 *
 * Reads from the flat db adapter (Firestore proxy or Supabase fallback)
 * that server-production.js attaches via app.set('db', ...).
 */

async function getDb(req) {
  return req.app.get('db');
}

function normalizeProduct(doc) {
  return {
    id: doc.id,
    name: doc.name || doc.title || 'Unnamed product',
    description: doc.description || '',
    price: Number(doc.price ?? doc.salePrice ?? doc.selling_price ?? 0),
    image: doc.image || doc.imageUrl || doc.image_url || doc.photoURL || '',
    category: doc.category || doc.categoryName || 'other',
    seller_id: doc.sellerId || doc.seller_id || doc.merchantId || doc.restaurant_id || '',
    isAvailable: doc.isAvailable !== false && doc.available !== false,
    popular: Boolean(doc.popular),
    created_at: doc.createdAt || doc.created_at || null,
  };
}

async function listProducts(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    let items = [];
    try {
      items = (await db.getAll('products')) || [];
    } catch (_) {
      items = [];
    }

    const sellerId = req.query.sellerId || req.params.sellerId;
    let products = items.map(normalizeProduct);

    if (sellerId) {
      products = products.filter((p) => p.seller_id === sellerId);
    }
    if (req.query.category) {
      products = products.filter((p) => p.category === req.query.category);
    }
    if (req.query.popular === 'true') {
      const popular = products.filter((p) => p.popular);
      products = popular.length > 0 ? popular : products;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    return res.json({
      success: true,
      data: products.slice(offset, offset + limit),
      total: products.length,
    });
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getProduct(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const doc = await db.get('products', req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, data: normalizeProduct(doc) });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function listCategories(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    // Derive categories from the product catalogue so the two stay in sync.
    let items = [];
    try {
      items = (await db.getAll('products')) || [];
    } catch (_) {
      items = [];
    }
    if (items.length === 0) {
      try {
        items = (await db.getAll('categories')) || [];
        return res.json({
          success: true,
          data: items.map((c) => ({ id: c.id, name: c.name || c.title, product_count: c.count ?? null })),
        });
      } catch (_) {
        // fall through to empty list
      }
    }

    const counts = new Map();
    for (const raw of items) {
      const p = normalizeProduct(raw);
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    const data = [...counts.entries()]
      .map(([name, count]) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, product_count: count }))
      .sort((a, b) => b.product_count - a.product_count);

    return res.json({ success: true, data });
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function productRoutes(app) {
  app.get('/api/products', listProducts);
  app.get('/api/products/seller/:sellerId', listProducts);
  app.get('/api/v1/products', listProducts);
  app.get('/api/v1/products/seller/:sellerId', listProducts);
  app.get('/api/product/:id', getProduct);
  app.get('/api/v1/product/:id', getProduct);
  app.get('/api/categories', listCategories);
  app.get('/api/v1/categories', listCategories);
}

module.exports = { productRoutes };
