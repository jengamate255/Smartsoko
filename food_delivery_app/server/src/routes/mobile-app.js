/**
 * Mobile App API — endpoints the native Android customer app
 * (Smartsoko/android-customer-native, Retrofit SmartsokoApiService) calls
 * that were missing from the server:
 *
 *   POST /api/auth/login        { email, password }            → Firebase email sign-in
 *   POST /api/auth/refresh      { refresh_token }               → token refresh (Supabase-style)
 *   GET  /api/users/profile                                     → current profile
 *   PUT  /api/users/profile                                     → update profile
 *   GET  /api/products/featured                                 → featured products
 *   GET  /api/orders/:id/tracking                               → order tracking timeline
 *   POST /api/orders/:id/cancel                                → cancel order
 *
 * Response shapes follow the app's DTOs (ApiResponse<T> = {success, data, message, error};
 * AuthResponseDto = {user: UserDto{...snake_case...}, token, is_new_user}).
 *
 * Auth: these endpoints accept EITHER a Firebase ID token
 * (Authorization: Bearer <idToken>) or a Supabase-style access token
 * (used by the app's refresh flow) — resolved per-request.
 */
'use strict';

const escrow = require('../services/escrow');

function mobileAppRoutes(app) {
    const authMiddleware = app.get('authMiddleware');
    const { verifyToken } = authMiddleware;
    const db = () => app.get('db');
    const admin = () => app.get('admin');
    const now = () => new Date().toISOString();

    const ok = (res, data, message) => res.json({ success: true, data, message });
    const bad = (res, status, error) => res.status(status).json({ success: false, error });

    // ─── Token resolution: Firebase ID token OR Supabase JWT ───────────────
    async function resolveUser(req) {
        let verified = null;
        await verifyToken(
            req,
            {
                status() {
                    return this;
                },
                json() {
                    return this;
                },
            },
            () => {
                verified = req.user;
            }
        );
        return verified;
    }

    // ─── POST /api/auth/login ────────────────────────────────────────────────
    // Verifies email+password against Firebase Auth and returns a session
    // token (the app swaps it for a Firebase ID token client-side via the
    // returned custom token — full client SDK lives in the app).
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) return bad(res, 400, 'email and password are required');

            const a = admin();
            const ensure = authMiddleware.ensureAdminForAuth || (async () => false);
            const ready = a.apps && a.apps.length ? true : await ensure();
            if (!ready) {
                // Supabase-only mode: verify against Supabase Auth and return
                // its access token (the middleware accepts Supabase JWTs).
                const sbUrl = process.env.SUPABASE_URL;
                const sbKey = process.env.SUPABASE_ANON_KEY;
                if (!sbUrl || !sbKey) return bad(res, 503, 'Authentication backend not configured');
                const sr = await fetch(sbUrl + '/auth/v1/token?grant_type=password', {
                    method: 'POST',
                    headers: { apikey: sbKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                if (!sr.ok) return bad(res, 401, 'Invalid email or password');
                const sd = await sr.json();
                return res.json({
                    success: true,
                    data: {
                        user: {
                            id: sd.user.id,
                            phone_number: sd.user.phone || '',
                            name: (sd.user.user_metadata && sd.user.user_metadata.full_name) || '',
                            email: sd.user.email || email,
                            image_url: (sd.user.user_metadata && sd.user.user_metadata.avatar_url) || null,
                            is_verified: !!sd.user.email_confirmed_at,
                        },
                        token: sd.access_token,
                        is_new_user: false,
                    },
                });
            }

            // Look up the Firebase user by email, then verify the password via a
            // sign-in using the REST identitytoolkit API (server-side, no client SDK).
            const apiKey =
                process.env.FIREBASE_WEB_API_KEY || 'AIzaSyBBKliW4sQwBFEYMptJ8VuWYHTJ73DbHoE';
            if (!apiKey) return bad(res, 503, 'FIREBASE_WEB_API_KEY not configured');
            const r = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, returnSecureToken: true }),
                }
            );
            const data = await r.json();
            if (!r.ok) {
                const map = {
                    EMAIL_NOT_FOUND: 'No account found with this email',
                    INVALID_PASSWORD: 'Incorrect password',
                    USER_DISABLED: 'This account has been disabled',
                    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts — try again later',
                };
                return bad(
                    res,
                    401,
                    map[data.error && data.error.message] || 'Invalid email or password'
                );
            }

            const uid = data.localId;
            // Resolve profile (role/name) from profiles table
            let profile = null;
            try {
                const rows = await db().where('profiles', 'firebase_uid', '==', uid);
                profile = rows && rows[0];
            } catch (_) {}
            const isNewUser = !profile;

            // Mint a custom token so the app can sign in with the client SDK and
            // receive a full ID-token session (matches AuthResponseDto.token usage).
            const token = await a.auth().createCustomToken(uid, { provider: 'password' });

            return res.json({
                success: true,
                data: {
                    user: {
                        id: uid,
                        phone_number: (profile && profile.phone) || '',
                        name: (profile && (profile.name || profile.display_name)) || '',
                        email: data.email || email,
                        image_url: (profile && profile.avatar_url) || null,
                        is_verified: !!data.emailVerified,
                    },
                    token,
                    is_new_user: isNewUser,
                },
            });
        } catch (e) {
            console.error('mobile auth/login error:', e.message);
            return bad(res, 500, 'Login failed');
        }
    });

    // ─── POST /api/auth/refresh ──────────────────────────────────────────────
    // The app refreshes via Supabase directly (AuthRepositoryImpl); this route
    // supports clients that hit our API instead. Returns fresh Supabase tokens
    // by proxying the refresh grant.
    app.post('/api/auth/refresh', async (req, res) => {
        try {
            const { refresh_token } = req.body || {};
            if (!refresh_token) return bad(res, 400, 'refresh_token is required');
            const supabaseUrl =
                process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
            const anonKey = process.env.SUPABASE_ANON_KEY;
            if (!anonKey) return bad(res, 503, 'Supabase not configured');
            const r = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: { apikey: anonKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token }),
            });
            const data = await r.json();
            if (!r.ok)
                return bad(res, 401, data.error_description || data.msg || 'Invalid refresh token');
            return res.json({
                success: true,
                data: {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_in: data.expires_in || 3600,
                },
            });
        } catch (e) {
            console.error('mobile auth/refresh error:', e.message);
            return bad(res, 500, 'Token refresh failed');
        }
    });

    // ─── GET/PUT /api/users/profile ─────────────────────────────────────────
    // Profile lookup order depends on token provider:
    //   supabase → profiles.id == supabase uid (Supabase-native accounts are
    //   keyed by their auth uid), then firebase_uid, then email
    //   firebase → firebase_uid, then email
    async function findProfile(user) {
        const tries = [];
        if (user.provider === 'supabase') tries.push(() => db().get('profiles', user.uid));
        tries.push(async () => {
            const rows = await db().where('profiles', 'firebase_uid', '==', user.uid);
            return rows && rows[0];
        });
        if (user.email)
            tries.push(async () => {
                const rows = await db().where('profiles', 'email', '==', user.email);
                return rows && rows[0];
            });
        for (const t of tries) {
            try {
                const p = await t();
                if (p) return p;
            } catch (_) {}
        }
        return null;
    }

    app.get('/api/users/profile', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');
            let profile = await findProfile(user);

            // Auto-provision a profile for first-time Supabase-native app users
            // (accounts created in-app have no profiles row yet).
            if (!profile && user.provider === 'supabase') {
                try {
                    await db().add('profiles', {
                        id: user.uid,
                        email: user.email || null,
                        name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
                        firebase_uid: null,
                        role: 'customer',
                        created_at: now(),
                        updated_at: now(),
                    });
                    profile = await db().get('profiles', user.uid);
                } catch (e) {
                    console.error('profile auto-provision failed:', e.message);
                }
            }
            if (!profile) return bad(res, 404, 'Profile not found');
            return res.json({
                success: true,
                data: {
                    id: profile.id,
                    phone_number: profile.phone || '',
                    name: profile.name || profile.display_name || '',
                    email: profile.email || user.email || '',
                    image_url: profile.avatar_url || null,
                    // role drives client-side routing (RoleAwareAuthWrapper) — without
                    // it every caller falls back to 'customer'.
                    role: profile.role || 'customer',
                    is_verified: true,
                },
            });
        } catch (e) {
            console.error('users/profile GET error:', e.message);
            return bad(res, 500, 'Failed to load profile');
        }
    });

    app.put('/api/users/profile', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');
            const b = req.body || {};

            let profile = await findProfile(user);
            if (!profile) return bad(res, 404, 'Profile not found');

            const patch = { updated_at: now() };
            if (b.name != null) patch.name = String(b.name);
            if (b.email != null) patch.email = String(b.email);
            if (b.imageUrl != null) patch.avatar_url = String(b.imageUrl);
            await db().update('profiles', profile.id, patch);

            return res.json({
                success: true,
                data: {
                    id: profile.id,
                    phone_number: profile.phone || '',
                    name: patch.name ?? (profile.name || profile.display_name || ''),
                    email: patch.email ?? (profile.email || ''),
                    image_url: patch.avatar_url ?? (profile.avatar_url || null),
                    role: profile.role || 'customer',
                    is_verified: true,
                },
            });
        } catch (e) {
            console.error('users/profile PUT error:', e.message);
            return bad(res, 500, 'Failed to update profile');
        }
    });

    // ─── Mobile-native product/catalogue shapes ─────────────────────────────
    // The native app's ProductDto requires: images: [..], category: {object},
    // seller: {object}, created_at/updated_at as epoch millis — and getProducts
    // wraps them in ApiResponse<PaginatedResponse<ProductDto>>.
    // NOTE: registered AFTER the flat web routes would conflict, so these use
    // content negotiation on the request: the app sends page/per_page params
    // and parses only the ApiResponse/PaginatedResponse shape. We key off the
    // presence of the app's paging params (per_page) to emit the app shape.
    // Web callers (home/discovery pages) never send per_page → get old shape.

    function asAppProduct(p, sellers) {
        const sellerId = p.sellerId ?? p.seller_id ?? '';
        const seller = sellers.find(s => s.id === sellerId);
        const img = p.imageUrl ?? p.image_url ?? p.image ?? '';
        const images = Array.isArray(img) ? img : img ? [img] : [];
        const catName = p.category || 'other';
        return {
            id: p.id,
            name: p.name || p.title || 'Product',
            description: p.description || '',
            price: Number(p.price ?? p.selling_price ?? 0),
            currency: 'TSh',
            images,
            category: {
                id: String(catName).toLowerCase().replace(/\s+/g, '-'),
                name: catName,
                image_url: images[0] || '',
                description: '',
            },
            seller: {
                id: sellerId,
                name: (seller && (seller.name || seller.businessName)) || 'SmartSoko Seller',
                rating: Number((seller && seller.rating) ?? p.rating) || 0,
                delivery_time:
                    seller && seller.deliveryTime != null ? seller.deliveryTime + ' min' : '30 min',
                image_url: (seller && (seller.logoUrl ?? seller.logo_url)) || '',
            },
            stock: Number(p.stockQuantity ?? p.stock ?? 0),
            rating: Number(p.rating) || 0,
            review_count: Number(p.reviewCount ?? p.review_count) || 0,
            is_featured: Boolean(p.isFeatured ?? p.is_featured ?? Number(p.rating) >= 4),
            created_at: epochMs(p.createdAt ?? p.created_at),
            updated_at: epochMs(p.updatedAt ?? p.updated_at ?? p.createdAt ?? p.created_at),
        };
    }

    function epochMs(v) {
        if (v == null) return 0;
        if (typeof v === 'number') return v;
        if (v.seconds != null) return v.seconds * 1000;
        const t = Date.parse(String(v));
        return isNaN(t) ? 0 : t;
    }

    // GET /api/products — dual shape: app sends per_page → PaginatedResponse
    app.get('/api/products', async (req, res, next) => {
        // Only intercept when the native app's paging signature is present.
        if (req.query.per_page == null) return next(); // web shape → flat route

        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const perPage = Math.min(Math.max(parseInt(req.query.per_page, 10) || 20, 1), 100);
            const categoryId = req.query.category_id || null;
            const search = (req.query.search || '').toLowerCase();

            let products = [];
            let sellers = [];
            try {
                products = (await db().getAll('products')) || [];
            } catch (_) {}
            try {
                sellers = (await db().getAll('sellers')) || [];
            } catch (_) {}

            if (categoryId)
                products = products.filter(
                    p =>
                        String(p.category || '')
                            .toLowerCase()
                            .replace(/\s+/g, '-') === categoryId
                );
            if (search)
                products = products.filter(
                    p =>
                        (p.name || '').toLowerCase().includes(search) ||
                        (p.description || '').toLowerCase().includes(search)
                );

            const total = products.length;
            const start = (page - 1) * perPage;
            const items = products.slice(start, start + perPage).map(p => asAppProduct(p, sellers));

            return res.json({
                success: true,
                data: {
                    data: items,
                    pagination: { current_page: page, per_page: perPage, total },
                },
            });
        } catch (e) {
            console.error('mobile products error:', e.message);
            return bad(res, 500, 'Failed to load products');
        }
    });

    // GET /api/products/:id — app shape (single)
    app.get('/api/products/:productId', async (req, res, next) => {
        // 'featured' is a dedicated route registered after this one — don't
        // swallow it as an :productId.
        if (req.params.productId === 'featured') return next();

        try {
            let product = null,
                sellers = [];
            try {
                product = await db().get('products', req.params.productId);
            } catch (_) {}
            if (!product) return bad(res, 404, 'Product not found');
            try {
                sellers = (await db().getAll('sellers')) || [];
            } catch (_) {}
            return res.json({ success: true, data: asAppProduct(product, sellers) });
        } catch (e) {
            console.error('mobile product detail error:', e.message);
            return bad(res, 500, 'Failed to load product');
        }
    });

    // GET /api/categories — app shape: CategoryDto {id, name, image_url, description}
    // The web also calls /api/categories (flat {data: [{name, count}]} shape via
    // products.js). The app sends no distinctive param, so negotiate: the app
    // follows redirects without Referer and uses okhttp UA.
    app.get('/api/categories', async (req, res, next) => {
        const ua = String(req.headers['user-agent'] || '');
        if (!/okhttp/i.test(ua)) return next(); // web → products.js flat shape

        try {
            let products = [],
                sellers = [];
            try {
                products = (await db().getAll('products')) || [];
            } catch (_) {}
            try {
                sellers = (await db().getAll('sellers')) || [];
            } catch (_) {}
            const byCat = {};
            products.forEach(p => {
                const cat = p.category || 'other';
                const id = String(cat).toLowerCase().replace(/\s+/g, '-');
                if (!byCat[id]) {
                    const firstImg = p.imageUrl ?? p.image_url ?? p.image ?? '';
                    byCat[id] = {
                        id,
                        name: cat,
                        image_url: (Array.isArray(firstImg) ? firstImg[0] : firstImg) || '',
                        description: '',
                        product_count: 0,
                    };
                }
                byCat[id].product_count += 1;
            });
            const categories = Object.values(byCat).sort(
                (a, b) => b.product_count - a.product_count
            );
            return res.json({ success: true, data: categories });
        } catch (e) {
            console.error('mobile categories error:', e.message);
            return bad(res, 500, 'Failed to load categories');
        }
    });

    // GET /api/products/featured — already exists below; upgrade to app shape.
    // (defined later in this file — the existing implementation already returns
    //  the app-compatible shape.)

    app.get('/api/products/featured', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
            let products = [],
                sellers = [];
            try {
                products = (await db().getAll('products')) || [];
            } catch (_) {}
            try {
                sellers = (await db().getAll('sellers')) || [];
            } catch (_) {}
            const featured = products
                .filter(p => p.isAvailable !== false)
                .sort(
                    (a, b) =>
                        (Number(b.rating) || 0) - (Number(a.rating) || 0) ||
                        (Number(b.saleCount ?? b.sale_count) || 0) -
                            (Number(a.saleCount ?? a.sale_count) || 0)
                )
                .slice(0, limit);
            // Native-app ProductDto shape (images[], category{}, seller{}, epoch ms)
            const data = featured.map(p => {
                const sellerId = p.sellerId ?? p.seller_id ?? '';
                const seller = sellers.find(s => s.id === sellerId);
                const img = p.imageUrl ?? p.image_url ?? p.image ?? '';
                const images = Array.isArray(img) ? img : img ? [img] : [];
                const catName = p.category || 'other';
                const createdMs = epochMsLocal(p.createdAt ?? p.created_at);
                return {
                    id: p.id,
                    name: p.name || p.title || 'Product',
                    description: p.description || '',
                    price: Number(p.price ?? p.selling_price ?? 0),
                    currency: 'TSh',
                    images,
                    category: {
                        id: String(catName).toLowerCase().replace(/\s+/g, '-'),
                        name: catName,
                        image_url: images[0] || '',
                        description: '',
                    },
                    seller: {
                        id: sellerId,
                        name: (seller && (seller.name || seller.storeName)) || 'SmartSoko Seller',
                        rating: Number((seller && seller.rating) ?? p.rating) || 0,
                        delivery_time:
                            seller && seller.deliveryTime != null
                                ? seller.deliveryTime + ' min'
                                : '30 min',
                        image_url: (seller && (seller.logoUrl ?? seller.logo_url)) || '',
                    },
                    stock: Number(p.stockQuantity ?? p.stock ?? 0),
                    rating: Number(p.rating) || 0,
                    review_count: Number(p.reviewCount ?? p.review_count) || 0,
                    is_featured: true,
                    created_at: createdMs,
                    updated_at: epochMsLocal(p.updatedAt ?? p.updated_at) || createdMs,
                };
            });
        } catch (e) {
            console.error('products/featured error:', e.message);
            return bad(res, 500, 'Failed to load featured products');
        }
    });

    // ─── GET /api/orders (mobile) — paginated order list for native app ──────
    // Returns shape matching app's PaginatedResponse<OrderDto>
    app.get('/api/orders', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 20));
            const statusFilter = req.query.status;

            const allOrders = await db()
                .where('orders', 'customerId', '==', user.uid)
                .catch(() => []);
            let filtered = allOrders;
            if (statusFilter) {
                filtered = filtered.filter(
                    o => (o.status || o.status?.toLowerCase()) === statusFilter.toLowerCase()
                );
            }
            filtered.sort((a, b) => {
                const at = a.createdAt || a.created_at || 0;
                const bt = b.createdAt || b.created_at || 0;
                return bt - at;
            });

            const total = filtered.length;
            const totalPages = Math.ceil(total / perPage) || 1;
            const start = (page - 1) * perPage;
            const paged = filtered.slice(start, start + perPage);

            const mapped = paged.map(o => {
                const items = (o.items || []).map((it, idx) => ({
                    product_id: it.product_id || it.id || `item-${idx}`,
                    product_name: it.product_name || it.name || 'Item',
                    product_image: it.product_image || it.imageUrl || '',
                    quantity: Number(it.quantity) || 1,
                    price: Number(it.price) || 0,
                    seller_id: it.seller_id || it.sellerId || '',
                    seller_name: it.seller_name || it.sellerName || 'Merchant',
                }));
                const addr = o.delivery_address || o.deliveryAddress || {};
                const payment = o.payment_method || o.paymentMethod || {};
                return {
                    id: o.id,
                    user_id: user.uid,
                    items,
                    status: o.status || 'pending',
                    delivery_address: {
                        id: addr.id || '',
                        user_id: user.uid,
                        title: addr.title || 'Home',
                        full_name: addr.full_name || addr.fullName || '',
                        phone_number: addr.phone_number || addr.phoneNumber || '',
                        street_address: addr.street_address || addr.streetAddress || '',
                        apartment: addr.apartment || null,
                        city: addr.city || '',
                        postal_code: addr.postal_code || addr.postalCode || null,
                        location: {
                            latitude: Number(addr.latitude) || 0,
                            longitude: Number(addr.longitude) || 0,
                            address: addr.street_address || addr.streetAddress || '',
                        },
                        is_default: !!addr.is_default,
                        delivery_instructions: addr.delivery_instructions || null,
                    },
                    payment_method: {
                        id: payment.id || o.payment_method || 'cod',
                        type:
                            payment.type ||
                            (o.payment_method === 'cod' ? 'CASH_ON_DELIVERY' : 'PESAPAL'),
                        display_name:
                            payment.display_name ||
                            (o.payment_method === 'cod'
                                ? 'Cash on Delivery'
                                : 'Pay Online (PesaPal)'),
                        is_default: !!payment.is_default,
                        last_four_digits:
                            payment.last_four_digits || payment.lastFourDigits || null,
                        provider:
                            payment.provider || (o.payment_method === 'cod' ? null : 'pesapal'),
                    },
                    subtotal: Number(o.subtotal) || 0,
                    delivery_fee: Number(o.delivery_fee) || Number(o.deliveryFee) || 0,
                    total: Number(o.total) || Number(o.totalAmount) || 0,
                    currency: o.currency || 'TZS',
                    created_at: o.createdAt || o.created_at || Date.now(),
                    updated_at: o.updatedAt || o.updated_at || Date.now(),
                    estimated_delivery_time:
                        o.estimated_delivery_time || o.estimatedDeliveryTime || null,
                    driver: o.driver
                        ? {
                              id: o.driver.id || o.driverId,
                              name: o.driver.name || o.driverName || 'Driver',
                              phone_number: o.driver.phone_number || o.driverPhoneNumber || '',
                              vehicle_number:
                                  o.driver.vehicle_number || o.driverVehicleNumber || '',
                              vehicle_type:
                                  o.driver.vehicle_type || o.driverVehicleType || 'MOTORCYCLE',
                              rating: Number(o.driver.rating) || 0,
                              image_url: o.driver.image_url || o.driverImageUrl || null,
                              current_location: o.driver.current_location
                                  ? {
                                        latitude: Number(o.driver.current_location.latitude) || 0,
                                        longitude: Number(o.driver.current_location.longitude) || 0,
                                        address: o.driver.current_location.address || '',
                                    }
                                  : null,
                          }
                        : null,
                    tracking: o.tracking
                        ? {
                              driver_location: {
                                  latitude: Number(o.tracking.driver_location?.latitude) || 0,
                                  longitude: Number(o.tracking.driver_location?.longitude) || 0,
                              },
                              destination: {
                                  latitude: Number(o.tracking.destination?.latitude) || 0,
                                  longitude: Number(o.tracking.destination?.longitude) || 0,
                              },
                              route: (o.tracking.route || []).map(r => ({
                                  latitude: Number(r.latitude) || 0,
                                  longitude: Number(r.longitude) || 0,
                              })),
                              eta: Number(o.tracking.eta) || 0,
                              distance_remaining:
                                  Number(o.tracking.distance_remaining) ||
                                  Number(o.tracking.distanceRemaining) ||
                                  0,
                              last_updated:
                                  o.tracking.last_updated || o.tracking.lastUpdated || Date.now(),
                          }
                        : null,
                };
            });

            return res.json({
                success: true,
                data: {
                    data: mapped,
                    pagination: {
                        current_page: page,
                        per_page: perPage,
                        total,
                        total_pages: totalPages,
                    },
                },
            });
        } catch (e) {
            console.error('orders list error:', e.message);
            return bad(res, 500, 'Failed to load orders');
        }
    });

    // ─── GET /api/orders/:id/tracking ────────────────────────────────────────
    app.get('/api/orders/:orderId/tracking', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');
            let order = null;
            try {
                order = await db().get('orders', req.params.orderId);
            } catch (_) {}
            if (!order) return bad(res, 404, 'Order not found');
            if (
                order.customerId &&
                order.customerId !== user.uid &&
                order.customer_id !== user.uid
            ) {
                return bad(res, 403, 'Not your order');
            }

            const events = [];
            const push = (ts, status, note) => {
                if (ts) events.push({ timestamp: safeIso(ts), status, note });
            };
            push(order.createdAt || order.created_at, 'pending', 'Order placed');
            push(order.confirmedAt || order.confirmed_at, 'confirmed', 'Order confirmed');
            push(
                order.preparationStartedAt || order.preparation_started_at,
                'preparing',
                'Being prepared'
            );
            push(order.dispatchedAt || order.pickupAt, 'dispatched', 'Picked up by driver');
            push(order.completedAt || order.completed_at, 'delivered', 'Delivered');
            events.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

            return res.json({
                success: true,
                data: {
                    order_id: order.id,
                    status: order.status || 'pending',
                    events,
                    driver: order.driverId
                        ? { id: order.driverId, name: order.driverName || 'Driver' }
                        : null,
                    estimated_delivery_time:
                        order.estimatedDeliveryTime ?? order.estimated_delivery_time ?? null,
                },
            });
        } catch (e) {
            console.error('orders/tracking error:', e.message);
            return bad(res, 500, 'Failed to load tracking');
        }
    });

    // ─── POST /api/orders/:id/cancel ────────────────────────────────────────
    app.post('/api/orders/:orderId/cancel', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');
            let order = null;
            try {
                order = await db().get('orders', req.params.orderId);
            } catch (_) {}
            if (!order) return bad(res, 404, 'Order not found');
            const customerId = await require('../services/checkout').customerIdFor(db(), user);
            if ((order.customerId || order.customer_id) !== customerId) {
                return bad(res, 403, 'Not your order');
            }
            const CANCELLABLE = ['pending', 'accepted', 'confirmed', 'preparing'];
            if (!CANCELLABLE.includes(order.status || 'pending')) {
                return bad(res, 409, `Order can no longer be cancelled (status: ${order.status})`);
            }
            await db().update('orders', order.id, {
                status: 'cancelled',
                cancelledAt: now(),
                updatedAt: now(),
            });
            return res.json({ success: true, data: { order_id: order.id, status: 'cancelled' } });
        } catch (e) {
            console.error('orders/cancel error:', e.message);
            return bad(res, 500, 'Failed to cancel order');
        }
    });

    // ─── GET /api/orders/:orderId (mobile) — single order detail ─────────────
    app.get('/api/orders/:orderId', async (req, res) => {
        try {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');

            let order = null;
            try {
                order = await db().get('orders', req.params.orderId);
            } catch (_) {}
            if (!order) return bad(res, 404, 'Order not found');
            if (order.customerId !== user.uid && order.customer_id !== user.uid) {
                return bad(res, 403, 'Not your order');
            }

            const items = (order.items || []).map((it, idx) => ({
                product_id: it.product_id || it.id || `item-${idx}`,
                product_name: it.product_name || it.name || 'Item',
                product_image: it.product_image || it.imageUrl || '',
                quantity: Number(it.quantity) || 1,
                price: Number(it.price) || 0,
                seller_id: it.seller_id || it.sellerId || '',
                seller_name: it.seller_name || it.sellerName || 'Merchant',
            }));
            const addr = order.delivery_address || order.deliveryAddress || {};
            const payment = order.payment_method || order.paymentMethod || {};

            return res.json({
                success: true,
                data: {
                    id: order.id,
                    user_id: user.uid,
                    items,
                    status: order.status || 'pending',
                    delivery_address: {
                        id: addr.id || '',
                        user_id: user.uid,
                        title: addr.title || 'Home',
                        full_name: addr.full_name || addr.fullName || '',
                        phone_number: addr.phone_number || addr.phoneNumber || '',
                        street_address: addr.street_address || addr.streetAddress || '',
                        apartment: addr.apartment || null,
                        city: addr.city || '',
                        postal_code: addr.postal_code || addr.postalCode || null,
                        location: {
                            latitude: Number(addr.latitude) || 0,
                            longitude: Number(addr.longitude) || 0,
                            address: addr.street_address || addr.streetAddress || '',
                        },
                        is_default: !!addr.is_default,
                        delivery_instructions: addr.delivery_instructions || null,
                    },
                    payment_method: {
                        id: payment.id || order.payment_method || 'cod',
                        type:
                            payment.type ||
                            (order.payment_method === 'cod' ? 'CASH_ON_DELIVERY' : 'PESAPAL'),
                        display_name:
                            payment.display_name ||
                            (order.payment_method === 'cod'
                                ? 'Cash on Delivery'
                                : 'Pay Online (PesaPal)'),
                        is_default: !!payment.is_default,
                        last_four_digits:
                            payment.last_four_digits || payment.lastFourDigits || null,
                        provider:
                            payment.provider || (order.payment_method === 'cod' ? null : 'pesapal'),
                    },
                    subtotal: Number(order.subtotal) || 0,
                    delivery_fee: Number(order.delivery_fee) || Number(order.deliveryFee) || 0,
                    total: Number(order.total) || Number(order.totalAmount) || 0,
                    currency: order.currency || 'TZS',
                    created_at: order.createdAt || order.created_at || Date.now(),
                    updated_at: order.updatedAt || order.updated_at || Date.now(),
                    estimated_delivery_time:
                        order.estimated_delivery_time || order.estimatedDeliveryTime || null,
                    driver: order.driver
                        ? {
                              id: order.driver.id || order.driverId,
                              name: order.driver.name || order.driverName || 'Driver',
                              phone_number:
                                  order.driver.phone_number || order.driverPhoneNumber || '',
                              vehicle_number:
                                  order.driver.vehicle_number || order.driverVehicleNumber || '',
                              vehicle_type:
                                  order.driver.vehicle_type ||
                                  order.driverVehicleType ||
                                  'MOTORCYCLE',
                              rating: Number(order.driver.rating) || 0,
                              image_url: order.driver.image_url || order.driverImageUrl || null,
                              current_location: order.driver.current_location
                                  ? {
                                        latitude:
                                            Number(order.driver.current_location.latitude) || 0,
                                        longitude:
                                            Number(order.driver.current_location.longitude) || 0,
                                        address: order.driver.current_location.address || '',
                                    }
                                  : null,
                          }
                        : null,
                    tracking: order.tracking
                        ? {
                              driver_location: {
                                  latitude: Number(order.tracking.driver_location?.latitude) || 0,
                                  longitude: Number(order.tracking.driver_location?.longitude) || 0,
                              },
                              destination: {
                                  latitude: Number(order.tracking.destination?.latitude) || 0,
                                  longitude: Number(order.tracking.destination?.longitude) || 0,
                              },
                              route: (order.tracking.route || []).map(r => ({
                                  latitude: Number(r.latitude) || 0,
                                  longitude: Number(r.longitude) || 0,
                              })),
                              eta: Number(order.tracking.eta) || 0,
                              distance_remaining:
                                  Number(order.tracking.distance_remaining) ||
                                  Number(order.tracking.distanceRemaining) ||
                                  0,
                              last_updated:
                                  order.tracking.last_updated ||
                                  order.tracking.lastUpdated ||
                                  Date.now(),
                          }
                        : null,
                },
            });
        } catch (e) {
            console.error('order detail error:', e.message);
            return bad(res, 500, 'Failed to load order');
        }
    });

    // ─── POST /api/orders/mobile — native app checkout ───────────────────────
    // Accepts the app's CreateOrderRequestDto { addressId, paymentMethodId, notes }
    // and mirrors the WEB checkout flow:
    //   paymentMethodId 'cod'     → order saved with payment_status 'cod'
    //   paymentMethodId 'pesapal' → order saved + PesaPal hosted-checkout URL
    //                               returned in paymentUrl (app opens the browser)
    // The cart + address are resolved server-side from the caller's identity.
    app.post(
        '/api/orders/mobile',
        async (req, res, next) => {
            const user = await resolveUser(req);
            if (!user) return bad(res, 401, 'Authentication required');
            req.user = user;
            req.checkoutCart = await db()
                .get('carts', user.uid)
                .catch(() => null);
            req.idempotencyScope = JSON.stringify(req.checkoutCart || {});
            next();
        },
        require('../middleware/idempotency').idempotency(),
        async (req, res) => {
            req.idempotencySafeToRetry = true;
            try {
                const user = req.user;
                if (!user) return bad(res, 401, 'Authentication required');
                const b = req.body || {};

                // 1. Address (must belong to the caller)
                if (!b.addressId) return bad(res, 400, 'addressId is required');
                const address = await db()
                    .get('addresses', b.addressId)
                    .catch(() => null);
                if (!address || (address.userId !== user.uid && address.user_id !== user.uid)) {
                    return bad(res, 404, 'Delivery address not found');
                }

                // 2. Cart
                const cart = req.checkoutCart;
                let items = (cart && cart.items) || [];
                if (!items.length) return bad(res, 400, 'Your cart is empty');

                // 3. Order math — identical to web checkout (orders.js createOrder)
                const config = app.get('config') || {
                    deliveryFee: 2000,
                    taxRate: 0.18,
                    currency: 'TZS',
                };
                const { quoteOrder, customerIdFor } = require('../services/checkout');
                const quote = await quoteOrder(
                    db(),
                    {
                        items: items.map(it => ({ ...it, id: it.product_id || it.id })),
                        promoCode: b.promoCode,
                    },
                    config
                );
                items = quote.items;
                const { subtotal, deliveryFee, taxAmount, total: totalAmount } = quote;

                const isCod =
                    !b.paymentMethodId ||
                    b.paymentMethodId === 'cod' ||
                    b.paymentMethodId === 'CASH_ON_DELIVERY';
                const paymentMethod = isCod ? 'cod' : 'pesapal';

                // 4. Profile for contact details
                let profile = await findProfile(user);
                const customerName =
                    address.fullName ||
                    (profile && (profile.name || profile.display_name)) ||
                    user.name ||
                    user.email ||
                    'Customer';
                const customerPhone = address.phoneNumber || (profile && profile.phone) || '';

                const uuidRegex =
                    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
                const sellerId = quote.sellerId;
                const customerId = await customerIdFor(db(), user);

                const orderData = {
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    delivery_address: address.streetAddress || address.address,
                    delivery_latitude: Number(address.latitude) || null,
                    delivery_longitude: Number(address.longitude) || null,
                    items: items.map(it => ({
                        id: it.product_id || it.id,
                        name: it.product_name || it.name || 'Item',
                        price: Number(it.price) || 0,
                        quantity: Number(it.quantity) || 1,
                        notes: null,
                        variation: it.variation,
                        variationDelta: it.variationDelta,
                    })),
                    subtotal,
                    delivery_fee: deliveryFee,
                    tax: taxAmount,
                    discount_amount: quote.discount,
                    total: totalAmount,
                    payment_method: paymentMethod,
                    payment_status: isCod ? 'cod' : 'pending_confirmation',
                    status: 'pending',
                    special_instructions: b.notes || null,
                    promo_code: quote.promoCode,
                };
                if (sellerId && uuidRegex.test(sellerId)) orderData.restaurant_id = sellerId;
                orderData.customer_id = customerId;

                req.idempotencySafeToRetry = false;
                const orderRef = await db().add('orders', orderData);
                const orderId = orderRef.id;

                // 5. PesaPal hosted checkout (mirrors web /api/payments/pesapal/initiate)
                let paymentUrl = null;
                if (!isCod) {
                    try {
                        const pesapalModule = app.get('pesapalModule');
                        const submitOrder = pesapalModule && pesapalModule.submitOrder;
                        if (submitOrder) {
                            const baseUrl =
                                process.env.PESAPAL_CALLBACK_BASE || `http://${req.get('host')}`;
                            const result = await submitOrder({
                                amount: totalAmount,
                                currency: 'TZS',
                                description: `SmartSoko Order #${orderId}`,
                                customerEmail: user.email || customerEmailFallback(profile),
                                customerPhone,
                                customerFirstName: String(customerName).split(' ')[0] || 'Customer',
                                customerLastName:
                                    String(customerName).split(' ').slice(1).join(' ') || '',
                                callbackUrl: `${baseUrl}/api/payments/pesapal/callback?orderId=${encodeURIComponent(orderId)}`,
                            });
                            paymentUrl = result.redirect_url || null;
                        }
                    } catch (e) {
                        console.error('mobile PesaPal initiate failed:', e.message);
                        // Order is created; the app will tell the user to pay from wallet/orders
                    }
                }

                // 6. Clear the cart (web flow clears after successful payment initiation)
                await db()
                    .set('carts', user.uid, { userId: user.uid, items: [], updated_at: now() })
                    .catch(() => {});

                // 7. Respond in the app's OrderDto shape (matches OrderDto.kt fields)
                return res.status(201).json({
                    success: true,
                    data: {
                        id: orderId,
                        user_id: user.uid,
                        status: 'pending',
                        subtotal,
                        delivery_fee: deliveryFee,
                        total: totalAmount,
                        currency: 'TZS',
                        created_at: Date.now(),
                        updated_at: Date.now(),
                        estimated_delivery_time: null,
                        driver: null,
                        tracking: null,
                        items: items.map(it => ({
                            product_id: it.product_id || it.id,
                            product_name: it.product_name || it.name || 'Item',
                            product_image: it.product_image || it.imageUrl || '',
                            quantity: Number(it.quantity) || 1,
                            price: (Number(it.price) || 0) + (Number(it.variationDelta) || 0),
                            seller_id: quote.sellerId,
                            seller_name: it.seller_name || it.sellerName || 'Merchant',
                        })),
                        delivery_address: {
                            id: b.addressId,
                            user_id: user.uid,
                            title: address.title || 'Home',
                            full_name: address.fullName || customerName,
                            phone_number: customerPhone,
                            street_address: address.streetAddress || address.address || '',
                            apartment: address.apartment || null,
                            city: address.city || '',
                            postal_code: address.postalCode || null,
                            location: {
                                latitude: Number(address.latitude) || 0,
                                longitude: Number(address.longitude) || 0,
                                address: address.streetAddress || address.address || '',
                            },
                            is_default: !!address.isDefault,
                            delivery_instructions: address.deliveryInstructions || null,
                        },
                        payment_method: {
                            id: paymentMethod,
                            type: isCod ? 'CASH_ON_DELIVERY' : 'PESAPAL',
                            display_name: isCod ? 'Cash on Delivery' : 'Pay Online (PesaPal)',
                            is_default: true,
                            last_four_digits: null,
                            provider: isCod ? null : 'pesapal',
                        },
                    },
                    paymentUrl,
                    message: isCod
                        ? 'Order placed — pay on delivery'
                        : 'Order placed — complete payment online',
                });
            } catch (e) {
                console.error('orders/mobile error:', e.message);
                if (e.code === 'P0001') {
                    req.idempotencySafeToRetry = true;
                    return bad(res, 409, e.message);
                }
                return bad(res, e.status || 500, e.status ? e.message : 'Failed to place order');
            }
        }
    );

    function customerEmailFallback(profile) {
        return (profile && profile.email) || '';
    }

    // ─── DRIVER APP ROUTES (native-driver-app ApiService.kt) ────────────────
    // Token: Authorization: Bearer <token> where token is the Firebase ID token
    // of a driver whose uid resolves to a driver profile (firebase_uid link).

    async function resolveDriver(req) {
        const user = await resolveUser(req);
        if (!user) return null;
        try {
            const rows = await db().where('drivers', 'firebase_uid', '==', user.uid);
            if (rows && rows.length) return { user, driver: rows[0] };
        } catch (_) {}
        // fallback: profiles.role === driver, driver row keyed by uid
        try {
            const driver = await db().get('drivers', user.uid);
            if (driver) return { user, driver };
        } catch (_) {}
        return { user, driver: null };
    }

    const asDriverOrder = o => ({
        id: o.id,
        pickup_name: o.sellerName || 'Merchant',
        pickup_address: o.pickupAddress || o.pickup_address || '',
        pickup_lat: Number(o.pickupLat ?? o.pickup_lat ?? 0) || 0,
        pickup_lng: Number(o.pickupLng ?? o.pickup_lng ?? 0) || 0,
        dropoff_name: o.customerName || 'Customer',
        dropoff_address: o.deliveryAddress ?? o.delivery_address ?? '',
        dropoff_lat: Number(o.deliveryLat ?? o.delivery_latitude ?? 0) || 0,
        dropoff_lng: Number(o.deliveryLng ?? o.delivery_longitude ?? 0) || 0,
        customer_name: o.customerName ?? o.customer_name ?? null,
        customer_phone: o.contactPhone ?? o.customer_phone ?? null,
        items: (o.items || []).map(it => ({
            name: it.name || 'Item',
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            notes: it.notes || null,
        })),
        total_amount: Number(o.total) || 0,
        delivery_fee: Number(o.deliveryFee ?? o.delivery_fee) || 0,
        status: o.status || 'pending',
        estimated_distance: Number(o.estimatedDistance) || 0,
        estimated_duration: o.estimatedDeliveryTime ?? o.estimated_delivery_time ?? '30 min',
        created_at: Date.parse(o.createdAt || o.created_at || '') || Date.now(),
        updated_at:
            Date.parse(o.updatedAt || o.updated_at || o.createdAt || o.created_at || '') ||
            Date.now(),
        delivery_instructions: o.specialInstructions ?? o.special_instructions ?? null,
    });

    // GET /api/driver/profile — current driver profile
    app.get('/api/driver/profile', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            if (!r.driver) return bad(res, 404, 'Driver profile not found');
            const d = r.driver;
            return res.json({
                success: true,
                data: {
                    token: '', // client keeps its session token
                    driver_id: d.id,
                    full_name: d.name || d.fullName || '',
                    phone: d.phone || '',
                    email: d.email || null,
                    is_new: false,
                    vehicle_type: d.vehicle ?? d.vehicle_type ?? null,
                    vehicle_plate: d.plate ?? d.vehicle_plate ?? null,
                },
            });
        } catch (e) {
            console.error('driver/profile error:', e.message);
            return bad(res, 500, 'Failed to load driver profile');
        }
    });

    // POST /api/driver/location — location ping (stored in driver_location_pings)
    app.post('/api/driver/location', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const b = req.body || {};
            const driverId = r.driver ? r.driver.id : r.user.uid;
            await db()
                .add('driver_location_pings', {
                    driverId,
                    lat: Number(b.lat) || 0,
                    lng: Number(b.lng) || 0,
                    heading: Number(b.heading) || 0,
                    speed: Number(b.speed) || 0,
                    accuracy: Number(b.accuracy) || 0,
                    ts: now(),
                })
                .catch(() => {});
            // Update the driver's live position too
            if (r.driver) {
                await db()
                    .update('drivers', r.driver.id, {
                        currentLocation: JSON.stringify({
                            lat: Number(b.lat) || 0,
                            lng: Number(b.lng) || 0,
                        }),
                        lastLocationUpdate: now(),
                    })
                    .catch(() => {});
            }
            return res.json({ success: true, data: { ok: true } });
        } catch (e) {
            console.error('driver/location error:', e.message);
            return bad(res, 500, 'Failed to record location');
        }
    });

    // GET /api/orders/available — orders ready for delivery (unassigned)
    app.get('/api/orders/available', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orders = ((await db().getAll('orders')) || []).filter(
                o =>
                    ['ready_for_delivery', 'preparing', 'confirmed'].includes(
                        o.status || 'pending'
                    ) && !o.driverId
            );
            return res.json({ success: true, data: orders.map(asDriverOrder) });
        } catch (e) {
            console.error('orders/available error:', e.message);
            return bad(res, 500, 'Failed to load available orders');
        }
    });

    // POST /api/orders/accept — {order_id}
    app.post('/api/orders/accept', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = (req.body || {}).order_id;
            if (!orderId) return bad(res, 400, 'order_id is required');
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            if (order.driverId) return bad(res, 409, 'Order already assigned');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            await db().update('orders', orderId, {
                driverId,
                status: 'accepted',
                driverName: r.driver ? r.driver.name || '' : '',
                acceptedAt: now(),
                updatedAt: now(),
            });
            const updated = await db().get('orders', orderId);
            return res.json({ success: true, data: asDriverOrder(updated || order) });
        } catch (e) {
            console.error('orders/accept error:', e.message);
            return bad(res, 500, 'Failed to accept order');
        }
    });

    // POST /api/orders/reject — {order_id}
    app.post('/api/orders/reject', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = (req.body || {}).order_id;
            if (!orderId) return bad(res, 400, 'order_id is required');
            // Rejecting an unassigned order just notes it; assigned orders revert
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            if (order.driverId) {
                const driverId = r.driver ? r.driver.id : r.user.uid;
                if (order.driverId !== driverId) return bad(res, 403, 'Not your order');
                await db().update('orders', orderId, {
                    driverId: null,
                    status: 'ready_for_delivery',
                    updatedAt: now(),
                });
            }
            return res.json({ success: true, data: { order_id: orderId, rejected: true } });
        } catch (e) {
            console.error('orders/reject error:', e.message);
            return bad(res, 500, 'Failed to reject order');
        }
    });

    // Delivery is the agreed escrow release trigger: a held payment becomes
    // money owed to the seller. Every delivery write path calls this, and the
    // periodic releaseDeliveredEscrow() sweep catches anything that misses.
    async function releaseEscrowOnDelivery(orderId, status) {
        try {
            const released = await escrow.releaseEscrow(orderId, {
                reason: `driver status ${status}`,
            });
            if (released.released) console.log(`Escrow released for order ${orderId}`);
        } catch (e) {
            console.warn('Escrow release failed for order', orderId, e.message);
        }
    }

    // POST /api/orders/status — {order_id, status, timestamp}
    app.post('/api/orders/status', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const b = req.body || {};
            if (!b.order_id || !b.status) return bad(res, 400, 'order_id and status are required');
            const order = await db().get('orders', b.order_id);
            if (!order) return bad(res, 404, 'Order not found');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            if (order.driverId && order.driverId !== driverId)
                return bad(res, 403, 'Not your order');

            const patch = { status: String(b.status), updatedAt: now() };
            const MILESTONES = {
                picked_up: 'pickedUpAt',
                in_transit: 'preparationStartedAt',
                delivered: 'completedAt',
                completed: 'completedAt',
            };
            if (MILESTONES[b.status]) patch[MILESTONES[b.status]] = now();

            // Completing a delivery credits the driver wallet — unless the
            // payment is held in escrow, in which case the escrow release pays
            // the driver and crediting here too would double the fee.
            if (b.status === 'delivered' || b.status === 'completed') {
                const fee = Number(order.deliveryFee ?? order.delivery_fee) || 0;
                if (!escrow.escrowPaysDriver(order)) {
                    try {
                        const wallet = await db().get('wallets', driverId);
                        await db().set('wallets', driverId, {
                            balance: (Number(wallet && wallet.balance) || 0) + fee,
                            totalEarned: (Number(wallet && wallet.totalEarned) || 0) + fee,
                            totalDeliveries: (Number(wallet && wallet.totalDeliveries) || 0) + 1,
                            updatedAt: now(),
                        });
                    } catch (_) {
                        /* wallet best-effort */
                    }
                }
            }
            await db().update('orders', b.order_id, patch);
            if (b.status === 'delivered' || b.status === 'completed') {
                await releaseEscrowOnDelivery(b.order_id, b.status);
            }
            const updated = await db().get('orders', b.order_id);
            return res.json({ success: true, data: asDriverOrder(updated || order) });
        } catch (e) {
            console.error('orders/status error:', e.message);
            return bad(res, 500, 'Failed to update order status');
        }
    });

    // POST /api/orders/{orderId}/accept — path-based accept (driver app ApiService)
    app.post('/api/orders/:orderId/accept', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = req.params.orderId;
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            if (order.driverId) return bad(res, 409, 'Order already assigned');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            await db().update('orders', orderId, {
                driverId,
                status: 'accepted',
                driverName: r.driver ? r.driver.name || '' : '',
                acceptedAt: now(),
                updatedAt: now(),
            });
            const updated = await db().get('orders', orderId);
            return res.json({ success: true, data: asDriverOrder(updated || order) });
        } catch (e) {
            console.error('orders/accept error:', e.message);
            return bad(res, 500, 'Failed to accept order');
        }
    });

    // POST /api/orders/{orderId}/reject — path-based reject (driver app ApiService)
    app.post('/api/orders/:orderId/reject', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = req.params.orderId;
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            if (order.driverId) {
                const driverId = r.driver ? r.driver.id : r.user.uid;
                if (order.driverId !== driverId) return bad(res, 403, 'Not your order');
                await db().update('orders', orderId, {
                    driverId: null,
                    status: 'ready_for_delivery',
                    updatedAt: now(),
                });
            }
            return res.json({ success: true, data: { order_id: orderId, rejected: true } });
        } catch (e) {
            console.error('orders/reject error:', e.message);
            return bad(res, 500, 'Failed to reject order');
        }
    });

    // POST /api/orders/{orderId}/status — path-based status update (driver app ApiService)
    app.post('/api/orders/:orderId/status', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = req.params.orderId;
            const b = req.body || {};
            if (!b.status) return bad(res, 400, 'status is required');
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            if (order.driverId && order.driverId !== driverId)
                return bad(res, 403, 'Not your order');

            const patch = { status: String(b.status), updatedAt: now() };
            const MILESTONES = {
                picked_up: 'pickedUpAt',
                in_transit: 'preparationStartedAt',
                delivered: 'completedAt',
                completed: 'completedAt',
            };
            if (MILESTONES[b.status]) patch[MILESTONES[b.status]] = now();

            // Completing a delivery credits the driver wallet — unless the
            // payment is held in escrow, in which case the escrow release pays
            // the driver and crediting here too would double the fee.
            if (b.status === 'delivered' || b.status === 'completed') {
                const fee = Number(order.deliveryFee ?? order.delivery_fee) || 0;
                if (!escrow.escrowPaysDriver(order)) {
                    try {
                        const wallet = await db().get('wallets', driverId);
                        await db().set('wallets', driverId, {
                            balance: (Number(wallet && wallet.balance) || 0) + fee,
                            totalEarned: (Number(wallet && wallet.totalEarned) || 0) + fee,
                            totalDeliveries: (Number(wallet && wallet.totalDeliveries) || 0) + 1,
                            updatedAt: now(),
                        });
                    } catch (_) {
                        /* wallet best-effort */
                    }
                }
            }
            await db().update('orders', orderId, patch);
            if (b.status === 'delivered' || b.status === 'completed') {
                await releaseEscrowOnDelivery(orderId, b.status);
            }
            const updated = await db().get('orders', orderId);
            return res.json({ success: true, data: asDriverOrder(updated || order) });
        } catch (e) {
            console.error('orders/status error:', e.message);
            return bad(res, 500, 'Failed to update order status');
        }
    });

    // GET /api/orders/{orderId} — order details (driver app ApiService)
    app.get('/api/orders/:orderId', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const orderId = req.params.orderId;
            const order = await db().get('orders', orderId);
            if (!order) return bad(res, 404, 'Order not found');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            if (
                order.driverId &&
                order.driverId !== driverId &&
                order.status !== 'ready_for_delivery'
            ) {
                return bad(res, 403, 'Not your order');
            }
            return res.json({ success: true, data: asDriverOrder(order) });
        } catch (e) {
            console.error('order detail error:', e.message);
            return bad(res, 500, 'Failed to load order');
        }
    });

    // POST /api/orders/sync — sync local changes (driver app ApiService)
    app.post('/api/orders/sync', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const b = req.body || {};
            const unsyncedOrders = b.unsyncedOrders || [];
            const syncedOrderIds = [];
            const errors = [];

            for (const o of unsyncedOrders) {
                try {
                    const orderId = o.id || o.orderId;
                    if (!orderId) {
                        errors.push({ orderId: 'unknown', error: 'Missing order ID' });
                        continue;
                    }
                    const existing = await db()
                        .get('orders', orderId)
                        .catch(() => null);
                    if (existing) {
                        // Update existing
                        await db().update('orders', orderId, {
                            status: o.status,
                            driverId: o.driverId || null,
                            updatedAt: now(),
                        });
                    } else {
                        // Create new
                        await db().set('orders', orderId, {
                            ...o,
                            id: orderId,
                            createdAt: o.createdAt || now(),
                            updatedAt: now(),
                        });
                    }
                    syncedOrderIds.push(orderId);
                } catch (e) {
                    errors.push({ orderId: o.id || 'unknown', error: e.message });
                }
            }

            return res.json({ success: true, data: { syncedOrders: syncedOrderIds, errors } });
        } catch (e) {
            console.error('orders/sync error:', e.message);
            return bad(res, 500, 'Failed to sync orders');
        }
    });

    // GET /api/orders/history — driver's completed orders
    app.get('/api/orders/history', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
            const orders = ((await db().getAll('orders')) || [])
                .filter(
                    o =>
                        o.driverId === driverId &&
                        ['delivered', 'completed', 'cancelled'].includes(o.status || '')
                )
                .sort((a, b2) =>
                    String(b2.updatedAt || b2.createdAt || '').localeCompare(
                        String(a.updatedAt || a.createdAt || '')
                    )
                );
            const start = (page - 1) * limit;
            return res.json({
                success: true,
                data: orders.slice(start, start + limit).map(asDriverOrder),
            });
        } catch (e) {
            console.error('orders/history error:', e.message);
            return bad(res, 500, 'Failed to load order history');
        }
    });

    // GET /api/driver/earnings — today/weekly + daily breakdown
    app.get('/api/driver/earnings', async (req, res) => {
        try {
            const r = await resolveDriver(req);
            if (!r) return bad(res, 401, 'Authentication required');
            const driverId = r.driver ? r.driver.id : r.user.uid;
            const orders = ((await db().getAll('orders')) || []).filter(
                o => o.driverId === driverId
            );
            const completed = orders.filter(o =>
                ['delivered', 'completed'].includes(o.status || '')
            );
            const feeOf = o => Number(o.deliveryFee ?? o.delivery_fee) || 0;

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const todayOrders = completed.filter(
                o => new Date(o.completedAt || o.updatedAt || 0) >= startOfDay
            );
            const weekAgo = new Date(Date.now() - 7 * 86400000);
            const weekOrders = completed.filter(
                o => new Date(o.completedAt || o.updatedAt || 0) >= weekAgo
            );

            const breakdown = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
                breakdown[d] = { date: d, amount: 0, deliveries: 0 };
            }
            weekOrders.forEach(o => {
                const key = new Date(o.completedAt || o.updatedAt || 0).toISOString().slice(0, 10);
                if (breakdown[key]) {
                    breakdown[key].amount += feeOf(o);
                    breakdown[key].deliveries += 1;
                }
            });

            return res.json({
                success: true,
                data: {
                    today_amount: todayOrders.reduce((s, o) => s + feeOf(o), 0),
                    today_deliveries: todayOrders.length,
                    weekly_amount: weekOrders.reduce((s, o) => s + feeOf(o), 0),
                    weekly_deliveries: weekOrders.length,
                    daily_breakdown: Object.values(breakdown),
                },
            });
        } catch (e) {
            console.error('driver/earnings error:', e.message);
            return bad(res, 500, 'Failed to load earnings');
        }
    });
}

function epochMsLocal(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && v.seconds != null) return v.seconds * 1000;
    const t = Date.parse(String(v));
    return isNaN(t) ? 0 : t;
}

function safeIso(v) {
    if (!v) return null;
    if (v.seconds != null) return new Date(v.seconds * 1000).toISOString();
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return String(v);
}

module.exports = { mobileAppRoutes };
