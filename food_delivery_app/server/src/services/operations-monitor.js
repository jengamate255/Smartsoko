'use strict';
const fs = require('fs');
const path = require('path');
const file =
    process.env.OPERATIONS_STATE_FILE ||
    path.join(__dirname, '../../../logs/operations-state.json');
let jobs = {};
try {
    if (process.env.NODE_ENV !== 'test') jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (_) {}
function safeError(error) {
    return String((error && (error.message || error)) || 'Unknown failure')
        .replace(
            /Bearer\s+\S+|re_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+|postgres(?:ql)?:\/\/\S+/gi,
            '[redacted]'
        )
        .slice(0, 300);
}
function record(name, status, detail) {
    const at = new Date().toISOString();
    const prior = jobs[name] || {};
    jobs[name] = {
        ...prior,
        name,
        status,
        updatedAt: at,
        ...(status === 'healthy'
            ? { lastSuccessAt: at, failures: 0, lastError: null }
            : {
                  lastFailureAt: at,
                  failures: (prior.failures || 0) + 1,
                  lastError: safeError(detail),
              }),
    };
    try {
        if (process.env.NODE_ENV === 'test') return;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(jobs));
        fs.renameSync(tmp, file);
    } catch (_) {
        /* monitoring cannot interrupt money operations */
    }
}
const recordSuccess = name => record(name, 'healthy');
const recordFailure = (name, error) => record(name, 'failed', error);
function snapshot(now = Date.now()) {
    const statuses = Object.values(jobs);
    const backup = jobs['database-backup'];
    const alerts = statuses
        .filter(job => job.status === 'failed')
        .map(job => ({
            name: job.name,
            severity: 'error',
            message: job.lastError,
            since: job.lastFailureAt,
        }));
    if (!backup?.lastSuccessAt || now - Date.parse(backup.lastSuccessAt) > 36 * 3600000)
        alerts.push({
            name: 'database-backup',
            severity: 'warning',
            message: 'No verified core-data export in the past 36 hours',
        });
    const reconcile = jobs['payment-reconciliation'];
    if (!reconcile?.updatedAt || now - Date.parse(reconcile.updatedAt) > 15 * 60000)
        alerts.push({
            name: 'payment-reconciliation',
            severity: 'warning',
            message: 'Payment reconciliation has not reported in the past 15 minutes',
        });
    return { jobs: statuses, alerts, checkedAt: new Date(now).toISOString() };
}
module.exports = { recordSuccess, recordFailure, snapshot, safeError };
