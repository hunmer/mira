import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite 配置文件，用于将 mira-server-sdk 打包成 ESM 单文件
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'MiraSDK',
      fileName: 'mira-sdk.esm',
      formats: ['es']
    },
    rollupOptions: {
      // 将 axios 和 form-data 打包进去，创建一个完全独立的文件
      external: [],
      output: {
        format: 'es',
        entryFileNames: 'mira-sdk.esm.js',
        inlineDynamicImports: true
      }
    },
    target: 'es2020',
    minify: false, // 开发时不压缩，便于调试
    sourcemap: true
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
