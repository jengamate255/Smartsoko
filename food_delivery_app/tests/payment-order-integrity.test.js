import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const customer='00000000-0000-4000-8000-000000000010';
describe('PesaPal uses saved order totals',()=>{
  let server,base,vendorCalls=[],originalFetch;
  beforeAll(async()=>{
    vi.stubEnv('PESAPAL_CONSUMER_KEY','');vi.stubEnv('PESAPAL_CONSUMER_SECRET','');
    const express=require('express');const payment=require('../api/pesapal');
    await payment.init(null,{verifyToken(req,res,next){req.user={uid:customer,email:'qa@example.invalid'};next()}});
    const app=express();app.use(express.json());
    app.set('db',{async get(c,id){return id==='mine'?{id,customerId:customer,total:3180,paymentStatus:'pending_confirmation',customerName:'QA Tester',customerPhone:'255700000000'}:id==='other'?{id,customerId:'other-user',total:3180}:null}});
    app.use('/pay',payment);server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});base='http://127.0.0.1:'+server.address().port;
    originalFetch=global.fetch;
    vi.stubGlobal('fetch',async(url,options)=>{
      if(String(url).startsWith(base))return originalFetch(url,options);
      vendorCalls.push({url:String(url),body:options?.body&&JSON.parse(options.body)});
      const body=String(url).includes('RequestToken')?{token:'qa-token'}:String(url).includes('RegisterIPN')?{ipn_id:'qa-ipn'}:{order_tracking_id:'qa-tracking',redirect_url:'https://example.invalid/qa-payment'};
      return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
    });
  },120000);
  afterAll(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();if(server)await new Promise(r=>server.close(r))});
  const pay=body=>fetch(base+'/pay/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  it('ignores a tampered amount and callback URL',async()=>{
    const r=await pay({orderId:'mine',amount:1,callbackUrl:'https://example.invalid/attacker'});expect(r.status).toBe(200);
    const sent=vendorCalls.find(c=>c.url.includes('SubmitOrderRequest'));expect(Number(sent.body.amount)).toBe(3180);expect(sent.body.callback_url).toContain('/api/payments/pesapal/callback?orderId=mine');expect(sent.body.callback_url).not.toContain('attacker');
  });
  it('rejects a foreign or nonexistent order before contacting the payment provider',async()=>{
    const before=vendorCalls.length;expect((await pay({orderId:'other',amount:1})).status).toBe(403);expect((await pay({orderId:'missing',amount:1})).status).toBe(404);expect((await pay({amount:1})).status).toBe(400);expect(vendorCalls.length).toBe(before);
  });
});
