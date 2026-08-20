import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// CEP 9(Photoshop 2020)内嵌 Chromium 61:
// - target chrome61:esbuild 把可选链/空值合并等新语法降级(仅语法,API 缺口由 src/polyfills.ts 补)
// - base './':面板以 file:// 加载,资源必须相对路径
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 与 mira-plugin-ui demo 一致:直接消费 mira-app-core 已构建的 SDK dist,不引入其 node 依赖
      'mira-app-core/shared/sdk': path.resolve(__dirname, '../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome61',
    cssCodeSplit: false,
    // material-icons 字体内联进 CSS,保持产物可直接镜像同步到扩展目录
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        // 文件名去 hash:同步到 PS 扩展目录后文件集稳定,便于增量比对
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
