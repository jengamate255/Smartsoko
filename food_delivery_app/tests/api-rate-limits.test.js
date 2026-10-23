const express = require('express');
const { once } = require('node:events');
const { mountRateLimiters } = require('../server/src/middleware/rate-limiter');

describe('API alias rate limits', () => {
  let server;
  afterEach(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      server = null;
    }
  });

  it('shares auth and general budgets between versioned and unversioned aliases', async () => {
    const app = express();
    mountRateLimiters(app);
    app.use((req, res) => res.json({ success: true }));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async path => {
      const response = await fetch(base + path);
      await response.text();
      return response.status;
    };
    for (let i = 0; i < 5; i++) {
      expect(await request(i % 2 ? '/api/auth/login' : '/api/v1/auth/login')).toBe(200);
    }
    expect(await request('/api/auth/login')).toBe(429);
    expect(await request('/api/v1/auth/login')).toBe(429);
    // Auth's five successful requests also consumed the general budget.
    for (let i = 0; i < 195; i++) {
      expect(await request(i % 2 ? '/api/orders' : '/api/v1/orders')).toBe(200);
    }
    expect(await request('/api/orders')).toBe(429);
    expect(await request('/api/v1/orders')).toBe(429);
  });
});
