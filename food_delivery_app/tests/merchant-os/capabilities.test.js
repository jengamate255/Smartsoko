import { describe, it, expect } from 'vitest';
import {
  CAPABILITIES, effectiveCapabilities, hasCapability, requireCapability, resolveMerchant,
} from '../../server/src/middleware/capabilities.js';

describe('capability RBAC', () => {
  it('owner gets every capability', () => {
    const caps = effectiveCapabilities({ role: 'merchant' });
    expect(caps.sort()).toEqual([...CAPABILITIES].sort());
  });

  it('platform admins pass everything', () => {
    expect(effectiveCapabilities({ role: 'admin' }).sort()).toEqual([...CAPABILITIES].sort());
    expect(effectiveCapabilities({ role: 'super_admin' }).sort()).toEqual([...CAPABILITIES].sort());
  });

  it('sales staff cannot write inventory or manage staff', () => {
    expect(hasCapability({ role: 'sales' }, 'orders.write')).toBe(true);
    expect(hasCapability({ role: 'sales' }, 'inventory.write')).toBe(false);
    expect(hasCapability({ role: 'sales' }, 'staff.manage')).toBe(false);
    expect(hasCapability({ role: 'sales' }, 'payments.read')).toBe(false);
  });

  it('accountant reads payments and reports but cannot take orders', () => {
    expect(hasCapability({ role: 'accountant' }, 'payments.read')).toBe(true);
    expect(hasCapability({ role: 'accountant' }, 'reports.read')).toBe(true);
    expect(hasCapability({ role: 'accountant' }, 'orders.write')).toBe(false);
  });

  it('custom capabilities extend but never exceed the catalogue', () => {
    const user = { role: 'sales', capabilities: ['payments.read', 'made_up_cap'] };
    expect(hasCapability(user, 'payments.read')).toBe(true);
    expect(hasCapability(user, 'made_up_cap')).toBe(false);
  });

  it('requireCapability middleware returns 401/403 correctly', () => {
    const mw = requireCapability('products.write');
    let status = 0;
    const res = { status(s) { status = s; return { json() {} }; } };

    mw({ user: null }, res, () => {});
    expect(status).toBe(401);

    status = 0; let nextCalled = false;
    mw({ user: { role: 'sales' } }, res, () => { nextCalled = true; });
    expect(status).toBe(403);
    expect(nextCalled).toBe(false);

    status = 0; nextCalled = false;
    mw({ user: { role: 'merchant' } }, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

describe('tenant isolation (resolveMerchant)', () => {
  it('resolves an unlinked legacy owner profile using verified email', async () => {
    const db = { where: async (table, field, op, value) => {
      if (table === 'profiles' && field === 'email' && value === 'owner@example.com') return [{ id: 'owner-profile', firebase_uid: null }];
      if (table === 'sellers' && field === 'ownerId' && value === 'owner-profile') return [{ id: 'owned-store' }];
      return [];
    } };
    expect(await resolveMerchant(db, null, { user: { uid: 'firebase-owner', email: 'Owner@example.com', emailVerified: true } })).toBe('owned-store');
    expect(await resolveMerchant(db, null, { user: { uid: 'firebase-owner', email: 'Owner@example.com', emailVerified: false } })).toBeNull();
  });

  it('does not use email to take over a linked or ambiguous owner profile', async () => {
    for (const profiles of [[{ id: 'owner-profile', firebase_uid: 'another-user' }], [{ id: 'one' }, { id: 'two' }]]) {
      const db = { where: async (table, field) => {
        if (table === 'profiles' && field === 'email') return profiles;
        if (table === 'sellers') throw new Error('Must not look up another owner');
        return [];
      } };
      expect(await resolveMerchant(db, null, { user: { uid: 'firebase-owner', email: 'owner@example.com', emailVerified: true } })).toBeNull();
    }
  });
  function fakeAdmin(sellerId) {
    return {
      firestore: () => ({
        collection: () => ({
          where: () => ({
            limit: () => ({
              get: async () => ({
                empty: !sellerId,
                docs: sellerId ? [{ id: sellerId }] : [],
              }),
            }),
          }),
        }),
      }),
    };
  }

  it('resolves the caller’s own seller id from Firestore', async () => {
    const id = await resolveMerchant(null, fakeAdmin('seller-123'), { user: { uid: 'u1' } });
    expect(id).toBe('seller-123');
  });

  it('falls back to the flat adapter', async () => {
    const db = { where: async () => [{ id: 'seller-supabase' }] };
    const id = await resolveMerchant(db, null, { user: { uid: 'u1' } });
    expect(id).toBe('seller-supabase');
  });

  it('returns null for users with no store and never trusts client input', async () => {
    const id = await resolveMerchant(null, fakeAdmin(null), { user: { uid: 'u1' } });
    expect(id).toBeNull();
  });
});
