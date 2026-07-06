# Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies
```bash
flutter pub get
```

### 2. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
FIREBASE_API_KEY=your_actual_key
FIREBASE_PROJECT_ID=fooddelievry-dce15
# ... etc
```

### 3. Run the App
```bash
# Web
flutter run -d web-server --web-port 8080

# Android
flutter run -d android

# iOS
flutter run -d ios
```

## What's New (Production Ready Features)

### ✅ Security
- Firestore security rules with authentication
- Environment variable support
- API key protection
- Input validation

### ✅ Error Handling
- Comprehensive error messages
- Network error detection
- Error screens and recovery
- Crash reporting with Crashlytics

### ✅ User Experience
- Loading skeletons (shimmer effect)
- Empty state screens
- Better error feedback
- Loading overlays

### ✅ Code Quality
- Strict linting rules
- Structured logging
- Fixed syntax errors
- Type safety

### ✅ Monitoring
- Firebase Crashlytics
- Firebase Analytics
- Structured logging
- Connectivity monitoring

## File Structure

```
lib/
├── config/
│   ├── app_config.dart       # App configuration
│   └── env_config.dart       # Environment variables
├── models/                   # Data models
├── screens/                  # UI screens
│   ├── customer/            # Customer app
│   └── rider/               # Rider app
├── services/                # Business logic
│   ├── auth_service.dart
│   ├── payment_service.dart
│   ├── connectivity_service.dart
│   └── ...
├── utils/                   # Utilities
│   ├── logger.dart          # Logging
│   ├── validators.dart      # Input validation
│   ├── error_handler.dart   # Error handling
│   └── constants.dart       # App constants
├── widgets/                 # Reusable widgets
│   ├── error_screen.dart
│   ├── loading_overlay.dart
│   └── shimmer_loading.dart
└── main.dart               # App entry point
```

## Key Files

- `.env` - Environment variables (create from .env.example)
- `firestore.rules` - Database security rules
- `SECURITY.md` - Security guidelines
- `DEPLOYMENT.md` - Deployment guide
- `PRODUCTION_READY.md` - Production readiness report

## Common Commands

```bash
# Get dependencies
flutter pub get

# Run linter
flutter analyze

# Run tests
flutter test

# Build for production
flutter build web --release
flutter build apk --release
flutter build ios --release

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Troubleshooting

### "Environment variable not found"
- Make sure `.env` file exists
- Check that all required variables are set
- Restart the app after changing `.env`

### "Permission denied" errors
- Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- Make sure user is authenticated
- Check user has correct role

### Build errors
- Run `flutter clean`
- Run `flutter pub get`
- Check Flutter version: `flutter --version`

## Next Steps

1. ✅ Dependencies installed
2. ⚠️ Create `.env` file with your credentials
3. ⚠️ Deploy Firestore security rules
4. ⚠️ Test the app
5. ⚠️ Configure app signing for release

## Support

- Check `README.md` for detailed setup
- See `SECURITY.md` for security best practices
- Read `DEPLOYMENT.md` for production deployment
- Review `PRODUCTION_READY.md` for what's been improved
