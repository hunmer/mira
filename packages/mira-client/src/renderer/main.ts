import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupGlobalErrorHandler } from './utils/errorHandler'
import { useSettingsStore } from './stores/settings'
import { exposeMiraSDKToWindow } from './web-globals'
import { environment } from './utils'
// import { initializeGlobalPluginSystem } from './services/GlobalPluginManager' // 移动到 InitializationService 中

// 初始化 MiraAPI
import './api/MiraAPI'
import { miraAPI } from './api/MiraAPI'

// 初始化插件系统
import './services/PluginSystemCore'

// v-viewer setup
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'

// vue3-lazyload setup
import VueLazyload from 'vue3-lazyload'

import './assets/main.css'
// vue-sonner 样式需独立加载：放在 main.css（经 Tailwind v4 PostCSS 处理）中会被
// @import 链 / layer 重排影响，导致 [data-sonner-toaster] 的 position/z-index 失效，
// toast 会以纯文本形式出现在 body 顶部。作为独立 JS 导入则由 Vite 直接管为单独 CSS 资源。
import 'vue-sonner/style.css'

// @hunmer/vue-masonry 瀑布流组件样式(scoped CSS 产物,需独立引入)
import '@hunmer/vue-masonry/style.css'

// grid-layout-plus 仪表盘布局样式（v2 单独发布 style.css，需在入口引入一次）
import 'grid-layout-plus/style.css'

// 设置全局错误处理
setupGlobalErrorHandler()

// 在 web 环境中暴露 Mira SDK 到全局对象
exposeMiraSDKToWindow()

const app = createApp(App)
const pinia = createPinia()

// 安装插件
app.use(pinia)
app.use(router)
app.use(VueViewer)
app.use(VueLazyload, {
  loading: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Cpath d='M85 85h30v30H85z' fill='%23d1d5db' opacity='0.5'/%3E%3C/svg%3E",
  error: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Cpath d='M85 85h30v30H85z M75 75l50 50m0-50L75 125' stroke='%23999' stroke-width='2' fill='none'/%3E%3C/svg%3E",
  attempt: 1, // 每个图片只尝试加载一次，加载失败后不再重试
  // WARNING: 性能问题
  // observerOptions: {
  //   rootMargin: '50px', // 提前50px开始加载
  //   threshold: 0.1
  // }
})

// Vue 全局错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.error('Vue error:', err, info)
  // 可以在这里集成错误监控服务
}

// 全局警告处理
app.config.warnHandler = (msg, _instance, trace) => {
  console.warn('Vue warning:', msg, trace)
}

// 应用初始化
const initializeApp = async () => {
  try {
    // 先初始化设置
    const settingsStore = useSettingsStore()
    await settingsStore.initialize()

    // Web 环境的在线插件已由 settingsStore 恢复，这里同步到插件 Store 并注入入口脚本。
    if (!environment.isElectron && miraAPI.pluginService.initialized) {
      const { usePluginStore } = await import('./stores/plugin')
      const pluginStore = usePluginStore()
      await pluginStore.loadLocalPlugins()
      for (const plugin of pluginStore.localPlugins.filter(plugin => plugin.status === 'loaded')) {
        await pluginStore.enableLocalPluginNew(plugin.config.pluginId)
      }
    }
    
    // 在 Electron 环境下初始化菜单服务
    if (environment.isElectron) {
      await miraAPI.menu.initialize()
      
      // 基于路由信息更新导航菜单
      const routes = router.getRoutes().filter(route => !route.meta?.hideInNav)
      miraAPI.menu.updateNavigationFromRoutes(routes)
      
      // 监听菜单导航事件
      if (window.electronAPI) {
        window.electronAPI.on('menu:navigate', (routeName: string) => {
          router.push({ name: routeName }).catch(() => {})
        })

        window.electronAPI.on('menu:disconnect', () => {
          // TODO: 断开连接
        })

        window.electronAPI.on('menu:export', () => {
          // TODO: 导出功能
        })

        window.electronAPI.on('menu:refresh', () => {
          window.location.reload()
        })

        window.electronAPI.on('files:import', (_filePaths: string[]) => {
          // TODO: 文件导入
        })
      }
    }
    
  } catch (error) {
    console.error('Failed to initialize application:', error)
  } finally {
    // 无论初始化是否成功，都要挂载应用，让用户能看到界面
    app.mount('#app')
  }
}

// 先初始化应用，再挂载
initializeApp()
