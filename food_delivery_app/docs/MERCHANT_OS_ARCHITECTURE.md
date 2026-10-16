# SmartSoko Merchant Dashboard — Architecture Assessment

> Generated 2026-08-25 by the Graph Engineering autonomous build. Source of truth for
> what exists, what is missing, and the implementation order for the Merchant OS.

## 1. Architecture Map (as inspected)

```
┌────────────────────────── Clients ──────────────────────────┐
│ web/ (PWA)   public/ (served static root)   Flutter lib/    │
│ Android native (customer/driver/merchant/admin)             │
└──────────────┬──────────────────────────────────────────────┘
               │ fetch / Firestore SDK v9
┌──────────────▼──────────────────────────────────────────────┐
│ server-production.js  (Express, NODE_ENV=production)        │
│  • helmet + compression + rate limiters + CSP               │
│  • static: public/                                          │
│  • route modules: server/src/routes/* via loadRoute()       │
│  • flat db adapter: req.app.get('db')                       │
│  • auth: middleware/auth.js (Firebase ID token → role)      │
│  • audit: logAudit() → server/src/config/logger.js          │
└──────────────┬──────────────────────────────────────────────┘
               │ createDualDb (lib/server-db.js)
┌──────────────▼──────────────────────────────────────────────┐
│ PRIMARY: Firebase Firestore (Admin SDK)                     │
│ FALLBACK: Supabase Postgres (quota-error auto-fallback)     │
│   collections→tables map, camelCase↔snake_case field map    │
└─────────────────────────────────────────────────────────────┘
Payments: PesaPal (api/pesapal.js) + nTZS (api/ntzs.js), escrow_status
on orders; wallets/transactions/escrow_holds tables (Supabase migrations).
```

## 2. Existing Feature Map — Merchant

| Area | State | Where |
|---|---|---|
| Auth | ✅ working | Firebase Auth client + `/api/auth/verify`; `auth-check.js` gates /merchant to merchant\|seller |
| Seller resolution | ✅ | merchant.html loads `sellers` where ownerId==uid → `currentSeller` |
| Orders list/detail/status | ⚠️ partial | Client-side Firestore direct (`merchant-enhancements.js`), no explicit state machine, no backend transition guard |
| Products read/toggle/delete | ⚠️ partial | Public GET /api/products exists; writes are client-side Firestore |
| Inventory | ⚠️ naive | `stockQuantity` field bumped directly on product docs — no ledger/history |
| Analytics | ⚠️ partial | analytics.js computes from client-side order snapshots; `/api/analytics` = 501 stub |
| Finance/wallet | ✅ exists | Supabase RPC `get_merchant_earnings_summary`, wallet-manager.js, payouts |
| Promotions | ✅ basic | promos feature routes + promotions tab |
| Customers | ⚠️ basic | customers.html + customer APIs from orders |
| Staff | ⚠️ naive | `staff` collection writes from client, no capability checks |
| Delivery | ✅ basic | driver assignment via direct Firestore updateDoc |
| Settings/profile | ⚠️ basic | profile tab writes seller doc directly |

## 3. Database Map (collections in active use)

- **Firestore**: users, sellers, products, orders, drivers, staff, staffInvites,
  reviews, payouts, promos/deals, categories(derived), notifications(ad-hoc)
- **Order doc shape**: customerId, customerName, customerPhone, deliveryAddress,
  items[{id,name,price,quantity,sellerId}], subtotal, deliveryFee, tax, discount,
  total, status, paymentMethod, paymentStatus ('cod'|'pending_confirmation'|...),
  paymentRef, sellerId, sellerName, merchantId, createdAt
- **Product doc shape**: name/title, price/salePrice, image/imageUrl, category,
  sellerId/merchantId, stockQuantity, isAvailable, popular, cost (absent today)
- **Supabase**: profiles, sellers, products, orders, drivers, deals, referrals,
  loyalty_transactions, wallets, transactions, escrow_holds, disbursements,
  admin_audit_logs, coupons, payout_batches/items, otps
- **Indexes**: orders by (customerId+createdAt), (sellerId+createdAt), (userId+createdAt)

## 4. API Map (backend)

Existing and working:
- `GET /health`, `/api/config`, `/api/status`
- `GET /api/products` (+seller/category/popular filters), `GET /api/categories`
- `POST/GET /api/orders` (customer-facing, verifyToken, idempotency, zod validation)
- `GET /api/auth/verify`, `/api/admin/*` (adminGate), `/api/audit-logs` (admin)
- `/api/payments/pesapal/*`, `/api/payments/ntzs/*`, `/api/wallet/*`,
  `/api/disbursements/*`, features router (`/deals /gift-cards /subscriptions
  /referrals /reviews /promos`), `/api/shopify/*`, `/ai/*`

Missing (501 stub or absent): `/api/analytics` (stub), everything under
`/api/merchant/*`, inventory endpoints, suppliers, purchases, expenses, staff
management API, notifications center, settings API, merchant-scoped reports.

## 5. Dependency Graph (new merchant OS layer)

```
middleware/capabilities ──▶ services/event-bus ──▶ notifications
        │                        ▲
        ▼                        │
services/audit ◀── all write routes
        │
services/order-state-machine ─▶ orders routes (transitions)
services/inventory-ledger ────▶ inventory + purchase receive + sale hooks
services/analytics-service ───▶ overview + reports (single source of calcs)
routes/merchant.js ───────────▶ mounts every /api/merchant/* domain
```

## 6. Missing Functionality (gaps to close)

1. Merchant-scoped, server-enforced APIs (today the dashboard bypasses the API and
   hits Firestore directly with only security-rule protection)
2. Explicit order state machine w/ invalid-transition rejection
3. Inventory ledger (auditable movements; current stock derived/synced)
4. Capability-based RBAC (roles exist; capabilities don't)
5. Suppliers, Purchase Orders, Expenses domains — entirely absent
6. Server-side analytics service (no duplication across pages)
7. Event-driven notification center
8. Audit records on merchant mutations (logAudit exists but unused by merchant flows)

## 7. Recommended Implementation Order

Matches §31 of the mandate, adjusted to repo reality:

1. Graph seed + this assessment *(done first)*
2. Capabilities middleware + tenant isolation guard (server/src/middleware/capabilities.js)
3. Domain services: event bus, audit helper, order state machine, inventory ledger,
   analytics service (pure functions → unit-testable without Firestore)
4. `/api/merchant/*` route module (overview, orders, products, inventory, customers,
   payments view incl. escrow display fields, suppliers, purchases, expenses,
   staff, notifications, settings)
5. Mount in server-production.js
6. Vitest suites for state machine, capabilities, ledger math, analytics
7. Frontend wiring: new merchant-os.js module calling the APIs (keep existing tabs;
   add Suppliers/Purchases/Expenses sections); no fake data anywhere
8. Live verification against the running production server + E2E smoke
9. Graph + memory updates, commit candidates per domain

## Constraints honored

- Reuse createDualDb adapter interface (add/get/where/update/set/delete/getAll)
- Never fake payments/inventory/analytics numbers
- TZS formatting, EAT timezone bucketing live in config-driven helpers
- Multi-tenant isolation: every merchant query filtered by the caller's own
  sellerId resolved server-side from the verified token (never from request body)
