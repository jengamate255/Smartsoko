'use strict';
const { createClient } = require('@supabase/supabase-js');
const { createMarketingAgent } = require('../services/marketing-agent');
const { createAutopilot } = require('../services/marketing-autopilot');
function mountMarketingAgent(app, { agent: supplied, auth } = {}) {
    const client = supplied ? null : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const agent = supplied || createMarketingAgent({ client });
    const autopilot = client ? createAutopilot({ client, agent }) : null;
    const verify = auth || require('../middleware/auth').verifyToken;
    const gate = [verify, (req, res, next) => ['admin', 'super_admin'].includes(req.user?.role)
        ? next() : res.status(403).json({ success: false, error: 'Platform admin access required' })];
    const handle = fn => async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try { res.json({ success: true, data: await fn(req) }); }
        catch (error) { res.status(error.status || (/storage/.test(error.message) ? 503 : 400)).json({ success: false, error: error.message }); }
    };
    const base = '/api/admin/marketing-agent';
    app.get(base, ...gate, handle(async () => ({ posts: await agent.list(), connected: agent.config(), schedulerEnabled: process.env.MARKETING_SCHEDULER_ENABLED === 'true', aiConfigured: agent.aiConfigured(), groqConfigured: agent.groqConfigured(), automation: autopilot ? await autopilot.summary() : null, generator: 'catalog-template' })));
    app.put(base + '/automation', ...gate, handle(req => autopilot.settings(req.body || {}, req.user.uid)));
    app.post(base + '/run', ...gate, handle(req => autopilot.runNow(req.user.uid)));
    app.post(base + '/campaigns', ...gate, handle(req => agent.generate(req.body || {}, req.user.uid)));
    app.put(base + '/posts/:id', ...gate, handle(req => agent.edit(req.params.id, req.body || {})));
    app.post(base + '/posts/:id/approve', ...gate, handle(req => agent.approve(req.params.id, req.user.uid)));
    app.post(base + '/posts/:id/find-image', ...gate, handle(req => agent.findImage(req.params.id)));
    app.post(base + '/posts/:id/cancel', ...gate, handle(req => agent.cancel(req.params.id)));
    app.post(base + '/posts/:id/publish', ...gate, handle(req => agent.publish(req.params.id)));
    const timer = setInterval(() => (autopilot ? autopilot.tick() : agent.tick()).catch(() => console.warn('Marketing scheduler needs attention')), 60000);
    timer.unref();
    return { agent, stop: () => clearInterval(timer) };
}
module.exports = { mountMarketingAgent };
