/**
 * Backfill Supabase merchant identity rows so /api/merchant/* can resolve a
 * tenant. READ-ONLY unless you pass --apply.
 *
 * Why this exists: the merchant dashboard now reads the API instead of
 * Firestore, and req.merchantId resolves through
 *   profiles.firebase_uid = <firebase uid>  →  sellers.owner_id = profiles.id
 * (server/src/middleware/capabilities.js). A merchant without those rows gets
 * 403 NO_MERCHANT_PROFILE on every endpoint.
 *
 * Usage:
 *   node tools/backfill-merchant-profiles.cjs            # dry run (default)
 *   node tools/backfill-merchant-profiles.cjs --apply    # write the rows
 *
 * Uses the Auth REST API + Firestore REST + the Supabase service key, so it
 * never touches the admin gRPC channel (which stalls on some machines).
 * Nothing is written unless --apply is passed, and every write is idempotent.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_DIR = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length);
const INCLUDE_SYNTHETIC = process.argv.includes('--include-synthetic');

/**
 * Most of the Firestore `sellers` collection is generated seed data
 * (doc ids like `seller-00000`, ownerIds like `user-0000164`, Faker-style
 * company names). Provisioning those into Supabase `profiles` would create
 * hundreds of fake merchants, so synthetic rows are skipped unless explicitly
 * requested and --apply refuses to run without a selector.
 */
function isSynthetic(row) {
  const uid = String(row.firebaseUid || '');
  const docId = String(row.firestoreDocId || '');
  const name = String(row.name || '');
  if (/^user-\d+$/i.test(uid) || /^seller-\d+$/i.test(docId)) return true;
  if (/^(test|demo)\b/i.test(name) || /\(faker\)|inc\b|group\b|llc\b/i.test(name) && /-|,/.test(name)) return true;
  return false;
}

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

/** Mint an OAuth access token from the service account (HTTP only, no gRPC). */
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const signingInput = `${header}.${claims}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error('token exchange failed: ' + (body.error_description || body.error));
  return body.access_token;
}

(async () => {
  const env = parseEnv(path.join(APP_DIR, '.env'));
  const supa = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const supaKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  const SH = { apikey: supaKey, Authorization: 'Bearer ' + supaKey, 'Content-Type': 'application/json' };

  const saPath = path.join(APP_DIR, 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    console.log('No serviceAccountKey.json — cannot enumerate Firebase users. Aborting.');
    process.exit(2);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const project = sa.project_id;
  const token = await accessToken(sa);

  // ── 1. Firestore sellers (the merchant source of truth today) ──────────
  const fsRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/sellers?pageSize=300`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const fsBody = await fsRes.json();
  if (!fsRes.ok) throw new Error('Firestore read failed: ' + JSON.stringify(fsBody.error || fsBody).slice(0, 300));
  const firestoreSellers = (fsBody.documents || []).map((d) => {
    const f = {};
    for (const [k, v] of Object.entries(d.fields || {})) {
      f[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.timestampValue ?? null;
    }
    return { docId: String(d.name).split('/').pop(), ownerId: f.ownerId || null, name: f.name || '' };
  });

  // ── 2. Supabase state ─────────────────────────────────────────────────
  const get = async (q) => {
    const r = await fetch(supa + q, { headers: SH });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return []; }
  };
  const profiles = await get('/rest/v1/profiles?select=id,firebase_uid,role&limit=2000');
  const sellers = await get('/rest/v1/sellers?select=id,owner_id,name&limit=2000');
  const profileByUid = new Map(profiles.map((p) => [p.firebase_uid, p]));
  const sellersByOwner = new Map();
  for (const s of sellers) {
    if (!s.owner_id) continue;
    sellersByOwner.set(s.owner_id, [...(sellersByOwner.get(s.owner_id) || []), s]);
  }
  // Name index: a store that already exists in Supabase under a DIFFERENT owner
  // must not be re-created. Real example: Firestore's "Kunduchi Fresh Store"
  // belongs to a Firebase admin account, while Supabase already has that store
  // owned by a profile that is a driver with no firebase_uid. Inserting would
  // duplicate the store, so this is flagged for a human instead.
  const sellersByName = new Map();
  for (const s of sellers) {
    const key = String(s.name || '').trim().toLowerCase();
    if (key) sellersByName.set(key, [...(sellersByName.get(key) || []), s]);
  }

  // ── 3. Plan ───────────────────────────────────────────────────────────
  const plan = firestoreSellers.map((s) => {
    const uid = s.ownerId;
    const profile = uid ? profileByUid.get(uid) : null;
    const existingSellers = profile ? (sellersByOwner.get(profile.id) || []) : [];
    const sameName = sellersByName.get(String(s.name || '').trim().toLowerCase()) || [];
    const sameNameOtherOwner = sameName.filter((x) => !profile || x.owner_id !== profile.id);

    let action = 'none';
    let detail = null;
    if (!uid) {
      action = 'needs-manual-mapping (seller doc has no ownerId)';
    } else if (sameNameOtherOwner.length) {
      action = 'AMBIGUOUS — a store with this name already exists under a different owner';
      detail = sameNameOtherOwner.map((x) => ({ sellerId: x.id, ownerId: x.owner_id }));
    } else if (!profile) {
      action = 'create profiles row';
    } else if (!existingSellers.length) {
      action = 'create sellers row';
    }
    return {
      firestoreDocId: s.docId,
      name: s.name,
      firebaseUid: uid,
      profileId: profile ? profile.id : null,
      profileRole: profile ? profile.role : null,
      supabaseSellerIds: existingSellers.map((x) => x.id),
      conflictingSellers: detail,
      action,
    };
  });

  const summary = plan.reduce((acc, p) => { acc[p.action] = (acc[p.action] || 0) + 1; return acc; }, {});
  const synthetic = plan.filter(isSynthetic);
  const real = plan.filter((p) => !isSynthetic(p));

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)',
    project,
    counts: {
      firestoreSellers: firestoreSellers.length,
      // The Firestore read is capped at 300; more may exist.
      firestoreReadCapped: firestoreSellers.length >= 300,
      supabaseProfiles: profiles.length,
      supabaseSellers: sellers.length,
    },
    planSummary: summary,
    classification: {
      looksLikeSeedData: synthetic.length,
      looksReal: real.length,
      note: 'synthetic rows are skipped unless --include-synthetic is passed',
    },
    realMerchantsNeedingWork: real.filter((p) => p.action !== 'none'),
    needsHumanDecision: plan.filter((p) => p.action.startsWith('AMBIGUOUS') || p.action.startsWith('needs-manual')),
    // Show a sample of the synthetic ones so the classification is auditable.
    syntheticSample: synthetic.slice(0, 5),
  }, null, 2));

  if (!APPLY) {
    console.log('\nDry run only. To write: --apply --only=<firebaseUid>[,<uid>...]');
    console.log('or --apply --include-synthetic to provision the seed data too.');
    return;
  }

  if (!ONLY && !INCLUDE_SYNTHETIC) {
    console.error('\nRefusing to apply: 296 unprovisioned rows are mostly generated seed data.');
    console.error('Pass --only=<firebaseUid>[,<uid>...] for the merchants you actually want,');
    console.error('or --include-synthetic if you really mean to provision the fixtures too.');
    process.exit(3);
  }

  const wanted = ONLY ? new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean)) : null;
  const skipped = [];
  const targets = plan.filter((p) => {
    if (wanted && !wanted.has(p.firebaseUid)) return false;
    if (!wanted && isSynthetic(p)) return false;
    // Never insert on top of a conflict or an unmapped doc — those need a human
    // decision (usually *linking* the existing store, not creating a second one).
    if (p.action.startsWith('AMBIGUOUS') || p.action.startsWith('needs-manual')) {
      if (wanted) skipped.push(p);
      return false;
    }
    return p.action !== 'none';
  });
  if (skipped.length) {
    console.log('\nSkipped (needs a human decision, not an insert):');
    for (const p of skipped) console.log('  - ' + p.name + ' [' + p.firebaseUid + ']: ' + p.action);
  }
  console.log(`\nProvisioning ${targets.length} merchant(s)...`);

  // ── 4. Apply (idempotent): profile then seller, one merchant at a time ─
  let createdProfiles = 0;
  let createdSellers = 0;
  for (const p of targets) {
    if (p.action !== 'create profiles row' && p.action !== 'create sellers row') continue;
    let profileId = p.profileId;
    if (!profileId) {
      const r = await fetch(supa + '/rest/v1/profiles', {
        method: 'POST',
        headers: { ...SH, Prefer: 'return=representation' },
        body: JSON.stringify({ firebase_uid: p.firebaseUid, role: 'merchant' }),
      });
      const body = await r.json();
      if (!r.ok) { console.error('profile insert failed for', p.firebaseUid, JSON.stringify(body).slice(0, 200)); continue; }
      profileId = Array.isArray(body) ? body[0] && body[0].id : body.id;
      createdProfiles++;
    }
    if (!p.supabaseSellerIds.length) {
      const r = await fetch(supa + '/rest/v1/sellers', {
        method: 'POST',
        headers: { ...SH, Prefer: 'return=representation' },
        body: JSON.stringify({ owner_id: profileId, name: p.name || 'Merchant', category: 'food' }),
      });
      if (!r.ok) { console.error('seller insert failed for', p.firebaseUid, (await r.text()).slice(0, 200)); continue; }
      createdSellers++;
    }
    console.log('provisioned', p.firebaseUid, '→ profile', profileId);
  }
  console.log(`\nCreated ${createdProfiles} profile(s) and ${createdSellers} seller(s).`);
})().catch((e) => {
  console.error('BACKFILL ERROR: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
