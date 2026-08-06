import { createApp } from 'vue'
import App from './App.vue'

// 白板 dist SPA 入口
// 由插件窗口（PluginWindowHandlers）通过 loadFile('dist/index.html?projectId=...') 加载。
// 工程标识 projectId 从 location.search 读取，用于区分不同工程的画布持久化。
createApp(App).mount('#app')
