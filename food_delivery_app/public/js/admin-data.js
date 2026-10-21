/*
 * AdminData — one small store behind every admin tab.
 *
 * Two problems this solves, both measured live on the dashboard:
 *   1. getAuthToken() forced a full token refresh (~4.2s) on every single
 *      request, because api-config.js calls it inside buildHeaders(). Tab
 *      switches paid that cost each time. installAuthCache() memoises it so
 *      the 37 existing loaders get the speed-up without being rewritten.
 *   2. A failed fetch looked exactly like an empty dataset. Snapshots keep the
 *      last good rows and expose a `stale` reason so a tab can show the data it
 *      already has instead of an "no records" message.
 */
(function (global) {
  'use strict';

  var TOKEN_TTL_MS = 4 * 60 * 1000;   // well inside Firebase's 1h lifetime
  var DEFAULT_TTL_MS = 30 * 1000;     // a tab opened again within 30s paints instantly

  var store = Object.create(null);     // key -> snapshot
  var listeners = Object.create(null); // key -> [fn]
  var pending = Object.create(null);   // key -> Promise

  var auth = { value: null, expiresAt: 0, inflight: null, forced: false };

  function log(level, msg, data) {
    var L = global.LOG;
    if (L && typeof L[level] === 'function') L[level]('admin-data', msg, data || null);
  }

  /* ── Auth token cache ───────────────────────────────────────────────────
     buildHeaders() resolves the global getAuthToken() binding, so replacing it
     here makes every apiHelpers call cheap. Falls back to the real function
     whenever the cache is cold or the SDK is not ready.                      */
  function tokenFromSdk(forceRefresh) {
    var user = global.auth && global.auth.currentUser;
    if (!user) {
      if (typeof global.firebase !== 'undefined' && global.firebase.auth) {
        user = global.firebase.auth().currentUser;
      }
    }
    if (!user || typeof user.getIdToken !== 'function') return Promise.resolve(null);
    return Promise.resolve(user.getIdToken(!!forceRefresh));
  }

  function cachedAuthToken() {
    var now = Date.now();
    if (auth.value && now < auth.expiresAt && !auth.forced) return Promise.resolve(auth.value);
    if (auth.inflight) return auth.inflight;

    var force = auth.forced;
    auth.inflight = tokenFromSdk(force).then(function (t) {
      auth.inflight = null;
      auth.forced = false;
      if (!t) return null;                 // unauthenticated: never cached
      auth.value = t;
      auth.expiresAt = Date.now() + TOKEN_TTL_MS;
      return t;
    }).catch(function (err) {
      auth.inflight = null;
      auth.forced = false;
      log('warn', 'Token cache miss', { message: err && err.message });
      return null;
    });
    return auth.inflight;
  }

  function installAuthCache() {
    if (global.__akAuthCached) return;
    global.__akAuthCached = true;
    global.getAuthToken = cachedAuthToken;
  }

  /* Call on a 401: the next request does a forced refresh instead of reusing
     the token the server just rejected. */
  function invalidateAuth() {
    auth.value = null;
    auth.expiresAt = 0;
    auth.forced = true;
  }

  /* Prime the cache at page load so the first tab click never waits on auth. */
  function warmAuth() {
    installAuthCache();
    return cachedAuthToken();
  }

  /* ── Shape normalisation ────────────────────────────────────────────────
     The admin endpoints answer {success,data:[]} and {data:{orders:[]}} in
     roughly equal measure. */
  function pickArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return null;
    var known = ['data', 'rows', 'items', 'results', 'records', 'list'];
    for (var i = 0; i < known.length; i++) {
      if (Array.isArray(value[known[i]])) return value[known[i]];
    }
    for (var key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key) && Array.isArray(value[key])) return value[key];
    }
    return null;
  }

  function at(obj, dotted) {
    if (!dotted) return obj;
    return dotted.split('.').reduce(function (v, part) { return v == null ? v : v[part]; }, obj);
  }

  /* Never throw on an unexpected payload — an odd shape must surface as an
     empty list, and "empty" is distinguishable from "failed" by the caller. */
  function rowsOf(response, path) {
    try {
      var found = pickArray(path ? at(response, path) : response);
      if (found) return found;
      var single = path ? at(response, path) : response;
      return single && typeof single === 'object' ? [single] : [];
    } catch (err) {
      log('warn', 'Could not read rows from response', { message: err && err.message });
      return [];
    }
  }

  function errorText(err, fallback) {
    var msg = err && (err.message || err.error || err.statusText);
    return msg || fallback || 'Request failed';
  }

  /* ── Store ────────────────────────────────────────────────────────────────
     define(key, { fetch, ttl, transform })   declare once per tab
     load(key)      snapshot instantly if cached, revalidate in background
     reload(key)    always fetch, keep old rows visible while it runs
     peek(key)      current snapshot, no network
     subscribe(key, fn)  re-render hook
  */
  function define(key, cfg) {
    var entry = store[key];
    if (!entry) {
      entry = store[key] = { key: key, rows: null, ts: 0, status: 'idle', error: null, stale: false };
    }
    entry.fetch = cfg.fetch;
    entry.transform = cfg.transform;
    entry.ttl = cfg.ttl === undefined ? DEFAULT_TTL_MS : cfg.ttl;
    entry.path = cfg.path;
    return entry;
  }

  function listenersFor(key) { return listeners[key] || (listeners[key] = []); }

  function notify(key) {
    var snapshot = store[key];
    listenersFor(key).forEach(function (fn) {
      try { fn(snapshot); } catch (err) { log('error', 'Listener crashed', { key: key, message: err && err.message }); }
    });
  }

  function isFresh(entry) {
    return entry.status === 'ready' && (Date.now() - entry.ts) < entry.ttl;
  }

  function execute(key) {
    if (pending[key]) return pending[key];
    var entry = store[key];
    if (!entry || typeof entry.fetch !== 'function') {
      return Promise.reject(new Error('No loader registered for ' + key));
    }
    pending[key] = Promise.resolve()
      .then(function () { return entry.fetch(); })
      .then(function (response) {
        var rows = entry.transform ? entry.transform(response) : rowsOf(response, entry.path);
        entry.rows = rows;
        entry.ts = Date.now();
        entry.status = 'ready';
        entry.error = null;
        entry.stale = false;
        return entry;
      })
      .catch(function (err) {
        // Keep whatever rows we already have; the UI shows them as stale.
        entry.status = 'error';
        entry.error = errorText(err);
        entry.stale = !!entry.rows;
        throw err;
      })
      .finally(function () { delete pending[key]; notify(key); });
    return pending[key];
  }

  function load(key) {
    var entry = store[key];
    if (!entry) return Promise.reject(new Error('Unknown dataset: ' + key));
    if (isFresh(entry)) return Promise.resolve(entry);
    if (entry.rows !== null) {
      // Stale-while-revalidate: hand back cached rows now, refresh behind it.
      execute(key).catch(function () { });
      return Promise.resolve(entry);
    }
    entry.status = 'loading';
    return execute(key).catch(function () { return entry; });
  }

  function reload(key) {
    var entry = store[key];
    if (!entry) return Promise.reject(new Error('Unknown dataset: ' + key));
    entry.ts = 0;
    var inFlight = execute(key);
    return inFlight.catch(function () { return entry; });
  }

  function subscribe(key, fn) {
    var list = listenersFor(key);
    list.push(fn);
    return function () {
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  /* Drop cached rows (used after a write, so the next read is honest). */
  function invalidate(key) {
    var entry = store[key];
    if (!entry) return;
    entry.ts = 0;
    entry.status = entry.rows ? 'ready' : 'idle';
  }

  /* One round of writes: every declared dataset the caller cares about, in
     parallel, each failure isolated so one dead endpoint cannot blank the tab. */
  function loadAll(keys) {
    return Promise.all(keys.map(function (key) {
      return load(key).catch(function (err) {
        log('warn', 'Dataset failed', { key: key, message: errorText(err) });
        return store[key];
      });
    }));
  }

  function stamp(ts) {
    if (!ts) return 'never loaded';
    var d = new Date(ts);
    var now = new Date();
    var time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'updated ' + time;
    var yesterday = new Date(now.getTime() - 864e5);
    if (d.toDateString() === yesterday.toDateString()) return 'updated yesterday ' + time;
    return 'updated ' + d.toLocaleDateString() + ' ' + time;
  }

  global.AdminData = {
    installAuthCache: installAuthCache, warmAuth: warmAuth, invalidateAuth: invalidateAuth,
    token: cachedAuthToken,
    define: define, load: load, reload: reload, peek: function (key) { return store[key]; },
    subscribe: subscribe, invalidate: invalidate, loadAll: loadAll,
    rowsOf: rowsOf, errorText: errorText, stamp: stamp,
    /* Authenticated request that already handles the token-rejection case the
       old loaders ignored: a cached token the server no longer accepts is
       dropped and the call is replayed once. */
    once: function (method, path, body, opts) {
      var options = opts || {};
      var call = function () {
        // apiHelpers.delete takes (endpoint, options) — passing a body positionally
        // would land it in the options slot and break header building.
        if (method === 'get') return global.apiHelpers.get(path, options);
        if (method === 'delete') return global.apiHelpers.delete(path, options);
        return global.apiHelpers[method](path, body, options);
      };
      return call().catch(function (err) {
        if (err && /401|Authentication required|session expired/i.test(String(err.message))) {
          invalidateAuth();
          return call();
        }
        throw err;
      });
    },
    get: function (path, opts) { return global.AdminData.once('get', path, null, opts); },
    post: function (path, body, opts) { return global.AdminData.once('post', path, body, opts); },
    put: function (path, body, opts) { return global.AdminData.once('put', path, body, opts); },
    delete: function (path, opts) { return global.AdminData.once('delete', path, null, opts); }
  };
})(window);
