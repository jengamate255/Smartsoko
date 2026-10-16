import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
// Real Postgres engine, isolated in memory; no hosted orders or payments.
const { PGlite } = require('pglite-2');
const seller = '00000000-0000-4000-8000-000000000001';
const p1 = '00000000-0000-4000-8000-000000000011';
const p2 = '00000000-0000-4000-8000-000000000012';
let db;
const items = (quantity = 1) => [{ id:p1, price:100, quantity }];
const order = (lines = items(), promo = null) => db.query(
  `insert into orders(restaurant_id,items,subtotal,total,status,promo_code) values($1,$2,100,100,'pending',$3) returning *`,
  [seller, JSON.stringify(lines), promo]);
const stock = async () => (await db.query('select stock from products where id=$1',[p1])).rows[0].stock;
describe('Postgres checkout reservations and write permissions', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table products(id uuid primary key, seller_id uuid, name text, price integer, is_available boolean default true, stock integer, updated_at timestamptz);
      create table orders(id uuid primary key default gen_random_uuid(),customer_id uuid,restaurant_id uuid,items jsonb not null,subtotal integer,total integer,delivery_fee integer default 0,tax integer default 0,discount_amount integer default 0,status text,promo_code text,payment_status text,order_type text);
      create table promotions(code text primary key,merchant_id uuid,is_active boolean default true,usage_count integer default 0,usage_limit integer,valid_from timestamptz,valid_until timestamptz);
      create table inventory_movements(id uuid primary key default gen_random_uuid(),merchant_id uuid,product_id text,delta numeric,type text,reason text,ref_id text,balance_after numeric,actor_id text);
      grant all on all tables in schema public to service_role, anon, authenticated;
      grant insert(items),update(total) on orders to authenticated;
      create policy unsafe_old_writes on orders for all to authenticated using(true) with check(true);
      create function confirm_payment_escrow() returns void language sql security definer as 'update public.orders set payment_status=''paid''';
      insert into products values('${p1}','${seller}','Milk',100,true,10,null),('${p2}','${seller}','Bread',200,true,0,null);
      insert into promotions(code,usage_limit) values('LAST',1);
    `);
    await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261016064804_atomic_checkout_stock.sql',import.meta.url),'utf8'));
  },120000);
  afterAll(async () => { await db?.close(); });
  it('aggregates duplicate lines, reserves once and records a movement',async()=>{
    const saved=(await order([{id:p1,price:100,quantity:2},{id:p1,price:100,quantity:1}])).rows[0];
    expect(saved.stock_reserved).toBe(true); expect(await stock()).toBe(7);
    expect((await db.query('select delta,balance_after from inventory_movements')).rows).toEqual([{delta:'-3',balance_after:'7'}]);
    await db.query("update orders set status='cancelled' where id=$1",[saved.id]);
    await db.query("update orders set status='cancelled' where id=$1",[saved.id]);
    expect(await stock()).toBe(10);
    expect((await db.query('select count(*) from inventory_movements')).rows[0].count).toBe(2);
  });
  it('rolls back the whole basket when a later product is unavailable',async()=>{
    await expect(order([{id:p1,price:100,quantity:2},{id:p2,price:200,quantity:1}])).rejects.toThrow(/insufficient stock/);
    expect(await stock()).toBe(10);
  });
  it('does not oversell when 20 submissions compete for 10 units',async()=>{
    const replies=await Promise.allSettled(Array.from({length:20},()=>order()));
    expect(replies.filter(x=>x.status==='fulfilled')).toHaveLength(10);
    expect(await stock()).toBe(0);
    await db.exec("update orders set status='cancelled' where status='pending'");
    expect(await stock()).toBe(10);
  });
  it('serializes last-use promotions and restores usage only once on cancellation',async()=>{
    const saved=(await order(items(),'LAST')).rows[0];
    await expect(order(items(),'LAST')).rejects.toThrow(/Promotion/);
    expect(await stock()).toBe(9);
    await db.query("update orders set status='cancelled' where id=$1",[saved.id]);
    await db.query("update orders set status='cancelled' where id=$1",[saved.id]);
    expect((await db.query("select usage_count from promotions where code='LAST'")).rows[0].usage_count).toBe(0);
    expect(await stock()).toBe(10);
  });
  it('rejects stale prices, invalid quantities and seller mismatches without stock changes',async()=>{
    for(const lines of [[{id:p1,price:1,quantity:1}],[{id:p1,price:100,quantity:0}],[{id:p1,price:100,quantity:10001}]]) await expect(order(lines)).rejects.toThrow();
    await db.query('update products set seller_id=null where id=$1',[p1]);
    await expect(order()).rejects.toThrow();
    await db.query('update products set seller_id=$1 where id=$2',[seller,p1]);
    expect(await stock()).toBe(10);
  });
  it('prevents editing totals, reopening cancelled orders, or deleting reservations',async()=>{
    const saved=(await order()).rows[0];
    await expect(db.query('update orders set total=1 where id=$1',[saved.id])).rejects.toThrow(/immutable/);
    await expect(db.query('delete from orders where id=$1',[saved.id])).rejects.toThrow(/Cancel/);
    await db.query("update orders set status='cancelled' where id=$1",[saved.id]);
    await expect(db.query("update orders set status='pending' where id=$1",[saved.id])).rejects.toThrow(/reopen/);
  });
  it('does not put fulfilled goods back on the shelf for a refund',async()=>{
    const saved=(await order()).rows[0];
    await db.query("update orders set status='delivered' where id=$1",[saved.id]);
    await expect(db.query("update orders set status='cancelled' where id=$1",[saved.id])).rejects.toThrow(/separate return/);
    await db.query("update orders set status='refunded' where id=$1",[saved.id]);
    expect(await stock()).toBe(9);
  });
  it('keeps inventory adjustment and its audit record atomic',async()=>{
    const entry={merchantId:seller,productId:p1,type:'damage',delta:-2};
    const result=await db.query('select apply_inventory_movement($1) as result',[JSON.stringify(entry)]);
    expect(result.rows[0].result.newStock).toBe(7);
    await expect(db.query('select apply_inventory_movement($1)',[JSON.stringify({...entry,delta:-20})])).rejects.toThrow(/Insufficient/);
    expect(await stock()).toBe(7);
  });
  it('denies direct client writes and RPC calls despite old permissive policies and column grants',async()=>{
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      try {
        await expect(order()).rejects.toThrow(/permission denied/);
        await expect(db.query('update orders set total=1')).rejects.toThrow(/permission denied/);
        await expect(db.query('select apply_inventory_movement($1)',['{}'])).rejects.toThrow(/permission denied/);
        await expect(db.query('select confirm_payment_escrow()')).rejects.toThrow(/permission denied/);
      } finally { await db.exec('reset role'); }
    }
    await db.exec('set role service_role');
    try { expect((await order()).rows[0].stock_reserved).toBe(true); }
    finally { await db.exec('reset role'); }
  });
  it('preserves empty wallet topup references without reserving goods',async()=>{
    const before=await stock();
    const saved=(await db.query("insert into orders(items,subtotal,total,status,order_type) values('[]',100,100,'topup_pending','wallet_topup') returning *")).rows[0];
    expect(saved.stock_reserved).toBe(false);
    await db.query("update orders set status='topup_completed' where id=$1",[saved.id]);
    expect(await stock()).toBe(before);
  });
});
