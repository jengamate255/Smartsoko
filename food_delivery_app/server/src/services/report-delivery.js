'use strict';

const crypto = require('crypto');
const TYPES = new Set(['revenue', 'orders', 'users']);
const FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);
const DAY = 86400000;

// Fixed 09:00 Africa/Dar_es_Salaam (UTC+3); Tanzania has no DST.
function nextRun(frequency, after = new Date()) {
    if (!FREQUENCIES.has(frequency)) throw new Error('Unsupported frequency');
    const local = new Date(+after + 3 * 3600000);
    const due = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 6));
    if (frequency === 'weekly') due.setUTCDate(due.getUTCDate() + (8 - local.getUTCDay()) % 7);
    if (frequency === 'monthly') due.setUTCDate(1);
    if (due <= after) {
        if (frequency === 'monthly') due.setUTCMonth(due.getUTCMonth() + 1);
        else due.setUTCDate(due.getUTCDate() + (frequency === 'weekly' ? 7 : 1));
    }
    return due.toISOString();
}

function validateSchedule(input) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const emails = Array.isArray(input.emails) ? [...new Set(input.emails.map(x => String(x).trim().toLowerCase()))] : [];
    if (!name || name.length > 120 || /[\r\n]/.test(name)) throw new Error('Name must contain 1–120 characters on one line');
    if (!TYPES.has(input.reportType)) throw new Error('Invalid report type');
    if (!FREQUENCIES.has(input.frequency)) throw new Error('Invalid frequency');
    if (!emails.length || emails.length > 10 || emails.some(x => x.length > 254 || !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(x)))
        throw new Error('Provide 1–10 valid recipient email addresses');
    return { name, emails, report_type: input.reportType, frequency: input.frequency };
}

function csvCell(value) {
    let text = String(value ?? '');
    // CSV opened in a spreadsheet must not execute customer-supplied formulas.
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

function makeReport(schedule, rows, at) {
    const days = schedule.frequency === 'daily' ? 1 : schedule.frequency === 'weekly' ? 7 : 30;
    const end = new Date(at);
    const start = new Date(+end - days * DAY);
    const included = rows.filter(row => {
        const date = new Date(row.created_at || row.createdAt);
        return date >= start && date < end;
    });
    let headings, values;
    if (schedule.report_type === 'users') {
        headings = ['User ID', 'Role', 'Created at'];
        values = included.map(row => [row.id, row.role, row.created_at || row.createdAt]);
    } else if (schedule.report_type === 'orders') {
        headings = ['Order ID', 'Seller ID', 'Status', 'Payment status', 'Gross order value (TZS)', 'Created at'];
        values = included.map(row => [row.id, row.restaurant_id || row.sellerId || row.restaurantId || row.merchantId, row.status, row.payment_status || row.paymentStatus, Number(row.total) || 0, row.created_at || row.createdAt]);
    } else {
        headings = ['Period start (UTC)', 'Period end (UTC)', 'Orders', 'Gross order value (TZS)', 'Paid non-cancelled order value (TZS)'];
        values = [[start.toISOString(), end.toISOString(), included.length,
            included.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
            included.filter(row => ['paid', 'completed'].includes(row.payment_status || row.paymentStatus) && !['cancelled', 'refunded', 'failed'].includes(row.status)).reduce((sum, row) => sum + (Number(row.total) || 0), 0)]];
    }
    return [headings, ...values].map(row => row.map(csvCell).join(',')).join('\r\n');
}

function createReportDelivery({ env = process.env, fetchImpl = fetch, clock = () => new Date(), logger = console } = {}) {
    const url = (env.SUPABASE_URL || '').replace(/\/$/, '');
    const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    const configured = () => !!(url && key && env.RESEND_API_KEY && env.REPORT_EMAIL_FROM);
    async function request(path, method = 'GET', body) {
        if (!url || !key) throw new Error('Report database not configured');
        const response = await fetchImpl(`${url}/rest/v1/${path}`, {
            method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`Report database request failed (${response.status}); check the report migration`);
        return response.status === 204 ? null : response.json();
    }
    const rpc = (name, body) => request(`rpc/${name}`, 'POST', body);
    async function create(input, actor) {
        const schedule = validateSchedule(input);
        if (!configured()) { const error = new Error('Configure RESEND_API_KEY, REPORT_EMAIL_FROM and the report database before creating schedules'); error.status = 503; throw error; }
        return (await request('admin_report_schedules', 'POST', { ...schedule, created_by: actor, next_run_at: nextRun(schedule.frequency, clock()) }))[0];
    }
    async function list() {
        return { configured: configured(), timezone: 'Africa/Dar_es_Salaam', defaultRecipients: env.REPORT_DEFAULT_RECIPIENT ? [env.REPORT_DEFAULT_RECIPIENT] : [], schedules: await request('admin_report_schedules?select=id,name,report_type,frequency,emails,status,next_run_at,last_sent_at,last_error,attempts&order=created_at.desc&limit=100') };
    }
    async function pause(id) {
        // In-flight delivery owns its lease; pause must not race a send.
        const rows = await request(`admin_report_schedules?id=eq.${id}&lease_token=is.null`, 'PATCH', { status: 'paused' });
        if (!rows.length) { const error = new Error('Schedule missing or delivery in progress; retry shortly'); error.status = 409; throw error; }
        return rows[0];
    }
    async function reportRows(schedule) {
        const table = schedule.report_type === 'users' ? 'profiles' : 'orders';
        const fields = table === 'profiles' ? 'id,role,created_at' : 'id,restaurant_id,status,payment_status,total,created_at';
        const days = schedule.frequency === 'daily' ? 1 : schedule.frequency === 'weekly' ? 7 : 30;
        const start = new Date(+new Date(schedule.run_at) - days * DAY).toISOString();
        const rows = [];
        for (let offset = 0; ; offset += 1000) {
            const batch = await request(`${table}?select=${fields}&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(schedule.run_at)}&order=created_at.asc,id.asc&limit=1000&offset=${offset}`);
            rows.push(...batch);
            if (batch.length < 1000) return rows;
            if (rows.length >= 100000) throw new Error('Report exceeds 100000 rows; reduce the report period');
        }
    }
    let busy = false;
    async function tick() {
        if (busy || !configured()) return;
        busy = true;
        try {
            // Claim one at a time: no queued lease can expire behind a slow email.
            for (let count = 0; count < 10; count++) {
                const claimed = await rpc('claim_admin_report', {});
                const schedule = claimed && claimed[0];
                if (!schedule) break;
                try {
                    if (+clock() - +new Date(schedule.run_at) > 23 * 3600000 && schedule.attempts > 1)
                        throw new Error('Delivery outcome uncertain beyond provider idempotency window; manual review required');
                    let payload = schedule.email_payload;
                    if (!payload) {
                        const csv = makeReport(schedule, await reportRows(schedule), schedule.run_at);
                        payload = await rpc('prepare_admin_report', { p_id: schedule.id, p_lease: schedule.lease_token, p_payload: {
                            from: env.REPORT_EMAIL_FROM, to: schedule.emails, subject: 'SmartSoko: ' + schedule.name,
                            text: 'Your ' + schedule.frequency + ' ' + schedule.report_type + ' report is attached. Window ends ' + schedule.run_at + ' (UTC). Monthly reports cover 30 days. Gross order value includes unpaid/cancelled orders and is not settlement income.',
                            attachments: [{ filename: schedule.report_type + '-report.csv', content: Buffer.from(csv).toString('base64') }]
                        } });
                    }
                    const response = await fetchImpl('https://api.resend.com/emails', {
                        method: 'POST', signal: AbortSignal.timeout(20000),
                        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.createHash('sha256').update(`${schedule.id}:${schedule.run_at}`).digest('hex') },
                        body: JSON.stringify(payload),
                    });
                    if (!response.ok) throw new Error(`Email provider rejected delivery (${response.status})`);
                    const result = await response.json();
                    if (!result.id) throw new Error('Email provider did not acknowledge delivery');
                    await rpc('finish_admin_report', { p_id: schedule.id, p_lease: schedule.lease_token, p_error: null, p_next: nextRun(schedule.frequency, clock()), p_provider_id: result.id });
                    require('./operations-monitor').recordSuccess('report-delivery:'+schedule.id);
                } catch (error) {
                    await rpc('finish_admin_report', { p_id: schedule.id, p_lease: schedule.lease_token, p_error: error.message, p_next: null, p_provider_id: null });
                    require('./operations-monitor').recordFailure('report-delivery:'+schedule.id,error);
                    logger.warn('Scheduled report delivery failed', { scheduleId: schedule.id, error: error.message });
                }
            }
        } catch (error) { require('./operations-monitor').recordFailure('report-worker',error); logger.error('Report worker failed', { error: error.message }); }
        finally { busy = false; }
    }
    function start() {
        if (!configured()) { logger.info('Report delivery disabled: email/database configuration missing'); return () => {}; }
        const timer = setInterval(tick, 60000); timer.unref(); tick();
        return () => clearInterval(timer);
    }
    return { configured, create, list, pause, tick, start };
}
module.exports = { nextRun, validateSchedule, makeReport, createReportDelivery };
