# Founder inputs and evidence register

Internal working document · 19 October 2026

## Confirmed

- Raise target: **TZS 5,000,000**, confirmed in conversation.
- SmartSoko is a local marketplace and food-delivery product with multiple app implementations.
- Supabase is the runtime database; optional Firestore absence is expected under the supplied repository instructions.

## Founder inputs needed before investor sharing

1. Founder name, contact, relevant background, ownership and actual team responsibilities.
2. First launch city, neighbourhood, service radius, categories, operating hours and delivery arrangement.
3. Commercial stage: prelaunch, pilot or trading; date range for all traction claims.
4. Verified customers, active merchants, completed paid orders, GMV, net platform revenue, refunds and promotional spend. Distinguish demos and seeded data from real activity.
5. Merchant commitments, commission agreements, payment-provider charges and rider quotes.
6. Monthly operating costs, founder time commitment, existing liabilities and whether salaries need funding.
7. Desired financing structure, company registration and ownership/IP records. No valuation or investment terms are proposed in this kit.
8. Actual pilot duration and numerical success/stop criteria after cost validation.
9. A safe, verified demo link and product screenshots using test data with no customer details.

## Evidence to assemble

Prepare a dated product demo; sanitised order and payment exports; merchant agreements; delivery quotes; an expense budget; incorporation and ownership documents; and a reconciliation of customer receipts, merchant/driver liabilities and transfers. Share only records appropriate to the recipient and omit secrets and personal customer details.

Interview customers and merchants in the proposed service area. Record current ordering methods, typical baskets, pain points, willingness to pay and willingness to switch. Record responses rather than converting interest into sales commitments.

## Source register and limits

| Claim or topic | Repository source | Interpretation |
|---|---|---|
| Product scope and database context | `AGENTS.md` | More current database guidance than the Firebase-oriented app README |
| Storefront and ordering UI | `food_delivery_app/web/index.html`, `food_delivery_app/web/checkout.html` | Source implementation, not a live usage claim |
| Server orchestration | `food_delivery_app/server/server-production.js` | Entry point and route wiring, not production certification |
| Merchant order desk | `food_delivery_app/docs/merchant-order-desk-readiness.md` | Reports isolated checks; authenticated staging gaps remain |
| Stock safeguards | `food_delivery_app/docs/checkout-stock-safeguards.md` | States hosted migration was undeployed; current deployment must be checked |
| Merchant finance and payout process | `food_delivery_app/docs/manual-payouts.md` | External manual transfers are recorded; wallet credits are liabilities, not proof of transfer |
| Older M-Pesa deployment evidence | `food_delivery_app/docs/M-PESA-TEST-RESULTS.md` | May 2026 report describes a placeholder response; does not establish current payment status |
| Mobile implementations | `AGENTS.md`, root `README.md` | Multiple projects exist; no claim that all are released or equally mature |

Market source: [Bank of Tanzania, National Payment Systems Annual Report 2025](https://www.bot.go.tz/Publications/Regular/Annual%20Report/en/2026060211494565.pdf), printed page 29, accessed 19 October 2026. Reports 75.78 million active mobile money subscriptions in 2025. This is an infrastructure indicator, not unique customers, delivery demand or a market-size estimate.

No live database, customer records, financial accounts or deployed payment flow were inspected for this kit. Historical test counts in repository notes were not rerun and should not be presented as current certification.

## Resolve before the final deck

Keep the story centred on one pilot rather than all app modules. Use real commercial evidence when available; otherwise state the hypothesis and measurement plan. Refresh competitor research for the selected geography before adding named comparisons. Do not present optional merchant subscriptions, advertising or ride-hailing as existing revenue streams.
