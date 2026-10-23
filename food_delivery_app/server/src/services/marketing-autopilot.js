'use strict';
const { randomUUID } = require('crypto');
const KEY = 'marketing_agent_control';
const ID = 'e5391bb6-165a-46df-9733-e2781b548d91';
const DEFAULTS = { enabled: false, mode: 'review', provider: 'groq', language: 'en',
    platforms: ['facebook', 'instagram', 'x'], dailyHour: 9,
    brandBrief: 'SmartSoko is a local marketplace in Tanzania. Speak warmly and clearly to everyday shoppers. Help people discover local products and sellers. Never promise unverified prices, discounts, delivery times, or quality certifications.' };
function validateSettings(input, current = DEFAULTS) {
    const config = { ...current };
    if (typeof input.enabled === 'boolean') config.enabled = input.enabled;
    if (input.mode !== undefined) { if (!['review', 'autopublish'].includes(input.mode)) throw new Error('Invalid operating mode'); config.mode = input.mode; }
    if (input.provider !== undefined) { if (!['groq', 'ai', 'template'].includes(input.provider)) throw new Error('Invalid copywriter'); config.provider = input.provider; }
    if (input.language !== undefined) { if (!['en', 'sw'].includes(input.language)) throw new Error('Invalid language'); config.language = input.language; }
    if (input.dailyHour !== undefined) { if (!Number.isInteger(Number(input.dailyHour)) || input.dailyHour < 0 || input.dailyHour > 23) throw new Error('Choose an hour from 0 to 23'); config.dailyHour = Number(input.dailyHour); }
    if (input.platforms !== undefined) {
        if (!Array.isArray(input.platforms) || !input.platforms.length || input.platforms.some(p => !DEFAULTS.platforms.includes(p))) throw new Error('Choose valid channels');
        config.platforms = [...new Set(input.platforms)];
    }
    if (input.brandBrief !== undefined) {
        if (typeof input.brandBrief !== 'string' || !input.brandBrief.trim() || input.brandBrief.length > 2000) throw new Error('Brand brief must contain 1–2000 characters');
        config.brandBrief = input.brandBrief.trim();
    }
    return config;
}
function qualityCheck(post) {
    const blockers = [];
    if (post.holdReason) blockers.push(post.holdReason);
    if (post.imageNeedsReview) blockers.push('Selected image needs a relevance and usage review');
    if (post.platform === 'instagram' && !post.imageUrl) blockers.push('A public product image is required');
    if (!post.productId) blockers.push('No available catalogue product was selected');
    if (!post.text.includes('https://smartsoko.tz/')) blockers.push('SmartSoko destination link is missing');
    if (/\b(free delivery|guaranteed|\d+\s*%\s*off|cheapest|best price|limited stock|last chance)\b/i.test(post.text)) blockers.push('Unverified promotional claim needs a human check');
    return { passed: !blockers.length, blockers, checks: ['Platform length and original link validated during generation', 'Catalogue product selected', 'Promotional claim screen completed'], humanReview: true };
}
function dayInTanzania(date) { return new Date(+date + 3 * 3600000).toISOString().slice(0, 10); }
function createAutopilot({ client, agent, clock = () => new Date() }) {
    async function checked(query) { const { data, error } = await query; if (error) throw new Error('Agent control storage unavailable'); return data; }
    async function read() {
        let rows = await checked(client.from('admin_settings').select('*').eq('key', KEY));
        if (!rows.length) {
            const initial = { config: { ...DEFAULTS }, history: [], run: null, lastDay: null };
            const result = await client.from('admin_settings').insert({ id: ID, key: KEY, value: initial, updatedAt: clock().toISOString() });
            if (result.error && result.error.code !== '23505') throw new Error('Agent control storage unavailable');
            rows = await checked(client.from('admin_settings').select('*').eq('key', KEY));
        }
        if (!rows.length) throw new Error('Agent control unavailable');
        const row = rows[0]; return { row, value: typeof row.value === 'string' ? JSON.parse(row.value) : row.value };
    }
    async function cas(snapshot, value) {
        const rows = await checked(client.from('admin_settings').update({ value, updatedAt: clock().toISOString() }).eq('id', snapshot.row.id).eq('value', JSON.stringify(snapshot.row.value)).select('*'));
        if (!rows.length) throw Object.assign(new Error('Agent state changed. Refresh and retry.'), { status: 409 });
        return { row: rows[0], value };
    }
    async function settings(input, actor) {
        const snapshot = await read(); const config = validateSettings(input, snapshot.value.config);
        if (config.mode === 'autopublish' && config.platforms.some(p => !agent.config()[p])) throw new Error('Connect all selected social accounts before enabling automatic publication');
        return (await cas(snapshot, { ...snapshot.value, config, updatedBy: actor, updatedAt: clock().toISOString() })).value;
    }
    async function summary() {
        const { value } = await read();
        const posts = await agent.list();
        return { ...value, quality: Object.fromEntries(posts.map(p => [p.id, qualityCheck(p)])),
            counts: { drafts: posts.filter(p => p.status === 'draft').length, scheduled: posts.filter(p => p.status === 'approved').length, published: posts.filter(p => p.status === 'published').length, attention: posts.filter(p => ['unknown', 'publishing'].includes(p.status)).length },
            nextRun: `${value.config.dailyHour.toString().padStart(2, '0')}:00 EAT daily`,
            blockers: value.config.platforms.filter(p => !agent.config()[p]).map(p => `${p}: social account is not connected`),
        };
    }
    async function runNow(actor = 'marketing-agent', automatic = false) {
        let snapshot = await read(); const state = snapshot.value; const now = clock();
        const day = dayInTanzania(now);
        if (automatic && (!state.config.enabled || Number(new Date(+now + 3 * 3600000).getUTCHours()) < state.config.dailyHour)) return { skipped: true };
        if (state.lastDay === day) return { skipped: true, reason: 'Today’s campaign is already prepared' };
        if (automatic && state.lastAttemptDay === day) return { skipped: true, reason: 'Today’s attempt requires review' };
        if (state.run?.status === 'running' && Date.parse(state.run.leaseUntil) > +now) return { skipped: true, reason: 'Agent is already working' };
        const run = state.run?.status === 'running' ? { ...state.run } : { id: randomUUID(), day, startedAt: now.toISOString(), actor };
        Object.assign(run, { status: 'running', leaseUntil: new Date(+now + 15 * 60000).toISOString() });
        snapshot = await cas(snapshot, { ...state, run, lastAttemptDay: day });
        try {
            const existing = await agent.list();
            let posts = existing.filter(p => p.runId === run.id);
            const steps = ['Read the live product catalogue', 'Rotate away from recently featured products', 'Create platform-specific copy and tracked links', 'Validate copy and media requirements'];
            if (!posts.length) posts = await agent.generate({ days: 1, campaign: 'Daily market / ' + run.day, runId: run.id,
                strategyDay: Math.floor(Date.parse(run.day) / 86400000),
                language: state.config.language, copywriter: state.config.provider, platforms: state.config.platforms,
                brandBrief: state.config.brandBrief, avoidProductIds: existing.slice(0, 15).map(p => p.productId).filter(Boolean) }, actor);
            const quality = posts.map(p => ({ id: p.id, platform: p.platform, ...qualityCheck(p) }));
            if (state.config.mode === 'autopublish') {
                for (const post of posts) {
                    const latest = (await read()).value.config;
                    if (!latest.enabled || latest.mode !== 'autopublish') break;
                    if (post.status === 'draft' && qualityCheck(post).passed && agent.config()[post.platform]) await agent.approve(post.id, actor);
                }
                steps.push('Queue eligible posts for automatic publication');
            } else steps.push('Prepare the owner review queue');
            const done = { ...run, status: 'completed', finishedAt: clock().toISOString(), postIds: posts.map(p => p.id), quality, steps,
                summary: `${posts.length} posts prepared. ${quality.filter(q => !q.passed).length} need creative or factual attention. ${state.config.mode === 'review' ? 'Ready for your review.' : 'Eligible posts queued for publication.'}` };
            const current = await read();
            if (current.value.run?.id !== run.id) throw new Error('Agent run ownership changed');
            await cas(current, { ...current.value, run: done, lastDay: run.day, history: [done, ...(current.value.history || [])].slice(0, 30) });
            return done;
        } catch (error) {
            const current = await read();
            if (current.value.run?.id === run.id) {
                const failed = { ...run, status: 'failed', finishedAt: clock().toISOString(), summary: 'Campaign preparation stopped. No automatic retry today.', error: String(error.message).slice(0, 250) };
                await cas(current, { ...current.value, run: failed, history: [failed, ...(current.value.history || [])].slice(0, 30) });
            }
            throw error;
        }
    }
    let busy = false;
    async function tick() {
        if (busy) return; busy = true;
        try {
            await runNow('marketing-agent', true);
            if ((await read()).value.config.enabled) await agent.tick({ enabled: true });
        } finally { busy = false; }
    }
    return { summary, settings, runNow, tick };
}
module.exports = { createAutopilot, validateSettings, qualityCheck, dayInTanzania, DEFAULTS };
