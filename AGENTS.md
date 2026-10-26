# AGENTS.md — SmartSoko

SmartSoko is a multi-platform local marketplace / food-delivery product. Several
apps live side by side in this repo:

- `food_delivery_app/server/` — Node.js + Express backend. `server-production.js`
  is the entry point.
- `food_delivery_app/web/` — web PWA (HTML, Tailwind CSS, vanilla JS).
- `food_delivery_app/lib/` — Flutter mobile app (Dart).
- `food_delivery_app/mobile/` — React Native (Expo, TypeScript) app.
- `food_delivery_app/android-*` — native Android apps.
- `food_delivery_app/` also holds `middleware/`, `validators/`, `api/`, and
  `scripts/`.

Runtime data lives in Supabase. Firebase/Firestore is optional and currently
runs in "Supabase-only mode" (`SKIP_FIREBASE`); a missing Firestore connection is
expected, not a bug.

## Not part of the app — `side-income/`

`side-income/` is a **personal side-project workspace** (bounty research, Gray Swan
prompt-injection write-ups, income/payout notes) that shares this repo but is **not**
part of SmartSoko. Don't wire it into the app, add it to builds/deploys, or treat its
scripts as project tooling. It has no dependency on `food_delivery_app/` and vice
versa. Start at `side-income/README.md`.

## Run the server

```powershell
npm.cmd start        # from repo root -> food_delivery_app/server/server-production.js
npm.cmd run dev      # NODE_ENV=development
```

Windows note: this environment blocks `npm.ps1` (PowerShell execution policy), so
use `npm.cmd`. You can also run `node server/server-production.js` from
`food_delivery_app`. The server listens on `http://localhost:3001` (PORT comes
from `food_delivery_app/.env`, which sets `PORT=3001`); check
`GET /health` for status.

## Conventions

- Backend and web code is CommonJS (`"type": "commonjs"`) — use `require` /
  `module.exports`, not ESM `import`.
- Match the style of nearby files; make small, targeted edits instead of broad
  rewrites.
- Do not edit generated or build output: `dist/`, `build/`, `APK-Builds*/`,
  `temp_build_project/`, `.gradle/`, `.firebase/`, `.vercel/`, `.netlify/`.
- Secrets: never commit real credentials. `.env*`, `serviceAccountKey.json`,
  `google-services.json`, and `*.key` are gitignored — keep them out of commits.

## Commands

Run from the repo root unless noted.

- `npm.cmd start` — production server
- `npm.cmd run dev` — dev server (`NODE_ENV=development`)
- `npm.cmd test` — vitest (delegates to `food_delivery_app`)
- `npm.cmd --prefix food_delivery_app run build:css` — rebuild Tailwind CSS
- `npm.cmd --prefix food_delivery_app run deploy:firebase` /
  `npm.cmd --prefix food_delivery_app run deploy:vercel` — deploys (confirm before
  running)

APK builds are PowerShell scripts in `scripts\`, not npm scripts — e.g.
`.\scripts\build-apk.ps1 -Mode debug` (Flutter) or `.\scripts\build-apk-expo.ps1`
(Expo / React Native).
