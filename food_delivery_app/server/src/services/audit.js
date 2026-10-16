/**
 * Audit helper (§28). Wraps the existing logAudit from config/logger.js and
 * persists structured audit docs so merchant mutations are queryable.
 * Every important action: actor, action, resource, resourceId, before, after.
 */
'use strict';

let logAuditFn = null;
try {
  const loggerModule = require('../config/logger');
  logAuditFn = loggerModule.logAudit || null;
} catch (_) { /* standalone/test use */ }

/**
 * recordAudit(db, { actorId, actorEmail, action, resourceType, resourceId,
 *                   merchantId, before, after, req })
 * Writes to `audit_logs` via the flat db adapter; never throws into the caller
 * (audit failure must not fail the business operation).
 */
async function recordAudit(db, entry) {
  try {
    const doc = {
      actorId: entry.actorId || null,
      actorEmail: entry.actorEmail || null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId || null,
      merchantId: entry.merchantId || null,
      before: entry.before === undefined ? null : entry.before,
      after: entry.after === undefined ? null : entry.after,
      ip: entry.req ? (entry.req.ip || null) : null,
      userAgent: entry.req ? (entry.req.get ? entry.req.get('user-agent') : null) : null,
      ts: new Date().toISOString(),
    };
    if (logAuditFn) {
      // Existing buffer also feeds /api/audit-logs for admins.
      logAuditFn(entry.action, doc);
    }
    // Table name verified against the LIVE schema: `merchant_audit_logs` holds
    // exactly these columns (actor_id, actor_email, action, resource_type,
    // resource_id, merchant_id, before, after, ip, user_agent, ts).
    //
    // Do NOT "fix" this to `audit_logs`: that is a different, pre-existing
    // platform audit table (user_id, entity_type, entity_id, old_values,
    // new_values, ip_address, created_at). The merchant-OS migration in this
    // repo declares `CREATE TABLE IF NOT EXISTS audit_logs (...)` with the
    // merchant shape, but because config.sql already created `audit_logs`,
    // that statement was a silent no-op and the merchant table is this one.
    if (db && db.add) await db.add('merchant_audit_logs', doc);
    return doc;
  } catch (e) {
    // Never fail the business operation, but never lose the failure silently
    // either — an absent audit trail must be visible in the server log.
    console.error('[audit] write failed:', e && e.message ? e.message : e);
    if (logAuditFn) logAuditFn('audit.write_failed', { error: e.message });
    return null;
  }
}

module.exports = { recordAudit };
