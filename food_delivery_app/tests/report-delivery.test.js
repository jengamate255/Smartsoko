import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { nextRun, validateSchedule, makeReport, createReportDelivery } = require('../server/src/services/report-delivery');
const env = { SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_KEY: 'test-service', RESEND_API_KEY: 'test-email', REPORT_EMAIL_FROM: 'reports@example.test' };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const date = new Date('2026-10-20T06:00:00Z');
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('report schedules', () => {
    it('uses 09:00 Tanzania time and handles weekly/monthly boundaries', () => {
        expect(nextRun('daily', date)).toBe('2026-10-21T06:00:00.000Z');
        expect(nextRun('weekly', date)).toBe('2026-10-26T06:00:00.000Z');
        expect(nextRun('monthly', new Date('2026-12-31T23:00:00Z'))).toBe('2027-01-01T06:00:00.000Z');
        expect(nextRun('weekly', new Date('2026-10-26T05:59:00Z'))).toBe('2026-10-26T06:00:00.000Z');
    });
    it('validates recipients, normalizes duplicates, and rejects header injection', () => {
        const input = { name: 'Weekly', emails: ['ADMIN@EXAMPLE.COM', 'admin@example.com'], reportType: 'revenue', frequency: 'weekly' };
        expect(validateSchedule(input).emails).toEqual(['admin@example.com']);
        expect(() => validateSchedule({ ...input, emails: ['a@example.com\r\nBcc: victim@example.com'] })).toThrow();
        expect(() => validateSchedule({ ...input, reportType: 'credentials' })).toThrow();
        expect(() => validateSchedule({ ...input, frequency: 'every-second' })).toThrow();
    });
    it('reports bounded periods and distinguishes gross from paid, non-cancelled value', () => {
        const report = makeReport({ report_type: 'revenue', frequency: 'daily' }, [
            { total: 100, payment_status: 'paid', status: 'delivered', created_at: '2026-10-20T05:00:00Z' },
            { total: 50, payment_status: 'paid', status: 'cancelled', created_at: '2026-10-20T05:00:00Z' },
            { total: 25, payment_status: 'pending', created_at: '2026-10-20T05:00:00Z' },
            { total: 999, created_at: '2026-10-20T06:00:00Z' },
        ], date);
        expect(report).toContain('"3","175","100"');
        const csv = makeReport({ report_type: 'orders', frequency: 'daily' }, [{ id: '=HYPERLINK("bad")', created_at: '2026-10-20T05:00:00Z' }], date);
        expect(csv).toContain('"\'=HYPERLINK');
    });
    it('does not create schedules or send requests without email configuration', async () => {
        const fetchImpl = vi.fn(); const service = createReportDelivery({ env: {}, fetchImpl, logger });
        await expect(service.create({ name: 'x', emails: ['a@example.com'], reportType: 'orders', frequency: 'daily' }, 'admin')).rejects.toMatchObject({ status: 503 });
        await service.tick(); expect(fetchImpl).not.toHaveBeenCalled();
    });
    it('sends a frozen CSV payload, retries with the same provider key, and acknowledges success', async () => {
        let schedule = { id: 'schedule-1', run_at: date.toISOString(), lease_token: 'lease-1', attempts: 1, frequency: 'daily', report_type: 'revenue', name: 'Daily', emails: ['a@example.com'] };
        let available = true, fail = true; const emails = [], completions = [];
        const fetchImpl = vi.fn(async (url, options) => {
            if (url.endsWith('/rpc/claim_admin_report')) { if (!available) return response([]); available = false; return response([schedule]); }
            if (url.includes('/orders?')) return response([{ id: 'order-1', total: 300, status: 'delivered', payment_status: 'paid', created_at: '2026-10-20T05:00:00Z' }]);
            if (url.endsWith('/rpc/prepare_admin_report')) { schedule.email_payload = JSON.parse(options.body).p_payload; return response(schedule.email_payload); }
            if (url === 'https://api.resend.com/emails') { emails.push(options); return fail ? response({}, 503) : response({ id: 'email-1' }); }
            if (url.endsWith('/rpc/finish_admin_report')) { completions.push(JSON.parse(options.body)); return response(true); }
            throw Error('Unexpected request');
        });
        const service = createReportDelivery({ env, fetchImpl, logger, clock: () => date });
        await service.tick();
        expect(completions[0].p_error).toContain('503');
        fail = false; available = true; schedule = { ...schedule, attempts: 2, lease_token: 'lease-2' };
        await service.tick();
        expect(emails).toHaveLength(2);
        expect(emails[0].headers['Idempotency-Key']).toBe(emails[1].headers['Idempotency-Key']);
        expect(emails[0].body).toBe(emails[1].body);
        expect(completions[1]).toMatchObject({ p_provider_id: 'email-1', p_error: null, p_next: '2026-10-21T06:00:00.000Z', p_lease: 'lease-2' });
        const csv = Buffer.from(JSON.parse(emails[0].body).attachments[0].content, 'base64').toString();
        expect(csv).toContain('"300","300"');
        expect(fetchImpl.mock.calls.filter(([url]) => url.includes('/orders?'))).toHaveLength(1);
    });
    it('does not retry an uncertain send beyond the idempotency window', async () => {
        let claimed = false; const finishes = [];
        const fetchImpl = vi.fn(async (url, options) => {
            if (url.endsWith('/claim_admin_report')) { if (claimed) return response([]); claimed = true; return response([{ id: 's', attempts: 2, run_at: '2026-10-18T06:00:00Z', lease_token: 'l' }]); }
            if (url.endsWith('/finish_admin_report')) { finishes.push(JSON.parse(options.body)); return response(true); }
            throw Error('Must not send');
        });
        await createReportDelivery({ env, fetchImpl, logger, clock: () => date }).tick();
        expect(finishes[0].p_error).toContain('manual review');
        expect(fetchImpl.mock.calls.some(([url]) => url === 'https://api.resend.com/emails')).toBe(false);
    });
});
