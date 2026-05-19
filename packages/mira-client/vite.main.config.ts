import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: 'main'
    },
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production',
    outDir: 'dist-main',
    rollupOptions: {
      external: [
        'electron',
        'node:path',
        'node:fs',
        'node:os',
        'path',
        'fs',
        'os'
      ],
    },
    target: 'node18',
    emptyOutDir: true,
    ssr: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    exclude: ['electron']
  },
  ssr: {
    target: 'node',
    noExternal: [
      'electron-log',
      'electron-updater',
      'electron-window-state',
      'mira-server-sdk'
    ]
  }
})
