const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const config = require("../config");

async function getDb(req) {
  return req.app.get("db");
}

async function healthCheck(req, res) {
  try {
    const checks = await Promise.allSettled([
      // Firestore
      (async () => {
        const db = await getDb(req);
        if (!db) return "unconfigured";
        try {
          // makeRouteDb exposes set/get/delete (flat dual-db interface)
          await db.set("health", "test", { timestamp: new Date().toISOString() });
          const doc = await db.get("health", "test");
          if (!doc) return "error";
          await db.delete("health", "test");
          return "connected";
        } catch(e) {
          // Check if Firestore is not configured (SKIP_FIREBASE or fallback mode)
          if (db._isFallbackActive && db._isFallbackActive()) {
            return "unconfigured";
          }
          // Check if Firestore db is null (SKIP_FIREBASE mode)
          const firestoreDb = db._getFirestore ? db._getFirestore() : null;
          if (!firestoreDb) {
            return "unconfigured";
          }
          return "error";
        }
      })(),
      // Supabase
      (async () => {
        try {
          const supabaseUrl = config.services.supabase.url || "https://vonkqyiczeqhuqhahsxm.supabase.co";
          const supabaseKey = config.services.supabase.serviceKey || config.services.supabase.anonKey;
          if (!supabaseKey) return "unconfigured";
          const testClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          const { error } = await testClient.from("orders").select("id", { count: "exact", head: true }).limit(1);
          return error ? "error" : "connected";
        } catch(e) { return "unavailable"; }
      })(),
      // PesaPal
      (async () => {
        try {
          return await new Promise(function(resolve) {
            var req = https.get(config.services.pesapal.baseUrl, { timeout: 4000 }, function(res) {
              resolve(res.statusCode < 500 ? "connected" : "degraded");
            });
            req.on("error", function() { resolve("disconnected"); });
            req.on("timeout", function() { req.destroy(); resolve("timeout"); });
          });
        } catch(e) { return "disconnected"; }
      })(),
      // Mapbox
      (async () => {
        try {
          return await new Promise(function(resolve) {
            var req = https.get("https://api.mapbox.com/", { timeout: 4000 }, function(res) {
              resolve(res.statusCode < 500 ? "connected" : "degraded");
            });
            req.on("error", function() { resolve("disconnected"); });
            req.on("timeout", function() { req.destroy(); resolve("timeout"); });
          });
        } catch(e) { return "disconnected"; }
      })()
    ]);

    const [firestore, supabase, pesapal, mapbox] = checks.map(c => c.status === "fulfilled" ? c.value : "error");
    const overall = (supabase === "connected") ? "healthy" : "degraded";

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        services: { firestore, supabase, pesapal, mapbox },
        overall: overall
      }
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function configEndpoint(req, res) {
  const db = await getDb(req);
  res.json({
    firebase: !!db,
    mapbox: config.features.mapbox,
    pesapal: config.features.pesapal,
    sentry: config.features.sentry,
  });
}

async function statusEndpoint(req, res) {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
}

function healthRoutes(app) {
  app.get("/health", healthCheck);
  app.get("/api/health", healthCheck);
  app.get("/api/config", configEndpoint);
  app.get("/api/status", statusEndpoint);
  app.get("/api/v1/health", healthCheck);
  app.get("/api/v1/config", configEndpoint);
  app.get("/api/v1/status", statusEndpoint);
}

module.exports = { healthRoutes };

