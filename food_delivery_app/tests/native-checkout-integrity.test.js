import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const uid='00000000-0000-4000-8000-000000000010', seller='00000000-0000-4000-8000-000000000001';
describe('native checkout shares verified pricing and auth',()=>{
  let server,base,db,directory;
  beforeAll(async()=>{
    directory=fs.mkdtempSync(path.join(os.tmpdir(),'smartsoko-native-checkout-'));vi.stubEnv('IDEMPOTENCY_DIR',directory);
    const express=require('express');const app=express();app.use(express.json());
    const data={products:[{id:'p1',name:'Milk',price:3000,stock:20,sellerId:seller}],sellers:[{id:seller,isOpen:true}],addresses:[{id:'a1',userId:uid,streetAddress:'Isolated QA address',fullName:'QA',phoneNumber:'255700000000'}],carts:[{id:uid,items:[{id:'p1',price:1,quantity:2}],updated_at:'first'}],profiles:[{id:uid}],orders:[]};
    db={data,async get(c,id){return data[c]?.find(x=>x.id===id)||null},async getAll(c){return data[c]||[]},async where(c,k,op,v){return(data[c]||[]).filter(x=>x[k]===v)},async add(c,row){const d={id:'qa-'+(data[c].length+1),...row};data[c].push(d);return d},async set(c,id,row){data[c]=data[c].filter(x=>x.id!==id);data[c].push({id,...row})}};
    db.update=async(c,id,patch)=>Object.assign(data[c].find(x=>x.id===id),patch);
    app.set('db',db);app.set('config',{deliveryFee:2000,taxRate:.18});
    app.set('authMiddleware',{async verifyToken(req,res,next){if(req.headers.authorization!=='Bearer verified-qa-token')return res.status(401).json({success:false,error:'Invalid token'});req.user={uid,email:'qa@example.invalid'};next()}});
    require('../server/src/routes/mobile-app').mobileAppRoutes(app);
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});base='http://127.0.0.1:'+server.address().port;
  },120000);
  afterAll(async()=>{if(server)await new Promise(r=>server.close(r));vi.unstubAllEnvs();if(directory)fs.rmSync(directory,{recursive:true,force:true})});
  const submit=(token='verified-qa-token',key='native-race')=>fetch(base+'/api/orders/mobile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify({addressId:'a1',paymentMethodId:'cod'})});
  it('does not trust an unverified Supabase-looking JWT payload',async()=>{
    const forged='e30.'+Buffer.from(JSON.stringify({sub:uid,iss:'https://forged.supabase.co/auth/v1'})).toString('base64url')+'.forged';expect((await submit(forged)).status).toBe(401);expect(db.data.orders).toHaveLength(0);
  });
  it('creates exactly one order for 20 simultaneous native retries',async()=>{
    const replies=await Promise.all(Array.from({length:20},()=>submit()));expect(replies.every(r=>[201,409].includes(r.status))).toBe(true);expect(db.data.orders).toHaveLength(1);expect(db.data.orders[0]).toMatchObject({subtotal:6000,total:9080,customer_id:uid,restaurant_id:seller});
    expect((await submit()).status).toBe(201);expect(db.data.orders).toHaveLength(1);
  });
  it('allows a new cart checkout using the same address without a client key',async()=>{
    await db.set('carts',uid,{items:[{id:'p1',quantity:1,price:1}],updated_at:'new-cart'});expect((await submit('verified-qa-token',null)).status).toBe(201);expect(db.data.orders).toHaveLength(2);expect(db.data.orders[1].subtotal).toBe(3000);
  });
  it('cancels the owned order using only deployed milestone columns',async()=>{
    const r=await fetch(base+'/api/orders/'+db.data.orders[0].id+'/cancel',{method:'POST',headers:{Authorization:'Bearer verified-qa-token','Content-Type':'application/json'},body:'{}'});
    expect(r.status).toBe(200);expect(db.data.orders[0].status).toBe('cancelled');
    expect(db.data.orders[0]).not.toHaveProperty('cancellationReason');
  });
});
