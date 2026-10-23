# Admin reliability improvements — 20 October 2026

## Implemented

| Area | Behavior | Activation / limits |
| --- | --- | --- |
| Wallet refunds | Verified admin requests call a PostgreSQL transaction that locks the order, credits the existing customer wallet ledger, verifies settlement, and records the request atomically. Request IDs survive browser retries; repeated requests cannot create a second credit. | Apply `20261020100000_admin_wallet_refunds.sql` after the existing atomic escrow migrations. Full refundable balance only; the non-refundable fee is retained. Released/disputed funds and unverified payments require manual review. This does not send a refund to a bank or payment provider. |
| Finance | Available balances, held seller earnings, completed/queued payouts, customer wallet refunds and recorded platform fees come from actual wallet/payment/escrow records. Missing data produces Unavailable rather than invented estimates. Unlinked payouts and missing/mismatched ledger histories are reported. | Existing deployed ledger tables are read with pagination. Reads across tables are observational rather than a single transactional snapshot. Legacy balances without a transaction history remain unverified. |
| Commission rules | New order quotes select the active category rule, then the default rule. Rates are validated and bounded by the discounted item subtotal. The chosen amount is stored as the order's existing `non_refundable_fee`; changing rules does not recalculate historical fees. Order items preserve seller IDs/names for future recovery. | No active rule means zero commission, not a guessed 10%. The fee is withheld from seller proceeds; customer totals are not increased by this change. Historical fee reporting uses recorded values. |
| Seller review | Orders resolve current and legacy store references. Orders now have an Export Seller Review action providing IDs/status/evidence without customer contact details. The conservative repair CLI is unchanged: no speculative names or current-catalog matches are applied automatically. | 39 orders have valid existing references; 46 lack enough association evidence and 6 have orphan references. The user confirmed no source export/mapping is available. Those 52 remain unchanged. |
| Browser workflows | Disposable loopback tests exercise order status updates, wallet refund submission, merchant role changes, anonymization, manual payout-request creation, stale driver locations, tracking failures and reconnection. The fixture injects isolated adapters into production routes and blocks outbound server requests. | No live account or money mutation. The fixture refund adapter is a simulation; the actual PostgreSQL refund implementation is tested separately with the existing escrow function. The browser runner refuses to run writes without its fixture-only marker. |
| Logistics | Visible Logistics tabs poll every 15 seconds, avoid overlapping requests, retry on reconnect and stop polling on tab exit. Stale/invalid locations are excluded from live markers. Failure preserves last known rows with an explicit disconnected state. Filters and map-layer switches survive refresh. | Freshness requires a location-specific timestamp within two minutes. Drivers without one appear stale. Mapbox health and admin status now check the same actual public token against the styles endpoint; generic host reachability is no longer treated as proof of valid credentials. |
| Operations | The Server tab shows persisted operational alerts for payment reconciliation, report worker failures, overdue/unlinked payouts, wallet-ledger discrepancies and stale core-data exports. Finance reconciliation checks run every five minutes. | Alerts are visible in the app; there is no offsite uptime service or external alert delivery. Local job-state persistence needs a durable logs directory in production. Email delivery remains parked until a verified domain is available. |
| Encrypted exports | Core data is exported outside the repository using AES-256-GCM. Verification decrypts the saved archive, checks ciphertext integrity, restores/parses the payload, validates table counts and duplicate IDs. Automatic exports run no more than once per 24 hours; failures are retried later and surfaced as alerts. | This is a logical export of 12 core tables, not a full SQL/schema/auth/storage/PITR backup. Cross-table reads are not a consistent database snapshot. A full database recovery drill still requires database-level credentials, PostgreSQL tooling and a separate disposable restore database. |

## Database activation

Apply only the specific new migrations through the target project's SQL editor or your normal reviewed migration process:

1. `supabase/migrations/20261020090000_admin_report_delivery.sql` — scheduled reports, when the deferred domain setup is ready.
2. `supabase/migrations/20261020100000_admin_wallet_refunds.sql` — atomic admin wallet refunds. Requires the existing `transition_order_escrow` function from `20261018143000_atomic_escrow_movements.sql` and its wallet prerequisites.

Do not bulk-push unrelated pending migrations. The current session has Supabase REST service credentials but no direct database URL or management token, so the new SQL was tested locally and has **not** been applied to the hosted database. Refund operations fail closed until the function exists.

## Backup configuration and recovery

The local environment now contains a generated `BACKUP_ENCRYPTION_KEY` and `BACKUP_DIR=D:/project/smartsoko-backups`. No key or exported row contents are in the repository. Preserve the encryption key separately and securely: losing it makes these archives unrecoverable. Rotation requires retaining keys for older archives. No automatic deletion/retention policy is enabled.

```powershell
node food_delivery_app/scripts/verified-supabase-backup.cjs
node food_delivery_app/scripts/verified-supabase-backup.cjs --verify D:/project/smartsoko-backups/<archive>.aes
```

The verified export contains orders, sellers, restaurants, products, profiles, drivers, wallets, wallet_transactions, escrow_holds, vendor_payouts, payments and platform_settings. It intentionally does not claim to cover every Supabase schema/table, authentication users, uploaded media, or the newly introduced report/refund tables. Use provider/database-native backups for complete disaster recovery. The current copy is on the same machine; an offsite copy requires a separately configured destination.

The first live export was verified successfully: 91 orders, 21 sellers, 5 restaurants, 56 products, 35 profiles, 3 drivers, 36 wallets, 0 wallet transactions, 2 escrow holds, 2 vendor payouts, 13 payments and 7 settings rows. Missing transaction history is surfaced for review rather than reconstructed.

## Reproduce tests

Run the targeted Vitest suites listed in the change's final verification. For SQL tests, install `@electric-sql/pglite` in a temporary directory outside the repository, set `PGLITE_MODULE` to that installation, then run:

```powershell
node food_delivery_app/tests/sql-financial-smoke.cjs
```

This creates an in-memory PostgreSQL database, loads the real escrow-refund function and new migrations, and exercises provider-free wallet settlement, idempotency, full-refund limits, rejected released/unpaid orders, service-role access, schedule leases and retry state. It is not a distributed multi-session stress test.

For browser tests, start `node food_delivery_app/tests/admin-browser-fixture.cjs`, bind a CUA tab to the printed loopback URL plus `/admin`, import `tests/admin-browser-checks.mjs` in CUA and call its default export with that tab. The fixture is loopback-only, has disposable data, never runs the production entry point, and blocks outbound server requests. Close the test tab and fixture server afterward.

Evidence is saved under `output/admin-browser-workflows-2026-10-20.json` and `output/admin-browser-state-2026-10-20.json`. The latter confirms one simulated wallet credit, one refund record, persisted status/role changes and anonymization. These are test artifacts, not live financial records.

## Full database recovery drill (prepared, not run)

`node food_delivery_app/scripts/verify-postgres-recovery.cjs` creates an encrypted custom-format PostgreSQL archive, validates it with pg_restore, restores it transactionally into a separate fresh database, and compares restored relation counts. It requires compatible pg_dump/pg_restore/psql tools plus DATABASE_URL and RESTORE_DATABASE_URL. The target name must start with smartsoko_restore_, differ from the source, and contain no user relations; a populated target is rejected. Credentials are passed through child-process environment variables. The restored scratch database remains available for inspection.

The full drill was not run because database-level connections/client tools were unavailable. This is separate from the successfully verified core-data export. See the [PostgreSQL pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html) for restore behavior.

Mapbox checking follows the [official Styles API](https://docs.mapbox.com/api/maps/styles/). Server-side checks do not replace real device/map-rendering checks for URL-restricted tokens.

Final validation: 76 targeted Vitest tests passed; PostgreSQL financial/state checks passed; all 6 disposable browser workflows passed, including tracking outage/recovery. No live refund, payout transfer, role change, or deletion was performed.
