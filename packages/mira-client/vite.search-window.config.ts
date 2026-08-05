import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

// 搜索窗口专用构建配置
export default defineConfig({
  root: process.cwd(),
  publicDir: false,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url))
    }
  },
  build: {
    outDir: 'dist-search',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'search-window': resolve(__dirname, 'src/search-window.html')
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    // 优化构建
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    },
    // 生成 sourcemap 用于调试
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  // CSS 配置
  css: {
    devSourcemap: true
  },
  // 只包含搜索窗口需要的依赖
  optimizeDeps: {
    include: [
      'vue',
      'pinia'
    ],
    exclude: [
      'vue-router', // 搜索窗口不需要路由
      '@electron/*'
    ]
  }
})
