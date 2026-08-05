import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['store/**/*.test.ts', 'store/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'build', '.expo'],
    setupFiles: ['./store/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['store/**/*.ts', 'store/**/*.tsx'],
    },
  },
});