import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.unit.test.ts', 'tests/**/*.integration.test.ts', 'tests/**/*.api.test.ts', 'tests/**/*.e2e.test.ts'],
    testTimeout: 30000,
  },
})
