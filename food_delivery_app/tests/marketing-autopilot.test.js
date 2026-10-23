import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createAutopilot, validateSettings, qualityCheck, dayInTanzania } = require('../server/src/services/marketing-autopilot');
function store() {
    const rows = [];
    const clone = value => JSON.parse(JSON.stringify(value));
    const client = { from: () => {
        let filters = [], op = 'read', payload;
        const q = { select: () => q, eq: (key, value) => { filters.push(row => key === 'value' ? JSON.stringify(row[key]) === value : row[key] === value); return q; },
            insert: value => { op = 'insert'; payload = value; return q; }, update: value => { op = 'update'; payload = value; return q; },
            then: (resolve, reject) => Promise.resolve().then(() => {
                if (op === 'insert') { if (rows.some(row => row.id === payload.id)) return { data: null, error: { code: '23505' } }; rows.push(clone(payload)); return { data: [clone(payload)] }; }
                const found = rows.filter(row => filters.every(f => f(row)));
                if (op === 'update') found.forEach(row => Object.assign(row, clone(payload)));
                return { data: clone(found) };
            }).then(resolve, reject) };
        return q;
    } };
    return { client, rows };
}
async function fixture(options = {}) {
    const db = store(), posts = [];
    let calls = 0, approvals = 0, ticks = 0;
    const agent = {
        config: () => ({ facebook: !!options.connected, instagram: !!options.connected, x: !!options.connected }),
        list: async () => posts,
        generate: async input => { calls++; if (options.fail) throw new Error('Provider unavailable');
            const generated = input.platforms.map(platform => ({ id: platform + input.runId, runId: input.runId, platform, status: 'draft', text: 'Shop local https://smartsoko.tz/discovery', productId: 'rice', imageUrl: 'https://smartsoko.tz/rice.jpg' }));
            posts.push(...generated); return generated;
        },
        approve: async id => { approvals++; posts.find(p => p.id === id).status = 'approved'; },
        tick: async () => { ticks++; },
    };
    const clock = () => new Date('2026-10-22T08:00:00Z');
    const auto = createAutopilot({ client: db.client, agent, clock });
    await auto.settings({ enabled: true }, 'admin');
    return { ...db, auto, agent, posts, clock, counts: () => ({ calls, approvals, ticks }) };
}
describe('autonomous marketing operations', () => {
    it('validates the operating brief and limits channels and cadence', () => {
        expect(() => validateSettings({ platforms: ['email'] })).toThrow();
        expect(() => validateSettings({ dailyHour: 25 })).toThrow();
        expect(() => validateSettings({ brandBrief: '' })).toThrow();
        expect(dayInTanzania(new Date('2026-10-21T22:00:00Z'))).toBe('2026-10-22');
    });
    it('creates a daily campaign once and leaves it for review', async () => {
        const f = await fixture(); await f.auto.runNow('admin'); await f.auto.runNow('admin'); await f.auto.tick();
        expect(f.counts().calls).toBe(1); expect(f.counts().approvals).toBe(0);
        const summary = await f.auto.summary();
        expect(summary.history).toHaveLength(1); expect(summary.counts.drafts).toBe(3);
        expect(summary.run.steps).toHaveLength(5);
    });
    it('two workers cannot prepare duplicate daily campaigns', async () => {
        const f = await fixture();
        await Promise.allSettled([f.auto.runNow('admin'), f.auto.runNow('admin')]);
        expect(f.counts().calls).toBe(1);
    });
    it('a restarted worker reads the persisted completion', async () => {
        const f = await fixture(); await f.auto.runNow('admin');
        const restarted = createAutopilot({ client: f.client, agent: f.agent, clock: f.clock });
        expect((await restarted.runNow('admin')).skipped).toBe(true); expect(f.counts().calls).toBe(1);
    });
    it('provider failures are recorded and do not repeat every minute', async () => {
        const f = await fixture({ fail: true });
        await expect(f.auto.tick()).rejects.toThrow(/Provider/); await f.auto.tick();
        expect(f.counts().calls).toBe(1); expect((await f.auto.summary()).run.status).toBe('failed');
    });
    it('pause stops autonomous generation and scheduled sends', async () => {
        const f = await fixture(); await f.auto.settings({ enabled: false }, 'admin'); await f.auto.tick();
        expect(f.counts()).toEqual({ calls: 0, approvals: 0, ticks: 0 });
    });
    it('automatic publication requires connected selected accounts', async () => {
        const f = await fixture(); await expect(f.auto.settings({ mode: 'autopublish' }, 'admin')).rejects.toThrow(/Connect/);
        const connected = await fixture({ connected: true });
        await connected.auto.settings({ mode: 'autopublish' }, 'admin'); await connected.auto.runNow('admin');
        expect(connected.counts().approvals).toBe(3);
    });
    it('claim screening and missing creative prevent automatic approval', () => {
        expect(qualityCheck({ platform: 'instagram', text: 'Free delivery https://smartsoko.tz/', productId: 'rice' }).passed).toBe(false);
        expect(qualityCheck({ platform: 'x', text: 'Browse https://smartsoko.tz/' }).passed).toBe(false);
        expect(qualityCheck({ platform: 'x', text: 'Browse https://smartsoko.tz/', productId: 'rice' }).passed).toBe(true);
    });
});
