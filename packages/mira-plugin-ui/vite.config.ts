import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 库构建：vue 由宿主提供（CDN/外部），其余依赖全部打进 bundle，
// 产物 dist/mira-plugin-ui.{es,umd}.js + dist/mira-plugin-ui.css 自包含可独立引用。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // demo 直接消费 mira-app-core 已构建的 SDK dist，不引入其 node 依赖
      'mira-app-core/shared/sdk': path.resolve(__dirname, '../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs'),
    },
  },
  // server 无 CORS，demo dev 经 vite 代理访问，前端 apiBaseUrl 填 /mira-api
  server: {
    proxy: {
      '/mira-api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/mira-api/, ''),
      },
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
      name: 'MiraPluginUI',
      fileName: format => `mira-plugin-ui.${format}.js`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: 'mira-plugin-ui.[ext]',
      },
    },
  },
})
