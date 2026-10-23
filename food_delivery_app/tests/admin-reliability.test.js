import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { summarize } = require('../server/src/services/admin-finance');
const { calculate } = require('../server/src/services/commission');
const { position } = require('../server/src/services/driver-presence');
const backup = require('../server/src/services/verified-backup');
const { safeError } = require('../server/src/services/operations-monitor');
describe('financial and operational reliability', () => {
    it('uses actual wallet/escrow records rather than a guessed percentage', () => {
        const result = summarize({
            orders: [
                {
                    id: 'o',
                    total: 1000,
                    total_paid: 1000,
                    payment_status: 'paid',
                    restaurant_id: 's',
                },
                { id: 'unpaid', total: 9000, payment_status: 'pending' },
            ],
            sellers: [{ id: 's', name: 'Store' }],
            restaurants: [],
            wallets: [
                {
                    id: 's',
                    role: 'merchant',
                    balance: 500,
                    total_earned: 700,
                    total_withdrawn: 200,
                },
                { id: 'driver', role: 'driver', balance: 99999 },
            ],
            holds: [
                { order_id: 'o', status: 'released', platform_amount: 123, seller_amount: 677 },
            ],
            payouts: [
                { wallet_id: 's', amount: 200, status: 'completed' },
                { wallet_id: 's', amount: 50, status: 'pending' },
            ],
            payments: [{ method: 'refund', status: 'completed', amount: 40 }],
            transactions: [
                {
                    wallet_id: 's',
                    status: 'completed',
                    balance_after: 500,
                    created_at: '2026-10-20',
                },
            ],
        });
        expect(result).toMatchObject({
            grossOrderValue: 10000,
            collectedOrderValue: 1000,
            platformEarned: 123,
            availableBalance: 500,
            completedPayouts: 200,
            queuedPayouts: 50,
            refundedToWallet: 40,
        });
        expect(result.reconciliation).toHaveLength(0);
    });
    it('applies category rules for future orders without exceeding the sale subtotal', () => {
        const rules = [
            { id: 'default', category: 'all', rate: 5 },
            { id: 'food', category: 'food', rate: 7.5 },
        ];
        expect(calculate(1000, 'food', rules)).toEqual({ amount: 75, ruleId: 'food' });
        expect(calculate(1000, 'other', rules).amount).toBe(50);
        expect(calculate(10, 'food', [{ category: 'food', type: 'flat', rate: 100 }]).amount).toBe(
            10
        );
        expect(() => calculate(100, 'all', [{ category: 'all', rate: 101 }])).toThrow();
    });
    it('accepts equator coordinates and rejects stale, future and invalid driver locations', () => {
        const now = Date.parse('2026-10-20T09:00:00Z');
        expect(
            position(
                {
                    isOnline: true,
                    currentLatitude: 0,
                    currentLongitude: 0,
                    lastLocationUpdate: '2026-10-20T08:59:30Z',
                },
                now
            )
        ).toMatchObject({ locationFresh: true, status: 'online' });
        expect(
            position(
                {
                    isOnline: true,
                    currentLatitude: 1,
                    currentLongitude: 2,
                    lastLocationUpdate: '2026-10-20T08:00:00Z',
                },
                now
            ).status
        ).toBe('stale');
        expect(
            position(
                {
                    isOnline: true,
                    currentLatitude: 100,
                    currentLongitude: 2,
                    lastLocationUpdate: '2026-10-20T09:00:00Z',
                },
                now
            ).locationFresh
        ).toBe(false);
        expect(
            position(
                {
                    isOnline: true,
                    currentLatitude: 1,
                    currentLongitude: 2,
                    lastLocationUpdate: '2026-10-20T10:00:00Z',
                },
                now
            ).locationFresh
        ).toBe(false);
    });
    it('encrypts exports and verifies a restored payload; detects corruption and wrong keys', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartsoko-backup-test-'));
        const key = 'ab'.repeat(32);
        const result = await backup.createBackup({
            dir,
            key,
            read: async table => [{ id: table + '-1', privateValue: 'PRIVATE_TEST_VALUE' }],
        });
        expect(result.verified).toBe(true);
        expect(result.consistentSnapshot).toBe(false);
        const bytes = await fs.readFile(result.file);
        expect(bytes.includes(Buffer.from('PRIVATE_TEST_VALUE'))).toBe(false);
        await expect(backup.verifyBackup(result.file, 'cd'.repeat(32))).rejects.toThrow();
        bytes[bytes.length - 1] ^= 1;
        await fs.writeFile(result.file, bytes);
        await expect(backup.verifyBackup(result.file, key)).rejects.toThrow('checksum');
        // Only this test's exact, explicitly-created files are removed.
        await fs.unlink(result.file);
        await fs.unlink(result.file + '.manifest.json');
        await fs.rmdir(dir);
    });
    it('refuses full database recovery drills against the source or non-scratch databases', () => {
        const { targets } = require('../scripts/verify-postgres-recovery.cjs');
        expect(() =>
            targets('postgres://user:pass@host/production', 'postgres://user:pass@host/production')
        ).toThrow();
        expect(() =>
            targets(
                'postgres://user:pass@host/smartsoko_restore_qa',
                'postgres://user:pass@host/smartsoko_restore_qa'
            )
        ).toThrow('differ');
        expect(
            targets(
                'postgres://user:pass@host/production',
                'postgres://user:pass@host/smartsoko_restore_qa'
            ).destination.PGDATABASE
        ).toBe('smartsoko_restore_qa');
    });
    it('rejects repository-local exports and redacts operational credentials', async () => {
        await expect(
            backup.createBackup({ dir: path.resolve('.'), key: 'aa'.repeat(32) })
        ).rejects.toThrow('outside');
        expect(safeError(new Error('Bearer SECRET re_example'))).not.toContain('SECRET');
    });
});
