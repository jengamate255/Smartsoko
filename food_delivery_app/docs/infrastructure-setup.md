# SmartSoko infrastructure setup

## Observed state — 22 October 2026

Read-only checks from the development workstation; DNS answers may be cached.

| Component | Observed result |
| --- | --- |
| Authoritative DNS | ns-tz1 through ns-tz4.sakurahost.co.tz |
| Apex A | smartsoko.tz → 199.36.158.100 (Firebase Hosting) |
| www CNAME | fooddelievry-dce15.web.app |
| HTTPS | Apex loads; www redirects to apex |
| API health | /health and /api/health return HTML 404 on the public domain |
| API subdomain | api.smartsoko.tz does not resolve |
| Apex TXT | hosting-site=fooddelievry-dce15 |
| MX | Priority 0 smartsoko.tz; priority 10 mail.smartsoko.tz |
| Mail host | mail.smartsoko.tz aliases the apex and resolves to Firebase Hosting |
| SPF / DMARC | No SPF in returned apex TXT records; no _dmarc TXT answer |
| CAA | No apex CAA answer |

No provider settings or DNS records have been changed. A missing API subdomain alone
does not establish that no backend exists; identify the actual backend before routing.
Existing Firebase hosting and optional Firestore are separate concerns. Supabase-only
backend operation is expected.

### Authenticated SakuraHost inspection

- Client dashboard confirms one active domain and zero active hosting services.
- Domain status is Active, next due 21 October 2027, auto-renew enabled.
- Domain overview reports registrar lock disabled; verify registry support before
  treating the displayed state as an actionable transfer-lock setting.
- Sakura DNS Manager exposes seven records, matching the public answers above,
  plus ftp.smartsoko.tz CNAME smartsoko.tz (TTL 14400).
- Zone snapshot: apex A TTL 3600; www CNAME TTL 3600; mail CNAME TTL 14400;
  apex MX to apex priority 0 TTL 14400; apex MX to mail priority 10 TTL 3600;
  Firebase hosting TXT TTL 3600. No records were changed.
- Backend hosting and mailbox provider remain to be selected or identified.

## Information needed to finish

- Registrar/DNS dashboard access for smartsoko.tz.
- Existing production backend host and project, or a selected host and spending limit.
- Intended mailbox provider and transactional email provider, including their exact
  domain verification, MX, SPF, and DKIM records.
- Provider access for deployment secrets, backups, and monitoring. Enter secrets into
  provider secret stores; do not put them into this document or Git.

## Completion sequence

1. Export the existing DNS zone and record current hosting settings for rollback.
2. Identify the production backend and choose one deployment path. The Express
   entry point is server/server-production.js in food_delivery_app. Scheduled jobs
   need a persistent worker/process or a separately configured scheduler.
3. Prepare runtime configuration: Supabase, SKIP_FIREBASE=1, public origins,
   payment callbacks/webhooks, authentication redirects, notifications, and secrets.
   Review the existing environment/config modules for exact variable names.
4. Validate backend health and authenticated application flows at the provider URL.
   Health must report Supabase connected; HTTP 200 alone is insufficient because
   the current health route can report a degraded state in a successful response.
5. Configure the chosen custom domain using records supplied by that host. The
   frontend currently expects same-origin /api routing; adding api.smartsoko.tz
   alone will not connect it. Prepare a hosting rewrite/proxy or explicitly update
   frontend API configuration and CORS for the selected architecture.
6. Verify certificates, HTTP-to-HTTPS redirects, apex/www canonical behavior, and
   DNS answers. Preserve Firebase verification records while Firebase remains used.
7. Correct mail routing using the actual mailbox provider's records. Publish the
   sender provider's SPF/DKIM records, check all legitimate senders, and introduce
   DMARC monitoring before enforcing rejection. Do not invent record values.
8. Configure offsite database backups and separate encryption-key storage. Include
   schema, auth, and uploaded media in recovery planning; existing logical exports
   do not cover the complete system. Perform a disposable restore drill.
9. Configure external uptime checks, error reporting, resource alerts, log retention,
   and backup-failure alerts. Verify alerts reach the intended operator.
10. Verify customer, merchant, driver, admin, login, uploads, and sandbox payment
    flows, plus webhook signature validation and retry/idempotency behavior.
11. Record final DNS values, provider/project names, recovery steps, deployment
    commands, and rollback instructions without secrets.

## Existing container configuration findings

Before selecting Docker as the production path, resolve these observed issues:

- Compose overrides the image health check with curl, which the Alpine image does
  not explicitly install. Use the existing Node-based probe instead.
- Compose defaults NODE_ENV to development.
- Compose mounts a Firebase service-account file even in Supabase-only mode.
- The default backup mount exposes the application directory at /backups; use a
  dedicated external backup location with appropriate ownership instead.
- Confirm required runtime files and writable storage are included in the image,
  including files referenced by backup/reporting services.
- Validate process concurrency before enabling PM2's current multi-process mode:
  process-local scheduling must not duplicate financial or notification work.

Repository deployment instructions require confirmation before Firebase or Vercel
deploy commands. Prepare and validate the concrete deployment before requesting it.
