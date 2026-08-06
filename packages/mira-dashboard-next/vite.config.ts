import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  // 部署在 app-server 的 /dashboard 路径下，构建产物资源需使用 /dashboard/ 前缀
  base: '/dashboard/',
  plugins: [
    vue(),
    ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },
})
