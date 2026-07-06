# Food Delivery App - Todo List

## Completed

### Store Creation & Settings
- [x] Create store wizard (5-step: Basics, Location, Pricing, Branding, Review)
- [x] Store settings page (basic info, contact, hours, holidays, delivery, branding, SEO, danger zone)
- [x] Location fields in create-store (placeName, lat, lng, deliveryRadius)
- [x] Location fields in store-settings (placeName, lat, lng, deliveryRadius, deliveryAreas)
- [x] GeoPoint storage in Firestore sellers doc

### Industry Profiles
- [x] 16 SME profiles in merchant-profiles.js
- [x] Custom product form extras per industry
- [x] Dashboard tips, quick actions, brand colors per profile
- [x] Menu filter updates dynamically per industry
- [x] Legacy category mapping (food→restaurant, fruits/vegetables→farmer)

### Merchant Dashboard
- [x] Leaflet map with OpenStreetMap tiles in settings tab
- [x] Draggable marker location picker
- [x] Detect My Location (browser geolocation)
- [x] Search Address (Nominatim reverse geocode)
- [x] Delivery radius slider (0-50km)
- [x] Delivery areas text input
- [x] Real-time order subscription
- [x] Order status updates (accept, pick up, deliver, reject)
- [x] Chat persistence to Firestore
- [x] Cart recovery stats
- [x] Sales analytics with chart
- [x] Product CRUD with multi-image gallery
- [x] Finance tab with live payout calculations

### Storefront
- [x] Merchant location map on store.html with Leaflet + delivery radius circle
- [x] "Stores Near Me" page (nearby.html) with GeoPoint queries, distance sorting, map markers
- [x] "Near Me" link in discovery page category chips

### Driver Dashboard
- [x] 3D UI overhaul (perspective, translateZ, glassmorphism, animated orbs, shimmer, floating bottom nav)
- [x] Real-time order availability
- [x] GPS location tracking
- [x] Online/offline toggle
- [x] Earnings tracking with chart
- [x] Delivery history with filters

### Server
- [x] Express server on port 3000
- [x] Image upload endpoint (`/api/upload`)
- [x] Static file serving
- [x] WebSocket for real-time rider tracking
- [x] All routes mapped (create-store, store-settings, customers, nearby, etc.)

### Infrastructure
- [x] Supabase as Firebase Functions alternative (Firebase Blaze plan not needed)
- [x] Supabase API routes at /api/supabase/* in server.js
- [x] DataService CRUD for sellers and products
- [x] Firebase Firestore backend (or Supabase PostgreSQL)
- [x] Firebase Auth integration

## Pending
- [ ] End-to-end testing of full merchant flow (create store → set industry → add products → set location → receive orders)
- [ ] Testing driver signup and order acceptance flow
- [ ] Mobile responsiveness polish on merchant dashboard
- [ ] SEO meta tags on store pages
- [ ] Order notifications (push/SMS)
- [ ] Admin fleet management dashboard
- [ ] Customer order tracking with real-time driver location

---

## Firebase vs Supabase decision

**When Firebase Blaze plan is required for `firebase deploy --only functions`, use Supabase instead.**

| Feature | Firebase | Supabase |
|---------|----------|----------|
| Functions deploy | ❌ Requires Blaze (paid) plan | ✅ Free tier supports Edge Functions |
| Database | Firestore (NoSQL) | PostgreSQL (SQL) |
| API server | Cloud Functions (Express) | Express server.js routes at `/api/supabase/*` |
| Auth | Firebase Auth | Supabase Auth (`/auth/v1`) |
| Realtime | Firestore onSnapshot | Supabase Realtime (websocket) |
| Storage | Firebase Storage | Supabase Storage (`/storage/v1`) |
| Deployment | `firebase deploy` (needs Blaze for functions) | `node server.js` or Vercel/Netlify |

**Supabase project**: `https://vonkqyiczeqhuqhahsxm.supabase.co`  
**Supabase API routes**: All available at `http://localhost:5000/api/supabase/*` when running `node server.js`  
**Server file**: `server-supabase-routes.js` — wired into `server.js` at the `/api/supabase` prefix
