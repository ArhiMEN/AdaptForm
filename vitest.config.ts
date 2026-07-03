import { defineConfig } from 'vitest/config'

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
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/luxon.ts', 'src/core/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@core': '/home/stas/PycharmProjects/adaptform/src/core',
    },
  },
})
