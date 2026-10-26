/**
 * Phone OTP authentication — /api/auth/otp/*
 *
 * Flow (matches public/js/otp-auth.js and the otps Supabase table):
 *   POST /api/auth/otp/send    { phone }        → stores a 6-digit code (5 min TTL)
 *   POST /api/auth/otp/verify  { phone, otp }   → mints a Firebase custom token
 *                                                with uid `otp_<phone>` and returns
 *                                                { token, user }
 *   POST /api/auth/otp/resend  { phone }        → same as send (rate-limited)
 *
 * SMS delivery: no SMS gateway is configured in this environment. In dev
 * (NODE_ENV !== 'production') the code is returned in the response and logged
 * so phone login is testable; in production the response never contains it —
 * wire a real provider (Africa's Talking / Twilio) in sendSms().
 *
 * The profiles row keyed by firebase_uid `otp_<phone>` defines the user's
 * role after phone sign-in (existing convention: uid 'otp_255755999888').
 */
'use strict';

const express = require('express');
const { resolveLanguage, message } = require('../utils/api-messages');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// phone → { lastSentAt, attempts }
const _throttle = new Map();

function normalizePhone(raw) {
    let p = String(raw || '').replace(/[^\d+]/g, '');
    if (!p) return null;
    // Local Tanzanian format 0XXXXXXXXX → +255XXXXXXXXX
    if (/^0\d{9}$/.test(p)) p = '+255' + p.slice(1);
    // 255XXXXXXXXX → +255XXXXXXXXX
    if (/^255\d{9}$/.test(p)) p = '+' + p;
    if (/^\+\d{9,15}$/.test(p)) return p;
    return null;
}

function genOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

const { sendSms } = require('../services/sms');

function routes(app) {
    const getDb = () => app.get('db');

    async function findProfileByPhone(phone) {
        const db = getDb();
        if (!db || !db.where) return null;
        try {
            const rows = await db.where('profiles', 'firebase_uid', '==', 'otp_' + phone);
            if (rows && rows.length) return rows[0];
        } catch (_) {
            /* table or column missing */
        }
        try {
            // profiles.phone may be stored without the plus
            const rows2 = await db.where('profiles', 'phone', '==', phone.replace('+', ''));
            if (rows2 && rows2.length) return rows2[0];
        } catch (_) {
            /* ignore */
        }
        return null;
    }

    app.post('/api/auth/otp/send', async (req, res) => {
        const language = resolveLanguage(req);
        try {
            const phone = normalizePhone((req.body || {}).phone);
            if (!phone)
                return res.status(400).json({
                    success: false,
                    error: message('OTP_PHONE_REQUIRED', language),
                    code: 'OTP_PHONE_REQUIRED',
                });

            const state = _throttle.get(phone) || { lastSentAt: 0, attempts: 0 };
            if (Date.now() - state.lastSentAt < RESEND_COOLDOWN_MS) {
                const wait = Math.ceil(
                    (RESEND_COOLDOWN_MS - (Date.now() - state.lastSentAt)) / 1000
                );
                return res.status(429).json({
                    success: false,
                    error: message('OTP_WAIT', language, [`${wait}s`]),
                    code: 'OTP_WAIT',
                });
            }

            const db = getDb();
            if (!db || !db.add)
                return res.status(503).json({ success: false, error: message('DATABASE_UNAVAILABLE', language), code: 'DATABASE_UNAVAILABLE' });

            const code = genOtp();
            const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
            // Invalidate previous unused codes for this phone
            try {
                const existing = await db.where('otps', 'phone', '==', phone);
                for (const row of existing || []) {
                    if (!row.used) await db.update('otps', row.id, { used: true }).catch(() => {});
                }
            } catch (_) {
                /* best effort */
            }

            await db.add('otps', { phone, otp: code, used: false, expiresAt });

            let delivery;
            try {
                delivery = await sendSms(phone, code);
            } catch (error) {
                console.error(`[OTP] SMS delivery failed for ${phone}:`, error.message);
                delivery = { sent: false, provider: process.env.SMS_PROVIDER || null };
            }

            // A configured gateway that fails delivery must not produce a
            // "success without SMS" dead end in production; in dev the code is
            // still returned so login stays testable.
            const isProd = process.env.NODE_ENV === 'production';
            if (isProd && delivery.provider && !delivery.sent) {
                return res
                    .status(502)
                    .json({ success: false, error: message('OTP_SMS_FAILED', language), code: 'OTP_SMS_FAILED' });
            }

            state.lastSentAt = Date.now();
            _throttle.set(phone, state);

            res.json({
                success: true,
                phone,
                expiresAt,
                ...(delivery.sent ? { delivery: { provider: delivery.provider } } : {}),
                ...(isProd || delivery.sent
                    ? {}
                    : {
                          devCode: code,
                          devNote:
                              'SMS gateway not configured — code returned in response (dev only)',
                      }),
            });
        } catch (error) {
            console.error('OTP send error:', error.message);
            res.status(500).json({ success: false, error: message('OTP_SEND_FAILED', language), code: 'OTP_SEND_FAILED' });
        }
    });

    app.post('/api/auth/otp/resend', async (req, res) => {
        // Same semantics as send (throttle enforces the cooldown)
        req.url = '/api/auth/otp/send';
        app.handle(req, res);
    });

    app.post('/api/auth/otp/verify', async (req, res) => {
        const language = resolveLanguage(req);
        try {
            const phone = normalizePhone((req.body || {}).phone);
            const otp = String((req.body || {}).otp || '').trim();
            if (!phone || !/^\d{6}$/.test(otp)) {
                return res
                    .status(400)
                    .json({ success: false, error: message('OTP_FIELDS_REQUIRED', language), code: 'OTP_FIELDS_REQUIRED' });
            }

            const db = getDb();
            if (!db || !db.where)
                return res.status(503).json({ success: false, error: message('DATABASE_UNAVAILABLE', language), code: 'DATABASE_UNAVAILABLE' });

            const state = _throttle.get(phone) || { lastSentAt: 0, attempts: 0 };
            state.attempts++;
            if (state.attempts > MAX_ATTEMPTS) {
                _throttle.set(phone, state);
                return res
                    .status(429)
                    .json({ success: false, error: message('OTP_TOO_MANY_ATTEMPTS', language), code: 'OTP_TOO_MANY_ATTEMPTS' });
            }
            _throttle.set(phone, state);

            const rows = await db.where('otps', 'phone', '==', phone);
            const row = (rows || [])
                .filter(r => !r.used && r.otp === otp)
                .sort((a, b) =>
                    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
                )[0];

            if (!row) return res.status(400).json({ success: false, error: message('OTP_INVALID', language), code: 'OTP_INVALID' });
            if (new Date(row.expiresAt) < new Date()) {
                await db.update('otps', row.id, { used: true }).catch(() => {});
                return res
                    .status(400)
                    .json({ success: false, error: message('OTP_EXPIRED', language), code: 'OTP_EXPIRED' });
            }

            await db.update('otps', row.id, { used: true }).catch(() => {});
            state.attempts = 0;

            // Mint a Firebase custom token with the phone-based uid convention.
            // In Supabase-only mode the admin SDK initializes lazily — mirror the
            // bootstrap used by src/middleware/auth.js so token minting works.
            const admin = app.get('admin');
            const uid = 'otp_' + phone;
            let token = null;
            try {
                if (!admin.apps || !admin.apps.length) {
                    const fs = require('fs');
                    const path = require('path');
                    let serviceAccount = null;
                    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
                    if (b64) {
                        try {
                            serviceAccount = JSON.parse(
                                Buffer.from(b64, 'base64').toString('utf8')
                            );
                        } catch (_) {}
                    }
                    if (!serviceAccount) {
                        const keyPath = path.join(
                            __dirname,
                            '..',
                            '..',
                            '..',
                            'serviceAccountKey.json'
                        );
                        if (fs.existsSync(keyPath))
                            serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                    }
                    if (serviceAccount)
                        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
                }
                if (admin.apps && admin.apps.length) {
                    const custom = await admin
                        .auth()
                        .createCustomToken(uid, { provider: 'phone', phone });
                    token = custom;
                } else {
                    console.error(
                        'OTP: no Firebase credentials available for custom-token minting'
                    );
                }
            } catch (e) {
                console.error('Custom token mint failed:', e.message);
            }

            const profile = await findProfileByPhone(phone);
            const user = profile
                ? {
                      uid,
                      role: profile.role || 'customer',
                      name: profile.name || profile.display_name || phone,
                      phone,
                      onboardingComplete: true,
                  }
                : { uid, role: 'customer', name: phone, phone, onboardingComplete: false };

            res.json({ success: true, phone, token, user });
        } catch (error) {
            console.error('OTP verify error:', error.message);
            res.status(500).json({ success: false, error: message('OTP_VERIFY_FAILED', language), code: 'OTP_VERIFY_FAILED' });
        }
    });
}

module.exports = { otpRoutes: routes, normalizePhone };
