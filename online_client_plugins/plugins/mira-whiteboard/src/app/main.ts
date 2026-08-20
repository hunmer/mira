import { createApp } from 'vue'
import App from './App.vue'
import { loadMaterialIcons } from '../shared/loadMaterialIcons'
// mira-plugin-ui（源码入口）组件的 tailwind 样式环境与 shadcn token
import './tailwind.css'

// 自由画板组合窗口入口
// 由插件窗口（PluginWindowHandlers）通过 loadFile('dist/index.html') 加载。
// 一个窗口同时承载：左侧工程列表 + 右侧画布，并自定义本窗口的 Electron 菜单栏
// （【项目】子菜单列出工程、点击切换画布）。
//
// 窗口内可用 window.electronAPI.pluginWindow（见 plugin-window-preload.js）：
//   - setMenu(template)        设置本窗口菜单栏
//   - onMenuAction(callback)   监听菜单点击（payload 含 action/projectId）
//   - onMessage(callback)      接收宿主侧 pluginWindow.send 投递的消息（如 media:add）

// 插件窗口与主窗口字体隔离，必须先注入本地 Material Icons 字体，否则图标回退成文字
loadMaterialIcons()

createApp(App).mount('#app')
