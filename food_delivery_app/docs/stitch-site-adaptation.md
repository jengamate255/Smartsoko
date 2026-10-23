# SmartSoko site-wide Stitch adaptation

The source inventory covers nine SmartSoko Stitch projects, with 56 available screen/asset references. `stitch-design-sources.json` records their identifiers and titles. Repeated screen variants inform one responsive implementation; unrelated account projects are outside this site.

| Stitch reference | Existing site adaptation |
| --- | --- |
| Storefront Redesign, project `7875963631660458576` | Homepage and `/home`: cream harvest hero, forest navigation, category tiles, rounded cards, orange basket actions |
| Product Page and Product Page Redesign, projects `620713273628273462`, `8052287942923066467` | Product media/details hierarchy, large price, lime cart action, forest purchase action, description/review surfaces |
| Super App Interface, project `3584016013784402564`: Marketplace and Food Delivery Desktop Dashboard | Discovery grid, category strip, customer navigation rail, food/vendor surfaces |
| Super App Interface: Checkout | Basket summary column, address and payment cards, selected-payment treatment; existing quote and payment logic retained |
| Super App Interface and Ecosystem: Customer Profile and SmartWallet | Grouped account settings, identity card, wallet balance emphasis, transaction surfaces, referral page |
| Super App Interface: Track Order | Rounded tracking cards and map container, delivery progress and summary surfaces |
| Merchant projects `15620036158330806831`, `11675664027020795950`, `18311388537432084624` | Existing merchant shell, menu, inventory, order desk, analytics, finance, reviews, promotions and settings |
| Latest Merchant Dashboard, project `904715823202515991` | Its available design-system guidance was reviewed. Existing approved light merchant styling is retained; no screen is exposed by this project's `list_screens` response. |
| Super App Interface: Driver Dashboard variants | Light operational surfaces, responsive desktop navigation rail, wider task list and map treatment using existing driver screens |
| Ecosystem, project `4470957492600036342` | Existing marketplace, home, wallet and customer-service entry points; shared visual treatment across remaining customer pages |

SmartMove/vehicle mockups and concierge concepts without corresponding functional web routes are retained as design references. This adaptation does not add nonfunctional booking or AI controls, invent map/location data, or turn unrelated native/mobile screens into new web services.

## Implementation

- `public/css/stitch-site.css` and `public/js/stitch-site.js` provide shared customer presentation, desktop navigation, accessible support controls and consistent footer social placeholders.
- `public/css/stitch-operations.css` extends the existing merchant and driver layouts. Dedicated menu and inventory styles remain in place.
- Matching styles and scripts are copied to the `web/` public root for existing hosted templates. The hosted checkout's existing payment choices differ from the Express checkout and have been preserved.
- Self-hosted Inter and Material Symbols assets, with their redistribution licenses, live in `public/fonts/` and `web/fonts/`. They avoid missing glyphs when the external font stylesheet is delayed.
- Main customer templates receive only scoped classes, stylesheet/script references and targeted layout hooks. IDs, event handlers, authentication, quotes, stock checks and payment requests remain owned by the existing pages.
- `/main` was missing its opening body tag; its document wrapper is restored without replacing its data scripts.
- Customer support opens an email to the contact already present in the project. Live associate chat is not configured. Social profiles remain explicitly marked as coming soon until official URLs are provided.

## Validation

- Syntax checks for inline scripts in 45 touched page documents and the shared styles.
- 42 isolated browser page/viewport combinations for the Express customer pages; 21 for the existing hosted templates. Checked at 1440px, 887px and 390px with no page errors or horizontal overflow after fixes.
- Catalogue-to-cart and support opening/closing checks; Express checkout's hidden payment option stays hidden.
- 25 merchant readiness/menu/finance checks, plus 43 checkout/payment/merchant operations checks passed.
- Visual QA uses synthetic catalogue and wallet data and blocks writes. No live order, payout, or product mutation was submitted during these checks.

Changes are served by the existing local server. No deployment was run and no Stitch credential was saved in project files.
