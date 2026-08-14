/**
 * 悬浮球窗口入口（Vite 多页入口 floating-ball-window.html）
 *
 * 轻量挂载：不初始化主应用（pinia / router / i18n / 插件系统）。
 */
import { createApp } from 'vue'
import FloatingBallApp from './FloatingBallApp.vue'

import '../renderer/assets/main.css'

createApp(FloatingBallApp).mount('#app')
