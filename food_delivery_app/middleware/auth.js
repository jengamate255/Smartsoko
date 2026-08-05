/**
 * Authentication Middleware for SmartSoko API
 * Verifies Firebase ID tokens and enforces role-based access
 */

const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

// Store admin reference (set by server)
let admin = null;
let supabaseClient = null;
const roleCache = new Map();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Known admin emails (fallback when Firestore is unavailable)
const ADMIN_EMAILS = ['dd396515@gmail.com'];

function setAdmin(adminInstance) {
  admin = adminInstance;
}

function getCachedRole(uid) {
  const entry = roleCache.get(uid);
  if (entry && Date.now() - entry.ts < ROLE_CACHE_TTL) {
    return entry.role;
  }
  return null;
}

function setCachedRole(uid, role) {
  roleCache.set(uid, { role, ts: Date.now() });
}

// Verify Firebase ID Token or Supabase JWT
async function verifyToken(req, res, next) {
  let token;
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Format: Bearer <token>'
      });
    }

    token = authHeader.split('Bearer ')[1];

    // Try Firebase first
    if (admin) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        return resolveUserAndContinue(req, res, next);
      } catch (fbError) {
        // Firebase failed — fall through to Supabase
      }
    }

    // Try Supabase JWT
    if (!supabaseClient) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      }
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        const user = data.user;
        req.user = {
          uid: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          role: user.user_metadata?.role || 'customer'
        };
        return next();
      }
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

async function resolveUserAndContinue(req, res, next) {
  try {
    const decodedToken = req.user;
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email || '';
    let userRole = getCachedRole(userId);

    if (!userRole) {
      if (ADMIN_EMAILS.includes(userEmail)) {
        userRole = 'admin';
      } else if (admin) {
        const collections = ['users', 'drivers', 'restaurants', 'sellers'];
        userRole = 'customer';
        for (const colName of collections) {
          try {
            const userDoc = await admin.firestore().collection(colName).doc(userId).get();
            if (userDoc.exists) {
              const data = userDoc.data();
              if (colName === 'users') {
                userRole = data.role || 'customer';
              } else if (colName === 'drivers') {
                userRole = 'driver';
              } else if (colName === 'restaurants' || colName === 'sellers') {
                userRole = 'merchant';
              }
              break;
            }
          } catch (e) { /* skip */ }
        }
      }
      setCachedRole(userId, userRole);
    }

    req.user.role = userRole;
    next();
  } catch (error) {
    console.error('Role resolution failed:', error.message);
    req.user.role = 'customer';
    next();
  }
}

const ROLE_HIERARCHY = {
  'super_admin': 4,
  'admin': 3,
  'merchant': 2,
  'driver': 1,
  'customer': 0
};

// Check if user has required role OR higher (super_admin can do everything)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    const hasPermission = allowedRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
      return userLevel >= requiredLevel;
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`
      });
    }

    next();
  };
}

// Check if user owns the resource or has admin/super_admin role
function requireOwnershipOrAdmin(getOwnerId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const ownerId = getOwnerId(req);
    const userRole = req.user.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Admin (level >= 3) can access any resource
    if (userLevel >= 3 || req.user.uid === ownerId) {
      next();
    } else {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
  };
}

// Optional auth - sets user if token provided, but doesn't require it
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!admin) {
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    // Fetch user role
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.user.role = userDoc.data().role || 'customer';
      req.user.profile = userDoc.data();
    }

    next();
  } catch (error) {
    // Token invalid, but that's OK for optional auth
    next();
  }
}

// Check if user can access order
async function requireOrderAccess(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const orderId = req.params.orderId;
    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }

    const order = orderDoc.data();
    const userRole = req.user.role || 'customer';
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

    // Admin/super_admin can access any order
    if (userLevel >= 3) {
      req.order = { id: orderId, ...order };
      return next();
    }

    // Check if user is involved in the order
    if (order.customerId === req.user.uid ||
        order.sellerId === req.user.uid ||
        order.driverId === req.user.uid) {
      req.order = { id: orderId, ...order };
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this order'
    });

  } catch (error) {
    console.error('Order access check failed:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify order access'
    });
  }
}

// Input validation middleware
function validateInput(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// Request sanitization
function sanitizeInput(req, res, next) {
  if (req.body) {
    // Remove any fields that start with $ (MongoDB injection protection)
    // and other potentially dangerous patterns
    const sanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip keys starting with $ or containing ..
        if (key.startsWith('$') || key.includes('..')) {
          continue;
        }
        cleaned[key] = typeof value === 'object' ? sanitize(value) : value;
      }
      return cleaned;
    };

    req.body = sanitize(req.body);
  }
  next();
}

// Static role resolver (used by WebSocket and other non-Express contexts)
async function resolveUserRole(uid, db) {
  if (!db) return 'customer';
  try {
    const collections = ['users', 'drivers', 'restaurants', 'sellers'];
    for (const colName of collections) {
      const doc = await db.collection(colName).doc(uid).get();
      if (doc.exists) {
        const data = doc.data();
        if (colName === 'users') return data.role || 'customer';
        if (colName === 'drivers') return 'driver';
        if (colName === 'restaurants' || colName === 'sellers') return 'merchant';
      }
    }
  } catch (error) {
    console.error('Failed to resolve user role:', error.message);
  }
  return 'customer';
}

module.exports = {
  setAdmin,
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  requireOrderAccess,
  validateInput,
  sanitizeInput,
  resolveUserRole,
  ROLE_HIERARCHY
};
