const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vonkqyiczeqhuqhahsxm.supabase.co';
const SRK = process.env.SUPABASE_SERVICE_KEY;

if (!SRK) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable is required.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SRK);

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

// Deterministic UUID from any string (MD5-based UUID v3-like)
function strToUUID(s) {
  const h = crypto.createHash('md5').update(s, 'utf8').digest();
  h[6] = (h[6] & 0x0f) | 0x30; // version 3
  h[8] = (h[8] & 0x3f) | 0x80; // variant
  const hex = h.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
function isUUID(s) { return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); }
function toUUID(id) { return isUUID(id) ? id : strToUUID(id); }

// Actual column sets from Supabase (fetched from information_schema)
const SCHEMA = {
  profiles: ['id','email','name','phone','role','avatar_url','created_at','updated_at','display_name','firebase_uid'],
  sellers: ['id','name','description','category','industry','logo_url','cover_image_url','address','latitude','longitude','delivery_fee','delivery_time_minutes','rating','is_open','owner_id','phone','email','website','is_verified','tags','created_at','updated_at'],
  products: ['id','seller_id','name','description','price','compare_at_price','category','subcategory','image_url','images','is_available','stock','sku','barcode','weight','unit','min_order','max_order','preparation_time_minutes','allergens','nutritional_info','ingredients','tags','rating','review_count','sale_count','created_at','updated_at'],
  orders: ['id','customer_id','restaurant_id','driver_id','customer_name','customer_phone','delivery_address','delivery_latitude','delivery_longitude','items','subtotal','delivery_fee','tax','discount_amount','total','payment_method','payment_status','order_type','scheduled_for','status','special_instructions','promo_code','loyalty_points_earned','estimated_delivery_time','actual_delivery_time','preparation_started_at','completed_at','created_at','updated_at','product_price','service_fee','total_paid','escrow_status','escrow_released_at','non_refundable_fee','dispute_id','refund_to_wallet'],
  drivers: ['id','profile_id','vehicle_type','vehicle_number','vehicle_color','license_plate','current_latitude','current_longitude','status','current_order_id','rating','total_deliveries','total_earnings','is_verified','created_at','updated_at','name','phone','email','avatar_url','is_online','fcm_token','last_location_update'],
};

const FIELD_MAP = {
  userId:'owner_id', ownerId:'owner_id', sellerId:'seller_id', driverId:'driver_id',
  customerId:'customer_id', restaurantId:'restaurant_id',
  isOpen:'is_open', isAvailable:'is_available', isOnline:'is_online', isVerified:'is_verified',
  deliveryFee:'delivery_fee', deliveryTime:'delivery_time_minutes',
  deliveryAddress:'delivery_address', deliveryLat:'current_latitude', deliveryLng:'current_longitude',
  customerAddress:'delivery_address', customerPhone:'customer_phone',
  contactPhone:'customer_phone', sellerName:'customer_name',
  paymentStatus:'payment_status', paymentMethod:'payment_method',
  imageUrl:'image_url', logoUrl:'logo_url', coverImageUrl:'cover_image_url',
  avatarUrl:'avatar_url', fcmToken:'fcm_token',
  vehicleNumber:'vehicle_number', vehicleType:'vehicle_type', licenseNumber:'license_plate',
  lastLocationUpdate:'last_location_update', lastDelivery:'updated_at',
  totalDeliveries:'total_deliveries', totalEarnings:'total_earnings',
  saleCount:'sale_count', reviewCount:'review_count',
  minOrder:'min_order', maxOrder:'max_order',
  compareAtPrice:'compare_at_price', preparationTime:'preparation_time_minutes',
  createdAt:'created_at', updatedAt:'updated_at', deliveredAt:'completed_at', acceptedAt:'completed_at',
  firebaseUid:'firebase_uid',
  pickupLat:'delivery_latitude', pickupLng:'delivery_longitude',
  customerLat:'delivery_latitude', customerLng:'delivery_longitude',
  sellerLat:'delivery_latitude', sellerLng:'delivery_longitude',
  currentLatitude:'current_latitude', currentLongitude:'current_longitude',
};

function mapValue(val) {
  if (val === undefined || val === null || typeof val === 'function') return undefined;
  if (val && typeof val === 'object' && val.constructor?.name === 'Timestamp') return val.toDate().toISOString();
  if (val && typeof val === 'object' && val.constructor?.name === 'GeoPoint') return val;
  if (typeof val === 'number' && val > 1e10) return new Date(val).toISOString(); // epoch millis
  if (typeof val === 'object' && !Array.isArray(val) && val.constructor === Object) return JSON.stringify(val);
  return val;
}

function mapRow(raw, table, docId) {
  const cols = new Set(SCHEMA[table] || []);
  const row = {};

  for (const [key, value] of Object.entries(raw)) {
    const val = mapValue(value);
    if (val === undefined) continue;
    let col = FIELD_MAP[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (!cols.has(col)) continue;

    if (col === 'seller_id' || col === 'owner_id' || col === 'customer_id' || col === 'driver_id' || col === 'restaurant_id' || col === 'profile_id') {
      if (typeof val === 'string' && val) row[col] = toUUID(val);
    } else {
      row[col] = val;
    }
  }

  row.id = toUUID(docId);

  // Store original Firestore ID if column exists
  if (isUUID(docId)) {
    row.id = docId;
  } else {
    row.id = toUUID(docId);
    if (cols.has('firebase_uid')) row.firebase_uid = docId;
  }

  return row;
}

async function syncCollection(collection, table) {
  console.log(`\n=== ${collection} -> ${table} ===`);
  const snapshot = await db.collection(collection).get();
  console.log(`Found ${snapshot.size} documents`);

  let synced = 0, errors = 0;
  const batch = [];
  for (const doc of snapshot.docs) {
    batch.push(mapRow(doc.data(), table, doc.id));
  }

  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error(`Batch ${Math.floor(i/50)} error: ${error.message}`);
      for (const row of chunk) {
        const { error: e2 } = await supabase.from(table).upsert(row, { onConflict: 'id' });
        if (e2) { console.error(`  ${row.id?.slice(0,8)||'?'}: ${e2.message}`); errors++; }
        else synced++;
      }
    } else {
      synced += chunk.length;
    }
  }

  console.log(`Done: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

async function main() {
  console.log('Starting Firestore -> Supabase sync...');
  const results = {};
  results.profiles = await syncCollection('users', 'profiles');
  results.sellers = await syncCollection('sellers', 'sellers');
  results.products = await syncCollection('products', 'products');
  results.orders = await syncCollection('orders', 'orders');
  try { results.drivers = await syncCollection('drivers', 'drivers');
  } catch { try { results.drivers = await syncCollection('riders', 'drivers');
  } catch { console.log('No drivers/riders collection'); } }

  console.log('\n=== SYNC COMPLETE ===');
  for (const [t, r] of Object.entries(results)) if (r) console.log(`${t}: ${r.synced} synced, ${r.errors} errors`);
}

main().catch(console.error);
