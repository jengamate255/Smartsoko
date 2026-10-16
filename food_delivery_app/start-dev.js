// SmartSoko Server Launcher - Mocks problematic modules for local development
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(path) {
  if (path === '@sentry/node') {
    return {
      init: () => {},
      setupExpressErrorHandler: () => (req, res, next) => next(),
      expressIntegration: () => ({}),
      nodeContextIntegration: () => ({}),
      localVariablesIntegration: () => ({}),
      linkedErrorsIntegration: () => ({}),
      captureException: () => {},
      captureMessage: () => {},
      setUser: () => {},
      setTag: () => {},
      setContext: () => {},
      addBreadcrumb: () => {},
      startTransaction: () => ({ finish: () => {} }),
      NodeSDK: class {},
    };
  }
  if (path === 'firebase-admin') {
    return {
      initializeApp: () => {},
      credential: { cert: () => ({}), applicationDefault: () => ({}) },
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: () => Promise.resolve({ exists: false, data: () => null, id: '' }),
            set: () => Promise.resolve(),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            onSnapshot: () => () => {},
          }),
          add: () => Promise.resolve({ id: '' }),
          where: () => ({
            orderBy: () => ({ limit: () => ({ get: () => Promise.resolve({ docs: [], empty: true, size: 0 }) }) }),
            get: () => Promise.resolve({ docs: [], empty: true, size: 0 }),
          }),
          orderBy: () => ({ limit: () => ({ get: () => Promise.resolve({ docs: [], empty: true, size: 0 }) }) }),
          limit: () => ({ get: () => Promise.resolve({ docs: [], empty: true, size: 0 }) }),
          get: () => Promise.resolve({ docs: [], empty: true, size: 0 }),
          onSnapshot: () => () => {},
        }),
        runTransaction: () => Promise.resolve(),
        batch: () => ({ set: () => {}, commit: () => Promise.resolve() }),
        FieldValue: { serverTimestamp: () => new Date(), increment: () => 1, arrayUnion: () => [], arrayRemove: () => [], delete: () => {} },
        GeoPoint: class {},
        Timestamp: { now: () => ({ toDate: () => new Date() }) },
      }),
      auth: () => ({ verifyIdToken: () => Promise.resolve({ uid: '', email: '' }) }),
      apps: [],
      app: () => ({}),
    };
  }
  return originalRequire.apply(this, arguments);
};

// Set development environment
process.env.NODE_ENV = 'development';
process.env.SKIP_FIREBASE = 'true';
process.env.SKIP_SENTRY = 'true';

require('dotenv').config({ path: __dirname + '/.env' });

// Start the actual server
const mod = require('./server-production.js');
mod.startRealtimeServer();
console.log('Server started!');