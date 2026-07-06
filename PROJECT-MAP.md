# SmartSoko Food Delivery - Project Map

```
e:\Project\food delivery\
│
├── 📁 Root Configuration
│   ├── package.json              # Root npm scripts & dependencies
│   ├── firebase.json             # Firebase Hosting config
│   ├── .firebaserc               # Firebase project settings
│   ├── .env.local               # Environment variables
│   └── netlify.toml             # Netlify deploy config
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
├── 📁 dataconnect/              # Firebase Data Connect
├── 📁 .firebase/                # Firebase cache
├── 📁 .vercel/                  # Vercel cache
├── 📁 .netlify/                 # Netlify cache
├── 📁 .windsurf/                # AI assistant files
├── 📁 APK-Builds/               # Generated APKs
├── 📁 screenshots/              # Screenshots
└── 📁 temp_build_project/       # Temp build files
```

## Key Entry Points

| Platform | URL/Path |
|----------|----------|
| **Local Server** | `http://localhost:3000` |
| **Firebase** | `https://fooddelievry-dce15.web.app` |
| **Vercel** | `https://web-a5a2yprcs-david-mitantos-projects.vercel.app` |
| **Netlify** | `https://smartsoko-marketplace-2026.netlify.app` |

## Available Scripts

```bash
# Start local server
npm start

# Deploy to all platforms
npm run deploy:firebase
npm run deploy:vercel

# Build APKs
npm run build:apk
```

## Architecture

- **Frontend**: HTML + Tailwind CSS + Vanilla JS
- **Backend**: Node.js + Express (local dev only)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Hosting**: Firebase + Vercel + Netlify
