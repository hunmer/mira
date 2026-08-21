import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 多选区裁切 SPA 构建配置（web/ 为 workspace 包，同 psd-viewer 模式）：
//   - dev：vite 开发服务器（纯浏览器调试 UI，无宿主时降级本地上传）
//   - build：产物输出本目录 dist/，由服务端 /server-plugins/<lib>/mira_image_cropper/ 托管，
//     插件窗口以 http URL 加载（server 插件路径）。
// mira-plugin-ui 按源码消费：alias 指向 node_modules 里的包源码（workspace symlink）。
// 不能直接走 package.json exports 子路径——exports 严格匹配不做目录/扩展名推断
// （import 'mira-plugin-ui/src/components/ui/button' 目录解析会失败）；
// 路径只依赖本包 node_modules，插件目录整体迁移后 pnpm install 即可构建。
// 其组件的原子类由本插件 tailwind 入口的 @source 扫描编译（见 src/tailwind.css）。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'mira-plugin-ui/src': fileURLToPath(new URL('./node_modules/mira-plugin-ui/src', import.meta.url)),
      // mira-plugin-ui 的 library 组件引用 SDK，按已构建的 esm 产物消费（同 image-search），
      // 避免引入 mira-app-core 的 node 端依赖；同样经 node_modules 解析保持自包含。
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
  server: { port: 5175 },
})
