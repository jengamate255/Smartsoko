import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { productRoutes }=require('../server/src/routes/products');
const { invalidateCatalog }=require('../server/src/services/catalog-cache');
describe('catalog HTTP behavior',()=>{
  let server,base,calls=0,db;
  beforeAll(async()=>{
    const express=require('express');const app=express();
    db={async getAll(c){calls++;await new Promise(r=>setTimeout(r,20));return c==='products'?[{id:'p1',name:'Milk',price:2000,category:'General',sellerId:'s1',stock:5},{id:'p2',name:'Bread',price:1000,category:'general',sellerId:'s1',stock:5}]:[{id:'s1',name:'QA shop'}]}};
    app.set('db',db);productRoutes(app);server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});base='http://127.0.0.1:'+server.address().port;
  });
  afterAll(async()=>{if(server)await new Promise(r=>server.close(r))});
  it('coalesces concurrent list/detail reads and preserves the web DTO',async()=>{
    const replies=await Promise.all(Array.from({length:20},(_,i)=>fetch(base+(i%2?'/api/products/p1':'/api/products?limit=2'))));
    expect(replies.every(r=>r.status===200)).toBe(true);expect(calls).toBe(1);
    const item=await (await fetch(base+'/api/products/p1')).json();expect(item.data).toMatchObject({id:'p1',seller_id:'s1',price:2000});
  });
  it('returns one category for different capitalization',async()=>{const r=await(await fetch(base+'/api/categories')).json();expect(r.data).toHaveLength(1);expect(r.data[0]).toMatchObject({id:'general',product_count:2})});
  it('rejects zero limits and negative offsets',async()=>{expect((await fetch(base+'/api/products?limit=0')).status).toBe(400);expect((await fetch(base+'/api/products?offset=-1')).status).toBe(400)});
  it('refreshes the cache after invalidation',async()=>{const before=calls;invalidateCatalog(db,'products');await fetch(base+'/api/products');expect(calls).toBe(before+1)});
  it('returns the native product DTO when requested',async()=>{const item=await(await fetch(base+'/api/products/p1',{headers:{'User-Agent':'okhttp'}})).json();expect(item.data.seller.id).toBe('s1');expect(item.data.images).toEqual([])});
});
