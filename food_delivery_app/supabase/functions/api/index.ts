import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "fooddelievry-dce15";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-firebase-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Firebase ID token verification (JWKS + WebCrypto) ─────────────
let firebaseJwks: { keys: unknown[] } | null = null;
let firebaseJwksFetchedAt = 0;

async function getFirebaseJwks() {
  const now = Date.now();
  if (firebaseJwks && now - firebaseJwksFetchedAt < 15 * 60 * 1000) return firebaseJwks;
  const resp = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  );
  firebaseJwks = await resp.json();
  firebaseJwksFetchedAt = now;
  return firebaseJwks;
}

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Uint8Array.from(atob(b64 + pad), (c) => c.charCodeAt(0));
}

async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    const kid = header.kid;
    if (!kid || header.alg !== "RS256") return null;

    const jwks = await getFirebaseJwks();
    const jwk = (jwks.keys || []).find((k: Record<string, unknown>) => k.kid === kid) as
      | Record<string, unknown>
      | undefined;
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk as JsonWebKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = base64UrlDecode(sigB64);
    const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sigBytes, dataBytes);
    if (!ok) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (!payload.user_id) return null;

    return { uid: payload.user_id, email: payload.email };
  } catch {
    return null;
  }
}

async function requireAuth(req: Request): Promise<{ uid: string; email?: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  // Path 1: Supabase JWT session (gateway-verified asymmetric JWT)
  const { data: sbUser, error } = await supabase.auth.getUser(token);
  if (!error && sbUser?.user) {
    return { uid: sbUser.user.id, email: sbUser.user.email || undefined };
  }
  // Path 2: Firebase ID token passed via x-firebase-token header
  const fbToken = req.headers.get("x-firebase-token");
  if (fbToken) {
    const fb = await verifyFirebaseToken(fbToken);
    if (fb) return fb;
  }
  return null;
}

// Map a Supabase auth UUID to our profile/orders by firebase_uid or email.
async function findProfile(user: { uid: string; email?: string }) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(user.email ? `firebase_uid.eq.${user.uid},email.eq.${user.email}` : `firebase_uid.eq.${user.uid}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findDriverProfile(user: { uid: string; email?: string }) {
  const profile = await findProfile(user);
  if (!profile) return null;
  const { data: driver } = await supabase.from("drivers").select("*").eq("profile_id", profile.id).maybeSingle();
  return { profile, driver };
}

// Auto-create a profile row for Firebase-authenticated users who have never
// been synced to Supabase (their UID is not a Supabase auth UUID).
async function ensureDriverProfile(user: { uid: string; email?: string }) {
  const existing = await findDriverProfile(user);
  if (existing) return existing;

  const payload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    firebase_uid: user.uid,
    name: user.email?.split("@")[0] || "Driver",
    role: "driver",
  };
  if (user.email) payload.email = user.email;

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (!error && data) return { profile: data, driver: null };

  // Email conflict (unique constraint): attach firebase_uid to the existing row.
  if (user.email) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .update({ firebase_uid: user.uid })
      .eq("email", user.email)
      .select("*")
      .maybeSingle();
    if (byEmail) return { profile: byEmail, driver: null };
  }
  return null;
}

const toIso = (v: unknown) => (typeof v === "string" ? v : v instanceof Date ? v.toISOString() : (v as string) || "");

// Serialize a Supabase order row into the driver app's Order model.
function serializeOrder(row: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(row.items) ? row.items.map((it: Record<string, unknown>) => ({
    name: it.name || it.productName || "Item",
    quantity: it.quantity || it.qty || 1,
    price: it.price || 0,
    notes: it.notes || it.specialInstructions || null,
  })) : [];
  return {
    id: row.id,
    restaurantName: row.restaurant_name || "Restaurant",
    restaurantAddress: row.restaurant_address || row.restaurant?.address || "",
    restaurantLat: row.restaurant_lat ?? row.restaurant?.latitude ?? null,
    restaurantLng: row.restaurant_lng ?? row.restaurant?.longitude ?? null,
    customerName: row.customer_name || null,
    customerAddress: row.delivery_address || "",
    customerLat: Number(row.delivery_latitude) || 0,
    customerLng: Number(row.delivery_longitude) || 0,
    items,
    totalAmount: Number(row.total) || 0,
    status: row.status || "pending",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deliveryInstructions: row.special_instructions || null,
  };
}

// Fetch an order row joined with its restaurant (best-effort).
async function fetchOrderRow(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return await attachRestaurant(data as Record<string, unknown>);
}

// Attach restaurant fields to an order row (no FK needed — resolve by id directly).
async function attachRestaurant(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!row || !row.restaurant_id) return row;
  const { data: r } = await supabase
    .from("restaurants")
    .select("name, address, latitude, longitude")
    .eq("id", row.restaurant_id)
    .maybeSingle();
  if (r) {
    row.restaurant_name = r.name;
    row.restaurant_address = r.address;
    row.restaurant_lat = r.latitude;
    row.restaurant_lng = r.longitude;
  }
  return row;
}

// ── FCM push dispatch (Firebase Cloud Messaging HTTP v1) ──────────
let fcmAccessToken: string | null = null;
let fcmTokenExpiresAt = 0;

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseServiceAccount(raw: string): Record<string, unknown> {
  const candidates = [raw, raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\")];
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (typeof parsed === "string") return JSON.parse(parsed);
      return parsed as Record<string, unknown>;
    } catch {
      // try next candidate
    }
  }
  throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not valid JSON");
}

// Mint an OAuth2 access token from the Firebase service account (RS256 JWT).
async function getFcmAccessToken(): Promise<string> {
  if (fcmAccessToken && Date.now() < fcmTokenExpiresAt) return fcmAccessToken;
  const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret not set");
  const sa = parseServiceAccount(saRaw);
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    der as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(`${header}.${claim}`),
    ),
  );
  const jwt = `${header}.${claim}.${base64UrlEncode(sig)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`OAuth2 token error: ${resp.status} ${JSON.stringify(data)}`);
  }
  fcmAccessToken = data.access_token;
  fcmTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 300000;
  return fcmAccessToken;
}

// Dispatch a push notification to one or more device tokens (FCM HTTP v1).
async function sendFcmMessage(tokens: string[], payload: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ success: number; failed: number; errors: string[] }> {
  const project = Deno.env.get("FIREBASE_PROJECT_ID") || "fooddelievry-dce15";
  const accessToken = await getFcmAccessToken();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const token of tokens) {
    const body = JSON.stringify({
      message: {
        token,
        ...(payload.data ? { data: payload.data } : {}),
        notification: { title: payload.title, body: payload.body },
      },
    });
    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });
    if (resp.ok) {
      success++;
    } else {
      failed++;
      const text = await resp.text().catch(() => "unknown");
      errors.push(text.slice(0, 300));
    }
  }
  return { success, failed, errors };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Normalize path: strip /functions/v1/<name> and any leading /api segment.
  const url = new URL(req.url);
  let parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "functions" && parts[1] === "v1") parts = parts.slice(2);
  while (parts[0] === "api") parts = parts.slice(1);
  const segments = parts;
  const method = req.method;

  try {
    // ── Public: health ──
    if (method === "GET" && segments[0] === "health") {
      return jsonResponse({ status: "OK", timestamp: new Date().toISOString(), service: "supabase" });
    }

    // ── Public: marketplace (web app) ──
    if (method === "GET" && segments[0] === "sellers" && !segments[1]) {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const mapped = (data || []).map((s) => ({
        id: s.id,
        name: s.name || "Unknown",
        category: s.category || s.industry || "General",
        address: s.address || "",
        logo_url: s.logo_url || "",
        rating: s.rating || 0,
        delivery_fee: s.delivery_fee || 0,
        delivery_time_minutes: s.delivery_time_minutes || 30,
        is_open: s.is_open !== false,
      }));
      return jsonResponse({ data: mapped, success: true });
    }

    if (method === "GET" && segments[0] === "sellers" && segments[1]) {
      const { data, error } = await supabase.from("sellers").select("*").eq("id", segments[1]).single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (method === "GET" && segments[0] === "categories") {
      return jsonResponse({ data: ["food", "dairy", "fruits", "groceries", "bakery"], success: true });
    }

    if (method === "GET" && segments[0] === "products" && segments[1]) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", segments[1])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ data: data || [], success: true });
    }

    // ── Authenticated endpoints ──
    const user = await requireAuth(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    // Driver profile
    if (method === "GET" && segments[0] === "driver" && segments[1] === "profile") {
      const found = await findDriverProfile(user);
      if (!found) {
        return jsonResponse({
          success: true,
          driver: {
            id: user.uid,
            email: user.email || "",
            full_name: "Driver",
            phone: "",
            vehicle: "",
            plate: "",
            rating: 0,
            total_deliveries: 0,
            status: "offline",
          },
        });
      }
      const d = found.driver || {};
      return jsonResponse({
        success: true,
        driver: {
          id: user.uid,
          email: user.email || found.profile.email || "",
          full_name: found.profile.name || "Driver",
          phone: found.profile.phone || "",
          vehicle: d.vehicle_type || "",
          plate: d.license_plate || d.vehicle_number || "",
          rating: Number(d.rating) || 0,
          total_deliveries: Number(d.total_deliveries) || 0,
          status: d.status || "offline",
        },
      });
    }

    // POST /driver/fcm-token - Register FCM token for push notifications
    if (method === "POST" && segments[0] === "driver" && segments[1] === "fcm-token") {
      const body = await req.json().catch(() => ({}));
      const { token } = body;
      if (!token) return jsonResponse({ success: false, message: "FCM token required" }, 400);

      const found = await ensureDriverProfile(user);
      if (!found || !found.profile) return jsonResponse({ success: false, message: "Driver profile not found" }, 404);

      const { error } = await supabase
        .from("profiles")
        .update({ fcm_token: token })
        .eq("id", found.profile.id);
      if (error) throw error;

      return jsonResponse({ success: true, message: "FCM token registered" });
    }

    // POST /notify - Dispatch an FCM push to drivers (broadcast) or a specific driver.
    // Body: { title, body, data?, driverId?, email?, driverEmail? } — no driverId => broadcast to all online drivers.
    if (method === "POST" && segments[0] === "notify") {
      const body = await req.json().catch(() => ({}));
      const { title, body: msgBody, data, driverId, driverEmail } = body;
      if (!title || !msgBody) {
        return jsonResponse({ success: false, message: "title and body are required" }, 400);
      }

      let tokens: string[] = [];
      let query = supabase.from("profiles").select("fcm_token").not("fcm_token", "is", null);
      if (driverId || driverEmail) {
        if (driverId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(driverId));
          query = isUuid ? query.or(`id.eq.${driverId}`) : query.or(`firebase_uid.eq.${driverId}`);
        }
        if (driverEmail) query = query.or(`email.eq.${driverEmail}`);
      }
      const { data: profiles, error: pErr } = await query.limit(1000);
      if (pErr) throw pErr;
      tokens = (profiles || []).map((p) => p.fcm_token).filter(Boolean);

      if (tokens.length === 0) {
        return jsonResponse({ success: true, message: "No devices to notify", dispatched: 0 });
      }

      const result = await sendFcmMessage(tokens, {
        title,
        body: msgBody,
        data: typeof data === "object" ? data as Record<string, string> : undefined,
      });
      return jsonResponse({ success: true, dispatched: result.success, failed: result.failed, errors: result.errors });
    }

    // Available orders (statuses that mean "ready for pickup/delivery", unassigned)
    if (method === "GET" && segments[0] === "orders" && segments[1] === "available") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 100);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["ready_for_delivery", "dispatched", "out_for_delivery", "ready"])
        .is("driver_id", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const orders = [];
      for (const row of data || []) {
        orders.push(serializeOrder(await attachRestaurant(row as Record<string, unknown>)));
      }
      return jsonResponse({ success: true, orders });
    }

    // POST /orders/:id/accept
    if (method === "POST" && segments[0] === "orders" && segments[2] === "accept") {
      const orderId = segments[1];
      const row = await fetchOrderRow(orderId).catch(() => null);
      if (!row) return jsonResponse({ success: false, message: "Order not found" }, 404);
      if (row.driver_id) return jsonResponse({ success: false, message: "Order already assigned" }, 409);
      if (!["ready_for_delivery", "dispatched", "out_for_delivery", "ready", "pending", "confirmed", "preparing"].includes(row.status)) {
        return jsonResponse({ success: false, message: `Order is not available (status: ${row.status})` }, 409);
      }
      const profile = await findProfile(user);
      const driverName = profile?.name || "Driver";
      const { error } = await supabase
        .from("orders")
        .update({
          driver_id: profile?.id || null,
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;
      // driver_name column may not exist in all deployments — best-effort.
      try {
        await supabase
          .from("orders")
          .update({ driver_name: driverName })
          .eq("id", orderId);
      } catch {
        // column missing — ignore
      }
      const updated = await fetchOrderRow(orderId);
      return jsonResponse({ success: true, message: "Order accepted", order: serializeOrder(updated) });
    }

    // POST /orders/:id/status
    if (method === "POST" && segments[0] === "orders" && segments[2] === "status") {
      const orderId = segments[1];
      const body = await req.json().catch(() => ({}));
      const { status } = body;
      const valid = ["accepted", "picked_up", "in_transit", "delivered", "cancelled"];
      if (!status || !valid.includes(status)) {
        return jsonResponse({ success: false, message: `Invalid status. Must be one of: ${valid.join(", ")}` }, 400);
      }
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "delivered") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
      if (error) throw error;
      const updated = await fetchOrderRow(orderId).catch(() => null);
      if (!updated) return jsonResponse({ success: false, message: "Order not found" }, 404);
      return jsonResponse({ success: true, message: `Status updated to ${status}`, order: serializeOrder(updated) });
    }

    // GET /orders/:id (order details) — also serves customer order lookup
    if (method === "GET" && segments[0] === "orders" && segments[1]) {
      const row = await fetchOrderRow(segments[1]).catch(() => null);
      if (row) return jsonResponse({ success: true, order: serializeOrder(row) });
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", segments[1])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return jsonResponse({ data: data || [], pagination: { returned: (data || []).length } });
    }

    // POST /orders/sync
    if (method === "POST" && segments[0] === "orders" && segments[1] === "sync") {
      return jsonResponse({ success: true, syncedOrders: [], errors: [] });
    }

    // POST /orders/seed  (demo data so the driver app has orders to test with)
    if (method === "POST" && segments[0] === "orders" && segments[1] === "seed") {
      const { data: restaurants, error: rErr } = await supabase
        .from("restaurants")
        .select("id, name")
        .limit(5);
      if (rErr) throw rErr;
      if (!restaurants || restaurants.length === 0) {
        return jsonResponse({ success: false, message: "No restaurants to seed orders against" }, 400);
      }
      const samples = [
        { customer: "Amina Juma", phone: "+255712345678", addr: "Kinondoni, Dar es Salaam", lat: -6.7924, lng: 39.2083, items: [{ name: "Classic Burger", quantity: 2, price: 8000, notes: "No onions" }, { name: "French Fries", quantity: 1, price: 3000, notes: null }], total: 22140, fee: 2000, note: "Call on arrival" },
        { customer: "Baraka Mwinyi", phone: "+255713456789", addr: "Mikocheni, Dar es Salaam", lat: -6.7834, lng: 39.2597, items: [{ name: "Margherita Pizza", quantity: 1, price: 12000, notes: null }], total: 15220, fee: 2500, note: "Ring doorbell twice" },
        { customer: "Neema Kessy", phone: "+255714567890", addr: "Masaki, Dar es Salaam", lat: -6.7421, lng: 39.2787, items: [{ name: "Salmon Roll", quantity: 3, price: 15000, notes: null }], total: 50700, fee: 3000, note: "Leave with security guard" },
      ];
      const rows = samples.map((s, i) => ({
        restaurant_id: restaurants[i % restaurants.length].id,
        customer_name: s.customer,
        customer_phone: s.phone,
        delivery_address: s.addr,
        delivery_latitude: s.lat,
        delivery_longitude: s.lng,
        items: s.items,
        subtotal: s.total - s.fee,
        delivery_fee: s.fee,
        tax: 0,
        total: s.total,
        status: "ready_for_delivery",
        special_instructions: s.note,
        payment_method: "cash",
      }));
      const { data, error } = await supabase.from("orders").insert(rows).select("id");
      if (error) throw error;
      return jsonResponse({ success: true, seeded: data?.length || 0, ids: (data || []).map((x: { id: string }) => x.id) });
    }

    // ── AI Product Extraction ──
    if (method === "POST" && segments[0] === "ai" && segments[1] === "products" && segments[2] === "extract") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        return jsonResponse({ error: "AI not configured: GEMINI_API_KEY missing" }, 503);
      }
      const body = await req.json().catch(() => ({}));
      const { imageBase64, mimeType } = body;
      if (!imageBase64) {
        return jsonResponse({ error: "imageBase64 required" }, 400);
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const type = mimeType || "image/jpeg";
      if (!allowedTypes.includes(type)) {
        return jsonResponse({ error: `Unsupported image format. Allowed: ${allowedTypes.join(", ")}` }, 400);
      }
      // 10MB limit
      const fileSize = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)).length;
      if (fileSize > 10 * 1024 * 1024) {
        return jsonResponse({ error: "Image too large (max 10MB)" }, 400);
      }
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const imagePart = { inlineData: { data: imageBase64, mimeType: type } };
        const prompt = `Extract product information from this image. Return JSON with:
- name: product name
- brand: brand name if visible
- category: product category (e.g., "food", "beverage", "snack", "dairy", "produce", "household", "personal_care", "other")
- size: size/volume (e.g., "500ml", "1kg", "12oz")
- barcode: barcode/EAN/ISBN if visible
- selling_price: price if visible
- unit: unit of measure (e.g., "piece", "pack", "kg", "liter")
- color: dominant color
- tags: array of descriptive tags
Only include fields you can confidently determine. Return valid JSON only.`;
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        let extraction: Record<string, unknown> = {};
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) extraction = JSON.parse(jsonMatch[0]);
        } catch {
          // fallback: try to parse whole response
          try { extraction = JSON.parse(text); } catch {}
        }
        return jsonResponse({
          success: true,
          data: extraction,
          task_id: crypto.randomUUID(),
          agent_name: "product-agent",
          skill: "extract_from_image",
        });
      } catch (e) {
        console.error("AI extract error:", e);
        const msg = (e instanceof Error) ? e.message : String(e);
        return jsonResponse({ error: "AI extraction failed", detail: msg }, 500);
      }
    }

    return jsonResponse({ error: "API endpoint not found", path: url.pathname }, 404);
  } catch (e) {
    console.error("api error:", e);
    return jsonResponse({ error: (e as Error).message || "Internal server error" }, 500);
  }
});
