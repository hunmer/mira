/**
 * Dashboard 窗口专用 preload 脚本
 *
 * 加载在 AppHandlers.handleOpenUrl 以 { dashboard:true } 标记打开的 dashboard 窗口中，
 * 即 mira-app-server 的 /dashboard 页面。作用：暴露一个最小白名单的 electronAPI，
 * 让 dashboard 的「设置 → 下载」页面能够：
 *   - 触发主进程弹出登录子窗口（openLoginWindow）
 *   - 接收主进程回传的 cookie（onLoginCookies）
 *
 * 与主 preload 的区别：这里只暴露下载 cookie 相关能力，不暴露文件系统 /
 * 拖拽 / 插件管理等其它能力，遵循最小权限原则。
 */
const { ipcRenderer, contextBridge } = require('electron')

console.log('🪟 [dashboard-preload] 已加载')

contextBridge.exposeInMainWorld('electronAPI', {
  // 打开登录子窗口，由主进程 new BrowserWindow 加载目标站点并设置【我已登录】菜单
  openLoginWindow: (siteId, url) => ipcRenderer.invoke('dashboard:open-login-window', siteId, url),
  // 监听主进程回传的 cookie（来自登录子窗口的【我已登录】菜单点击）
  onLoginCookies: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('dashboard:login-cookies', listener)
    return () => ipcRenderer.removeListener('dashboard:login-cookies', listener)
  },
})

console.log('🪟 [dashboard-preload] 初始化完成')
