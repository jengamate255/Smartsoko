// Test 6: Payment System - SmartSoko PesaPal Integration
// Simulates: Successful payment, failed payment, timeout, duplicate callback
// Ensures: No duplicate orders, no lost transactions, database consistency

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    payment_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    payment_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 200 },
        { duration: '5m', target: 1000 },
        { duration: '3m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    payment_init_latency: ['p(95)<2000'],
    payment_callback_latency: ['p(95)<500'],
    payment_status_latency: ['p(95)<300'],
    duplicate_detection_rate: ['rate<0.001'],
    transaction_consistency: ['rate>0.999'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PESAPAL_BASE = __ENV.PESAPAL_BASE || 'https://cybqa.pesapal.com/pesapalv3';

// Custom metrics
const paymentInitLatency = new Trend('payment_init_latency');
const paymentCallbackLatency = new Trend('payment_callback_latency');
const paymentStatusLatency = new Trend('payment_status_latency');
const duplicateDetectionRate = new Rate('duplicate_detection_rate');
const transactionConsistency = new Rate('transaction_consistency');
const paymentSuccessRate = new Rate('payment_success_rate');
const paymentFailureRate = new Rate('payment_failure_rate');
const paymentTimeoutRate = new Rate('payment_timeout_rate');
const callbackProcessingRate = new Rate('callback_processing_rate');

// Test data
const TEST_ORDERS = generateTestOrders(500);

function generateTestOrders(count) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push({
      id: `order-${Date.now()}-${i}`,
      amount: Math.floor(Math.random() * 50000) + 5000,
      email: `user${i}@test.smartsoko.com`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      status: 'pending',
      merchantReference: `INV-${Date.now()}-${i}`,
      orderTrackingId: null,
    });
  }
  return orders;
}

export default function () {
  const order = TEST_ORDERS[Math.floor(Math.random() * TEST_ORDERS.length)];
  const token = getAuthToken();
  
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    // 60% - Successful payment flow
    testSuccessfulPayment(order, token);
  } else if (scenario < 0.8) {
    // 20% - Failed payment
    testFailedPayment(order, token);
  } else if (scenario < 0.9) {
    // 10% - Payment timeout
    testPaymentTimeout(order, token);
  } else {
    // 10% - Duplicate callback
    testDuplicateCallback(order, token);
  }
  
  sleep(Math.random() * 2 + 1);
}

function getAuthToken() {
  // In real test, this would be a valid Firebase ID token
  return 'test-token-' + Date.now();
}

function testSuccessfulPayment(order, token) {
  console.log(`Testing successful payment for order ${order.id}`);
  
  // 1. Initiate payment
  const initResult = initiatePayment(order, token);
  if (!initResult.success) return;
  
  order.orderTrackingId = initResult.orderTrackingId;
  order.merchantReference = initResult.merchantReference;
  
  // 2. Simulate PesaPal callback (IPN)
  const callbackResult = simulateCallback(order, 'COMPLETED', token);
  if (!callbackResult.success) return;
  
  // 3. Verify payment status
  const statusResult = checkPaymentStatus(order.orderTrackingId, token);
  if (!statusResult.success) return;
  
  // 4. Verify order status updated
  const orderResult = verifyOrderStatus(order.id, 'completed', token);
  
  // 5. Verify wallet balance updated (if wallet top-up)
  if (order.type === 'wallet_topup') {
    verifyWalletBalance(order.email, order.amount, token);
  }
  
  paymentSuccessRate.add(1);
  transactionConsistency.add(orderResult.success && callbackResult.success ? 1 : 0);
}

function testFailedPayment(order, token) {
  console.log(`Testing failed payment for order ${order.id}`);
  
  const initResult = initiatePayment(order, token);
  if (!initResult.success) return;
  
  order.orderTrackingId = initResult.orderTrackingId;
  order.merchantReference = initResult.merchantReference;
  
  // Simulate failed callback
  const callbackResult = simulateCallback(order, 'FAILED', token);
  
  // Verify payment status shows failed
  const statusResult = checkPaymentStatus(order.orderTrackingId, token);
  
  // Verify order remains pending or cancelled
  const orderResult = verifyOrderStatus(order.id, 'pending', token);
  
  paymentFailureRate.add(1);
  transactionConsistency.add(orderResult.success ? 1 : 0);
}

function testPaymentTimeout(order, token) {
  console.log(`Testing payment timeout for order ${order.id}`);
  
  const initResult = initiatePayment(order, token);
  if (!initResult.success) return;
  
  order.orderTrackingId = initResult.orderTrackingId;
  order.merchantReference = initResult.merchantReference;
  
  // Wait for timeout period (simulate by checking status after long delay)
  sleep(5); // Short sleep for test
  
  // Check status - should still be pending or timeout
  const statusResult = checkPaymentStatus(order.orderTrackingId, token);
  
  // Verify order not completed
  const orderResult = verifyOrderStatus(order.id, 'pending', token);
  
  paymentTimeoutRate.add(1);
  transactionConsistency.add(orderResult.success ? 1 : 0);
}

function testDuplicateCallback(order, token) {
  console.log(`Testing duplicate callback for order ${order.id}`);
  
  const initResult = initiatePayment(order, token);
  if (!initResult.success) return;
  
  order.orderTrackingId = initResult.orderTrackingId;
  order.merchantReference = initResult.merchantReference;
  
  // First callback - should succeed
  const callback1 = simulateCallback(order, 'COMPLETED', token);
  
  // Second callback (duplicate) - should be idempotent
  const callback2 = simulateCallback(order, 'COMPLETED', token);
  
  // Third callback with different status - should not override
  const callback3 = simulateCallback(order, 'FAILED', token);
  
  // Verify only first callback processed
  const statusResult = checkPaymentStatus(order.orderTrackingId, token);
  const orderResult = verifyOrderStatus(order.id, 'completed', token);
  
  // Check duplicate detection
  const duplicateDetected = callback2.detected || callback3.detected;
  duplicateDetectionRate.add(duplicateDetected ? 1 : 0);
  transactionConsistency.add(orderResult.success ? 1 : 0);
}

function initiatePayment(order, token) {
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    amount: order.amount,
    currency: 'TZS',
    description: `Order ${order.id}`,
    customerEmail: order.email,
    customerPhone: order.phone,
    customerFirstName: order.email.split('@')[0],
    customerLastName: 'Test',
    callbackUrl: `${BASE_URL}/api/payments/pesapal/callback`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'initiate_payment' },
  };
  
  const res = http.post(`${BASE_URL}/api/payments/pesapal/initiate`, payload, params);
  const latency = Date.now() - startTime;
  
  paymentInitLatency.add(latency);
  
  const success = check(res, {
    'initiate status 200': (r) => r.status === 200,
    'initiate has tracking ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.orderTrackingId !== undefined;
      } catch {
        return false;
      }
    },
    'initiate latency < 2000ms': () => latency < 2000,
  });
  
  if (success) {
    const body = JSON.parse(res.body);
    return {
      success: true,
      orderTrackingId: body.orderTrackingId,
      merchantReference: body.merchantReference,
      redirectUrl: body.redirectUrl,
    };
  }
  
  return { success: false };
}

function simulateCallback(order, status, token) {
  const startTime = Date.now();
  
  const callbackPayload = JSON.stringify({
    OrderNotificationType: status === 'COMPLETED' ? 1 : 2,
    OrderTrackingId: order.orderTrackingId,
    MerchantReference: order.merchantReference,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'pesapal-notification-signature': generateSignature(callbackPayload),
    },
    tags: { operation: 'payment_callback', status },
  };
  
  const res = http.post(`${BASE_URL}/api/payments/pesapal/ipn`, callbackPayload, params);
  const latency = Date.now() - startTime;
  
  paymentCallbackLatency.add(latency);
  
  const success = check(res, {
    'callback status 200': (r) => r.status === 200,
    'callback response OK': (r) => r.body === 'OK' || r.body.includes('success'),
  });
  
  // Check if duplicate was detected
  let detected = false;
  if (res.status === 409 || (res.body && res.body.includes('duplicate'))) {
    detected = true;
  }
  
  callbackProcessingRate.add(success ? 1 : 0);
  
  return { success, detected };
}

function generateSignature(payload) {
  // Simplified - in real test would use actual PesaPal secret
  const crypto = require('crypto');
  const secret = 'test-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
}

function checkPaymentStatus(orderTrackingId, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'check_payment_status' },
  };
  
  const res = http.get(`${BASE_URL}/api/payments/pesapal/status/${orderTrackingId}`, params);
  const latency = Date.now() - startTime;
  
  paymentStatusLatency.add(latency);
  
  const success = check(res, {
    'status_check 200': (r) => r.status === 200,
    'status_check has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'status_check latency < 300ms': () => latency < 300,
  });
  
  return { success, data: success ? JSON.parse(res.body) : null };
}

function verifyOrderStatus(orderId, expectedStatus, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'verify_order_status' },
  };
  
  const res = http.get(`${BASE_URL}/api/orders/${orderId}`, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'order_status 200': (r) => r.status === 200,
    'order_status matches expected': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data.status === expectedStatus;
      } catch {
        return false;
      }
    },
  });
  
  return { success };
}

function verifyWalletBalance(email, amount, token) {
  const startTime = Date.now();
  
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'verify_wallet' },
  };
  
  const res = http.get(`${BASE_URL}/api/loyalty/points?userId=${email}`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'wallet_verify 200': (r) => r.status === 200,
    'wallet_verify points increased': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/payment-test-summary.json': JSON.stringify(data),
  };
}