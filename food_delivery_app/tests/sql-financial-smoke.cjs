'use strict';
// Uses an isolated PostgreSQL WASM engine, never the hosted database.
const fs = require('fs'),
    path = require('path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = path.join(__dirname, '..');
(async () => {
    const pg = new PGlite();
    try {
        await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
        CREATE TABLE orders(id uuid PRIMARY KEY,customer_id uuid,restaurant_id uuid,driver_id text,total integer,total_paid integer,non_refundable_fee integer,delivery_fee integer,payment_status text,escrow_status text,status text,refund_to_wallet boolean,updated_at timestamptz,escrow_released_at timestamptz);
        CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,customer_id uuid,amount integer,method text,status text,transaction_ref text UNIQUE,notes text,metadata jsonb);
        CREATE TABLE vendor_payouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
        CREATE TABLE escrow_holds(order_id uuid PRIMARY KEY,total_amount integer,seller_amount integer,driver_amount integer,platform_amount integer,status text,updated_at timestamptz);`);
        const escrow = fs.readFileSync(
            path.join(root, 'supabase/migrations/20261018143000_atomic_escrow_movements.sql'),
            'utf8'
        );
        const start = escrow.indexOf('create or replace function public.transition_order_escrow('),
            end = escrow.indexOf('revoke all on function public.transition_order_escrow', start);
        await pg.exec(escrow.slice(start, end));
        for (const file of [
            '20261020090000_admin_report_delivery.sql',
            '20261020100000_admin_wallet_refunds.sql',
        ])
            await pg.exec(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
        for (const file of ['report-delivery.sql', 'admin-wallet-refunds.sql'])
            await pg.exec(fs.readFileSync(path.join(root, 'supabase/tests', file), 'utf8'));
        console.log(
            'PostgreSQL report leases, wallet credits, retry deduplication, refund limits and role restrictions passed'
        );
    } finally {
        await pg.close();
    }
})().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
