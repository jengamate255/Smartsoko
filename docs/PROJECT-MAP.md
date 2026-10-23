# SmartSoko Food Delivery - Project Map

```
D:\project\smartsoko\
│
├── 📁 Root Configuration
│   ├── package.json              # Root npm scripts (delegate to food_delivery_app)
│   ├── package-lock.json
│   ├── firebase.json             # Firebase Hosting config
│   ├── .firebaserc               # Firebase project settings
│   ├── codemagic.yaml            # Codemagic CI (iOS unsigned IPA)
│   ├── opencode.json             # OpenCode project config (model, MCP, permissions)
│   ├── .prettierrc.json          # Prettier config
│   ├── .gitignore
│   ├── AGENTS.md                 # Agent guidance (auto-loaded)
│   └── README.md                 # Repo landing page
│
├── 📁 docs/                      # Project documentation
│   ├── PROJECT-MAP.md            # ← this file
│   ├── PROJECT-STATUS.md         # APK build status + Flutter setup steps
│   ├── BUILD-APK-GUIDE.md        # APK build instructions
│   └── INSTALL-FRUTTER.md        # Flutter install guide
│
├── 📁 scripts/                   # Build & setup automation
│   ├── build-apk.ps1             # Flutter APK builder
│   ├── build-apk-expo.ps1        # Expo / React Native APK builder
│   ├── build-apk.bat
│   ├── build-all-apks.ps1        # Customer + Driver + Merchant
│   ├── build-native-apk.ps1      # True React Native APK
│   ├── build_android.ps1         # Customer app (Gradle / JDK 21)
│   ├── QUICK-BUILD-APK.bat
│   ├── check-apks.ps1
│   └── setup-flutter.ps1 / setup-flutter.bat / quick-setup.ps1
│
├── 📁 assets/
│   ├── qrcodes/                  # Generated QR codes
│   └── screenshots/              # Build / test screenshots
│
├── 📁 food_delivery_app/         # Main Application Directory
│   │
│   ├── 📁 web/                   # Web Application (PWA)
│   │   ├── 📄 Customer Pages
│   │   │   ├── index.html        # Customer home/discovery
│   │   │   ├── customer.html     # Main customer interface
│   │   │   ├── checkout.html     # Checkout flow
│   │   │   ├── cart.html         # Shopping cart
│   │   │   ├── track-order.html  # Order tracking
│   │   │   └── chat.html         # Customer chat
│   │   │
│   │   ├── 📄 Merchant Pages
│   │   │   ├── merchant.html     # Merchant dashboard
│   │   │   ├── seller.html       # Seller interface
│   │   │   ├── restaurant.html   # Restaurant setup
│   │   │   └── product.html      # Product management
│   │   │
│   │   ├── 📄 Driver Pages
│   │   │   ├── driver.html       # Driver app
│   │   │   └── fleet-manager.html # Fleet management
│   │   │
│   │   ├── 📄 Admin Pages
│   │   │   ├── admin.html        # Main admin panel
│   │   │   └── admin-panel.html  # Alternative admin UI
│   │   │
│   │   ├── 📄 Auth Pages
│   │   │   ├── login.html        # Login page
│   │   │   ├── signup.html       # Registration
│   │   │   ├── check-user.html   # User verification
│   │   │   └── onboarding.html   # User onboarding (disabled)
│   │   │
│   │   ├── 📁 config/            # Configuration Files
│   │   │   ├── firebase-config.js       # Firebase SDK config
│   │   │   ├── firebase-config-compat.js # Compatibility mode
│   │   │   └── api-config.js           # API routes config
│   │   │
│   │   ├── 📁 js/                # JavaScript Modules
│   │   │   ├── data-service.js   # Data fetching service
│   │   │   ├── merchant-app.js   # Merchant app logic
│   │   │   ├── logout.js         # Auth utilities
│   │   │   └── app-config.js     # App configuration
│   │   │
│   │   ├── 📄 Shared Components
│   │   │   ├── nav-component.js  # Navigation component
│   │   │   ├── auth-check.js     # Auth verification
│   │   │   ├── design-system.css # CSS design tokens
│   │   │   └── components/       # UI components
│   │   │
│   │   └── 📄 Other
│   │       ├── home.html         # Landing page
│   │       ├── orders.html       # Order history
│   │       ├── profile.html      # User profile
│   │       ├── discovery.html    # Restaurant discovery
│   │       └── manifest.json     # PWA manifest
│   │
│   ├── 📁 lib/                   # Flutter Mobile App
│   │   ├── 📁 screens/           # UI Screens (41 items)
│   │   ├── 📁 services/          # Business Logic (14 items)
│   │   ├── 📁 widgets/           # Reusable Widgets (14 items)
│   │   ├── 📁 models/            # Data Models (6 items)
│   │   ├── 📁 utils/             # Utilities (5 items)
│   │   ├── 📁 config/            # App Config
│   │   ├── 📁 data/              # Local Data
│   │   ├── main.dart             # App entry
│   │   ├── main_customer.dart    # Customer app
│   │   ├── main_driver.dart      # Driver app
│   │   └── main_merchant.dart    # Merchant app
│   │
│   ├── 📁 mobile/                # React Native Mobile
│   │   ├── 📁 src/               # Source code (39 items)
│   │   ├── 📁 android/           # Android specific
│   │   ├── 📁 assets/            # Static assets
│   │   ├── App.tsx               # Main app component
│   │   └── package.json          # RN dependencies
│   │
│   ├── 📁 android-customer/      # Native Android (Customer)
│   ├── 📁 android-driver/        # Native Android (Driver)
│   ├── 📁 android-merchant/      # Native Android (Merchant)
│   ├── 📁 android-merchant-native/  # Full native merchant
│   │
│   ├── 📁 Server Files
│   │   ├── server-production.js  # Production server
│   │   ├── server-secure.js      # HTTPS server
│   │   ├── server.js             # Development server
│   │   ├── middleware/           # Express middleware
│   │   ├── validators/           # Input validators
│   │   └── api/                  # API routes
│   │
│   ├── 📁 Configuration
│   │   ├── firebase.json         # Firebase config
│   │   ├── firestore.rules       # Security rules
│   │   ├── firestore.indexes.json # DB indexes
│   │   ├── tailwind.config.js    # Tailwind CSS config
│   │   ├── vercel.json           # Vercel deploy config
│   │   └── netlify.toml          # Netlify config
│   │
│   ├── 📁 Documentation
│   │   ├── README.md
│   │   ├── BUILD-APK-GUIDE.md
│   │   ├── DEPLOYMENT.md
│   │   ├── API-INTEGRATION.md
│   │   ├── SECURITY.md
│   │   ├── QUICK-DEPLOY.md
│   │   ├── LIVE-LINKS.md
│   │   └── QUICK_START.md
│   │
│   ├── 📁 Build & Deploy
│   │   ├── deploy/               # Deploy configs
│   │   ├── scripts/              # Build scripts
│   │   ├── build-all-apks.bat    # APK build script
│   │   ├── deploy-all.bat        # Deploy all platforms
│   │   └── vercel-deploy.bat     # Vercel deploy
│   │
│   └── 📁 dist/                  # Build output
│
├── 📁 Smartsoko/                 # Flutter project files
├── 📁 side-income/               # Personal side projects — NOT part of the app
│   ├── 📁 gray-swan/             # Gray Swan Arena: injection write-ups + technique notes
│   ├── 📁 bounties/              # Bug-bounty tracker, triage runs, recon tool, Docker lab
│   └── 📁 income/                # Income research + Tanzania payout setup
└── 📁 node_modules/              # Dependencies (gitignored)
```

> **Correction (2026-10):** there is no base-level `server.js` dev server in
> `food_delivery_app/` anymore — the server lives at
> `food_delivery_app/server/server-production.js` (with `server-dev.js` for
> local runs). Server files were moved under `food_delivery_app/server/`.

## Key Entry Points

| Platform         | URL/Path                                                   |
| ---------------- | ---------------------------------------------------------- |
| **Local Server** | `http://localhost:3000`                                    |
| **Firebase**     | `https://fooddelievry-dce15.web.app`                       |
| **Vercel**       | `https://web-a5a2yprcs-david-mitantos-projects.vercel.app` |
| **Netlify**      | `https://smartsoko-marketplace-2026.netlify.app`           |

## Available Scripts

Root `package.json` only delegates to `food_delivery_app`:

```bash
npm start          # -> food_delivery_app start (server-production.js)
npm run dev        # NODE_ENV=development
npm test           # vitest (delegates to food_delivery_app)
npm run build      # delegates to food_delivery_app
```

APK builds are **not** npm scripts — use the PowerShell helpers in `scripts/`:

```powershell
.\scripts\build-apk.ps1 -Mode debug     # Flutter APK
.\scripts\build-apk-expo.ps1            # Expo / React Native APK
.\scripts\build-all-apks.ps1            # Customer + Driver + Merchant
```

## Architecture

- **Frontend**: HTML + Tailwind CSS + Vanilla JS
- **Backend**: Node.js + Express (local dev only)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Hosting**: Firebase + Vercel + Netlify

## Not part of the app

`side-income/` is a **personal side-project workspace** (bounty research, Gray Swan prompt-injection
write-ups, income/payout notes). It shares this repo but has no dependency on the app, is not in any
build or deploy pipeline, and its scripts are not project tooling. Start at `side-income/README.md`.
