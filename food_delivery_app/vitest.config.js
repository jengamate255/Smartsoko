import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['web/**/*.test.js', 'web/**/*.pbt.test.js'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['web/**/*.js'],
      exclude: ['web/**/*.test.js', 'web/**/*.pbt.test.js']
    }
  }
});
