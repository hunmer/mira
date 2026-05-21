import { defineConfig } from 'vite'
import { resolve } from 'path'

// 用于创建可在 HTML 中直接使用的 UMD 版本
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'MiraSDK',
      fileName: 'mira-sdk.umd',
      formats: ['umd']
    },
    rollupOptions: {
      external: [],
      output: {
        format: 'umd',
        name: 'MiraSDK',
        entryFileNames: 'mira-sdk.umd.js',
        inlineDynamicImports: true,
        globals: {}
      }
    },
    target: 'es2020',
    minify: true,
    sourcemap: true
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
