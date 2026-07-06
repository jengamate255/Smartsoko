# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

Create a `.env` file with your production credentials:

```bash
cp .env.example .env
```

Fill in all required values:
- Firebase credentials
- M-Pesa API keys
- Google Maps API key

### 2. Security Configuration

#### Firestore Rules
Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

Verify rules are active in Firebase Console.

#### API Keys
- Restrict Firebase API key to your domain/app
- Restrict Google Maps API key to your domain
- Store M-Pesa credentials securely (use Cloud Functions)

### 3. Firebase Setup

#### Enable Services
- Authentication (Phone)
- Firestore Database
- Storage
- Crashlytics
- Analytics

#### Create Indexes
Run the app and create required indexes when prompted.

### 4. Code Quality

Run linter:
```bash
flutter analyze
```

Fix all errors and warnings.

### 5. Testing

#### Unit Tests
```bash
flutter test
```

#### Integration Tests
Test critical flows:
- User registration/login
- Order placement
- Payment processing
- Order tracking

#### Device Testing
Test on:
- Android (multiple versions)
- iOS (multiple versions)
- Web (Chrome, Safari, Firefox)

### 6. Build Configuration

#### Android
1. Update `android/app/build.gradle`:
   - Set correct `applicationId`
   - Update `versionCode` and `versionName`
   - Configure signing

2. Generate signing key:
```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

3. Create `android/key.properties`:
```properties
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=<path-to-keystore>
```

#### iOS
1. Update `ios/Runner/Info.plist`
2. Configure signing in Xcode
3. Update bundle identifier

#### Web
1. Update `web/index.html` meta tags
2. Configure PWA settings
3. Set up hosting (Firebase Hosting recommended)

### 7. Build for Production

#### Web
```bash
flutter build web --release --web-renderer canvaskit
```

Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

#### Android
```bash
flutter build appbundle --release
```

Upload to Google Play Console.

#### iOS
```bash
flutter build ios --release
```

Archive and upload via Xcode.

### 8. Monitoring Setup

#### Crashlytics
Verify crash reporting is working:
```dart
FirebaseCrashlytics.instance.crash(); // Test crash
```

#### Analytics
Verify events are being logged in Firebase Console.

### 9. Performance Optimization

- Enable code obfuscation:
```bash
flutter build apk --release --obfuscate --split-debug-info=build/debug-info
```

- Optimize images
- Enable caching
- Minimize bundle size

### 10. Post-Deployment

#### Monitor
- Check Crashlytics for crashes
- Monitor Analytics for user behavior
- Check Firestore usage and costs
- Monitor API quotas

#### Backup
- Set up automated Firestore backups
- Backup user data regularly

#### Updates
- Plan for regular updates
- Monitor user feedback
- Fix critical bugs immediately

## Environment-Specific Configurations

### Development
```bash
flutter run --dart-define=ENV=dev
```

### Staging
```bash
flutter run --dart-define=ENV=staging
```

### Production
```bash
flutter run --dart-define=ENV=prod
```

## Rollback Plan

If issues occur:
1. Revert to previous version in app stores
2. Roll back Firestore rules if needed
3. Disable problematic features via remote config
4. Communicate with users

## Support

- Monitor support channels
- Respond to user issues quickly
- Track common problems
- Update FAQ based on feedback
