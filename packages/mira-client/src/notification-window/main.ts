/**
 * 通知窗口入口（Vite 多页入口 notification-window.html）
 *
 * 轻量挂载：仅加载 vue-sonner Toaster 与主进程通信桥，
 * 不初始化主应用（pinia / router / i18n / 插件系统）。
 */
import { createApp } from 'vue'
import NotificationWindowApp from './NotificationWindowApp.vue'

import '../renderer/assets/main.css'
import 'vue-sonner/style.css'

createApp(NotificationWindowApp).mount('#app')
