# Merchant order desk readiness

The order desk now searches loaded orders by customer, phone, or reference; sorts by attention or creation time; and preserves search across refreshes. Pending acceptance for 10 minutes is highlighted as waiting, not as a missed delivery promise. Dates use Africa/Dar_es_Salaam.

Order buttons use the API's `allowedTransitionsHint`. The invalid ready-to-delivered shortcut has been removed. Pickup completion requires an explicit pickup type and confirmation. Cancellation also requires confirmation. Duplicate actions are blocked per order while saving; permission failures disable further writes until the page is reloaded.

Failed refreshes retain the last successful snapshot and disable its actions. An uncertain save blocks replay until a successful read confirms the saved state. Search explicitly discloses the API's latest-500-order limit. Customer text is escaped, and order/customer data is not interpolated into JavaScript handlers.

## Verification

- `node --test tests/merchant-os/merchant-readiness.test.cjs`: 18 tests pass.
- Browser checks against the isolated, in-memory fixture: phone search, order selection, pending-to-accepted transition, next-action rendering, simulated refresh failure, disabled stale actions, automatic recovery, empty-search recovery, and phone details/back navigation.
- Responsive recheck on 2026-10-16: no horizontal page overflow at 320px, 390px, and 1440px. Mobile Store pulse expansion, selected receipt, and Back to orders were checked in the browser. Secondary metrics remain visible on desktop.
- Operational labels use a 12px minimum; customer names and amounts have larger type. Primary order actions and status filters have 44px targets. Phone status filters use a three-column grid.
- Sales percentages require a positive comparison baseline; missing baselines show No comparison available. Failed metric reads clear both totals and supporting labels. Regression coverage checks these states.
- Captured isolated-data previews: screenshots/merchant-order-desk-desktop.png and screenshots/merchant-order-details-mobile.png.
- The fixture uses the real server state-machine module and cannot access live orders or send messages. Run it with `node tests/merchant-os/merchant-desk-fixture.cjs`; it prints its loopback URL.

## Remaining release validation

This verifies the order desk, not the entire merchant platform. Complete authenticated staging checks with a linked merchant profile and owner/read-only staff accounts before release. The available live session has previously returned missing-profile or timeout responses, so live lifecycle and permission checks remain unverified.

Backend concurrency across separate sessions, database failure handling, payout flows, and production deployment have not been certified by this UI change. No live orders, payments, database policies, or schema were changed.

## Dialogs and appearance verification (2026-10-16)

Product and promotion dialogs now have accessible names, initial field focus, a Tab/Shift+Tab focus loop, background inertness, page scroll locking, and focus restoration on close. Escape and backdrop dismissal use the normal product-editor reset path. Short phone viewports scroll dialog contents; form controls use 16px type on phones. Dark dialog headers use the same forest palette as their body.

Browser checks confirmed product focus wrapping in both directions, promotion focus wrapping, Escape returning focus to each opener, saved dark mode after reload, and horizontal phone tab navigation plus End. Settings fields and opening/closing times now have accessible labels. No product, promotion, or settings form was submitted. Appearance persistence and blocked-storage behavior have regression coverage.

The new dialog helper is public/js/merchant-dialogs.js. The existing merchant module preserves the page theme handler instead of replacing it. Preview: screenshots/merchant-dialog-mobile-dark.png (isolated fixture).
