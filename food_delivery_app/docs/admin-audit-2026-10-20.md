# Admin audit — 20 October 2026

Tested the signed-in admin dashboard at http://localhost:3001/admin against the configured Supabase data. No live records were changed.

## Verified

- All 21 tabs open and finish loading: overview, orders, sellers, users, products, logistics, verification, reviews, marketing, finance, notifications, CMS, support, analytics, server, audit, settings, risk, roles, webhooks, API keys.
- Real data tables and empty states render without JavaScript errors.
- Order details and timeline dialogs show the selected order.
- Quick search finds matching orders; Accepted filter narrows the results; refreshing retains both filters.
- Revenue report renders 30 daily rows. Export button executes without an error; CSV generation is regression-tested.
- Completed payouts agree with the payout ledger (TSh 0), replacing the misleading TSh 2,037,152 estimate previously shown as paid.
- Health is healthy; Supabase is connected. Missing Firestore is expected.
- Targeted automated checks: 18 passed across admin-dashboard-regression, manual-payout, and health suites.

## Changes

- Added a session-restoration guard after reproducing a false Session expired redirect when selecting a tab immediately after reload. Isolated regression coverage ensures no section requests run before the guard is ready.

- Refresh now dispatches the loader for every section. Removed the unconditional success toast that previously claimed an unperformed refresh succeeded.
- Reloads retain order search/status/date filters and valid pagination; invalid dates cannot crash order display or date filtering.
- Quick search now searches orders; Accepted is available in status selectors.
- Tab selection updates the CSS active class.
- Overview database status comes from the server instead of hardcoded Firebase success.
- Finance completed payouts come from the payout ledger; estimated commission and seller net are explicitly labeled estimates.
- Revenue report requests 30 days; revenue export uses the authenticated API and generates CSV instead of navigating to an unimplemented URL.
- Seller and finance CSV exports work; placeholder Export All Data was replaced with an explicitly scoped Core Data JSON export (orders, sellers, users, products; API limits/metadata preserved).
- The realtime client uses an isolated, nonpersistent auth storage key to avoid competing with the existing Supabase auth client.

## Remaining limits and follow-up

This is a read-only live audit plus isolated regression tests, not certification of every write workflow. Refunds, payouts, order updates, account deletions, role changes, broadcasts, webhook deliveries, and API key generation were not submitted against live data. Payout authorization and validation have isolated test coverage.

Report scheduling's backend currently records an admin notification; the inspected handler does not create a delivery schedule or send email. Scheduled delivery remains unverified and needs a real scheduler implementation.

Historic orders have missing seller names/associations: orders display N/A, analytics groups them as Unknown, and seller estimates cannot attribute them reliably. No associations were invented or live financial data repaired. Estimates still use a fixed 10% calculation and must not be treated as authoritative settlement balances. Analytics revenue currently includes all order statuses; it is gross order value rather than proof of received payment.

Mapbox availability is reported differently by the health and admin configuration checks; successful map rendering alone does not verify live driver updates.

The remaining CrossPlatform Firebase warning is consistent with optional Firestore in Supabase-only mode. The earlier duplicate Supabase-client warning did not recur during the verified reload/filter sequence.

Final browser verification: after reproducing the reload/navigation race, the guarded reload restored admin access and loaded Finance successfully without a new unauthorized response. Completed payouts again showed TSh 0. Added payout failure/retry UI so failed requests do not silently leave Loading displayed. Seller estimates also accept merchantId/restaurantId aliases. Evidence: output/admin-audit-2026-10-20.png.
