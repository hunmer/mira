import path from 'node:path'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// 获取编辑器配置（Windows 上 code 不一定在 PATH，查找 code.cmd 完整路径）
function getEditor() {
  const editor = process.env.VUE_EDITOR || 'code'
  if (process.platform === 'win32' && (editor === 'code' || editor === 'vscode')) {
    const possiblePaths = [
      path.resolve(process.env.USERPROFILE || '', 'AppData/Local/Programs/Microsoft VS Code/bin/code.cmd'),
      path.resolve('C:/Program Files/Microsoft VS Code/bin/code.cmd'),
      path.resolve('C:/Program Files (x86)/Microsoft VS Code/bin/code.cmd'),
    ]
    for (const p of possiblePaths) {
      if (existsSync(p)) return p
    }
  }
  return editor
}

// 库构建：vue 由宿主提供（CDN/外部），其余依赖全部打进 bundle，
// 产物 dist/mira-plugin-ui.{es,umd}.js + dist/mira-plugin-ui.css 自包含可独立引用。
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // 仅 dev server 生效（apply: 'serve'），不影响 lib 构建
    vueDevTools({
      launchEditor: getEditor(),
      componentInspector: {
        // Ctrl+Alt+D 触发审查元素模式，点击页面元素跳转到 IDE 对应代码
        toggleComboKey: 'control-alt-d',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // demo 直接消费 mira-app-core 已构建的 SDK dist，不引入其 node 依赖
      'mira-app-core/shared/sdk': path.resolve(__dirname, '../mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs'),
    },
  },
  // server 无 CORS，demo dev 经 vite 代理访问，前端 apiBaseUrl 填 /mira-api
  server: {
    proxy: {
      '/mira-api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/mira-api/, ''),
      },
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
      name: 'MiraPluginUI',
      fileName: format => `mira-plugin-ui.${format}.js`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: { vue: 'Vue' },
        assetFileNames: 'mira-plugin-ui.[ext]',
      },
    },
  },
})
