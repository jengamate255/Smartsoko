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

let db = null;
let authMiddleware = null;
let ipnId = null;
let tokenCache = { token: null, expiresAt: 0 };
const topupOrders = new Map(); // orderTrackingId -> { email, amount, status, merchantReference, createdAt }

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PesaPal auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60000
  };
  return data.access_token;
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
      const err = await res.text();
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

function verifyIPNNotification(body, headers) {
  const signature = headers['pesapal-notification-signature'] || headers['x-pesapal-signature'] || '';
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', CONSUMER_SECRET).update(JSON.stringify(body)).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function init(firebaseDb, authMw) {
  db = firebaseDb;
  authMiddleware = authMw;
  if (CONSUMER_KEY && CONSUMER_SECRET) {
    try {
      await registerIPN();
      setInterval(() => registerIPN().catch(() => {}), 86400000);
    } catch (error) {
      console.warn('PesaPal IPN registration failed, continuing without PesaPal:', error.message);
    }
  }
}

router.post('/initiate', async (req, res) => {
  try {
    const { amount, currency, description, customerEmail, customerPhone, customerFirstName, customerLastName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const baseUrl = process.env.PESAPAL_CALLBACK_BASE || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/payments/pesapal/callback`;

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

    if (db && req.user) {
      await db.collection('payments').add({
        userId: req.user.uid,
        merchantReference: result.merchantReference,
        orderTrackingId: result.order_tracking_id,
        amount: parseFloat(amount),
        currency: currency || 'TZS',
        status: 'pending',
        redirectUrl: result.redirect_url,
        createdAt: new Date().toISOString()
      });
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

router.post('/wallet-topup', async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'Customer email is required' });
    }

    const baseUrl = process.env.PESAPAL_CALLBACK_BASE || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/api/payments/pesapal/callback`;

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
      amount: parseFloat(amount),
      status: 'pending',
      merchantReference,
      createdAt: new Date().toISOString()
    });

    if (db) {
      try {
        await db.collection('wallet_topups').add({
          email,
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

router.get('/wallet-status/:orderTrackingId', async (req, res) => {
  try {
    const { orderTrackingId } = req.params;
    const local = topupOrders.get(orderTrackingId);

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

router.post('/complete-topup', async (req, res) => {
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

    res.json({ success: true, amount: local.amount });
  } catch (error) {
    console.error('Complete top-up error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/callback', (req, res) => {
  const { order_tracking_id, merchant_reference } = req.query;
  res.redirect(`/wallet.html?topup=success&orderTrackingId=${order_tracking_id || ''}&merchantReference=${merchant_reference || ''}`);
});

router.post('/ipn', async (req, res) => {
  try {
    const notification = req.body;
    const { OrderNotificationType, OrderTrackingId, MerchantReference } = notification;

    // Update in-memory store
    if (OrderTrackingId && topupOrders.has(OrderTrackingId)) {
      const local = topupOrders.get(OrderTrackingId);
      local.status = OrderNotificationType === 1 ? 'completed' : 'failed';
      local.ipnReceivedAt = new Date().toISOString();
    }

    if (db) {
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
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    res.status(200).send('OK');
  }
});

router.get('/status/:orderTrackingId', async (req, res) => {
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
