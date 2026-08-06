import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    // offscreen document 不在 manifest 入口内,@crxjs 不会自动构建,
    // 需显式声明为 Rollup 入口,否则 chrome.offscreen.createDocument 找不到文件
    // (整页截图拼接 / 选区截图裁剪依赖它)。按 @crxjs 约定源在 src/offscreen/ → 产物在 dist/src/offscreen/。
    rollupOptions: {
      input: { offscreen: 'src/offscreen/index.html' },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5175 },
  },
});
