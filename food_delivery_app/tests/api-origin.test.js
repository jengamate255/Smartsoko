import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(hostname) {
  const calls = [];
  const location = new URL('https://' + hostname + '/checkout');
  const window = { fetch: (...args) => { calls.push(args); return Promise.resolve({ ok: true }); } };
  vm.runInNewContext(fs.readFileSync(new URL('../public/config/api-origin.js', import.meta.url), 'utf8'), { window, location, URL, Request });
  return { window, calls };
}

describe('Firebase customer API routing', () => {
  it('routes authenticated API requests to the existing API project without losing request options', async () => {
    const { window, calls } = setup('smartsoko.tz');
    const options = { method: 'POST', headers: { Authorization: 'Bearer test', 'Idempotency-Key': 'test' }, body: '{}' };
    await window.fetch('/api/orders/quote?check=1', options);
    expect(calls[0]).toEqual(['https://fooddeliveryapp-indol.vercel.app/api/orders/quote?check=1', options]);
    await window.fetch(new Request('https://smartsoko.tz/api/orders', { headers: { Authorization: 'Bearer test' } }));
    expect(calls[1][0].url).toBe('https://fooddeliveryapp-indol.vercel.app/api/orders');
    expect(calls[1][0].headers.get('Authorization')).toBe('Bearer test');
  });
  it('keeps local development and external requests unchanged', async () => {
    const local = setup('localhost');
    await local.window.fetch('/api/products');
    expect(local.calls[0][0]).toBe('/api/products');
    const hosted = setup('smartsoko.tz');
    await hosted.window.fetch('https://database.example/api/products');
    expect(hosted.calls[0][0]).toBe('https://database.example/api/products');
  });
});
