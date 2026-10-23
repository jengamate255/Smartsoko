# SmartSoko deployment hit list

Updated: 2026-10-22. Release scope: backend + web first (confirmed by owner).
Status: NOT READY. Deployment requires owner confirmation after release checks.

## Team and working rules

- Lead/integration: owns this list, assigns files, reconciles findings and release evidence.
- Backend/security engineer: identity, authorization, order and payment integrity.
- Release engineer: packaging, runtime startup and client delivery.
- QA engineer: baseline tests and independent verification of fixes.
- Each change has one file owner. Agents preserve existing uncommitted work, report handoffs, and review one another's changes before closure.
- Follow AGENTS.md; CommonJS; npm.cmd on Windows; no generated-file edits or secrets in commits. Exclude side-income. Unconfigured Firestore is expected in Supabase-only mode.

## Prioritized work

| ID | Priority | Task / evidence | Owner | Completion requirement | Status |
| --- | --- | --- | --- | --- | --- |
| R01 | P1 | Prevent email-only identity matching from inheriting another profile's role or identity. `server/src/middleware/auth.js` email fallbacks. | Backend | Mocked tests cover unverified email, conflicting identity and valid canonical identity; independent QA review. | In progress |
| R02 | P1 | Repair deployment bundles: `.vercelignore` excludes required `lib/server-db.js`; Docker omits required runtime paths. | Release | Required module closure present in each supported package; safe startup verification. | In progress |
| R03 | P1 | Make container/process startup portable: hardcoded PM2 cwd, worker listen suppression, unpinned npx PM2 runtime. | Release | Portable cwd and deterministic start; workers can bind; relevant checks pass. | In progress |
| R04 | P1 | Resolve failing test baseline. Initial QA run: 28/29 files passed, 240/242 tests passed; product-image-upload timeout and fake-store isolation failure. | QA | Investigate cause; full backend/web suite passes consistently after fixes. | Investigating |
| R05 | P1 | Apply general rate limiting to unversioned API aliases too. `server/src/middleware/rate-limiter.js` currently mounts general limiter on `/api/v1/`. | Backend | Versioned and unversioned aliases enforce shared limits without double counting. | Open |
| R06 | P1 | Validate repeat-checkout semantics and persistence. `server/src/middleware/idempotency.js` uses body hash without supplied key and replays completed entries without expiry check. | Backend + QA | Same checkout retry replays; intentional identical new checkout succeeds; ambiguous writes cannot duplicate orders; storage works on selected hosting topology. | Needs flow verification |
| R07 | P1 | Verify payment-status authorization. `api/pesapal.js` tracking ID and merchant-reference lookups. | Backend + QA | Customer ownership/admin policy enforced; anonymous and cross-customer requests cannot expose stored payment details. | Open |
| R08 | P2 | Add reliable readiness behavior. Health reports Supabase degradation with HTTP 200. | Backend | Liveness and readiness semantics documented; readiness returns 503 when required database unavailable; optional Firebase remains optional. | Open |
| R09 | P2 | Verify HTTPS merchant tracking socket. `public/js/merchant-app.js` uses `ws://`. | Release + QA | HTTPS flow uses secure supported transport; selected host supports tracking architecture. | Open |
| R10 | P2 | Restrict diagnostic endpoint `/errors/data`. | Backend | Public users cannot retrieve internal diagnostics or filesystem/module failure details. | Open |
| R11 | Gate | Choose supported deployment target and verify production configuration. Vercel, Firebase and Docker paths differ. | Lead | Confirm target, canonical frontend directory, API origin, allowed origins, auth settings, payment callbacks, secret presence (without recording values). | Open |
| R12 | Gate | Run staging journeys: customer login/browse/cart/checkout/payment retry/order tracking; merchant accept/fulfill; driver delivery; admin authorization/refund. | QA | Evidence for each journey, including denied access and provider failure paths; use test accounts and sandbox payments. | Open |
| R13 | Gate | Prepare reproducible release, database migration/backup/restore plan, monitoring and rollback. Existing working tree contains extensive changes. | Lead + Release | Reviewed release diff, clean defined artifact, migrations accounted for, rollback steps and post-release smoke checks documented. | Open |

Paths above are relative to `food_delivery_app/` unless explicitly stated.

## Release criteria

All P1 tasks and release gates must close with evidence. P2 items must be resolved or explicitly accepted with impact documented. Unit test success alone does not establish production readiness. No production writes, real payments or deployment during the assessment.

## Deferred mobile release

Flutter, Expo and native Android remain a separate release. Initial observations: Expo dependency/typecheck setup is not verified; Flutter Android release currently uses debug signing. Validate signing, production endpoints, platform builds and device journeys before distributing any mobile release.

## Verification log

- 2026-10-22: QA initial `npm.cmd test`: 29 files, 242 tests; 1 file / 2 tests failed in product-image-upload suite. Investigation pending.
- 2026-10-22: Three agents audited backend/security, release/client setup and QA in parallel. No deployment performed.
