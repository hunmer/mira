import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

// Windows 上 code 命令需解析为完整路径，launch-editor 才能打开 IDE（同 mira-client）
function getEditor() {
  const editor = process.env.VUE_EDITOR || 'code'
  if (process.platform === 'win32' && (editor === 'code' || editor === 'vscode')) {
    const possiblePaths = [
      resolve(process.env.USERPROFILE || '', 'AppData/Local/Programs/Microsoft VS Code/bin/code.cmd'),
      resolve('C:/Program Files/Microsoft VS Code/bin/code.cmd'),
      resolve('C:/Program Files (x86)/Microsoft VS Code/bin/code.cmd')
    ]
    for (const path of possiblePaths) {
      if (existsSync(path)) return path
    }
  }
  return editor
}

// 视频剪辑器构建配置
//   - dev：vite 开发服务器（浏览器直接调试 UI，宿主 API 走降级分支）
//   - build：产物输出 dist/，由插件窗口 loadFile('dist/index.html') 加载
// mira-plugin-ui 按源码消费（同 image-search）：alias 到组件源码目录，
// 原子类由本插件 tailwind 入口 @source 扫描编译。
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    // 只在 dev server 启用 Vue DevTools（build 产物走 file:// 加载，不注入）
    ...(command === 'serve'
      ? [
          vueDevTools({
            launchEditor: getEditor(),
            componentInspector: {
              // Ctrl+Shift+D 触发审查元素模式，点击页面元素跳转到 IDE 对应代码
              toggleComboKey: 'control-shift-d',
            },
          }),
        ]
      : []),
  ],
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
}))
