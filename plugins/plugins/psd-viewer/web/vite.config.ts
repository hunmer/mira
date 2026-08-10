import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 相对路径打包：iframe / 独立窗口 / file:// 下均能正确加载资源
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome100' },
})
