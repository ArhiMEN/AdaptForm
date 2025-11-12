import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AdaptForm',
      formats: ['es'],          // только ESM
      fileName: () => `index.mjs`,
    },
    outDir: 'dist',             // dist/index.mjs + dist/index.d.ts
    rollupOptions: {
      external: [],             // зависимости, которые не нужно бандлить
    },
  },
  plugins: [
    dts({
      outputDir: 'dist',        // декларации .d.ts рядом с esm
      insertTypesEntry: true,   // создаёт index.d.ts для root
    })
  ]
})
