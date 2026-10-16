const admin = require('firebase-admin');

class FirestoreListenerManager {
  constructor() {
    this.listeners = new Map();
    this.isShuttingDown = false;
  }

  add(name, unsubscribeFn) {
    if (this.listeners.has(name)) {
      console.warn(`Listener ${name} already exists, replacing`);
      this.remove(name);
    }
    this.listeners.set(name, unsubscribeFn);
    console.log(`Registered Firestore listener: ${name} (total: ${this.listeners.size})`);
  }

  remove(name) {
    const unsubscribe = this.listeners.get(name);
    if (unsubscribe) {
      try {
        unsubscribe();
        this.listeners.delete(name);
        console.log(`Removed Firestore listener: ${name} (remaining: ${this.listeners.size})`);
      } catch (error) {
        console.error(`Error removing listener ${name}:`, error);
      }
    }
  }

  async shutdown() {
    this.isShuttingDown = true;
    console.log(`Shutting down ${this.listeners.size} Firestore listeners...`);
    
    const promises = [];
    for (const [name, unsubscribe] of this.listeners.entries()) {
      promises.push(
        (async () => {
          try {
            unsubscribe();
            console.log(`Shutdown listener: ${name}`);
          } catch (error) {
            console.error(`Error shutting down listener ${name}:`, error);
          }
        })()
      );
    }
    
    await Promise.allSettled(promises);
    this.listeners.clear();
    console.log('All Firestore listeners shut down');
  }

  getListenerCount() {
    return this.listeners.size;
  }

  getListenerNames() {
    return Array.from(this.listeners.keys());
  }
}

const listenerManager = new FirestoreListenerManager();

function startOrdersListener(db, broadcastFn) {
  if (!db) return;
  
  const unsubscribe = db.collection('orders').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const order = { id: change.doc.id, ...change.doc.data() };
        broadcastFn({ type: 'new_order', order });
      } else if (change.type === 'modified') {
        const order = { id: change.doc.id, ...change.doc.data() };
        broadcastFn({ type: 'order_update', order });
      }
    });
  }, (error) => {
    console.error('Orders listener error:', error);
  });

  listenerManager.add('orders', unsubscribe);
}

function startRidersListener(db, broadcastFn) {
  if (!db) return;
  
  const unsubscribe = db.collection('riders').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'modified') {
        const rider = { id: change.doc.id, ...change.doc.data() };
        broadcastFn({ type: 'rider_update', rider });
      }
    });
  }, (error) => {
    console.error('Riders listener error:', error);
  });

  listenerManager.add('riders', unsubscribe);
}

function startCustomListener(name, collection, queryConstraints, broadcastFn, transformFn) {
  if (!admin.apps[0]?.firestore) return;
  
  let query = admin.firestore().collection(collection);
  if (queryConstraints) {
    query = query.where(...queryConstraints);
  }
  
  const unsubscribe = query.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.exists ? { id: change.doc.id, ...change.doc.data() } : { id: change.doc.id };
      const message = transformFn ? transformFn(change, data) : { type: `${name}_${change.type}`, [name]: data };
      broadcastFn(message);
    });
  }, (error) => {
    console.error(`${name} listener error:`, error);
  });

  listenerManager.add(name, unsubscribe);
}

function shutdownListeners() {
  return listenerManager.shutdown();
}

function getListenerStats() {
  return {
    count: listenerManager.getListenerCount(),
    names: listenerManager.getListenerNames(),
  };
}

module.exports = {
  listenerManager,
  startOrdersListener,
  startRidersListener,
  startCustomListener,
  shutdownListeners,
  getListenerStats,
};