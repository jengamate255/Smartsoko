const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { syncToSupabase } = require('./sync');

admin.initializeApp();

const MPESA_CONSUMER_KEY = 'YOUR_MPESA_CONSUMER_KEY';
const MPESA_CONSUMER_SECRET = 'YOUR_MPESA_CONSUMER_SECRET';
const MPESA_SHORTCODE = 'YOUR_SHORTCODE';
const MPESA_PASSKEY = 'YOUR_PASSKEY';
const MPESA_CALLBACK_URL = 'https://fooddelievry-dce15.firebaseio.com/mpesaCallback';
const MPESA_BASE_URL = 'https://openapi.vodacom.co.tz';

function generatePassword() {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
  return { password, timestamp };
}

async function getAccessToken() {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  try {
    const response = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Token error:', error.message);
    throw new Error('Failed to get M-Pesa token');
  }
}

exports.mpesaSTKPush = functions.https.onCall(async (data, context) => {
  const { phone, amount, orderId, paymentId } = data;
  
  if (!phone || !amount || !orderId || !paymentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  const normalizedPhone = phone.startsWith('255') ? phone : phone.startsWith('0') ? `255${phone.slice(1)}` : `255${phone}`;

  try {
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const stkRequest = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: normalizedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: `FD-${orderId.slice(0, 8)}`,
      TransactionDesc: 'Food Order Payment'
    };

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      stkRequest,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    await admin.firestore().collection('payments').doc(paymentId).set({
      orderId,
      phone: normalizedPhone,
      amount,
      mpesaCheckoutId: response.data.CheckoutRequestID,
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, checkoutId: response.data.CheckoutRequestID };
  } catch (error) {
    console.error('STK Push error:', error.message);
    await admin.firestore().collection('payments').doc(paymentId).set({
      status: 'failed',
      error: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    throw new functions.https.HttpsError('internal', 'Payment initiation failed');
  }
});

exports.mpesaCallback = functions.https.onRequest(async (req, res) => {
  const { Body } = req.body;
  if (!Body?.stkCallback) {
    res.status(400).send('Invalid callback');
    return;
  }

  const callback = Body.stkCallback;
  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode;

  try {
    const paymentsSnapshot = await admin.firestore()
      .collection('payments')
      .where('mpesaCheckoutId', '==', checkoutRequestId)
      .limit(1)
      .get();

    if (paymentsSnapshot.empty) {
      res.status(200).send('OK');
      return;
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentData = paymentDoc.data();

    if (resultCode === 0) {
      const receiptNumber = callback.CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value;

      await paymentDoc.ref.update({
        status: 'completed',
        mpesaReceiptNumber: receiptNumber,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await admin.firestore().collection('orders').doc(paymentData.orderId).update({
        paymentStatus: 'completed',
        paymentId: paymentDoc.id,
        status: 'confirmed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await paymentDoc.ref.update({
        status: 'failed',
        errorMessage: callback.ResultDesc,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await admin.firestore().collection('orders').doc(paymentData.orderId).update({
        paymentStatus: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send('Error');
  }
});

// Send notification to driver when new order arrives
exports.notifyDrivers = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    if (order.status !== 'pending') return null;

    const driversSnapshot = await admin.firestore()
      .collection('riders')
      .where('isOnline', '==', true)
      .get();

    const tokens = [];
    driversSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'New Order Available!',
          body: `Order #${context.params.orderId.slice(0, 8)} - TZS ${order.total}`
        },
        data: {
          orderId: context.params.orderId,
          type: 'new_order'
        },
        tokens: tokens
      };

      await admin.messaging().sendMulticast(message);
    }

    return null;
  });

// Update driver stats when order is delivered
exports.updateDriverStats = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'delivered' && after.status === 'delivered' && after.riderId) {
      const driverRef = admin.firestore().collection('riders').doc(after.riderId);
      
      await driverRef.set({
        totalDeliveries: admin.firestore.FieldValue.increment(1),
        totalEarnings: admin.firestore.FieldValue.increment(after.total || 0),
        lastDelivery: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return null;
  });

// HTTP endpoint to send notifications
exports.sendNotification = functions.https.onCall(async (data, context) => {
  const { token, title, body, data: payload } = data;
  
  if (!token || !title) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  const message = {
    notification: { title, body },
    data: payload || {},
    token: token
  };

  await admin.messaging().send(message);
  return { success: true };
});

// Notify shop owner when new shop order arrives
exports.notifyShopOwner = functions.firestore
  .document('shop_orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    if (order.status !== 'pending') return null;

    try {
      // Get shop information
      const shopDoc = await admin.firestore()
        .collection('shops')
        .doc(order.shopId)
        .get();

      if (!shopDoc.exists) {
        console.error('Shop not found:', order.shopId);
        return null;
      }

      const shop = shopDoc.data();

      // Get owner's FCM token
      const ownerDoc = await admin.firestore()
        .collection('users')
        .doc(shop.ownerId)
        .get();

      if (!ownerDoc.exists || !ownerDoc.data().fcmToken) {
        console.log('Owner FCM token not found');
        return null;
      }

      const message = {
        notification: {
          title: 'Oda Mpya! (New Order!)',
          body: `Oda #${context.params.orderId.slice(0, 8)} - TZS ${order.total}`
        },
        data: {
          orderId: context.params.orderId,
          shopId: order.shopId,
          type: 'new_shop_order'
        },
        token: ownerDoc.data().fcmToken
      };

      await admin.messaging().send(message);
      console.log('Shop owner notified successfully');
    } catch (error) {
      console.error('Error notifying shop owner:', error);
    }

    return null;
  });

// Notify rider when new shop order is ready for pickup
exports.notifyRidersForShopOrder = functions.firestore
  .document('shop_orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only notify when order status changes to 'ready' (shop has prepared the order)
    if (before.status !== 'ready' || after.status !== 'ready' || after.riderId) {
      return null;
    }

    try {
      // Get online riders
      const ridersSnapshot = await admin.firestore()
        .collection('riders')
        .where('isOnline', '==', true)
        .get();

      const tokens = [];
      ridersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) tokens.push(data.fcmToken);
      });

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: 'Oda ya Duka Tayari! (Shop Order Ready!)',
            body: `Oda #${context.params.orderId.slice(0, 8)} - TZS ${after.total}`
          },
          data: {
            orderId: context.params.orderId,
            shopId: after.shopId,
            type: 'shop_order_ready'
          },
          tokens: tokens
        };

        await admin.messaging().sendMulticast(message);
        console.log('Riders notified for shop order');
      }
    } catch (error) {
      console.error('Error notifying riders for shop order:', error);
    }

    return null;
  });

// Update shop statistics when order is delivered
exports.updateShopStats = functions.firestore
  .document('shop_orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'delivered' && after.status === 'delivered') {
      try {
        const shopRef = admin.firestore().collection('shops').doc(after.shopId);
        
        await shopRef.set({
          totalOrders: admin.firestore.FieldValue.increment(1),
          totalRevenue: admin.firestore.FieldValue.increment(after.total || 0),
          lastOrder: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update product stock quantities
        if (after.items && Array.isArray(after.items)) {
          const batch = admin.firestore().batch();
          
          for (const item of after.items) {
            const productRef = admin.firestore().collection('products').doc(item.id);
            batch.update(productRef, {
              stockQuantity: admin.firestore.FieldValue.increment(-item.quantity),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          
          await batch.commit();
        }

        console.log('Shop stats updated');
      } catch (error) {
        console.error('Error updating shop stats:', error);
      }
    }

    return null;
  });

// Update driver stats for shop orders
exports.updateDriverStatsForShopOrder = functions.firestore
  .document('shop_orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'delivered' && after.status === 'delivered' && after.riderId) {
      try {
        const driverRef = admin.firestore().collection('riders').doc(after.riderId);
        
        await driverRef.set({
          totalDeliveries: admin.firestore.FieldValue.increment(1),
          totalEarnings: admin.firestore.FieldValue.increment(after.deliveryFee || 0),
          lastDelivery: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('Driver stats updated for shop order');
      } catch (error) {
        console.error('Error updating driver stats for shop order:', error);
      }
    }

    return null;
  });
// Export the Express API
const apiApp = require('./app');
exports.api = functions.https.onRequest(apiApp);

// --- Supabase Sync Triggers ---

exports.syncUserToSupabase = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return null; // Deletions handled differently if needed
    
    // Map Firebase User to Supabase Profile
    const profile = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'customer',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    return syncToSupabase('profiles', profile, context.params.userId);
  });

exports.syncRestaurantToSupabase = functions.firestore
  .document('restaurants/{restId}')
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return null;
    
    const restaurant = {
      name: data.name,
      description: data.description,
      category: data.category,
      delivery_fee: data.deliveryFee,
      delivery_time_minutes: data.deliveryTimeMinutes,
      is_open: data.isOpen,
      rating: data.rating,
      address: data.address,
      latitude: data.lat,
      longitude: data.lng,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    return syncToSupabase('restaurants', restaurant, context.params.restId);
  });

exports.syncOrderToSupabase = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return null;
    
    const order = {
      customer_id: data.userId,
      restaurant_id: data.restaurantId,
      driver_id: data.riderId,
      total: data.total,
      status: data.status,
      payment_status: data.paymentStatus,
      delivery_address: data.deliveryAddress,
      items: data.items, // JSONB in Supabase
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    return syncToSupabase('orders', order, context.params.orderId);
  });
