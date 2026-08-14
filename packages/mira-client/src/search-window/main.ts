/**
 * 搜索窗口入口（Vite 多页入口 search-window.html）
 *
 * 轻量挂载：不初始化主应用（pinia / router / i18n / 插件系统）。
 */
import { createApp } from 'vue'
import SearchWindowApp from './SearchWindowApp.vue'

import '../renderer/assets/main.css'

createApp(SearchWindowApp).mount('#app')
