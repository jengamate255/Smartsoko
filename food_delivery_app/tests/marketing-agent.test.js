import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createMarketingAgent, draftCampaign, validate, writeAiCopy } = require('../server/src/services/marketing-agent');
const { mountMarketingAgent } = require('../server/src/routes/marketing-agent');
const express = require('express');
const at = () => new Date('2026-10-22T10:00:00Z');
function storage() {
    const rows = [];
    const client = { from: table => {
        let op = 'read', payload, filters = [];
        const q = { select: () => q, eq: (k, v) => { filters.push(row => k === 'value' ? JSON.stringify(row[k]) === v : row[k] === v); return q; },
            like: () => q, order: () => q, limit: () => q,
            insert: value => { op = 'insert'; payload = value; return q; },
            update: value => { op = 'update'; payload = value; return q; },
            then: (resolve, reject) => Promise.resolve().then(() => {
                if (op === 'insert') { rows.push(...payload); return { data: payload }; }
                const source = table === 'products' ? [{ id: 'rice', is_available: true, stock: 5 }] : rows;
                const matches = source.filter(row => filters.every(f => f(row)));
                if (op === 'update') matches.forEach(row => Object.assign(row, payload));
                return { data: matches.map(row => ({ ...row })) };
            }).then(resolve, reject) };
        return q;
    } };
    return { client, rows };
}
async function fixture(fetchImpl = async () => ({ ok: true, json: async () => ({ data: { id: 'remote' } }) })) {
    const { client, rows } = storage();
    const agent = createMarketingAgent({ client, fetchImpl, clock: at, env: { MARKETING_X_USER_TOKEN: 'server-only' } });
    const [post] = draftCampaign({ days: 1 }, [], at).filter(p => p.platform === 'x');
    rows.push({ id: post.id, key: 'marketing_post:' + post.id, value: JSON.stringify(post) });
    return { agent, post, rows };
}
describe('marketing campaign integrity', () => {
    it('rewrites invalid AI copy once and preserves the final draft for review', async () => {
        const posts = draftCampaign({ days: 1 }, [], at); let calls = 0;
        const result = await writeAiCopy(posts, { env: { GEMINI_API_KEY: 'test-key', MARKETING_AI_MODEL: 'test-model' }, fetchImpl: async () => {
            calls++;
            return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ posts: posts.map(p => ({ id: p.id, text: calls === 1 ? 'a'.repeat(6000) : p.text })) }) }] } }] }) };
        } });
        expect(calls).toBe(2); expect(result.every(p => p.revisionAttempts === 1 && p.status === 'draft')).toBe(true);
    });
    it('rechecks stock before contacting a publishing platform', async () => {
        let calls = 0; const f = await fixture(async () => { calls++; });
        const post = { ...f.post, productId: 'missing-product', status: 'approved' };
        f.rows[0].value = JSON.stringify(post);
        await expect(f.agent.publish(post.id)).rejects.toThrow(/unavailable/);
        expect(calls).toBe(0); expect((await f.agent.list())[0].status).toBe('draft');
    });
    it('Groq uses only its own credential and retains private draft status', async () => {
        const posts = draftCampaign({ days: 1 }, [], at);
        let request;
        const result = await writeAiCopy(posts, { provider: 'groq', env: { GROQ_API_KEY: 'groq-secret', MARKETING_GROQ_MODEL: 'groq-model', GEMINI_API_KEY: 'other-secret' }, fetchImpl: async (url, options) => {
            request = { url, options };
            return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ posts: posts.map(p => ({ id: p.id, text: p.text })) }) } }] }) };
        } });
        expect(request.url).toBe('https://api.groq.com/openai/v1/chat/completions');
        expect(request.options.headers.Authorization).toBe('Bearer groq-secret');
        expect(JSON.stringify(request)).not.toContain('other-secret');
        expect(result.every(p => p.generator === 'groq' && p.status === 'draft')).toBe(true);
    });
    it('AI copywriting preserves platform identity, links and draft approval', async () => {
        const posts = draftCampaign({ days: 1 }, [], at);
        const generated = posts.map(p => ({ id: p.id, text: p.text }));
        const result = await writeAiCopy(posts, { env: { GEMINI_API_KEY: 'secret', MARKETING_AI_MODEL: 'test-model' }, fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }] }) }) });
        expect(result.every(p => p.status === 'draft' && p.generator === 'gemini')).toBe(true);
        await expect(writeAiCopy(posts, { env: {}, fetchImpl: () => { throw new Error('No request allowed'); } })).rejects.toThrow(/needs/);
        generated[0].text = 'An unrelated link https://evil.example';
        await expect(writeAiCopy(posts, { env: { GEMINI_API_KEY: 'secret', MARKETING_AI_MODEL: 'test-model' }, fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }] }) }) })).rejects.toThrow(/validation/);
    });
    it('creates three private drafts per day using actual catalogue items', () => {
        const posts = draftCampaign({ days: 7 }, [{ id: 'one', name: 'Local rice', image_url: 'https://smartsoko.tz/rice.jpg', stock: 3 }], at);
        expect(posts).toHaveLength(21);
        expect(posts.every(p => p.status === 'draft' && p.productId === 'one')).toBe(true);
        expect(posts[0].scheduledAt).toBe('2026-10-23T06:00:00.000Z');
        expect(posts.find(p => p.platform === 'x').text.length).toBeLessThanOrEqual(280);
    });
    it('excludes unavailable products and does not invent offers', () => {
        const posts = draftCampaign({ days: 1, language: 'sw' }, [{ id: 'no', name: 'Sold out', stock: 0 }], at);
        expect(posts.every(p => p.productId === null && !/free|discount|Sold out/i.test(p.text))).toBe(true);
        expect(() => draftCampaign({ days: 100 })).toThrow();
    });
    it('requires an image for Instagram and enforces platform limits', () => {
        expect(() => validate({ platform: 'instagram', text: 'Hello' })).toThrow(/image/);
        expect(() => validate({ platform: 'x', text: 'a'.repeat(281) })).toThrow();
        expect(() => validate({ platform: 'instagram', text: 'Hello', imageUrl: 'http://example.com/x' })).toThrow();
    });
    it('does not send an unapproved post', async () => {
        const { agent, post } = await fixture(() => { throw new Error('Must not publish'); });
        await expect(agent.publish(post.id)).rejects.toThrow(/Approve/);
    });
    it('editing invalidates approval', async () => {
        const { agent, post } = await fixture(); await agent.approve(post.id, 'admin');
        expect((await agent.edit(post.id, { ...post, text: 'Changed' })).status).toBe('draft');
        await expect(agent.publish(post.id)).rejects.toThrow(/Approve/);
    });
    it('a concurrent publication sends exactly one request', async () => {
        let count = 0;
        const { agent, post } = await fixture(async () => { count++; return { ok: true, json: async () => ({ data: { id: 'remote' } }) }; });
        await agent.approve(post.id, 'admin');
        const results = await Promise.allSettled([agent.publish(post.id), agent.publish(post.id)]);
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
        expect(count).toBe(1); expect((await agent.list())[0].status).toBe('published');
    });
    it('lost responses cannot trigger duplicate posting', async () => {
        let count = 0;
        const { agent, post } = await fixture(async () => { count++; throw new Error('Timeout with token=secret'); });
        await agent.approve(post.id, 'admin');
        await expect(agent.publish(post.id)).rejects.toThrow(/uncertain/);
        await expect(agent.publish(post.id)).rejects.toThrow(/Approve/);
        expect(count).toBe(1); expect((await agent.list())[0].status).toBe('unknown');
        expect(JSON.stringify(await agent.list())).not.toContain('token=secret');
    });
    it('cancelled posts cannot be published', async () => {
        const { agent, post } = await fixture(); await agent.cancel(post.id);
        await expect(agent.approve(post.id, 'admin')).rejects.toThrow(/drafts/);
    });
    it('scheduler is off unless explicitly enabled', async () => {
        const { agent, post } = await fixture(); await agent.approve(post.id, 'admin');
        await agent.tick(); expect((await agent.list())[0].status).toBe('approved');
    });
    it('Facebook and Instagram use their configured destinations and confirm remote IDs', async () => {
        for (const platform of ['facebook', 'instagram']) {
            const { client, rows } = storage(); const calls = [];
            const env = { MARKETING_META_VERSION: 'v26.0', MARKETING_FB_PAGE_ID: 'page', MARKETING_FB_TOKEN: 'page-secret', MARKETING_IG_USER_ID: 'instagram', MARKETING_IG_TOKEN: 'ig-secret' };
            const agent = createMarketingAgent({ client, env, clock: at, fetchImpl: async (url, init) => {
                calls.push({ url, payload: JSON.parse(init.body) });
                return { ok: true, json: async () => ({ id: url.endsWith('/media') ? 'container' : 'published' }) };
            } });
            const post = draftCampaign({ days: 1 }, [{ id: 'rice', name: 'Rice', stock: 1, image_url: 'https://smartsoko.tz/rice.jpg' }], at).find(p => p.platform === platform);
            rows.push({ id: post.id, key: 'marketing_post:' + post.id, value: JSON.stringify(post) });
            await agent.approve(post.id, 'admin');
            expect((await agent.publish(post.id)).remoteId).toBe('published');
            if (platform === 'facebook') expect(calls[0].url).toContain('/page/feed');
            else { expect(calls).toHaveLength(2); expect(calls[1].payload.creation_id).toBe('container'); }
            expect(JSON.stringify(await agent.list())).not.toContain('secret');
        }
    });
    it('enabled scheduler only sends due approved posts', async () => {
        const { client, rows } = storage(); let calls = 0;
        const agent = createMarketingAgent({ client, clock: at, env: { MARKETING_SCHEDULER_ENABLED: 'true', MARKETING_X_USER_TOKEN: 'token' }, fetchImpl: async () => {
            calls++; return { ok: true, json: async () => ({ data: { id: 'scheduled-post' } }) };
        } });
        const post = draftCampaign({ days: 1 }, [], at).find(p => p.platform === 'x');
        post.scheduledAt = '2026-10-21T06:00:00Z';
        rows.push({ id: post.id, key: 'marketing_post:' + post.id, value: JSON.stringify(post) });
        await agent.tick(); expect(calls).toBe(0);
        await agent.approve(post.id, 'admin'); await agent.tick(); await agent.tick();
        expect(calls).toBe(1);
    });
    it('marketing endpoints reject non-admin accounts', async () => {
        const app = express();
        const mounted = mountMarketingAgent(app, { agent: {}, auth: (req, res, next) => { req.user = { role: 'customer' }; next(); } });
        const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
        try { const r = await fetch('http://127.0.0.1:' + server.address().port + '/api/admin/marketing-agent'); expect(r.status).toBe(403); }
        finally { mounted.stop(); await new Promise(resolve => server.close(resolve)); }
    });
});
