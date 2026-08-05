/**
 * Dual Firestore/Supabase database layer with auto-fallback.
 * Primary: Firebase Firestore (Admin SDK)
 * Fallback: Supabase (when Firestore quota is exhausted)
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Supabase credentials ───
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('[DB] WARNING: SUPABASE_SERVICE_KEY not set in environment — Supabase fallback will fail');
}

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// ─── Collection → Supabase table mapping ───
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

  // ─── Firestore camelCase → Supabase snake_case field mapping ───
  const FIELD_MAP = {
    userId: 'owner_id', ownerId: 'owner_id', sellerId: 'seller_id',
    driverId: 'driver_id', customerId: 'customer_id', restaurantId: 'restaurant_id',
    merchantId: 'merchant_id',
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
};

// Build reverse map
const REVERSE_FIELD_MAP = {};
for (const [k, v] of Object.entries(FIELD_MAP)) {
  REVERSE_FIELD_MAP[v] = k;
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function mapToSupabase(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || typeof value === 'function') continue;
    let col = FIELD_MAP[key] || toSnakeCase(key);
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

function mapToFirestore(row) {
  const result = {};
  for (const [col, value] of Object.entries(row)) {
    const key = REVERSE_FIELD_MAP[col] || col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // Values that were JSON.stringified on write (objects/arrays) come back as
    // strings starting with { or [ — restore them so round-trips keep their type.
    if (typeof value === 'string' && (value.charAt(0) === '{' || value.charAt(0) === '[')) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch {
        // Not valid JSON after all — fall through and keep the raw string.
      }
    }
    result[key] = value;
  }
  return result;
}

// ─── Helper: extract Firestore docs into array ───
function docsToArray(snapshot) {
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function docsToArrayRaw(snapshot) {
  return snapshot.docs.map(doc => ({ _ref: doc, _data: doc.data(), _id: doc.id }));
}

// ─── Detect RESOURCE_EXHAUSTED ───
function isQuotaError(err) {
  return err && (
    err.code === 8 ||
    err.code === 'RESOURCE_EXHAUSTED' ||
    (err.message && err.message.includes('RESOURCE_EXHAUSTED')) ||
    (err.message && err.message.includes('Quota exceeded')) ||
    (err.details && err.details.includes('Quota exceeded'))
  );
}

// ─── Create dual database ───
function createDualDb(firestoreDb) {
  let fallbackActive = !firestoreDb; // no Firestore → straight to Supabase fallback
  let supabaseClient = null;

  if (!firestoreDb) {
    console.log('[DB] Firestore not available — running in Supabase-only mode');
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
      console.log('[DB] Firestore quota exhausted — switching to Supabase fallback');
    }
  }

  function resetFallback() {
    if (fallbackActive) {
      fallbackActive = false;
      console.log('[DB] Fallback reset — Firestore retry enabled');
    }
  }

  // ── Run a Firestore query with Supabase fallback ──
  // Firestore is the primary store, but when it is quota-exhausted (the
  // Firebase free tier hits RESOURCE_EXHAUSTED) we transparently fall back to
  // Supabase, which holds the populated dataset. Genuine non-quota Firestore
  // errors still propagate so callers can handle them.
  async function withFallback(firestoreQuery, supabaseQuery) {
    if (fallbackActive) {
      return supabaseQuery(getSupabase());
    }
    try {
      var result = await Promise.race([
        firestoreQuery(),
        new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('FIRESTORE_TIMEOUT')); }, 10000);
        })
      ]);
      return result;
    } catch (err) {
      if (isQuotaError(err) || (err && err.message === 'FIRESTORE_TIMEOUT')) {
        if (!fallbackActive) activateFallback();
        return supabaseQuery(getSupabase());
      }
      throw err;
    }
  }

  // ── Collection proxy (implements the subset of Firestore API used by server-production.js) ──
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
                return FIELD_MAP[field] || toSnakeCase(field);
              };
              const applyFilters = (q, dropUuids) => {
                for (const f of filters) {
                  const col = colOverride(f.field);
                  // If the filter targets a uuid PK with a non-uuid value
                  // (e.g. a Firebase UID against restaurant_id), drop it rather
                  // than letting Supabase throw a cast error. Callers that need
                  // it re-apply the filter in-memory.
                  if (dropUuids && (f.op === '==' || f.op === 'in') && !isUuid(f.value)) continue;
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
              // Retry once without non-uuid equality/in filters (cast errors).
              if (result.error && String(result.error.message || '').includes('invalid input syntax for type uuid')) {
                let retry = applyFilters(sb.from(table).select('*'), true);
                if (orderField) {
                  const orderCol = (table === 'orders' && orderField === 'merchantId') ? 'restaurant_id' : (FIELD_MAP[orderField] || toSnakeCase(orderField));
                  retry = retry.order(orderCol, { ascending: orderDir });
                }
                if (limitCount && !offsetCount) retry = retry.limit(limitCount);
                else if (limitCount && offsetCount) retry = retry.range(offsetCount, offsetCount + limitCount - 1);
                result = await retry;
              }
              const { data, error } = result;
              if (error) throw error;
              return {
                docs: (data || []).map(row => {
                  const firestoreData = mapToFirestore(row);
                  return {
                    id: row.id,
                    data: () => firestoreData,
                    exists: true,
                  };
                }),
                empty: !data || data.length === 0,
                size: data ? data.length : 0,
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
      // doc(id) — returns a DocumentReference-like object
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
                  data: () => data ? mapToFirestore(data) : null,
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
                const mapped = mapToSupabase(data);
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
                const mapped = mapToSupabase(data);
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
          // Support chaining: collection.doc(id).collection(sub) — for subcollections
          collection(sub) {
            return collectionProxy(`${collectionName}/${id}/${sub}`);
          },
        };
      },

      // add(data) — create doc with auto-ID
      async add(data) {
        return withFallback(
          async () => {
            const ref = await firestoreDb.collection(collectionName).add(data);
            return { id: ref.id };
          },
          async (sb) => {
            const mapped = mapToSupabase(data);
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

      // get — shorthand for getAll
      async get() {
        return createQueryChain().get();
      },

      // stream / onSnapshot — Firestore only, no fallback
      onSnapshot(cb, errCb) {
        if (fallbackActive) {
          console.warn(`[DB] onSnapshot(${collectionName}) skipped — using Supabase fallback`);
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

  // ── Top-level db proxy ──
  const dbProxy = {
    collection: (name) => collectionProxy(name),
    runTransaction: (fn) => firestoreDb ? firestoreDb.runTransaction(fn) : Promise.reject(new Error('No Firestore')),
    batch: () => firestoreDb ? firestoreDb.batch() : null,
    _isFallbackActive: () => fallbackActive,
    _resetFallback: resetFallback,
    _getFirestore: () => firestoreDb,
    _getSupabase: () => supabaseClient || getSupabase(),
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
        // Firestore works — keep fallback inactive
      }).catch(function(err) {
        if (isQuotaError(err)) {
          activateFallback();
        }
      });
    }, 1000).unref();
  }

  return dbProxy;
}

module.exports = { createDualDb };
