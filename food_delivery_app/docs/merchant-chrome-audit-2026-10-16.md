# Merchant Chrome test — 2026-10-16

## Result

**Incomplete: live merchant access is blocked. Do not treat the merchant features as verified.**

Used installed Google Chrome through Playwright CLI, headed, in a separate `merchant-qa` session. The initial Codex Chrome connector was unavailable; the separate Chrome launch succeeded. No application source or account permissions were changed during this audit. No merchant records, orders, stock, staff access or payouts were changed.

## Browser findings

1. `/merchant` correctly redirected an unauthenticated browser to the merchant login.
2. Existing saved QA credentials authenticated successfully with Firebase (console: `Sign-in succeeded, resolving role for redirect`), but the page stayed on **Signing in…** during role resolution.
3. Direct navigation to `/merchant` exceeded the CLI's 60-second DOMContentLoaded timeout. Separate HTTP probes of `/merchant` and `/api/health` also timed out at 8–10 seconds during this period. This shows a broader responsiveness problem during the test, not merely a broken merchant tab.
4. After the page eventually loaded, `/api/merchant/profile` timed out through `merchant-request.js`. Chrome logged: `The request timed out. Refresh to check the latest state before trying again.`
5. The auth guard subsequently logged `Found user role via API as customer` and `Role 'customer' not authorized for /merchant`, then displayed **Access denied — You don’t have permission to view that page. Please sign in with an authorized account.** This may reflect the QA account's role/profile linkage or role-resolution behavior; its permissions were not modified to bypass the guard.
6. Server logs contained Supabase auth transport failures (`ECONNRESET`, `UND_ERR_CONNECT_TIMEOUT`); a Chrome Supabase connectivity probe also reported `ERR_CONNECTION_CLOSED`. These are supporting network observations, not proof of the exact cause of the login/role issue.

## Local regression checks

- `node --test tests/merchant-os/merchant-readiness.test.cjs`: **18 passed**.
- `vitest run tests/merchant-os`: **47 passed across 6 files**.
- Logs: `merchant-readiness-current.log`, `merchant-regression-current.log` in this directory.

These checks exercise UI controller logic, inventory behavior, order transitions, field mappings, analytics, merchant API behavior and tenant/capability guards using isolated data. They are not a substitute for live browser feature testing.

## Remaining live browser coverage

| Area | Status |
| --- | --- |
| Merchant login and access | Failure/blocker reproduced |
| Dashboard/profile loading | Timed out; access denied |
| Orders, filters, detail, transitions, CSV | Blocked by merchant access |
| Products, options, categories, availability, editing | Blocked by merchant access |
| Inventory, suppliers, purchases, expenses | Blocked; browser reachability also needs checking |
| Customers, staff and delivery | Blocked; browser reachability also needs checking |
| Promotions and reviews | Blocked by merchant access |
| Finance, payout history, analytics/export | Blocked by merchant access |
| Store settings and responsive layout | Blocked by merchant access |
| Real payout or financial transaction | Not performed |

## Next step

Sign in with an account that is authorized for an existing merchant in the open Chrome test window, or repair the saved QA account's role/profile linkage through the normal authorized administration flow. Repeat the tests after confirming `/api/merchant/profile` returns successfully and the server remains responsive. Use disposable staging data for write workflows and a sandbox for payment/payout verification.
