import {defineConfig} from 'vite';
import {resolve} from 'path';

export defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'adaptform',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`
    },
    rolldownOptions: {
      external: ['luxon'],
      output: {
        globals: {
          luxon: 'luxon'
        }
      }
    }
  }
})