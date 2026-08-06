import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 白板 dist 单页构建配置
//   - index.html → 自由画板组合窗口（左侧工程列表 + 右侧画布）
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
  },
})
