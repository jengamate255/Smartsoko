// Vercel Serverless Test Endpoint
// Test endpoint to verify API routing works

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: 'Vercel API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url,
    headers: req.headers,
    query: req.query
  });
};
