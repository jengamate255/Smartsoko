/**
 * Cross-Platform Data Service
 * Makes Firebase and Supabase work together — if one service is down,
 * the other seamlessly takes over. All operations try the active service
 * first and fall back to the secondary on failure.
 *
 * Usage:
 *   <script type="module" src="config/cross-platform-service.js"></script>
 *   // Then: window.DataService.get('products', id)
 *   //       window.DataService.list('products', { limit: 12 })
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import * as fb from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE",
  authDomain: "fooddelievry-dce15.firebaseapp.com",
  projectId: "fooddelievry-dce15",
  storageBucket: "fooddelievry-dce15.firebasestorage.app",
  messagingSenderId: "727819507148",
  appId: "1:727819507148:web:372bee2608d5c7a9587969",
  measurementId: "G-GZRXRGX60T"
};

const SUPABASE_URL = 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8';

const COLLECTION_MAP = {
  menuItems: 'products',
  products: 'products',
  sellers: 'restaurants',
  restaurants: 'restaurants',
  users: 'profiles',
  profiles: 'profiles',
  orders: 'orders',
  drivers: 'drivers',
  customers: 'profiles',
  reviews: 'reviews',
  promotions: 'promotions',
  inventory: 'inventory',
  wishes: 'wishlists',
  messages: 'messages',
  chats: 'chats',
  notifications: 'notifications',
  appConfig: 'app_config',
  categories: 'categories'
};

const HEALTH_CHECK_INTERVAL = 30000;
const FAILURE_THRESHOLD = 2;
const RECOVERY_INTERVAL = 60000;

// Circuit breaker: Supabase schema/endpoint errors (4xx/5xx) are persistent,
// so back off for 5 minutes instead of hammering on every request.
const SUPABASE_BREAKER_MS = 5 * 60 * 1000;
let _supabaseBreakerUntil = 0;

// Collections not mirrored in Supabase (known 400/404 noise) - skip supabase entirely.
const SUPABASE_UNMIRRORED_PATHS = /^(orders|chats)(\/|$)/;

function _supabaseBreakerOpen() {
  return Date.now() < _supabaseBreakerUntil;
}

function _tripSupabaseBreaker() {
  if (_supabaseBreakerUntil === 0) {
    console.warn('[CrossPlatform] Supabase schema/endpoint errors detected - pausing Supabase fallback for 5 minutes');
  }
  _supabaseBreakerUntil = Date.now() + SUPABASE_BREAKER_MS;
}

class CrossPlatformService {
  constructor() {
    this.firebase = { ready: false, app: null, db: null, auth: null, storage: null, healthy: true, failures: 0 };
    this.supabase = { ready: false, client: null, healthy: true, failures: 0 };
    this.activeService = 'firebase';
    this.initialized = false;
    this._healthTimer = null;
    this._subscribers = {};
    this._initPromise = null;
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    console.log('[CrossPlatform] Initializing Firebase + Supabase...');

    await Promise.allSettled([
      this._initFirebase(),
      this._initSupabase()
    ]);

    this.activeService = this.firebase.ready ? 'firebase' : (this.supabase.ready ? 'supabase' : null);
    this.initialized = true;

    window.crossPlatformService = this;

    if (this.activeService) {
      console.log(`[CrossPlatform] Active service: ${this.activeService}`);
      if (this.firebase.ready) {
        window.db = this.firebase.db;
        window.auth = this.firebase.auth;
        window.app = this.firebase.app;
        window.storage = this.firebase.storage;
      } else {
        window.db = this._createDbProxy();
        window.auth = this._createAuthProxy();
      }
      document.dispatchEvent(new CustomEvent('data-service-ready', {
        detail: { service: this.activeService, instance: this }
      }));
    } else {
      console.warn('[CrossPlatform] No service available');
      window.db = {}; // truthy stub so !db checks pass
      document.dispatchEvent(new CustomEvent('data-service-error', {
        detail: { error: 'No service available' }
      }));
    }

    this._startHealthChecks();
    return this.activeService;
  }

  async _initFirebase() {
    try {
      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      const db = fb.getFirestore(app);
      const auth = getAuth(app);
      const storage = getStorage(app);

      this.firebase.app = app;
      this.firebase.db = db;
      this.firebase.auth = auth;
      this.firebase.storage = storage;

      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (new URLSearchParams(window.location.search).get('emulator') === 'true') {
          try { connectAuthEmulator(auth, 'http://localhost:9099'); } catch (e) { /* ok */ }
          try { fb.connectFirestoreEmulator(db, 'localhost', 8080); } catch (e) { /* ok */ }
        }
      }

      this.firebase.ready = true;
      console.log('[CrossPlatform] Firebase initialized');
    } catch (e) {
      console.warn('[CrossPlatform] Firebase init failed:', e.message);
    }
  }

  async _initSupabase() {
    if (typeof window.supabase === 'undefined') {
      console.log('[CrossPlatform] Supabase JS SDK not loaded, will use REST fallback');
      this.supabase._restOnly = true;
    }

    try {
      if (window.supabase && window.supabase.createClient) {
        this.supabase.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true }
        });
        const { error } = await this.supabase.client.from('products').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        this.supabase.ready = true;
        console.log('[CrossPlatform] Supabase SDK connected');
      } else {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/products?limit=1&select=id`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        if (resp.ok || resp.status === 206) {
          this.supabase._restOnly = true;
          this.supabase.ready = true;
          console.log('[CrossPlatform] Supabase REST API connected');
        }
      }
    } catch (e) {
      console.warn('[CrossPlatform] Supabase init failed:', e.message);
    }
  }

  _mapCollection(name) {
    return COLLECTION_MAP[name] || name;
  }

  _normalizeDoc(id, data, source) {
    return { id, ...data, _source: source };
  }

  async _callWithFallback(fnName, args) {
    if (!this.initialized) await this.init();

    const services = this.activeService === 'firebase'
      ? ['firebase', 'supabase']
      : ['supabase', 'firebase'];

    const pathArg = args && args.length >= 1 ? String(args[0]) : '';
    const supabaseMirrored = !SUPABASE_UNMIRRORED_PATHS.test(pathArg);

    let lastError = null;
    for (const svc of services) {
      if (!this[svc].ready || !this[svc].healthy) continue;
      if (svc === 'supabase' && !supabaseMirrored) continue;
      if (svc === 'supabase' && _supabaseBreakerOpen()) continue;
      try {
        const result = await this[`_${fnName}`](svc, ...args);
        this[svc].failures = 0;
        if (svc !== this.activeService) {
          console.log(`[CrossPlatform] Failover: ${svc} responding, switching active service`);
          this._setActiveService(svc);
        }
        return result;
      } catch (e) {
        this[svc].failures++;
        if (svc === 'supabase' && (/failed: [45]\d\d|PGRST\d+|PostgrestError|status (4|5)\d\d/i.test(String(e.message)))) {
          _tripSupabaseBreaker();
        }
        if (this[svc].failures >= FAILURE_THRESHOLD) {
          this[svc].healthy = false;
          console.warn(`[CrossPlatform] ${svc} marked unhealthy after ${this[svc].failures} failures`);
          this._emitServiceStatus(svc, false);
        }
        lastError = e;
      }
    }
    // Last resort: return stale cache for read operations
    if ((fnName === 'get' || fnName === 'list') && args.length >= 1) {
      const col = args[0];
      let cached = null;
      if (fnName === 'get') {
        cached = this._cacheGet(this._cacheKey(col, args[1]));
      } else {
        cached = this._cacheGet(this._cacheListKey(col, args[1]));
      }
      if (cached) {
        console.warn(`[CrossPlatform] Returning cached data for ${fnName}(${col}) — all services down`);
        return cached;
      }
    }
    throw lastError || new Error(`All services failed for ${fnName}`);
  }

  _setActiveService(svc) {
    this.activeService = svc;
    window._activeService = svc;
    document.dispatchEvent(new CustomEvent('data-service-failover', {
      detail: { service: svc }
    }));
  }

  _emitServiceStatus(svc, healthy) {
    document.dispatchEvent(new CustomEvent('data-service-status', {
      detail: { service: svc, healthy }
    }));
  }

  // ========================
  //  FIRESTORE PROXY
  //  When Firebase is down, window.db is a proxy that routes to
  //  the cross-platform service's Supabase backend. This allows
  //  existing code using `collection(db, 'x')` pattern to work.
  // ========================
  _createDbProxy() {
    const self = this;
    const store = { _name: 'CrossPlatformDb' };
    return new Proxy(store, {
      get(target, prop) {
        if (prop === 'collection') return (name) => ({
          _type: 'collection', _name: name, _db: target,
          get: (id) => ({ _type: 'doc', _collection: name, _id: id, _db: target })
        });
        if (prop === 'doc') return (path) => {
          const parts = path.split('/');
          return { _type: 'doc', _collection: parts[0], _id: parts.slice(1).join('/'), _db: target };
        };
        if (prop === '_name') return target[prop];
        if (prop === 'toJSON') return () => '[CrossPlatform Db]';
        return target[prop];
      }
    });
  }

  _createAuthProxy() {
    return {
      _isProxy: true,
      currentUser: null,
      onAuthStateChanged: (cb) => {
        cb(null);
        return () => {};
      },
      signInWithEmailAndPassword: async (email, password) => {
        return this.signIn(email, password);
      },
      signOut: async () => this.signOut()
    };
  }

  // ========================
  //  CROSS-FIRESTORE API
  //  Drop-in replacement for Firestore SDK functions.
  //  Works with cross-platform service (Firebase + Supabase fallback)
  // ========================

  /** Create a collection reference */
  _collection(path) {
    return { _type: 'collection', _name: path.replace(/^\//, '') };
  }

  /** Create a document reference */
  _doc(pathOrRef, id) {
    if (id !== undefined) {
      return { _type: 'doc', _collection: pathOrRef._name || pathOrRef, _id: id };
    }
    if (typeof pathOrRef === 'string') {
      const parts = pathOrRef.split('/');
      return { _type: 'doc', _collection: parts[0], _id: parts.slice(1).join('/') };
    }
    return pathOrRef;
  }

  /** Build a query from constraints */
  _query(collectionRef, ...constraints) {
    const q = { _type: 'query', _collection: collectionRef._name || collectionRef, _constraints: [] };
    for (const c of constraints) {
      if (c && c._type) q._constraints.push(c);
      else if (typeof c === 'object') q._constraints.push(c);
    }
    return q;
  }

  _where(field, op, value) {
    return { _type: 'where', _field: field, _op: op, _value: value };
  }

  _orderBy(field, dir) {
    return { _type: 'orderBy', _field: field, _direction: dir && dir.direction ? dir.direction : (dir || 'asc') };
  }

  _limit(n) {
    return { _type: 'limit', _value: n };
  }

  /** Execute a query and return results */
  async _getDocs(queryRef) {
    const col = queryRef._collection || queryRef._name;
    const opts = {};
    if (queryRef._constraints) {
      for (const c of queryRef._constraints) {
        if (c._type === 'where') {
          if (!opts.where) opts.where = [];
          opts.where.push([c._field, c._op, c._value]);
        } else if (c._type === 'orderBy') {
          opts.orderBy = { field: c._field, direction: c._direction || 'asc' };
        } else if (c._type === 'limit') {
          opts.limit = c._value;
        }
      }
    }
    if (!opts.limit) opts.limit = 100;

    const items = await this._callWithFallback('list', [col, opts]);
    return {
      empty: items.length === 0,
      size: items.length,
      docs: items.map(item => ({
        id: item.id,
        data: () => {
          const { _source, id, ...rest } = item;
          return rest;
        },
        exists: true
      })),
      forEach: (cb) => items.forEach(item => cb({
        id: item.id,
        data: () => { const { _source, id, ...rest } = item; return rest; },
        exists: true
      }))
    };
  }

  /** Get a single document */
  async _getDoc(docRef) {
    const col = docRef._collection || docRef._name;
    const id = docRef._id;
    try {
      const item = await this._callWithFallback('get', [col, id]);
      if (!item) return { exists: () => false, id, data: () => null };
      return {
        exists: () => true,
        id: item.id,
        data: () => {
          const { _source, id, ...rest } = item;
          return rest;
        }
      };
    } catch {
      return { exists: () => false, id, data: () => null };
    }
  }

  /** Add a document */
  async _addDoc(collectionRef, data) {
    const col = collectionRef._name || collectionRef;
    const result = await this._callWithFallback('create', [col, data]);
    return { id: result.id };
  }

  /** Update a document */
  async _updateDoc(docRef, data) {
    const col = docRef._collection || docRef._name;
    const id = docRef._id;
    await this._callWithFallback('update', [col, id, data]);
  }

  /** Delete a document */
  async _deleteDoc(docRef) {
    const col = docRef._collection || docRef._name;
    const id = docRef._id;
    await this._callWithFallback('delete', [col, id]);
  }

  /** Subscribe to real-time changes */
  _onSnapshot(queryRef, callback) {
    const col = queryRef._collection || queryRef._name;
    return this.subscribe(col, (items) => {
      const snapshot = {
        empty: !items || items.length === 0,
        size: items ? items.length : 0,
        docs: items ? items.map(item => ({
          id: item.id,
          data: () => { const { _source, id, ...rest } = item; return rest; },
          exists: true
        })) : [],
        forEach: (cb) => items && items.forEach(item => cb({
          id: item.id,
          data: () => { const { _source, id, ...rest } = item; return rest; },
          exists: true
        }))
      };
      callback(snapshot);
    });
  }

  _startHealthChecks() {
    if (this._healthTimer) clearInterval(this._healthTimer);
    this._healthTimer = setInterval(() => this._healthCheck(), HEALTH_CHECK_INTERVAL);
  }

  async _healthCheck() {
    for (const svc of ['firebase', 'supabase']) {
      if (!this[svc].ready) continue;
      try {
        const healthy = await this[`_ping${svc.charAt(0).toUpperCase() + svc.slice(1)}`]();
        if (healthy && !this[svc].healthy) {
          this[svc].healthy = true;
          this[svc].failures = 0;
          console.log(`[CrossPlatform] ${svc} recovered`);
          this._emitServiceStatus(svc, true);
        } else if (!healthy && this[svc].healthy) {
          this[svc].failures++;
          if (this[svc].failures >= FAILURE_THRESHOLD) {
            this[svc].healthy = false;
            console.warn(`[CrossPlatform] ${svc} lost`);
            this._emitServiceStatus(svc, false);
          }
        }
      } catch (e) {
        // ignore health check errors
      }
    }
  }

  async _pingFirebase() {
    try {
      const testDoc = fb.doc(this.firebase.db, '_health', '_ping');
      await fb.getDoc(testDoc);
      return true;
    } catch {
      return false;
    }
  }

  async _pingSupabase() {
    try {
      if (this.supabase.client && !this.supabase._restOnly) {
        const { error } = await this.supabase.client.from('products').select('id').limit(1);
        return !error || error.code === 'PGRST116';
      }
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/products?limit=1&select=id`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return resp.ok || resp.status === 206;
    } catch {
      return false;
    }
  }

  // ========================
  //  FIRESTORE OPERATIONS
  // ========================
  // Dispatch to the correct backend based on the requested service name.
  // `_callWithFallback` invokes these with (svc, ...args).
  async _get(svc, collectionName, id) {
    return svc === 'firebase'
      ? this._get_firebase(collectionName, id)
      : this._get_supabase(collectionName, id);
  }

  async _list(svc, collectionName, opts = {}) {
    return svc === 'firebase'
      ? this._list_firebase(collectionName, opts)
      : this._list_supabase(collectionName, opts);
  }

  async _create(svc, collectionName, data) {
    return svc === 'firebase'
      ? this._create_firebase(collectionName, data)
      : this._create_supabase(collectionName, data);
  }

  async _update(svc, collectionName, id, data) {
    return svc === 'firebase'
      ? this._update_firebase(collectionName, id, data)
      : this._update_supabase(collectionName, id, data);
  }

  async _delete(svc, collectionName, id) {
    return svc === 'firebase'
      ? this._delete_firebase(collectionName, id)
      : this._delete_supabase(collectionName, id);
  }

  async _get_firebase(collectionName, id) {
    const docRef = fb.doc(this.firebase.db, collectionName, id);
    const snap = await fb.getDoc(docRef);
    if (!snap.exists()) return null;
    return this._normalizeDoc(snap.id, snap.data(), 'firebase');
  }

  async _list_firebase(collectionName, opts = {}) {
    const constraints = [];
    if (opts.where) {
      for (const [field, op, val] of opts.where) {
        constraints.push(fb.where(field, op, val));
      }
    }
    if (opts.orderBy) {
      constraints.push(fb.orderBy(opts.orderBy.field, opts.orderBy.direction || 'asc'));
    }
    if (opts.limit) constraints.push(fb.limit(opts.limit));
    const q = fb.query(fb.collection(this.firebase.db, collectionName), ...constraints);
    const snap = await fb.getDocs(q);
    return snap.docs.map(d => this._normalizeDoc(d.id, d.data(), 'firebase'));
  }

  async _create_firebase(collectionName, data) {
    const colRef = fb.collection(this.firebase.db, collectionName);
    const docRef = await fb.addDoc(colRef, data);
    return { id: docRef.id, ...data, _source: 'firebase' };
  }

  async _update_firebase(collectionName, id, data) {
    const docRef = fb.doc(this.firebase.db, collectionName, id);
    await fb.updateDoc(docRef, data);
    return { id, ...data, _source: 'firebase' };
  }

  async _delete_firebase(collectionName, id) {
    const docRef = fb.doc(this.firebase.db, collectionName, id);
    await fb.deleteDoc(docRef);
    return true;
  }

  _subscribe_firebase(collectionName, callback, opts = {}) {
    const constraints = [];
    if (opts.where) {
      for (const [field, op, val] of opts.where) {
        constraints.push(fb.where(field, op, val));
      }
    }
    if (opts.orderBy) {
      constraints.push(fb.orderBy(opts.orderBy.field, opts.orderBy.direction || 'asc'));
    }
    if (opts.limit) constraints.push(fb.limit(opts.limit));
    const q = fb.query(fb.collection(this.firebase.db, collectionName), ...constraints);
    const unsub = fb.onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => this._normalizeDoc(d.id, d.data(), 'firebase'));
      callback(items, 'firebase');
    }, (err) => {
      console.warn(`[CrossPlatform] Firebase onSnapshot error:`, err.message);
      callback(null, 'firebase', err);
    });
    return unsub;
  }

  // ========================
  //  SUPABASE OPERATIONS
  // ========================
  async _get_supabase(collectionName, id) {
    const table = this._mapCollection(collectionName);
    if (this.supabase.client && !this.supabase._restOnly) {
      const { data, error } = await this.supabase.client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return this._normalizeDoc(data.id || id, data, 'supabase');
    }
    if (_supabaseBreakerOpen()) throw new Error(`Supabase get failed: 400`);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok && resp.status !== 206) throw new Error(`Supabase get failed: ${resp.status}`);
    const rows = await resp.json();
    if (!rows || rows.length === 0) return null;
    return this._normalizeDoc(rows[0].id, rows[0], 'supabase');
  }

  async _list_supabase(collectionName, opts = {}) {
    const table = this._mapCollection(collectionName);
    if (this.supabase.client && !this.supabase._restOnly) {
      let query = this.supabase.client.from(table).select('*');
      if (opts.where) {
        for (const [field, op, val] of opts.where) {
          if (op === '==') query = query.eq(field, val);
          else if (op === '>') query = query.gt(field, val);
          else if (op === '<') query = query.lt(field, val);
          else if (op === '>=') query = query.gte(field, val);
          else if (op === '<=') query = query.lte(field, val);
        }
      }
      if (opts.orderBy) {
        query = query.order(opts.orderBy.field, { ascending: opts.orderBy.direction !== 'desc' });
      }
      if (opts.limit) query = query.limit(opts.limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(d => this._normalizeDoc(d.id, d, 'supabase'));
    }
    if (_supabaseBreakerOpen()) throw new Error(`Supabase list failed: 400`);
    const params = new URLSearchParams({ select: '*' });
    if (opts.limit) params.set('limit', opts.limit);
    if (opts.orderBy) params.set('order', `${opts.orderBy.field}.${opts.orderBy.direction === 'desc' ? 'desc' : 'asc'}`);
    if (opts.where) {
      for (const [field, op, val] of opts.where) {
        if (op === '==') params.set(field, `eq.${val}`);
        else if (op === '>') params.set(field, `gt.${val}`);
        else if (op === '<') params.set(field, `lt.${val}`);
        else if (op === '>=') params.set(field, `gte.${val}`);
        else if (op === '<=') params.set(field, `lte.${val}`);
      }
    }
    const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok && resp.status !== 206) throw new Error(`Supabase list failed: ${resp.status}`);
    const rows = await resp.json();
    return (rows || []).map(d => this._normalizeDoc(d.id, d, 'supabase'));
  }

  async _create_supabase(collectionName, data) {
    const table = this._mapCollection(collectionName);
    if (this.supabase.client && !this.supabase._restOnly) {
      const { data: result, error } = await this.supabase.client.from(table).insert([data]).select();
      if (error) throw error;
      const created = result?.[0] || data;
      return { id: created.id, ...created, _source: 'supabase' };
    }
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(`Supabase create failed: ${resp.status}`);
    const rows = await resp.json();
    const created = rows?.[0] || data;
    return { id: created.id, ...created, _source: 'supabase' };
  }

  async _update_supabase(collectionName, id, data) {
    const table = this._mapCollection(collectionName);
    if (this.supabase.client && !this.supabase._restOnly) {
      const { data: result, error } = await this.supabase.client.from(table).update(data).eq('id', id).select();
      if (error) throw error;
      return { id, ...(result?.[0] || data), _source: 'supabase' };
    }
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(`Supabase update failed: ${resp.status}`);
    const rows = await resp.json();
    return { id, ...(rows?.[0] || data), _source: 'supabase' };
  }

  async _delete_supabase(collectionName, id) {
    const table = this._mapCollection(collectionName);
    if (this.supabase.client && !this.supabase._restOnly) {
      const { error } = await this.supabase.client.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!resp.ok && resp.status !== 204) throw new Error(`Supabase delete failed: ${resp.status}`);
    return true;
  }

  _subscribe_supabase(collectionName, callback, opts = {}) {
    if (!this.supabase.client || this.supabase._restOnly) {
      const interval = setInterval(async () => {
        try {
          const items = await this._list_supabase(collectionName, opts);
          callback(items, 'supabase');
        } catch (e) {
          callback(null, 'supabase', e);
        }
      }, 5000);
      return { unsubscribe: () => clearInterval(interval) };
    }
    const table = this._mapCollection(collectionName);
    const channel = this.supabase.client.channel(`${table}-changes`);
    let filter = channel.on('postgres_changes',
      { event: '*', schema: 'public', table },
      async (payload) => {
        const items = await this._list_supabase(collectionName, opts);
        callback(items, 'supabase');
      }
    );
    filter.subscribe();
    return { unsubscribe: () => channel.unsubscribe() };
  }

  // ========================
  //  CACHE LAYER
  // ========================
  _cacheKey(collection, id) {
    return `smartsoko_cache_${collection}_${id || ''}`;
  }

  _cacheListKey(collection, opts) {
    const hash = opts ? JSON.stringify(opts) : '';
    return `smartsoko_cache_${collection}_list_${hash.substring(0, 64)}`;
  }

  _cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (item._expiry && Date.now() > item._expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return item.data;
    } catch { return null; }
  }

  _cacheSet(key, data, ttlMs = 300000) {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        _expiry: Date.now() + ttlMs,
        _cached: new Date().toISOString()
      }));
    } catch { /* storage full — silently ignore */ }
  }

  _cacheRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ok */ }
  }

  _cacheClearCollection(collection) {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`smartsoko_cache_${collection}_`)) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ok */ }
  }

  // ========================
  //  PUBLIC API
  // ========================
  async get(collectionName, id, opts = {}) {
    if (!opts.refresh) {
      const cached = this._cacheGet(this._cacheKey(collectionName, id));
      if (cached) return cached;
    }
    const result = await this._callWithFallback('get', [collectionName, id]);
    if (result) this._cacheSet(this._cacheKey(collectionName, id), result);
    return result;
  }

  async list(collectionName, opts = {}) {
    const { refresh, ...queryOpts } = opts;
    if (!refresh) {
      const cached = this._cacheGet(this._cacheListKey(collectionName, queryOpts));
      if (cached) return cached;
    }
    const result = await this._callWithFallback('list', [collectionName, queryOpts]);
    this._cacheSet(this._cacheListKey(collectionName, queryOpts), result);
    return result;
  }

  async getSellerByOwner(ownerId) {
    if (!ownerId) return null;
    try {
      // Try Firebase first
      if (this.firebase.ready && this.firebase.healthy && window.db) {
        const { query, where, getDocs, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const q = query(collection(window.db, 'sellers'), where('ownerId', '==', ownerId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
      // Fallback to Supabase
      if (this.supabase.ready && this.supabase.healthy && this.supabase.client) {
        const { data, error } = await this.supabase.client
          .from('sellers')
          .select('*')
          .eq('owner_id', ownerId)
          .single();
        if (!error && data) return data;
      }
    } catch (e) {
      console.warn('getSellerByOwner error:', e.message);
    }
    return null;
  }

  async create(collectionName, data) {
    // Try to write to ALL healthy services for consistency
    const errors = [];
    let result = null;

    if (this.firebase.ready && this.firebase.healthy) {
      try {
        result = await this._create_firebase(collectionName, data);
      } catch (e) { errors.push(`firebase: ${e.message}`); }
    }
    if (this.supabase.ready && this.supabase.healthy) {
      try {
        const sbResult = await this._create_supabase(collectionName, data);
        if (!result) result = sbResult;
      } catch (e) { errors.push(`supabase: ${e.message}`); }
    }

    if (result) {
      this._cacheClearCollection(collectionName);
      return result;
    }

    // Neither service worked — try single fallback
    if (errors.length === 2) {
      return this._callWithFallback('create', [collectionName, data]);
    }

    throw new Error(errors.join('; ') || 'No service available');
  }

  async update(collectionName, id, data) {
    const errors = [];
    let result = null;

    if (this.firebase.ready && this.firebase.healthy) {
      try {
        result = await this._update_firebase(collectionName, id, data);
      } catch (e) { errors.push(`firebase: ${e.message}`); }
    }
    if (this.supabase.ready && this.supabase.healthy) {
      try {
        const sbResult = await this._update_supabase(collectionName, id, data);
        if (!result) result = sbResult;
      } catch (e) { errors.push(`supabase: ${e.message}`); }
    }

    if (result) {
      this._cacheRemove(this._cacheKey(collectionName, id));
      this._cacheClearCollection(collectionName);
      return result;
    }

    if (errors.length === 2) {
      return this._callWithFallback('update', [collectionName, id, data]);
    }

    throw new Error(errors.join('; ') || 'No service available');
  }

  async delete(collectionName, id) {
    const errors = [];

    if (this.firebase.ready && this.firebase.healthy) {
      try { await this._delete_firebase(collectionName, id); } catch (e) { errors.push(`firebase: ${e.message}`); }
    }
    if (this.supabase.ready && this.supabase.healthy) {
      try { await this._delete_supabase(collectionName, id); } catch (e) { errors.push(`supabase: ${e.message}`); }
    }

    if (errors.length < 2) {
      this._cacheRemove(this._cacheKey(collectionName, id));
      this._cacheClearCollection(collectionName);
      return true;
    }

    await this._callWithFallback('delete', [collectionName, id]);
    this._cacheRemove(this._cacheKey(collectionName, id));
    this._cacheClearCollection(collectionName);
    return true;
  }

  subscribe(collectionName, callback, opts = {}) {
    const key = `${collectionName}_${Date.now()}`;
    const svc = this.activeService === 'firebase' ? 'firebase' : 'supabase';
    const unsub = this[`_subscribe_${svc}`](collectionName, callback, opts);
    this._subscribers[key] = unsub;
    return {
      unsubscribe: () => {
        if (this._subscribers[key]) {
          this._subscribers[key].unsubscribe();
          delete this._subscribers[key];
        }
      }
    };
  }

  getDb() {
    return this.firebase.db;
  }

  getAuth() {
    return this.firebase.auth;
  }

  getActiveService() {
    return this.activeService;
  }

  isReady() {
    return this.initialized && !!this.activeService;
  }

  async signIn(email, password) {
    const auth = this.getAuth();
    if (auth) {
      try {
        return await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        console.warn('[CrossPlatform] Firebase sign-in failed, trying Supabase:', e.message);
      }
    }
    if (this.supabase.client) {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    }
    throw new Error('No auth service available');
  }

  async signOut() {
    const auth = this.getAuth();
    if (auth) await signOut(auth);
    if (this.supabase.client) await this.supabase.client.auth.signOut();
  }

  onAuthChanged(callback) {
    const auth = this.getAuth();
    if (auth) {
      return onAuthStateChanged(auth, callback);
    }
    return () => {};
  }

  disconnectSubscriptions() {
    Object.values(this._subscribers).forEach(s => s.unsubscribe?.());
    this._subscribers = {};
  }

  /** Show a debug badge in the corner indicating which service is active */
  showStatusBadge() {
    const existing = document.getElementById('__svc_status');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = '__svc_status';
    badge.style.cssText = 'position:fixed;bottom:80px;right:12px;z-index:9999;font-size:11px;padding:4px 10px;border-radius:8px;font-family:monospace;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none;';

    const updateBadge = () => {
      const active = this.activeService;
      const fbOk = this.firebase.healthy;
      const sbOk = this.supabase.healthy;

      badge.innerHTML = `
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${active ? '#22c55e' : '#ef4444'}"></span>
        <span style="font-weight:600;">${active || 'none'}</span>
        <span style="color:#888;">|</span>
        <span style="color:${fbOk ? '#22c55e' : '#ef4444'}">FB${fbOk ? '✓' : '✗'}</span>
        <span style="color:${sbOk ? '#22c55e' : '#ef4444'}">SB${sbOk ? '✓' : '✗'}</span>
      `;
      badge.style.background = active ? (active === 'firebase' ? '#e8f5e9' : '#e3f2fd') : '#fce4ec';
      badge.style.color = active ? '#1e293b' : '#dc2626';
    };

    updateBadge();
    document.body.appendChild(badge);

    document.addEventListener('data-service-status', updateBadge);
    document.addEventListener('data-service-failover', updateBadge);
    return badge;
  }
}

const service = new CrossPlatformService();

window.showServiceStatus = () => service.showStatusBadge();

// Expose crossFirestore API — drop-in replacement for Firebase Firestore SDK
// Usage: collection(db, 'name') → service._collection('name')
//         getDocs(q) → service._getDocs(q)
window.crossFirestore = {
  collection: (...args) => service._collection(...args),
  doc: (...args) => service._doc(...args),
  query: (...args) => service._query(...args),
  where: (...args) => service._where(...args),
  orderBy: (...args) => service._orderBy(...args),
  limit: (...args) => service._limit(...args),
  getDocs: (...args) => service._getDocs(...args),
  getDoc: (...args) => service._getDoc(...args),
  addDoc: (...args) => service._addDoc(...args),
  updateDoc: (...args) => service._updateDoc(...args),
  deleteDoc: (...args) => service._deleteDoc(...args),
  onSnapshot: (...args) => service._onSnapshot(...args),
};

// Re-exported via window.crossFirestore above — named exports here
// conflict with firebase-config.js imports. Use window.crossFirestore instead.

service.init().then(activeService => {
  console.log(`[CrossPlatform] Service ready with ${activeService}`);
  window._activeService = activeService;
}).catch(e => {
  console.warn('[CrossPlatform] Service init error:', e.message);
});

export default service;
export { CrossPlatformService, COLLECTION_MAP };
