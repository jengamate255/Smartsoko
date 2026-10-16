/**
 * Address routes — serves BOTH clients:
 *
 *  Native Android app (SmartsokoApiService):
 *    POST   /api/addresses            CreateAddressRequestDto → ApiResponse<AddressDto>
 *    GET    /api/addresses            → ApiResponse<List<AddressDto>>
 *    PUT    /api/addresses/:id        UpdateAddressRequestDto → ApiResponse<AddressDto>
 *    DELETE /api/addresses/:id        → ApiResponse<Unit>
 *    POST   /api/addresses/:id/set-default → ApiResponse<Unit>
 *    AddressDto = { id, user_id, title, full_name, phone_number, street_address,
 *                   apartment, city, postal_code, location: {latitude, longitude,
 *                   address, timestamp}, delivery_instructions, is_default }
 *
 *  Web (checkout/profile pages):
 *    POST /api/addresses { address, latitude, longitude, isDefault }
 *      → { success, address: {...} }   (validated via schemas.address)
 *    GET /api/addresses → { success, addresses: [...] }
 *
 * Storage row (snake_case in Supabase, camelCase via dual-db): userId, title,
 * fullName, phoneNumber, streetAddress, apartment, city, postalCode, latitude,
 * longitude, address, deliveryInstructions, isDefault.
 */
async function getDb(req) {
  return req.app.get('db');
}

/** Row → native AddressDto shape */
function toAppDto(row) {
  const lat = Number(row.latitude ?? row.latitude) || 0;
  const lng = Number(row.longitude) || 0;
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title || 'Home',
    full_name: row.fullName || row.userName || '',
    phone_number: row.phoneNumber || '',
    street_address: row.streetAddress || row.address || '',
    apartment: row.apartment || null,
    city: row.city || 'Dar es Salaam',
    postal_code: row.postalCode || null,
    delivery_instructions: row.deliveryInstructions || null,
    location: {
      latitude: lat,
      longitude: lng,
      address: row.streetAddress || row.address || '',
      timestamp: epochMs(row.createdAt),
    },
    is_default: !!row.isDefault,
  };
}

function epochMs(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.seconds != null) return v.seconds * 1000;
  const t = Date.parse(String(v));
  return isNaN(t) ? 0 : t;
}

async function unsetOtherDefaults(db, userId, exceptId) {
  const existing = await db.where('addresses', 'userId', '==', userId);
  for (const addr of existing) {
    if (addr.isDefault && addr.id !== exceptId) {
      await db.update('addresses', addr.id, { isDefault: false });
    }
  }
}

/**
 * POST /api/addresses — accepts BOTH payload shapes:
 *  app: { title, fullName, phoneNumber, streetAddress, apartment, city, postalCode, latitude, longitude, deliveryInstructions }
 *  web: { address, latitude, longitude, isDefault }   (validated by schemas.address upstream)
 */
async function saveAddress(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const b = { ...(req.validated || {}), ...(req.body || {}) };
    const userId = req.user.uid;
    const isAppShape = b.streetAddress != null || b.fullName != null || b.city != null;

    const street = b.streetAddress || b.address;
    if (!street || String(street).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'A valid address (min 5 chars) is required' });
    }

    const isDefault = b.isDefault === true || b.isDefault === 'true' || (isAppShape && b.setAsDefault === true);
    if (isDefault) await unsetOtherDefaults(db, userId);

    const addressData = {
      userId,
      title: b.title || (isAppShape ? 'Home' : null),
      fullName: b.fullName || b.customerName || null,
      phoneNumber: b.phoneNumber || b.customerPhone || b.phone || null,
      streetAddress: String(street).trim(),
      apartment: b.apartment || null,
      city: b.city || 'Dar es Salaam',
      postalCode: b.postalCode || null,
      address: String(street).trim(),
      deliveryInstructions: b.deliveryInstructions || null,
      latitude: Number(b.latitude) || null,
      longitude: Number(b.longitude) || null,
      isDefault,
      createdAt: new Date().toISOString(),
    };

    const addrRef = await db.add('addresses', addressData);
    const saved = { id: addrRef.id, ...addressData };

    // App contract: ApiResponse<AddressDto> (data field)
    if (isAppShape) {
      return res.status(201).json({ success: true, data: toAppDto(saved) });
    }
    // Web contract: { success, address }
    return res.json({ success: true, address: saved });
  } catch (error) {
    console.error('Save address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getAddresses(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const addresses = await db.where('addresses', 'userId', '==', req.user.uid);

    // Dual response: app parses `data` (List<AddressDto>), web parses
    // `addresses` (raw rows). Sending both keeps every client working.
    return res.json({
      success: true,
      data: (addresses || []).map(toAppDto),
      addresses,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function updateAddress(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const address = await db.get('addresses', req.params.addressId);
    if (!address || address.userId !== req.user.uid) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const b = req.body || {};
    const patch = { updatedAt: new Date().toISOString() };
    if (b.title != null) patch.title = String(b.title);
    if (b.fullName != null) patch.fullName = String(b.fullName);
    if (b.phoneNumber != null) patch.phoneNumber = String(b.phoneNumber);
    if (b.streetAddress != null) { patch.streetAddress = String(b.streetAddress); patch.address = String(b.streetAddress); }
    if (b.apartment !== undefined) patch.apartment = b.apartment;
    if (b.city != null) patch.city = String(b.city);
    if (b.postalCode !== undefined) patch.postalCode = b.postalCode;
    if (b.deliveryInstructions !== undefined) patch.deliveryInstructions = b.deliveryInstructions;
    if (Number.isFinite(Number(b.latitude))) patch.latitude = Number(b.latitude);
    if (Number.isFinite(Number(b.longitude))) patch.longitude = Number(b.longitude);
    if (b.isDefault !== undefined) {
      patch.isDefault = !!b.isDefault;
      if (patch.isDefault) await unsetOtherDefaults(db, req.user.uid, address.id);
    }

    await db.update('addresses', address.id, patch);
    const updated = await db.get('addresses', address.id);
    return res.json({ success: true, data: toAppDto(updated || { ...address, ...patch }) });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function deleteAddress(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const { addressId } = req.params;
    const address = await db.get('addresses', addressId);
    if (!address || address.userId !== req.user.uid) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    await db.delete('addresses', addressId);
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function setDefaultAddress(req, res) {
  try {
    const db = await getDb(req);
    if (!db) return res.status(503).json({ success: false, error: 'Database not available' });

    const address = await db.get('addresses', req.params.addressId);
    if (!address || address.userId !== req.user.uid) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    await unsetOtherDefaults(db, req.user.uid, address.id);
    await db.update('addresses', address.id, { isDefault: true, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function addressRoutes(app) {
  const { verifyToken } = require('../middleware/auth');

  app.post('/api/addresses', verifyToken, saveAddress);
  app.get('/api/addresses', verifyToken, getAddresses);
  app.put('/api/addresses/:addressId', verifyToken, updateAddress);
  app.delete('/api/addresses/:addressId', verifyToken, deleteAddress);
  app.post('/api/addresses/:addressId/set-default', verifyToken, setDefaultAddress);
  app.post('/api/v1/addresses', verifyToken, saveAddress);
  app.get('/api/v1/addresses', verifyToken, getAddresses);
  app.put('/api/v1/addresses/:addressId', verifyToken, updateAddress);
  app.delete('/api/v1/addresses/:addressId', verifyToken, deleteAddress);
  app.post('/api/v1/addresses/:addressId/set-default', verifyToken, setDefaultAddress);
}

module.exports = { addressRoutes };
