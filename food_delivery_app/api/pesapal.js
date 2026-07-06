/**
 * PesaPal API 3.0 Integration Service
 * Handles: Authentication, IPN Registration, Order Submission, Transaction Status
 */

const PESAPAL_ENV = process.env.PESAPAL_ENV || 'sandbox';
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

const BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3'
};

const BASE_URL = BASE_URLS[PESAPAL_ENV];

const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

let tokenCache = { token: null, expiry: null };

async function apiPost(path, body, authToken) {
  const opts = {
    method: 'POST',
    headers: { ...headers },
    body: JSON.stringify(body)
  };
  if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return res.json();
}

async function apiGet(path, authToken) {
  const opts = {
    method: 'GET',
    headers: { ...headers }
  };
  if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return res.json();
}

async function getAccessToken() {
  if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
    return tokenCache.token;
  }

  const data = await apiPost('/api/Auth/RequestToken', {
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET
  });

  if (data.error && data.error.code) {
    throw new Error(`PesaPal auth error ${data.error.code}: ${data.error.message || data.error.error_type}`);
  }
  if (data.error) {
    throw new Error(`PesaPal auth error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  tokenCache = {
    token: data.token,
    expiry: new Date(data.expiryDate).getTime() - 60000
  };

  return data.token;
}

async function registerIPNUrl(ipnUrl, notificationType = 'GET') {
  const token = await getAccessToken();
  const data = await apiPost('/api/URLSetup/RegisterIPN',
    { url: ipnUrl, ipn_notification_type: notificationType },
    token
  );

  if (data.error) {
    throw new Error(`PesaPal IPN registration error: ${data.error.message}`);
  }

  return data;
}

async function getRegisteredIPNs() {
  const token = await getAccessToken();
  return await apiGet('/api/URLSetup/GetIPNs', token);
}

async function submitOrderRequest({
  id, currency, amount, description, callback_url, notification_id,
  cancellation_url, redirect_mode, branch = '', billing_address
}) {
  const token = await getAccessToken();
  const payload = {
    id,
    currency,
    amount: parseFloat(amount.toFixed(2)),
    description,
    callback_url,
    notification_id,
    branch,
    billing_address
  };

  if (redirect_mode) payload.redirect_mode = redirect_mode;
  if (cancellation_url) payload.cancellation_url = cancellation_url;

  const data = await apiPost('/api/Transactions/SubmitOrderRequest', payload, token);

  if (data.error) {
    throw new Error(`PesaPal submit order error: ${data.error.message}`);
  }

  return data;
}

async function getTransactionStatus(orderTrackingId) {
  const token = await getAccessToken();
  return await apiGet(`/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, token);
}

async function submitRefundRequest({
  confirmationCode, amount, username, remarks, cancellationOnly = false
}) {
  const token = await getAccessToken();
  const payload = {
    confirmation_code: confirmationCode,
    amount,
    username,
    remarks,
    cancellation_only: cancellationOnly
  };

  return await apiPost('/api/Transactions/RefundRequest', payload, token);
}

function getIpnConfirmationResponse(orderTrackingId, orderMerchantReference, success = true) {
  return {
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId,
    orderMerchantReference,
    status: success ? 200 : 500
  };
}

const express = require('express');
const router = express.Router();

let db = null;
let admin = null;

function init(firebaseDb, firebaseAdmin) {
  db = firebaseDb;
  admin = firebaseAdmin;
}

router.post('/initiate', async (req, res) => {
  try {
    const {
      orderId, amount, currency, description, callback_url,
      customerPhone, customerEmail, customerFirstName, customerLastName,
      cancellation_url
    } = req.body;

    if (!orderId || !amount || !callback_url) {
      return res.status(400).json({ success: false, error: 'orderId, amount, and callback_url are required' });
    }

    const ipnUrl = process.env.PESAPAL_IPN_URL || `${req.protocol}://${req.get('host')}/api/pesapal/ipn`;
    
    let notificationId = process.env.PESAPAL_IPN_ID;
    
    if (!notificationId) {
      try {
        const existingIPNs = await getRegisteredIPNs();
        if (existingIPNs && existingIPNs.length > 0) {
          notificationId = existingIPNs[0].ipn_id;
        }
      } catch (e) {
        console.log('No existing IPN found, registering new one');
      }
    }
    
    if (!notificationId) {
      const ipnResult = await registerIPNUrl(ipnUrl, 'POST');
      notificationId = ipnResult.ipn_id;
      process.env.PESAPAL_IPN_ID = notificationId;
    }

    const countryCode = (currency === 'TZS' || currency === 'Tsh') ? 'TZ' : 'KE';
    const billingAddr = {};
    if (customerPhone) billingAddr.phone_number = customerPhone;
    if (customerEmail) billingAddr.email_address = customerEmail;
    if (customerFirstName) billingAddr.first_name = customerFirstName;
    if (customerLastName) billingAddr.last_name = customerLastName;
    if (customerPhone || customerEmail) billingAddr.country_code = countryCode;

    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;
    const result = await submitOrderRequest({
      id: orderId,
      currency: currency || 'TZS',
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      description: (description || 'Payment for order').substring(0, 100),
      callback_url,
      redirect_mode: 'TOP_WINDOW',
      notification_id: notificationId,
      cancellation_url: cancellation_url || callback_url.replace('callback', 'cancel'),
      billing_address: billingAddr
    });

    if (db && admin) {
      await db.collection('pesapal_transactions').doc(orderId).set({
        orderTrackingId: result.order_tracking_id,
        merchantReference: result.merchant_reference,
        redirectUrl: result.redirect_url,
        status: 'pending',
        amount: parseFloat(amount),
        currency: currency || 'TZS',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({
      success: true,
      orderTrackingId: result.order_tracking_id,
      merchantReference: result.merchant_reference,
      redirectUrl: result.redirect_url
    });
  } catch (error) {
    console.error('PesaPal initiate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/callback', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;
  
  if (!OrderTrackingId) {
    return res.redirect('/checkout?payment=error&message=Invalid+callback');
  }

  try {
    const status = await getTransactionStatus(OrderTrackingId);
    
    if (db && admin) {
      const snapshot = await db.collection('pesapal_transactions')
        .where('orderTrackingId', '==', OrderTrackingId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          paymentStatus: status.payment_status_description,
          statusCode: status.status_code,
          confirmationCode: status.confirmation_code,
          paymentMethod: status.payment_method,
          paymentAccount: status.payment_account,
          amount: status.amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (status.status_code === 1) {
          await db.collection('orders').doc(doc.data().merchantReference || doc.id).update({
            paymentStatus: 'completed',
            paymentMethod: 'pesapal',
            pesapalTrackingId: OrderTrackingId,
            pesapalConfirmationCode: status.confirmation_code,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }

    const statusMap = {
      1: 'completed', 0: 'invalid', 2: 'failed', 3: 'reversed'
    };
    const paymentStatus = statusMap[status.status_code] || 'pending';

    res.redirect(`/track-order?orderId=${OrderMerchantReference || ''}&payment=${paymentStatus}&trackingId=${OrderTrackingId}`);
  } catch (error) {
    console.error('PesaPal callback error:', error);
    res.redirect(`/checkout?payment=error&message=${encodeURIComponent(error.message)}`);
  }
});

router.post('/ipn', async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;

    if (!OrderTrackingId) {
      return res.status(400).json({ error: 'Missing OrderTrackingId' });
    }

    const status = await getTransactionStatus(OrderTrackingId);

    if (db && admin) {
      const snapshot = await db.collection('pesapal_transactions')
        .where('orderTrackingId', '==', OrderTrackingId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          paymentStatus: status.payment_status_description,
          statusCode: status.status_code,
          confirmationCode: status.confirmation_code,
          paymentMethod: status.payment_method,
          ipnNotified: true,
          ipnNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    res.json(getIpnConfirmationResponse(OrderTrackingId, OrderMerchantReference, true));
  } catch (error) {
    console.error('PesaPal IPN error:', error);
    res.json(getIpnConfirmationResponse(req.body.OrderTrackingId, req.body.OrderMerchantReference, false));
  }
});

router.get('/status/:orderTrackingId', async (req, res) => {
  try {
    const status = await getTransactionStatus(req.params.orderTrackingId);
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PESAPAL_FEE_PERCENT = 0.035;
const PLATFORM_COMMISSION = 0.10;
const SERVICE_FEE_PERCENT = 0.03;

function calculateSplitOrder(productPrice, deliveryFee) {
  const pp = Number(productPrice);
  const df = Number(deliveryFee);
  const serviceFee = (pp + df) * SERVICE_FEE_PERCENT;
  const totalPaid = pp + df + serviceFee;
  const pesapalFee = totalPaid * PESAPAL_FEE_PERCENT;
  const netReceived = totalPaid - pesapalFee;
  const sellerCommission = pp * PLATFORM_COMMISSION;
  const sellerEarning = pp - sellerCommission;
  const driverEarning = df;
  const platformProfit = serviceFee + sellerCommission - pesapalFee;
  const round = (v) => Math.round(v * 100) / 100;
  return {
    total_paid_by_customer: round(totalPaid),
    pesapal_fee: round(pesapalFee),
    net_received: round(netReceived),
    seller_earning: round(sellerEarning),
    driver_earning: round(driverEarning),
    platform_profit: round(platformProfit),
    breakdown: [
      { label: 'Product Price', amount: pp },
      { label: 'Delivery Fee', amount: df },
      { label: 'Service Fee (3%)', amount: round(serviceFee) },
    ],
  };
}

router.post('/calculate-split', (req, res) => {
  try {
    const { product_price, delivery_fee } = req.body;
    if (product_price == null || delivery_fee == null) {
      return res.status(400).json({ success: false, error: 'product_price and delivery_fee are required' });
    }
    res.json({ success: true, ...calculateSplitOrder(product_price, delivery_fee) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/order/:orderId', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const doc = await db.collection('pesapal_transactions').doc(req.params.orderId).get();
    if (!doc.exists) {
      return res.json({ success: true, payment: null });
    }
    const payment = doc.data();
    if (payment.orderTrackingId) {
      const liveStatus = await getTransactionStatus(payment.orderTrackingId);
      return res.json({ success: true, payment: { ...payment, id: doc.id }, liveStatus });
    }
    res.json({ success: true, payment: { ...payment, id: doc.id }, liveStatus: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, init, getAccessToken, registerIPNUrl, submitOrderRequest, getTransactionStatus };
