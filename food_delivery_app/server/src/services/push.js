/**
 * FCM push notification service (server → device).
 *
 * Tokens are read from the record itself: drivers store `fcmToken` on
 * drivers/{uid} (set by DriverMessagingService.onNewToken), customers/admins
 * may store `deviceTokens` (array) or `fcmToken` on their profile row.
 *
 * All sends are fire-and-forget from the caller's perspective: failures are
 * logged, never thrown — a push must never break an order transaction.
 */
'use strict';

const lazyFirebase = require('./lazy-firebase');

/** Collect candidate tokens from a profile-like record. */
function tokensFromRecord(record) {
  if (!record) return [];
  const out = [];
  if (typeof record.fcmToken === 'string' && record.fcmToken.length > 10) out.push(record.fcmToken);
  if (Array.isArray(record.deviceTokens)) out.push(...record.deviceTokens.filter(t => typeof t === 'string' && t.length > 10));
  if (record.fcmTokens && Array.isArray(record.fcmTokens.fcm)) out.push(...record.fcmTokens.fcm);
  return [...new Set(out)];
}

/**
 * Send a data + notification message to every token on a record.
 * Returns the number of messages successfully dispatched (0 if none).
 */
async function sendToUser(record, { title, body, data = {}, collapseKey = null, topic = null }) {
  const tokens = tokensFromRecord(record);
  if (!tokens.length) return 0;

  const admin = lazyFirebase.getAdmin();
  if (!admin) {
    console.warn('[push] skipped — Firebase Admin not initialized');
    return 0;
  }

  let sent = 0;
  for (const token of tokens) {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high', ...(collapseKey ? { collapseKey } : {}) },
    };
    try {
      await admin.messaging().send(message);
      sent++;
    } catch (e) {
      const msg = String(e && e.message || e);
      // Stale/invalid tokens are expected — prune them off the record is
      // out of scope here; just don't retry them.
      if (/not-valid|notregistered|invalid-registration|registration-token|requested-entity-was-not-found/i.test(msg)) {
        console.log(`[push] dropping invalid token …${token.slice(-6)}`);
      } else {
        console.error(`[push] send failed: ${msg.slice(0, 140)}`);
      }
    }
  }
  return sent;
}

/** Notify by uid: looks up drivers/{uid} then profiles/{uid} for tokens. */
async function sendToUid(app, uid, payload) {
  if (!uid) return 0;
  const db = app.get('db');
  if (!db || !db.get) return 0;
  let record = null;
  try { record = await db.get('drivers', uid); } catch (_) {}
  if (!tokensFromRecord(record).length) {
    try { record = Object.assign({}, record || {}, await db.get('profiles', uid)); } catch (_) {}
  }
  return sendToUser(record, payload);
}

/**
 * Fan out to all online drivers — used for "new order ready for pickup"
 * broadcasts. Reads the drivers collection once, filters for tokens.
 */
async function broadcastToDrivers(app, payload) {
  const db = app.get('db');
  if (!db || !db.getAll) return 0;
  let drivers = [];
  try { drivers = await db.getAll('drivers'); } catch (_) { return 0; }
  let sent = 0;
  for (const d of drivers) {
    if (d.isOnline === false && d.status !== 'online') continue;
    sent += await sendToUser(d, payload);
  }
  return sent;
}

module.exports = { sendToUser, sendToUid, broadcastToDrivers, tokensFromRecord };
