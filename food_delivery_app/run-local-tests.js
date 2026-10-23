#!/usr/bin/env node
/**
 * Local Testing Script - Verifies all P0 critical fixes
 * Run: node run-local-tests.js
 */

const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';

class TestRunner {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    makeRequest(path, method = 'GET', headers = {}, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, BASE_URL);
            const options = {
                hostname: url.hostname,
                port: url.port || 3000,
                path: url.pathname + url.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data,
                    });
                });
            });

            req.on('error', reject);
            if (body) req.write(body);
            req.end();
        });
    }

    async test(name, fn) {
        try {
            await fn();
            this.passed++;
            this.results.push(`✅ PASS: ${name}`);
        } catch (err) {
            this.failed++;
            this.results.push(`❌ FAIL: ${name}\n   Error: ${err.message}`);
        }
    }

    async assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    async assertStatus(response, expected, message) {
        await this.assert(
            response.status === expected,
            `${message} - Expected ${expected}, got ${response.status}`
        );
    }

    async assertBodyContains(response, text, message) {
        await this.assert(
            response.body.includes(text),
            `${message} - Response body doesn't contain "${text}"`
        );
    }

    print() {
        console.log('\n' + '='.repeat(70));
        console.log('LOCAL TESTING RESULTS - SmartSoko P0 Critical Fixes');
        console.log('='.repeat(70) + '\n');

        this.results.forEach((r) => console.log(r));

        console.log('\n' + '='.repeat(70));
        console.log(`Total: ${this.passed + this.failed} | Passed: ${this.passed} | Failed: ${this.failed}`);
        console.log('='.repeat(70) + '\n');

        process.exit(this.failed > 0 ? 1 : 0);
    }
}

async function runTests() {
    const runner = new TestRunner();

    console.log('\n⏳ Starting local tests in 2 seconds...\n');
    await new Promise((r) => setTimeout(r, 2000));

    // Test 1: Server is responding - Successful Request
    await runner.test('Test 1: Successful Request (200 OK)', async () => {
        const res = await runner.makeRequest('/test/success');
        await runner.assertStatus(res, 200, 'Successful request should return 200');
        await runner.assertBodyContains(res, 'success', 'Response should contain "success"');
    });

    // Test 2: Sync Error Handler
    await runner.test('Test 2: Sync Error Handler (500 error)', async () => {
        const res = await runner.makeRequest('/test/sync-error');
        await runner.assertStatus(res, 500, 'Sync error should return 500');
        await runner.assertBodyContains(res, 'error', 'Response should contain error JSON');
    });

    // Test 3: Async Error Handler
    await runner.test('Test 3: Async Error Handler (500 error)', async () => {
        const res = await runner.makeRequest('/test/async-error');
        await runner.assertStatus(res, 500, 'Async error should return 500');
        await runner.assertBodyContains(res, 'error', 'Response should contain error JSON');
    });

    // Test 4: PesaPal Webhook - Invalid Signature (401)
    await runner.test('Test 4: PesaPal Webhook Verification - Invalid Signature (401)', async () => {
        const res = await runner.makeRequest(
            '/api/payments/pesapal/ipn',
            'POST',
            {
                'pesapal-notification-signature': 'invalid-signature-here',
                'Content-Type': 'application/json',
            },
            JSON.stringify({ OrderTrackingId: '123' })
        );
        await runner.assertStatus(res, 401, 'Invalid PesaPal signature should return 401');
        await runner.assertBodyContains(res, 'Signature verification failed', 'Should indicate signature failure');
    });

    // Test 5: nTZS Webhook - Invalid Signature (401)
    await runner.test('Test 5: nTZS Webhook Verification - Invalid Signature (401)', async () => {
        const res = await runner.makeRequest(
            '/api/payments/ntzs/webhook',
            'POST',
            {
                'x-ntzs-signature': 'invalid-signature-here',
                'Content-Type': 'application/json',
            },
            JSON.stringify({ transactionId: '123' })
        );
        await runner.assertStatus(res, 401, 'Invalid nTZS signature should return 401');
        await runner.assertBodyContains(res, 'Signature verification failed', 'Should indicate signature failure');
    });

    // Test 6: Server Remains Stable After Error
    await runner.test('Test 6: Server Stability After Error (recovery check)', async () => {
        // First request causes error
        await runner.makeRequest('/test/async-error');
        // Wait a moment
        await new Promise((r) => setTimeout(r, 500));
        // Second request should succeed (server still running)
        const res = await runner.makeRequest('/test/success');
        await runner.assertStatus(res, 200, 'Server should remain responsive after error');
    });

    runner.print();
}

runTests().catch((err) => {
    console.error('🔥 Test runner failed:', err);
    process.exit(1);
});
