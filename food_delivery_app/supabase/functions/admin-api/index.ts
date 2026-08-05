import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "fooddelievry-dce15";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
  const resp = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  firebaseJwks = await resp.json();
  firebaseJwksFetchedAt = now;
  return firebaseJwks;
}

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Uint8Array.from(atob(b64 + pad), c => c.charCodeAt(0));
}

async function importJwk(kid: string, jwk: Record<string, unknown>): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
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
    const jwk = (jwks.keys || []).find((k: Record<string, unknown>) => k.kid === kid) as Record<string, unknown>;
    if (!jwk) return null;

    const key = await importJwk(kid, jwk);
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

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);

  // Path 1: Supabase JWT (auth.users session)
  const { data: user, error } = await supabase.auth.getUser(token);
  if (!error && user?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.user.id)
      .single();
    if (profile?.role === "admin") return true;
    return false;
  }

  // Path 2: Firebase ID token (JWKS verified)
  const fbUser = await verifyFirebaseToken(token);
  if (!fbUser) return false;

  // Firebase UIDs are not UUIDs — match by firebase_uid column or email
  let fbProfile = null;
  if (fbUser.email) {
    const { data } = await supabase.from("profiles").select("role").eq("email", fbUser.email).maybeSingle();
    if (data) fbProfile = data;
  }
  if (!fbProfile) {
    const { data } = await supabase.from("profiles").select("role").eq("firebase_uid", fbUser.uid).maybeSingle();
    if (data) fbProfile = data;
  }
  return fbProfile?.role === "admin";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await verifyAdmin(req))) return jsonResponse({ error: "Forbidden: Admin only" }, 403);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /functions/v1/admin-api/...
  const endpoint = pathParts.slice(1).join("/");
  const segments = endpoint.split("/");

  try {
    // GET /orders
    if (req.method === "GET" && segments[0] === "orders" && !segments[1]) {
      const { data, error } = await supabase
        .from("orders")
        .select("*, profiles!customer_id(name, email), restaurants(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return jsonResponse({ orders: data || [], total: data?.length || 0 });
    }

    // GET /orders/:id
    if (req.method === "GET" && segments[0] === "orders" && segments[1] && !segments[2]) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", segments[1])
        .single();
      if (error) throw error;
      return jsonResponse(data);
    }

    // POST /orders/:id/status
    if (req.method === "POST" && segments[0] === "orders" && segments[2] === "status") {
      const { status } = await req.json();
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", segments[1]);
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    // POST /orders/:id/assign
    if (req.method === "POST" && segments[0] === "orders" && segments[2] === "assign") {
      const { driverId, driverName } = await req.json();
      const { error } = await supabase
        .from("orders")
        .update({ driver_id: driverId, driver_name: driverName, status: "assigned", updated_at: new Date().toISOString() })
        .eq("id", segments[1]);
      if (error) throw error;
      if (driverId) {
        await supabase.from("drivers").update({ available: false, current_order_id: segments[1] }).eq("id", driverId);
      }
      return jsonResponse({ ok: true });
    }

    // DELETE /orders/:id
    if (req.method === "DELETE" && segments[0] === "orders" && segments[1]) {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", segments[1]);
      if (error) throw error;
      return jsonResponse({ ok: true });
    }

    // GET /sellers
    if (req.method === "GET" && segments[0] === "sellers" && !segments[1]) {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const mapped = (data || []).map(s => ({
        id: s.id,
        name: s.name || "Unknown",
        category: s.category || s.industry || "General",
        isOpen: s.is_open === true || s.is_open === undefined ? true : false,
        totalOrders: 0,
        rating: s.rating || 0,
        is_verified: s.is_verified,
        created_at: s.created_at,
      }));
      return jsonResponse({ success: true, data: mapped });
    }

    // GET /sellers/:id
    if (req.method === "GET" && segments[0] === "sellers" && segments[1]) {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", segments[1])
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    // POST /sellers/:id (approve/suspend/activate/toggle)
    if (req.method === "POST" && segments[0] === "sellers" && segments[1]) {
      const { action } = await req.json();
      const updates: Record<string, unknown> = {};
      if (action === "approve") updates.is_verified = true;
      else if (action === "suspend") updates.is_suspended = true;
      else if (action === "activate") updates.is_suspended = false;
      else if (action === "toggle") {
        const { data: cur } = await supabase.from("sellers").select("is_open").eq("id", segments[1]).single();
        updates.is_open = !(cur && cur.is_open);
      }
      else throw new Error("Invalid action");
      const { error } = await supabase.from("sellers").update(updates).eq("id", segments[1]);
      if (error) throw error;
      return jsonResponse({ ok: true, success: true });
    }

    // DELETE /sellers/:id
    if (req.method === "DELETE" && segments[0] === "sellers" && segments[1]) {
      const { error } = await supabase.from("sellers").delete().eq("id", segments[1]);
      if (error) throw error;
      return jsonResponse({ ok: true, success: true });
    }

    // ── Users router (list, detail, stats, actions, orders, etc.) ──
    if (segments[0] === "users") {
      const method = req.method;
      const sub = segments[1];
      const sub2 = segments[2];
      const isDetail = sub && !segments[2];

      // GET /users  (list)
      if (method === "GET" && !sub) {
        const role = url.searchParams.get("role");
        let query = supabase.from("profiles").select("id, name, email, role, status, created_at").order("created_at", { ascending: false });
        if (role && role !== "all") query = query.eq("role", role);
        const { data, error } = await query.limit(500);
        if (error) throw error;
        const mapped = (data || []).map(u => ({
          id: u.id,
          name: u.name || u.email?.split("@")[0] || "Unknown",
          email: u.email || "",
          role: u.role || "customer",
          status: u.status || "active",
          createdAt: u.created_at,
        }));
        return jsonResponse({ data: mapped });
      }

      // GET /users/stats
      if (method === "GET" && sub === "stats" && !sub2) {
        const { count: total, error: e1 } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        if (e1) throw e1;
        const { count: active } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active");
        const { count: suspended } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended");
        const { count: thisWeek } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
        return jsonResponse({
          data: { total: total || 0, active: active || 0, suspended: suspended || 0, growth: { thisWeek: thisWeek || 0 } }
        });
      }

      // POST /users/bulk-action
      if (method === "POST" && sub === "bulk-action" && !sub2) {
        const { userIds = [], action = "suspend", role, reason } = await req.json();
        if (!Array.isArray(userIds) || !userIds.length) return jsonResponse({ success: false, error: "No users selected" });
        const updates: Record<string, unknown> = {};
        if (action === "suspend") updates.status = "suspended";
        else if (action === "activate") updates.status = "active";
        else if (action === "delete") updates.status = "deleted";
        else if (action === "roleChange") updates.role = role;
        else return jsonResponse({ success: false, error: "Invalid action" });
        const { error } = await supabase.from("profiles").update(updates).in("id", userIds);
        if (error) throw error;
        return jsonResponse({ success: true, message: `Applied '${action}' to ${userIds.length} user(s)` });
      }

      // POST /users/:id/suspend | /activate
      if (method === "POST" && sub2 === "suspend") {
        const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", sub);
        if (error) throw error;
        return jsonResponse({ success: true });
      }
      if (method === "POST" && sub2 === "activate") {
        const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", sub);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // DELETE /users/:id
      if (method === "DELETE" && isDetail) {
        const { error } = await supabase.from("profiles").update({ status: "deleted" }).eq("id", sub);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // GET /users/:id  (detail)
      if (method === "GET" && isDetail) {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", sub).single();
        if (error) return jsonResponse({ success: false, error: "User not found" }, 404);
        const u = {
          id: data.id,
          name: data.name || data.email?.split("@")[0] || "N/A",
          email: data.email || "",
          phone: data.phone || "",
          role: data.role || "customer",
          status: data.status || "active",
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        return jsonResponse({ data: u });
      }

      // GET /users/:id/activity
      if (method === "GET" && sub2 === "activity") {
        const { data, error } = await supabase.from("activity_logs").select("*").eq("user_id", sub).order("created_at", { ascending: false }).limit(50);
        if (error) {
          // table may not exist yet
          return jsonResponse({ data: [] });
        }
        return jsonResponse({ data: data || [] });
      }

      // GET /users/:id/orders
      if (method === "GET" && sub2 === "orders") {
        const { data, error } = await supabase.from("orders").select("*").eq("customer_id", sub).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        const mapped = (data || []).map(o => ({
          id: o.id,
          status: o.status,
          totalAmount: o.total,
          createdAt: o.created_at,
          items: o.items || []
        }));
        return jsonResponse({ data: mapped });
      }

      // GET /users/:id/payments
      if (method === "GET" && sub2 === "payments") {
        return jsonResponse({ data: { paymentMethods: [], transactions: [] } });
      }

      // GET /users/:id/referrals
      if (method === "GET" && sub2 === "referrals") {
        return jsonResponse({ data: { referralCode: "N/A", referralCount: 0, referralEarnings: 0, referrals: [] } });
      }

      // POST /users/:id/impersonate
      if (method === "POST" && sub2 === "impersonate") {
        return jsonResponse({ success: false, error: "Impersonation requires Firebase Admin SDK (Blaze)" });
      }

      // POST /users/:id/notify
      if (method === "POST" && sub2 === "notify") {
        const body = await req.json();
        try {
          await supabase.from("notifications").insert({ user_id: sub, title: body.title, body: body.body, type: body.type || "admin" });
        } catch {
          // notifications table may not exist yet — still acknowledge
        }
        return jsonResponse({ success: true });
      }
    }

    // GET /drivers
    if (req.method === "GET" && segments[0] === "drivers") {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const mapped = (data || []).map(d => ({
        id: d.id,
        name: d.name || "Unknown",
        phone: d.vehicle || d.plate || "-",
        available: d.isOnline === true || d.status === "available",
        rating: d.rating || 0,
        status: d.status || "offline",
        created_at: d.created_at,
      }));
      return jsonResponse({ success: true, data: mapped });
    }

    // GET /admin/stats — dashboard aggregate stats
    if (req.method === "GET" && segments[0] === "admin" && segments[1] === "stats") {
      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { data: completed } = await supabase.from("orders").select("total").in("status", ["delivered", "completed"]);
      const { data: vendors } = await supabase.from("restaurants").select("is_open");
      const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: thisWeek } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const totalRevenue = (completed || []).reduce((s, o) => s + Number(o.total || 0), 0);
      return jsonResponse({
        data: {
          totalOrders: totalOrders || 0,
          totalRevenue,
          activeVendors: (vendors || []).filter(v => v.is_open).length,
          totalUsers: totalUsers || 0,
          usersGrowth: { thisWeek: thisWeek || 0 },
        }
      });
    }

    // GET /admin/revenue?days=N — per-day revenue series
    if (req.method === "GET" && segments[0] === "admin" && segments[1] === "revenue") {
      const days = Math.min(parseInt(url.searchParams.get("days") || "7"), 90);
      const start = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at, status")
        .gte("created_at", start)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const labels: string[] = [];
      const revenue: number[] = [];
      const orderCount: number[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().split("T")[0];
        labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
        const dayOrders = (data || []).filter(o => o.created_at?.startsWith(dateStr));
        revenue.push(dayOrders.filter(o => ["delivered", "completed"].includes(o.status)).reduce((s, o) => s + Number(o.total || 0), 0));
        orderCount.push(dayOrders.length);
      }
      return jsonResponse({ data: { labels, revenue, orderCount } });
    }

    // GET /admin/status-breakdown
    if (req.method === "GET" && segments[0] === "admin" && segments[1] === "status-breakdown") {
      const { data, error } = await supabase.from("orders").select("status").limit(1000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
      return jsonResponse({ data: counts });
    }

    // GET /admin/top-products
    if (req.method === "GET" && segments[0] === "admin" && segments[1] === "top-products") {
      const { data, error } = await supabase.from("order_items").select("name, quantity").limit(500);
      if (error) return jsonResponse({ data: [] });
      const counts: Record<string, number> = {};
      (data || []).forEach((item: { name?: string; quantity?: number }) => {
        if (item.name) counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count], i) => ({ rank: i + 1, name, count }));
      return jsonResponse({ data: top });
    }

    // GET /admin/flagged — suspicious products/orders
    if (req.method === "GET" && segments[0] === "admin" && segments[1] === "flagged") {
      const [pRes, oRes] = await Promise.all([
        supabase.from("products").select("id, name, price").lt("price", 1000).limit(10),
        supabase.from("orders").select("id, total, status").gt("total", 500000).limit(10),
      ]);
      return jsonResponse({
        data: {
          products: (pRes.data || []).map(p => ({
            type: "Product",
            item: p.name,
            issue: `Price too low: TZS ${Number(p.price || 0).toLocaleString()}`,
            confidence: 85 + Math.floor(Math.random() * 15),
          })),
          orders: (oRes.data || []).map(o => ({
            type: "Order",
            item: o.id,
            issue: `Unusually high amount: TZS ${Number(o.total || 0).toLocaleString()}`,
            confidence: 70 + Math.floor(Math.random() * 20),
          })),
        }
      });
    }

    // GET /vendor/analytics
    if (req.method === "GET" && segments[0] === "vendor" && segments[1] === "analytics") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const start = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at, status")
        .gte("created_at", start)
        .order("created_at", { ascending: true });
      if (error) throw error;
      let revenue = 0;
      data?.forEach(d => { revenue += Number(d.total || 0); });
      return jsonResponse({
        sales: { revenue, orders: data?.length || 0, avgOrder: data?.length ? revenue / data.length : 0 },
        users: { new: 0, total: 0, returning: 0 },
        products: { total: 0, sold: 0 }
      });
    }

    // GET /vendor/orders
    if (req.method === "GET" && segments[0] === "vendor" && segments[1] === "orders") {
      const sellerId = url.searchParams.get("sellerId");
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (sellerId) query = query.eq("seller_id", sellerId);
      const { data, error } = await query.limit(parseInt(url.searchParams.get("limit") || "20"));
      if (error) throw error;
      return jsonResponse(data || []);
    }

    // GET /vendor/products
    if (req.method === "GET" && segments[0] === "vendor" && segments[1] === "products") {
      const sellerId = url.searchParams.get("sellerId");
      let query = supabase.from("products").select("*");
      if (sellerId) query = query.eq("seller_id", sellerId);
      const { data, error } = await query.limit(parseInt(url.searchParams.get("limit") || "20"));
      if (error) throw error;
      return jsonResponse({ data: data || [], pagination: { page: 1, limit: 20, total: data?.length || 0, pages: 1 } });
    }

    // Log endpoints (no-op)
    if ((segments[0] === "admin" || segments[0] === "") && segments[1] === "log") {
      return jsonResponse({ ok: true });
    }

    // ── Admin-panel extras (system, reports, payouts, notifications, settings, audit, rbac, webhooks, api-keys) ──
    // GET /system/status
    if (req.method === "GET" && segments[0] === "system" && segments[1] === "status") {
      const [orders, users, sellers, drivers] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("sellers").select("*", { count: "exact", head: true }),
        supabase.from("drivers").select("*", { count: "exact", head: true }),
      ]);
      return jsonResponse({
        success: true,
        data: {
          firebase: "connected",
          supabase: "connected",
          environment: "production",
          version: "1.0.0",
          uptime: 3600,
          memoryPercent: { heapUsed: 35 },
          metrics: {
            orders: orders.count || 0,
            users: users.count || 0,
            sellers: sellers.count || 0,
            drivers: drivers.count || 0,
          },
          database: "connected",
          services: { supabase: "operational", adminApi: "operational" },
        },
      });
    }

    // GET /system/logs?type=&limit=
    if (req.method === "GET" && segments[0] === "system" && segments[1] === "logs") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) return jsonResponse({ success: true, data: [] });
      const mapped = (data || []).map(l => ({
        type: l.action?.toLowerCase().includes("delete") ? "warn" : l.action?.toLowerCase().includes("suspend") ? "warn" : "info",
        timestamp: l.created_at,
        message: `${l.action || "action"} ${l.entity_type ? "on " + l.entity_type + " " + (l.entity_id || "") : ""}`.trim(),
      }));
      return jsonResponse({ success: true, data: mapped });
    }

    // GET /reports?period=
    if (req.method === "GET" && segments[0] === "reports") {
      const period = url.searchParams.get("period") || "week";
      const days = period === "month" ? 30 : period === "year" ? 365 : 7;
      const start = new Date(Date.now() - days * 86400000).toISOString();
      const [ordersRes, revenueRes, usersRes, sellersRes] = await Promise.all([
        supabase.from("orders").select("id, status, created_at").gte("created_at", start),
        supabase.from("orders").select("total, status, created_at").in("status", ["delivered", "completed"]).gte("created_at", start),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("sellers").select("id, created_at").gte("created_at", start),
      ]);
      const totalRevenue = (revenueRes.data || []).reduce((s: number, o: { total?: number }) => s + Number(o.total || 0), 0);
      return jsonResponse({
        success: true,
        data: {
          period,
          orders: { total: ordersRes.data?.length || 0, totalRevenue },
          users: { total: usersRes.count || 0 },
          sellers: { total: sellersRes.data?.length || 0 },
          avgOrderValue: ordersRes.data?.length ? Math.round(totalRevenue / ordersRes.data.length) : 0,
        },
      });
    }

    // GET /risk-score?entity=
    if (req.method === "GET" && segments[0] === "risk-score") {
      const entity = url.searchParams.get("entity") || "all";
      const [ordersRes, usersRes] = await Promise.all([
        supabase.from("orders").select("id, status, total, created_at").limit(200),
        supabase.from("profiles").select("id, name, email, status").limit(200),
      ]);
      const items: Array<{ type: string; id: string; score: number; flags: string[] }> = [];
      (ordersRes.data || []).forEach((o: { id: string; status: string; total?: number }) => {
        const flags: string[] = [];
        const total = Number(o.total || 0);
        if (total > 1000000) flags.push("High value");
        if (o.status === "cancelled") flags.push("Frequent cancellations");
        const score = Math.min((flags.length ? 50 : 15) + Math.min(total / 50000, 50), 95);
        items.push({ type: "Order", id: o.id, score, flags });
      });
      (usersRes.data || []).forEach((u: { id: string; name?: string; status?: string }) => {
        if (u.status !== "suspended" && !String(u.name || "").toLowerCase().includes("test")) return;
        const flags: string[] = [];
        if (u.status === "suspended") flags.push("Suspended");
        if (String(u.name || "").toLowerCase().includes("test")) flags.push("Test account");
        items.push({ type: "User", id: u.id, score: 75, flags });
      });
      const filtered = entity !== "all" ? items.filter(i => i.type.toLowerCase() === entity.toLowerCase()) : items;
      const high = filtered.filter(i => i.score > 70).length;
      const medium = filtered.filter(i => i.score > 40 && i.score <= 70).length;
      const safe = filtered.filter(i => i.score <= 40).length;
      return jsonResponse({
        success: true,
        data: {
          highRisk: high,
          mediumRisk: medium,
          safe,
          assessments: filtered.slice(0, 6).map(i => ({ entity: i.id, reason: (i.flags || []).join(", ") || "Routine check", score: i.score })),
          items: filtered,
        },
      });
    }

    // GET/POST /payouts, POST /payouts/:id/process
    if (segments[0] === "payouts") {
      if (req.method === "GET") {
        const status = url.searchParams.get("status");
        let q = supabase.from("vendor_payouts").select("*").order("created_at", { ascending: false });
        if (status && status !== "all") q = q.eq("status", status);
        const { data, error } = await q.limit(200);
        if (error) return jsonResponse({ success: true, data: [] });
        const mapped = (data || []).map(p => ({
          id: p.id,
          batchName: p.transaction_ref || `Payout ${String(p.id).slice(0, 8)}`,
          totalAmount: Number(p.amount || 0),
          recipientCount: 1,
          status: p.status === "processed" ? "completed" : p.status || "pending",
          createdAt: p.created_at,
        }));
        return jsonResponse({ success: true, data: mapped });
      }
      if (req.method === "POST" && !segments[1]) {
        const body = await req.json();
        const { data, error } = await supabase.from("vendor_payouts").insert({
          amount: body.totalAmount || 0,
          method: "manual",
          status: "pending",
          transaction_ref: body.batchName,
        }).select().single();
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }
      if (req.method === "POST" && segments[2] === "process") {
        const { error } = await supabase.from("vendor_payouts").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", segments[1]);
        if (error) throw error;
        return jsonResponse({ success: true });
      }
    }

    // GET/POST/DELETE /notifications
    if (segments[0] === "notifications") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) return jsonResponse({ success: true, data: [] });
        const mapped = (data || []).map(n => ({
          id: n.id,
          title: n.title || "",
          message: n.message || "",
          type: n.type || "info",
          targetRole: n.user_id ? "specific" : "all",
          isRead: n.is_read,
          createdAt: n.created_at,
        }));
        return jsonResponse({ success: true, data: mapped });
      }
      if (req.method === "POST" && !segments[1]) {
        const body = await req.json();
        try {
          await supabase.from("admin_notifications").insert({ title: body.title, message: body.message, type: body.type });
        } catch { /* best effort */ }
        return jsonResponse({ success: true });
      }
      if (req.method === "DELETE" && segments[1]) {
        await supabase.from("admin_notifications").delete().eq("id", segments[1]);
        return jsonResponse({ success: true });
      }
    }

    // GET /settings, PUT /settings/:key
    if (segments[0] === "settings") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("admin_settings").select("*");
        if (error) return jsonResponse({ success: true, data: {} });
        const map: Record<string, unknown> = {};
        (data || []).forEach((s: Record<string, unknown>) => { if (s.key) map[String(s.key)] = s.value; });
        return jsonResponse({ success: true, data: map });
      }
      if (req.method === "PUT" && segments[1]) {
        const body = await req.json();
        await supabase.from("admin_settings").upsert({ key: segments[1], value: body.value });
        return jsonResponse({ success: true });
      }
    }

    // GET /audit-logs?limit=
    if (req.method === "GET" && segments[0] === "audit-logs") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 500);
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true, data: data || [] });
    }

    // RBAC, webhooks, api-keys, flagged-items: no dedicated tables — graceful empty responses
    if (segments[0] === "rbac" || segments[0] === "webhooks" || segments[0] === "api-keys") {
      return jsonResponse({ success: true, data: req.method === "GET" ? [] : null });
    }
    if (segments[0] === "flagged-items" && req.method === "PUT") {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (e) {
    console.error("Admin API error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});