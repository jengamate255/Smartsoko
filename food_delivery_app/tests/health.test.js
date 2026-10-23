import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';

// Load the CommonJS routes with isolated service clients; no hosted data is used.
function setup({ firestore = null, stalled = false, databaseError = null } = {}) {
  const signals = [];
  const query = {
    select: vi.fn(() => query),
    limit: vi.fn(() => query),
    abortSignal: vi.fn(signal => {
      signals.push(signal);
      return stalled ? new Promise(() => {}) : Promise.resolve({ error: databaseError });
    }),
  };
  const resume = vi.fn();
  const db = {
    _getFirestore: () => firestore,
    _isFallbackActive: () => true,
    set: vi.fn(), get: vi.fn(), delete: vi.fn(),
  };
  const context = {
    module: { exports: {} },
    AbortController, setTimeout, clearTimeout,
    require(name) {
      if (name === '../config') return {
        services: {
          supabase: { url: 'https://database.test', serviceKey: 'test' },
          pesapal: { baseUrl: 'https://payments.test' },
        },
        features: { mapbox: false, pesapal: false, sentry: false },
      };
      if (name === '@supabase/supabase-js') return {
        createClient: () => ({ from: () => query }),
      };
      if (name === '../services/mapbox-status') return {publicToken:()=>'',check:(signal)=>{signals.push(signal);return stalled ? new Promise(()=>{}) : Promise.resolve('connected');}};
      if (name === 'https') return {
        get(url, { signal }, callback) {
          signals.push(signal);
          if (!stalled) callback({ statusCode: 200, resume });
          return new EventEmitter();
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../server/src/routes/health.js', import.meta.url), 'utf8'), context);
  const routes = {};
  context.module.exports.healthRoutes({ get: (path, handler) => { routes[path] = handler; } });
  const req = { app: { get: () => db } };
  const res = { json: vi.fn(), status: vi.fn(() => res) };
  return { routes, req, res, db, query, signals, resume };
}

afterEach(() => vi.useRealTimers());

describe('health routes', () => {
  it('reports Supabase-only mode accurately without database writes', async () => {
    const { routes, req, res, db, resume } = setup();
    await routes['/health'](req, res);
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      services: { firestore: 'unconfigured', supabase: 'connected' }, overall: 'healthy',
    });
    expect(db.set).not.toHaveBeenCalled();
    expect(db.get).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(resume).toHaveBeenCalledTimes(1);
    await routes['/api/config'](req, res);
    expect(res.json.mock.calls[1][0].firebase).toBe(false);
  });

  it('checks real Firestore directly even when the adapter uses fallback', async () => {
    const get = vi.fn().mockRejectedValue(new Error('Firestore unavailable'));
    const firestore = { collection: () => ({ limit: () => ({ get }) }) };
    const { routes, req, res, db } = setup({ firestore });
    await routes['/health'](req, res);
    expect(get).toHaveBeenCalledOnce();
    expect(res.json.mock.calls[0][0].data.services.firestore).toBe('error');
    expect(db.get).not.toHaveBeenCalled();
    await routes['/api/config'](req, res);
    expect(res.json.mock.calls[1][0].firebase).toBe(true);
  });

  it('bounds stalled database and HTTPS checks to four seconds and aborts requests', async () => {
    vi.useFakeTimers();
    const firestore = { collection: () => ({ limit: () => ({ get: () => new Promise(() => {}) }) }) };
    const { routes, req, res, signals } = setup({ firestore, stalled: true });
    const pending = routes['/api/v1/health'](req, res);
    await vi.advanceTimersByTimeAsync(3999);
    expect(res.json).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      services: { firestore: 'timeout', supabase: 'timeout', pesapal: 'timeout', mapbox: 'timeout' },
      overall: 'degraded',
    });
    expect(signals).toHaveLength(3);
    expect(signals.every(signal => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('marks database errors as degraded and clears completed check timers', async () => {
    vi.useFakeTimers();
    const { routes, req, res } = setup({ databaseError: { message: 'Unavailable' } });
    await routes['/api/system/health'](req, res);
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      services: { supabase: 'error' }, overall: 'degraded',
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
