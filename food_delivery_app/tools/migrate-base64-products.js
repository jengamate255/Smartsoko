/**
 * One-off migration: products.image_url holds inline base64 JPEGs (~0.5–0.9MB
 * each) that make every SELECT * on the products table transfer megabytes —
 * the root cause of the 8–50s /api/categories (and merchant product list)
 * latency. Decode each blob to public/uploads/product-<id>.jpg and replace
 * the column value with the served URL.
 *
 * Run once: node tools/migrate-base64-products.js
 */
require('dotenv').config({ path: 'E:/Project/notsmartsoko/Smartsoko/food_delivery_app/.env' });
const fs = require('fs');
const path = require('path');
const { Client } = require('E:/Project/notsmartsoko/Smartsoko/food_delivery_app/node_modules/pg');

const UPLOAD_DIR = 'E:/Project/notsmartsoko/Smartsoko/food_delivery_app/public/uploads';
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await c.connect();

  const { rows } = await c.query(
    "SELECT id, name, image_url FROM products WHERE image_url LIKE 'data:image/%' ORDER BY created_at"
  );
  console.log('products with inline base64 images:', rows.length);

  for (const row of rows) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(row.image_url || '');
    if (!m) { console.log(row.id.slice(0, 8), '— unrecognized data URL, skipping'); continue; }
    const mime = m[1];
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const file = `product-${row.id}.${ext}`;
    const buf = Buffer.from(m[2], 'base64');
    fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
    const url = `/uploads/${file}`;
    await c.query('UPDATE products SET image_url = $1 WHERE id = $2', [url, row.id]);
    console.log(row.id.slice(0, 8), '|', row.name, '->', url, `(${(buf.length / 1024).toFixed(0)} KB)`);
  }

  await c.end();
  console.log('done');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
