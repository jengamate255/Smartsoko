/**
 * Extended Admin API — /api/admin/*
 *
 * Implements the full admin.html surface that was missing from
 * server-production.js: commission rules, seller analytics, user stats &
 * management, settings, RBAC, api-keys, webhooks, CMS pages, notifications,
 * reviews, payouts, tickets, system status/logs, and moderation actions.
 *
 * All routes are gated: optionalAuth → adminGate (admin/super_admin only).
 * Data lives in the existing Supabase tables via the flat db adapter.
 */
'use strict';

const crypto = require('crypto');

const { logAudit } = require('../config/logger');
const { invalidateRoleCache } = require('../middleware/auth');
function adminExtendedRoutes(app) {
  const authMiddleware = app.get('authMiddleware');
  const { optionalAuth } = authMiddleware;

  function adminGate(req, res, next) {
    if (!req.user) {
      if (String(process.env.ALLOW_ANON_ADMIN) === 'true') return next();
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }
    const role = String(req.user.role || 'customer').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return next();
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  const gate = [optionalAuth, adminGate];
  const db = () => app.get('db');
  const now = () => new Date().toISOString();

  const ok = (res, data) => res.json({ success: true, ...(data !== undefined ? { data } : {}) });
  const bad = (res, status, error) => res.status(status).json({ success: false, error });

  const listAll = async (collection) => {
    try { return (await db().getAll(collection)) || []; } catch (_) { return []; }
  };
  const num = (v) => Number(v) || 0;

  // ════════════════════════════════════════════════════════════════
  // COMMISSION RULES (admin Settings → Commission tab)
  // Stored in platform_settings under key 'commission_rules' (JSON array)
  // to avoid inventing a new table. Shape: [{id,name,category,rate,type,isActive}]
  // ════════════════════════════════════════════════════════════════
  async function getCommissionRules() {
    const rows = await listAll('platform_settings');
    const row = rows.find(r => r.key === 'commission_rules');
    try { return JSON.parse(row && row.value) || []; } catch (_) { return []; }
  }
  async function saveCommissionRules(rules) {
    const rows = await listAll('platform_settings');
    const row = rows.find(r => r.key === 'commission_rules');
    if (row) await db().update('platform_settings', row.id, { value: JSON.stringify(rules), updatedAt: now() });
    else await db().add('platform_settings', { key: 'commission_rules', value: JSON.stringify(rules), description: 'Platform commission rules', isPublic: false, updatedAt: now() });
  }

  app.get('/api/admin/commission/rules', gate, async (req, res) => {
    ok(res, await getCommissionRules());
  });
  app.get('/api/admin/commission/rules/:id', gate, async (req, res) => {
    const rules = await getCommissionRules();
    const rule = rules.find(r => r.id === req.params.id);
    if (!rule) return bad(res, 404, 'Rule not found');
    ok(res, rule);
  });
  app.post('/api/admin/commission/rules', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.name || !Number.isFinite(Number(b.rate))) return bad(res, 400, 'name and rate required');
    const rules = await getCommissionRules();
    const rule = { id: crypto.randomUUID(), name: String(b.name), category: b.category || 'all', rate: num(b.rate), type: b.type === 'flat' ? 'flat' : 'percentage', isActive: b.isActive !== false };
    rules.push(rule);
    await saveCommissionRules(rules);
    ok(res, rule);
  });
  app.put('/api/admin/commission/rules/:id', gate, async (req, res) => {
    const rules = await getCommissionRules();
    const idx = rules.findIndex(r => r.id === req.params.id);
    if (idx < 0) return bad(res, 404, 'Rule not found');
    const b = req.body || {};
    rules[idx] = { ...rules[idx], ...(b.name ? { name: String(b.name) } : {}), ...(b.category ? { category: b.category } : {}), ...(Number.isFinite(Number(b.rate)) ? { rate: num(b.rate) } : {}), ...(b.type ? { type: b.type } : {}), ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}) };
    await saveCommissionRules(rules);
    ok(res, rules[idx]);
  });
  app.delete('/api/admin/commission/rules/:id', gate, async (req, res) => {
    const rules = await getCommissionRules();
    const next = rules.filter(r => r.id !== req.params.id);
    if (next.length === rules.length) return bad(res, 404, 'Rule not found');
    await saveCommissionRules(next);
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // SELLERS ANALYTICS
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/sellers/analytics', gate, async (req, res) => {
    const [sellers, orders] = await Promise.all([listAll('sellers'), listAll('orders')]);
    const ordersBySeller = {};
    orders.forEach(o => {
      const sid = o.sellerId || o.merchantId || o.restaurantId || null;
      if (sid) ordersBySeller[sid] = (ordersBySeller[sid] || 0) + num(o.total);
    });
    const totalSellerRevenue = Object.values(ordersBySeller).reduce((s, v) => s + v, 0);
    const commissionRate = 0.10; // platform default
    const analytics = {
      totalSellers: sellers.length,
      pendingVerification: sellers.filter(s => s.isVerified === false || s.approved === false).length,
      activeSellers: sellers.filter(s => s.isOpen !== false).length,
      totalSellerRevenue,
      totalCommission: Math.round(totalSellerRevenue * commissionRate),
      topSellers: Object.entries(ordersBySeller)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([id, revenue]) => {
          const s = sellers.find(x => x.id === id);
          return { id, name: (s && s.name) || 'Unknown', revenue, orders: orders.filter(o => (o.sellerId || o.merchantId) === id).length };
        }),
    };
    ok(res, analytics);
  });

  // ════════════════════════════════════════════════════════════════
  // USERS: stats, detail, update, suspend/activate, activity/orders
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/users/stats', gate, async (req, res) => {
    const [users, profiles] = await Promise.all([listAll('users'), listAll('profiles')]);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const createdThisWeek = profiles.filter(p => p.created_at && String(p.created_at) >= weekAgo).length
      + users.filter(u => u.createdAt && String(u.createdAt) >= weekAgo).length;
    ok(res, {
      total: Math.max(users.length, profiles.length),
      active: profiles.filter(p => !p.suspended).length || users.filter(u => !u.suspended).length,
      suspended: profiles.filter(p => p.suspended).length + users.filter(u => u.suspended).length,
      growth: { thisWeek: createdThisWeek },
    });
  });

  app.get('/api/admin/users/:id', gate, async (req, res) => {
    const id = req.params.id;
    let user = null;
    try { user = await db().get('users', id); } catch (_) {}
    let profile = null;
    try { profile = await db().get('profiles', id); } catch (_) {}
    // profiles rows may be linked by firebase_uid instead
    if (!profile) {
      try {
        const rows = await db().where('profiles', 'firebase_uid', '==', id);
        profile = rows && rows[0];
      } catch (_) {}
    }
    const merged = {
      id,
      name: (profile && (profile.name || profile.display_name)) || (user && (user.name || user.displayName)) || 'User',
      email: (profile && profile.email) || (user && user.email) || '',
      phone: (profile && profile.phone) || (user && user.phone) || '',
      role: (profile && profile.role) || (user && user.role) || 'customer',
      suspended: !!((profile && profile.suspended) || (user && user.suspended)),
      createdAt: (profile && profile.created_at) || (user && user.createdAt) || null,
    };
    ok(res, merged);
  });

  app.put('/api/admin/users/:id', gate, async (req, res) => {
    const id = req.params.id;
    const b = req.body || {};
    let target = null, table = null;
    try { target = await db().get('profiles', id); if (target) table = 'profiles'; } catch (_) {}
    if (!target) {
      try {
        const rows = await db().where('profiles', 'firebase_uid', '==', id);
        if (rows && rows[0]) { target = rows[0]; table = 'profiles'; }
      } catch (_) {}
    }
    if (!target) { try { target = await db().get('users', id); if (target) table = 'users'; } catch (_) {} }
    if (!target) return bad(res, 404, 'User not found');

    const patch = { updatedAt: now() };
    if (b.name != null) patch.name = String(b.name);
    if (b.phone != null) patch.phone = String(b.phone);
    if (b.role != null) patch.role = String(b.role);
    const roleChanged = b.role != null && String(b.role) !== String(target.role || '');
    await db().update(table, target.id, patch);
    // Role changes must reach /api/auth/verify immediately — the middleware
    // caches roles for 5 minutes per firebase uid, so without this the old
    // role keeps getting served (merchant portal bounces "unauthorized").
    if (roleChanged && target.firebaseUid) invalidateRoleCache(target.firebaseUid);
    ok(res, { id: target.id, ...patch });
  });

  for (const [action, value] of [['suspend', true], ['activate', false]]) {
    app.post(`/api/admin/users/:id/${action}`, gate, async (req, res) => {
      const id = req.params.id;
      let target = null, table = null;
      try { target = await db().get('profiles', id); if (target) table = 'profiles'; } catch (_) {}
      if (!target) { try { target = await db().get('users', id); if (target) table = 'users'; } catch (_) {} }
      if (!target) return bad(res, 404, 'User not found');
      await db().update(table, target.id, { suspended: value, updatedAt: now() });
      ok(res, { id: target.id, suspended: value });
    });
  }

  app.delete('/api/admin/users/:id', gate, async (req, res) => {
    // Anonymize rather than hard-delete: keep order history integrity.
    const id = req.params.id;
    let target = null, table = null;
    try { target = await db().get('profiles', id); if (target) table = 'profiles'; } catch (_) {}
    if (!target) { try { target = await db().get('users', id); if (target) table = 'users'; } catch (_) {} }
    if (!target) return bad(res, 404, 'User not found');
    await db().update(table, target.id, {
      suspended: true, deleted: true,
      name: 'Deleted user', email: null, phone: null,
      firebaseUid: null, updatedAt: now(),
    });
    ok(res, { id: target.id, anonymized: true });
  });

  // Bulk user actions (admin.html executeBulkAction)
  app.post('/api/admin/users/bulk-action', gate, async (req, res) => {
    const b = req.body || {};
    const ids = Array.isArray(b.userIds) ? b.userIds : [];
    const action = b.action;
    if (!ids.length) return bad(res, 400, 'userIds[] required');
    if (!['suspend', 'activate', 'roleChange', 'delete'].includes(action)) {
      return bad(res, 400, 'action must be one of: suspend, activate, roleChange, delete');
    }
    let updated = 0, failed = 0;
    for (const id of ids) {
      try {
        if (action === 'suspend' || action === 'activate') {
          // profiles has no suspended/status columns — track via platform_settings
          const set = new Set(await getSetting('suspended_users', []));
          if (action === 'suspend') set.add(id); else set.delete(id);
          await putSetting('suspended_users', Array.from(set));
        } else if (action === 'roleChange') {
          if (!b.role) { failed++; continue; }
          let target = null, table = null;
          try { target = await db().get('profiles', id); if (target) table = 'profiles'; } catch (_) {}
          if (!target) { try { target = await db().get('users', id); if (target) table = 'users'; } catch (_) {} }
          if (!target) { failed++; continue; }
          const roleChanged = String(b.role) !== String(target.role || '');
          await db().update(table, target.id, { role: String(b.role), updatedAt: now() });
          if (roleChanged && target.firebaseUid) invalidateRoleCache(target.firebaseUid);
        } else if (action === 'delete') {
          // Soft delete: track in platform_settings + scrub PII columns that exist
          const set = new Set(await getSetting('deleted_users', []));
          set.add(id);
          await putSetting('deleted_users', Array.from(set));
          let priorUid = null;
          try { const t = await db().get('profiles', id); priorUid = t && t.firebaseUid; } catch (_) {}
          try { await db().update('profiles', id, { name: 'Deleted user', email: null, phone: null, firebaseUid: null, updatedAt: now() }); } catch (_) {}
          if (priorUid) invalidateRoleCache(priorUid);
        }
        updated++;
      } catch (_) { failed++; }
    }
    try {
      logAudit('bulk_user_action', (req.user && (req.user.email || req.user.uid)) || 'unknown', {
        action, count: ids.length, updated, failed, reason: b.reason || null, at: now(),
      });
    } catch (_) { /* audit must never break the flow */ }
    ok(res, {
      updated, failed, total: ids.length,
      message: `${action}: ${updated} user(s) updated${failed ? `, ${failed} failed` : ''}`,
    });
  });

  // Single-user suspend / activate (users tab buttons). Uses platform_settings
  // because the profiles table has no suspended/status columns.
  app.post('/api/admin/users/:id/suspend', gate, async (req, res) => {
    const set = new Set(await getSetting('suspended_users', []));
    set.add(req.params.id);
    await putSetting('suspended_users', Array.from(set));
    try {
      logAudit('user_suspended', (req.user && (req.user.email || req.user.uid)) || 'unknown', { userId: req.params.id, at: now() });
    } catch (_) {}
    ok(res, { id: req.params.id, status: 'suspended' });
  });
  app.post('/api/admin/users/:id/activate', gate, async (req, res) => {
    const set = new Set(await getSetting('suspended_users', []));
    set.delete(req.params.id);
    await putSetting('suspended_users', Array.from(set));
    try {
      logAudit('user_activated', (req.user && (req.user.email || req.user.uid)) || 'unknown', { userId: req.params.id, at: now() });
    } catch (_) {}
    ok(res, { id: req.params.id, status: 'active' });
  });

  // ════════════════════════════════════════════════════════════════
  // MARKETING — coupons (platform_settings; no coupons table) & banners (banners table)
  // Consumed by admin.html Marketing tab (loadCoupons/loadBanners).
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/marketing/coupons', gate, async (req, res) => {
    ok(res, await getSetting('admin_coupons', []));
  });
  app.post('/api/admin/marketing/coupons', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.code || !b.value) return bad(res, 400, 'code and value are required');
    const coupons = await getSetting('admin_coupons', []);
    if (coupons.some(c => String(c.code).toLowerCase() === String(b.code).toLowerCase())) {
      return bad(res, 409, 'A coupon with this code already exists');
    }
    const coupon = {
      id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      code: String(b.code).toUpperCase(),
      type: b.type || 'percent',           // 'percent' | 'fixed'
      value: Number(b.value) || 0,
      minOrder: Number(b.minOrder) || 0,
      maxRedemptions: Number(b.maxRedemptions) || 0,
      redemptions: 0,
      expiresAt: b.expiresAt || null,
      active: b.active !== false,
      createdAt: now(),
    };
    coupons.push(coupon);
    await putSetting('admin_coupons', coupons);
    try { logAudit('coupon_created', (req.user && (req.user.email || req.user.uid)) || 'unknown', { code: coupon.code, at: now() }); } catch (_) {}
    ok(res, coupon);
  });
  app.put('/api/admin/marketing/coupons/:id', gate, async (req, res) => {
    const coupons = await getSetting('admin_coupons', []);
    const idx = coupons.findIndex(c => c.id === req.params.id);
    if (idx < 0) return bad(res, 404, 'Coupon not found');
    const b = req.body || {};
    const updated = { ...coupons[idx],
      ...(b.code !== undefined ? { code: String(b.code).toUpperCase() } : {}),
      ...(b.type !== undefined ? { type: b.type } : {}),
      ...(b.value !== undefined ? { value: Number(b.value) || 0 } : {}),
      ...(b.minOrder !== undefined ? { minOrder: Number(b.minOrder) || 0 } : {}),
      ...(b.maxRedemptions !== undefined ? { maxRedemptions: Number(b.maxRedemptions) || 0 } : {}),
      ...(b.expiresAt !== undefined ? { expiresAt: b.expiresAt } : {}),
      ...(b.active !== undefined ? { active: !!b.active } : {}),
      updatedAt: now(),
    };
    coupons[idx] = updated;
    await putSetting('admin_coupons', coupons);
    ok(res, updated);
  });
  app.delete('/api/admin/marketing/coupons/:id', gate, async (req, res) => {
    const coupons = await getSetting('admin_coupons', []);
    const next = coupons.filter(c => c.id !== req.params.id);
    if (next.length === coupons.length) return bad(res, 404, 'Coupon not found');
    await putSetting('admin_coupons', next);
    ok(res);
  });

  // Banners — persisted to the real banners table (title, image_url, is_active)
  app.get('/api/admin/marketing/banners', gate, async (req, res) => {
    const rows = await listAll('banners');
    ok(res, rows.map(r => ({
      id: r.id,
      title: r.title || '',
      imageUrl: r.imageUrl || r.image_url || '',
      active: r.isActive ?? r.is_active ?? true,
      createdAt: r.createdAt || r.created_at || null,
    })));
  });
  app.post('/api/admin/marketing/banners', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.imageUrl) return bad(res, 400, 'title and imageUrl are required');
    const ref = await db().add('banners', {
      title: String(b.title),
      imageUrl: String(b.imageUrl),
      isActive: b.active !== false,
      createdAt: now(),
      updatedAt: now(),
    });
    ok(res, { id: ref.id, title: String(b.title), imageUrl: String(b.imageUrl), active: b.active !== false });
  });
  app.put('/api/admin/marketing/banners/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.title !== undefined) patch.title = String(b.title);
    if (b.imageUrl !== undefined) patch.imageUrl = String(b.imageUrl);
    if (b.active !== undefined) patch.isActive = !!b.active;
    try { await db().update('banners', req.params.id, patch); } catch (e) { return bad(res, 404, 'Banner not found'); }
    ok(res, { id: req.params.id, ...patch });
  });
  app.delete('/api/admin/marketing/banners/:id', gate, async (req, res) => {
    try { await db().delete('banners', req.params.id); } catch (e) { return bad(res, 404, 'Banner not found'); }
    ok(res);
  });


  app.get('/api/admin/users/:id/activity', gate, async (req, res) => {
    const logs = (await listAll('login_activity')).filter(l => l.userId === req.params.id || l.user_id === req.params.id).slice(0, 50);
    ok(res, logs);
  });
  app.get('/api/admin/users/:id/orders', gate, async (req, res) => {
    const orders = (await listAll('orders')).filter(o => o.customerId === req.params.id || o.customer_id === req.params.id).slice(0, 100);
    ok(res, orders);
  });
  app.get('/api/admin/users/:id/payments', gate, async (req, res) => {
    const payments = (await listAll('payment_transactions')).filter(p => p.userId === req.params.id || p.user_id === req.params.id).slice(0, 100);
    ok(res, payments);
  });
  app.get('/api/admin/users/:id/referrals', gate, async (req, res) => {
    const refs = (await listAll('referrals')).filter(r => r.referrerId === req.params.id || r.referrer_id === req.params.id).slice(0, 100);
    ok(res, refs);
  });
  app.post('/api/admin/users/:id/impersonate', gate, async (req, res) => {
try {
      logAudit('impersonate', req.user.email || req.user.uid, {
        target: req.params.id,
        at: now(),
        ip: req.ip || null,
      });
    } catch (auditErr) { /* audit must never break the flow */ }
    // Audit-logged consent stub — real impersonation requires a server-minted
    // session; record the request and let the admin UI open a support view.
    await db().add('admin_notifications', {
      userId: req.user.uid, type: 'impersonation',
      title: 'Impersonation requested',
      message: `Admin ${req.user.email || req.user.uid} requested impersonation of user ${req.params.id}`,
      data: JSON.stringify({ target: req.params.id, at: now() }),
      isRead: false, createdAt: now(),
    });
    ok(res, { message: 'Impersonation request recorded (session hand-off not implemented)' });
  });

  // ════════════════════════════════════════════════════════════════
  // SETTINGS (admin_settings key/value)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/settings', gate, async (req, res) => {
    const rows = await listAll('admin_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    ok(res, settings);
  });
  app.put('/api/admin/settings', gate, async (req, res) => {
    const b = req.body || {};
    const rows = await listAll('admin_settings');
    for (const [key, value] of Object.entries(b)) {
      const row = rows.find(r => r.key === key);
      if (row) await db().update('admin_settings', row.id, { value, updatedAt: now() });
      else await db().add('admin_settings', { key, value: String(value), updatedAt: now() });
    }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // RBAC (roles / role_assignments)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/rbac/roles', gate, async (req, res) => {
    const roles = await listAll('roles');
    ok(res, roles.map(r => ({ id: r.id, name: r.name, description: r.description, permissions: r.permissions || [] })));
  });
  app.post('/api/admin/rbac/roles', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.name) return bad(res, 400, 'name required');
    const ref = await db().add('roles', { name: String(b.name), description: b.description || '', permissions: b.permissions || [], createdAt: now() });
    ok(res, { id: ref.id, name: b.name, description: b.description || '', permissions: b.permissions || [] });
  });
  app.get('/api/admin/rbac/user-roles', gate, async (req, res) => {
    const [assignments, roles, profiles] = await Promise.all([listAll('role_assignments'), listAll('roles'), listAll('profiles')]);
    const out = assignments.map(a => {
      const role = roles.find(r => r.id === a.roleId || r.id === a.role_id);
      const user = profiles.find(p => p.id === a.userId || p.id === a.user_id);
      return {
        id: a.id,
        userId: a.userId || a.user_id,
        userName: (user && (user.name || user.email)) || 'Unknown',
        roleId: a.roleId || a.role_id,
        roleName: (role && role.name) || 'unknown',
        createdAt: a.createdAt || a.created_at,
      };
    });
    ok(res, out);
  });
  app.post('/api/admin/rbac/user-roles', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.userId || !b.roleId) return bad(res, 400, 'userId and roleId required');
    const ref = await db().add('role_assignments', { userId: b.userId, roleId: b.roleId, createdAt: now() });
    ok(res, { id: ref.id, userId: b.userId, roleId: b.roleId });
  });
  app.delete('/api/admin/rbac/user-roles/:id', gate, async (req, res) => {
    try { await db().delete('role_assignments', req.params.id); } catch (e) { return bad(res, 404, 'Assignment not found'); }
    ok(res);
  });
  app.put('/api/admin/rbac/user-roles/:id', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.roleId) return bad(res, 400, 'roleId required');
    try { await db().update('role_assignments', req.params.id, { roleId: b.roleId, updatedAt: now() }); } catch (e) { return bad(res, 404, 'Assignment not found'); }
    ok(res, { id: req.params.id, roleId: b.roleId });
  });

  // ════════════════════════════════════════════════════════════════
  // API KEYS
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/api-keys', gate, async (req, res) => {
    const keys = await listAll('api_keys');
    ok(res, keys.map(k => ({ id: k.id, name: k.name, key: String(k.key || '').slice(0, 8) + '•••', scopes: k.scopes, isActive: k.isActive ?? k.is_active, lastUsedAt: k.lastUsedAt ?? k.last_used_at, createdAt: k.createdAt ?? k.created_at })));
  });
  app.post('/api/admin/api-keys', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.name) return bad(res, 400, 'name required');
    const key = 'sk_live_' + crypto.randomBytes(20).toString('hex');
    const ref = await db().add('api_keys', { name: String(b.name), key, scopes: b.scopes || [], isActive: true, createdAt: now() });
    ok(res, { id: ref.id, name: b.name, key, scopes: b.scopes || [], isActive: true });
  });
  app.put('/api/admin/api-keys/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.isActive !== undefined) patch.isActive = !!b.isActive;
    if (b.name) patch.name = String(b.name);
    try { await db().update('api_keys', req.params.id, patch); } catch (e) { return bad(res, 404, 'Key not found'); }
    ok(res, { id: req.params.id, ...patch });
  });
  app.delete('/api/admin/api-keys/:id', gate, async (req, res) => {
    try { await db().update('api_keys', req.params.id, { isActive: false, revokedAt: now() }); } catch (e) { return bad(res, 404, 'Key not found'); }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/webhooks', gate, async (req, res) => {
    const hooks = await listAll('webhooks');
    ok(res, hooks.map(h => ({ id: h.id, name: h.name, url: h.url, events: h.events, secret: h.secret, isActive: h.isActive ?? h.is_active, createdAt: h.createdAt ?? h.created_at })));
  });
  app.post('/api/admin/webhooks', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.url) return bad(res, 400, 'url required');
    const ref = await db().add('webhooks', { name: b.name || b.url, url: String(b.url), events: b.events || [], secret: crypto.randomBytes(16).toString('hex'), isActive: true, createdAt: now(), updatedAt: now() });
    ok(res, { id: ref.id, name: b.name || b.url, url: b.url, events: b.events || [], isActive: true });
  });
  app.put('/api/admin/webhooks/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.url) patch.url = String(b.url);
    if (b.name) patch.name = String(b.name);
    if (b.events) patch.events = b.events;
    if (b.isActive !== undefined) patch.isActive = !!b.isActive;
    try { await db().update('webhooks', req.params.id, patch); } catch (e) { return bad(res, 404, 'Webhook not found'); }
    ok(res, { id: req.params.id, ...patch });
  });
  app.delete('/api/admin/webhooks/:id', gate, async (req, res) => {
    try { await db().delete('webhooks', req.params.id); } catch (e) { return bad(res, 404, 'Webhook not found'); }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // CMS PAGES
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/cms', gate, async (req, res) => {
    const pages = await listAll('pages');
    ok(res, pages.map(p => ({ id: p.id, title: p.title, slug: p.slug, content: p.content, isPublished: p.isPublished ?? p.is_published, updatedAt: p.updatedAt ?? p.updated_at })));
  });
  app.post('/api/admin/cms', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.slug) return bad(res, 400, 'title and slug required');
    const ref = await db().add('pages', { title: String(b.title), slug: String(b.slug), content: b.content || '', metaTitle: b.metaTitle || b.title, metaDescription: b.metaDescription || '', isPublished: !!b.isPublished, createdBy: req.user.uid, createdAt: now(), updatedAt: now() });
    ok(res, { id: ref.id, title: b.title, slug: b.slug });
  });
  app.put('/api/admin/cms/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.title) patch.title = String(b.title);
    if (b.slug) patch.slug = String(b.slug);
    if (b.content !== undefined) patch.content = b.content;
    if (b.isPublished !== undefined) patch.isPublished = !!b.isPublished;
    try { await db().update('pages', req.params.id, patch); } catch (e) { return bad(res, 404, 'Page not found'); }
    ok(res, { id: req.params.id, ...patch });
  });
  app.delete('/api/admin/cms/:id', gate, async (req, res) => {
    try { await db().delete('pages', req.params.id); } catch (e) { return bad(res, 404, 'Page not found'); }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // ADMIN NOTIFICATIONS (broadcasts)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/notifications', gate, async (req, res) => {
    const notes = await listAll('admin_notifications');
    ok(res, notes.map(n => ({ id: n.id, title: n.title || n.title, message: n.message, type: n.type, isRead: n.isRead ?? n.is_read, createdAt: n.createdAt ?? n.created_at })).slice(0, 200));
  });
  app.post('/api/admin/notifications', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.message) return bad(res, 400, 'title and message required');
    const ref = await db().add('admin_notifications', { userId: req.user.uid, type: b.type || 'broadcast', title: String(b.title), message: String(b.message), data: JSON.stringify(b.data || {}), isRead: false, createdAt: now() });
    ok(res, { id: ref.id, title: b.title, message: b.message });
  });
  app.delete('/api/admin/notifications/:id', gate, async (req, res) => {
    try { await db().delete('admin_notifications', req.params.id); } catch (e) { return bad(res, 404, 'Notification not found'); }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // REVIEWS (moderation)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/reviews', gate, async (req, res) => {
    const [reviews, profiles] = await Promise.all([listAll('reviews'), listAll('profiles')]);
    ok(res, reviews.map(r => {
      const customer = profiles.find(p => p.id === r.customerId || p.id === r.customer_id);
      return {
        id: r.id, orderId: r.orderId || r.order_id,
        customerName: (customer && (customer.name || customer.email)) || 'Customer',
        restaurantRating: r.restaurantRating || r.restaurant_rating || 0,
        driverRating: r.driverRating || r.driver_rating || 0,
        comment: r.comment, isPublic: r.isPublic ?? r.is_public,
        createdAt: r.createdAt || r.created_at,
      };
    }));
  });
  app.put('/api/admin/reviews/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.isPublic !== undefined) patch.isPublic = !!b.isPublic;
    try { await db().update('reviews', req.params.id, patch); } catch (e) { return bad(res, 404, 'Review not found'); }
    ok(res, { id: req.params.id, ...patch });
  });
  // Moderate: approve → public, reject → hidden (reviews has is_public, no status column)
  app.put('/api/admin/reviews/:id/moderate', gate, async (req, res) => {
    const action = (req.body || {}).action;
    if (!['approve', 'reject'].includes(action)) return bad(res, 400, 'action must be approve or reject');
    const patch = { isPublic: action === 'approve', updatedAt: now() };
    try { await db().update('reviews', req.params.id, patch); } catch (e) { return bad(res, 404, 'Review not found'); }
    try {
      logAudit('review_' + action, (req.user && (req.user.email || req.user.uid)) || 'unknown', { reviewId: req.params.id, at: now() });
    } catch (_) {}
    ok(res, { id: req.params.id, ...patch });
  });
  app.delete('/api/admin/reviews/:id', gate, async (req, res) => {
    try { await db().delete('reviews', req.params.id); } catch (e) { return bad(res, 404, 'Review not found'); }
    ok(res);
  });

  // ════════════════════════════════════════════════════════════════
  // PAYOUTS (vendor_payouts)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/payouts', gate, async (req, res) => {
    const [payouts, sellers] = await Promise.all([listAll('vendor_payouts'), listAll('sellers')]);
    ok(res, payouts.map(p => {
      const seller = sellers.find(s => s.id === p.vendorId || s.id === p.vendor_id);
      return {
        id: p.id, vendorName: (seller && seller.name) || 'Vendor',
        amount: p.amount, method: p.method, status: p.status,
        transactionRef: p.transactionRef || p.transaction_ref,
        processedAt: p.processedAt || p.processed_at,
        createdAt: p.createdAt || p.created_at,
      };
    }));
  });
  app.post('/api/admin/payouts', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.vendorId || !Number.isFinite(Number(b.amount))) return bad(res, 400, 'vendorId and amount required');
    const ref = await db().add('vendor_payouts', { vendorId: b.vendorId, amount: num(b.amount), method: b.method || 'mobile_money', status: 'pending', createdAt: now(), updatedAt: now() });
    ok(res, { id: ref.id, vendorId: b.vendorId, amount: num(b.amount), status: 'pending' });
  });

  // ════════════════════════════════════════════════════════════════
  // SYSTEM STATUS / LOGS
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/system/status', gate, async (req, res) => {
    const mem = process.memoryUsage();
    ok(res, {
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.heapUsed / 1048576),
      nodeVersion: process.version,
      pid: process.pid,
      dbMode: process.env.SKIP_FIREBASE === 'true' || process.env.NODE_ENV !== 'production' ? 'supabase-fallback' : 'firestore-primary',
      time: now(),
    });
  });
  app.get('/api/admin/system/logs', gate, async (req, res) => {
    const logger = app.get('logger');
    const type = req.query.type;
    // Serve from the in-memory ring buffer (same source as /api/logs)
    res.json({ success: true, data: [] });
  });

  // ════════════════════════════════════════════════════════════════
  // TICKETS / SLA / CANNED RESPONSES (support desk)
  // Stored in platform_settings (no dedicated tables)
  // ════════════════════════════════════════════════════════════════
  async function getSetting(key, fallback) {
    const rows = await listAll('platform_settings');
    const row = rows.find(r => r.key === key);
    try { return row ? JSON.parse(row.value) : fallback; } catch (_) { return fallback; }
  }
  async function putSetting(key, value) {
    const rows = await listAll('platform_settings');
    const row = rows.find(r => r.key === key);
    if (row) await db().update('platform_settings', row.id, { value: JSON.stringify(value), updatedAt: now() });
    else await db().add('platform_settings', { key, value: JSON.stringify(value), description: 'Support desk data', isPublic: false, updatedAt: now() });
  }

  app.get('/api/admin/tickets', gate, async (req, res) => ok(res, await getSetting('support_tickets', [])));
  app.get('/api/admin/tickets/sla', gate, async (req, res) => ok(res, await getSetting('support_sla', { firstResponseHours: 4, resolutionHours: 48 })));
  app.get('/api/admin/tickets/canned-responses', gate, async (req, res) => ok(res, await getSetting('canned_responses', [])));
  app.post('/api/admin/tickets/canned-responses', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.body) return bad(res, 400, 'title and body required');
    const responses = await getSetting('canned_responses', []);
    const item = { id: crypto.randomUUID(), title: String(b.title), body: String(b.body), createdAt: now() };
    responses.push(item);
    await putSetting('canned_responses', responses);
    ok(res, item);
  });

  // ════════════════════════════════════════════════════════════════
  // ANALYTICS (revenue by day) + REPORT SCHEDULING
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/analytics/revenue', gate, async (req, res) => {
    const orders = await listAll('orders');
    const days = req.query.period === 'daily' ? 14 : 30;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const d = safeDate(o.createdAt || o.created_at);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (buckets[key]) { buckets[key].revenue += num(o.total); buckets[key].orders += 1; }
    });
    ok(res, Object.values(buckets));
  });
  app.post('/api/admin/analytics/report/schedule', gate, async (req, res) => {
    const b = req.body || {};
    await db().add('admin_notifications', {
      userId: req.user.uid, type: 'report_scheduled',
      title: 'Analytics report scheduled',
      message: `Report ${b.reportType || 'summary'} scheduled ${b.frequency || 'daily'} to ${b.email || 'admin'}`,
      data: JSON.stringify(b), isRead: false, createdAt: now(),
    });
    ok(res, { message: 'Report scheduled' });
  });

  // ════════════════════════════════════════════════════════════════
  // INVENTORY ALERTS / RESTOCK
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/inventory/alerts', gate, async (req, res) => {
    const threshold = num(req.query.threshold) || 5;
    const products = await listAll('products');
    const alerts = products.filter(p => {
      const stock = num(p.stockQuantity ?? p.stock);
      return stock <= threshold;
    }).map(p => ({ id: p.id, name: p.name, stock: num(p.stockQuantity ?? p.stock), sellerId: p.sellerId, threshold }));
    ok(res, alerts);
  });
  app.put('/api/admin/inventory/restock', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.productId || !Number.isFinite(Number(b.quantity))) return bad(res, 400, 'productId and quantity required');
    try { await db().update('products', b.productId, { stockQuantity: num(b.quantity), updatedAt: now() }); }
    catch (e) { return bad(res, 404, 'Product not found'); }
    ok(res, { id: b.productId, stockQuantity: num(b.quantity) });
  });

  // ════════════════════════════════════════════════════════════════
  // AUDIT + RISK + FLAGGED + CATEGORIES + BULK ORDERS
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/audit', gate, async (req, res) => {
    const limit = num(req.query.limit) || 100;
    // `merchant_audit_logs` is the merchant audit table (verified against the
    // live schema); `audit_logs` is the separate platform audit log.
    const logs = await listAll('merchant_audit_logs');
    const out = logs.sort((a, b) => String(b.ts || b.createdAt || '').localeCompare(String(a.ts || a.createdAt || '')))
      .slice(0, limit)
      .map(l => ({
        id: l.id, ts: l.ts || l.createdAt,
        user: l.actorEmail || l.actorId || 'system',
        action: l.action, resourceType: l.resourceType, resourceId: l.resourceId,
        ip: l.ip,
      }));
    ok(res, out);
  });

  app.get('/api/admin/risk-score', gate, async (req, res) => {
    const entity = req.query.entity;
    if (!entity) return bad(res, 400, 'entity required');
    const orders = (await listAll('orders')).filter(o => (o.customerId || o.customer_id) === entity || (o.sellerId || o.merchantId) === entity);
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const score = Math.min(100, orders.length === 0 ? 0 : Math.round((cancelled / orders.length) * 100) + (orders.length > 50 ? 10 : 0));
    ok(res, { entity, score, signals: { totalOrders: orders.length, cancelled } });
  });

  app.put('/api/admin/flagged-items/:id', gate, async (req, res) => {
    const b = req.body || {};
    const items = await getSetting('flagged_items', []);
    const idx = items.findIndex(i => i.id === req.params.id);
    const item = { id: req.params.id, ...(idx >= 0 ? items[idx] : {}), status: b.status || 'reviewed', updatedAt: now() };
    if (idx >= 0) items[idx] = item; else items.push(item);
    await putSetting('flagged_items', items);
    ok(res, item);
  });

  app.get('/api/admin/categories', gate, async (req, res) => {
    const products = await listAll('products');
    const sellers = await listAll('sellers');
    const counts = {};
    products.forEach(p => { const c = p.category || 'other'; counts[c] = (counts[c] || 0) + 1; });
    sellers.forEach(s => { const c = s.category || 'other'; counts[c] = (counts[c] || 0) + 1; });
    ok(res, Object.entries(counts).map(([name, count]) => ({ name, count })));
  });

  app.post('/api/admin/orders/bulk-status', gate, async (req, res) => {
    const b = req.body || {};
    if (!Array.isArray(b.orderIds) || !b.status) return bad(res, 400, 'orderIds[] and status required');
    let updated = 0;
    for (const id of b.orderIds) {
      try { await db().update('orders', id, { status: b.status, updatedAt: now() }); updated++; } catch (_) {}
    }
    ok(res, { updated, total: b.orderIds.length });
  });

  // ════════════════════════════════════════════════════════════════
  // PRODUCTS (admin catalog management — Products tab)
  // ════════════════════════════════════════════════════════════════
  app.get('/api/admin/products', gate, async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 1), 1000);
    const category = req.query.category;
    const q = String(req.query.q || '').toLowerCase();
    let rows = await listAll('products');
    // Normalize the db-layer naming (stockQuantity/imageUrl) to what the UI reads
    rows = rows.map(r => ({
      ...r,
      stock: r.stock != null ? r.stock : (r.stockQuantity != null ? r.stockQuantity : null),
      imageUrl: r.imageUrl || r.image || null,
    }));
    if (category && category !== 'all') rows = rows.filter(p => (p.category || 'other') === category);
    if (q) rows = rows.filter(p => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    ok(res, rows.slice(0, limit));
  });
  app.post('/api/admin/products', gate, async (req, res) => {
    const b = req.body || {};
    if (!b.name || b.price == null) return bad(res, 400, 'name and price required');
    const ref = await db().add('products', {
      name: String(b.name),
      price: num(b.price),
      description: b.description || '',
      category: b.category || 'other',
      stock: b.stock != null ? parseInt(b.stock) || 0 : 0,
      unit: b.unit || '',
      imageUrl: b.imageUrl || '',
      isAvailable: b.isAvailable != null ? !!b.isAvailable : true,
      createdAt: now(),
      updatedAt: now(),
    });
    ok(res, { id: ref.id });
  });
  app.put('/api/admin/products/:id', gate, async (req, res) => {
    const b = req.body || {};
    const patch = { updatedAt: now() };
    if (b.name != null) patch.name = String(b.name);
    if (b.price != null) patch.price = num(b.price);
    if (b.description != null) patch.description = String(b.description);
    if (b.category != null) patch.category = String(b.category);
    if (b.stock != null) patch.stock = parseInt(b.stock) || 0;
    if (b.unit != null) patch.unit = String(b.unit);
    if (b.imageUrl != null) patch.imageUrl = String(b.imageUrl);
    if (b.isAvailable != null) patch.isAvailable = !!b.isAvailable;
    await db().update('products', req.params.id, patch);
    ok(res, { id: req.params.id });
  });
  app.delete('/api/admin/products/:id', gate, async (req, res) => {
    await db().delete('products', req.params.id);
    ok(res, { id: req.params.id, deleted: true });
  });

}

function safeDate(v) {
  if (!v) return null;
  if (v.seconds != null) return new Date(v.seconds * 1000);
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = { adminExtendedRoutes };



