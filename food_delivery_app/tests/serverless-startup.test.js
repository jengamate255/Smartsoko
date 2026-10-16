import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
function handler(load) {
  const module = { exports:{} };
  vm.runInNewContext(source,{module,require:load,console:{error(){}},Date,Math});
  return module.exports;
}
function response() { return { statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(body){this.body=body;return this} }; }
afterEach(()=>vi.unstubAllEnvs());
describe('serverless startup',()=>{
  it('loads the AI routes from repository-owned dependencies without the sibling workspace',()=>{
    vi.stubEnv('GEMINI_API_KEY','');
    expect(()=>require('../server/src/routes/ai/product-agent')).not.toThrow();
    expect(require('../server/src/services/gemini-vision-provider').GeminiVisionProvider).toBeTypeOf('function');
  });
  it('includes shared API modules and public artwork in the deployment',()=>{
    const ignored=require('ignore')().add(fs.readFileSync(new URL('../.vercelignore',import.meta.url),'utf8'));
    for(const p of ['server/src/middleware/auth.js','server/src/middleware/rate-limiter.js','lib/server-db.js','public/images/products/example.png']) expect(ignored.ignores(p),p).toBe(false);
    for(const p of ['.env','.runtime/idempotency/key.json','public/seed-merchant.html','output/browser-results.json']) expect(ignored.ignores(p),p).toBe(true);
  });
  it('does not load the server until the request and reuses a successful initialization',async()=>{
    let loads=0,calls=0;
    const h=handler(()=>{loads++;return {app:()=>{calls++}}});
    expect(loads).toBe(0);
    await h({headers:{}},response());await h({headers:{}},response());
    expect(loads).toBe(1);expect(calls).toBe(2);
  });
  it('returns a controlled startup error without leaking stack traces or secret error text',async()=>{
    const h=handler(()=>{throw Object.assign(new Error('private environment text'),{code:'EROFS'})});
    const res=response();await h({headers:{}},res);
    expect(res.statusCode).toBe(503);expect(res.body.code).toBe('EROFS');expect(JSON.stringify(res.body)).not.toContain('private');
  });
  it('identifies a missing dependency without exposing its require stack',async()=>{
    const h=handler(()=>{throw Object.assign(new Error("Cannot find module 'compression'\nRequire stack: /private/path"),{code:'MODULE_NOT_FOUND'})});
    const res=response();await h({headers:{}},res);
    expect(res.body.dependency).toBe('compression');expect(JSON.stringify(res.body)).not.toContain('/private');
  });
  it('uses provider logging without attempting filesystem log writes on Vercel',()=>{
    vi.stubEnv('VERCEL','1');
    const loggerPath=require.resolve('../server/src/config/logger');delete require.cache[loggerPath];
    const mkdir=vi.spyOn(fs,'mkdirSync').mockImplementation(()=>{throw new Error('read-only filesystem')});
    let logger;
    try { logger=require(loggerPath).logger;logger.info('serverless startup check');expect(logger.transports.some(t=>t.name==='file')).toBe(false); }
    finally {logger?.close();mkdir.mockRestore();delete require.cache[loggerPath]}
  });
});
