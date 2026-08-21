import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 格式转换 SPA 构建配置（同 mira_image_cropper 模式）：
//   - build：产物输出本目录 dist/，由服务端 /server-plugins/<lib>/mira_format_converter/ 托管，
//     插件窗口以 http URL 加载。
// mira-plugin-ui 按源码消费：alias 指向 node_modules 里的包源码（workspace symlink），
// 不能直接走 package.json exports 子路径（exports 严格匹配不做目录/扩展名推断）。
// 其组件的原子类由本插件 tailwind 入口的 @source 扫描编译（见 src/tailwind.css）。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'mira-plugin-ui/src': fileURLToPath(new URL('./node_modules/mira-plugin-ui/src', import.meta.url)),
      'mira-app-core/shared/sdk': fileURLToPath(
        new URL('./node_modules/mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs', import.meta.url),
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
  server: { port: 5176 },
})
