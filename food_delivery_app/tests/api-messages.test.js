import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const {
  DEFAULT_LANGUAGE,
  MESSAGES,
  resolveLanguage,
  message,
  sendError,
} = require('../server/src/utils/api-messages');

const CALL_SITES = [
  '../server/src/middleware/auth.js',
  '../server/src/middleware/idempotency.js',
  '../server/src/middleware/validate.js',
  '../server/src/routes/otp.js',
];

function req(query = {}, headers = {}) {
  return { query, headers };
}

function res() {
  const self = { status: null, body: null };
  return {
    get _status() {
      return self.status;
    },
    get _body() {
      return self.body;
    },
    status(code) {
      self.status = code;
      return this;
    },
    json(body) {
      self.body = body;
      return this;
    },
  };
}

describe('API message catalogue (LOC-006)', () => {
  it('defaults to Kiswahili', () => {
    expect(DEFAULT_LANGUAGE).toBe('sw');
    expect(resolveLanguage(req())).toBe('sw');
    expect(resolveLanguage(req({}, {}))).toBe('sw');
  });

  it('translates every code into both languages', () => {
    for (const [code, entry] of Object.entries(MESSAGES)) {
      expect(entry.en, `${code} missing en`).toBeTruthy();
      expect(entry.sw, `${code} missing sw`).toBeTruthy();
      expect(entry.sw, `${code} untranslated`).not.toBe(entry.en);
    }
  });

  it('honours ?lang= then X-Language then Accept-Language', () => {
    expect(resolveLanguage(req({ lang: 'en' }, { 'x-language': 'sw' }))).toBe('en');
    expect(resolveLanguage(req({ lang: 'fr' }, { 'x-language': 'en' }))).toBe('en');
    expect(resolveLanguage(req({}, { 'x-language': 'EN-us' }))).toBe('en');
    expect(resolveLanguage(req({}, { 'x-language': 'fr' }))).toBe('sw');
    expect(resolveLanguage(req({}, { 'accept-language': 'en-US,en;q=0.9,sw;q=0.8' }))).toBe('en');
    expect(resolveLanguage(req({}, { 'accept-language': 'sw-TZ,sw;q=0.9,en;q=0.8' }))).toBe('sw');
    expect(resolveLanguage(req({}, { 'accept-language': 'fr,sw;q=0.5' }))).toBe('sw');
    expect(resolveLanguage(req({}, { 'accept-language': 'fr,en;q=0.9' }))).toBe('en');
  });

  it('substitutes %s and keeps the code for unknown entries', () => {
    expect(message('OTP_WAIT', 'sw', ['45s'])).toBe(
      'Tafadhali subiri 45s kabla ya kuomba msimbo mwingine'
    );
    expect(message('AUTH_ROLES_REQUIRED', 'en', ['admin, rider'])).toBe(
      'Requires one of roles: admin, rider'
    );
    expect(message('NOT_A_CODE', 'sw')).toBe('NOT_A_CODE');
  });

  it('every code referenced by the API actually exists', () => {
    const used = new Set();
    for (const rel of CALL_SITES) {
      const source = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
      for (const m of source.matchAll(/sendError\([^,]+,[^,]+,\s*\d+,\s*'([A-Z0-9_]+)'/g)) {
        used.add(m[1]);
      }
      for (const m of source.matchAll(/message\('([A-Z0-9_]+)'/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(15);
    for (const code of used) expect(MESSAGES, `undefined message code: ${code}`).toHaveProperty(code);
  });

  it('sendError returns { success, error, code } in the request language', () => {
    const response = res();
    sendError(response, req({}, { 'x-language': 'sw' }), 401, 'AUTH_NO_TOKEN');
    expect(response._status).toBe(401);
    expect(response._body).toEqual({
      success: false,
      error: 'Hakuna tokeni iliyotolewa',
      code: 'AUTH_NO_TOKEN',
    });

    const english = res();
    sendError(english, req({ lang: 'en' }, {}), 403, 'AUTH_ROLES_REQUIRED', {
      params: ['merchant, admin'],
      errors: ['role'],
    });
    expect(english._status).toBe(403);
    expect(english._body.error).toBe('Requires one of roles: merchant, admin');
    expect(english._body.code).toBe('AUTH_ROLES_REQUIRED');
    expect(english._body.errors).toEqual(['role']);
  });

  it('lets a caller override the message while keeping the code', () => {
    const response = res();
    sendError(response, req(), 400, 'VALIDATION_FAILED', { error: 'custom', code: 'CUSTOM' });
    expect(response._body).toEqual({
      success: false,
      error: 'custom',
      code: 'CUSTOM',
    });
  });
});
