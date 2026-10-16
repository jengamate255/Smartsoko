// All prices and seller identities originate in database records, never the cart.
class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sellerOf = p => p.sellerId || p.seller_id || p.merchantId || p.restaurantId || p.restaurant_id;
function variationsOf(value) {
  if (Array.isArray(value)) return value.map(v => ({ name: v.name, delta: Number(v.delta ?? v.priceDelta ?? 0) }));
  if (typeof value !== 'string') return [];
  return value.split(',').map(s => { const [name, delta = '0'] = s.split('='); return { name: name.trim(), delta: Number(delta.trim()) }; }).filter(v => v.name);
}
async function customerIdFor(db, user) {
  if (!user) return null;
  if (uuid.test(user.uid)) return user.uid;
  const rows = await db.where('users', 'firebase_uid', '==', user.uid);
  const profile = rows.find(p => uuid.test(p.id));
  if (!profile) throw new CheckoutError('Complete your customer profile before ordering', 409);
  return profile.id;
}
async function promoFor(db, code, subtotal, sellerId) {
  if (!code) return { discount: 0, promoCode: null };
  if (typeof code !== 'string' || code.length > 50) throw new CheckoutError('Invalid promo code');
  const rows = await db.where('promotions', 'code', '==', code.trim().toUpperCase());
  const p = rows[0];
  if (!p || p.isActive === false || p.is_active === false || p.active === false) throw new CheckoutError('Invalid or inactive promo code');
  const merchant = p.merchantId || p.merchant_id || p.sellerId;
  if (merchant && merchant !== sellerId) throw new CheckoutError('Promo code does not apply to this seller');
  const end = p.expiresAt || p.valid_until;
  const start = p.startsAt || p.valid_from;
  if ((end && Date.parse(end) <= Date.now()) || (start && Date.parse(start) > Date.now())) throw new CheckoutError('Promo code is not currently valid');
  const limit = p.maxUses ?? p.usageLimit ?? p.usage_limit;
  if (limit != null && Number(p.usageCount ?? p.usedCount ?? p.usage_count ?? 0) >= Number(limit)) throw new CheckoutError('Promo code usage limit reached');
  if (subtotal < Number(p.minOrder ?? p.minOrderAmount ?? p.min_order_amount ?? 0)) throw new CheckoutError('Minimum order amount not reached');
  const type = p.discountType || p.discount_type || 'percentage';
  if (!['percentage', 'percent', 'fixed', 'fixed_amount', 'amount'].includes(type)) throw new CheckoutError('Invalid promo configuration');
  const value = Number(p.discountPercent ?? p.discountValue ?? p.discount_value);
  if (!Number.isFinite(value) || value <= 0 || (['percentage', 'percent'].includes(type) && value > 100)) throw new CheckoutError('Invalid promo configuration');
  let discount = ['fixed', 'fixed_amount', 'amount'].includes(type) ? value : subtotal * value / 100;
  const cap = p.maxDiscount ?? p.maxDiscountAmount ?? p.max_discount_amount ?? p.max_discount;
  if (cap != null && (!Number.isFinite(Number(cap)) || Number(cap) < 0)) throw new CheckoutError('Invalid promo configuration');
  if (cap != null) discount = Math.min(discount, Number(cap));
  return { discount: Math.min(subtotal, Math.max(0, Math.round(discount))), promoCode: p.code };
}
async function quoteOrder(db, input, config = {}) {
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) throw new CheckoutError('Cart must contain 1–100 items');
  const quantities = new Map();
  const products = new Map();
  for (const item of input.items) {
    if (!item || typeof item !== 'object') throw new CheckoutError('Invalid cart item');
    const id = item.id || item.product_id;
    if (typeof id !== 'string' || !id || id.length > 200 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) throw new CheckoutError('Invalid product or quantity');
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
    if (!products.has(id)) products.set(id, await db.get('products', id));
  }
  let sellerId;
  const items = input.items.map(item => {
    const p = products.get(item.id || item.product_id);
    if (!p) throw new CheckoutError('A product in your cart no longer exists', 404);
    if (p.isAvailable === false || p.is_available === false || p.available === false) throw new CheckoutError('A product in your cart is unavailable', 409);
    const merchant = sellerOf(p);
    if (!merchant || !uuid.test(merchant)) throw new CheckoutError('A product has no valid seller', 409);
    if (sellerId && sellerId !== merchant) throw new CheckoutError('Please check out items from one seller at a time', 409);
    sellerId = merchant;
    const stock = p.stockQuantity ?? p.stock;
    if (stock != null && (!Number.isSafeInteger(Number(stock)) || quantities.get(p.id) > Number(stock))) throw new CheckoutError('Not enough stock for ' + p.name, 409);
    const price = Number(p.price ?? p.salePrice ?? p.selling_price);
    let variation = null, variationDelta = 0;
    if (item.variation) {
      const selected = variationsOf(p.variations).find(v => v.name === item.variation);
      if (!selected || !Number.isFinite(selected.delta)) throw new CheckoutError('Selected product option is unavailable', 409);
      variation = selected.name; variationDelta = selected.delta;
    }
    if (!Number.isFinite(price) || price <= 0 || price + variationDelta <= 0) throw new CheckoutError('Invalid catalog price', 409);
    return { id: p.id, name: p.name || p.title, price, quantity: item.quantity, variation, variationDelta };
  });
  const seller = await db.get('sellers', sellerId);
  if (!seller || seller.isOpen === false || seller.is_open === false) throw new CheckoutError('Seller is currently unavailable', 409);
  const subtotal = Math.round(items.reduce((sum, i) => sum + (i.price + i.variationDelta) * i.quantity, 0));
  const deliveryFee = Number(config.deliveryFee ?? 2000);
  const taxRate = Number(config.taxRate ?? 0.18);
  if (!Number.isFinite(subtotal) || !Number.isFinite(deliveryFee) || deliveryFee < 0 || !Number.isFinite(taxRate) || taxRate < 0) throw new CheckoutError('Pricing is temporarily unavailable', 503);
  const taxAmount = Math.round(subtotal * taxRate);
  const { discount, promoCode } = await promoFor(db, input.promoCode, subtotal, sellerId);
  return { items, sellerId, subtotal, deliveryFee, taxAmount, discount, promoCode, total: subtotal + deliveryFee + taxAmount - discount, currency: config.currency || 'TZS' };
}
module.exports = { CheckoutError, quoteOrder, customerIdFor, variationsOf, sellerOf };
