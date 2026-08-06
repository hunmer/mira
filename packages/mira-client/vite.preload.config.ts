import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        preload: resolve(__dirname, 'src/preload/preload.ts'),
        'search-preload': resolve(__dirname, 'src/preload/search-preload.js'),
        'notification-preload': resolve(__dirname, 'src/preload/notification-preload.js'),
        'floating-ball-preload': resolve(__dirname, 'src/preload/floating-ball-preload.js'),
        'plugin-window-preload': resolve(__dirname, 'src/preload/plugin-window-preload.js')
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js'
      },
      external: [
        'electron'
      ],
    },
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production',
    outDir: 'dist-preload',
    target: 'node18',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    exclude: ['electron']
  }
})
