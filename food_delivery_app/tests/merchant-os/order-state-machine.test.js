import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUSES, canTransition, assertTransition, allowedNextStatuses, isTerminal,
} from '../../server/src/services/order-state-machine.js';

describe('order state machine', () => {
  it('allows the happy path', () => {
    const happy = ['pending', 'accepted', 'preparing', 'ready_for_delivery',
      'assigned', 'picked_up', 'in_transit', 'delivered', 'completed'];
    for (let i = 0; i < happy.length - 1; i++) {
      expect(canTransition(happy[i], happy[i + 1]), `${happy[i]}→${happy[i + 1]}`).toBe(true);
    }
  });

  it('rejects skipping stages (pending → delivered)', () => {
    expect(canTransition('pending', 'delivered')).toBe(false);
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('accepted', 'in_transit')).toBe(false);
  });

  it('rejects backwards transitions', () => {
    expect(canTransition('delivered', 'preparing')).toBe(false);
    expect(canTransition('completed', 'pending')).toBe(false);
    expect(canTransition('cancelled', 'accepted')).toBe(false);
  });

  it('allows cancellation only before shipping', () => {
    for (const s of ['pending', 'accepted', 'preparing', 'ready_for_delivery', 'assigned']) {
      expect(canTransition(s, 'cancelled'), `${s}→cancelled`).toBe(true);
    }
    for (const s of ['picked_up', 'in_transit', 'delivered', 'completed']) {
      expect(canTransition(s, 'cancelled'), `${s}→cancelled`).toBe(false);
    }
  });

  it('terminal states have no exits and assertTransition throws with code', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(() => assertTransition('completed', 'pending')).toThrow(/Invalid order status transition/);
    try {
      assertTransition('completed', 'pending');
      throw new Error('should not reach');
    } catch (e) {
      expect(e.code).toBe('INVALID_TRANSITION');
    }
  });

  it('unknown statuses are rejected everywhere', () => {
    expect(canTransition('bogus', 'pending')).toBe(false);
    expect(canTransition('pending', 'bogus')).toBe(false);
    expect(allowedNextStatuses('bogus')).toEqual([]);
  });

  it('every status appears in the transitions map exactly once as a key', () => {
    expect(Object.keys(require('../../server/src/services/order-state-machine.js').TRANSITIONS).sort())
      .toEqual([...ORDER_STATUSES].sort());
  });
});
