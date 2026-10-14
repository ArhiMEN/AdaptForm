import {fileURLToPath} from 'node:url'
import process from 'node:process'
import {resolve} from 'node:path'
import {defineConfig} from 'vite'

const demoRoot = fileURLToPath(new URL('.', import.meta.url))
const sourceRoot = resolve(demoRoot, '../src')

export default defineConfig({
  root: demoRoot,
  base: process.env.NODE_ENV === 'production' ? '/AdaptForm/' : '/',
  resolve: {
    alias: {
      '@core': resolve(sourceRoot, 'core'),
    },
  },
  build: {
    outDir: resolve(demoRoot, '../dist-demo'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
  },
})
