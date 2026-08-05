# SmartMove CI/CD Pipeline

This CI/CD pipeline automates testing, deployment, and validation of the SmartMove module.

## GitHub Actions Workflow

Save as `.github/workflows/smartmove.yml`:

```yaml
name: SmartMove CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'supabase/migrations/008_smartmove_rides.sql'
      - 'supabase/migrations/009_smartmove_rls.sql'
      - 'supabase/functions/smartmove-*/**'
      - 'lib/models/smartmove/**'
      - 'lib/services/smartmove/**'
      - 'lib/screens/smartmove/**'
      - 'lib/widgets/smartmove/**'
  pull_request:
    branches: [main]
    paths:
      - 'supabase/functions/smartmove-*/**'
      - 'lib/models/smartmove/**'
      - 'lib/services/smartmove/**'

jobs:
  # 1. Supabase Edge Function Tests
  supabase-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Start Supabase local
        run: supabase start
      - name: Run Edge Function tests
        run: |
          supabase functions serve --no-verify-jwt &
          sleep 5
          # Test pricing function
          curl -s -X POST http://localhost:54321/functions/v1/smartmove-pricing \
            -H "Content-Type: application/json" \
            -d '{"vehicle_type_id":"sedan_001","pickup_latitude":-6.7924,"pickup_longitude":39.2083,"dropoff_latitude":-6.8227,"dropoff_longitude":39.2684}' \
            | jq '.'
          # Test geocoding function
          curl -s -X POST http://localhost:54321/functions/v1/smartmove-geocoding \
            -H "Content-Type: application/json" \
            -d '{"action":"forward","query":"Dar es Salaam"}' \
            | jq '.'
      - name: Stop Supabase
        run: supabase stop

  # 2. Flutter Tests
  flutter-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
      - name: Install dependencies
        run: flutter pub get
      - name: Analyze SmartMove code
        run: flutter analyze lib/models/smartmove/ lib/services/smartmove/ lib/screens/smartmove/ lib/widgets/smartmove/
      - name: Run SmartMove tests
        run: flutter test test/models/smartmove/ test/services/smartmove/

  # 3. Database Migration Validation
  db-migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Validate migrations
        run: supabase db lint
      - name: Dry run migration
        run: supabase db push --dry-run

  # 4. Deploy (manual trigger or on main merge)
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [supabase-tests, flutter-tests, db-migration-check]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Deploy Edge Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          supabase functions deploy smartmove-pricing
          supabase functions deploy smartmove-matching
          supabase functions deploy smartmove-matching-engine
          supabase functions deploy smartmove-tracking
          supabase functions deploy smartmove-geocoding
      - name: Push migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: supabase db push
```

## Required Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Supabase access token for CLI auth |
| `SUPABASE_PROJECT_ID` | Supabase project ID |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token |
| `PESAPAL_CONSUMER_KEY` | PesaPal API key |
| `PESAPAL_CONSUMER_SECRET` | PesaPal API secret |

## Local Development

```bash
# Start local Supabase
supabase start

# Serve edge functions locally
supabase functions serve smartmove-pricing --no-verify-jwt

# Run Flutter tests
flutter test test/models/smartmove/
flutter test test/services/smartmove/

# Run JS tests
npm test

# Run full SmartMove test suite
npm run flutter:test
npm run flutter:analyze
```

## Pre-deployment Checklist

- [ ] Supabase local tests pass
- [ ] Flutter analyze passes with no errors
- [ ] Flutter tests pass
- [ ] Database migrations validated with `supabase db lint`
- [ ] Edge function secrets configured in Supabase dashboard
- [ ] Mapbox API token is valid and has geocoding/directions enabled
- [ ] PesaPal credentials are valid for production

## Monitoring

After deployment, verify:

1. **Edge Functions**: Check Supabase dashboard → Edge Functions for invocation logs
2. **Database**: Check `ride_requests` and `rides` tables for new records
3. **Realtime**: Verify ride status updates propagate correctly
4. **Pricing**: Test fare estimates return correct TZS values
5. **Driver Matching**: Verify nearby driver search returns results
