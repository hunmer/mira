import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { dirname, resolve } from 'node:path'

// ESM 下没有 __dirname，从 import.meta.url 派生
const __dirname = dirname(fileURLToPath(import.meta.url))

// 白板 dist SPA 构建配置（多页）
//   - index.html  → 工程管理（插件主界面窗口加载）
//   - canvas.html → 画布（工程管理窗口再开的子窗口加载）
// 产物输出到 dist/，由插件窗口（PluginWindowHandlers）通过 loadFile 加载。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 资源相对路径，确保 loadFile 加载本地文件时资源能正确解析
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome100',
    rollupOptions: {
      // 多页入口：每个 html 一个独立 chunk
      input: {
        main: resolve(__dirname, 'index.html'),
        canvas: resolve(__dirname, 'canvas.html'),
      },
    },
  },
})
