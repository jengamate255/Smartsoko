// Vercel Serverless Entry Point
// This exports the Express app as a serverless function for Vercel
// Handles routing properly for Vercel serverless functions

let app;

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Add request ID for tracing
  req.id = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 
           `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  
  try {
    // Keep initialization inside the handler so startup failures return a
    // controlled response and are recorded in the provider's runtime logs.
    app ||= require('../server/server-production.js').app;
    return app(req, res);
  } catch (error) {
    console.error('SmartSoko API startup failed:', error);
    const missing = error.code === 'MODULE_NOT_FOUND'
      ? /^Cannot find module '([@a-zA-Z0-9_./-]+)'/.exec(error.message)?.[1]
      : undefined;
    return res.status(503).json({ success: false, error: 'API is temporarily unavailable', code: error.code || 'STARTUP_FAILED', ...(missing ? { dependency: missing } : {}) });
  }
};
