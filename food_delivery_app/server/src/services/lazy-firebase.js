/**
 * Lazy Firebase Admin accessor — returns the initialized admin SDK or null.
 *
 * The production server initializes firebase-admin at boot when
 * NODE_ENV=production (serviceAccountKey.json present). In Supabase-only
 * dev mode it stays uninitialized; consumers must handle null gracefully.
 */
'use strict';

let _admin = null;

function getAdmin() {
  if (_admin) return _admin;
  try {
    _admin = require('firebase-admin');
    if (!_admin.apps || !_admin.apps.length) return null; // not initialized
    return _admin;
  } catch (_) {
    return null;
  }
}

module.exports = { getAdmin };
