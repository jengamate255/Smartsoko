/**
 * Product image storage — Supabase Storage.
 *
 * The browser cannot write here: the `product-images` bucket denies anon
 * inserts (row-level security), so uploads go through the service-role client
 * like every other server-side Supabase write. Objects land under
 * products/{merchantId}/, the layout the native merchant app already uses.
 */
'use strict';

const BUCKET = 'product-images';
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase storage is not configured');
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key, { auth: { persistSession: false } });
}

/** Keys are user-influenced once the merchant id is, so strip path syntax. */
function safeSegment(value) {
    return String(value || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'shared';
}

async function upload({ merchantId, buffer, mimeType }) {
    const ext = EXTENSION[mimeType] || 'jpg';
    const objectPath = `products/${safeSegment(merchantId)}/${Date.now()}.${ext}`;
    const { error } = await storage().storage.from(BUCKET).upload(objectPath, buffer, {
        contentType: mimeType,
        upsert: false,
    });
    if (error) throw new Error(error.message || 'Storage upload failed');
    return {
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`,
        path: objectPath,
    };
}

module.exports = { upload, BUCKET };
