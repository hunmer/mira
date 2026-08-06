/**
 * 插件窗口专用 preload 脚本
 *
 * 加载在 PluginWindowHandlers 创建的独立 BrowserWindow 中（即插件 dist SPA）。
 * 作用：暴露一个最小白名单的 electronAPI，让插件主界面能够
 *   - 再次打开插件窗口（例如自由画板的管理界面里点击工程 → 弹出画布窗口）
 *   - 设置本窗口的专属菜单栏（win.setMenu，Windows/Linux 生效），
 *     并接收菜单点击事件（plugin-window:menu-action）。
 *
 * 与主 preload 的区别：这里只暴露 pluginWindow.{open,close,send,setMenu,onMessage,onMenuAction}，
 * 不暴露文件系统 / 拖拽 / 插件管理等其它能力，遵循最小权限原则。
 */
const { ipcRenderer, contextBridge } = require('electron')

console.log('🪟 [plugin-window-preload] 已加载')

contextBridge.exposeInMainWorld('electronAPI', {
  pluginWindow: {
    open: (opts) => ipcRenderer.invoke('plugin-window:open', opts),
    close: (windowId) => ipcRenderer.invoke('plugin-window:close', windowId),
    send: (pluginId, entry, channel, data) => ipcRenderer.invoke('plugin-window:send', pluginId, entry, channel, data),
    onMessage: (callback) => {
      const listener = (_event, channel, data) => callback(channel, data)
      ipcRenderer.on('plugin-window:message', listener)
      return () => ipcRenderer.removeListener('plugin-window:message', listener)
    },
    // 设置本窗口菜单栏：传入 Electron 菜单模板（支持 {action, role, type:'separator'...}）。
    setMenu: (template) => ipcRenderer.invoke('plugin-window:set-menu', template),
    // 监听本窗口菜单的点击回调（payload 为模板里带 action 的项，含 action 与任意附加字段）。
    onMenuAction: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('plugin-window:menu-action', listener)
      return () => ipcRenderer.removeListener('plugin-window:menu-action', listener)
    },
  },
})

console.log('🪟 [plugin-window-preload] 初始化完成')
