import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js', 'web/**/*.test.js', 'web/**/*.pbt.test.js'],
    exclude: ['node_modules', 'dist', 'build'],
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
