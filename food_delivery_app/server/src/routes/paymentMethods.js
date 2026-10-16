const { verifyToken } = require('../middleware/auth');

async function getDb(req) {
  return req.app.get('db');
}

const COD_METHOD = {
  id: 'cod',
  type: 'CASH_ON_DELIVERY',
  display_name: 'Cash on Delivery',
  is_default: true,
  last_four_digits: null,
  provider: null,
};

// Mirrors the web checkout's "Pay Online (PesaPal)" option — hosted checkout
// (card / M-Pesa / Tigo / Airtel handled on PesaPal's page).
const PESAPAL_METHOD = {
  id: 'pesapal',
  type: 'PESAPAL',
  display_name: 'Pay Online (PesaPal)',
  is_default: false,
  last_four_digits: null,
  provider: 'pesapal',
};

function toPaymentMethodDto(doc) {
  return {
    id: doc.id,
    type: (doc.type || 'MPESA').toUpperCase(),
    display_name: doc.display_name || doc.displayName || doc.type || 'Payment',
    is_default: !!doc.is_default || !!doc.isDefault,
    last_four_digits: doc.last_four_digits || doc.lastFourDigits || null,
    provider: doc.provider || null,
  };
}

async function listMethods(db, userId) {
  const rows = await db.where('payment_methods', 'userId', '==', userId);
  const methods = rows.map(toPaymentMethodDto);
  // Web-parity defaults: COD first, then Pay Online (PesaPal)
  const result = [];
  if (!methods.some((m) => m.type === 'CASH_ON_DELIVERY' || m.id === 'cod')) {
    result.push({ ...COD_METHOD });
  }
  if (!methods.some((m) => m.type === 'PESAPAL' || m.id === 'pesapal')) {
    result.push({ ...PESAPAL_METHOD });
  }
  result.push(...methods.filter((m) => m.type !== 'CASH_ON_DELIVERY' && m.type !== 'PESAPAL'));
  if (!result.some((m) => m.is_default) && result.length > 0) {
    result[0].is_default = true;
  }
  return result;
}

async function getPaymentMethods(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });
    const data = await listMethods(db, req.user.uid);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function addPaymentMethod(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const type = (req.body.type || 'MPESA').toUpperCase();
    const displayName = req.body.displayName || req.body.display_name || type;
    // Never persist secrets — only display metadata
    const payload = {
      userId: req.user.uid,
      type,
      display_name: displayName,
      last_four_digits: req.body.lastFourDigits || req.body.last_four_digits || null,
      provider: req.body.provider || null,
      is_default: false,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.add('payment_methods', payload);
    const data = toPaymentMethodDto({ id: ref.id, ...payload });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Add payment method error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function deletePaymentMethod(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { paymentMethodId } = req.params;
    if (paymentMethodId === 'cod' || paymentMethodId === 'pesapal') {
      return res.status(400).json({ success: false, error: 'Built-in payment methods cannot be deleted' });
    }

    const method = await db.get('payment_methods', paymentMethodId);
    if (!method || method.userId !== req.user.uid) {
      return res.status(404).json({ success: false, error: 'Payment method not found' });
    }

    await db.delete('payment_methods', paymentMethodId);
    return res.json({ success: true, data: null });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function setDefaultPaymentMethod(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { paymentMethodId } = req.params;
    const userId = req.user.uid;
    const existing = await db.where('payment_methods', 'userId', '==', userId);

    for (const method of existing) {
      await db.update('payment_methods', method.id, {
        is_default: method.id === paymentMethodId,
        isDefault: method.id === paymentMethodId,
      });
    }

    // COD is synthetic — no DB row required
    return res.json({ success: true, data: null });
  } catch (error) {
    console.error('Set default payment method error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function paymentMethodsRoutes(app) {
  app.get('/api/payment-methods', verifyToken, getPaymentMethods);
  app.post('/api/payment-methods', verifyToken, addPaymentMethod);
  app.delete('/api/payment-methods/:paymentMethodId', verifyToken, deletePaymentMethod);
  app.post('/api/payment-methods/:paymentMethodId/set-default', verifyToken, setDefaultPaymentMethod);

  app.get('/api/v1/payment-methods', verifyToken, getPaymentMethods);
  app.post('/api/v1/payment-methods', verifyToken, addPaymentMethod);
  app.delete('/api/v1/payment-methods/:paymentMethodId', verifyToken, deletePaymentMethod);
  app.post('/api/v1/payment-methods/:paymentMethodId/set-default', verifyToken, setDefaultPaymentMethod);
}

module.exports = { paymentMethodsRoutes, listMethods };
