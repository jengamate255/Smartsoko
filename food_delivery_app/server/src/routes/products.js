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

const { catalogRows, sendCatalog } = require('../services/catalog-cache');
const { variationsOf, sellerOf } = require('../services/checkout');
const getAllProductsCached = db => catalogRows(db, 'products');

function normalizeProduct(doc) {
  return {
    id: doc.id,
    name: doc.name || doc.title || 'Unnamed product',
    description: doc.description || '',
    price: Number(doc.price ?? doc.salePrice ?? doc.selling_price ?? 0),
    image: doc.image || doc.imageUrl || doc.image_url || doc.photoURL || '',
    category: doc.category || doc.categoryName || 'other',
    seller_id: sellerOf(doc) || '',
    sellerId: sellerOf(doc) || '',
    imageUrl: doc.imageUrl || doc.image_url || doc.image || '',
    variations: variationsOf(doc.variations),
    stock: doc.stockQuantity ?? doc.stock ?? null,
    isAvailable: !!sellerOf(doc) && doc.isAvailable !== false && doc.is_available !== false && doc.available !== false && (doc.stockQuantity ?? doc.stock ?? 1) > 0,
    popular: Boolean(doc.popular),
    created_at: doc.createdAt || doc.created_at || null,
  };
}

/**
 * Native-app DTO shape (android-customer-native ProductDto):
 * images: [..], category: {id,name,image_url,description}, seller: {id,name,
 * rating, delivery_time, image_url}, epoch-millis timestamps. Used when the
 * request carries the app's paging signature (per_page param) or okhttp UA.
 */
function isNativeAppRequest(req) {
  return req.query.per_page != null || /okhttp/i.test(String(req.headers['user-agent'] || ''));
}

function epochMs(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.seconds != null) return v.seconds * 1000;
  const t = Date.parse(String(v));
  return isNaN(t) ? 0 : t;
}

function asAppProduct(raw, sellers) {
  const p = normalizeProduct(raw);
  const seller = sellers.find((s) => s.id === p.seller_id);
  const images = Array.isArray(p.image) ? p.image : (p.image ? [p.image] : []);
  const stock = Number(raw.stockQuantity ?? raw.stock ?? 0);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    currency: 'TSh',
    images,
    category: {
      id: String(p.category).toLowerCase().replace(/\s+/g, '-'),
      name: p.category,
      image_url: images[0] || '',
      description: '',
    },
    seller: {
      id: p.seller_id,
      name: (seller && (seller.name || seller.storeName)) || 'SmartSoko Seller',
      rating: Number((seller && seller.rating) ?? raw.rating) || 0,
      delivery_time: seller && seller.deliveryTime != null ? `${seller.deliveryTime} min` : '30 min',
      image_url: (seller && (seller.logoUrl ?? seller.logo_url)) || '',
    },
    stock,
    rating: Number(raw.rating) || 0,
    review_count: Number(raw.reviewCount ?? raw.review_count) || 0,
    is_featured: Boolean(raw.isFeatured ?? raw.is_featured ?? (Number(raw.rating) >= 4)),
    created_at: epochMs(p.created_at),
    updated_at: epochMs(raw.updatedAt ?? raw.updated_at ?? p.created_at),
  };
}

async function listSellersCached(db) {
  return catalogRows(db, 'sellers');
}

async function listProducts(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const items = await getAllProductsCached(db);

    const sellerId = req.query.sellerId || req.params.sellerId;
    const categoryId = req.query.category_id || null;
    const search = String(req.query.search || '').toLowerCase();
    let products = items.map(normalizeProduct);

    if (sellerId) {
      products = products.filter((p) => p.seller_id === sellerId);
    }
    if (req.query.category) {
      products = products.filter((p) => p.category === req.query.category);
    }
    if (categoryId) {
      products = products.filter((p) => String(p.category).toLowerCase().replace(/\s+/g, '-') === categoryId);
    }
    if (search) {
      products = products.filter((p) => p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));
    }
    if (req.query.popular === 'true') {
      const popular = products.filter((p) => p.popular);
      products = popular.length > 0 ? popular : products;
    }

    // ── Native app shape: ApiResponse<PaginatedResponse<ProductDto>> ──
    if (isNativeAppRequest(req)) {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const perPage = Math.min(Math.max(parseInt(req.query.per_page, 10) || 20, 1), 100);
      const sellers = await listSellersCached(db);
      const start = (page - 1) * perPage;
      return sendCatalog(req, res, db, {
        success: true,
        data: {
          data: products.slice(start, start + perPage).map((p) => {
            const raw = items.find((it) => it.id === p.id) || {};
            return asAppProduct({ ...raw, ...p }, sellers);
          }),
          pagination: { current_page: page, per_page: perPage, total: products.length },
        },
      });
    }

    // ── Web shape (flat) ──
    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) {
      return res.status(400).json({ success: false, error: 'limit must be 1–200 and offset must be non-negative integers' });
    }

    return sendCatalog(req, res, db, {
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

    const doc = (await getAllProductsCached(db)).find(p => p.id === req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Product not found' });
    if (isNativeAppRequest(req)) {
      const sellers = await listSellersCached(db);
      return sendCatalog(req, res, db, { success: true, data: asAppProduct(doc, sellers) });
    }
    return sendCatalog(req, res, db, { success: true, data: normalizeProduct(doc) });
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
      items = await getAllProductsCached(db);
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
    const catImages = new Map();
    for (const raw of items) {
      const p = normalizeProduct(raw);
      const category = String(p.category).trim().toLowerCase();
      counts.set(category, (counts.get(category) || 0) + 1);
      if (!catImages.has(category) && p.image) catImages.set(category, Array.isArray(p.image) ? p.image[0] : p.image);
    }
    const data = [...counts.entries()]
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        product_count: count,
        // Native-app CategoryDto fields (image_url, description)
        image_url: catImages.get(name) || '',
        description: '',
      }))
      .sort((a, b) => b.product_count - a.product_count);

    return sendCatalog(req, res, db, { success: true, data });
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
  app.get('/api/products/:id', (req, res, next) => req.params.id === 'featured' ? next() : getProduct(req, res));
  app.get('/api/v1/products/:id', getProduct);
  app.get('/api/product/:id', getProduct);
  app.get('/api/v1/product/:id', getProduct);
  app.get('/api/categories', listCategories);
  app.get('/api/v1/categories', listCategories);
}

module.exports = { productRoutes };
