# Stock and order-write safeguards — 2026-10-16

## Deployment state

Prepared and locally tested. **The hosted database migration and Firebase rules are not deployed. Stock protection is not active on the running Supabase database yet.**

The linked Supabase CLI account returned HTTP 403 (`Your account does not have the necessary privileges to access this endpoint`) even for schema inspection. No hosted SQL changes were made. Docker is unavailable locally, so database tests use the already-installed PGlite Postgres engine. The deployed REST schema was inspected read-only to confirm column names/types.

## Changes

- `supabase/migrations/20261016064804_atomic_checkout_stock.sql`: reserves product quantities and records inventory movements inside the order insertion transaction. Duplicate product lines are aggregated; products lock in deterministic order. A failing line or exhausted promo rolls back the entire order, stock changes and audit records.
- Cancellation restores stock and promo usage once. Repeated cancellation cannot credit stock twice. Fulfilled/refunded goods require a separate physical return. Historical orders remain unreserved, so cancellation cannot credit stock that was never debited. Empty wallet-topup reference orders remain supported.
- Saved order items, customer, seller, promo and totals are immutable; reserved orders cannot be deleted.
- Inventory adjustments use a server-only SQL RPC to lock the product, change stock and record its movement together. The adapter uses the legacy path only when that RPC is absent (migration pending), or when running Firestore. Network/database errors never trigger a second independent adjustment.
- Direct `anon`/`authenticated` order writes are revoked, including preexisting column grants. Existing money/order mutation RPCs are made server-only to close SECURITY DEFINER bypasses. Client reads are unchanged.
- API stock conflicts return 409 and release the idempotency reservation after the failed Postgres transaction. Product catalog caches invalidate after order writes and inventory adjustments.
- Fixed deployed `max_discount_amount` promo-cap handling and native cancellation's profile-ID comparison and unsupported cancellation column.
- Firebase rules source routes order writes through the server. These rules remain undeployed.

## Validation and limits

Final regression run: **93 tests passed across 12 files** (`stock-regression-tests.log`). The restarted local server returned `overall: healthy`; Supabase, PesaPal and Mapbox connected, Firestore unconfigured as expected. Startup error log was empty.

`tests/atomic-checkout-stock.test.js` executes the actual migration against isolated Postgres tables, including permissive legacy policies, column grants and a privileged payment-function fixture. Checks include competing submissions, duplicate lines, rollback, exactly-once cancellation, promo limits, stale prices, immutable totals, wallet topups and role permissions.

PGlite uses a single connection: the competing-submission test exercises queued concurrent calls, not independent remote Postgres sessions. A multi-connection staging concurrency test and hosted privilege/advisor checks remain necessary before production rollout. No real orders, charges, refunds or delivery actions were created for these tests.

The SQL safeguards target Supabase. Firestore-primary transaction support is not implemented by this migration; do not interpret the Firebase rules change as atomic inventory support. Pending-payment reservation expiry, cross-host checkout idempotency and live payment/fulfillment verification remain separate work.

## Activation

1. Use an appropriately privileged Supabase account or the project's SQL Editor to apply **only** `20261016064804_atomic_checkout_stock.sql`. Do not blindly push the repository's older migrations into the existing database.
2. Run `supabase/verify-atomic-checkout.sql`: all three order triggers should be enabled, client write/RPC privileges false, service-role privileges true. Review hosted security advisors and any other privileged functions or inherited-role grants; those could not be inspected through the unavailable management connection.
3. Restart the server after SQL activation and verify the inventory RPC is present. Exercise two independent staging sessions buying the last unit, an insufficient-stock basket, cancellation twice, and an actual sandbox order/payment lifecycle. Verify stock and movement counts directly.
4. Deploy Firebase rules separately after checking any legacy client that still writes orders directly. Firestore-primary checkout still needs its own transactional implementation before enabling that backend for checkout.

The local server has been restarted with API compatibility fixes; those changes do not activate the unapplied database safeguards.
