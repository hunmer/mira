import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// 白板 dist 单页构建配置
//   - index.html → 自由画板组合窗口（左侧工程列表 + 右侧画布）
// 产物输出到 dist/，由插件窗口（PluginWindowHandlers）通过 loadFile 加载。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 直接消费 mira-app-core 已构建的 SDK esm 产物，避免引入其 node 依赖
      // （与 mira-plugin-ui demo 的做法一致）
      'mira-app-core/shared/sdk': fileURLToPath(
        new URL('../../../packages/mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs', import.meta.url),
      ),
      // mira-plugin-ui 源码入口（exports 子路径不支持目录导入，alias 到源码目录）
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
})
