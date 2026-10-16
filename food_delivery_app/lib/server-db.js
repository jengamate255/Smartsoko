/**
 * Dual Firestore/Supabase database layer with auto-fallback.
 * Primary: Firebase Firestore (Admin SDK)
 * Fallback: Supabase (when Firestore quota is exhausted)
 */

const { createClient } = require('@supabase/supabase-js');

// ------ Supabase credentials ------
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('[DB] WARNING: SUPABASE_SERVICE_KEY not set in environment -- Supabase fallback will fail');
}

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// ------ Collection -> Supabase table mapping ------
const COLLECTION_TABLE = {
  users: 'profiles',
  sellers: 'sellers',
  products: 'products',
  orders: 'orders',
  drivers: 'drivers',
  deals: 'deals',
  referrals: 'referrals',
  loyalty_transactions: 'loyalty_transactions',
};

function tableName(collection) {
  return COLLECTION_TABLE[collection] || collection;
}

// ------ Firestore camelCase -> Supabase snake_case field mapping ------
  const FIELD_MAP = {
    userId: 'owner_id', ownerId: 'owner_id',
    driverId: 'driver_id', customerId: 'customer_id',
    // orders table uses restaurant_id for the seller/merchant FK
    sellerId: 'restaurant_id', restaurantId: 'restaurant_id',
    merchantId: 'restaurant_id',
    // products table aliases (the merchant-OS writes camelCase names)
    stockQuantity: 'stock',
    image: 'image_url',
    isOpen: 'is_open', isAvailable: 'is_available', isOnline: 'is_online',
    isVerified: 'is_verified', deliveryFee: 'delivery_fee',
    deliveryTime: 'delivery_time_minutes', deliveryAddress: 'delivery_address',
    deliveryLat: 'delivery_latitude', deliveryLng: 'delivery_longitude',
    customerAddress: 'delivery_address', customerPhone: 'customer_phone',
    sellerName: 'seller_name', imageUrl: 'image_url', logoUrl: 'logo_url',
    coverImageUrl: 'cover_image_url', avatarUrl: 'avatar_url',
    fcmToken: 'fcm_token', vehicleNumber: 'vehicle_number',
    vehicleType: 'vehicle_type', licenseNumber: 'license_plate',
    lastLocationUpdate: 'last_location_update', totalDeliveries: 'total_deliveries',
    totalEarnings: 'total_earnings', saleCount: 'sale_count',
    reviewCount: 'review_count', minOrder: 'min_order', maxOrder: 'max_order',
    compareAtPrice: 'compare_at_price', preparationTime: 'preparation_time_minutes',
    createdAt: 'created_at', updatedAt: 'updated_at',
    customerName: 'customer_name', contactPhone: 'customer_phone',
    paymentStatus: 'payment_status', paymentMethod: 'payment_method',
    customerEmail: 'customer_email', sellerPhone: 'seller_phone',
    sellerEmail: 'seller_email', merchantName: 'merchant_name',
    merchantPhone: 'merchant_phone', escrowStatus: 'escrow_status',
    escrowReleasedAt: 'escrow_released_at', nonRefundableFee: 'non_refundable_fee',
    disputeId: 'dispute_id', refundToWallet: 'refund_to_wallet',
    rating: 'rating', address: 'address',
    discount: 'discount_amount', promoCode: 'promo_code',
  };

  // Per-table column overrides: the same logical field name maps to different
  // physical columns depending on the table (products.seller_id vs
  // orders.restaurant_id vs merchant-OS tables' merchant_id).
  const MERCHANT_OS_TABLES = {
    // These tables key the merchant by merchant_id (not restaurant_id)
    merchantId: 'merchant_id', sellerId: 'merchant_id',
  };
  const TABLE_FIELD_MAP = {
    products: {
      sellerId: 'seller_id', merchantId: 'seller_id', restaurantId: 'seller_id',
      imageUrl: 'image_url', image: 'image_url',
      stockQuantity: 'stock',
      isAvailable: 'is_available',
      // merchant-OS-only columns that the products table doesn't have —
      // route them to nearest equivalents or drop the write
      minStock: null,   // products has no min_stock column
      cost: null,       // products has no cost column
    },
    inventory_movements: MERCHANT_OS_TABLES,
    suppliers: MERCHANT_OS_TABLES,
    purchase_orders: MERCHANT_OS_TABLES,
    expenses: MERCHANT_OS_TABLES,
    customer_notes: MERCHANT_OS_TABLES,
    merchant_notifications: MERCHANT_OS_TABLES,
    staff: MERCHANT_OS_TABLES,
    merchant_audit_logs: MERCHANT_OS_TABLES,
    // The live `promotions` table names these columns differently from the
    // merchant-OS promo shape: usage_limit / min_order_amount / valid_until
    // (verified against the deployed schema). Without these overrides
    // POST/PUT /promos failed with "column promotions.max_uses does not exist".
    promotions: {
      ...MERCHANT_OS_TABLES,
      // discountValue first: when several logical names share a column the
      // reverse map keeps the first, and this is the name the routes prefer.
      discountValue: 'discount_value',
      discount: 'discount_value',
      discountType: 'discount_type',
      maxUses: 'usage_limit',
      usageCount: 'usage_count',
      minOrder: 'min_order_amount',
      expiresAt: 'valid_until',
      startsAt: 'valid_from',
      isActive: 'is_active',
    },
    // Customer mobile tables key the user by user_id (not owner_id)
    addresses: { userId: 'user_id' },
    payment_methods: { userId: 'user_id' },
    carts: { userId: 'user_id' },
  };

// Build reverse map
const REVERSE_FIELD_MAP = {};
for (const [k, v] of Object.entries(FIELD_MAP)) {
  REVERSE_FIELD_MAP[v] = k;
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function mapToSupabase(data, table) {
  const overrides = (table && TABLE_FIELD_MAP[table]) || {};
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || typeof value === 'function') continue;
    // Explicit nulls are meaningful (clearing a field) but must not target a
    // column the physical table doesn't have.
    let col = overrides[key] !== undefined ? overrides[key] : (FIELD_MAP[key] || toSnakeCase(key));
    if (col === null) continue; // table has no such column -- drop the write
    if (value === null) { result[col] = null; continue; }
    let val = value;
    if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'Timestamp') {
      val = val.toDate().toISOString();
    }
    if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'GeoPoint') {
      val = { lat: val.latitude, lng: val.longitude };
    }
    if (typeof val === 'number' && val > 1e10 && key.match(/At$/)) {
      val = new Date(val).toISOString();
    }
    if (typeof val === 'object' && !Array.isArray(val) && val.constructor === Object) {
      val = JSON.stringify(val);
    }
    result[col] = val;
  }
  return result;
}

/**
 * Reverse of a table's TABLE_FIELD_MAP overrides (physical column → logical
 * field) so reads hand back the camelCase names the routes use. First mapping
 * wins, so a column shared by several logical names (merchant_id, written by
 * both merchantId and sellerId) resolves to the primary one.
 */
function derivedReverseOverrides(table) {
  const overrides = (table && TABLE_FIELD_MAP[table]) || null;
  if (!overrides) return null;
  const rev = {};
  for (const [logical, col] of Object.entries(overrides)) {
    if (typeof col === 'string' && col && !(col in rev)) rev[col] = logical;
  }
  return Object.keys(rev).length ? rev : null;
}

function mapToFirestore(row, table) {
  // Per-table reverse overrides: physical column → camelCase field the app reads.
  // products: stock → stockQuantity, image_url → imageUrl (merchant-OS reads
  // camelCase; the plain reverse map has no entry because multiple camelCase
  // keys map onto these columns). Other tables derive theirs from
  // TABLE_FIELD_MAP so both directions stay in sync.
  const revOverrides = (table === 'products') ? {
    stock: 'stockQuantity',
    image_url: 'imageUrl',
    seller_id: 'sellerId',
    is_available: 'isAvailable',
  } : derivedReverseOverrides(table);
  const result = {};
  for (const [col, value] of Object.entries(row)) {
    const key = (revOverrides && revOverrides[col]) || REVERSE_FIELD_MAP[col] || col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // Values that were JSON.stringified on write (objects/arrays) come back as
    // strings starting with { or [ -- restore them so round-trips keep their type.
    if (typeof value === 'string' && (value.charAt(0) === '{' || value.charAt(0) === '[')) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch {
        // Not valid JSON after all -- fall through and keep the raw string.
      }
    }
    result[key] = value;
  }
  return result;
}

// ------ Helper: extract Firestore docs into array ------
function docsToArray(snapshot) {
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function docsToArrayRaw(snapshot) {
  return snapshot.docs.map(doc => ({ _ref: doc, _data: doc.data(), _id: doc.id }));
}

// ------ Detect RESOURCE_EXHAUSTED ------
function isQuotaError(err) {
  return err && (
    err.code === 8 ||
    err.code === 'RESOURCE_EXHAUSTED' ||
    (err.message && err.message.includes('RESOURCE_EXHAUSTED')) ||
    (err.message && err.message.includes('Quota exceeded')) ||
    (err.details && err.details.includes('Quota exceeded'))
  );
}

// ------ Create dual database ------
function createDualDb(firestoreDb) {
  let fallbackActive = !firestoreDb; // no Firestore -> straight to Supabase fallback
  let supabaseClient = null;

  // Circuit breaker: after N consecutive Firestore timeouts/quota errors,
  // skip Firestore entirely for a cooldown period (steady-state latency
  // with the breaker open is ~0.3s instead of timeout-per-query).
  const FIRESTORE_TIMEOUT_MS = Number(process.env.FIRESTORE_TIMEOUT_MS || 4000);
  const FIRESTORE_BREAK_THRESHOLD = Number(process.env.FIRESTORE_BREAK_THRESHOLD || 2);
  const FIRESTORE_BREAK_COOLDOWN_MS = Number(process.env.FIRESTORE_BREAK_COOLDOWN_MS || 5 * 60 * 1000);
  let consecutiveTimeouts = 0;
  let breakUntil = 0;

  if (!firestoreDb) {
    console.log('[DB] Firestore not available -- running in Supabase-only mode');
  }

  function getSupabase() {
    if (!supabaseClient) {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    return supabaseClient;
  }

  function activateFallback() {
    if (!fallbackActive) {
      fallbackActive = true;
      console.log('[DB] Firestore quota exhausted -- switching to Supabase fallback');
    }
  }

  function resetFallback() {
    if (fallbackActive) {
      fallbackActive = false;
      console.log('[DB] Fallback reset -- Firestore retry enabled');
    }
  }

  // ---- Run a Firestore query with Supabase fallback --------------------------------------------
  // Firestore is the primary store, but when it is quota-exhausted (the
  // Firebase free tier hits RESOURCE_EXHAUSTED) or stalling we transparently
  // fall back to Supabase, which holds the populated dataset. Genuine
  // non-quota Firestore errors still propagate so callers can handle them.
  // Circuit breaker: after FIRESTORE_BREAK_THRESHOLD consecutive timeouts,
  // skip Firestore for FIRESTORE_BREAK_COOLDOWN_MS.
  async function withFallback(firestoreQuery, supabaseQuery) {
    if (fallbackActive || Date.now() < breakUntil) {
      return supabaseQuery(getSupabase());
    }
    try {
      var result = await Promise.race([
        firestoreQuery(),
        new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('FIRESTORE_TIMEOUT')); }, FIRESTORE_TIMEOUT_MS);
        })
      ]);
      consecutiveTimeouts = 0; // healthy query resets the breaker
      return result;
    } catch (err) {
      if (isQuotaError(err)) {
        if (!fallbackActive) activateFallback();
        return supabaseQuery(getSupabase());
      }
      if (err && err.message === 'FIRESTORE_TIMEOUT') {
        consecutiveTimeouts++;
        if (consecutiveTimeouts >= FIRESTORE_BREAK_THRESHOLD) {
          breakUntil = Date.now() + FIRESTORE_BREAK_COOLDOWN_MS;
          console.log(`[DB] Firestore timed out ${consecutiveTimeouts}x -- circuit breaker open for ${FIRESTORE_BREAK_COOLDOWN_MS / 1000}s (direct Supabase)`);
        }
        return supabaseQuery(getSupabase());
      }
      throw err;
    }
  }

  // ---- Collection proxy (implements the subset of Firestore API used by server-production.js) ----
  function collectionProxy(collectionName) {
    const table = tableName(collectionName);

    // Query builder state (for where/orderBy chaining)
    function createQueryChain() {
      const filters = [];
      let orderField = null;
      let orderDir = 'asc';
      let limitCount = null;
      let offsetCount = 0;

      const chain = {
        where(field, op, value) {
          filters.push({ field, op, value });
          return chain;
        },
        orderBy(field, dir) {
          orderField = field;
          // Firestore's default sort direction is ascending when `dir` is omitted.
          orderDir = !dir || String(dir).toLowerCase() !== 'desc' ? true : false;
          return chain;
        },
        limit(n) {
          limitCount = n;
          return chain;
        },
        offset(n) {
          offsetCount = n || 0;
          return chain;
        },
        // Execute: get all matching docs
        async get() {
          return withFallback(
            // Firestore
            async () => {
              let ref = firestoreDb.collection(collectionName);
              for (const f of filters) {
                ref = ref.where(f.field, f.op, f.value);
              }
              if (orderField) ref = ref.orderBy(orderField, orderDir ? 'asc' : 'desc');
              if (offsetCount) ref = ref.offset(offsetCount);
              if (limitCount) ref = ref.limit(limitCount);
              const snap = await ref.get();
              return {
                docs: snap.docs.map(d => ({
                  id: d.id,
                  data: () => d.data(),
                  exists: d.exists,
                })),
                empty: snap.empty,
                size: snap.size,
              };
            },
            // Supabase
            async (sb) => {
              const isUuid = (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
              // Per-collection column overrides (Supabase schema quirks).
              const colOverride = (field) => {
                // orders uses `restaurant_id` (not `merchant_id`) for the seller
                if (table === 'orders' && field === 'merchantId') return 'restaurant_id';
                // per-table overrides (products.seller_id, addresses.user_id, …)
                const tOverride = TABLE_FIELD_MAP[table] && TABLE_FIELD_MAP[table][field];
                if (tOverride !== undefined && tOverride !== null) return tOverride;
                return FIELD_MAP[field] || toSnakeCase(field);
              };
              // SECURITY: identity/tenant filters (==, in) on uuid columns must
              // NEVER be silently dropped -- the old "drop non-uuid filter and
              // retry" behaviour returned the WHOLE table (cross-tenant leak).
              // Instead: skip sending that filter to PostgREST, collect it, and
              // apply it in-memory after the fetch so semantics are preserved.
              const inMemoryFilters = [];
              const applyFilters = (q) => {
                for (const f of filters) {
                  const col = colOverride(f.field);
                  if ((f.op === '==' || f.op === 'in') && !isUuid(f.value)) {
                    inMemoryFilters.push({ col, op: f.op, value: f.value });
                    continue;
                  }
                  if (f.op === '==') q = q.eq(col, f.value);
                  else if (f.op === '>') q = q.gt(col, f.value);
                  else if (f.op === '>=') q = q.gte(col, f.value);
                  else if (f.op === '<') q = q.lt(col, f.value);
                  else if (f.op === '<=') q = q.lte(col, f.value);
                  else if (f.op === 'array-contains') q = q.contains(col, f.value);
                  else if (f.op === 'in') q = q.in(col, f.value);
                }
                return q;
              };
              const matchesInMemory = (row) => inMemoryFilters.every(f =>
                f.op === '==' ? String(row[f.col] ?? '') === String(f.value)
                : Array.isArray(f.value) && f.value.map(String).includes(String(row[f.col]))
              );
              let query = applyFilters(sb.from(table).select('*'), false);
              if (orderField) {
                const orderCol = (table === 'orders' && orderField === 'merchantId') ? 'restaurant_id' : (FIELD_MAP[orderField] || toSnakeCase(orderField));
                query = query.order(orderCol, { ascending: orderDir });
              }
              if (limitCount && !offsetCount) {
                query = query.limit(limitCount);
              } else if (limitCount && offsetCount) {
                query = query.range(offsetCount, offsetCount + limitCount - 1);
              }
              let result = await query;
              // A cast error on a uuid column should now be impossible (cast-
              // unsafe filters are applied in-memory), but keep one safe retry
              // that returns NOTHING rather than everything.
              if (result.error && String(result.error.message || '').includes('invalid input syntax for type uuid')) {
                return {
                  docs: [],
                  empty: true,
                  size: 0,
                };
              }
              const { data, error } = result;
              if (error) throw error;
              const rows = inMemoryFilters.length
                ? (data || []).filter(matchesInMemory)
                : (data || []);
              return {
                docs: rows.map(row => {
                  const firestoreData = mapToFirestore(row, table);
                  return {
                    id: row.id,
                    data: () => firestoreData,
                    exists: true,
                  };
                }),
                empty: rows.length === 0,
                size: rows.length,
              };
            }
          );
        },
        // count
        async count() {
          const result = await this.get();
          return result.size;
        },
      };
      return chain;
    }

    return {
      // doc(id) -- returns a DocumentReference-like object
      doc(id) {
        return {
          async get() {
            return withFallback(
              async () => {
                const snap = await firestoreDb.collection(collectionName).doc(id).get();
                return {
                  id: snap.id,
                  data: () => snap.data(),
                  exists: snap.exists,
                };
              },
              async (sb) => {
                // A non-UUID id (or any malformed id) makes Supabase throw on the
                // uuid PK cast. Treat that as "not found" rather than an error.
                const { data, error } = await sb.from(table).select('*').eq('id', id).maybeSingle();
                if (error) {
                  if (String(error.message || '').includes('invalid input syntax for type uuid') ||
                      String(error.code) === '22P02') {
                    return { id, data: () => null, exists: false };
                  }
                  throw error;
                }
                return {
                  id: data ? data.id : id,
                  data: () => data ? mapToFirestore(data, table) : null,
                  exists: !!data,
                };
              }
            );
          },
          async set(data, opts) {
            return withFallback(
              async () => {
                if (opts && opts.merge) {
                  await firestoreDb.collection(collectionName).doc(id).set(data, opts);
                } else {
                  await firestoreDb.collection(collectionName).doc(id).set(data);
                }
                return { id };
              },
              async (sb) => {
                const mapped = mapToSupabase(data, table);
                const { error } = await sb.from(table).upsert({ id, ...mapped }, { onConflict: 'id' });
                if (error) throw error;
                return { id };
              }
            );
          },
          async update(data) {
            return withFallback(
              async () => {
                await firestoreDb.collection(collectionName).doc(id).update(data);
                return { id };
              },
              async (sb) => {
                const mapped = mapToSupabase(data, table);
                const { error } = await sb.from(table).update(mapped).eq('id', id);
                if (error) throw error;
                return { id };
              }
            );
          },
          async delete() {
            return withFallback(
              async () => {
                await firestoreDb.collection(collectionName).doc(id).delete();
                return { id };
              },
              async (sb) => {
                const { error } = await sb.from(table).delete().eq('id', id);
                if (error) throw error;
                return { id };
              }
            );
          },
          // Support chaining: collection.doc(id).collection(sub) -- for subcollections
          collection(sub) {
            return collectionProxy(`${collectionName}/${id}/${sub}`);
          },
        };
      },

      // add(data) -- create doc with auto-ID
      async add(data) {
        return withFallback(
          async () => {
            const ref = await firestoreDb.collection(collectionName).add(data);
            return { id: ref.id };
          },
          async (sb) => {
            const mapped = mapToSupabase(data, table);
            const { data: inserted, error } = await sb.from(table).insert(mapped).select('id');
            if (error) throw error;
            return { id: (inserted && inserted[0] && inserted[0].id) || null };
          }
        );
      },

      // where/orderBy/limit chaining (delegates to query chain)
      where(field, op, value) { return createQueryChain().where(field, op, value); },
      orderBy(field, dir) { return createQueryChain().orderBy(field, dir); },
      limit(n) { return createQueryChain().limit(n); },
      offset(n) { return createQueryChain().offset(n); },

      // get -- shorthand for getAll
      async get() {
        return createQueryChain().get();
      },

      // stream / onSnapshot -- Firestore only, no fallback
      onSnapshot(cb, errCb) {
        if (fallbackActive) {
          console.warn(`[DB] onSnapshot(${collectionName}) skipped -- using Supabase fallback`);
          if (errCb) errCb(new Error('Firestore fallback active'));
          return () => {};
        }
        return firestoreDb.collection(collectionName).onSnapshot(cb, errCb);
      },

      // Expose underlying Firestore ref for escape-hatch operations
      _firestore() { return firestoreDb.collection(collectionName); },
      _isFallbackActive: () => fallbackActive,
      get _fallbackActive() { return fallbackActive; },
    };
  }

  // ---- Top-level db proxy ----
  const dbProxy = {
    collection: (name) => collectionProxy(name),
    runTransaction: (fn) => firestoreDb ? firestoreDb.runTransaction(fn) : Promise.reject(new Error('No Firestore')),
    batch: () => firestoreDb ? firestoreDb.batch() : null,
    _isFallbackActive: () => fallbackActive,
    _resetFallback: resetFallback,
    _getFirestore: () => firestoreDb,
    _getSupabase: () => supabaseClient || getSupabase(),
    // No cross-database retry after an ambiguous inventory write.
    async applyInventoryMovement(entry) {
      if (firestoreDb && !fallbackActive) return null;
      const { data, error } = await getSupabase().rpc('apply_inventory_movement', { entry });
      // Compatibility while the reviewed migration awaits deployment.
      if (error?.code === 'PGRST202') return null;
      if (error) throw error;
      return data;
    },
    FieldValue: null,
  };

  // Attach FieldValue lazily
  try {
    dbProxy.FieldValue = require('firebase-admin').firestore.FieldValue;
  } catch (e) {
    // ignore
  }

  // Probe Firestore at startup to detect quota exhaustion early
  if (firestoreDb && !fallbackActive) {
    setTimeout(function() {
      firestoreDb.collection('settings').limit(1).get().then(function() {
        // Firestore works -- keep fallback inactive
      }).catch(function(err) {
        if (isQuotaError(err)) {
          activateFallback();
        }
      });
    }, 1000).unref();
  }

  return dbProxy;
}

// Pure field-mapping helpers are exported so the camelCase ↔ column contract
// can be unit-tested without a live database (see scratch/test-field-map.cjs).
module.exports = { createDualDb, mapToSupabase, mapToFirestore, derivedReverseOverrides, TABLE_FIELD_MAP };


