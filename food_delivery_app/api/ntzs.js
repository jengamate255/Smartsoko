/**
 * nTZS Payment Integration
 * Tanzania's programmable payment infrastructure — TZS-pegged stablecoin WaaS
 * API docs: https://www.ntzs.co.tz/developers
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const NTZS_BASE = 'https://www.ntzs.co.tz/api/v1';
const API_KEY = process.env.NTZS_API_KEY || '';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let db = null;
let authMiddleware = null;

// ─── Supabase helpers ────────────────────────────────────────────────

async function supabaseGet(table, query) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${table} query failed: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}

async function supabaseSend(table, method, body, query = '', prefer = '') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body !== null && body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${table} ${method} failed: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// ─── Profile resolution (Supabase profiles are email-keyed) ──────────
// profiles.id is a UUID column and Firebase auth uids are NOT valid profile
// ids (a uid filter 400s with "invalid input syntax for type uuid"). Money
// routes must resolve the caller's profile by their VERIFIED EMAIL, creating
// the profile row on first use — same model as api/pesapal.js.
async function resolveCustomerProfileId(email, name) {
  if (!email) {
    const err = new Error('Authenticated user has no email — cannot resolve SmartSoko profile');
    err.status = 400;
    throw err;
  }
  const rows = await supabaseGet('profiles', `select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
  if (rows[0] && rows[0].id) return rows[0].id;

  const id = require('crypto').randomUUID();
  const now = new Date().toISOString();
  try {
    const created = await supabaseSend('profiles', 'POST', {
      id,
      email,
      name: name || (email.split('@')[0] || 'Customer'),
      role: 'customer',
      created_at: now,
      updated_at: now
    }, '', 'return=representation');
    if (created && created[0] && created[0].id) return created[0].id;
  } catch (e) {
    // Race: another request created the profile first — re-select.
    const again = await supabaseGet('profiles', `select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
    if (again[0] && again[0].id) return again[0].id;
    throw e;
  }
  throw new Error(`Failed to create profile for ${email}`);
}

// Resolve the authenticated caller's profile id from the verified session.
// Returns null when there is no session (guards treat that as 401).
async function getCallerProfileId(req) {
  if (!req.user) return null;
  return resolveCustomerProfileId(req.user.email, req.user.name);
}

// ─── nTZS API client ─────────────────────────────────────────────────

async function ntzsRequest(path, options = {}) {
  const { method = 'GET', body, idempotencyKey } = options;
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
  };

  const res = await fetch(`${NTZS_BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data.error || data.message || `nTZS API ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ─── Resolve (or create) nTZS user for a SmartSoko profile ───────────

async function resolveNtzsUser(profileId, email, name, phone, nidaNumber) {
  const existing = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
  if (existing.length > 0 && existing[0].ntzs_user_id) {
    return existing[0].ntzs_user_id;
  }

  // nTZS requires identity verification at wallet creation: a NIDA number and a
  // Tanzanian phone number are mandatory (error codes: nida_required / phone_required).
  if (!nidaNumber) {
    const err = new Error('nidaNumber is required to create an nTZS wallet (NIDA identity verification)');
    err.status = 400;
    throw err;
  }
  if (!phone) {
    const err = new Error('phone is required to create an nTZS wallet (Tanzanian mobile number)');
    err.status = 400;
    throw err;
  }

  const userData = await ntzsRequest('/users', {
    method: 'POST',
    body: {
      externalId: profileId,
      email: email || `user-${profileId}@smartsoko.tz`,
      name: name || (email ? email.split('@')[0] : 'SmartSoko User'),
      phone,
      nidaNumber,
      country: 'TZ'
    }
  });

  const ntzsUserId = userData.id;
  const now = new Date().toISOString();
  try {
    await supabaseSend('ntzs_users', 'POST', {
      profile_id: profileId,
      ntzs_user_id: ntzsUserId,
      wallet_address: userData.walletAddress || null,
      kyc_status: userData.kycStatus || 'pending_review',
      created_at: now,
      updated_at: now
    }, '', 'return=representation');
  } catch (e) {
    console.warn('ntzs_users insert race:', e.message);
  }

  return ntzsUserId;
}

// ─── Core API wrappers ───────────────────────────────────────────────

async function getNtzsBalance(ntzsUserId) {
  return ntzsRequest(`/users/${ntzsUserId}`);
}

async function initiateDeposit(ntzsUserId, amountTzs, phoneNumber, paymentMethod) {
  const method = paymentMethod || 'mobile_money';
  return ntzsRequest('/deposits', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    body: {
      userId: ntzsUserId,
      amountTzs: Math.round(amountTzs),
      paymentMethod: method,
      ...(phoneNumber ? { phoneNumber } : {}),
      ...(method === 'card' ? {
        redirectUrl: process.env.NTZS_CARD_REDIRECT_URL || `${process.env.PESAPAL_CALLBACK_BASE || 'http://localhost:3000'}/api/payments/ntzs/card-callback`,
        cancelUrl: process.env.NTZS_CARD_CANCEL_URL || `${process.env.PESAPAL_CALLBACK_BASE || 'http://localhost:3000'}/api/payments/ntzs/card-callback`
      } : {})
    }
  });
}

async function getDepositStatus(depositId) {
  return ntzsRequest(`/deposits/${depositId}`);
}

async function withdrawalQuote(ntzsUserId, amountTzs, phoneNumber) {
  return ntzsRequest('/withdrawals/quote', {
    method: 'POST',
    body: { userId: ntzsUserId, amountTzs: Math.round(amountTzs), phoneNumber }
  });
}

async function executeWithdrawal(ntzsUserId, amountTzs, phoneNumber, quoteId) {
  return ntzsRequest('/withdrawals', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    body: { userId: ntzsUserId, amountTzs: Math.round(amountTzs), phoneNumber, quoteId }
  });
}

async function getWithdrawalStatus(withdrawalId) {
  return ntzsRequest(`/withdrawals/${withdrawalId}`);
}

async function spendQuote(ntzsUserId, kind, amountTzs, opts = {}) {
  return ntzsRequest('/spend/quote', {
    method: 'POST',
    body: {
      userId: ntzsUserId,
      kind,
      amountTzs: Math.round(amountTzs),
      ...(opts.payNumber ? { payNumber: opts.payNumber } : {}),
      ...(opts.utilityCode ? { utilityCode: opts.utilityCode } : {}),
      ...(opts.utilityRef ? { utilityRef: opts.utilityRef } : {})
    }
  });
}

async function executeSpend(ntzsUserId, kind, amountTzs, quoteId, opts = {}) {
  return ntzsRequest('/spend', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    body: {
      userId: ntzsUserId,
      kind,
      amountTzs: Math.round(amountTzs),
      quoteId,
      ...(opts.payNumber ? { payNumber: opts.payNumber } : {}),
      ...(opts.utilityCode ? { utilityCode: opts.utilityCode } : {}),
      ...(opts.utilityRef ? { utilityRef: opts.utilityRef } : {})
    }
  });
}

async function getSpendStatus(spendId) {
  return ntzsRequest(`/spend/${spendId}`);
}

async function transfer(fromUserId, toUserId, amountTzs, metadata) {
  return ntzsRequest('/transfers', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    body: {
      fromUserId,
      toUserId,
      amountTzs: Math.round(amountTzs),
      ...(metadata ? { metadata } : {})
    }
  });
}

async function lookupQR(payload) {
  return ntzsRequest('/lookup/qr', {
    method: 'POST',
    body: { payload }
  });
}

async function getBillers() {
  return ntzsRequest('/spend/billers');
}

// ─── Verify webhook signature ────────────────────────────────────────

function verifyWebhookSignature(rawBody, headers) {
  const signature = headers['x-ntzs-signature'] || headers['ntzs-signature'] || '';
  const secret = process.env.NTZS_WEBHOOK_SECRET || '';
  if (!signature || !secret || !rawBody) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ─── Record payment in Supabase ──────────────────────────────────────

async function recordPayment(profileId, amount, method, status, ref, notes, meta) {
  const now = new Date().toISOString();
  return supabaseSend('payments', 'POST', {
    customer_id: profileId,
    amount,
    method,
    status,
    transaction_ref: ref,
    notes,
    metadata: meta,
    created_at: now,
    updated_at: now
  }, '', 'return=representation');
}

// ─── Init ────────────────────────────────────────────────────────────

function init(firebaseDb, authMw) {
  db = firebaseDb;
  authMiddleware = authMw;
}

// ─── Route guards (money-route auth, added 2026-08-24) ──────────────

// All nTZS routes except /health, /webhook (HMAC-verified) and /card-callback
// require a verified SmartSoko session (Firebase ID token or Supabase JWT).
function requireAuth(req, res, next) {
  if (!authMiddleware || typeof authMiddleware.verifyToken !== 'function') {
    return res.status(503).json({ success: false, error: 'Auth middleware not initialised' });
  }
  authMiddleware.verifyToken(req, res, next);
}

// After verifyToken: the caller may only act on their OWN profile.
// Closes the arbitrary-profileId hole — profileId/fromProfileId must equal req.user.uid.
function requireSelfBody(...keys) {
  return (req, res, next) => {
    const uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });
    for (const key of keys) {
      const claimed = req.body[key];
      if (claimed && claimed !== uid) {
        return res.status(403).json({ success: false, error: `${key} does not match authenticated user` });
      }
    }
    next();
  };
}

// Balance endpoint: the :ntzsUserId param must belong to the caller.
async function requireOwnNtzsUserParam(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const profileId = await getCallerProfileId(req);
    const rows = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
    if (!rows[0] || rows[0].ntzs_user_id !== req.params.ntzsUserId) {
      return res.status(403).json({ success: false, error: 'Not your nTZS account' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Status endpoints: the :xxxId must exist in our payments ledger AND belong to the caller
// (recordPayment stamps customer_id = profileId, transaction_ref = provider id).
// NOTE: must stay a plain function — an outer async would return a Promise and
// Express would reject the middleware ("requires a callback function").
function requireOwnLedgerRef(paramName) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const profileId = await getCallerProfileId(req);
      const ref = req.params[paramName];
      const rows = await supabaseGet('payments', `select=customer_id&transaction_ref=eq.${ref}&limit=1`);
      if (!rows[0]) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (rows[0].customer_id !== profileId) {
        return res.status(403).json({ success: false, error: 'Not your transaction' });
      }
      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════

// Health check
router.get('/health', (req, res) => {
  res.json({ configured: isConfigured(), keyType: API_KEY.startsWith('ntzs_live_') ? 'live' : API_KEY.startsWith('ntzs_test_') ? 'test' : 'none' });
});

// Get or create nTZS user for a SmartSoko profile (auth: caller must be the profile)
router.post('/user', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { phone, nidaNumber } = req.body;
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // The client only knows its Firebase uid, which is not a profiles.id —
    // resolve the real profile by the verified session email.
    const profileId = await getCallerProfileId(req);
    const profile = await supabaseGet('profiles', `select=id,email,name,phone&id=eq.${profileId}&limit=1`);
    const profileRow = profile[0] || {};

    const ntzsUserId = await resolveNtzsUser(profileId, profileRow.email || req.user.email, profileRow.name || req.user.name, phone || profileRow.phone, nidaNumber);
    const user = await getNtzsBalance(ntzsUserId);

    res.json({ success: true, userId: ntzsUserId, walletAddress: user.walletAddress, balanceTzs: user.balance !== undefined ? user.balance : user.balanceTzs, kycStatus: user.kycStatus });
  } catch (error) {
    console.error('nTZS user error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Get user balance (auth: only your own nTZS account)
router.get('/balance/:ntzsUserId', requireAuth, requireOwnNtzsUserParam, async (req, res) => {
  try {
    const user = await getNtzsBalance(req.params.ntzsUserId);
    // nTZS API exposes the TZS balance as `balance`; fall back to balanceTzs for forward-compat
    const bal = user.balance !== undefined ? user.balance : user.balanceTzs;
    res.json({ success: true, balanceTzs: bal, balanceUsdc: user.balanceUsdc, walletAddress: user.walletAddress });
  } catch (error) {
    console.error('nTZS balance error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── Deposit (TZS → nTZS) ──────────────────────────────────────────

router.post('/deposit', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { amountTzs, phoneNumber, paymentMethod, nidaNumber } = req.body;
    if (!amountTzs || amountTzs < 500) return res.status(400).json({ success: false, error: 'Minimum deposit is 500 TZS' });

    // The client sends its Firebase uid as profileId, which is not a valid
    // profiles.id (uuid column) — resolve the real profile from the verified
    // session email instead. requireSelfBody still guards the body claim.
    const profileId = await getCallerProfileId(req);
    const profile = await supabaseGet('profiles', `select=id,email,name,phone&id=eq.${profileId}&limit=1`);
    if (!profile[0]) return res.status(404).json({ success: false, error: 'Profile not found' });

    const ntzsUserId = await resolveNtzsUser(profileId, profile[0].email, profile[0].name, phoneNumber || profile[0].phone, nidaNumber);
    const result = await initiateDeposit(ntzsUserId, amountTzs, phoneNumber || profile[0].phone, paymentMethod);

    await recordPayment(profileId, amountTzs, 'ntzs_deposit', 'pending', result.id, 'nTZS deposit initiated', {
      kind: 'deposit', depositId: result.id, ntzsUserId, paymentMethod: paymentMethod || 'mobile_money'
    });

    res.json({ success: true, depositId: result.id, status: result.status, amountTzs, instructions: result.instructions, paymentUrl: result.paymentUrl });
  } catch (error) {
    console.error('nTZS deposit error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Check deposit status (auth: only via a ledger entry you own)
router.get('/deposit/:depositId', requireAuth, requireOwnLedgerRef('depositId'), async (req, res) => {
  try {
    const status = await getDepositStatus(req.params.depositId);
    // Keep the Supabase payments ledger in sync: deposits recorded as 'pending'
    // at initiation flip to 'completed' once nTZS reports the funds minted/settled.
    if (['minted', 'completed', 'settled'].includes(status.status)) {
      try {
        await supabaseSend(
          'payments',
          'PATCH',
          { status: 'completed', updated_at: new Date().toISOString() },
          `transaction_ref=eq.${req.params.depositId}&status=eq.pending`
        );
      } catch (e) {
        console.warn('payments ledger sync failed for deposit', req.params.depositId, e.message);
      }
    }
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('nTZS deposit status error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── Withdrawal (nTZS → TZS mobile money) ───────────────────────────

router.post('/withdrawal/quote', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { profileId, amountTzs, phoneNumber } = req.body;
    if (!profileId) return res.status(400).json({ success: false, error: 'profileId is required' });
    if (!amountTzs || amountTzs < 5000) return res.status(400).json({ success: false, error: 'Minimum withdrawal is 5,000 TZS' });
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'phoneNumber is required' });

    const existing = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
    if (!existing[0]) return res.status(404).json({ success: false, error: 'nTZS user not found. Create a user first.' });

    const quote = await withdrawalQuote(existing[0].ntzs_user_id, amountTzs, phoneNumber);
    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('nTZS withdrawal quote error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

router.post('/withdrawal', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { profileId, amountTzs, phoneNumber, quoteId } = req.body;
    if (!profileId) return res.status(400).json({ success: false, error: 'profileId is required' });
    if (!amountTzs || !phoneNumber) return res.status(400).json({ success: false, error: 'amountTzs and phoneNumber are required' });

    const existing = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
    if (!existing[0]) return res.status(404).json({ success: false, error: 'nTZS user not found' });

    const result = await executeWithdrawal(existing[0].ntzs_user_id, amountTzs, phoneNumber, quoteId);

    await recordPayment(profileId, amountTzs, 'ntzs_withdrawal', result.status === 'burned' ? 'completed' : 'pending', result.id, 'nTZS withdrawal', {
      kind: 'withdrawal', withdrawalId: result.id, recipientName: result.recipientName, totalFeeTzs: result.totalFeeTzs
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('nTZS withdrawal error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

router.get('/withdrawal/:withdrawalId', requireAuth, requireOwnLedgerRef('withdrawalId'), async (req, res) => {
  try {
    const status = await getWithdrawalStatus(req.params.withdrawalId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('nTZS withdrawal status error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── Spend (pay bills & merchants) ──────────────────────────────────

router.get('/billers', async (req, res) => {
  try {
    const billers = await getBillers();
    res.json({ success: true, data: billers });
  } catch (error) {
    console.error('nTZS billers error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

router.post('/spend/quote', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { profileId, kind, amountTzs, payNumber, utilityCode, utilityRef } = req.body;
    if (!profileId) return res.status(400).json({ success: false, error: 'profileId is required' });
    if (!kind || !amountTzs) return res.status(400).json({ success: false, error: 'kind and amountTzs are required' });
    if (kind === 'lipa' && !payNumber) return res.status(400).json({ success: false, error: 'payNumber is required for lipa' });
    if (kind === 'bill' && (!utilityCode || !utilityRef)) return res.status(400).json({ success: false, error: 'utilityCode and utilityRef are required for bill' });

    const existing = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
    if (!existing[0]) return res.status(404).json({ success: false, error: 'nTZS user not found' });

    const quote = await spendQuote(existing[0].ntzs_user_id, kind, amountTzs, { payNumber, utilityCode, utilityRef });
    res.json({ success: true, data: quote });
  } catch (error) {
    console.error('nTZS spend quote error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

router.post('/spend', requireAuth, requireSelfBody('profileId'), async (req, res) => {
  try {
    const { profileId, kind, amountTzs, quoteId, payNumber, utilityCode, utilityRef } = req.body;
    if (!profileId) return res.status(400).json({ success: false, error: 'profileId is required' });
    if (!kind || !amountTzs || !quoteId) return res.status(400).json({ success: false, error: 'kind, amountTzs, and quoteId are required' });

    const existing = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${profileId}&limit=1`);
    if (!existing[0]) return res.status(404).json({ success: false, error: 'nTZS user not found' });

    const result = await executeSpend(existing[0].ntzs_user_id, kind, amountTzs, quoteId, { payNumber, utilityCode, utilityRef });

    await recordPayment(profileId, amountTzs, 'ntzs_spend', result.status === 'burned' ? 'completed' : 'pending', result.id, 'nTZS spend: ' + kind, {
      kind: 'spend', spendId: result.id, recipientName: result.recipientName, totalFeeTzs: result.fees ? result.fees.totalFeeTzs : null
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('nTZS spend error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

router.get('/spend/:spendId', requireAuth, requireOwnLedgerRef('spendId'), async (req, res) => {
  try {
    const status = await getSpendStatus(req.params.spendId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('nTZS spend status error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── QR lookup ───────────────────────────────────────────────────────

router.post('/lookup-qr', requireAuth, async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ success: false, error: 'payload is required' });
    const result = await lookupQR(payload);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('nTZS QR lookup error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── Transfer (user-to-user) ────────────────────────────────────────

router.post('/transfer', requireAuth, requireSelfBody('fromProfileId'), async (req, res) => {
  try {
    const { fromProfileId, toProfileId, amountTzs } = req.body;
    if (!fromProfileId || !toProfileId) return res.status(400).json({ success: false, error: 'fromProfileId and toProfileId are required' });
    if (!amountTzs || amountTzs <= 0) return res.status(400).json({ success: false, error: 'Valid amountTzs is required' });

    const fromExisting = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${fromProfileId}&limit=1`);
    const toExisting = await supabaseGet('ntzs_users', `select=ntzs_user_id&profile_id=eq.${toProfileId}&limit=1`);
    if (!fromExisting[0]) return res.status(404).json({ success: false, error: 'Sender nTZS user not found' });
    if (!toExisting[0]) return res.status(404).json({ success: false, error: 'Recipient nTZS user not found' });

    const result = await transfer(fromExisting[0].ntzs_user_id, toExisting[0].ntzs_user_id, amountTzs);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('nTZS transfer error:', error);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// ─── Webhook receiver ────────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  try {
    if (!verifyWebhookSignature(req.rawBody, req.headers)) {
      console.warn('nTZS webhook rejected: invalid signature');
      return res.status(401).send('Unauthorized');
    }

    const event = req.body || {};
    const { type, data } = event;

    console.log('nTZS webhook:', type, JSON.stringify(data).slice(0, 500));

    if (db) {
      try {
        await db.collection('ntzs_webhooks').add({
          type,
          data,
          receivedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('Firestore webhook log failed:', e.message);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('nTZS webhook error:', error);
    res.status(200).send('OK');
  }
});

// ─── Card callback redirect ──────────────────────────────────────────

router.get('/card-callback', (req, res) => {
  const { depositId } = req.query;
  res.redirect(`/wallet.html?ntzs=deposit&depositId=${depositId || ''}`);
});

// ─── Utility ─────────────────────────────────────────────────────────

function isConfigured() {
  return !!API_KEY;
}

module.exports = router;
module.exports.init = init;
module.exports.isConfigured = isConfigured;
module.exports.resolveNtzsUser = resolveNtzsUser;
module.exports.getNtzsBalance = getNtzsBalance;
module.exports.initiateDeposit = initiateDeposit;
module.exports.getDepositStatus = getDepositStatus;
module.exports.withdrawalQuote = withdrawalQuote;
module.exports.executeWithdrawal = executeWithdrawal;
module.exports.getWithdrawalStatus = getWithdrawalStatus;
module.exports.spendQuote = spendQuote;
module.exports.executeSpend = executeSpend;
module.exports.transfer = transfer;
module.exports.getBillers = getBillers;
module.exports.lookupQR = lookupQR;
module.exports.verifyWebhookSignature = verifyWebhookSignature;
module.exports.ntzsRequest = ntzsRequest;