const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
let cachedSecret;
function secret() {
  if (process.env.ORDER_ACCESS_SECRET) return process.env.ORDER_ACCESS_SECRET;
  if (cachedSecret) return cachedSecret;
  const directory = process.env.IDEMPOTENCY_DIR || path.resolve(__dirname, '../../../.runtime/idempotency');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'guest-access.secret');
  try { fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const value = fs.readFileSync(file, 'utf8');
  if (value.length < 32) throw new Error('Guest access secret unavailable');
  return (cachedSecret = value);
}
function issueOrderAccess(id) {
  const body = Buffer.from(JSON.stringify({ id, expires: Date.now() + 30 * 86400000 })).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}
function verifyOrderAccess(token, id) {
  if (typeof token !== 'string' || token.length > 1000) return false;
  try {
    const [body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', secret()).update(body).digest();
    const supplied = Buffer.from(signature || '', 'base64url');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return data.id === id && data.expires > Date.now();
  } catch (_) { return false; }
}
module.exports = { issueOrderAccess, verifyOrderAccess };
