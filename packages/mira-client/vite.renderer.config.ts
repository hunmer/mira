import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

// 仅用于启动渲染进程开发服务器的配置
export default defineConfig({
  root: process.cwd(),
  publicDir: false,
  plugins: [
    vue(),
    // 只在开发环境启用 Vue DevTools
    ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url))
    }
  },
  // 开发服务器配置
  server: {
    port: 3000,
    strictPort: false, // 改为 false，如果端口被占用会自动尝试下一个
    cors: true,
    host: 'localhost',
    // 明确指定开发服务器的配置
    hmr: {
      port: 3001 // HMR 使用不同的端口避免冲突
    }
  },
  // CSS 优化
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/renderer/assets/scss/variables.scss";
          @import "@/renderer/assets/scss/mixins.scss";
        `
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia'
    ],
    exclude: [
      'electron',
      'mira-app-core/shared/sdk'
    ],
    force: true
  },
  // 定义全局变量
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },
  // 构建配置
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})
