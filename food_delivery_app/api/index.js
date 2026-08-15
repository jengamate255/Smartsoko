// Vercel Serverless Entry Point
// This exports the Express app as a serverless function for Vercel
// Handles routing properly for Vercel serverless functions

const { createServer } = require('http');

// Import the Express app from the main server
const { app } = require('../server-production.js');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Add request ID for tracing
  req.id = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 
           `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  
  // Vercel passes the full path including /api prefix
  // The Express app routes are defined with /api/ prefix
  // So we need to ensure the path is correct
  const originalUrl = req.url;
  
  // Handle the request with the Express app
  return app(req, res);
};

// Export the Express app for Vercel
module.exports.default = app;