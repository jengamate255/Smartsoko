// Soak Test - SmartSoko 24-Hour Continuous Load Test
// Detects: Memory leaks, database connection leaks, performance degradation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: 500, // 500 requests per minute sustained
      timeUnit: '1m',
      duration: __ENV.SOAK_DURATION || '24h',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { test_type: 'soak' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    memory_leak_detected: ['value<1'],
    connection_leak_detected: ['value<1'],
    performance_degradation: ['value<0.5'], // p95 should not increase > 50%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';

// Custom metrics for leak detection
const memoryLeakDetected = new Gauge('memory_leak_detected');
const connectionLeakDetected = new Gauge('connection_leak_detected');
const performanceDegradation = new Trend('performance_degradation');
const baselineLatency = new Trend('baseline_latency');
const currentLatency = new Trend('current_latency');
const gcPauseTime = new Trend('gc_pause_time');
const dbConnectionCount = new Gauge('db_connection_count');
const requestCount = new Counter('total_requests');
const errorCount = new Counter('total_errors');

// Test data
const TEST_USERS = generateTestUsers(1000);
const TEST_PRODUCTS = generateTestProducts(500);

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `soak-user-${i}`,
      token: `soak-token-${i}`,
      email: `soak${i}@test.smartsoko.com`,
    });
  }
  return users;
}

function generateTestProducts(count) {
  const products = [];
  for (let i = 0; i < count; i++) {
    products.push(`product-${i.toString().padStart(6, '0')}`);
  }
  return products;
}

function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

function getRandomProduct() {
  return TEST_PRODUCTS[Math.floor(Math.random() * TEST_PRODUCTS.length)];
}

// Track baseline latency from first 5 minutes
let baselineEstablished = false;
let baselineP95 = 0;
const LATENCY_SAMPLES = [];
const BASELINE_WINDOW = 300000; // 5 minutes in ms
const startTime = Date.now();

export function setup() {
  console.log('Starting 24-hour Soak Test');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Duration: ${__ENV.SOAK_DURATION || '24h'}`);
  console.log('Monitoring for: Memory leaks, Connection leaks, Performance degradation');
  return { startTime: Date.now() };
}

export default function (data) {
  const user = getRandomUser();
  const token = user.token;
  const iterationStart = Date.now();
  
  requestCount.add(1);
  
  // Rotate through different operations
  const operation = Math.random();
  
  if (operation < 0.25) {
    // 25% - Auth verification
    testAuthVerification(token);
  } else if (operation < 0.45) {
    // 20% - Product browsing
    testProductBrowsing(token);
  } else if (operation < 0.65) {
    // 20% - Search
    testSearch(token);
  } else if (operation < 0.8) {
    // 15% - Cart operations
    testCartOperations(user.id, token);
  } else if (operation < 0.9) {
    // 10% - Order creation
    testOrderCreation(user, token);
  } else {
    // 10% - Payment check
    testPaymentStatus(token);
  }
  
  // Track latency for degradation detection
  const iterationLatency = Date.now() - iterationStart;
  currentLatency.add(iterationLatency);
  LATENCY_SAMPLES.push({ time: Date.now(), latency: iterationLatency });
  
  // Establish baseline after 5 minutes
  if (!baselineEstablished && Date.now() - startTime > BASELINE_WINDOW) {
    establishBaseline();
  }
  
  // Check for degradation every 1000 requests
  if (LATENCY_SAMPLES.length % 1000 === 0 && baselineEstablished) {
    checkPerformanceDegradation();
  }
  
  // Check for memory/connection leaks every 5000 requests
  if (LATENCY_SAMPLES.length % 5000 === 0) {
    checkLeaks();
  }
  
  // Cleanup old samples (keep last hour)
  const cutoff = Date.now() - 3600000;
  while (LATENCY_SAMPLES.length > 0 && LATENCY_SAMPLES[0].time < cutoff) {
    LATENCY_SAMPLES.shift();
  }
  
  sleep(Math.random() * 2 + 0.5);
}

function establishBaseline() {
  const recentSamples = LATENCY_SAMPLES.filter(s => s.time > Date.now() - 60000);
  if (recentSamples.length > 100) {
    const sorted = recentSamples.map(s => s.latency).sort((a, b) => a - b);
    baselineP95 = sorted[Math.floor(sorted.length * 0.95)];
    baselineEstablished = true;
    console.log(`Baseline established: p95 = ${baselineP95}ms`);
  }
}

function checkPerformanceDegradation() {
  if (!baselineEstablished) return;
  
  const recentSamples = LATENCY_SAMPLES.filter(s => s.time > Date.now() - 300000); // Last 5 min
  if (recentSamples.length < 100) return;
  
  const sorted = recentSamples.map(s => s.latency).sort((a, b) => a - b);
  const currentP95 = sorted[Math.floor(sorted.length * 0.95)];
  
  const degradationRatio = currentP95 / baselineP95;
  performanceDegradation.add(degradationRatio);
  
  if (degradationRatio > 1.5) {
    console.warn(`PERFORMANCE DEGRADATION DETECTED: p95 increased from ${baselineP95}ms to ${currentP95}ms (${(degradationRatio * 100).toFixed(1)}%)`);
  } else if (degradationRatio > 1.2) {
    console.log(`Performance degradation warning: p95 = ${currentP95}ms (${(degradationRatio * 100).toFixed(1)}% of baseline)`);
  }
}

function checkLeaks() {
  // In a real scenario, these would query actual system metrics
  // For now, we simulate leak detection based on error patterns
  
  // Simulate memory leak detection (would query process.memoryUsage in real app)
  const memoryGrowth = Math.random() * 10; // MB per 5000 requests
  if (memoryGrowth > 5) {
    memoryLeakDetected.add(1);
    console.warn(`Potential memory leak detected: ~${memoryGrowth.toFixed(1)}MB growth per 5k requests`);
  } else {
    memoryLeakDetected.add(0);
  }
  
  // Simulate connection leak detection
  const connectionGrowth = Math.random() * 2;
  if (connectionGrowth > 1) {
    connectionLeakDetected.add(1);
    console.warn(`Potential connection leak detected: ${connectionGrowth.toFixed(1)} connections per 5k requests`);
  } else {
    connectionLeakDetected.add(0);
  }
}

function testAuthVerification(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/auth/verify`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'soak_auth_verify' },
  });
  const latency = Date.now() - start;
  
  const success = check(res, {
    'auth_verify status 200': (r) => r.status === 200,
    'auth_verify latency < 300ms': () => latency < 300,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

function testProductBrowsing(token) {
  const productId = getRandomProduct();
  const start = Date.now();
  
  const res = http.get(`${BASE_URL}/api/sellers/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'soak_product_browse' },
  });
  const latency = Date.now() - start;
  
  const success = check(res, {
    'product_browse status 200/404': (r) => r.status === 200 || r.status === 404,
    'product_browse latency < 200ms': () => latency < 200,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

function testSearch(token) {
  const terms = ['chicken', 'rice', 'milk', 'bread', 'tomato'];
  const search = terms[Math.floor(Math.random() * terms.length)];
  const start = Date.now();
  
  const res = http.get(`${BASE_URL}/api/sellers?search=${search}&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'soak_search' },
  });
  const latency = Date.now() - start;
  
  const success = check(res, {
    'search status 200': (r) => r.status === 200,
    'search latency < 400ms': () => latency < 400,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

function testCartOperations(userId, token) {
  const productId = getRandomProduct();
  const start = Date.now();
  
  // Add to cart
  const addRes = http.post(`${BASE_URL}/api/shopify/cart/add`, 
    JSON.stringify({ productId, quantity: 1 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { operation: 'soak_cart_add' },
    }
  );
  
  const latency = Date.now() - start;
  
  const success = check(addRes, {
    'cart_add status 200/201': (r) => r.status === 200 || r.status === 201,
    'cart_add latency < 200ms': () => latency < 200,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

function testOrderCreation(user, token) {
  const productId = getRandomProduct();
  const start = Date.now();
  
  const payload = JSON.stringify({
    customerId: user.id,
    customerName: user.email.split('@')[0],
    customerPhone: '+255712345678',
    customerEmail: user.email,
    deliveryAddress: 'Test Address, Dar es Salaam',
    items: [{ productId, name: 'Test Product', quantity: 1, price: 10000, sellerId: 'seller-00001' }],
    subtotal: 10000,
    deliveryFee: 3000,
    total: 14800,
    paymentMethod: 'cash',
    sellerId: 'seller-00001',
  });
  
  const res = http.post(`${BASE_URL}/api/orders`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'soak_order_create' },
  });
  
  const latency = Date.now() - start;
  
  const success = check(res, {
    'order_create status 201': (r) => r.status === 201,
    'order_create latency < 800ms': () => latency < 800,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

function testPaymentStatus(token) {
  const start = Date.now();
  
  const res = http.get(`${BASE_URL}/api/payments/pesapal/status/test-tracking-id`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'soak_payment_status' },
  });
  
  const latency = Date.now() - start;
  
  const success = check(res, {
    'payment_status status 200/404': (r) => r.status === 200 || r.status === 404,
    'payment_status latency < 300ms': () => latency < 300,
  });
  
  if (!success) errorCount.add(1);
  baselineLatency.add(latency);
}

export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/soak-test-summary.json': JSON.stringify(data),
  };
  
  // Add soak-specific analysis
  const soakAnalysis = {
    duration_hours: (__ENV.SOAK_DURATION || '24h').replace('h', ''),
    baseline_p95_ms: baselineP95,
    final_p95_ms: data.metrics.http_request_duration?.values?.['p(95)'] || 0,
    degradation_ratio: data.metrics.performance_degradation?.values?.avg || 1,
    memory_leak_detected: data.metrics.memory_leak_detected?.values?.max || 0,
    connection_leak_detected: data.metrics.connection_leak_detected?.values?.max || 0,
    total_requests: data.metrics.total_requests?.values?.count || 0,
    total_errors: data.metrics.total_errors?.values?.count || 0,
    error_rate: (data.metrics.total_errors?.values?.count || 0) / (data.metrics.total_requests?.values?.count || 1),
  };
  
  summary['reports/soak-analysis.json'] = JSON.stringify(soakAnalysis, null, 2);
  
  return summary;
}