const jwt = require('jsonwebtoken');
const { drivers, tokens } = require('./store');

const JWT_SECRET = 'smartsoko-driver-secret-2026';
const OTP = '1234';

function generateToken(driverId) {
  return jwt.sign({ driverId }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.driverId = payload.driverId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET);
      req.driverId = payload.driverId;
    } catch { /* ignore */ }
  }
  next();
}

module.exports = { JWT_SECRET, OTP, generateToken, authMiddleware, optionalAuth };
