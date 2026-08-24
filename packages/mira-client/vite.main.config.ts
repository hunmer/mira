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
        '@hunmer/procm-mcp-sdk',
      'mira-app-core/shared/sdk',
      // electron-updater / fs-extra 内联后仍会在运行时 require 的传递依赖，
      // asar 内没有 node_modules，必须一并打进 main bundle
      'fs-extra', 'jsonfile', 'mkdirp', 'universalify', 'graceful-fs',
      'js-yaml', 'lazy-val', 'lodash.escaperegexp', 'lodash.isequal',
      'semver', 'tiny-typed-emitter', 'builder-util-runtime',
      'debug', 'ms', 'sax'
    ]
  }
})
