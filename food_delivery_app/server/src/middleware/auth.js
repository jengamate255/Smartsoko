// Reassigned only via setAdmin() (server-provided handle); keep `let`.
let admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Auth-only Firebase Admin bootstrap ────────────────────────────────
// The server may run in Supabase-only mode (SKIP_FIREBASE) where the Firestore
// admin SDK is never initialized — but ID-token verification only needs a
// lightweight HTTPS fetch of Google's public signing keys, not Firestore/gRPC.
// Bootstrap lazily on the first authenticated request so tokens still verify
// in that mode, instead of every auth'd call failing with a cryptic 401.
let adminInitPromise = null;

function loadServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch (e) {
      console.error('auth: FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64 JSON:', e.message);
    }
  }
  // Fallback: serviceAccountKey.json at the app root (food_delivery_app/)
  const keyPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try {
      return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (e) {
      console.error('auth: serviceAccountKey.json is not valid JSON:', e.message);
    }
  }
  return null;
}

function ensureAdminForAuth() {
  if (admin.apps && admin.apps.length) return Promise.resolve(true);
  if (!adminInitPromise) {
    adminInitPromise = (async () => {
      const serviceAccount = loadServiceAccount();
      if (!serviceAccount) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (!projectId) {
          console.error('auth: set FIREBASE_PROJECT_ID for ID-token verification');
          adminInitPromise = null;
          return false;
        }
        // ID-token verification uses Google's public signing keys. Private
        // service-account credentials are only needed for administrative APIs.
        admin.initializeApp({ projectId });
        return true;
      }
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('auth: Firebase admin app initialized (auth-only) for ID token verification');
      return true;
    })().catch((e) => {
      console.error('auth: Firebase admin init failed:', e.message);
      adminInitPromise = null; // allow a retry on the next request
      return false;
    });
  }
  return adminInitPromise;
}

// Server-provided handle: server-production.js calls this when it has already
// initialized the admin SDK itself (non-SKIP_FIREBASE mode).
function setAdmin(adminInstance) {
  if (adminInstance && typeof adminInstance.auth === 'function' && adminInstance !== admin) {
    admin = adminInstance;
  }
}

// ─── Platform role resolution ───────────────────────────────────────────
// Firebase ID tokens carry no SmartSoko role (roles[] custom claims are
// never set), so req.user.role is resolved from the Supabase `profiles`
// table: first by firebase_uid, then by email. Cached for 5 minutes per
// uid to keep admin endpoints fast.
let _roleCache = new Map(); // uid → { role, expires }
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

function getRoleClient() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
  } catch (_) { return null; }
}

// Firebase-uid → profile backfills attempted this process (write-once guard)
const _backfillAttempted = new Set();

async function resolvePlatformRole(uid, email) {
  const cached = _roleCache.get(uid);
  if (cached && cached.expires > Date.now()) return cached.role;

  const sb = getRoleClient();
  if (!sb) return null;
  try {
    // 1. by firebase_uid (the canonical link). limit(1) instead of
    //    maybeSingle(): a duplicate row would make maybeSingle throw and
    //    silently downgrade the user to 'customer' → login loop.
    let { data } = await sb.from('profiles').select('id, role').eq('firebase_uid', uid).limit(1);
    // 2. by email (profiles rows created before firebase_uid was populated)
    if ((!data || !data.length) && email) {
      ({ data } = await sb.from('profiles').select('id, role, firebase_uid').eq('email', email)
        .order('firebase_uid', { ascending: false, nullsFirst: false }).limit(1));
      // One-time backfill: link the Firebase uid so later lookups hit the
      // canonical index and admin-panel role changes invalidate the right
      // cache entry.
      const row = data && data[0];
      if (row && !row.firebase_uid && !_backfillAttempted.has(uid)) {
        _backfillAttempted.add(uid);
        sb.from('profiles').update({ firebase_uid: uid }).eq('id', row.id)
          .then(() => console.log('[auth] Backfilled firebase_uid on profile ' + row.id))
          .catch(() => { /* best-effort */ });
      }
    }
    let role = data && data.length && data[0].role ? String(data[0].role).toLowerCase() : null;

    // 3. Legacy merchant/driver fallback: a Firebase account may predate
    //    the profiles table yet own a real seller record.
    if (!role || role === 'customer') {
      const legacyRole = await resolveLegacyRole(sb, uid, email);
      if (legacyRole) role = legacyRole;
    }

    if (role) _roleCache.set(uid, { role, expires: Date.now() + ROLE_CACHE_TTL_MS });
    return role;
  } catch (_) {
    return null;
  }
}

// Resolve a role for accounts that exist only in the legacy stores.
// Legacy Firestore collections key seller docs by the owner's Firebase uid
// (sellers/<uid> with ownerId == uid, e.g. Burger Palace `apPtRvVh…`), and
// legacy Firestore driver docs by uid too. In Supabase, `sellers.owner_id`
// is a profiles.id uuid (NOT the firebase uid) and `drivers` carries a
// `firebase_uid` column, so the fallback covers both shapes. Without this,
// merchants whose accounts predate the `profiles` table resolve as
// role=customer and merchant.html bounces them to login in an infinite
// redirect loop.
async function resolveLegacyRole(sb, uid, email) {
  // a) Supabase mirrors of the legacy tables (limit(1): duplicate-safe)
  try {
    let { data: driver } = await sb.from('drivers').select('id').eq('firebase_uid', uid).limit(1);
    if (driver && driver.length) return 'driver';
    if (email) {
      const { data: seller } = await sb.from('sellers').select('id').eq('email', email).limit(1);
      if (seller && seller.length) return 'merchant';
    }
  } catch (_) { /* best-effort */ }

  if (process.env.SKIP_FIREBASE === 'true') return null;
  // b) Firestore legacy collections (sellers/<uid>, drivers/<uid>) — uses the
  //    auth-only admin app when the server runs Supabase-only mode.
  try {
    const ready = await ensureAdminForAuth();
    if (!ready) return null;
    const fsdb = admin.firestore();
    const [sellerSnap, driverSnap] = await Promise.all([
      fsdb.collection('sellers').doc(uid).get(),
      fsdb.collection('drivers').doc(uid).get(),
    ]);
    if (sellerSnap.exists) return 'merchant';
    if (driverSnap.exists) return 'driver';
    // Legacy restaurants collection (older merchant accounts)
    const restSnap = await fsdb.collection('restaurants').doc(uid).get();
    if (restSnap.exists) return 'merchant';
  } catch (_) { /* best-effort (Firestore may be quota-exhausted) */ }
  return null;
}

function invalidateRoleCache(uid) {
  if (uid) _roleCache.delete(uid);
  else _roleCache.clear();
}

// ─── Supabase JWT support (native mobile apps) ──────────────────────────
// The Android customer app authenticates directly against Supabase Auth
// (grant_type=password) and sends Supabase access tokens as Bearer tokens.
// This verifies such tokens against Supabase (/auth/v1/user) and maps the
// Supabase user onto our profile/users store so req.user.uid is usable.
let _supabaseTokenCache = new Map(); // token → { user, expires }
const SUPABASE_TOKEN_CACHE_TTL_MS = 60 * 1000;

async function verifySupabaseToken(token) {
  // This only selects a verifier; neither the payload nor its claims are
  // trusted until getUser/verifyIdToken has cryptographically verified it.
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    const issuer = (process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co') + '/auth/v1';
    if (payload.iss !== issuer) return null;
  } catch (_) { return null; }
  const cached = _supabaseTokenCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.user;

  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) return null;
    const sb = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data || !data.user) return null;
    const u = data.user;

    // Map the Supabase user onto our identity: profiles row by firebase_uid
    // (apps store the Supabase uid there for Supabase-native accounts) or by
    // email. Fall back to the Supabase uid itself.
    let uid = u.id;
    let role = null;
    try {
      const { createClient: cc } = require('@supabase/supabase-js');
      const svcKey = process.env.SUPABASE_SERVICE_KEY || anonKey;
      const svc = cc(url, svcKey, { auth: { persistSession: false } });
      let row = null;
      const byFb = await svc.from('profiles').select('id, role, email, firebase_uid').eq('firebase_uid', u.id).limit(1);
      if (byFb.data && byFb.data.length) row = byFb.data[0];
      else if (u.email) {
        const byEmail = await svc.from('profiles').select('id, role, email, firebase_uid').eq('email', u.email)
          .order('firebase_uid', { ascending: false, nullsFirst: false }).limit(1);
        if (byEmail.data && byEmail.data.length) row = byEmail.data[0];
      }
      if (row) {
        // Prefer the profile's own id as the uid for data lookups (addresses,
        // orders are keyed by profiles.id for Supabase-native accounts).
        uid = row.id;
        role = row.role || null;
      }
    } catch (_) { /* profile lookup best-effort */ }

    const user = {
      uid,
      email: u.email || '',
      name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '',
      provider: 'supabase',
      emailVerified: !!u.email_confirmed_at,
    };
    _supabaseTokenCache.set(token, { user, expires: Date.now() + SUPABASE_TOKEN_CACHE_TTL_MS });
    return user;
  } catch (_) {
    return null;
  }
}

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // 1. Supabase JWT (native mobile app session)
    const supaUser = await verifySupabaseToken(token);
    if (supaUser) {
      req.user = {
        uid: supaUser.uid,
        email: supaUser.email,
        name: supaUser.name,
        emailVerified: supaUser.emailVerified,
        roles: ['customer'],
      };
      req.user.role = 'customer';
      const role = await resolvePlatformRole(supaUser.uid, supaUser.email);
      if (role) { req.user.role = role; req.user.roles.push(role); }
      return next();
    }

    // 2. Firebase ID token (web session)
    const ready = await ensureAdminForAuth();
    if (!ready) {
      return res.status(503).json({ success: false, error: 'Auth backend not configured (missing Firebase credentials)' });
    }
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      emailVerified: decoded.email_verified === true,
      roles: decoded.roles || [],
      customClaims: decoded.customClaims || {},
    };
    // Resolve the SmartSoko platform role (admin/merchant/driver/customer)
    // from the profiles table — see resolvePlatformRole above.
    const role = await resolvePlatformRole(decoded.uid, decoded.email);
    req.user.role = role || 'customer';
    if (role) { req.user.roles = Array.from(new Set([...(req.user.roles || []), role])); }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];

      // Supabase JWT first (cheap, cached)
      const supaUser = await verifySupabaseToken(token);
      if (supaUser) {
        req.user = {
          uid: supaUser.uid,
          email: supaUser.email,
          name: supaUser.name,
          roles: ['customer'],
        };
        req.user.role = 'customer';
        const role = await resolvePlatformRole(supaUser.uid, supaUser.email);
        if (role) { req.user.role = role; req.user.roles.push(role); }
        return next();
      }

      const ready = await ensureAdminForAuth();
      if (ready) {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          roles: decoded.roles || [],
          customClaims: decoded.customClaims || {},
        };
        const role = await resolvePlatformRole(decoded.uid, decoded.email);
        req.user.role = role || 'customer';
        if (role) { req.user.roles = Array.from(new Set([...(req.user.roles || []), role])); }
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const userRoles = req.user.roles || [];
  const hasRole = allowedRoles.some(role => userRoles.includes(role));
  
  if (!hasRole) {
    return res.status(403).json({ 
      success: false, 
      error: `Requires one of roles: ${allowedRoles.join(', ')}` 
    });
  }
  
  next();
};

const requireOwnership = (resourceUserIdFn) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const resourceUserId = await resourceUserIdFn(req);
  
  if (req.user.uid !== resourceUserId && !req.user.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  
  next();
};

const requireMerchant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.roles.includes('merchant') && !req.user.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Merchant access required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

const requireRider = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!req.user.roles.includes('rider') && !req.user.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Rider access required' });
  }
  next();
};

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

const validateInput = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requireOwnership,
  requireMerchant,
  requireAdmin,
  requireRider,
  sanitizeInput,
  validateInput,
  setAdmin,
  resolvePlatformRole,
  invalidateRoleCache,
  verifySupabaseToken,
};
