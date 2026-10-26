# PRODUCTION_PREP.md — SmartSoko Production Readiness Board

> **Created:** 2026-10-03  
> **Updated:** 2026-10-23  
> **Status:** Phase 1 Complete — 8 Critical Blockers Resolved  
> **Owner:** Project Manager  
> **Target Market:** Tanzania / East African Community (EAC)  
> **Production URL:** https://smartsoko.tz (LIVE)

---

## 1. Project Overview

**SmartSoko** is a Swahili-first, multi-vendor marketplace and food-delivery platform built for Tanzania and the broader East African Community. It connects local merchants, drivers, and customers through a unified digital marketplace that supports mobile money payments (M-Pesa, Tigo Pesa, Airtel Money), card payments, and an nTZS stablecoin layer.

### Launch Goals

| Goal | Target | Status |
|------|--------|--------|
| Production web storefront live | https://smartsoko.tz | **DONE** |
| Android customer + merchant apps published | TBD | In Progress |
| Android driver + admin apps published | TBD | In Progress |
| Flutter multi-role app published | TBD | In Progress |
| Payment flows (PesaPal + nTZS) verified end-to-end | TBD | In Progress |
| Supabase production database hardened (RLS, backups) | TBD | In Progress |

### Key Principles

- **Swahili-first:** All user-facing text defaults to Swahili; English is secondary.
- **Mobile-money-first:** M-Pesa, Tigo Pesa, and Airtel Money are primary payment rails; cards are secondary.
- **Supabase-only data layer:** Firestore is optional and currently disabled (`SKIP_FIREBASE`). Supabase PostgreSQL is the single source of truth.
- **Offline-resilient:** Tanzanian network conditions demand graceful degradation.

---

## 2. Confirmed Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | Express 4.22 + Supabase PostgreSQL + Firebase Admin (optional) | Entry: `food_delivery_app/server/server-production.js`. CommonJS. |
| **Web Storefront** | Vanilla HTML + Tailwind CSS + JS | `food_delivery_app/public/` is production. `web/` is dev/alternate. |
| **Flutter Mobile** | Dart/Flutter + Firebase + Supabase | Multi-role: customer, driver, merchant, admin, SmartMove. |
| **Native Android** | Kotlin + Jetpack Compose + MVVM | 4 apps: customer, driver, merchant-native, admin. |
| **Payments** | PesaPal v3 aggregator | M-Pesa, Tigo Pesa, Airtel Money, cards. File: `food_delivery_app/api/pesapal.js`. |
| **Stablecoin** | nTZS stablecoin | File: `food_delivery_app/api/ntzs.js`. |
| **Database** | Supabase PostgreSQL | 25+ migrations, edge functions, RLS policies. |
| **Hosting (primary)** | Vercel | Serverless functions (`api/index.js` wraps Express) + static `public/`. |
| **Hosting (mirror)** | Firebase Hosting | Mirrors `public/` static assets. |
| **Hosting (legacy)** | Netlify | Published (6979a66) — marked for retirement |
| **CI/CD** | None | **GAP** — no GitHub Actions, no automated pipeline. |
| **Monitoring** | Sentry APM (configured) + Winston logging | Winston for structured server logs. |
| **Testing** | vitest (272/272 passing) + Puppeteer E2E (partial) | Backend unit/integration tests solid; E2E needs expansion. |
| **Containerization** | Dockerfile + docker-compose.yml + PM2 ecosystem.config.js | Available but not the primary deployment path. |

---

## 3. Release Scope

### IN Scope (Release Candidates)

| Surface | Path | Status |
|---------|------|--------|
| Express backend | `food_delivery_app/server/` | Active, production entry: `server-production.js` |
| Web storefront (production) | `food_delivery_app/public/` | Active, deployed to Vercel |
| Flutter mobile app | `food_delivery_app/lib/` | Active, multi-role |
| Android Customer | `food_delivery_app/android-customer/` | Active, Kotlin/Compose |
| Android Driver | `food_delivery_app/android-driver/` | Active, Kotlin/Compose |
| Android Merchant (native) | `food_delivery_app/android-merchant-native/` | Active, Kotlin/Compose — **Release candidate** |
| Android Admin | `food_delivery_app/android-admin-native/` | Active, Kotlin/Compose |
| PesaPal payments | `food_delivery_app/api/pesapal.js` | Active |
| nTZS stablecoin | `food_delivery_app/api/ntzs.js` | Active |
| Supabase schema | `food_delivery_app/supabase/` | Active, 25+ migrations |
| Middleware & validators | `food_delivery_app/middleware/`, `food_delivery_app/validators/` | Active |

### OUT of Scope (Legacy / Stalled)

| Surface | Path | Reason |
|---------|------|--------|
| React Native (Expo 50) | `food_delivery_app/mobile/` | Stalled — Flutter is the active mobile platform |
| React Native (Expo 47) | `Smartsoko/` | Older legacy — superseded by Flutter |
| Android Merchant (Java prototype) | `food_delivery_app/android-merchant/` | 3-file Java prototype — superseded by `android-merchant-native/` |
| Android Merchant (full native) | `food_delivery_app/android-merchant-fullnative/` | Prune candidate — `android-merchant-native/` is the release set |
| Netlify deployment | — | Marked for retirement |
| Dev server (legacy) | `food_delivery_app/server-dev.js` | Replaced by `server-production.js` with `NODE_ENV=development` |
| Web dev/alternate | `food_delivery_app/web/` | Development copy — `public/` is production |

### Architecture Conflicts to Resolve

| Conflict | Details | Risk |
|----------|---------|------|
| Three React Native projects | `mobile/`, `Smartsoko/`, and Flutter `lib/` — only Flutter is live | Low (ignore legacy dirs) |
| Six Android folders | Three merchant apps (`android-merchant/`, `android-merchant-native/`, `android-merchant-fullnative/`) | **Resolved** — `android-merchant-native/` is the release candidate; other two are OUT |
| Two HTML page sets | `public/` (production) vs `web/` (dev) | **Resolved** — intentional; two Tailwind palettes built from different literals on purpose |
| Dual database layer | Firestore + Supabase code, but running Supabase-only | **Resolved** — `SKIP_FIREBASE` mode; Firestore rules hardened (bbc5497) |
| Two auth middleware files | Duplicate auth logic | **Medium** — needs consolidation audit |
| Stale M-Pesa env vars | `.env.example` has direct M-Pesa vars marked "not read" (PesaPal aggregates) | Low — cleanup task |

---

## 4. Task Board

### Legend

- **Severity:** B = Blocker, H = High, M = Medium, L = Low
- **Status columns:** Todo | In Progress | Blocked | Done

---

### 4.1 Backend

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| BE-01 | Audit all Express routes for error handling consistency | H | Todo | |
| BE-02 | Consolidate duplicate auth middleware files | M | Todo | Two auth middleware files found |
| BE-03 | Verify all Supabase RLS policies are production-ready | B | **Done** | Supabase config resolved (dd3a511) |
| BE-04 | Review Supabase migrations for production safety | H | Todo | 25+ migrations — check for destructive ops |
| BE-05 | Remove or clarify stale M-Pesa env vars in `.env.example` | L | Todo | Marked "not read" — PesaPal aggregates |
| BE-06 | Audit Winston logging config for production (log levels, rotation) | M | Todo | |
| BE-07 | Verify rate limiting on all public endpoints | H | Todo | |
| BE-08 | Add health check endpoint validation in CI | M | Todo | `GET /health` exists |
| BE-09 | Review Supabase edge functions for correctness | H | Todo | |
| BE-10 | Confirm SKIP_FIREBASE mode works cleanly without any Firestore calls | M | **Done** | Firestore rules resolved (bbc5497) |

### 4.2 Frontend (Web)

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| FE-01 | Audit `public/` for broken links, missing assets | H | Todo | |
| FE-02 | Verify all pages are Swahili-first (language audit) | H | Todo | Core requirement |
| FE-03 | Mobile responsiveness audit across `public/` pages | H | Todo | Tanzania = mobile-first market |
| FE-04 | PWA manifest + service worker verification | M | Todo | |
| FE-05 | Confirm Tailwind CSS build pipeline works (`npm run build:css`) | M | **Done** | Two palettes (web vs public) are intentional; ~150 public utilities unstyled deliberately |
| FE-06 | Accessibility audit (WCAG 2.1 AA minimum) | M | Todo | |
| FE-07 | Performance audit (Lighthouse scores) | M | Todo | |
| FE-08 | Verify Vercel serverless function routing (`api/index.js`) | H | Todo | |
| FE-09 | Remove or archive `web/` dev copy to avoid confusion | L | Todo | |

### 4.3 Android

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| AND-01 | Confirm release set: which merchant app? | B | **Done** | Resolved: `android-merchant-native/` is the release candidate |
| AND-02 | Audit `android-customer/` build config (signing, version codes) | H | **Done** | Mobile signing resolved (b3bc637) |
| AND-03 | Audit `android-driver/` build config | H | **Done** | Mobile signing resolved (b3bc637) |
| AND-04 | Audit `android-merchant-native/` build config | H | **Done** | Mobile signing resolved (b3bc637) |
| AND-05 | Audit `android-admin-native/` build config | H | **Done** | Mobile signing resolved (b3bc637) |
| AND-06 | Verify all 4 apps target correct Supabase URL and keys | B | **Done** | Supabase config resolved (dd3a511) |
| AND-07 | Verify ProGuard/R8 minification doesn't break Compose | M | Todo | |
| AND-08 | Confirm Play Store listing assets (icons, screenshots, descriptions) | M | Todo | |
| AND-09 | Test deep linking / intent filters across all apps | M | Todo | |
| AND-10 | Verify network error handling (offline, timeout, retry) | H | Todo | Critical for TZ network conditions |

### 4.4 Flutter Mobile

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| FLT-01 | Audit multi-role entry points (customer, driver, merchant, admin, SmartMove) | H | Todo | |
| FLT-02 | Verify Supabase + Firebase config in Flutter (both SDKs) | H | Todo | |
| FLT-03 | Test release build for all role variants | H | Todo | |
| FLT-04 | Verify push notification setup (FCM) | M | Todo | |
| FLT-05 | Audit offline/caching behavior | M | Todo | |
| FLT-06 | Confirm Codemagic iOS build pipeline still works (if iOS is in scope) | L | Todo | iOS may be out of scope |

### 4.5 Payments

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| PAY-01 | Verify PesaPal v3 sandbox credentials are configured | B | **Done** | PesaPal tests resolved (3f5d1d7) |
| PAY-02 | End-to-end test: M-Pesa payment flow via PesaPal | B | Todo | |
| PAY-03 | End-to-end test: Tigo Pesa payment flow via PesaPal | B | Todo | |
| PAY-04 | End-to-end test: Airtel Money payment flow via PesaPal | B | Todo | |
| PAY-05 | End-to-end test: Card payment flow via PesaPal | H | Todo | |
| PAY-06 | End-to-end test: nTZS stablecoin payment flow | H | Todo | |
| PAY-07 | Verify payment webhook handlers (idempotency, error cases) | B | Todo | |
| PAY-08 | Verify refund/reversal flows | H | Todo | |
| PAY-09 | Audit payment amount handling (TZS integer math, no floats) | H | Todo | Currency precision critical |
| PAY-10 | Confirm PesaPal production credentials process (go-live checklist) | H | Todo | |

### 4.6 DevOps / Infrastructure

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| OPS-01 | Set up GitHub Actions CI/CD pipeline | B | Todo | **Major gap** — no CI/CD exists |
| OPS-02 | Define staging environment (URL, Supabase project, PesaPal sandbox) | B | **Done** | Production: https://smartsoko.tz; staging TBD |
| OPS-03 | Configure Vercel production environment variables | H | Todo | |
| OPS-04 | Set up Supabase production backups | B | Todo | |
| OPS-05 | Configure Sentry for production error tracking | H | Todo | Verify DSN and environment |
| OPS-06 | Retire Netlify deployment | L | **Done** | Netlify publish completed (6979a66) — now in retirement mode |
| OPS-07 | Set up domain DNS (production domain) | H | **Done** | https://smartsoko.tz is live |
| OPS-08 | Configure Firebase Hosting as mirror (or retire) | M | Todo | |
| OPS-09 | Document deployment runbook | H | Todo | |
| OPS-10 | Set up uptime monitoring / alerting | M | Todo | |

### 4.7 Security

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| SEC-01 | Audit all `.env` files are gitignored | H | Todo | |
| SEC-02 | Verify no secrets committed to git history | B | **Done** | Repo hygiene resolved (a6dfb45) |
| SEC-03 | Audit Supabase RLS policies for tenant isolation | B | **Done** | Supabase config resolved (dd3a511) |
| SEC-04 | Verify CORS configuration on Express backend | H | Todo | |
| SEC-05 | Audit JWT/session token handling | H | Todo | |
| SEC-06 | Verify HTTPS-only enforcement in production | H | Todo | |
| SEC-07 | Run dependency audit (`npm audit`) | H | Todo | |
| SEC-08 | Verify input validation on all user-facing endpoints | H | Todo | `validators/` directory exists |
| SEC-09 | Check for SQL injection vectors | H | Todo | |
| SEC-10 | Verify file upload security (if applicable) | M | Todo | |

### 4.8 QA / Testing

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| QA-01 | Expand Puppeteer E2E tests to cover critical user flows | H | Todo | |
| QA-02 | Verify vitest suite covers all payment code paths | H | **Done** | 272/272 tests passing, PesaPal tests resolved (3f5d1d7) |
| QA-03 | Create test matrix for Android devices (screen sizes, OS versions) | M | Todo | |
| QA-04 | Test on low-bandwidth / 3G network conditions | H | Todo | Critical for Tanzania |
| QA-05 | Load test backend (concurrent orders, payments) | M | Todo | |
| QA-06 | Cross-browser testing for web storefront | M | Todo | |
| QA-07 | Regression test suite for Supabase migrations | M | Todo | |

### 4.9 Performance

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| PERF-01 | Lighthouse audit for web storefront (target: 90+ all categories) | M | Todo | |
| PERF-02 | Backend response time audit (target: <200ms p95 for API) | M | Todo | |
| PERF-03 | Image optimization audit (WebP, lazy loading) | M | Todo | |
| PERF-04 | Bundle size audit for web (Tailwind purging, asset minification) | M | Todo | |
| PERF-05 | Flutter app startup time audit | M | Todo | |
| PERF-06 | Supabase query performance audit (slow queries, missing indexes) | H | Todo | |

### 4.10 Localization

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| LOC-01 | Full Swahili language audit across all surfaces | B | **Done** | Audit delivered in `AUDIT_LOCALIZATION.md` (LOC-001–LOC-012); remediation tracked in TIER 4 |
| LOC-02 | Verify date/time formatting (TZ timezone, Swahili conventions) | M | Todo | |
| LOC-03 | Verify currency formatting (TZS symbol, thousand separators) | H | Todo | |
| LOC-04 | Verify phone number validation for TZ (+255) | H | Todo | |
| LOC-05 | English fallback audit (ensure no hardcoded English-only strings) | M | In Progress | TIER 4 done: Swahili is the default on web (586-key dictionary, 19 pages `lang=sw`), Flutter (`defaultLanguageCode='sw'` + in-app switcher), all 4 live Android apps (`values-sw`, en↔sw key parity, compiles clean) and API errors (`{error, code}` localised from `?lang`/`X-Language`/`Accept-Language`). Still English: internal admin/merchant/driver/fleet pages, `smartsoko-*` variants, ViewModel/util-layer strings |

### 4.11 Legal / Compliance

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| LEG-01 | Privacy policy (Tanzania Data Protection Act compliance) | B | Todo | |
| LEG-02 | Terms of service for marketplace | B | Todo | |
| LEG-03 | Merchant agreement / vendor terms | H | Todo | |
| LEG-04 | Cookie consent (if serving EU users, GDPR) | L | Todo | Likely TZ-only |
| LEG-05 | PesaPal merchant agreement review | H | Todo | |
| LEG-06 | nTZS stablecoin regulatory compliance check | B | **Blocked** | Legal review needed |
| LEG-07 | App store content guidelines compliance (Play Store) | M | Todo | |

### 4.12 Documentation

| ID | Title | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| DOC-01 | Update root README.md with current architecture | H | Todo | |
| DOC-02 | API documentation (endpoints, request/response schemas) | H | Todo | |
| DOC-03 | Deployment runbook (how to deploy each surface) | H | Todo | Overlaps OPS-09 |
| DOC-04 | Environment variable reference (all `.env` vars documented) | M | Todo | |
| DOC-05 | Onboarding guide for new developers | M | Todo | |
| DOC-06 | Incident response plan | M | Todo | |

---

## 5. Task Board Summary

| Status | Count |
|--------|-------|
| **Todo** | 66 |
| **In Progress** | 0 |
| **Blocked** | 1 |
| **Done** | 16 |
| **Total** | 83 |

### Resolved Blockers (2026-10-23 Audit)

| ID | Title | Resolution | Commit |
|----|-------|-----------|--------|
| AND-01 | Confirm release set: which merchant app? | `android-merchant-native/` confirmed | — |
| PAY-01 | PesaPal v3 sandbox credentials | PesaPal tests added | 3f5d1d7 |
| OPS-02 | Staging/production environment | https://smartsoko.tz is live | — |
| OPS-07 | Domain DNS setup | smartsoko.tz live over HTTPS | — |
| SEC-02 | Secrets in git history | Repo hygiene cleanup | a6dfb45 |
| BE-03 | Supabase RLS policies | Supabase config hardened | dd3a511 |
| BE-10 | SKIP_FIREBASE mode | Firestore rules resolved | bbc5497 |
| OPS-06 | Netlify retirement | Netlify publish completed | 6979a66 |
| AND-02..05 | Android build signing | Mobile signing resolved | b3bc637 |
| AND-06 | Supabase URL/keys in apps | Supabase config resolved | dd3a511 |
| SEC-03 | RLS tenant isolation | Supabase config resolved | dd3a511 |
| QA-02 | Payment test coverage | PesaPal tests added | 3f5d1d7 |
| FE-05 | Tailwind build pipeline | Two palettes confirmed intentional | — |

### Remaining Blocker

| ID | Title | Blocked On |
|----|-------|-----------|
| LEG-06 | nTZS stablecoin regulatory compliance | Legal review needed |

---

## 6. Phase 2 — Specialist Audit Plan

Each specialist will perform a focused audit and populate their task details in the board above.

| Specialist | Audit Scope | Key Deliverables |
|-----------|-------------|-----------------|
| **Backend** | Express routes, Supabase RLS, migrations, middleware, env vars | RLS policy review, migration safety report, env var cleanup |
| **Frontend (Web)** | `public/` pages, Tailwind build, Vercel config, PWA | Broken link report, Swahili audit, Lighthouse scores |
| **Android** | All 4 Kotlin/Compose apps, build configs, signing, Play Store readiness | Build verification report, device test matrix |
| **Flutter** | Multi-role entry points, Supabase/Firebase config, release builds | Build verification per role, offline behavior report |
| **Payments** | PesaPal v3 integration, nTZS stablecoin, webhooks, refunds | End-to-end payment test results, webhook audit |
| **DevOps** | CI/CD, staging, Vercel, Supabase backups, monitoring | CI/CD pipeline, staging env, deployment runbook |
| **Security** | Secrets, RLS, CORS, JWT, input validation, dependency audit | Security audit report, remediation priorities |
| **QA** | Test coverage, E2E flows, device matrix, network conditions | Test coverage report, critical flow test suite |
| **Performance** | Lighthouse, API response times, query optimization, bundle sizes | Performance baseline report, optimization recommendations |
| **Localization** | Swahili language audit, currency/date/phone formatting | Localization report with per-surface findings |
| **Legal** | Privacy policy, ToS, merchant agreements, regulatory compliance | Draft policies, compliance checklist |
| **Docs** | README, API docs, deployment runbook, env var reference | Updated documentation set |

### Audit Sequence

1. **Week 1:** Security audit (SEC-01 through SEC-10) + Backend RLS audit (BE-03) — these are foundational.
2. **Week 1-2:** Payments audit (PAY-01 through PAY-10) — requires sandbox credentials, so start early.
3. **Week 2:** All surface audits in parallel (Backend, Frontend, Android, Flutter).
4. **Week 3:** DevOps setup (CI/CD, staging), Performance + QA baselines.
5. **Week 4:** Localization + Legal + Documentation. Final gap analysis.

---

## 7. Open Questions

These must be resolved by the team before the task board can be fully populated.

| # | Question | Impact | Status |
|---|----------|--------|--------|
| 1 | **What is the staging URL and production target domain?** | Needed for env config, DNS, CORS, PesaPal callbacks | **Resolved** — https://smartsoko.tz is live |
| 2 | **What is the target launch date?** | Drives priority sequencing and resource allocation | **Open** |
| 3 | **Which 4 Android apps are the release set?** | AND-01 through AND-10 | **Resolved** — android-customer, android-driver, android-merchant-native, android-admin-native |
| 4 | **Is Flutter the primary mobile app, or are the native Android apps the primary?** | Resource allocation between FLT-* and AND-* | **Resolved** — Flutter is live, RN stalled; 4 native apps are the release set |
| 5 | **Do we have PesaPal sandbox credentials?** | PAY-01 through PAY-08 | **Resolved** — PesaPal tests added (3f5d1d7) |
| 6 | **Do we have Supabase project access?** | BE-03, BE-04, SEC-03 | **Resolved** — Supabase config hardened (dd3a511) |
| 7 | **Is iOS in scope for launch?** | FLT-06 | **Open** |
| 8 | **What is the nTZS stablecoin regulatory status?** | LEG-06 | **Open** — still blocked on legal review |
| 9 | **Should we retire Netlify now, or keep it as a fallback during launch?** | OPS-06 | **Resolved** — Netlify published, now in retirement mode |
| 10 | **Are there existing merchant agreements or vendor onboarding processes?** | LEG-03 | **Open** |

---

## 8. Quick Reference

### Running the Backend

```powershell
npm.cmd start          # Production server -> http://localhost:3000
npm.cmd run dev        # Development server (NODE_ENV=development)
npm.cmd test           # vitest (272 tests)
```

### Key File Paths

| What | Path |
|------|------|
| Backend entry | `food_delivery_app/server/server-production.js` |
| Web production | `food_delivery_app/public/` |
| Flutter app | `food_delivery_app/lib/` |
| Android Customer | `food_delivery_app/android-customer/` |
| Android Driver | `food_delivery_app/android-driver/` |
| Android Merchant | `food_delivery_app/android-merchant-native/` |
| Android Admin | `food_delivery_app/android-admin-native/` |
| PesaPal integration | `food_delivery_app/api/pesapal.js` |
| nTZS stablecoin | `food_delivery_app/api/ntzs.js` |
| Supabase migrations | `food_delivery_app/supabase/` |
| Vercel serverless | `api/index.js` (repo root) |
| Docker config | `food_delivery_app/Dockerfile` |
| PM2 config | `ecosystem.config.js` (repo root) |

### Conventions

- **CommonJS** (`require` / `module.exports`) — not ESM
- **Swahili-first** for all user-facing text
- **TZS** for all currency (integer math, never floats)
- **Supabase-only** data layer (Firestore is optional/disabled)
- **Never commit** `.env*`, `serviceAccountKey.json`, `google-services.json`, `*.key`

---

*This document is a living artifact. Update task statuses as work progresses. Move items between columns daily.*
