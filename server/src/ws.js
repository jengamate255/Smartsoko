const { orders, wsClients } = require('./store');

function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }
    ws.driverId = null;
    wsClients.set(ws, ws);

    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to SmartSoko Driver' }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        console.log('[WS]', msg.type, msg.driverId || '');
        switch (msg.type) {
          case 'go_online':
            ws.driverId = msg.driverId || null;
            ws.send(JSON.stringify({ type: 'online_status', online: true }));
            break;
          case 'go_offline':
            ws.driverId = null;
            ws.send(JSON.stringify({ type: 'online_status', online: false }));
            break;
          case 'driver_location':
            ws.send(JSON.stringify({ type: 'location_ack', timestamp: msg.timestamp || Date.now() }));
            break;
          case 'accept_order':
            ws.send(JSON.stringify({ type: 'order_accepted', order_id: msg.order_id }));
            break;
          case 'update_status':
            ws.send(JSON.stringify({ type: 'order_status_changed', order_id: msg.order_id, status: msg.status }));
            break;
          default:
            break;
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });
  });
}

module.exports = { setupWebSocket };
