// Test 1: Customer Registration/Login - SmartSoko Auth System
// Tests: 100 users, 1,000 users, 10,000 users
// Measures: Response time, failed requests, authentication speed

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
    // Load test - 100 users
    load_100: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load', level: '100' },
    },
    // Load test - 1,000 users
    load_1k: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'load', level: '1k' },
    },
    // Stress test - 10,000 users
    stress_10k: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10m', target: 5000 },
        { duration: '15m', target: 10000 },
        { duration: '10m', target: 0 },
      ],
      tags: { test_type: 'stress', level: '10k' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    auth_latency: ['p(95)<300'],
    auth_failure_rate: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';

// Custom metrics
const authLatency = new Trend('auth_latency');
const authFailureRate = new Rate('auth_failure_rate');
const registrationRate = new Rate('registration_rate');
const loginRate = new Rate('login_rate');
const tokenRefreshRate = new Rate('token_refresh_rate');

// Test data
const testUsers = generateTestUsers(5000);

function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `loadtest_${i}_${Date.now()}@smartsoko.test`,
      password: 'LoadTest123!',
      displayName: `LoadTest User ${i}`,
      phone: `+2557${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
    });
  }
  return users;
}

function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

export function setup() {
  console.log('Test 1: Customer Registration/Login - SmartSoko');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Firebase API Key: ${FIREBASE_API_KEY ? 'SET' : 'NOT SET'}`);
  
  // Pre-register some users for login tests
  const preRegUsers = [];
  for (let i = 0; i < 100; i++) {
    preRegUsers.push(testUsers[i]);
  }
  return { preRegUsers };
}

export default function (data) {
  const user = getRandomUser();
  const preRegUser = data.preRegUsers[Math.floor(Math.random() * data.preRegUsers.length)];
  
  // 1. Test User Registration (Firebase Auth)
  const registerResult = testRegistration(user);
  
  // 2. Test User Login (Firebase Auth)
  const loginResult = testLogin(preRegUser);
  
  // 3. Test Token Verification (Backend API)
  if (loginResult.token) {
    testTokenVerification(loginResult.token);
  }
  
  // 4. Test Token Refresh
  if (loginResult.token) {
    testTokenRefresh(loginResult.token);
  }
  
  // 5. Test Profile Fetch (requires auth)
  if (loginResult.token) {
    testProfileFetch(loginResult.token);
  }
  
  sleep(Math.random() * 2 + 1);
}

function testRegistration(user) {
  const startTime = Date.now();
  
  // Firebase Auth REST API - Create user
  const registerUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    displayName: user.displayName,
    returnSecureToken: true,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'register' },
  };
  
  const res = http.post(registerUrl, payload, params);
  const latency = Date.now() - startTime;
  
  authLatency.add(latency);
  
  const success = check(res, {
    'register status 200': (r) => r.status === 200,
    'register has idToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.idToken !== undefined;
      } catch {
        return false;
      }
    },
    'register latency < 2s': () => latency < 2000,
  });
  
  if (!success) {
    authFailureRate.add(1);
  } else {
    authFailureRate.add(0);
  }
  
  registrationRate.add(success ? 1 : 0);
  
  return { success, token: success ? JSON.parse(res.body).idToken : null };
}

function testLogin(user) {
  const startTime = Date.now();
  
  const loginUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    returnSecureToken: true,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'login' },
  };
  
  const res = http.post(loginUrl, payload, params);
  const latency = Date.now() - startTime;
  
  authLatency.add(latency);
  
  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has idToken': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.idToken !== undefined;
      } catch {
        return false;
      }
    },
    'login latency < 1s': () => latency < 1000,
  });
  
  if (!success) {
    authFailureRate.add(1);
  } else {
    authFailureRate.add(0);
  }
  
  loginRate.add(success ? 1 : 0);
  
  return { success, token: success ? JSON.parse(res.body).idToken : null };
}

function testTokenVerification(token) {
  const startTime = Date.now();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'verify_token' },
  };
  
  const res = http.get(`${BASE_URL}/api/auth/verify`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'verify_token status 200': (r) => r.status === 200,
    'verify_token has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.user !== undefined;
      } catch {
        return false;
      }
    },
    'verify_token latency < 300ms': () => latency < 300,
  });
  
  authLatency.add(latency);
}

function testTokenRefresh(token) {
  const startTime = Date.now();
  
  const refreshUrl = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
  const payload = JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: token, // In real scenario, this would be a refresh token
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'refresh_token' },
  };
  
  const res = http.post(refreshUrl, payload, params);
  const latency = Date.now() - startTime;
  
  const success = check(res, {
    'refresh_token status 200': (r) => r.status === 200,
    'refresh_token has access_token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch {
        return false;
      }
    },
    'refresh_token latency < 1s': () => latency < 1000,
  });
  
  tokenRefreshRate.add(success ? 1 : 0);
  authLatency.add(latency);
}

function testProfileFetch(token) {
  const startTime = Date.now();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    tags: { operation: 'fetch_profile' },
  };
  
  const res = http.get(`${BASE_URL}/api/driver/profile`, params);
  const latency = Date.now() - startTime;
  
  check(res, {
    'fetch_profile status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'fetch_profile latency < 500ms': () => latency < 500,
  });
  
  authLatency.add(latency);
}

export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/auth-test-summary.json': JSON.stringify(data),
  };
  
  return summary;
}