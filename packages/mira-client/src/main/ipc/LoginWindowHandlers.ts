import { ipcMain, BrowserWindow, Menu } from 'electron'
import { logger } from '../utils/Logger'
import type { AppHandlers } from './AppHandlers'

/**
 * 登录子窗口处理器
 *
 * 配合 dashboard 窗口的「设置 → 下载」页面使用：
 *   dashboard 渲染进程调用 window.electronAPI.openLoginWindow(siteId, url)
 *   → 主进程 new BrowserWindow 加载目标站点，并设置菜单含【我已登录】
 *   → 用户登录后点【我已登录】→ 主进程从该窗口 session 读取 cookie
 *   → 通过 dashboard 窗口 webContents.send 回传 { siteId, cookies }
 *   → 关闭登录子窗口
 *
 * 依赖 AppHandlers.getDashboardWindow() 拿到当前 dashboard 窗口引用。
 */
export class LoginWindowHandlers {
  /** siteId → BrowserWindow，同一站点复用 */
  private windows = new Map<number, BrowserWindow>()
  private appHandlers: AppHandlers

  constructor(appHandlers: AppHandlers) {
    this.appHandlers = appHandlers
  }

  public registerHandlers(): void {
    ipcMain.handle('dashboard:open-login-window', this.handleOpen.bind(this))
    logger.info('LoginWindowHandlers', 'Login window IPC handlers registered')
  }

  private async handleOpen(
    _event: Electron.IpcMainInvokeEvent,
    siteId: number,
    url: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (!siteId || !url || typeof url !== 'string') {
        return { success: false, message: 'siteId/url 不能为空' }
      }

      // 复用已存在的窗口
      const existing = this.windows.get(siteId)
      if (existing && !existing.isDestroyed()) {
        existing.show()
        existing.focus()
        return { success: true }
      }

      const win = new BrowserWindow({
        width: 1100,
        height: 750,
        title: '登录',
        frame: true,
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      })

      this.windows.set(siteId, win)
      win.on('closed', () => { this.windows.delete(siteId) })

      // 自定义菜单：含【我已登录】按钮（win.setMenu 仅 Win/Linux 生效；macOS 仍走全局菜单）
      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: '操作',
          submenu: [
            {
              label: '我已登录',
              click: () => this.extractAndForward(siteId, url, win),
            },
            { type: 'separator' },
            { label: '刷新', role: 'reload' },
            { label: '关闭', role: 'close' },
          ],
        },
      ]
      win.setMenu(Menu.buildFromTemplate(template))

      win.once('ready-to-show', () => { win.show(); win.focus() })

      await win.loadURL(url)
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('LoginWindowHandlers', `Failed to open login window: ${msg}`)
      return { success: false, message: msg }
    }
  }

  /**
   * 从登录子窗口的 session 读取目标 URL 的 cookie，回传给 dashboard 窗口，然后关闭子窗口。
   * 同时尝试按 hostname 取父域 cookie，合并去重。
   */
  private async extractAndForward(siteId: number, url: string, win: BrowserWindow): Promise<void> {
    try {
      if (win.isDestroyed()) return
      const ses = win.webContents.session

      // 优先按 url 取，再按 hostname 兜底（覆盖父域 cookie）
      let cookies: Electron.Cookie[] = []
      try { cookies = await ses.cookies.get({ url }) } catch { /* ignore */ }
      let hostCookies: Electron.Cookie[] = []
      try {
        const host = new URL(url).hostname
        hostCookies = await ses.cookies.get({ domain: host })
      } catch { /* ignore */ }

      // 合并去重（name + domain + path）
      const seen = new Set<string>()
      const merged = [...cookies, ...hostCookies].filter((c) => {
        const key = `${c.name}|${c.domain}|${c.path}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const simple = merged.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expirationDate,
      }))

      const dashboardWin = this.appHandlers.getDashboardWindow()
      if (dashboardWin && !dashboardWin.isDestroyed()) {
        dashboardWin.webContents.send('dashboard:login-cookies', { siteId, cookies: simple })
        logger.info('LoginWindowHandlers', `Forwarded ${simple.length} cookies for site ${siteId} to dashboard`)
      } else {
        logger.warn('LoginWindowHandlers', 'Dashboard window not available, cookies dropped')
      }

      if (!win.isDestroyed()) win.close()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('LoginWindowHandlers', `Failed to extract cookies: ${msg}`)
    }
  }

  public cleanup(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) win.close()
    }
    this.windows.clear()
    ipcMain.removeHandler('dashboard:open-login-window')
  }
}
