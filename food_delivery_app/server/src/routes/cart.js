const { verifyToken } = require('../middleware/auth');

async function getDb(req) {
  return req.app.get('db');
}

// Postgres timestamptz columns reject epoch-millis numbers (error 22008
// "date/time field value out of range"), so timestamps written to Supabase
// must be ISO strings. Firestore accepts ISO strings too.
function nowIso() {
  return new Date().toISOString();
}

function emptyCart(userId) {
  return {
    id: userId,
    user_id: userId,
    items: [],
    updated_at: nowIso(),
  };
}

function toCartDto(userId, cartDoc) {
  const items = (cartDoc?.items || []).map((item) => ({
    cart_item_id: item.cart_item_id || item.product_id,
    id: item.cart_item_id || item.product_id,
    product_id: item.product_id,
    product_name: item.product_name || 'Product',
    product_image: item.product_image || '',
    quantity: item.quantity || 1,
    price: Number(item.price) || 0,
    seller_id: item.seller_id || '',
    seller_name: item.seller_name || 'Seller',
    stock: item.stock ?? 99,
  }));

  return {
    id: cartDoc?.id || userId,
    user_id: userId,
    items,
    updated_at: cartDoc?.updated_at || nowIso(),
  };
}

async function loadCart(db, userId) {
  const cart = await db.get('carts', userId);
  if (!cart) return emptyCart(userId);
  return toCartDto(userId, cart);
}

async function saveCart(db, userId, items) {
  const payload = {
    userId,
    items,
    updated_at: nowIso(),
  };
  await db.set('carts', userId, payload);
  return toCartDto(userId, { id: userId, ...payload });
}

async function resolveProduct(db, productId, body = {}) {
  let product = null;
  try {
    product = await db.get('products', productId);
  } catch (_) {
    product = null;
  }

  return {
    product_id: productId,
    product_name: body.product_name || product?.name || product?.title || 'Product',
    product_image: body.product_image || product?.image || product?.imageUrl || product?.image_url || '',
    price: Number(body.price ?? product?.price ?? product?.salePrice ?? 0),
    seller_id: body.seller_id || product?.sellerId || product?.merchantId || product?.seller_id || '',
    seller_name: body.seller_name || product?.sellerName || product?.merchantName || 'Seller',
    stock: body.stock ?? product?.stock ?? product?.quantity ?? 99,
  };
}

async function getCart(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const cart = await loadCart(db, req.user.uid);
    return res.json({ success: true, data: cart });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function addToCart(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const userId = req.user.uid;
    const productId = req.body.product_id || req.body.productId;
    const quantity = parseInt(req.body.quantity, 10) || 1;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'product_id is required' });
    }

    const cart = await db.get('carts', userId);
    const items = [...(cart?.items || [])];
    const existingIdx = items.findIndex(
      (i) => i.product_id === productId || i.cart_item_id === productId
    );

    const product = await resolveProduct(db, productId, req.body);

    if (existingIdx >= 0) {
      items[existingIdx] = {
        ...items[existingIdx],
        ...product,
        cart_item_id: items[existingIdx].cart_item_id || productId,
        quantity: (items[existingIdx].quantity || 0) + quantity,
      };
    } else {
      items.push({
        cart_item_id: productId,
        ...product,
        quantity,
      });
    }

    const data = await saveCart(db, userId, items);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function updateCartItem(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const userId = req.user.uid;
    const cartItemId = req.body.cart_item_id || req.body.cartItemId || req.body.product_id;
    const quantity = parseInt(req.body.quantity, 10);
    if (!cartItemId || Number.isNaN(quantity)) {
      return res.status(400).json({ success: false, error: 'cart_item_id and quantity are required' });
    }

    const cart = await db.get('carts', userId);
    let items = [...(cart?.items || [])];
    const idx = items.findIndex(
      (i) => i.cart_item_id === cartItemId || i.product_id === cartItemId
    );
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found' });
    }

    if (quantity <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx] = { ...items[idx], quantity };
    }

    const data = await saveCart(db, userId, items);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Update cart item error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function removeCartItem(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const userId = req.user.uid;
    const cartItemId = req.params.cartItemId || req.params.id;
    const cart = await db.get('carts', userId);
    const items = (cart?.items || []).filter(
      (i) => i.cart_item_id !== cartItemId && i.product_id !== cartItemId
    );
    const data = await saveCart(db, userId, items);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Remove cart item error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function clearCart(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const data = await saveCart(db, req.user.uid, []);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function cartRoutes(app) {
  app.get('/api/cart', verifyToken, getCart);
  app.post('/api/cart/items', verifyToken, addToCart);
  app.put('/api/cart/items', verifyToken, updateCartItem);
  app.delete('/api/cart/items/:cartItemId', verifyToken, removeCartItem);
  app.delete('/api/cart', verifyToken, clearCart);

  app.get('/api/v1/cart', verifyToken, getCart);
  app.post('/api/v1/cart/items', verifyToken, addToCart);
  app.put('/api/v1/cart/items', verifyToken, updateCartItem);
  app.delete('/api/v1/cart/items/:cartItemId', verifyToken, removeCartItem);
  app.delete('/api/v1/cart', verifyToken, clearCart);
}

module.exports = { cartRoutes, loadCart, toCartDto };
