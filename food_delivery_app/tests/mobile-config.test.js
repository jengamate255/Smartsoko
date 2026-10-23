import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { publicMobileEnv } = require('../scripts/prepare-mobile-env.cjs');
const dotenv = require('dotenv');

describe('Android configuration packaging', () => {
  it('includes client settings and excludes server and payment secrets', () => {
    const output = dotenv.parse(publicMobileEnv({
      SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-client-key',
      SUPABASE_SERVICE_KEY: 'private-service-key', PESAPAL_CONSUMER_SECRET: 'private-payment-key',
      FIREBASE_PROJECT_ID: 'example', SKIP_FIREBASE: 'true',
    }));
    expect(output).toEqual({
      SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'public-client-key',
      FIREBASE_PROJECT_ID: 'example', SKIP_FIREBASE: 'true',
    });
  });
  it('bundles the public asset rather than the server environment file', () => {
    const pubspec = fs.readFileSync(new URL('../pubspec.yaml', import.meta.url), 'utf8');
    expect(pubspec).toMatch(/- assets\/config\/\.env/);
    expect(pubspec).not.toMatch(/^\s*- \.env\s*$/m);
  });
});
