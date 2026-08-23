import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.js',
      'web/**/*.test.js',
      'web/**/*.pbt.test.js',
      'test/ai/**/*.test.ts',
      'test/ai/**/*.test.js',
    ],
    // Legacy standalone Puppeteer scripts: self-invoking, console-assertion
    // based, no vitest suites. Run them directly with `node` if needed.
    exclude: [
      'node_modules',
      'dist',
      'build',
      'tests/admin.test.js',
      'tests/buying.test.js',
      'tests/e2e-checkout.test.js',
      'tests/e2e-driver-flow.test.js',
      'tests/functionality.test.js',
      'tests/marketing.test.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['validators/**/*.js', 'middleware/**/*.js'],
    },
    server: {
      deps: {
        inline: [/validators/, /middleware/]
      }
    }
  }
});
