# SmartSoko iOS + GitHub Actions CI/CD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an iOS build of the Flutter SmartSoko app via free GitHub Actions hosted runners — simulator-verified now (M1), TestFlight after Apple enrollment (M2).

**Architecture:** Scaffold an `ios/` target into `food_delivery_app/` (Dart code untouched), wire iOS-native config (Info.plist), and add two GitHub Actions workflows at repo root: a Linux quality gate (analyze + test) and a macOS release workflow that builds in simulator mode now and switches to signed `.ipa` + TestFlight upload once the user completes Apple enrollment and pastes secrets.

**Tech Stack:** Flutter 3.47.7 (pinned), GitHub Actions (ubuntu-latest, macos-15), CocoaPods, fastlane pilot (preinstalled on macOS runners, M2 only).

**Spec:** `docs/superpowers/specs/2026-10-26-ios-github-actions-cicd-design.md`

## Global Constraints

- Flutter version pinned to **3.47.7** (local: `flutter --version` = 3.47.7 stable, Dart 3.13.5) in every workflow.
- iOS bundle ID: **`com.smartsoko.smartmove`** (mirrors Android `applicationId`).
- Minimum iOS deployment target: **14.0** (Mapbox v2 SDK floor). If `pod install` errors naming a higher pod minimum, raise to that pod's stated minimum — the CI error names it.
- **No secrets in the repo.** `.env` and `GoogleService-Info.plist` are gitignored; CI decodes them from base64 GitHub secrets. Never echo secret values into logs or commits.
- Workflow files live at **repo root** `.github/workflows/`, with `working-directory: food_delivery_app`.
- Triggers cover both `master` (remote default) and `main` (local branch).
- Commits: no git identity configured on this box — always use
  `GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit ...`.
  Never `git add -A` — add specific paths.
- This Windows box cannot build iOS. **CI runs are the verification** for anything iOS. Local verification is limited to `flutter analyze`, `flutter test`, and file inspection.
- Deviation from spec (discovered during planning): `.env` contains only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FIREBASE_PROJECT_ID`, `SKIP_FIREBASE` — no `GOOGLE_MAPS_API_KEY`/`MAPBOX_TOKEN` exist, so Maps/Mapbox Info.plist key injection is **deferred until keys are provisioned** (current behavior matches Android: no key, blank map tiles). Dart `env_config.dart` getters already default to `''`.

---

### Task 1: Repo hygiene — ignore the Firebase plist

**Files:**
- Modify: `food_delivery_app/.gitignore`

**Interfaces:**
- Consumes: existing `.env*` ignore rule (already present, line 133).
- Produces: `ios/Runner/GoogleService-Info.plist` ignored so the CI-decoded plist can never be committed.

- [ ] **Step 1: Confirm current ignore state**

Run: `cd food_delivery_app && git check-ignore -v assets/config/.env ios/Runner/GoogleService-Info.plist`
Expected: `.env` matched by `.env*`; the plist **not** matched (exit code 1, only one output line).

- [ ] **Step 2: Add the ignore entry**

Append to `food_delivery_app/.gitignore` under the "Environment variables" section:

```gitignore
# Firebase iOS config (injected from CI secret, never committed)
ios/Runner/GoogleService-Info.plist
```

- [ ] **Step 3: Verify**

Run: `git check-ignore -v food_delivery_app/ios/Runner/GoogleService-Info.plist`
Expected: matched by the new rule.

- [ ] **Step 4: Commit**

```bash
git add food_delivery_app/.gitignore
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "chore: ignore Firebase iOS plist (CI-injected)"
```

---

### Task 2: Scaffold `ios/` target, set identity

**Files:**
- Create: `food_delivery_app/ios/**` (Flutter template Runner project)
- Modify: `food_delivery_app/ios/Runner.xcodeproj/project.pbxproj`, `food_delivery_app/ios/Podfile`, `food_delivery_app/.metadata`

**Interfaces:**
- Produces: `ios/Runner.xcodeproj` with bundle ID `com.smartsoko.smartmove`, deployment target 14.0 — the identity every later task and the CI export step relies on.

- [ ] **Step 1: Scaffold**

```bash
cd food_delivery_app
flutter create --platforms=ios --org com.smartsoko .
```

Expected: creates `ios/` only. Run `git status --short` — only `ios/`, `.metadata`, and possibly `pubspec.lock` may change. **If `android/` files change, stop and investigate before proceeding.**

- [ ] **Step 2: Set bundle ID**

`--org com.smartsoko` yields `com.smartsoko.smartsoko`; retarget to the Android-equivalent ID:

```bash
cd food_delivery_app/ios
sed -i 's/com\.smartsoko\.smartsoko/com.smartsoko.smartmove/g' Runner.xcodeproj/project.pbxproj
grep -c "com.smartsoko.smartmove" Runner.xcodeproj/project.pbxproj
grep -c "com.smartsoko.smartsoko" Runner.xcodeproj/project.pbxproj
```

Expected: first count ≥ 3 (Debug/Release/Profile configs), second count 0.

- [ ] **Step 3: Raise deployment target to 14.0**

```bash
cd food_delivery_app/ios
sed -i "s/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 14.0;/g" Runner.xcodeproj/project.pbxproj
sed -i "s/platform :ios, '[0-9.]*'/platform :ios, '14.0'/" Podfile
grep -c "IPHONEOS_DEPLOYMENT_TARGET = 14.0" Runner.xcodeproj/project.pbxproj
grep "platform :ios" Podfile
```

Expected: ≥ 3 matches in pbxproj; Podfile shows `platform :ios, '14.0'`.

- [ ] **Step 4: Verify nothing else broke**

Run: `cd food_delivery_app && flutter analyze`
Expected: `No issues found!` (or same issue count as before scaffolding — Dart was not touched).

- [ ] **Step 5: Commit**

```bash
git add food_delivery_app/ios food_delivery_app/.metadata
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "feat: scaffold iOS target (bundle com.smartsoko.smartmove, min iOS 14)"
```

---

### Task 3: Info.plist — display name and permission strings

**Files:**
- Modify: `food_delivery_app/ios/Runner/Info.plist`

**Interfaces:**
- Consumes: template Info.plist from Task 2.
- Produces: iOS permission strings required at App Store review and by `geolocator`, `image_picker` runtime prompts. Missing strings cause runtime crashes on first permission prompt — this is the iOS analogue of AndroidManifest permissions.

- [ ] **Step 1: Set display name**

In `ios/Runner/Info.plist`, find the `CFBundleDisplayName` entry and set its string value to `SmartSoko`:

```xml
<key>CFBundleDisplayName</key>
<string>SmartSoko</string>
```

- [ ] **Step 2: Add permission strings**

Insert these keys into the top-level `<dict>` (after `CFBundleDisplayName`), each with a user-facing purpose string. Permission prompts with empty/missing purpose strings are rejected by Apple:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>SmartSoko uses your location to find nearby shops and deliver your orders.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>SmartSoko uses your location in the background to track deliveries when you are driving.</string>
<key>NSCameraUsageDescription</key>
<string>SmartSoko uses the camera to take photos of products and deliveries.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>SmartSoko accesses your photo library to upload product and delivery photos.</string>
<key>NSMicrophoneUsageDescription</key>
<string>SmartSoko uses the microphone when recording video with the camera.</string>
```

- [ ] **Step 3: Verify plist is well-formed XML**

Run:
```bash
python -c "import xml.dom.minidom, sys; xml.dom.minidom.parse('d:/project/smartsoko/food_delivery_app/ios/Runner/Info.plist'); print('plist XML OK')"
```
(If `python` is not on PATH, use `node -e "const fs=require('fs'); const s=fs.readFileSync('d:/project/smartsoko/food_delivery_app/ios/Runner/Info.plist','utf8'); if(!/<plist[^>]*>[\s\S]*<\/plist>/.test(s)) process.exit(1); console.log('plist structure present')"` as a fallback structural check.)

Expected: `plist XML OK`.

- [ ] **Step 4: Commit**

```bash
git add food_delivery_app/ios/Runner/Info.plist
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "feat: iOS permission strings and display name"
```

---

### Task 4: Quality-gate workflow (`flutter-ci.yml`)

**Files:**
- Create: `.github/workflows/flutter-ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a workflow named `Flutter CI` that every future PR/push must keep green. The iOS workflow (Task 5) intentionally does NOT depend on it (independent failure domains).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/flutter-ci.yml` with exactly:

```yaml
name: Flutter CI

on:
  push:
    branches: [master, main]
    paths:
      - 'food_delivery_app/lib/**'
      - 'food_delivery_app/pubspec.yaml'
      - 'food_delivery_app/analysis_options.yaml'
      - '.github/workflows/flutter-ci.yml'
  pull_request:
    branches: [master, main]
    paths:
      - 'food_delivery_app/lib/**'
      - 'food_delivery_app/pubspec.yaml'
      - 'food_delivery_app/analysis_options.yaml'
      - '.github/workflows/flutter-ci.yml'

jobs:
  analyze-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: food_delivery_app
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.47.7'
          channel: stable
          cache: true

      # pubspec declares assets/config/.env as an asset; it is gitignored,
      # so materialize an empty one or the asset bundling fails.
      - name: Materialize .env placeholder
        run: mkdir -p assets/config && touch assets/config/.env

      - name: flutter pub get
        run: flutter pub get

      - name: flutter analyze
        run: flutter analyze

      - name: flutter test
        run: flutter test
```

- [ ] **Step 2: Validate YAML parses**

Run:
```bash
node -e "const fs=require('fs');const y=require('d:/project/smartsoko/node_modules/js-yaml');" 2>/dev/null || \
node -e "const fs=require('fs'); const s=fs.readFileSync('d:/project/smartsoko/.github/workflows/flutter-ci.yml','utf8'); if(!s.includes('flutter-version: ''3.47.7''')||!s.includes('ubuntu-latest')) process.exit(1); console.log('workflow content OK')"
```
Expected: `workflow content OK`. (js-yaml may not be installed; the fallback is a content assertion.)

- [ ] **Step 3: Local regression (same gate CI will run)**

```bash
cd food_delivery_app
mkdir -p assets/config && [ -f assets/config/.env ] || touch assets/config/.env
flutter analyze
flutter test
```
Expected: `No issues found!` and all tests pass (baseline 272 green).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/flutter-ci.yml
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "ci: Flutter analyze+test gate on push/PR"
```

---

### Task 5: iOS simulator workflow (Phase A) — M1 exit

**Files:**
- Create: `.github/workflows/ios-release.yml`

**Interfaces:**
- Consumes: secret `ENV_FILE_B64` (user must add it — Step 2), `assets/config/.env` asset requirement from pubspec.
- Produces: workflow named `iOS Release` with a `ios-simulator-build` job; the M2 task appends the `ios-testflight-release` job to this same file. Artifact name: `smartsoko-ios-simulator`.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ios-release.yml` with exactly:

```yaml
name: iOS Release

on:
  workflow_dispatch:
  push:
    tags: ['v*']

jobs:
  ios-simulator-build:
    runs-on: macos-15
    defaults:
      run:
        working-directory: food_delivery_app
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.47.7'
          channel: stable
          cache: true

      - name: Decode .env (required secret)
        env:
          ENV_FILE_B64: ${{ secrets.ENV_FILE_B64 }}
        run: |
          if [ -z "$ENV_FILE_B64" ]; then
            echo "::error::Secret ENV_FILE_B64 is not set. Add it under Settings > Secrets and variables > Actions."
            exit 1
          fi
          mkdir -p assets/config
          echo "$ENV_FILE_B64" | base64 --decode > assets/config/.env
          grep -c '=' assets/config/.env > /dev/null || { echo "::error::Decoded .env is empty"; exit 1; }

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: |
            food_delivery_app/ios/Pods
            ~/Library/Caches/CocoaPods
          key: pods-${{ runner.os }}-${{ hashFiles('food_delivery_app/ios/Podfile.lock') }}
          restore-keys: pods-${{ runner.os }}-

      - name: flutter build ios (simulator)
        run: flutter build ios --simulator

      - name: Upload simulator app artifact
        uses: actions/upload-artifact@v4
        with:
          name: smartsoko-ios-simulator
          path: food_delivery_app/build/ios/iphonesimulator/Runner.app
```

- [ ] **Step 2: User adds the `ENV_FILE_B64` secret (browser, user action)**

Hand the user these exact steps (never run them yourself — the base64 output contains secret values and must not be echoed or committed):

1. Produce the base64 without displaying it — in a terminal on this box:
   ```bash
   base64 -w0 d:/project/smartsoko/food_delivery_app/assets/config/.env | clip.exe
   ```
   The value is now in the clipboard. Do not paste it anywhere except GitHub.
2. Open https://github.com/jengamate255/Smartsoko/settings/secrets/actions/new
3. Name: `ENV_FILE_B64`, Secret: paste clipboard, **Add secret**.

Wait for the user to confirm the secret exists before continuing to Step 4.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ios-release.yml
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "ci: iOS simulator build workflow (Phase A)"
```

- [ ] **Step 4: Push and watch CI (M1 verification)**

```bash
git status --short              # confirm clean tree
git push -u origin main
```

Notes: `origin/main` will be created (remote default stays `master` — both are covered by triggers). This repo is a partial clone (`blob:none`); if push fails on a missing blob, run `git fetch origin main master` and retry.

Poll run status via the public API (repo is public; do not authenticate):

```bash
curl -s "https://api.github.com/repos/jengamate255/Smartsoko/actions/runs?per_page=5" | grep -E '"name"|"status"|"conclusion"'
```

Expected: `Flutter CI` run → `conclusion: success` (analyze + all tests green on ubuntu). Then trigger the iOS workflow manually — curl POST requires auth which we don't have, so have the user click **Run workflow** at https://github.com/jengamate255/Smartsoko/actions/workflows/ios-release.yml (branch `main`), then poll again.

Expected: `ios-simulator-build` → `conclusion: success`, artifact `smartsoko-ios-simulator` uploaded. First run ~15-25 min (no Pods cache).

**M1 is done when both runs are green.** Any failure: read the run's job log via `curl -s "https://api.github.com/repos/jengamate255/Smartsoko/actions/runs" ` → get run id → `.../runs/<id>/jobs` → debug; fix and re-push.

---

### Task 6: Apple enrollment + secrets (M2 gate — USER actions, blocked until enrollment)

**Files:** none (browser + terminal actions by the user; assistant provides steps and waits).

**Interfaces:**
- Produces: secrets `GOOGLE_SERVICE_INFO_PLIST_B64`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `CERT_P12_B64`, `P12_PASSWORD`, `PROFILE_MOBILEPROVISION_B64`, `TEAM_ID` — consumed verbatim by Task 7's workflow.

**Precondition:** Apple Developer Program enrollment complete (developer.apple.com/programs → enroll; identity verification takes ~24-48h). Nothing in this task is automatable by the assistant — browser sign-ins are user actions.

- [ ] **Step 1: Enroll** — user completes enrollment at https://developer.apple.com/programs/ and notes their **Team ID** (shown at https://developer.apple.com/account#MembershipDetailsCard).

- [ ] **Step 2: Register the iOS app in Firebase** — user opens https://console.firebase.google.com → their project → Project settings → Your apps → Add app → iOS → bundle ID `com.smartsoko.smartmove` → downloads `GoogleService-Info.plist`. Assistant then encodes it to clipboard (user runs, never echoes):
  ```bash
  base64 -w0 /c/Users/Dvid/Downloads/GoogleService-Info.plist | clip.exe
  ```
  User pastes at https://github.com/jengamate255/Smartsoko/settings/secrets/actions/new as `GOOGLE_SERVICE_INFO_PLIST_B64`.
  Also enable **Crashlytics dSYM auto-upload from App Store Connect** in Firebase console (Crashlytics → Settings), so no dSYM build phase is needed.

- [ ] **Step 3: Distribution certificate (works on Windows — openssl, git-bash)** — user runs in a scratch directory (never committed):
  ```bash
  openssl req -new -newkey rsa:2048 -nodes -keyout dist.key -subj "/CN=SmartSoko Distribution/O=<Their Name>" -out dist.csr
  ```
  Then at https://developer.apple.com/account/resources/certificates/add → **Apple Distribution** → upload `dist.csr` → download `distribution.cer`, then:
  ```bash
  openssl x509 -in distribution.cer -inform DER -out dist.pem -outform PEM
  openssl pkcs12 -export -out dist.p12 -inkey dist.key -in dist.pem -password pass:<user-chosen-password>
  base64 -w0 dist.p12 | clip.exe
  ```
  Paste as `CERT_P12_B64`; paste the chosen password as `P12_PASSWORD`; then `rm dist.key dist.pem dist.csr distribution.cer dist.p12`.

- [ ] **Step 4: App Store provisioning profile** — user creates at https://developer.apple.com/account/resources/profiles/add → **App Store** → app ID `com.smartsoko.smartmove` (register the app ID first if prompted) → select the Apple Distribution cert from Step 3 → download the `.mobileprovision`, then:
  ```bash
  base64 -w0 <profile>.mobileprovision | clip.exe
  ```
  Paste as `PROFILE_MOBILEPROVISION_B64`. Note the profile's exact **Name** (Task 7 needs it).

- [ ] **Step 5: App Store Connect API key** — user creates at https://appstoreconnect.apple.com/access/integrations/api → Team Keys → Generate → role **App Manager**, downloads the `.p8` once, and notes **Key ID** and **Issuer ID**. Then:
  ```bash
  base64 -w0 AuthKey_<KEYID>.p8 | clip.exe
  ```
  Paste as `ASC_KEY_P8`; paste values as `ASC_KEY_ID`, `ASC_ISSUER_ID`, `TEAM_ID`.

- [ ] **Step 6: Confirm all 9 secrets exist** (assistant verifies names only via the user; values are never displayed): `ENV_FILE_B64`, `GOOGLE_SERVICE_INFO_PLIST_B64`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `CERT_P12_B64`, `P12_PASSWORD`, `PROFILE_MOBILEPROVISION_B64`, `TEAM_ID`.

---

### Task 7: TestFlight release job (Phase B) — M2 exit

**Files:**
- Modify: `.github/workflows/ios-release.yml` (append job)
- Modify: `food_delivery_app/ios/Runner/Info.plist` (nothing committed — URL scheme injected at CI from the decoded plist)

**Interfaces:**
- Consumes: all 9 secrets from Task 6; bundle ID `com.smartsoko.smartmove` (Task 2); profile **Name** from Task 6 Step 4 (stored in repo variable `PROFILE_NAME` — user adds it at Settings → Secrets and variables → Actions → **Variables** tab, or the executor asks the user; it is not secret, a variable is correct).
- Produces: signed `.ipa` uploaded to TestFlight on every `v*` tag or manual run. **M2 done = build visible in TestFlight.**

- [ ] **Step 1: Append the TestFlight job to `.github/workflows/ios-release.yml`**

```yaml
  ios-testflight-release:
    if: ${{ github.event_name == 'push' || github.event_name == 'workflow_dispatch' }}
    needs: ios-simulator-build
    runs-on: macos-15
    defaults:
      run:
        working-directory: food_delivery_app
    env:
      PROFILE_NAME: ${{ vars.PROFILE_NAME }}
      TEAM_ID: ${{ secrets.TEAM_ID }}
      ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
      ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.47.7'
          channel: stable
          cache: true

      - name: Decode secrets
        env:
          ENV_FILE_B64: ${{ secrets.ENV_FILE_B64 }}
          GOOGLE_SERVICE_INFO_PLIST_B64: ${{ secrets.GOOGLE_SERVICE_INFO_PLIST_B64 }}
          CERT_P12_B64: ${{ secrets.CERT_P12_B64 }}
          PROFILE_MOBILEPROVISION_B64: ${{ secrets.PROFILE_MOBILEPROVISION_B64 }}
        run: |
          fail_missing() { echo "::error::Secret $1 is not set (see Task 6 of the iOS plan)"; exit 1; }
          [ -n "$ENV_FILE_B64" ] || fail_missing ENV_FILE_B64
          [ -n "$GOOGLE_SERVICE_INFO_PLIST_B64" ] || fail_missing GOOGLE_SERVICE_INFO_PLIST_B64
          [ -n "$CERT_P12_B64" ] || fail_missing CERT_P12_B64
          [ -n "$PROFILE_MOBILEPROVISION_B64" ] || fail_missing PROFILE_MOBILEPROVISION_B64
          mkdir -p assets/config ios/Runner
          echo "$ENV_FILE_B64" | base64 --decode > assets/config/.env
          echo "$GOOGLE_SERVICE_INFO_PLIST_B64" | base64 --decode > ios/Runner/GoogleService-Info.plist
          plutil -lint ios/Runner/GoogleService-Info.plist

      - name: Ensure plist + URL scheme wired into Xcode project
        run: |
          ruby -rxcodeproj - <<'RUBY'
          require 'xcodeproj'
          path = 'ios/Runner.xcodeproj'
          project = Xcodeproj::Project.open(path)
          target = project.targets.first
          runner_group = project.main_group['Runner'] || project.main_group.new_group('Runner')
          ref = runner_group.files.find { |f| f.path == 'GoogleService-Info.plist' }
          ref ||= runner_group.new_file('GoogleService-Info.plist')
          resources = target.resources_build_phase
          has_ref = resources.files.any? { |bf| bf.file_ref == ref }
          resources.add_file(ref) unless has_ref
          project.save
          puts 'GoogleService-Info.plist wired'
          RUBY
          # Google Sign-In URL scheme from the decoded plist (idempotent)
          REVERSED=$(plutil -extract REVERSED_CLIENT_ID raw ios/Runner/GoogleService-Info.plist)
          /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" ios/Runner/Info.plist 2>/dev/null || \
            /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" ios/Runner/Info.plist
          EXISTS=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" ios/Runner/Info.plist | grep -c "$REVERSED" || true)
          if [ "$EXISTS" = "0" ]; then
            /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" ios/Runner/Info.plist
            /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" ios/Runner/Info.plist
            /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $REVERSED" ios/Runner/Info.plist
          fi

      - name: Install signing certificate and profile
        run: |
          KEYCHAIN=build.keychain
          KEYCHAIN_PWD=$(openssl rand -hex 16)
          security create-keychain -p "$KEYCHAIN_PWD" "$KEYCHAIN"
          security default-keychain -s "$KEYCHAIN"
          security unlock-keychain -p "$KEYCHAIN_PWD" "$KEYCHAIN"
          security set-keychain-settings -t 3600 "$KEYCHAIN"
          echo "$CERT_P12_B64" | base64 --decode > /tmp/dist.p12
          security import /tmp/dist.p12 -k "$KEYCHAIN" -P "$P12_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PWD" "$KEYCHAIN" > /dev/null
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          PROFILE_UUID=$(
            echo "$PROFILE_MOBILEPROVISION_B64" | base64 --decode > /tmp/profile.mobileprovision
            security cms -D -i /tmp/profile.mobileprovision | plutil -extract UUID raw -
          )
          cp /tmp/profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/$PROFILE_UUID.mobileprovision
          echo "PROFILE_UUID=$PROFILE_UUID" >> "$GITHUB_ENV"
          rm /tmp/dist.p12 /tmp/profile.mobileprovision
        env:
          CERT_P12_B64: ${{ secrets.CERT_P12_B64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          PROFILE_MOBILEPROVISION_B64: ${{ secrets.PROFILE_MOBILEPROVISION_B64 }}

      - name: Generate ExportOptions.plist
        run: |
          cat > ios/ExportOptions.plist <<'EOF'
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key><string>app-store</string>
            <key>teamID</key><string>${TEAM_ID}</string>
            <key>signingStyle</key><string>manual</string>
            <key>signingCertificate</key><string>Apple Distribution</string>
            <key>provisioningProfiles</key>
            <dict>
              <key>com.smartsoko.smartmove</key><string>${PROFILE_NAME}</string>
            </dict>
            <key>uploadSymbols</key><true/>
          </dict>
          </plist>
          EOF
          plutil -lint ios/ExportOptions.plist
          # envsubst-style expansion is not automatic in plists; do explicit replacement
          sed -i '' "s/\${TEAM_ID}/$TEAM_ID/; s/\${PROFILE_NAME}/$PROFILE_NAME/" ios/ExportOptions.plist
          plutil -lint ios/ExportOptions.plist

      - name: flutter build ipa
        run: flutter build ipa --release --export-options-plist=ios/ExportOptions.plist --build-number=$GITHUB_RUN_NUMBER

      - name: Upload to TestFlight
        env:
          ASC_KEY_P8: ${{ secrets.ASC_KEY_P8 }}
        run: |
          mkdir -p ~/.appstoreconnect/private_keys
          echo "$ASC_KEY_P8" | base64 --decode > ~/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8
          cat > /tmp/api_key.json <<EOF
          {"key_id":"$ASC_KEY_ID","issuer_id":"$ASC_ISSUER_ID","key":"$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8","in_house":false}
          EOF
          fastlane pilot upload --api_key_path /tmp/api_key.json \
            --ipa build/ios/ipa/*.ipa \
            --skip_waiting false --skip_submission false
          rm /tmp/api_key.json

      - name: Cleanup keychain
        if: always()
        run: security delete-keychain build.keychain || true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ios-release.yml
GIT_AUTHOR_NAME=jengamate255 GIT_AUTHOR_EMAIL=dd396515@gmail.com GIT_COMMITTER_NAME=jengamate255 GIT_COMMITTER_EMAIL=dd396515@gmail.com git commit -m "ci: TestFlight release job (Phase B)"
```

- [ ] **Step 3: Verify (M2 exit)**

1. Push: `git push origin main`.
2. User triggers **Run workflow** at https://github.com/jengamate255/Smartsoko/actions/workflows/ios-release.yml.
3. Poll as in Task 5 Step 4. Expected: `ios-simulator-build` success, then `ios-testflight-release` success (~20-35 min first run).
4. User confirms in https://appstoreconnect.apple.com (TestFlight) that a build for `com.smartsoko.smartmove` is processing/ready and installs via TestFlight on a device.

Common failure → fix mapping (all deterministic):
- `profile doesn't match bundle id` → profile was created for a different app ID (Task 6 Step 4).
- `codesign` hangs → `set-key-partition-list` step missing/failed — check keychain steps.
- `no matching provisioning profile` → `PROFILE_NAME` variable mismatch (exact name required).
- fastlane `could not find API key` → `ASC_KEY_P8` decode or key filename (`AuthKey_<ASC_KEY_ID>.p8`) mismatch.
- 409/401 from ASC → Issuer/Key ID swapped, or key lacks App Manager role.

---

## Self-Review

- **Spec coverage:** ios/ scaffold (T2), identity (T2), Info.plist permissions (T3), two workflows (T4/T5), ENV_FILE_B64 (T5), simulator Phase A (T5), gitignore hygiene (T1), secrets model + failure rule (T5 decode step, T7 fail_missing), TestFlight Phase B (T7), crashlytics via console auto-dSYM (T6 Step 2 — spec said build phase; console auto-upload is simpler and equivalent, noted). Maps/Mapbox injection deferred per Global Constraints deviation note — matches reality (no keys provisioned).
- **Placeholder scan:** No TBDs. User-chosen values (P12 password, profile name, cert CN org) are explicit user inputs in Task 6 steps, not executor placeholders.
- **Type/name consistency:** Secret names identical across Tasks 5/6/7 (`ENV_FILE_B64`, `GOOGLE_SERVICE_INFO_PLIST_B64`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `CERT_P12_B64`, `P12_PASSWORD`, `PROFILE_MOBILEPROVISION_B64`, `TEAM_ID`, variable `PROFILE_NAME`). Artifact name `smartsoko-ios-simulator` defined in T5, referenced in T5 verification. Bundle ID `com.smartsoko.smartmove` consistent in T2/T6/T7 ExportOptions.
