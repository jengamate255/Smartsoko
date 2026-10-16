const functions = require('firebase-functions');

// Serve the full SmartSoko API (sellers, orders, driver, merchant, admin).
// The complete Express app lives in app.js (API only, no WebSocket).
const app = require('./app');

exports.api = functions.https.onRequest(app);
