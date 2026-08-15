// Test PesaPal Payment Endpoints
// Run with: node test-payment.js

const http = require('http');

const BASE = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: 'localhost',
      port: 3000,
      path,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testPayments() {
  console.log('Testing PesaPal Payment Endpoints\n');

  // Test 1: Health check
  try {
    const result = await makeRequest('/health');
    console.log('1. GET /health:', result.statusCode, '->', result.body);
  } catch (e) {
    console.log('1. GET /health: ERROR -', e.message);
  }

  // Test 2: Payment status (with test tracking ID)
  try {
    const result = await makeRequest('/api/payments/pesapal/status/test-tracking-id');
    console.log('2. GET /api/payments/pesapal/status/test-tracking-id:', result.statusCode);
  } catch (e) {
    console.log('2. GET /api/payments/pesapal/status/test-tracking-id: ERROR -', e.message);
  }

  // Test 3: Payment status by reference
  try {
    const result = await makeRequest('/api/payments/pesapal/status-by-ref/INV-TEST123');
    console.log('3. GET /api/payments/pesapal/status-by-ref/INV-TEST123:', result.statusCode);
  } catch (e) {
    console.log('3. GET /api/payments/pesapal/status-by-ref/INV-TEST123: ERROR -', e.message);
  }

  // Test 4: Initiate payment
  try {
    const result = await makeRequest('/api/payments/pesapal/initiate', 'POST', {
      amount: 1000,
      currency: 'TZS',
      description: 'Test Payment',
      customerEmail: 'test@smartsoko.com',
      customerPhone: '+255712345678',
      customerFirstName: 'Test',
      customerLastName: 'User'
    });
    console.log('4. POST /api/payments/pesapal/initiate:', result.statusCode);
    if (result.body) {
      const data = JSON.parse(result.body);
      console.log('   Response:', data.success ? 'SUCCESS' : 'FAILED', '- Tracking:', data.orderTrackingId);
    }
  } catch (e) {
    console.log('4. POST /api/payments/pesapal/initiate: ERROR -', e.message);
  }

  // Test 5: Wallet top-up
  try {
    const result = await makeRequest('/api/payments/pesapal/wallet-topup', 'POST', {
      amount: 500,
      email: 'test@smartsoko.com'
    });
    console.log('5. POST /api/payments/pesapal/wallet-topup:', result.statusCode);
    if (result.body) {
      const data = JSON.parse(result.body);
      console.log('   Response:', data.success ? 'SUCCESS' : 'FAILED', '- Tracking:', data.orderTrackingId);
    }
  } catch (e) {
    console.log('5. POST /api/payments/pesapal/wallet-topup: ERROR -', e.message);
  }

  // Test 6: Wallet status
  try {
    const result = await makeRequest('/api/payments/pesapal/wallet-status/INV-TEST123');
    console.log('6. GET /api/payments/pesapal/wallet-status/INV-TEST123:', result.statusCode);
    if (result.body) {
      const data = JSON.parse(result.body);
      console.log('   Completed:', data.completed, '- Failed:', data.failed);
    }
  } catch (e) {
    console.log('6. GET /api/payments/pesapal/wallet-status/INV-TEST123: ERROR -', e.message);
  }

  console.log('\nPayment endpoints test complete!');
}

testPayments().catch(console.error);