/**
 * Logger Configuration
 * Winston logger with file transports, in-memory ring buffer, and audit logging.
 */

const winston = require('winston');
const path = require('path');

// ─── In-memory log ring buffer ───────────────────────────────────────
const MAX_LOG_ENTRIES = 2000;
const logBuffer = [];

class MemoryTransport extends winston.Transport {
  constructor(opts) { super(opts); this.name = 'memoryTransport'; }
  log(info, callback) {
    logBuffer.push({
      timestamp: info.timestamp || new Date().toISOString(),
      level: info.level,
      message: info.message,
      meta: info.meta || null,
      stack: info.stack || null
    });
    if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
    callback();
  }
}

// Initialize Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
        })
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.VERCEL ? [] : [new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '..', '..', 'logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    })]),
    new MemoryTransport()
  ]
});

// ─── Audit log buffer ────────────────────────────────────────────────
const MAX_AUDIT_ENTRIES = 1000;
const auditBuffer = [];

function logAudit(action, details, req) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: action,
    details: details || '',
    user: req && req.user ? (req.user.email || req.user.uid || 'unknown') : 'system',
    ip: req ? req.ip : '0.0.0.0',
    uid: req && req.user ? req.user.uid || null : null
  };
  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_AUDIT_ENTRIES) auditBuffer.splice(0, auditBuffer.length - MAX_AUDIT_ENTRIES);
  logger.info('AUDIT: ' + action + (details ? ' — ' + details : ''), { user: entry.user, ip: entry.ip });
}

module.exports = { logger, logBuffer, auditBuffer, logAudit };
