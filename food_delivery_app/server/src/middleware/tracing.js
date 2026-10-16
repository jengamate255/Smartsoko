const crypto = require('crypto');

function requestId() {
  return (req, res, next) => {
    req.id = req.headers['x-request-id'] || 
             req.headers['x-correlation-id'] || 
             `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    res.setHeader('X-Request-ID', req.id);
    next();
  };
}

function tracingLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = req.id;
  
  const logger = {
    info: (message, meta = {}) => {
      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...meta,
      }));
    },
    warn: (message, meta = {}) => {
      console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...meta,
      }));
    },
    error: (message, meta = {}) => {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        requestId,
        message,
        ...meta,
      }));
    },
  };

  req.log = logger;
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.uid,
    });
  });

  next();
}

module.exports = {
  requestId,
  tracingLogger,
};