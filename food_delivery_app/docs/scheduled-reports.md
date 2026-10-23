# Scheduled admin reports

The admin Analytics tab can create, inspect and pause email schedules. Daily reports run at 09:00 Africa/Dar_es_Salaam, weekly reports on Monday at 09:00, and monthly reports on the first day at 09:00. Monthly reports cover a rolling 30-day window. The Node server polls once per minute and must remain running; missed occurrences are coalesced into one catch-up report, not a backlog of emails.

## Enable delivery

1. Apply only `supabase/migrations/20261020090000_admin_report_delivery.sql` to the target Supabase project using its SQL editor or your normal migration process. Do not blindly push unrelated pending migrations.
2. Add server-only environment variables to `food_delivery_app/.env` or the deployment's secret settings:

   ```dotenv
   RESEND_API_KEY=<your Resend API key>
   REPORT_EMAIL_FROM=SmartSoko Reports <reports@your-verified-domain.com>
   REPORT_DEFAULT_RECIPIENT=<report recipient>
   ```

   Existing `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) are also required. Never put these values in public JavaScript or commit the local environment file. The requested recipient is configured locally; the repository example contains no real recipient address.
3. Verify the sender's domain with Resend. A Gmail recipient is supported; a personal Gmail address cannot substitute for a sender on your verified domain.
4. Restart the server. Sign in as an admin, open Analytics, and create a schedule. Missing email configuration or schema returns an error instead of a false success.

This implementation uses [Resend's email API](https://resend.com/docs/api-reference/emails/send-email) with base64 CSV attachments and its [24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Delivery and recovery

- Service-role-only tables and RPCs keep recipients and report contents out of public/client roles. Anonymous admin bypass is no longer honored by admin routes.
- Each occurrence has a five-minute database lease. Another server can reclaim it after a crash. Local overlapping ticks are suppressed.
- The exact email payload is frozen in the database before sending, so retrying after an uncertain provider response uses identical content and a stable idempotency key.
- Retries use 5, 10, 15 and 20 minute delays, up to five attempts. An uncertain occurrence older than 23 hours fails for manual review rather than risking a duplicate beyond the provider's deduplication window.
- The table exposes the next attempt, last provider acceptance, and last error. Provider acceptance is not proof of inbox delivery; bounces/spam placement need provider-side monitoring.
- Pausing preserves the row and delivery history. A currently leased schedule returns 409; retry after the active delivery completes. Failed or paused schedules can be replaced after reviewing provider history. There is no automatic resume that could accidentally repeat an uncertain send.
- Revenue reports distinguish gross order value from paid, non-cancelled order value. They do not claim to calculate authoritative settlement income. Orders reports omit customer contact details; Users reports include only ID, role and creation date. CSV formula-looking fields are escaped.
- Schedule windows are half-open `[start, run_at)` in UTC. The schedule's execution time is 09:00 EAT. Orders/users are paginated; a report over 100,000 rows fails rather than silently truncating.

## Historical seller associations

The admin order API now resolves seller names using both `sellers` and legacy `restaurants`, and normalizes seller ID aliases. A unanimous seller ID preserved in every item snapshot can be displayed and proposed for repair. JSON-string snapshots are supported.

Run from the repository root:

```powershell
node food_delivery_app/scripts/repair-order-sellers.cjs
node food_delivery_app/scripts/repair-order-sellers.cjs --apply
```

The default is read-only. Apply only patches a missing `restaurant_id` if every item snapshot identifies the same existing seller/restaurant. A conditional update also verifies that the item snapshot is unchanged. Existing IDs, orphan IDs and mixed/unknown ownership are never overwritten. Matching today's catalog alone requires review because ownership may have changed.

The live read-only audit on 20 October 2026 found 91 orders: 39 linked to existing sellers/restaurants, 6 orphan references, 46 unresolved, and zero safe automatic repairs. No live associations were changed. The unresolved/orphaned orders need an authoritative order export, seller mapping or original source records.

## Verification and remaining deployment work

54 targeted tests cover the report worker, report routes, seller recovery, disposable-account anonymization, refund-request validation, manual payout validation and gateway retry safety. The SQL migration/state tests ran in an isolated PostgreSQL engine, including role restrictions, claims, duplicate claims, stale acknowledgements, frozen payloads, retry limits and paused schedules.

No real recipient email, account deletion, refund or bank/mobile-money transfer was performed. The admin refund endpoint now uses an atomic customer-wallet credit after the admin wallet refund migration is applied. It does not initiate a provider/bank refund. See admin-reliability-2026-10-20.md for current behavior and activation requirements.

The hosted migration and live email acceptance remain pending until the target database migration and verified sender/API-key configuration are available. Tests use fake provider responses and isolated data; they never contact the hosted payment provider or send email.
