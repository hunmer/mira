import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import vueDevTools from 'vite-plugin-vue-devtools'
import Inspect from 'vite-plugin-inspect'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

// 获取编辑器配置
function getEditor() {
  const editor = process.env.VUE_EDITOR || 'code'

  // 在 Windows 上，如果是 code/vscode，尝试找到完整路径
  if (process.platform === 'win32' && (editor === 'code' || editor === 'vscode')) {
    const possiblePaths = [
      resolve(process.env.USERPROFILE || '', 'AppData/Local/Programs/Microsoft VS Code/bin/code.cmd'),
      resolve('C:/Program Files/Microsoft VS Code/bin/code.cmd'),
      resolve('C:/Program Files (x86)/Microsoft VS Code/bin/code.cmd')
    ]

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path
      }
    }
  }

  return editor
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 只在开发环境启用 Vue DevTools
    ...(process.env.NODE_ENV !== 'production' ? [vueDevTools({
      launchEditor: getEditor()
    })] : []),
    // 只在开发环境启用 Vite Inspect
    ...(process.env.NODE_ENV !== 'production' ? [Inspect()] : []),
      electron([
        {
          // 主进程入口文件
          entry: 'src/main/main.ts',
          onstart(options) {
            // 只会在第一次 ready 时启动一次 Electron
            if (options.startup) {
              options.startup()
            }
          },
          vite: {
            build: {
              // 主进程也需要详细的 source map 以便调试
              sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
              minify: process.env.NODE_ENV === 'production',
              outDir: 'dist-main',
              rollupOptions: {
                external: ['electron', 'mira-server-sdk', 'electron-window-state'],
              },
              target: 'node18',
              emptyOutDir: true,
            },
            optimizeDeps: {
              exclude: ['electron']
            }
          },
        },
        {
          // 预加载脚本 - 支持多入口
          entry: {
            preload: 'src/preload/preload.ts',
            'search-preload': 'src/preload/search-preload.js'
          },
          onstart(options) {
            // 通知渲染进程重新加载页面
            options.reload()
          },
          vite: {
            build: {
              // 预加载脚本也需要 source map
              sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
              minify: process.env.NODE_ENV === 'production',
              outDir: 'dist-preload',
              rollupOptions: {
                external: ['electron'],
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].js'
                }
              },
              target: 'node18',
              emptyOutDir: true,
            },
            optimizeDeps: {
              exclude: ['electron']
            }
          },
        },
      ]),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@renderer': fileURLToPath(new URL('./src/renderer', import.meta.url)),
        '@main': fileURLToPath(new URL('./src/main', import.meta.url)),
        '@volt': fileURLToPath(new URL('./src/components/ui/volt', import.meta.url))
      }
    },
    base: './',
    build: {
      outDir: 'dist-renderer',
      target: 'chrome100',
      // 开发环境使用 'inline' 获得最佳调试体验，生产环境使用 true 保持性能
      sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      cssMinify: process.env.NODE_ENV === 'production',
      emptyOutDir: true,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'utils': ['lodash-es'],
          },
          // 优化 chunk 文件名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const fileName = assetInfo.name || 'unknown'
            const info = fileName.split('.')
            const extType = info[info.length - 1]
            
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(fileName)) {
              return 'assets/media/[name]-[hash].[ext]'
            }
            if (/\.(png|jpe?g|gif|svg|ico|webp|avif)(\?.*)?$/i.test(fileName)) {
              return 'assets/images/[name]-[hash].[ext]'
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(fileName)) {
              return 'assets/fonts/[name]-[hash].[ext]'
            }
            if (extType === 'css') {
              return 'assets/css/[name]-[hash].[ext]'
            }
            
            return 'assets/[name]-[hash].[ext]'
          }
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@coleqiu/vue-drag-select',
        'mira-server-sdk'
      ],
      exclude: [
        'electron'
      ],
      force: true
    },
    server: {
      port: 3000,
      strictPort: false, // 改为 false，避免端口冲突
      cors: true,
      host: 'localhost', // 添加 host 配置
      fs: {
        // 允许编辑器访问项目根目录外的文件
        allow: ['..']
      },
       watch: {
        ignored: ['**/configs/**', '**/*.md']
      }
    },
    // CSS 优化
    css: {
      devSourcemap: process.env.NODE_ENV === 'development',
      preprocessorOptions: {
        scss: {
          additionalData: `
            @import "@/renderer/assets/scss/variables.scss";
            @import "@/renderer/assets/scss/mixins.scss";
          `
        }
      }
    },
    // 构建性能优化
    esbuild: {
      ...(process.env.NODE_ENV === 'production' && {
        drop: ['debugger']  // 只删除 debugger,保留所有 console 输出
      })
    },
    // 定义全局变量
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: true,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    }
  })