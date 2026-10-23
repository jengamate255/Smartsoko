'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const backup = require('../server/src/services/verified-backup'),
    monitor = require('../server/src/services/operations-monitor');
(async () => {
    const index = process.argv.indexOf('--verify');
    const result =
        index >= 0
            ? await backup.verifyBackup(process.argv[index + 1], process.env.BACKUP_ENCRYPTION_KEY)
            : await backup.createBackup();
    monitor.recordSuccess('database-backup');
    console.log(JSON.stringify(result));
})().catch(error => {
    monitor.recordFailure('database-backup', error);
    console.error(monitor.safeError(error));
    process.exitCode = 1;
});
