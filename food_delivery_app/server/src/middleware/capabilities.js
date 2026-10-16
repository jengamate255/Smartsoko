/**
 * Capability-based RBAC + merchant tenant isolation.
 *
 * Roles map to capability sets (§14 of the merchant OS mandate). Route guards
 * check capabilities, never role names, so new roles can be added without
 * touching route code. Tenant isolation is enforced by resolving the caller's
 * own sellerId server-side from the verified Firebase/Supabase token — the
 * client can never select another merchant's data (§27).
 */
'use strict';

// ─── Capability catalogue ──────────────────────────────────────────
const CAPABILITIES = [
  'products.read', 'products.write',
  'inventory.read', 'inventory.write',
  'orders.read', 'orders.write',
  'customers.read', 'customers.write',
  'payments.read', 'payments.write',
  'suppliers.read', 'suppliers.write',
  'purchases.read', 'purchases.write',
  'expenses.read', 'expenses.write',
  'reports.read',
  'staff.read', 'staff.manage',
  'settings.read', 'settings.write',
  'notifications.read',
  'audit.read',
];

// ─── Role → capabilities ───────────────────────────────────────────
const ROLE_CAPABILITIES = {
  owner: CAPABILITIES.slice(), // all
  manager: [
    'products.read', 'products.write',
    'inventory.read', 'inventory.write',
    'orders.read', 'orders.write',
    'customers.read', 'customers.write',
    'payments.read',
    'suppliers.read', 'suppliers.write',
    'purchases.read', 'purchases.write',
    'expenses.read', 'expenses.write',
    'reports.read',
    'staff.read',
    'settings.read',
    'notifications.read',
  ],
  sales: [
    'products.read',
    'orders.read', 'orders.write',
    'customers.read',
    'inventory.read',
    'notifications.read',
  ],
  inventory: [
    'products.read',
    'inventory.read', 'inventory.write',
    'suppliers.read',
    'purchases.read', 'purchases.write',
    'notifications.read',
  ],
  accountant: [
    'payments.read',
    'expenses.read', 'expenses.write',
    'reports.read',
    'orders.read',
    'notifications.read',
  ],
  delivery: [
    'orders.read', 'orders.write',
    'notifications.read',
  ],
};

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  merchant: 2,
  driver: 1,
  customer: 0,
};

/**
 * Effective capabilities for a user.
 * - admins pass everything (platform staff)
 * - `merchant` platform role with a resolved seller ⇒ treated as owner
 * - staff docs may carry custom capabilities[] that extend the role base set
 */
function effectiveCapabilities(user) {
  if (!user) return [];
  const role = user.role || user.staffRole || 'customer';
  const level = ROLE_HIERARCHY[role] ?? 0;

  if (level >= 3) return CAPABILITIES.slice();
  if (role === 'merchant') return ROLE_CAPABILITIES.owner.slice();

  const base = ROLE_CAPABILITIES[role] ? ROLE_CAPABILITIES[role].slice() : [];
  const extra = Array.isArray(user.capabilities) ? user.capabilities : [];
  for (const cap of extra) {
    if (CAPABILITIES.includes(cap) && !base.includes(cap)) base.push(cap);
  }
  return base;
}

function hasCapability(user, capability) {
  return effectiveCapabilities(user).includes(capability);
}

/** Express middleware factory: require a specific capability. */
function requireCapability(capability) {
  return function capMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!hasCapability(req.user, capability)) {
      return res.status(403).json({
        success: false,
        error: `Missing required capability: ${capability}`,
      });
    }
    next();
  };
}

/**
 * Resolve the caller's own seller/store id and attach as req.merchantId.
 * Resolution order (server-side only — request-supplied ids are ignored):
 *   1. req.user.sellerId          (embedded by auth middleware when present)
 *   2. profiles.firebase_uid → profiles.id → sellers.owner_id == profiles.id
 *      (correct chain for Firebase-UID merchants; owner_id is a uuid column)
 *   3. Firestore sellers where ownerId == uid
 *   4. Supabase sellers where owner_id == uid (uuid uids only)
 * Staff members carry sellerId on their staff doc instead of owning one; the
 * route layer attaches it after loading the staff record via requireStaff().
 */
async function resolveMerchant(db, admin, req) {
  if (!req.user) return null;
  if (req.user.sellerId) return req.user.sellerId;

  const uid = req.user.uid;
  const isUuid = (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

  // 2. Profile chain: profiles.firebase_uid = uid → sellers.owner_id = profiles.id
  try {
    if (db && db.where) {
      const profiles = await db.where('profiles', 'firebase_uid', '==', uid);
      const profile = Array.isArray(profiles) && profiles[0];
      if (profile && profile.id) {
        const byProfile = await db.where('sellers', 'ownerId', '==', profile.id);
        if (Array.isArray(byProfile) && byProfile.length > 0) return byProfile[0].id;
      }
    }
  } catch (_) { /* fall through */ }

  // 3. Firestore primary
  if (admin && admin.firestore) {
    try {
      const snap = await admin.firestore().collection('sellers')
        .where('ownerId', '==', uid).limit(1).get();
      if (!snap.empty) return snap.docs[0].id;
    } catch (_) { /* fall through to adapter */ }
  }
  // 4. Flat adapter fallback (Supabase) — only meaningful for uuid uids;
  //    non-uuid values now filter in-memory to zero rows by server-db.js.
  try {
    if (db && db.where && isUuid(uid)) {
      const rows = await db.where('sellers', 'ownerId', '==', uid);
      if (Array.isArray(rows) && rows.length > 0) return rows[0].id;
    }
  } catch (_) { /* not found */ }
  return null;
}

module.exports = {
  CAPABILITIES,
  ROLE_CAPABILITIES,
  ROLE_HIERARCHY,
  effectiveCapabilities,
  hasCapability,
  requireCapability,
  resolveMerchant,
};
