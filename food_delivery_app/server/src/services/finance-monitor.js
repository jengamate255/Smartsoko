'use strict';
const finance = require('./admin-finance'),
    monitor = require('./operations-monitor');
async function run(read) {
    try {
        const data = await finance.snapshot(read);
        const mismatches = data.reconciliation.filter(item => item.status === 'mismatch').length;
        const unverified = data.reconciliation.filter(item => item.status === 'unverified').length;
        if (mismatches || unverified || data.unlinkedPayouts || data.overduePayouts)
            monitor.recordFailure(
                'finance-reconciliation',
                `${mismatches} balance mismatches; ${unverified} wallets without ledger history; ${data.unlinkedPayouts} unlinked payouts; ${data.overduePayouts} overdue payouts need review`
            );
        else monitor.recordSuccess('finance-reconciliation');
        return data;
    } catch (error) {
        monitor.recordFailure('finance-reconciliation', error);
        return null;
    }
}
function start() {
    let busy = false;
    async function tick() {
        if (busy) return;
        busy = true;
        try {
            await run();
        } finally {
            busy = false;
        }
    }
    const timer = setInterval(tick, 300000);
    timer.unref();
    const initial = setTimeout(tick, 10000);
    initial.unref();
    return () => {
        clearInterval(timer);
        clearTimeout(initial);
    };
}
module.exports = { run, start };
