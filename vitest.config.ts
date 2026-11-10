import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'lcov'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
