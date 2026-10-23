# Site design browser audit — 19 October 2026

Reviewed all 38 HTML templates in `public/` and all 20 in `web/` in Chrome at 1440, 887, and 390 pixels wide (900 pixels high). Screenshots cover the rendered pages, including redirects, signed-out states, loading states, and legacy templates. This is a visual audit, not a claim that every authenticated workflow has live integration coverage.

## Changes

- Added `css/site-uniform.css` in both source roots and included it after page styles. It shares self-hosted Inter typography, icon glyphs, form controls, focus indicators, and the existing forest/cream visual palette.
- Restored spacing, color, radius, and typography tokens used by the older `smartsoko-*` templates. Their navigation, cards, product grid, checkout, and mobile controls now have complete styles.
- Fixed mobile overflow in the older marketplace category strips, seller order table, legacy checkout payment grid, and legacy products layout.
- Fixed fleet sidebar/content overlap, duplicate desktop navigation, and header contrast.
- Gave the login story panel a reliable local image and readable fallback background.
- Fixed the hosted feed's desktop width when the customer navigation rail is present. Added a translation fallback and a visible sample-product label for its existing design preview.
- Restored the hosted legacy landing page's missing utility stylesheet reference using the existing Tailwind asset; updated its brand and hero contrast.
- Styled the hosted social composer and skeleton surfaces, and fixed wallet balance-card contrast.

## Coverage

| Source root | Templates browsed |
| --- | --- |
| public | 404, admin-panel, admin, cart, chat, check-user, checkout, customer-orders, discovery, driver, errors, fleet-manager, home, index_marketplace, index, login, main, merchant, onboarding, orders, product, profile, referral, restaurant, seed-merchant, seller, setup, signup, smartsoko-cart, smartsoko-checkout, smartsoko-home, smartsoko-products, smartsoko-vendor, store, stores, supabase, track-order, wallet |
| web | cart, checkout, create-store, customer, customers, discovery-feed, driver, index-production, index, main-production, messages, onboarding, product, social-profile, social, store-settings, store, supabase, wallet, wishlists |

All detected horizontal overflow was fixed and the affected pages rechecked at all three widths. Additional read-only checks against the live localhost server covered home, discovery, product, cart, checkout, login, and fleet management at all three widths. The isolated merchant fixture covered menu and finance behavior.

## Verification and limits

- 25 merchant readiness/menu/finance tests passed.
- 29 checkout, payment integrity, and merchant operations tests passed.
- Isolated browser QA blocks live writes and uses synthetic catalogue data. Live checks did not submit forms or change orders, inventory, payouts, or account details.
- The isolated configuration stub intentionally lacks Firebase exports; this exposes integration errors in the old `index_marketplace`, `setup`, and `stores` templates. These were recorded separately from visual failures. `setup` and `seed-merchant` are administrative data utilities, not shopping pages.
- Several older hosted social/feed templates reference absent service bundles. Their visual surfaces are styled, but those underlying services were not implemented by this design pass. The feed remains an explicitly labeled sample-product preview.
- Signed-in merchant and administrative data screens still require their existing authentication and capabilities. Signed-out redirects were reviewed rather than bypassed against live accounts.

No deployment was performed. Refresh the existing localhost pages to load the updated source styles.
