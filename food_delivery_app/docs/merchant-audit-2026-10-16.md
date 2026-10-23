# Merchant page audit — 16 October 2026

Target: http://localhost:3000/merchant. Local development server, connected Supabase project, existing signed-in browser session. No orders, payments, products, or settings were changed.

## Findings

1. **High: merchant authentication fails.** Browser console and page show `Auth backend not configured (missing Firebase credentials)`; server logged `/api/merchant/profile` returning HTTP 503. The frontend sends a Firebase ID token; `server/src/middleware/auth.js:ensureAdminForAuth` requires a service account before verifying it. Database connectivity through Supabase does not satisfy this authentication dependency. Fix Firebase verifier initialization/configuration while retaining signature, issuer, audience, expiry and role checks. Firebase guidance: https://firebase.google.com/docs/auth/admin/verify-id-tokens .
2. **Medium: fabricated review summary during failure.** Reviews displays 4.5 and zero reviews even though the profile failed to load. `public/merchant.html:463` hardcodes the initial average. Failure handling clears `restaurantRating` but not `averageRating`. Show an unknown value and a consistent error state until actual reviews arrive.
3. **Medium: inconsistent disconnected states.** Orders, Menu, Promos and Reviews explain the connection failure. Analytics silently returns when `currentSeller` is absent, leaving empty charts. Finance retains a payout action with unknown balances and reports its failure through a temporary notification. Settings presents default opening hours while the store profile is unavailable. Add a persistent connection banner, section-level recovery states and disabled actions until the store is loaded.
4. **Medium, source inspection; live reproduction blocked: analytics can disagree with server totals.** `loadAnalytics()` in `public/merchant.html` sums the client `allOrders` snapshot without excluding cancelled/refunded orders and buckets dates in the browser timezone. `server/src/services/analytics-service.js` defines revenue status eligibility and Tanzania timezone handling. Drive charts from server aggregates for the selected date range; do not use a potentially filtered/limited order desk snapshot as accounting data.

## Load test results

Reusable script: `node scripts/merchant-load-audit.cjs` from the app directory. Detailed machine-readable output: `logs/merchant-load-audit.json` (ignored by Git).

| Read workload | Workers | Requests | Result | p95 latency |
| --- | ---: | ---: | --- | ---: |
| Merchant HTML/assets burst | 1 | 120 | All 200 | 28.3 ms |
| Merchant HTML/assets burst | 10 | 120 | All 200 | 22.4 ms |
| Merchant HTML/assets burst | 30 | 120 | All 200 | 137.4 ms |
| Merchant HTML/assets, paced | 30 | 3,000 | All 200 | 60.8 ms |
| Public catalog, mostly cached | 1 / 5 / 10 | 60 total | All 200 | 18.1 / 16.8 / 14.2 ms |
| Merchant profile without credentials | 5 | 10 | All expected 401 | 5.6 ms |

Paced phase ran 18.7 seconds at 160.1 requests/second with 150 ms think time per worker. These are concurrent HTTP workers, not full browser users. No HTTP failures occurred in these workloads. The maximum paced response took 671.5 ms.

Limits: localhost client and server share a machine; short runs and warm caches do not establish production capacity or a saturation point. The live authenticated merchant workflow is blocked by finding 1. Full browser rendering, remote user networks, prolonged memory behavior, payment flows, and mutation contention were not load-tested. The test deliberately avoids `/health`, whose implementation writes a temporary health record.

## Existing automated tests

- `node --test tests/merchant-os/merchant-readiness.test.cjs`: 18 passed.
- `npm exec -- vitest run tests/merchant-os --exclude '**/*.cjs'`: 47 passed in six files.

The tests cover mocked merchant behavior, permissions, inventory accounting, order transitions, analytics and frontend readiness. Their success does not resolve the live authentication configuration failure.

## Recommended feature priorities

1. **Store connection status and recovery:** persistent connected/reconnecting/offline indicator; last successful sync; clear retry and session-expired guidance. This directly addresses the current failure.
2. **Inventory workspace:** expose low-stock thresholds, stock adjustments and reorder suggestions in this page. Inventory and supplier backend routes already exist; connect and complete those workflows before adding duplicate services.
3. **Order attention alerts:** opt-in sound/browser notifications for new orders and overdue acceptance, with acknowledgement and suppression for already-seen orders.
4. **Profit and payout reconciliation:** sales, refunds, fees and expenses in one view with per-order payout status. Reuse server accounting rules and the existing CSV export.
5. **Staff workspace:** surface existing staff/capability APIs through invitations and clearly scoped cashier/fulfilment/manager access. Add an audit trail for stock and order changes.
6. **Low-bandwidth resilience:** retain the last successful read snapshot with its timestamp and an obvious stale marker; back off reconnection attempts. Require a fresh server state before consequential writes, and never silently replay payments or order transitions.

Recommended next work: resolve authentication, correct misleading disconnected states, then rerun authenticated merchant reads and test mutations using isolated test-store fixtures.
