import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Pinterest 视觉搜索 v2 构建配置
//   - dev：vite 开发服务器（浏览器直接调试 UI，宿主 API 走 dev mock）
//   - build：产物输出 dist/，由插件窗口 loadFile('dist/index.html') 加载
// mira-plugin-ui 按源码消费（同 mira-whiteboard）：alias 到组件源码目录，
// 原子类由本插件 tailwind 入口 @source 扫描编译（dist 产物不含 alert-dialog
// Action/Cancel 与 empty 子组件，直接用 dist 会缺导出）。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'mira-plugin-ui/src': fileURLToPath(
        new URL('../../../packages/mira-plugin-ui/src', import.meta.url),
      ),
    },
  },
  // 资源相对路径，确保 loadFile 加载本地文件时资源能正确解析
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome100',
  },
  // 避开 mira-plugin-ui demo 的 5173
  server: { port: 5174 },
})
