/** Run with a CUA tab bound to admin-browser-fixture.cjs. Contains no production URLs. */
'use strict';
import assert from 'node:assert/strict';
export default async function run(tab) {
    assert.equal(
        await tab.playwright.locator('body').getAttribute('data-disposable-fixture'),
        'smartsoko-admin-qa',
        'Refusing writes outside the disposable fixture'
    );
    const checks = [];
    await tab.playwright.locator('#tab-orders').click();
    const orderRows = tab.playwright.locator('#ordersTableHost tbody');
    await orderRows.getByRole('button', { name: 'View order', exact: true }).first()
        .waitFor({ state: 'visible' });
    await orderRows.getByRole('button', { name: 'View order', exact: true }).first().click();
    await tab.getAXState({ emit: false });
    await tab.playwright.locator('#modalStatusSelect').selectOption('confirmed');
    await tab.playwright.getByRole('button', { name: 'Update Status', exact: true }).click();
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#orderModal')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
    await tab.playwright.locator('#orderStatusFilter').selectOption('confirmed');
    await tab.getAXState({ emit: false });
    await orderRows.getByRole('button', { name: 'View order', exact: true })
        .waitFor({ state: 'visible' });
    assert.match(await orderRows.innerText(), /Confirmed/);
    checks.push('order status persisted through HTTP API');
    await orderRows.getByRole('button', { name: 'View order', exact: true }).first().click();
    await tab.playwright.locator('#orderModal').getByRole('button', { name: 'Refund', exact: true }).click();
    await tab.getAXState({ emit: false });
    await tab.playwright.locator('#refundReason').fill('Disposable browser QA');
    await tab.playwright.locator('#processWalletRefundBtn').click();
    await tab.playwright.locator('#refundModal').waitFor({ state: 'hidden' });
    await tab.getAXState({ emit: false });
    checks.push('wallet refund submits and closes on confirmed completion');
    await tab.playwright.locator('#tab-users').click();
    const userRows = tab.playwright.locator('#usersTableHost tbody');
    await userRows.getByRole('button', { name: 'Edit role & profile', exact: true }).first()
        .waitFor({ state: 'visible' });
    await userRows.getByRole('button', { name: 'Edit role & profile', exact: true }).first().click();
    await tab.getAXState({ emit: false });
    await tab.playwright.locator('#modalUserDisplayName').fill('Disposable QA Customer');
    await tab.playwright.locator('#role-merchant').click();
    await tab.playwright.locator('#saveUserRoleBtn').click();
    await tab.playwright.locator('#userRoleModal').waitFor({ state: 'hidden' });
    await tab.getAXState({ emit: false });
    await userRows.getByText('Merchant', { exact: true }).waitFor({ state: 'visible' });
    checks.push('disposable role change persisted');
    await userRows.getByRole('button', { name: 'More actions', exact: true }).first().click();
    await userRows.getByRole('menuitem', { name: 'Delete user', exact: true }).click();
    await tab.getAXState({ emit: false });
    await tab.playwright.locator('#confirmDeleteBtn').click();
    await tab.playwright.locator('#deleteUserModal').waitFor({ state: 'hidden' });
    await tab.getAXState({ emit: false });
    await userRows.getByText('Deleted user', { exact: true }).waitFor({ state: 'visible' });
    checks.push('disposable account anonymized');
    await tab.playwright.locator('#tab-finance').click();
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#content-finance')
        .getByRole('button', { name: 'Create Payout', exact: false })
        .click();
    await tab.getAXState({ emit: false });
    await tab.playwright.locator('#payoutSellerId').fill('00000000-0000-4000-8000-000000000020');
    await tab.playwright.locator('#payoutAmount').fill('100');
    await tab.playwright
        .locator('#createPayoutModal')
        .getByRole('button', { name: 'Create Payout', exact: true })
        .click();
    await tab.playwright.locator('#createPayoutModal').waitFor({ state: 'hidden' });
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#payoutsTableHost')
        .getByText('pending', { exact: true })
        .waitFor({ state: 'visible' });
    checks.push('manual payout request recorded without a transfer');
    await tab.playwright.locator('#tab-logistics').click();
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#driversList')
        .getByText('QA Fresh Driver', { exact: true })
        .waitFor({ state: 'visible' });
    assert.match(await tab.playwright.locator('#driversList').innerText(), /stale/);
    await tab.playwright.getByRole('button', { name: 'QA Tracking Offline', exact: true }).click();
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#logisticsLastUpdate')
        .filter({ hasText: 'Connection lost' })
        .waitFor({ state: 'visible' });
    await tab.playwright.getByRole('button', { name: 'QA Tracking Online', exact: true }).click();
    await tab.getAXState({ emit: false });
    await tab.playwright
        .locator('#logisticsLastUpdate')
        .filter({ hasText: /\d{1,2}:\d{2}/ })
        .waitFor({ state: 'visible' });
    checks.push('tracking flags stale locations and recovers after an outage');
    return checks;
}
