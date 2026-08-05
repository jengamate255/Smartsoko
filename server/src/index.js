const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/driver');
const orderRoutes = require('./routes/orders');
const { setupWebSocket } = require('./ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/driver' });

app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/orders', orderRoutes);

// WebSocket
setupWebSocket(wss);

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Root
app.get('/', (_req, res) => res.send('<h2>SmartSoko Driver API</h2><p>Try <a href="/api/health">/api/health</a></p>'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SmartSoko] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[SmartSoko] WebSocket at ws://0.0.0.0:${PORT}/ws/driver`);
});
