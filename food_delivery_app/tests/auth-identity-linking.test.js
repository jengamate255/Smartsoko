import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

function setup({ profiles = [], sellers = [], decoded = {}, supabaseUser = null } = {}) {
  const updates = vi.fn();
  const queries = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: supabaseUser } }) },
    from(table) {
      const filters = [];
      let mutation = null;
      const query = {
        select: () => query,
        eq: (key, value) => { filters.push([key, value]); return query; },
        is: (key, value) => { filters.push([key, value]); return query; },
        order: () => query,
        limit: () => query,
        update: value => { mutation = value; return query; },
        then(resolve, reject) {
          queries.push({ table, filters });
          const rows = (table === 'profiles' ? profiles : table === 'sellers' ? sellers : [])
            .filter(row => filters.every(([key, value]) => (row[key] ?? null) === value));
          if (mutation) updates(table, mutation, filters);
          return Promise.resolve({ data: rows.slice(0, 1) }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const context = {
    module: { exports: {} }, Buffer, console: { log() {}, error() {} },
    process: { env: { SKIP_FIREBASE: 'true', SUPABASE_URL: 'https://database.test', SUPABASE_SERVICE_KEY: 'test', SUPABASE_ANON_KEY: 'anon' } },
    require(name) {
      if (name === 'firebase-admin') return { apps: [{}], auth: () => ({ verifyIdToken: async () => decoded }) };
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'fs') return fs;
      if (name === 'path') return {};
      if (name === '../utils/api-messages') return nodeRequire('../server/src/utils/api-messages');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../server/src/middleware/auth.js', import.meta.url), 'utf8'), context);
  const auth = context.module.exports;
  async function authenticate(provider = 'firebase', optional = false) {
    const token = provider === 'supabase' ? `x.${Buffer.from(JSON.stringify({ iss: 'https://database.test/auth/v1' })).toString('base64url')}.x` : 'firebase-token';
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    await auth[optional ? 'optionalAuth' : 'verifyToken'](req, res, next);
    expect(next).toHaveBeenCalledOnce();
    return req;
  }
  return { auth, updates, queries, authenticate };
}

const privileged = { id: 'admin-profile', email: 'admin@example.test', role: 'admin', firebase_uid: null };

describe('authentication identity linking', () => {
  it.each([false, true])('does not grant an unverified Firebase email privileged access (optional=%s)', async optional => {
    const { authenticate, updates, queries } = setup({ profiles: [privileged], sellers: [{ email: privileged.email }], decoded: { uid: 'attacker', email: privileged.email, email_verified: false } });
    const req = await authenticate('firebase', optional);
    expect(req.user.role).toBe('customer');
    expect(req.user.roles).not.toContain('admin');
    expect(updates).not.toHaveBeenCalled();
    expect(queries.some(q => q.filters.some(([key]) => key === 'email'))).toBe(false);
  });

  it('rejects verified email fallback when the profile belongs to another identity', async () => {
    const { authenticate, updates } = setup({ profiles: [{ ...privileged, firebase_uid: 'original-user' }], sellers: [{ email: privileged.email }], decoded: { uid: 'other-user', email: privileged.email, email_verified: true } });
    expect((await authenticate()).user.role).toBe('customer');
    expect(updates).not.toHaveBeenCalled();
  });

  it('preserves canonical Firebase roles without requiring email verification', async () => {
    const { authenticate } = setup({ profiles: [{ ...privileged, firebase_uid: 'original-user' }], decoded: { uid: 'original-user', email: privileged.email, email_verified: false } });
    expect((await authenticate()).user.role).toBe('admin');
  });

  it('links a verified email only to an unlinked profile with a conditional update', async () => {
    const { authenticate, updates } = setup({ profiles: [privileged], decoded: { uid: 'verified-user', email: privileged.email, email_verified: true } });
    expect((await authenticate()).user.role).toBe('admin');
    expect(updates).toHaveBeenCalledWith('profiles', { firebase_uid: 'verified-user' }, [['id', privileged.id], ['firebase_uid', null]]);
  });

  it.each([null, '2026-10-22T00:00:00Z'])('does not map Supabase email onto a conflicting profile (confirmed=%s)', async confirmed => {
    const { authenticate, updates } = setup({ profiles: [{ ...privileged, firebase_uid: 'other-identity' }], supabaseUser: { id: 'native-user', email: privileged.email, email_confirmed_at: confirmed } });
    const req = await authenticate('supabase');
    expect(req.user.uid).toBe('native-user');
    expect(req.user.role).toBe('customer');
    expect(updates).not.toHaveBeenCalled();
  });

  it('does not map an unverified Supabase email onto an unlinked privileged profile', async () => {
    const { authenticate } = setup({ profiles: [privileged], supabaseUser: { id: 'native-user', email: privileged.email } });
    const req = await authenticate('supabase');
    expect(req.user.uid).toBe('native-user');
    expect(req.user.role).toBe('customer');
  });

  it.each(['native-user', 'legacy-profile'])('preserves Supabase canonical roles and profile IDs (%s)', async profileId => {
    const { authenticate } = setup({ profiles: [{ ...privileged, id: profileId, firebase_uid: profileId === 'native-user' ? 'legacy-firebase' : 'native-user' }], supabaseUser: { id: 'native-user', email: privileged.email } });
    const req = await authenticate('supabase');
    expect(req.user.uid).toBe(profileId);
    expect(req.user.role).toBe('admin');
  });
});
