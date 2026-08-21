import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 视频剪辑器构建配置
//   - dev：vite 开发服务器（浏览器直接调试 UI，宿主 API 走降级分支）
//   - build：产物输出 dist/，由插件窗口 loadFile('dist/index.html') 加载
// mira-plugin-ui 按源码消费（同 image-search）：alias 到组件源码目录，
// 原子类由本插件 tailwind 入口 @source 扫描编译。
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
    rollupOptions: {
      output: {
        // 插件窗口经 file:// loadFile 加载，运行时动态 import 分包 chunk 会被拦截，
        // 打包时内联回单文件产物
        inlineDynamicImports: true,
      },
    },
  },
  // 避开 image-search 的 5174
  server: { port: 5175 },
})
