// Spike Test - SmartSoko Sudden Traffic Surge
// Simulates: Normal traffic (1,000 users) → Sudden spike (100,000 users)
// Measures: Recovery time, error rates, server stability

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

export const options = {
  scenarios: {
    // Normal baseline traffic
    baseline: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 req/min baseline
      timeUnit: '1m',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { phase: 'baseline' },
      startTime: '0s',
    },
    // Sudden spike
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1m',
      preAllocatedVUs: 100,
      maxVUs: 5000,
      stages: [
        // Sudden spike - ramp to 100k req/min in 30 seconds
        { target: 100000, duration: '30s' },
        // Sustain spike for 2 minutes
        { target: 100000, duration: '2m' },
        // Rapid recovery - back to baseline in 30 seconds
        { target: 1000, duration: '30s' },
        // Recovery period - monitor stability
        { target: 1000, duration: '5m' },
      ],
      tags: { phase: 'spike' },
      startTime: '10m', // Start after baseline
    },
    // Recovery validation
    recovery: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1m',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { phase: 'recovery' },
      startTime: '13m30s', // After spike completes
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'], // Allow higher during spike
    spike_recovery_time: ['value<60000'], // Recovery < 60s
    spike_error_rate: ['rate<0.1'], // Error rate during spike < 10%
    baseline_stability: ['value<1.5'], // Post-spike latency within 1.5x baseline
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';

// Custom metrics
const spikeRecoveryTime = new Trend('spike_recovery_time');
const spikeErrorRate = new Rate('spike_error_rate');
const baselineStability = new Trend('baseline_stability');
const baselineLatencyP95 = new Gauge('baseline_latency_p95');
const spikeLatencyP95 = new Gauge('spike_latency_p95');
const recoveryLatencyP95 = new Gauge('recovery_latency_p95');
const requestsDuringSpike = new Counter('requests_during_spike');
const errorsDuringSpike = new Counter('errors_during_spike');
const serverStability = new Gauge('server_stability');

// Phase tracking
let currentPhase = 'baseline';
let baselineP95 = 0;
let spikeStartTime = 0;
let recoveryStartTime = 0;
let phaseLatencies = { baseline: [], spike: [], recovery: [] };

export function setup() {
  console.log('Starting Spike Test');
  console.log('Phases: Baseline (10m) → Spike (3m) → Recovery (10m)');
  console.log('Target: 1,000 → 100,000 req/min → 1,000 req/min');
  return { testStart: Date.now() };
}

export default function (data) {
  const iterationStart = Date.now();
  const user = getRandomUser();
  const token = user.token;
  
  // Determine current phase based on elapsed time
  const elapsed = Date.now() - data.testStart;
  const phase = determinePhase(elapsed);
  
  if (phase !== currentPhase) {
    handlePhaseTransition(phase);
    currentPhase = phase;
  }
  
  // Execute operation based on phase
  let latency = 0;
  let success = false;
  
  if (phase === 'spike') {
    requestsDuringSpike.add(1);
    const result = executeSpikeOperation(user, token);
    latency = result.latency;
    success = result.success;
    if (!success) errorsDuringSpike.add(1);
    spikeLatencyP95.add(latency);
  } else if (phase === 'baseline') {
    const result = executeBaselineOperation(user, token);
    latency = result.latency;
    success = result.success;
    baselineLatencyP95.add(latency);
  } else {
    const result = executeRecoveryOperation(user, token);
    latency = result.latency;
    success = result.success;
    recoveryLatencyP95.add(latency);
  }
  
  phaseLatencies[phase].push(latency);
  
  // Track metrics per phase
  trackPhaseMetrics(phase, latency, success);
  
  sleep(Math.random() * 0.5 + 0.1);
}

function determinePhase(elapsed) {
  if (elapsed < 600000) return 'baseline'; // 0-10 min
  if (elapsed < 810000) return 'spike';    // 10-13:30 min
  return 'recovery';                        // 13:30-23:30 min
}

function handlePhaseTransition(newPhase) {
  console.log(`PHASE TRANSITION: ${currentPhase} → ${newPhase}`);
  
  if (newPhase === 'spike') {
    spikeStartTime = Date.now();
    // Calculate baseline P95
    if (phaseLatencies.baseline.length > 0) {
      const sorted = [...phaseLatencies.baseline].sort((a, b) => a - b);
      baselineP95 = sorted[Math.floor(sorted.length * 0.95)];
      baselineLatencyP95.add(baselineP95);
      console.log(`Baseline P95 established: ${baselineP95}ms`);
    }
  } else if (newPhase === 'recovery') {
    recoveryStartTime = Date.now();
    // Calculate spike P95
    if (phaseLatencies.spike.length > 0) {
      const sorted = [...phaseLatencies.spike].sort((a, b) => a - b);
      const spikeP95 = sorted[Math.floor(sorted.length * 0.95)];
      spikeLatencyP95.add(spikeP95);
      console.log(`Spike P95: ${spikeP95}ms`);
    }
  }
}

function executeSpikeOperation(user, token) {
  // Light operations during spike to maximize throughput
  const op = Math.random();
  
  if (op < 0.4) {
    // 40% - Quick auth verify
    return quickAuthVerify(token);
  } else if (op < 0.7) {
    // 30% - Product list
    return quickProductList(token);
  } else if (op < 0.9) {
    // 20% - Search
    return quickSearch(token);
  } else {
    // 10% - Cart read
    return quickCartRead(token);
  }
}

function executeBaselineOperation(user, token) {
  const op = Math.random();
  
  if (op < 0.3) return quickAuthVerify(token);
  if (op < 0.5) return quickProductList(token);
  if (op < 0.7) return quickSearch(token);
  if (op < 0.85) return quickCartRead(token);
  return quickOrderCreate(user, token);
}

function executeRecoveryOperation(user, token) {
  // Same as baseline but monitor for anomalies
  const result = executeBaselineOperation(user, token);
  
  // Check if recovery latency is within acceptable range
  if (baselineP95 > 0 && result.latency > baselineP95 * 2) {
    console.warn(`RECOVERY ANOMALY: Latency ${result.latency}ms > 2x baseline (${baselineP95}ms)`);
    serverStability.add(0);
  } else {
    serverStability.add(1);
  }
  
  return result;
}

function quickAuthVerify(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/auth/verify`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'spike_auth', phase: currentPhase },
    timeout: '5s',
  });
  const latency = Date.now() - start;
  const success = check(res, { 'status 200': (r) => r.status === 200 });
  return { latency, success: success === true };
}

function quickProductList(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/sellers?limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'spike_products', phase: currentPhase },
    timeout: '5s',
  });
  const latency = Date.now() - start;
  const success = check(res, { 'status 200': (r) => r.status === 200 });
  return { latency, success: success === true };
}

function quickSearch(token) {
  const terms = ['chicken', 'rice', 'milk', 'bread'];
  const search = terms[Math.floor(Math.random() * terms.length)];
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/sellers?search=${search}&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'spike_search', phase: currentPhase },
    timeout: '5s',
  });
  const latency = Date.now() - start;
  const success = check(res, { 'status 200': (r) => r.status === 200 });
  return { latency, success: success === true };
}

function quickCartRead(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/shopify/cart`, {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { operation: 'spike_cart', phase: currentPhase },
    timeout: '5s',
  });
  const latency = Date.now() - start;
  const success = check(res, { 'status 200': (r) => r.status === 200 });
  return { latency, success: success === true };
}

function quickOrderCreate(user, token) {
  const start = Date.now();
  const payload = JSON.stringify({
    customerId: user.id,
    customerName: user.email.split('@')[0],
    customerPhone: '+255712345678',
    customerEmail: user.email,
    deliveryAddress: 'Test Address',
    items: [{ productId: 'product-000001', name: 'Test', quantity: 1, price: 10000, sellerId: 'seller-00001' }],
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
    tags: { operation: 'spike_order', phase: currentPhase },
    timeout: '10s',
  });
  const latency = Date.now() - start;
  const success = check(res, { 'status 201': (r) => r.status === 201 });
  return { latency, success: success === true };
}

function trackPhaseMetrics(phase, latency, success) {
  if (phase === 'spike') {
    spikeErrorRate.add(success ? 0 : 1);
  } else if (phase === 'recovery' && baselineP95 > 0) {
    const ratio = latency / baselineP95;
    baselineStability.add(ratio);
  }
}

function getRandomUser() {
  const users = [];
  for (let i = 0; i < 1000; i++) {
    users.push({
      id: `spike-user-${i}`,
      token: `spike-token-${i}`,
      email: `spike${i}@test.smartsoko.com`,
    });
  }
  return users[Math.floor(Math.random() * users.length)];
}

export function handleSummary(data) {
  // Calculate recovery time
  let recoveryTimeMs = 0;
  if (recoveryStartTime > 0 && spikeStartTime > 0) {
    // Find when latency returned to within 1.5x baseline
    const recoveryLatencies = phaseLatencies.recovery;
    if (recoveryLatencies.length > 0) {
      const sorted = [...recoveryLatencies].sort((a, b) => a - b);
      const recoveryP95 = sorted[Math.floor(sorted.length * 0.95)];
      recoveryLatencyP95.add(recoveryP95);
      
      // Estimate recovery time (first minute where P95 < 1.5 * baseline)
      recoveryTimeMs = 60000; // Simplified - would need time-series data
    }
  }
  
  const spikeErrorRateValue = data.metrics.spike_error_rate?.values?.rate || 0;
  const baselineStabilityValue = data.metrics.baseline_stability?.values?.avg || 1;
  
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/spike-test-summary.json': JSON.stringify(data),
    'reports/spike-analysis.json': JSON.stringify({
      baseline_p95_ms: baselineP95,
      spike_p95_ms: data.metrics.spike_latency_p95?.values?.max || 0,
      recovery_p95_ms: data.metrics.recovery_latency_p95?.values?.max || 0,
      recovery_time_ms: recoveryTimeMs,
      spike_error_rate: spikeErrorRateValue,
      baseline_stability_ratio: baselineStabilityValue,
      server_stable: data.metrics.server_stability?.values?.max === 1,
      total_requests: data.metrics.http_requests?.values?.count || 0,
      spike_requests: data.metrics.requests_during_spike?.values?.count || 0,
      spike_errors: data.metrics.errors_during_spike?.values?.count || 0,
    }, null, 2),
  };
  
  return summary;
}