'use strict';
const fs = require('fs/promises'),
    path = require('path'),
    crypto = require('crypto');
const { readTable } = require('./admin-finance');
const TABLES = [
    'orders',
    'sellers',
    'restaurants',
    'products',
    'profiles',
    'drivers',
    'wallets',
    'wallet_transactions',
    'escrow_holds',
    'vendor_payouts',
    'payments',
    'platform_settings',
];
function encryptionKey(value) {
    if (!/^[a-f0-9]{64}$/i.test(value || ''))
        throw new Error('BACKUP_ENCRYPTION_KEY must be a 32-byte hex key');
    return Buffer.from(value, 'hex');
}
async function verifyBackup(file, key) {
    const manifest = JSON.parse(await fs.readFile(file + '.manifest.json', 'utf8'));
    const data = await fs.readFile(file);
    if (crypto.createHash('sha256').update(data).digest('hex') !== manifest.sha256)
        throw new Error('Backup checksum mismatch');
    if (data.subarray(0, 4).toString() !== 'SSB1') throw new Error('Unsupported backup format');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey(key),
        data.subarray(4, 16)
    );
    decipher.setAuthTag(data.subarray(16, 32));
    const restored = JSON.parse(
        Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]).toString()
    );
    for (const table of TABLES) {
        const rows = restored.tables[table];
        if (
            !Array.isArray(rows) ||
            rows.length !== manifest.counts[table] ||
            new Set(rows.map(r => String(r.id))).size !== rows.length
        )
            throw new Error('Backup row validation failed: ' + table);
    }
    return {
        verified: true,
        createdAt: restored.createdAt,
        counts: manifest.counts,
        consistentSnapshot: false,
    };
}
async function createBackup({
    dir = process.env.BACKUP_DIR,
    key = process.env.BACKUP_ENCRYPTION_KEY,
    read = readTable,
    now = new Date(),
} = {}) {
    const secret = encryptionKey(key);
    if (!dir || !path.isAbsolute(dir))
        throw new Error('An absolute BACKUP_DIR outside the repository is required');
    const root = path.resolve(__dirname, '../../../..'),
        target = path.resolve(dir);
    const relative = path.relative(root, target);
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative)))
        throw new Error('Backups must be stored outside the repository');
    const tables = {};
    for (const table of TABLES) tables[table] = await read(table);
    const payload = Buffer.from(
        JSON.stringify({
            version: 1,
            createdAt: now.toISOString(),
            consistentSnapshot: false,
            tables,
        })
    );
    const iv = crypto.randomBytes(12),
        cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const data = Buffer.concat([Buffer.from('SSB1'), iv, cipher.getAuthTag(), encrypted]);
    await fs.mkdir(target, { recursive: true });
    const file = path.join(
        target,
        'smartsoko-' + now.toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomUUID() + '.aes'
    );
    await fs.writeFile(file, data, { mode: 0o600, flag: 'wx' });
    const manifest = {
        version: 1,
        sha256: crypto.createHash('sha256').update(data).digest('hex'),
        counts: Object.fromEntries(TABLES.map(table => [table, tables[table].length])),
        consistentSnapshot: false,
    };
    await fs.writeFile(file + '.manifest.json', JSON.stringify(manifest), {
        mode: 0o600,
        flag: 'wx',
    });
    const verified = await verifyBackup(file, key);
    return { ...verified, file };
}
function start() {
    if (!process.env.BACKUP_DIR || !process.env.BACKUP_ENCRYPTION_KEY) return () => {};
    const monitor = require('./operations-monitor');
    let busy = false,
        last =
            Date.parse(
                monitor.snapshot().jobs.find(job => job.name === 'database-backup')?.lastSuccessAt
            ) || 0;
    async function tick() {
        if (busy || Date.now() - last < 24 * 3600000) return;
        busy = true;
        try {
            await createBackup();
            last = Date.now();
            monitor.recordSuccess('database-backup');
        } catch (error) {
            monitor.recordFailure('database-backup', error);
            last = Date.now() - 23 * 3600000;
        } finally {
            busy = false;
        }
    }
    const timer = setInterval(tick, 60000);
    timer.unref();
    tick();
    return () => clearInterval(timer);
}
module.exports = { TABLES, createBackup, verifyBackup, start };
