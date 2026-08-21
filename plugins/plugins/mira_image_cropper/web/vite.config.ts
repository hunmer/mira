import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 多选区裁切 SPA 构建配置（web/ 为 workspace 包，同 psd-viewer 模式）：
//   - dev：vite 开发服务器（纯浏览器调试 UI，无宿主时降级本地上传）
//   - build：产物输出本目录 dist/，由服务端 /server-plugins/<lib>/mira_image_cropper/ 托管，
//     插件窗口以 http URL 加载（server 插件路径）。
// mira-plugin-ui 按源码消费（同 image-search）：alias 到组件源码目录，
// 原子类由本插件 tailwind 入口 @source 扫描编译。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'mira-plugin-ui/src': fileURLToPath(
        new URL('../../../../packages/mira-plugin-ui/src', import.meta.url),
      ),
    },
  },
  // 相对路径打包：iframe / 独立窗口 / file:// 下均能正确加载资源
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome100',
    rollupOptions: {
      output: {
        // file:// 加载时动态 import 分包 chunk 会被拦截，保留单文件产物（同 image-search）。
        inlineDynamicImports: true,
      },
    },
  },
  server: { port: 5175 },
})
