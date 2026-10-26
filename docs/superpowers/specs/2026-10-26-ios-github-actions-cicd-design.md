# SmartSoko iOS + GitHub Actions CI/CD — Design

- Date: 2026-10-26
- Status: Approved (hosted runners only)
- Scope owner: food_delivery_app/ (Flutter project)

## Context

- SmartSoko's mobile release set is Android-only today: 4 native Kotlin apps plus the
  Flutter app (`com.smartsoko.smartmove`), which is a single app with in-app role
  selection (`lib/widgets/role_aware_auth_wrapper.dart`).
- The Flutter project has never had an iOS target — no `ios/` directory exists.
- Repo is public on GitHub (`jengamate255/Smartsoko`). Remote default branch is
  `master`; local working branch is `main`.
- No CI exists (`.github/workflows/` absent; `CI_CD.md` describes an unapplied
  SmartMove pipeline).
- Apple Developer Program enrollment has not happened yet ($99/yr, user action).
- `.env` (`assets/config/.env`) is declared as a pubspec asset but is untracked —
  a build without it fails on the missing asset.

## Decisions

1. **iOS app basis: the Flutter multi-role app.** Native Kotlin apps cannot cross to
   iOS; the stalled React Native Expo app is not the live codebase. One iOS app, one
   scheme, bundle ID `com.smartsoko.smartmove`, one TestFlight listing.
2. **CI/CD: GitHub Actions hosted runners.** The repo is public, so macOS runner
   minutes are free and unlimited. Alternatives were evaluated and rejected:
   - Codemagic / Bitrise: new vendor + billing for capability we get free.
   - macOS VM on Windows: violates Apple EULA, degraded by running Hyper-V/VBS,
     disk-tight (needs ~120GB; C: has 59GB free), 2-4x slower builds, Apple-ID
     flag risk for a new developer account.
   - Cloud Mac rental ($25-125/mo) / used Mac mini self-hosted runner: viable
     fallbacks, not needed while hosted minutes are free.
3. **Distribution: TestFlight** after Apple enrollment. App Store submission
   (screenshots, privacy labels, review) is out of scope.
4. **Secrets stay out of the public repo.** `.env` and `GoogleService-Info.plist`
   are injected at build time from base64 GitHub secrets.

## Architecture

### iOS target

- Scaffold via `flutter create --platforms=ios .` inside `food_delivery_app/`.
- Bundle ID `com.smartsoko.smartmove` (mirrors Android), display name SmartSoko,
  minimum iOS 14 (Mapbox v2 SDK floor).
- Dart code is unchanged: `main.dart` initializes Firebase with explicit Dart
  options and already tolerates the duplicate-app case; role selection is in-app.
- Native wiring:
  - Info.plist permission strings: location (when-in-use + always for driver
    tracking), camera, photo library, local notifications.
  - Google Sign-In reverse client ID URL scheme (from the Firebase plist).
  - Maps/Mapbox API keys: deferred — `.env` carries no `GOOGLE_MAPS_API_KEY` /
    `MAPBOX_TOKEN` today, matching Android's current no-key behavior. Inject into
    Info.plist at CI when keys are provisioned.
  - Crashlytics dSYM upload run-script phase.
- The user registers an iOS app in the Firebase console (browser step) and supplies
  `GoogleService-Info.plist`.

### Pipeline — two workflow files

**`.github/workflows/flutter-ci.yml`** — quality gate on every change:
- Triggers: push and PR to `master` or `main`, filtered to `lib/**`,
  `pubspec.yaml`, `analysis_options.yaml`.
- ubuntu-latest; Flutter pinned to the local stable version.
- `flutter analyze` + `flutter test`. Covers Android regression too (no `android/`
  files change in this project).

**`.github/workflows/ios-release.yml`** — iOS build:
- Triggers: `workflow_dispatch` and tags `v*`.
- macOS hosted runner. Steps: shallow checkout, Flutter setup, decode secrets,
  `flutter pub get`, CocoaPods install (cached), build.
- **Phase A (now, no Apple account):** `flutter build ios --simulator` — proves the
  full toolchain with zero Apple-side dependencies.
- **Phase B (after enrollment):** `flutter build ipa` with App Store Connect API
  key automatic signing, `--build-number $GITHUB_RUN_NUMBER` (monotonic, prevents
  TestFlight build-number collisions), then TestFlight upload using the same API
  key.
- Failure rule: a missing or undecodable secret fails the job immediately with a
  clearly named step — never a silently key-less build.

### Secrets (user pastes into GitHub UI; values are never echoed)

| Secret | Phase | Source |
|---|---|---|
| `ENV_FILE_B64` | A | base64 of local `assets/config/.env` |
| `GOOGLE_SERVICE_INFO_PLIST_B64` | B | base64 of Firebase plist |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` | B | App Store Connect API key |

### Milestones

- **M1 (no Apple account needed):** gitignore entries, `ios/` scaffold, native
  wiring, both workflows (simulator mode), `ENV_FILE_B64` secret. Done = green CI:
  analyze + test pass and the simulator build passes on hosted macOS. The Windows
  dev box cannot build iOS — CI is the verifier.
- **M2 (after user enrollment):** user browser steps (enroll at
  developer.apple.com, register Firebase iOS app, create App Store Connect API
  key, paste the remaining four secrets — five total) — then the release job
  switches to signed `.ipa` + TestFlight. Done = build visible in TestFlight and
  installable on a device.
- Explicitly out of scope: App Store submission, separate driver/admin iOS apps,
  any change to Android build outputs.

### Repo hygiene

- Add `.gitignore` entries: `food_delivery_app/ios/Runner/GoogleService-Info.plist`
  and explicit `food_delivery_app/assets/config/.env` (already untracked).
- Note (pre-existing, out of scope): Firebase config literals in
  `lib/config/app_config.dart` are already public in this public repo.

## Risks

- CocoaPods spec-repo fetch adds minutes on macOS runners — mitigated with caching.
- Flutter version drift between local and CI — pinned exact version in both
  workflows.
- TestFlight processing takes ~5-15 minutes after upload.
- Apple enrollment verification (~24-48h typical) blocks M2 only, not M1.

## Cost

$0 — public repo, hosted runners are unlimited and free (macOS included). If the
repo ever goes private, macOS minutes bill at the 10x multiplier (~$2 per build).
