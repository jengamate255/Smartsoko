const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const router = express.Router();

function errorResponse(res, err, status = 500) {
  console.error('Supabase API error:', err);
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
}

router.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public').limit(5);
    const tables = (data || []).map(r => r.table_name);
    const hasSellers = tables.includes('sellers');
    res.json({ success: true, connected: true, tables: hasSellers ? 'sellers, products, orders, etc.' : 'none', timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ success: true, connected: true, status: 'supabase client initialized', timestamp: new Date().toISOString() });
  }
});

// ─── SELLERS ───
router.get('/sellers', async (req, res) => {
  try {
    let query = supabase.from('sellers').select('*').order('rating', { ascending: false });
    if (req.query.category) query = query.eq('category', req.query.category);
    if (req.query.is_open !== undefined) query = query.eq('is_open', req.query.is_open === 'true');
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, sellers: (data || []).filter(v => v.name?.toLowerCase().includes(s) || v.description?.toLowerCase().includes(s)) });
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, sellers: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.get('/sellers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('sellers').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Seller not found' });
    res.json({ success: true, seller: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── PRODUCTS ───
router.get('/products', async (req, res) => {
  try {
    let query = supabase.from('products').select('*, sellers(name, logo_url, rating)');
    if (req.query.seller_id) query = query.eq('seller_id', req.query.seller_id);
    if (req.query.is_available !== undefined) query = query.eq('is_available', req.query.is_available === 'true');
    if (req.query.category) query = query.eq('category', req.query.category);
    if (req.query.limit) query = query.limit(parseInt(req.query.limit));
    if (req.query.search) query = query.textSearch('name', req.query.search);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, products: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.get('/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*, sellers(name, logo_url, rating, delivery_fee, delivery_time_minutes)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, product: data });
  } catch (err) { errorResponse(res, err); }
});

router.post('/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, product: data });
  } catch (err) { errorResponse(res, err); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── ORDERS ───
router.get('/orders', async (req, res) => {
  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (req.query.customer_id) query = query.eq('customer_id', req.query.customer_id);
    if (req.query.seller_id) query = query.eq('seller_id', req.query.seller_id);
    if (req.query.driver_id) query = query.eq('driver_id', req.query.driver_id);
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.limit) query = query.limit(parseInt(req.query.limit));
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, orders: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, order: data });
  } catch (err) { errorResponse(res, err); }
});

router.post('/orders', async (req, res) => {
  try {
    const orderData = { ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (!orderData.status) orderData.status = 'pending';
    const { data, error } = await supabase.from('orders').insert(orderData).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, order: data });
  } catch (err) { errorResponse(res, err); }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status, ...extra } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status is required' });
    const { data, error } = await supabase.from('orders').update({ status, ...extra, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, order: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── PROFILES ───
router.get('/profiles/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Profile not found' });
    res.json({ success: true, profile: data });
  } catch (err) { errorResponse(res, err); }
});

router.put('/profiles/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── DRIVERS ───
router.get('/drivers', async (req, res) => {
  try {
    let query = supabase.from('drivers').select('*, profiles(name, phone, avatar_url)');
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.online === 'true') query = query.eq('status', 'online');
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, drivers: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.put('/drivers/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) return res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    const { data, error } = await supabase.from('drivers').update({ current_latitude: latitude, current_longitude: longitude, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, driver: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── PROMOTIONS ───
router.get('/promotions', async (req, res) => {
  try {
    const { data, error } = await supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, promotions: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.post('/promotions/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code is required' });
    const { data, error } = await supabase.from('promotions').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();
    if (error || !data) return res.json({ success: true, valid: false, error: 'Invalid promo code' });
    const now = new Date();
    const validFrom = new Date(data.valid_from);
    const validUntil = data.valid_until ? new Date(data.valid_until) : null;
    if (validUntil && now > validUntil) return res.json({ success: true, valid: false, error: 'Promo code expired' });
    if (now < validFrom) return res.json({ success: true, valid: false, error: 'Promo code not yet active' });
    if (data.usage_limit && data.usage_count >= data.usage_limit) return res.json({ success: true, valid: false, error: 'Usage limit reached' });
    res.json({ success: true, valid: true, promo: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── LOYALTY ───
router.get('/loyalty/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase.from('loyalty_points').select('points_earned, points_spent').eq('customer_id', userId).eq('transaction_type', 'earned');
    if (error) throw error;
    const totalEarned = (data || []).reduce((s, r) => s + (r.points_earned || 0), 0);
    const totalSpent = (data || []).reduce((s, r) => s + (r.points_spent || 0), 0);
    res.json({ success: true, points: { available: totalEarned - totalSpent, earned: totalEarned, spent: totalSpent } });
  } catch (err) { errorResponse(res, err); }
});

router.post('/loyalty', async (req, res) => {
  try {
    const { customer_id, points, description, order_id } = req.body;
    if (!customer_id || points === undefined) return res.status(400).json({ success: false, error: 'customer_id and points required' });
    const { data, error } = await supabase.from('loyalty_points').insert({
      customer_id, order_id: order_id || null, points_earned: parseInt(points), transaction_type: 'earned', description: description || '', expires_at: new Date(Date.now() + 365 * 86400000).toISOString()
    }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, point: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── SHOPIFY-STYLE FEATURES (Supabase edition) ───

// Coupons
router.get('/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, coupons: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.post('/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase.from('promotions').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, id: data.id });
  } catch (err) { errorResponse(res, err); }
});

// Collections
router.get('/collections', async (req, res) => {
  try {
    const { data, error } = await supabase.from('sellers').select('id, name, category, logo_url, rating, is_open').eq('is_open', true).order('rating', { ascending: false });
    if (error) throw error;
    const collections = {};
    (data || []).forEach(s => { const cat = s.category || 'other'; if (!collections[cat]) collections[cat] = []; collections[cat].push(s); });
    res.json({ success: true, collections });
  } catch (err) { errorResponse(res, err); }
});

// Inventory
router.get('/inventory', async (req, res) => {
  try {
    let query = supabase.from('products').select('*, sellers(name)').order('stock', { ascending: true });
    if (req.query.low_stock === 'true') query = query.lt('stock', 10).gt('stock', 0);
    if (req.query.out_of_stock === 'true') query = query.eq('stock', 0);
    if (req.query.seller_id) query = query.eq('seller_id', req.query.seller_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, inventory: data || [] });
  } catch (err) { errorResponse(res, err); }
});

// ─── REVIEWS ───
router.get('/reviews', async (req, res) => {
  try {
    let query = supabase.from('reviews').select('*, profiles(name, avatar_url)').eq('is_public', true);
    if (req.query.restaurant_id) query = query.eq('restaurant_id', req.query.restaurant_id);
    if (req.query.driver_id) query = query.eq('driver_id', req.query.driver_id);
    query = query.order('created_at', { ascending: false });
    if (req.query.limit) query = query.limit(parseInt(req.query.limit));
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, reviews: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.post('/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase.from('reviews').insert({ ...req.body, created_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, review: data });
  } catch (err) { errorResponse(res, err); }
});

// ─── ANALYTICS ───
router.get('/analytics/sales', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    let query = supabase.from('orders').select('total, created_at, status').gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
    if (req.query.restaurant_id) query = query.eq('restaurant_id', req.query.restaurant_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, analytics: data || [] });
  } catch (err) { errorResponse(res, err); }
});

router.get('/analytics/popular', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_popular_items', {
      p_restaurant_id: req.query.restaurant_id || null,
      p_limit: parseInt(req.query.limit) || 10
    });
    if (error) throw error;
    res.json({ success: true, popular: data || [] });
  } catch (err) { errorResponse(res, err); }
});

module.exports = router;
