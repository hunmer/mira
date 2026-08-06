import { createApp } from 'vue'
import App from './App.vue'
import { loadMaterialIcons } from '../shared/loadMaterialIcons'

// 工程管理 SPA 入口
// 由插件主界面窗口（PluginWindowHandlers）通过 loadFile('dist/index.html') 加载。
// 窗口内可用 window.electronAPI.pluginWindow（见 plugin-window-preload.js），
// 用于点击工程时再开画布子窗口。

// 插件窗口与主窗口字体隔离，必须先注入本地 Material Icons 字体，否则图标回退成文字
loadMaterialIcons()

createApp(App).mount('#app')
