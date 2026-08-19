import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ['vue'],
    alias: [
      {
        // pnpm 下 reka-ui(mira-plugin-ui 依赖)与宿主各自解析 vue 会得到不同物理路径 → 双实例 → slot 渲染崩溃。
        // 强制所有裸 'vue' 指向同一份 runtime,保证测试环境单实例。
        find: /^vue$/,
        replacement: fileURLToPath(
          new URL('./node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url),
        ),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // vue 及 plugin-ui 链上的包若被 node 直载(external),pnpm/npm 双 node_modules 会绕过
        // 上面的 alias 解析出两份 vue → 双实例 → slot/inject 崩溃;inline 后统一走 vite 解析
        inline: [/\/vue\//, /@vue\//, /reka-ui/, /@lucide\/vue/, /@vueuse\/core/],
      },
    },
  },
});
