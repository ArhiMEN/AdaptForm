import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const sourceDirectory = fileURLToPath(new URL('./src/core', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/testUtils.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/helpers/**', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**', 'demo/**/*.ts', 'scripts/check-package-content.mjs'],
      exclude: ['src/index.ts', 'src/luxon.ts', 'src/core/index.ts', 'demo/vite.config.ts'],
    },
  },
  resolve: {
    alias: {
      '@core': sourceDirectory,
    },
  },
})
