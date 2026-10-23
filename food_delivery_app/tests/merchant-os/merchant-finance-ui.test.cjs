/** Browser regression using the isolated QA server, never live payments. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const puppeteer = require('puppeteer');

test(
    'finance UI loads ledger figures, saves details for review and fails closed offline',
    { timeout: 90000 },
    async () => {
        const child = spawn(process.execPath, [path.join(__dirname, 'merchant-desk-fixture.cjs')], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let browser;
        try {
            const url = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('QA server did not start')), 10000);
                child.stdout.on('data', data => {
                    const found = String(data).match(/http:\/\/127\.0\.0\.1:\d+\/merchant/);
                    if (found) {
                        clearTimeout(timer);
                        resolve(found[0]);
                    }
                });
                child.once('error', reject);
            });
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            let account = null,
                saves = 0,
                offline = false;
            await page.setRequestInterception(true);
            page.on('request', request => {
                const parsed = new URL(request.url());
                const route = parsed.pathname.replace('/api/merchant', '');
                const send = (data, status = 200) =>
                    request.respond({
                        status,
                        contentType: 'application/json',
                        body: JSON.stringify(data),
                    });
                if (parsed.hostname !== '127.0.0.1') return request.abort();
                if (parsed.pathname.startsWith('/api/merchant')) {
                    if (offline && ['/balance', '/payouts', '/payout-details'].includes(route))
                        return send({ success: false, error: 'QA outage' }, 503);
                    if (route === '/balance')
                        return send({
                            success: true,
                            data: {
                                availableBalance: 3000,
                                pendingBalance: 6000,
                                lifetimeEarnings: 8000,
                                totalWithdrawn: 5000,
                                queuedPayouts: 3000,
                            },
                        });
                    if (route === '/payouts')
                        return send({
                            success: true,
                            data: [
                                {
                                    id: 'probe',
                                    amount: 3000,
                                    status: 'pending',
                                    orderId: 'qa-order',
                                    transactionRef: '<img src=x onerror=alert(1)>',
                                },
                            ],
                        });
                    if (route === '/payout-details') {
                        if (request.method() === 'PUT') {
                            account = {
                                ...JSON.parse(request.postData()),
                                status: 'pending',
                                revision: 1,
                            };
                            saves++;
                        }
                        return send({ success: true, data: account });
                    }
                }
                request.continue();
            });
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => typeof window.loadBalance === 'function');
            await page.evaluate(() => window.switchTab('finance'));
            await page.waitForFunction(() =>
                document.getElementById('availableBalance').textContent.includes('3,000')
            );
            assert.equal(
                await page.$eval(
                    '#payoutDetailsForm',
                    node => node.closest('[role="tabpanel"]').id
                ),
                'financeTab'
            );
            assert.equal(
                await page.$eval('#payoutHistory', node => node.querySelector('img')),
                null
            );
            await page.type('#payout-accountName', 'QA Merchant');
            await page.type('#payout-phoneNumber', '0712345678');
            await page.click('#savePayoutDetails');
            await page.waitForFunction(() =>
                document
                    .getElementById('payoutDetailsStatus')
                    .textContent.includes('Awaiting admin verification')
            );
            assert.equal(saves, 1);
            assert.equal(account.phoneNumber, '0712345678');
            await page.evaluate(() => {
                window.merchantSelectedId = 'another-store';
                document.getElementById('payoutDetailsForm').requestSubmit();
            });
            assert.equal(saves, 1);
            assert.match(
                await page.$eval('#payoutDetailsStatus', node => node.textContent),
                /Store or session changed/
            );
            await page.evaluate(() => {
                delete window.merchantSelectedId;
            });
            offline = true;
            await page.evaluate(() => window.loadBalance());
            assert.equal(await page.$eval('#availableBalance', node => node.textContent), '—');
            assert.equal(await page.$eval('#savePayoutDetails', node => node.disabled), true);
        } finally {
            if (browser) await browser.close();
            child.kill();
        }
    }
);
