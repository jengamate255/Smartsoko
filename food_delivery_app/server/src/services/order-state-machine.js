/**
 * Order state machine (§4 of the merchant OS mandate).
 * Explicit, shared by API + UI. Invalid transitions are rejected server-side.
 *
 * States follow the existing SmartSoko lifecycle (validators/schemas.js):
 *   pending → accepted → preparing → ready_for_delivery → assigned →
 *   picked_up → in_transit → delivered → completed
 * Cancellation is allowed only before the order ships.
 */
'use strict';

const ORDER_STATUSES = [
  'pending', 'accepted', 'preparing', 'ready_for_delivery',
  'assigned', 'picked_up', 'in_transit', 'delivered', 'completed',
  'cancelled', 'refunded',
];

const TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_delivery', 'cancelled'],
  ready_for_delivery: ['assigned', 'completed', 'cancelled'], // completed = walk-in pickup
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
};

// ── Legacy status aliases ────────────────────────────────────────────────
// The UIs and older rows use several names the canonical machine doesn't:
//   confirmed ≈ accepted, dispatched ≈ in_transit, ready ≈ ready_for_delivery,
//   pickedup ≈ picked_up. Canonicalize BEFORE validating so legacy orders
//   aren't permanently stuck and admin/merchant selects keep working.
const STATUS_ALIASES = {
  confirmed: 'accepted',
  dispatched: 'in_transit',
  ready: 'ready_for_delivery',
  pickedup: 'picked_up',
  topup_completed: 'completed',
};

function canonicalStatus(status) {
  // Fold case as well as trim. The live orders table really contains values
  // like "COMPLETED" and "REFUNDED"; without this they are absent from
  // ORDER_STATUSES, so those orders could never transition again (every status
  // change answered 422) and every case-sensitive money filter missed them.
  const s = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[s] || s;
}

// Which capability performs which transition class
const TRANSITION_CAPABILITY = {
  merchant: [
    'pending>accepted', 'accepted>preparing', 'preparing>ready_for_delivery',
    'ready_for_delivery>assigned', 'assigned>picked_up', // driver handoff confirm
    'delivered>completed', '*>cancelled',
  ],
};

function canTransition(fromRaw, toRaw) {
  const from = canonicalStatus(fromRaw);
  const to = canonicalStatus(toRaw);
  if (!ORDER_STATUSES.includes(from)) return false;
  if (!ORDER_STATUSES.includes(to)) return false;
  const allowed = TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function assertTransition(fromRaw, toRaw) {
  const from = canonicalStatus(fromRaw);
  const to = canonicalStatus(toRaw);
  if (!canTransition(from, to)) {
    const err = new Error(
      `Invalid order status transition: ${from} → ${to}. Allowed: ${(TRANSITIONS[from] || []).join(', ') || 'none'}`
    );
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

function allowedNextStatuses(fromRaw) {
  const from = canonicalStatus(fromRaw);
  if (!ORDER_STATUSES.includes(from)) return [];
  return (TRANSITIONS[from] || []).slice();
}

/** Terminal states cannot move further. */
function isTerminal(status) {
  const s = canonicalStatus(status);
  return (TRANSITIONS[s] || []).length === 0;
}

module.exports = { ORDER_STATUSES, TRANSITIONS, STATUS_ALIASES, canonicalStatus, canTransition, assertTransition, allowedNextStatuses, isTerminal, TRANSITION_CAPABILITY };
