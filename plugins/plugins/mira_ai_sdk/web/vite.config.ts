import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// AI 图片生成器 SPA（同 mira_image_cropper/web 模式）：
//   - build 产物输出本目录 dist/，由服务端 /server-plugins/<lib>/mira_ai_sdk/ 托管，
//     插件窗口以 http URL 加载（宿主 openPluginWindow 自动注入 ?server=&token=&libraryId=）。
//   - mira-plugin-ui 按源码消费（alias 指向 node_modules symlink），其原子类由
//     src/tailwind.css 的 @source 一并编译。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'mira-plugin-ui/src': fileURLToPath(new URL('./node_modules/mira-plugin-ui/src', import.meta.url)),
      // library/ 组件（MediaPickerDialog 等）引用 SDK，按已构建 esm 产物消费，避免引入 node 端依赖
      'mira-app-core/shared/sdk': fileURLToPath(
        new URL('./node_modules/mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs', import.meta.url),
      ),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome100',
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  server: { port: 5176 },
})
