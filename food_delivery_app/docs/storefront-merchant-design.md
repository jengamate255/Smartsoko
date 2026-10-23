# Storefront and merchant Stitch redesign

## Design sources

- Storefront: Stitch project `7875963631660458576`, **SmartSoko Storefront Redesign**. The project exposes its design system and harvest thumbnail, but no screens through `list_screens`. The implementation follows its forest green, warm cream, orange cart actions, Inter typography, rounded white cards, and two-column mobile product grid. The project thumbnail is the local hero asset `images/stitch-harvest.png`.
- Merchant: Stitch project `11675664027020795950`, screen `5d30ae9aedae4247865811258ca110f1`, **SmartSoko Merchant Dashboard**. The implementation adapts its pale canvas, muted green sidebar, white metric cards, and quick actions to the existing operational order desk.

## Entry points

- `public/index.html`: storefront served by Express and Vercel.
- `web/index.html`: storefront served by Firebase Hosting and Netlify. Presentation is shared; existing hosted-page data scripts are retained.
- `public/merchant.html`: existing authenticated merchant dashboard. Its existing handlers, capabilities, stale-data safeguards, and finance controls are retained. Quick actions call the existing product, promotion, and analytics handlers.

The page styles are scoped in `css/storefront-stitch.css` and `css/merchant-stitch.css`. Generated Tailwind output is unchanged. The storefront style and harvest image have copies under both public roots.

## Verification

- Merchant readiness suite: 20 checks covering order filtering, authenticated requests, stale data, mutation guards, and appearance preferences.
- Finance browser regression: balance display, payout details, session/store safeguards, and offline behavior, using the existing isolated fixture.
- Isolated browser checks at 1440px and 390px: cart storage, search synchronization, carousel controls, merchant tabs, mobile metric expansion, and product/promotion dialogs; no page errors or horizontal overflow.
- CSS and inline JavaScript syntax checks and desktop/mobile screenshot inspection.

Browser fixtures use test catalog/order data and do not submit live orders or payouts. No deployment was run. No Stitch credentials are stored in project files.
