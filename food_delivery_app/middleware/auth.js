/**
 * Authentication Middleware for SmartSoko API
 * Verifies Firebase ID tokens and enforces role-based access
 */

const { z } = require('zod');

// Store admin reference (set by server)
let admin = null;

function setAdmin(adminInstance) {
  admin = adminInstance;
}

// Verify Firebase ID Token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Format: Bearer <token>'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!admin) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Authentication service not initialized'
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    // Check multiple collections for user role
    const userId = decodedToken.uid;
    const collections = ['users', 'drivers', 'restaurants', 'sellers'];
    let userRole = 'customer';

    for (const colName of collections) {
      try {
        const userDoc = await admin.firestore().collection(colName).doc(userId).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          // Determine role based on collection
          if (colName === 'users') {
            userRole = data.role || 'customer';
          } else if (colName === 'drivers') {
            userRole = 'driver';
          } else if (colName === 'restaurants' || colName === 'sellers') {
            userRole = 'merchant';
          }
          break;
        }
      } catch (e) {
        // Collection might not exist, continue
      }
    }

    req.user.role = userRole;

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
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

module.exports = {
  setAdmin,
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  requireOrderAccess,
  validateInput,
  sanitizeInput,
  ROLE_HIERARCHY
};
