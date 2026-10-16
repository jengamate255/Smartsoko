/** Isolated browser QA server. All orders and mutations live in memory. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const machine = require('../../server/src/services/order-state-machine');
const publicRoot = path.resolve(__dirname, '../../public');
const now = Date.now();
const orders = [
  { id: 'qa-1001', customerName: 'Test customer A', customerPhone: '+255 700 001 001', status: 'pending', createdAt: new Date(now - 27 * 60000).toISOString(), total: 18500, items: [{ name: 'Test lunch box', price: 8500, quantity: 2 }, { name: 'Test drink', price: 1500, quantity: 1 }] },
  { id: 'qa-1002', customerName: 'Test customer B', customerPhone: '+255 700 001 002', status: 'pending', createdAt: new Date(now - 3 * 60000).toISOString(), total: 12000, items: [{ name: 'Test vegetable bowl', price: 12000, quantity: 1 }] },
  { id: 'qa-1003', customerName: 'Test customer C', status: 'preparing', createdAt: new Date(now - 18 * 60000).toISOString(), total: 24000, items: [{ name: 'Test meal', price: 12000, quantity: 2 }] },
  { id: 'qa-1004', customerName: 'Test customer D', status: 'ready_for_delivery', createdAt: new Date(now - 40 * 60000).toISOString(), total: 9500, items: [{ name: 'Test breakfast', price: 9500, quantity: 1 }] },
  { id: 'qa-1005', customerName: 'Test customer E', status: 'completed', createdAt: new Date(now - 90 * 60000).toISOString(), total: 32000, items: [{ name: 'Test family meal', price: 32000, quantity: 1 }] },
];
let failRead = false;
const send = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const bootstrap = `<script>window.auth = { currentUser: { uid: 'qa-merchant', getIdToken: async () => 'qa-token' }, onAuthStateChanged(callback) { queueMicrotask(() => callback(this.currentUser)); } };</script>`;
const banner = `<div style="position:fixed;bottom:0;left:0;right:0;z-index:100;background:#faedce;border-top:1px solid #d9bd78;padding:8px 15px;color:#705621;font:11px sans-serif;display:flex;justify-content:space-between;gap:12px"><strong>ISOLATED TEST DATA · No live orders or messages</strong><button onclick="fetch('/qa/fail-next-read',{method:'POST'}).then(()=>refreshOrders())" style="text-decoration:underline">Simulate refresh failure</button></div>`;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/qa/fail-next-read' && req.method === 'POST') { failRead = true; return send(res, { success: true }); }
    if (url.pathname.startsWith('/api/merchant')) {
      if (req.headers.authorization !== 'Bearer qa-token') return send(res, { error: 'QA token required' }, 401);
      const route = url.pathname.slice('/api/merchant'.length);
      if (route === '/profile') return send(res, { success: true, data: { id: 'qa-store', name: 'QA Store · TEST DATA', rating: 4.7, isOpen: true } });
      if (route === '/overview') return send(res, { success: true, data: { today: { revenue: 32000, orders: 1 }, month: { aov: 32000 }, pendingOrders: 3, salesTrend: [{ revenue: 32000, orders: 1 }] } });
      if (route === '/orders') {
        if (failRead) { failRead = false; return send(res, { success: false, error: 'Simulated temporary failure' }, 503); }
        const rows = orders.filter(order => !url.searchParams.get('status') || machine.canonicalStatus(order.status) === machine.canonicalStatus(url.searchParams.get('status')));
        return send(res, { success: true, data: rows, allowedTransitionsHint: Object.fromEntries(rows.map(order => [order.id, machine.allowedNextStatuses(order.status)])) });
      }
      const action = route.match(/^\/orders\/([^/]+)\/status$/);
      if (action && req.method === 'POST') {
        const order = orders.find(row => row.id === decodeURIComponent(action[1]));
        if (!order) return send(res, { error: 'Not found' }, 404);
        let raw = ''; for await (const chunk of req) raw += chunk;
        const status = machine.canonicalStatus(JSON.parse(raw).status);
        if (!machine.canTransition(order.status, status)) return send(res, { error: 'Invalid transition' }, 422);
        order.status = status;
        return send(res, { success: true, data: { id: order.id, status, allowedNextStatuses: machine.allowedNextStatuses(status) } });
      }
      if (route === '/balance') return send(res, { success: true, data: {} });
      return send(res, { success: true, data: [] });
    }
    if (url.pathname === '/merchant' || url.pathname === '/') {
      let html = await fs.readFile(path.join(publicRoot, 'merchant.html'), 'utf8');
      html = html.replace(/<script\b[^>]*src="(?:config\/firebase-config\.js[^" ]*|auth-check\.js[^" ]*|js\/merchant-app\.js[^" ]*)"[^>]*><\/script>/g, '');
      html = html.replace('</head>', bootstrap + '</head>').replace('</body>', banner + '</body>');
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    const file = path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); return res.end(); }
    const types = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (error) { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.listen(0, '127.0.0.1', () => console.log(`Merchant QA fixture: http://127.0.0.1:${server.address().port}/merchant`));
