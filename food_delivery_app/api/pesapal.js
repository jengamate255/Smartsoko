/**
 * PesaPal Payment Integration v3
 * PesaPal API documentation: https://developer.pesapal.com
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const PESAPAL_BASE = process.env.PESAPAL_ENV === 'live'
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let db = null;
let authMiddleware = null;
let ipnId = null;
// ─── Auth & ownership gates (same model as api/ntzs.js) ─────────────
// Money routes require a verified Firebase/Supabase session and act only
// on the caller's own profile/wallet. Open routes: /callback (redirect
// only), /ipn (HMAC-signed by PesaPal), /status/:id is read-only but
// still gated since it spends a paid API call per hit.

function requireAuth(req, res, next) {
  if (!authMiddleware || typeof authMiddleware.verifyToken !== 'function') {
    return res.status(503).json({ success: false, error: 'Auth middleware not initialised' });
  }
  authMiddleware.verifyToken(req, res, next);
}

// /complete-topup: only the wallet owner may confirm their own top-up.
function requireTopupOwnership(req, res, next) {
  const local = topupOrders.get(req.body.orderTrackingId);
  if (!local) return res.status(404).json({ success: false, error: 'Top-up order not found' });
  if (local.profileId !== req.user.uid && local.email !== req.user.email) {
    return res.status(403).json({ success: false, error: 'Not your top-up' });
  }
  next();
}
let tokenCache = { token: null, expiresAt: 0 };
const topupOrders = new Map(); // orderTrackingId -> { email, uid, amount, status, merchantReference, credited, createdAt }

async function supabaseGet(table, query) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${table} query failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : [];
}

async function supabaseSend(table, method, body, query = '', prefer = '') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body !== null && body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${table} ${method} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

// Customer wallets live in Supabase, keyed by profiles.id (SmartSoko
// customer profiles — no FK on profiles, so rows are freely created).
// The wallet ledger is the `payments` table (customer_id -> profiles.id,
// no users dependency): topups are completed 'pesapal' payment rows with
// transaction_ref = TOPUP-<orderTrackingId>; balance is derived by summing.
// Note: the legacy `users`/`wallets`/`transactions` tables are unusable —
// users.id has a broken NOT VALID self-referencing FK that rejects inserts.
async function resolveCustomerProfileId(email) {
  const rows = await supabaseGet('profiles', `select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
  if (rows[0] && rows[0].id) return rows[0].id;

  const id = require('crypto').randomUUID();
  const now = new Date().toISOString();
  try {
    const created = await supabaseSend('profiles', 'POST', {
      id,
      email,
      name: email.split('@')[0] || 'Customer',
      role: 'customer',
      created_at: now,
      updated_at: now
    }, '', 'return=representation');
    if (created && created[0] && created[0].id) return created[0].id;
  } catch (e) {
    // Race: another request created the profile first — re-select.
    const again = await supabaseGet('profiles', `select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
    if (again[0] && again[0].id) return again[0].id;
    throw e;
  }
  throw new Error(`Failed to create profile for ${email}`);
}

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // PesaPal v3 expects consumer_key/consumer_secret in the JSON body —
  // NOT an HTTP Basic Authorization header (which makes their live API
  // throw an IIS 500). Token is valid for ~5 minutes (300s).
  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET
    })
  });

  if (!res.ok) {
    const err = (await res.text()).slice(0, 300);
    throw new Error(`PesaPal auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  // Response shape: { token, expiryDate, error, status, message }
  const expiresInMs = data.expiryDate
    ? Math.max(Date.parse(data.expiryDate) - Date.now() - 60000, 60000)
    : 4 * 60 * 1000;
  tokenCache = {
    token: data.token,
    expiresAt: Date.now() + expiresInMs
  };
  return data.token;
}

async function registerIPN() {
  try {
    const token = await getAccessToken();
    const baseUrl = process.env.PESAPAL_CALLBACK_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const ipnUrl = `${baseUrl}/api/payments/pesapal/ipn`;

    const res = await fetch(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'POST'
      })
    });

    if (!res.ok) {
      const err = (await res.text()).slice(0, 300);
      throw new Error(`IPN registration failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    ipnId = data.ipn_id;
    return data;
  } catch (error) {
    console.error('PesaPal IPN registration:', error.message);
    return null;
  }
}

async function submitOrder({ amount, currency, description, customerEmail, customerPhone, customerFirstName, customerLastName, callbackUrl }) {
  const token = await getAccessToken();
  if (!ipnId) await registerIPN();

  const merchantReference = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const body = {
    id: merchantReference,
    currency: currency || 'TZS',
    amount: parseFloat(amount).toFixed(2),
    description: description || 'Payment',
    callback_url: callbackUrl || '',
    notification_id: ipnId || '',
    billing_address: {
      email_address: customerEmail || '',
      phone_number: customerPhone || '',
      first_name: customerFirstName || '',
      last_name: customerLastName || ''
    }
  };

  const res = await fetch(`${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PesaPal order submission failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    ...data,
    merchantReference
  };
}

async function getTransactionStatus(orderTrackingId) {
  const token = await getAccessToken();

  const res = await fetch(
    `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PesaPal status query failed: ${res.status} ${err}`);
  }

  return res.json();
}

function verifyIPNNotification(rawBody, headers) {
  const signature = headers['pesapal-notification-signature'] || headers['x-pesapal-signature'] || '';
  if (!signature || !rawBody) return false;

  // PesaPal signs the raw request body: base64(HMAC-SHA256(rawBody, consumerSecret))
  const expected = crypto.createHmac('sha256', CONSUMER_SECRET).update(rawBody).digest('base64');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false; // timingSafeEqual throws on length mismatch
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// Credits the customer's Supabase wallet once a topup payment is confirmed.
// Ledger: a completed `payments` row (customer_id = profiles.id) with
// transaction_ref = TOPUP-<orderTrackingId>; balance is derived by summing
// completed rows, so no read-modify-write is required. Idempotent via the
// transaction_ref dedupe + the in-process `credited` flag.
async function creditWallet(orderTrackingId) {
  const local = topupOrders.get(orderTrackingId);
  if (!local || local.credited || local.status !== 'completed') return;
  if (!local.profileId) return;

  local.credited = true; // optimistic in-process guard
  try {
    const topupRef = `TOPUP-${orderTrackingId}`;
    const now = new Date().toISOString();

    // Idempotency: skip if this topup was already recorded
    const existing = await supabaseGet('payments', `select=id&transaction_ref=eq.${encodeURIComponent(topupRef)}&limit=1`);
    if (existing.length > 0) return;

    await supabaseSend('payments', 'POST', {
      customer_id: local.profileId,
      amount: local.amount,
      method: 'pesapal',
      status: 'completed',
      transaction_ref: topupRef,
      notes: 'Wallet top-up via PesaPal',
      metadata: {
        kind: 'topup',
        orderTrackingId,
        merchantReference: local.merchantReference,
        email: local.email
      },
      created_at: now,
      updated_at: now
    }, '', 'return=representation');

    local.creditedAt = now;
    console.log(`Wallet credited +${local.amount} TZS to ${local.email} (${orderTrackingId})`);

    if (db) {
      try {
        const snapshot = await db.collection('wallet_topups')
          .where('orderTrackingId', '==', orderTrackingId)
          .limit(1)
          .get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({ credited: true, creditedAt: local.creditedAt });
        }
      } catch (e) {
        console.error('Failed to record credit in Firestore:', e.message);
      }
    }
  } catch (error) {
    console.error('Wallet credit error:', error.message);
    local.credited = false; // allow retry
  }
}

async function init(firebaseDb, authMw) {
  db = firebaseDb;
  authMiddleware = authMw;
  if (CONSUMER_KEY && CONSUMER_SECRET) {
    // Use pre-registered IPN ID from env if available, otherwise register fresh
    const envIpnId = process.env.PESAPAL_IPN_ID;
    if (envIpnId) {
      ipnId = envIpnId;
      console.log('PesaPal IPN loaded from env:', envIpnId);
    } else {
      try {
        await registerIPN();
        setInterval(() => registerIPN().catch(() => {}), 86400000);
      } catch (error) {
        console.warn('PesaPal IPN registration failed, continuing without PesaPal:', error.message);
      }
    }
  }
}

router.post('/initiate', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || typeof orderId !== 'string') return res.status(400).json({ success: false, error: 'A saved order is required' });
    const routeDb = req.app.get('db');
    if (!routeDb) return res.status(503).json({ success: false, error: 'Database unavailable' });
    const order = await routeDb.get('orders', orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const { customerIdFor } = require('../server/src/services/checkout');
    const customerId = await customerIdFor(routeDb, req.user);
    if ((order.customerId || order.customer_id) !== customerId) return res.status(403).json({ success: false, error: 'Not your order' });
    if (['paid', 'completed'].includes(order.paymentStatus || order.payment_status) || order.status === 'cancelled') return res.status(409).json({ success: false, error: 'Order is not awaiting payment' });
    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(409).json({ success: false, error: 'Invalid saved order total' });
    const currency = 'TZS';
    const description = 'SmartSoko Order #' + orderId;
    const customerEmail = req.user.email || '';
    const customerPhone = order.customerPhone || order.customer_phone || '';
    const fullName = order.customerName || order.customer_name || '';
    const [customerFirstName, ...lastNames] = fullName.split(' ');
    const customerLastName = lastNames.join(' ');
    const baseUrl = process.env.PESAPAL_CALLBACK_BASE || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = baseUrl + '/api/payments/pesapal/callback?orderId=' + encodeURIComponent(orderId);

    const result = await submitOrder({
      amount,
      currency: currency || 'TZS',
      description: description || 'SmartSoko Payment',
      customerEmail,
      customerPhone,
      customerFirstName,
      customerLastName,
      callbackUrl
    });

    if (req.user) {
      try {
        const profileId = await resolveCustomerProfileId(req.user.email);
        const now = new Date().toISOString();
        await supabaseSend('payments', 'POST', {
          customer_id: profileId,
          amount: parseFloat(amount),
          method: 'pesapal',
          status: 'pending',
          transaction_ref: result.merchantReference,
          notes: description || 'PesaPal order payment',
          metadata: { orderTrackingId: result.order_tracking_id, orderId: req.body.orderId || null },
          created_at: now,
          updated_at: now
        }, '', 'return=representation');
      } catch (e) {
        console.warn('PesaPal payment ledger write failed:', e.message);
      }
    }

    res.json({
      success: true,
      merchantReference: result.merchantReference,
      orderTrackingId: result.order_tracking_id,
      redirectUrl: result.redirect_url
    });
  } catch (error) {
    console.error('PesaPal initiate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/wallet-topup', requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    // Identity comes from the verified session — never from the body.
    const email = req.user.email || '';
    if (!email) {
      return res.status(400).json({ success: false, error: 'Authenticated account has no email; cannot resolve wallet' });
    }

    const baseUrl = process.env.PESAPAL_CALLBACK_BASE || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/payments/pesapal/callback`;

    // Resolve (or lazily create) the customer's profiles row — the wallet
    // ledger (payments) is keyed by profiles.id. Fail fast before a PesaPal
    // payment order is created.
    let profileId = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        profileId = await resolveCustomerProfileId(email);
      } catch (e) {
        console.error('Failed to resolve customer profile:', e.message);
      }
    }
    if (!profileId) {
      return res.status(400).json({ success: false, error: 'Customer profile not found. User must sign up first.' });
    }

    const result = await submitOrder({
      amount,
      currency: 'TZS',
      description: `Wallet top-up - ${email}`,
      customerEmail: email,
      callbackUrl
    });

    const orderTrackingId = result.order_tracking_id;
    const merchantReference = result.merchantReference;

    topupOrders.set(orderTrackingId, {
      email,
      profileId,
      amount: parseFloat(amount),
      status: 'pending',
      merchantReference,
      credited: false,
      createdAt: new Date().toISOString()
    });

    if (db) {
      try {
        await db.collection('wallet_topups').add({
          email,
          profileId,
          amount: parseFloat(amount),
          orderTrackingId,
          merchantReference,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to write topup to Firestore:', e.message);
      }
    }

    res.json({
      success: true,
      merchantReference,
      orderTrackingId,
      redirectUrl: result.redirect_url
    });
  } catch (error) {
    console.error('Wallet top-up error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/wallet-status/:orderTrackingId', requireAuth, async (req, res) => {
  try {
    const { orderTrackingId } = req.params;
    const local = topupOrders.get(orderTrackingId);
    // Status exposes amount + customer email — owner eyes only.
    if (!local) return res.status(404).json({ success: false, error: 'Top-up order not found' });
    if (local.profileId !== req.user.uid && local.email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Not your top-up' });
    }

    let pesapalStatus = null;
    try {
      pesapalStatus = await getTransactionStatus(orderTrackingId);
    } catch (e) {
      // fall back to local if PesaPal query fails
    }

    const completed = pesapalStatus
      ? ['COMPLETED', '00'].includes(pesapalStatus.status_code)
      : local?.status === 'completed';

    const failed = pesapalStatus
      ? ['FAILED', '02'].includes(pesapalStatus.status_code)
      : local?.status === 'failed';

    res.json({
      success: true,
      completed,
      failed,
      data: pesapalStatus,
      local: local || null
    });
  } catch (error) {
    console.error('Wallet status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/wallet', requireAuth, async (req, res) => {
  try {
    // Resolve profile by the authenticated uid (profiles.id === auth uid),
    // falling back to the token's own email — never a client-supplied one.
    let profileRows = await supabaseGet('profiles', `select=id,email&id=eq.${encodeURIComponent(req.user.uid)}&limit=1`);
    if (!profileRows[0] && req.user.email) {
      profileRows = await supabaseGet('profiles', `select=id,email&email=eq.${encodeURIComponent(req.user.email)}&limit=1`);
    }
    if (!profileRows[0]) {
      return res.json({ success: true, balance: 0, spent_today: 0, topped_up_today: 0, pending_refunds: 0, currency: 'TZS', transactions: [] });
    }
    const profileId = profileRows[0].id;

    const payRows = await supabaseGet('payments', `select=amount,method,status,transaction_ref,notes,created_at&customer_id=eq.${profileId}&order=created_at.desc&limit=100`);

    // Balance = completed credits (pesapal topups + refunds) minus completed
    // wallet spends. Ledger-only; derived, never stored.
    let balance = 0, toppedUpToday = 0, spentToday = 0;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const transactions = [];
    payRows.forEach(p => {
      const ts = p.created_at ? new Date(p.created_at).getTime() : 0;
      const today = ts >= startOfDay.getTime();
      if (p.status === 'completed') {
        if (p.method === 'pesapal') {
          balance += p.amount || 0;
          if (today) toppedUpToday += p.amount || 0;
          transactions.push({ type: 'topup', amount: p.amount || 0, description: p.notes || 'Wallet top-up via PesaPal', createdAt: p.created_at, reference: p.transaction_ref });
        } else if (p.method === 'wallet') {
          balance -= p.amount || 0;
          if (today) spentToday += p.amount || 0;
          transactions.push({ type: 'payment', amount: p.amount || 0, description: p.notes || 'Payment from wallet', createdAt: p.created_at });
        } else if (p.method === 'refund') {
          balance += p.amount || 0;
          transactions.push({ type: 'refund', amount: p.amount || 0, description: p.notes || 'Refund to wallet', createdAt: p.created_at });
        }
      }
    });

    // Pending refunds: refunded escrow orders flagged for wallet credit
    let pendingRefunds = 0;
    try {
      const refundOrders = await supabaseGet('orders', `select=total_paid&customer_id=eq.${profileId}&escrow_status=eq.refunded&refund_to_wallet=eq.true`);
      pendingRefunds = refundOrders.reduce((s, o) => s + (o.total_paid || 0), 0);
    } catch (e) {
      console.error('Pending refunds query failed:', e.message);
    }

    res.json({
      success: true,
      balance,
      spent_today: spentToday,
      topped_up_today: toppedUpToday,
      pending_refunds: pendingRefunds,
      currency: 'TZS',
      transactions
    });
  } catch (error) {
    console.error('Wallet summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/complete-topup', requireAuth, requireTopupOwnership, async (req, res) => {
  try {
    const { orderTrackingId, email } = req.body;
    if (!orderTrackingId) {
      return res.status(400).json({ success: false, error: 'orderTrackingId is required' });
    }

    const local = topupOrders.get(orderTrackingId);
    if (!local) {
      return res.status(404).json({ success: false, error: 'Top-up order not found' });
    }

    local.status = 'completed';
    local.completedAt = new Date().toISOString();

    if (db) {
      try {
        const snapshot = await db.collection('wallet_topups')
          .where('orderTrackingId', '==', orderTrackingId)
          .limit(1)
          .get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            status: 'completed',
            completedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Failed to update Firestore topup:', e.message);
      }
    }

    await creditWallet(orderTrackingId);

    res.json({ success: true, amount: local.amount });
  } catch (error) {
    console.error('Complete top-up error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/callback', (req, res) => {
  const { order_tracking_id, merchant_reference, orderId } = req.query;

  // For order payments, redirect to track-order
  if (orderId) {
    res.redirect(`/track-order?orderId=${encodeURIComponent(orderId)}`);
  } else {
    res.redirect(`/wallet.html?topup=success&orderTrackingId=${order_tracking_id || ''}&merchantReference=${merchant_reference || ''}`);
  }
});

router.post('/ipn', async (req, res) => {
  try {
    // Signature verification: PesaPal signs the raw request body with the
    // consumer secret (base64 HMAC-SHA256). Reject spoofed notifications.
    if (!verifyIPNNotification(req.rawBody, req.headers)) {
      console.warn('PesaPal IPN rejected: missing or invalid signature');
      return res.status(401).send('Unauthorized');
    }

    const notification = req.body || {};
    const { OrderNotificationType, OrderTrackingId, MerchantReference } = notification;

    if (!OrderTrackingId) {
      return res.status(200).send('OK');
    }

    // Update in-memory store
    if (OrderTrackingId && topupOrders.has(OrderTrackingId)) {
      const local = topupOrders.get(OrderTrackingId);
      local.status = OrderNotificationType === 1 ? 'completed' : 'failed';
      local.ipnReceivedAt = new Date().toISOString();
    }

    // Update Supabase payments ledger
    try {
      const payStatus = OrderNotificationType === 1 ? 'completed' : 'failed';
      await supabaseSend(
        'payments',
        'PATCH',
        { status: payStatus, updated_at: new Date().toISOString() },
        `transaction_ref=eq.${MerchantReference}&status=eq.pending`
      );
    } catch (e) {
      console.warn('PesaPal IPN Supabase update failed:', e.message);
    }

    // Also update the order's payment status if we can find it
    if (OrderNotificationType === 1 && MerchantReference) {
      try {
        const payments = await supabaseGet('payments', `select=metadata&transaction_ref=eq.${MerchantReference}&limit=1`);
        const meta = payments[0] && payments[0].metadata;
        const orderId = meta && (meta.orderId || meta.order_id);
        if (orderId) {
          await supabaseSend(
            'orders',
            'PATCH',
            { paymentStatus: 'paid', updatedAt: new Date().toISOString() },
            `id=eq.${orderId}`
          );
        }
      } catch (e) {
        console.warn('PesaPal IPN order status update failed:', e.message);
      }
    }

    if (db) {
      // Best-effort Firestore mirror; must never block the credit flow.
      try {
        const snapshot = await db.collection('payments')
          .where('orderTrackingId', '==', OrderTrackingId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const docRef = snapshot.docs[0].ref;
          const status = OrderNotificationType === 1 ? 'completed' : 'failed';
          await docRef.update({
            status,
            ipnConfirmed: true,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Firestore IPN mirror skipped:', e.message);
      }
    }

    if (OrderNotificationType === 1) {
      await creditWallet(OrderTrackingId);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    res.status(200).send('OK');
  }
});

router.get('/status/:orderTrackingId', requireAuth, async (req, res) => {
  try {
    const { orderTrackingId } = req.params;
    const status = await getTransactionStatus(orderTrackingId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('PesaPal status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status-by-ref/:merchantReference', async (req, res) => {
  try {
    const { merchantReference } = req.params;
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const snapshot = await db.collection('payments')
      .where('merchantReference', '==', merchantReference)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const payment = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment' });
  }
});

function isConfigured() {
  return !!(CONSUMER_KEY && CONSUMER_SECRET);
}

module.exports = router;
module.exports.init = init;
module.exports.registerIPN = registerIPN;
module.exports.isConfigured = isConfigured;
module.exports.creditWallet = creditWallet;
module.exports.verifyIPNNotification = verifyIPNNotification;
module.exports.topupOrders = topupOrders;
module.exports.submitOrder = submitOrder;
