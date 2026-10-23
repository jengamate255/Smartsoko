/** Full PostgreSQL archive + restore drill. Only a fresh, explicitly named scratch DB is allowed. */
'use strict';
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const monitor = require('../server/src/services/operations-monitor');

function targets(source, destination) {
    if (!source || !destination)
        throw new Error('DATABASE_URL and RESTORE_DATABASE_URL are required');
    const from = new URL(source),
        to = new URL(destination);
    if (![from, to].every(url => ['postgres:', 'postgresql:'].includes(url.protocol)))
        throw new Error('PostgreSQL URLs required');
    if (!/^\/smartsoko_restore_[a-z0-9_]+$/i.test(to.pathname))
        throw new Error('Restore database name must start with smartsoko_restore_');
    if (
        from.hostname === to.hostname &&
        (from.port || '5432') === (to.port || '5432') &&
        from.pathname === to.pathname
    )
        throw new Error('Source and restore databases must differ');
    const environment = url => ({
        ...process.env,
        PGHOST: url.hostname,
        PGPORT: url.port || '5432',
        PGUSER: decodeURIComponent(url.username),
        PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
        PGSSLMODE: url.searchParams.get('sslmode') || 'require',
    });
    return { source: environment(from), destination: environment(to) };
}
function child(command, args, env) {
    const process = spawn(command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
    });
    let stderr = '';
    process.stderr.on('data', value => {
        if (stderr.length < 2000) stderr += value.toString();
    });
    const done = new Promise((resolve, reject) => {
        process.once('error', () =>
            reject(
                new Error(command + ' could not start; install compatible PostgreSQL client tools')
            )
        );
        process.once('close', code =>
            code === 0
                ? resolve()
                : reject(new Error(command + ' failed: ' + monitor.safeError(stderr)))
        );
    });
    // Keep rejected child promises observed while their streams are being connected.
    done.catch(() => {});
    return { process, done };
}
async function scalar(sql, env) {
    const run = child('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], env);
    let result = '';
    run.process.stdout.on('data', data => {
        result += data.toString();
    });
    run.process.stdin.end();
    await run.done;
    return result.trim();
}
async function restore(file, key, env, listOnly = false) {
    const header = Buffer.alloc(32);
    const handle = await fsp.open(file, 'r');
    await handle.read(header, 0, 32, 0);
    await handle.close();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, header.subarray(4, 16));
    decipher.setAuthTag(header.subarray(16, 32));
    const run = child(
        'pg_restore',
        listOnly
            ? ['--list']
            : [
                  '--single-transaction',
                  '--exit-on-error',
                  '--no-owner',
                  '--no-acl',
                  '--dbname',
                  env.PGDATABASE,
              ],
        env
    );
    run.process.stdout.resume();
    await Promise.all([
        pipeline(fs.createReadStream(file, { start: 32 }), decipher, run.process.stdin),
        run.done,
    ]);
}
async function main() {
    require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
    const connection = targets(process.env.DATABASE_URL, process.env.RESTORE_DATABASE_URL);
    if (!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY || ''))
        throw new Error('BACKUP_ENCRYPTION_KEY is required');
    const dir = process.env.BACKUP_DIR;
    if (!dir || !path.isAbsolute(dir)) throw new Error('Absolute BACKUP_DIR is required');
    const relative = path.relative(path.resolve(__dirname, '../..'), path.resolve(dir));
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative)))
        throw new Error('Backup directory must be outside the repository');
    const countSql =
        "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v','m','S','f') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'";
    if ((await scalar(countSql, connection.destination)) !== '0')
        throw new Error('Restore database is not empty; refusing to overwrite any data');
    const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex'),
        iv = crypto.randomBytes(12);
    await fsp.mkdir(dir, { recursive: true });
    const file = path.join(dir, 'postgres-' + crypto.randomUUID() + '.aes');
    await fsp.writeFile(file, Buffer.concat([Buffer.from('SSP1'), iv, Buffer.alloc(16)]), {
        mode: 0o600,
        flag: 'wx',
    });
    const dump = child('pg_dump', ['--format=custom', '--no-owner', '--no-acl'], connection.source);
    dump.process.stdin.end();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    await Promise.all([
        pipeline(
            dump.process.stdout,
            cipher,
            fs.createWriteStream(file, { flags: 'r+', start: 32 })
        ),
        dump.done,
    ]);
    const handle = await fsp.open(file, 'r+');
    await handle.write(cipher.getAuthTag(), 0, 16, 16);
    await handle.close();
    await restore(file, key, connection.source, true);
    await restore(file, key, connection.destination);
    const restoredRelations = Number(await scalar(countSql, connection.destination));
    const sourceRelations = Number(await scalar(countSql, connection.source));
    if (restoredRelations !== sourceRelations)
        throw new Error('Restored relation count differs; inspect the recovery database');
    await fsp.writeFile(
        file + '.manifest.json',
        JSON.stringify({
            verifiedAt: new Date().toISOString(),
            restoredRelations,
            sourceRelations,
            consistentSnapshot: true,
            restoreVerified: true,
        }),
        { mode: 0o600 }
    );
    monitor.recordSuccess('postgres-recovery');
    console.log(JSON.stringify({ file, restoreVerified: true, restoredRelations }));
}
module.exports = { targets };
if (require.main === module)
    main().catch(error => {
        monitor.recordFailure('postgres-recovery', error);
        console.error(monitor.safeError(error));
        process.exitCode = 1;
    });
