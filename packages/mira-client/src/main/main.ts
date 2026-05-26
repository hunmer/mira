import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
function createWindowStateKeeper(options: { defaultWidth: number; defaultHeight: number; file: string; maximize?: boolean; fullScreen?: boolean }) {
  const fs = require('node:fs')
  const stateFile = join(app.getPath('userData'), options.file)
  let state: Record<string, any> = { width: options.defaultWidth, height: options.defaultHeight, isMaximized: options.maximize ?? false, isFullScreen: options.fullScreen ?? false }

  try { state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) } } catch {}

  return {
    x: state.x, y: state.y, width: state.width, height: state.height,
    isMaximized: state.isMaximized, isFullScreen: state.isFullScreen,
    manage(win: BrowserWindow) {
      const save = () => {
        try {
          const bounds = win.getBounds()
          const s = { ...bounds, isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() }
          fs.writeFileSync(stateFile, JSON.stringify(s))
        } catch {}
      }
      win.on('close', save)
      win.on('resize', save)
      win.on('move', save)
    },
    saveState(win: BrowserWindow) {
      const bounds = win.getBounds()
      const s = { ...bounds, isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() }
      try { fs.writeFileSync(stateFile, JSON.stringify(s)) } catch {}
    }
  }
}
import { IPCHandlers } from './ipc/handlers'
import { ProtocolService } from './services/ProtocolService'
import { TrayService } from './services/TrayService'
// import log from 'electron-log'
// import { inspect } from 'node:util'
import { logger } from './utils/Logger'
import { getAutoUpdater } from './services/useAutoUpdater'

// function formatArgs(args: any[]): string {
//   return args.map(a =>
//     typeof a === 'object' && a !== null
//       ? inspect(a, { showHidden: true, depth: null, colors: false })
//       : String(a)
//   ).join(' ')
// }

// 接收来自渲染进程的日志
// ipcMain.on('renderer-log', (_evt, level: 'log' | 'info' | 'warn' | 'error' | 'debug', ...args: any[]) => {
//   const logFn = level === 'log' ? log.info : log[level]
//   logFn(`[Renderer] ${formatArgs(args)}`)
// })

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Electron 主进程
class MiraApplication {
  private mainWindow: BrowserWindow | null = null
  private ipcHandlers: IPCHandlers | null = null
  private protocolService: ProtocolService | null = null
  private trayService: TrayService | null = null
  private windowState: any = null // 存储窗口状态管理器的引用

  constructor() {
    // Windows 系统额外的编码设置
    if (process.platform === 'win32') {
      // 设置控制台代码页为 UTF-8
      if (process.stdout && process.stdout.setEncoding) {
        process.stdout.setEncoding('utf8')
      }
      if (process.stderr && process.stderr.setEncoding) {
        process.stderr.setEncoding('utf8')
      }
      
      // 设置环境变量
      process.env.LANG = 'zh_CN.UTF-8'
      process.env.LC_ALL = 'zh_CN.UTF-8'
    }

    // 强制确保只有一个应用实例运行
    const gotTheLock = app.requestSingleInstanceLock()
    
    if (!gotTheLock) {
      // 如果已经有实例在运行，立即退出
      logger.info('MiraApplication', 'Another instance is already running, quitting immediately...')
      setImmediate(() => app.quit())
      return
    }
    
    // 当尝试运行第二个实例时，聚焦到第一个实例的窗口
    app.on('second-instance', (_event, commandLine, workingDirectory) => {
      logger.info('MiraApplication', 'Second instance detected, focusing main window', {
        commandLine,
        workingDirectory
      })
      
      // 检查是否有协议参数
      const protocolUrl = commandLine.find(arg => arg.startsWith('mira://'))
      if (protocolUrl) {
        logger.info('MiraApplication', 'Protocol URL detected in second instance', { url: protocolUrl })
      }
      
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore()
        }
        this.mainWindow.focus()
        this.mainWindow.show()
      }
    })

    // 设置日志级别
    // 在打包环境中，检查 app.isPackaged 来确定是否为生产环境
    const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
    if (isDevelopment) {
      logger.setLogLevel('DEBUG')
    } else {
      logger.setLogLevel('INFO')
    }

    logger.info('MiraApplication', 'Starting Mira Media Library Application - Single Instance Confirmed')
    
    // 记录启动参数，用于调试协议处理
    logger.debug('MiraApplication', 'Startup arguments', { argv: process.argv })
    
    this.protocolService = ProtocolService.getInstance()
    this.trayService = TrayService.getInstance()
    this.setupApp()
  }

  private setupApp() {
    logger.info('MiraApplication', 'Setting up application')
    
    // 当应用就绪时创建窗口
    app.whenReady().then(async () => {
      logger.info('MiraApplication', 'App is ready')
      
      this.createWindow()
      this.setupIPC()
      this.setupProtocol()
      this.setupTray()

      // 延迟检查自动更新（避免影响启动速度）
      if (app.isPackaged) {
        setTimeout(() => {
          logger.info('MiraApplication', '开始检查更新...')
          getAutoUpdater().checkForUpdates()
        }, 3000)
      }

      app.on('activate', () => {
        logger.debug('MiraApplication', 'App activated')
        // macOS 特定行为
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow()
        }
      })
    })

    // 当所有窗口关闭时退出应用（除了 macOS）
    app.on('window-all-closed', () => {
      logger.info('MiraApplication', 'All windows closed')
      if (process.platform !== 'darwin') {
        this.cleanup()
        app.quit()
      }
    })

    // 应用即将退出
    app.on('before-quit', () => {
      logger.info('MiraApplication', 'App is about to quit')
      this.cleanup()
    })
  }

  private createWindow() {
    logger.info('MiraApplication', 'Creating main window')
    
    // 创建窗口状态管理器
    const mainWindowState = createWindowStateKeeper({
      defaultWidth: 1200,
      defaultHeight: 800,
      file: 'mira-window-state.json',
      maximize: true,
      fullScreen: false
    })
    
    // 记录窗口状态文件位置
    logger.info('MiraApplication', 'Window state file location', {
      userDataPath: app.getPath('userData'),
      stateFile: 'mira-window-state.json'
    })
    
    // 保存窗口状态管理器的引用
    this.windowState = mainWindowState
    
    logger.debug('MiraApplication', 'Window state loaded', {
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      isMaximized: mainWindowState.isMaximized,
      isFullScreen: mainWindowState.isFullScreen
    })
    
    // 创建主窗口
    this.mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 800,
      minHeight: 600,
      movable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        zoomFactor: 1,
        spellcheck: false,
        webSecurity: false, // 禁用 web 安全策略，取消 CSP 检查
        webviewTag: true,
        preload: join(__dirname, '../dist-preload/preload.js')
      },
      frame: false,
      show: false, // 先隐藏，加载完成后显示
      title: 'Mira Media Library',
      icon: join(app.isPackaged ? process.resourcesPath : __dirname, app.isPackaged ? 'assets/icon.ico' : '../assets/icon.ico'),
    })

    // 让 windowStateKeeper 管理这个窗口
    mainWindowState.manage(this.mainWindow)
    
    // 如果上次是最大化状态，恢复最大化
    if (mainWindowState.isMaximized) {
      this.mainWindow.maximize()
      logger.debug('MiraApplication', 'Window restored to maximized state')
    }
    
    // 如果上次是全屏状态，恢复全屏
    if (mainWindowState.isFullScreen) {
      this.mainWindow.setFullScreen(true)
      logger.debug('MiraApplication', 'Window restored to fullscreen state')
    }

    // 窗口加载完成后显示
    this.mainWindow.once('ready-to-show', () => {
      logger.info('MiraApplication', 'Main window ready to show')
      this.mainWindow?.show()
      this.mainWindow?.webContents.setZoomFactor(1);
      // 在开发环境或未打包时打开开发者工具
      const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
      if (isDevelopment) {
        this.mainWindow?.webContents.openDevTools()
      }

      // 注入 console hook 到渲染进程
      this.injectConsoleHook()
    })

    // 加载应用
    if (app.isPackaged) {
      // 生产环境 - 加载打包后的文件
      logger.info('MiraApplication', 'Loading production app')
      this.mainWindow.loadFile(join(__dirname, '../dist-renderer/index.html'))
    } else {
      // 开发环境 - vite-plugin-electron 会自动处理
      logger.info('MiraApplication', 'Loading development app')
      // vite-plugin-electron 会自动注入正确的 URL
      this.mainWindow.loadURL('http://localhost:3000')
      this.mainWindow.aliasName = 'Mira'
    }

    // 窗口关闭时清理引用
    this.mainWindow.on('closed', () => {
      logger.info('MiraApplication', 'Main window closed')
      this.mainWindow = null
    })

    // 监听窗口状态变化
    this.mainWindow.on('resize', () => {
      const bounds = this.mainWindow?.getBounds()
      logger.debug('MiraApplication', 'Window resized', bounds)
    })

    this.mainWindow.on('move', () => {
      const bounds = this.mainWindow?.getBounds()
      logger.debug('MiraApplication', 'Window moved', bounds)
    })

    this.mainWindow.on('maximize', () => {
      logger.debug('MiraApplication', 'Window maximized')
    })

    this.mainWindow.on('unmaximize', () => {
      logger.debug('MiraApplication', 'Window unmaximized')
    })

    this.mainWindow.on('enter-full-screen', () => {
      logger.debug('MiraApplication', 'Window entered fullscreen')
    })

    this.mainWindow.on('leave-full-screen', () => {
      logger.debug('MiraApplication', 'Window left fullscreen')
    })

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      logger.debug('MiraApplication', 'Opening external URL', { url })
      // 在默认浏览器中打开外部链接
      require('electron').shell.openExternal(url)
      return { action: 'deny' }
    })

    // 禁用 Ctrl+滚轮缩放
    this.mainWindow.webContents.on('zoom-changed', (_event, zoomDirection) => {
      if (zoomDirection === 'in' || zoomDirection === 'out') {
        this.mainWindow?.webContents.setZoomFactor(1)
      }
    })

    // 设置快捷键
    this.setupShortcuts()
  }

  private setupShortcuts() {
    if (!this.mainWindow) return

    // 监听键盘事件
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      // F12 - 切换开发者工具
      if (input.key === 'F12' && input.type === 'keyDown') {
          this.mainWindow?.webContents.toggleDevTools()
      }

      // F11 - 切换全屏
      if (input.key === 'F11' && input.type === 'keyDown') {
        const isFullScreen = this.mainWindow?.isFullScreen()
        this.mainWindow?.setFullScreen(!isFullScreen)
        logger.debug('MiraApplication', `Fullscreen toggled via F11: ${!isFullScreen}`)
      }

      // 禁用 Ctrl++ / Ctrl+- / Ctrl+Scroll 缩放
      if (input.type === 'keyDown' && input.control && (input.key === '+' || input.key === '=' || input.key === '-')) {
        event.preventDefault()
      }
    })
  }

  /**
   * 注入 console hook 到渲染进程
   */
  private injectConsoleHook() {
    if (!this.mainWindow) return

    // 使用 executeJavaScript 在渲染进程上下文中执行 hook 代码
    this.mainWindow.webContents.executeJavaScript(`
      (function() {
        // 序列化函数：将不可克隆的对象转换为可序列化的格式
        function serializeForIPC(obj) {
          // 基本类型直接返回
          if (obj === null || obj === undefined) return obj;
          if (typeof obj !== 'object') return obj;

          // Error 对象
          if (obj instanceof Error) {
            return {
              __type: 'Error',
              name: obj.name,
              message: obj.message,
              stack: obj.stack
            };
          }

          // Date 对象
          if (obj instanceof Date) {
            return { __type: 'Date', value: obj.toISOString() };
          }

          // 数组
          if (Array.isArray(obj)) {
            return obj.map(item => {
              try {
                return serializeForIPC(item);
              } catch (e) {
                return '[Unserializable]';
              }
            });
          }

          // 普通对象（避免循环引用）
          const seen = new WeakSet();
          function serialize(o, depth = 0) {
            if (depth > 10) return '[Too Deep]';
            if (seen.has(o)) return '[Circular]';

            if (typeof o === 'object' && o !== null) {
              seen.add(o);

              // DOM 元素
              if (o instanceof Element) {
                return \`[Element: \${o.tagName}]\`;
              }

              const result = {};
              for (const key in o) {
                try {
                  if (o.hasOwnProperty(key)) {
                    result[key] = serialize(o[key], depth + 1);
                  }
                } catch (e) {
                  result[key] = '[Unserializable]';
                }
              }
              return result;
            }
            return o;
          }

          return serialize(obj);
        }

        // 保存原始 console 方法
        const levels = ['log', 'info', 'warn', 'error', 'debug'];
        const originalConsole = {};

        levels.forEach(level => {
          originalConsole[level] = console[level].bind(console);

          // 替换 console 方法
          console[level] = function(...args) {
            // 调用原始 console 方法（保持 DevTools 输出）
            originalConsole[level](...args);

            // 序列化参数后发送到主进程
            try {
              const serializedArgs = args.map(arg => serializeForIPC(arg));
              if (window.electronAPI?.logger?.[level]) {
                window.electronAPI.logger[level](...serializedArgs);
              }
            } catch (e) {
              // 序列化失败时静默失败，避免影响原始 console 功能
              originalConsole.warn('[electron-log] Failed to serialize console args:', e);
            }
          };
        });

        // 标记 hook 已安装（使用原始 console）
        originalConsole.log('[electron-log] Console hooks installed successfully');
      })();
    `).then(() => {
      logger.info('MiraApplication', 'Console hooks injected into renderer process')
    }).catch((error) => {
      logger.error('MiraApplication', 'Failed to inject console hooks', error)
    })
  }

  private setupIPC() {
    // 初始化 IPC 处理器
    this.ipcHandlers = new IPCHandlers()

    // 设置主窗口引用
    if (this.mainWindow) {
      this.ipcHandlers.setMainWindow(this.mainWindow)
    }

    logger.info('MiraApplication', 'IPC handlers initialized')
  }

  private setupProtocol() {
    // 初始化协议服务
    this.protocolService?.init()
    
    // 注册默认的 server_import 处理器
    this.protocolService?.registerHandler('server_import', async (data) => {
      logger.info('MiraApplication', 'Handling server_import protocol', { data })

      try {
        // 确保主窗口可见
        this.showMainWindow()

        // 发送服务器导入数据到渲染进程
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('protocol:server-import', data)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('MiraApplication', `Error handling server_import: ${errorMessage}`)
      }
    })

    // 注册 openTab 处理器 - 从 dashboard 等外部来源打开 Tab
    this.protocolService?.registerHandler('openTab', async (data) => {
      logger.info('MiraApplication', 'Handling openTab protocol', { data })

      try {
        this.showMainWindow()

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('protocol:open-tab', data)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('MiraApplication', `Error handling openTab: ${errorMessage}`)
      }
    })
    
    logger.info('MiraApplication', 'Protocol service initialized with server_import handler')
  }

  private setupTray() {
    // 检查托盘是否支持
    if (!this.trayService?.isSupported()) {
      logger.warn('MiraApplication', 'System tray is not supported on this platform')
      return
    }

    // 初始化托盘服务
    if (this.mainWindow) {
      this.trayService?.init(this.mainWindow)
      logger.info('MiraApplication', 'Tray service initialized')
    }
  }

  /**
   * 显示主窗口（用于协议处理和托盘点击）
   */
  private showMainWindow(): void {
    if (!this.mainWindow) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    
    this.mainWindow.show()
    this.mainWindow.focus()
    
    // macOS 特定：显示应用在 Dock 中
    if (process.platform === 'darwin') {
      app.dock?.show()
    }

    logger.debug('MiraApplication', 'Main window shown')
  }

  /**
   * 手动保存窗口状态
   */
  private saveWindowState(): void {
    if (this.windowState && this.mainWindow) {
      try {
        // 强制保存当前窗口状态
        this.windowState.saveState(this.mainWindow)
        logger.debug('MiraApplication', 'Window state saved manually')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('MiraApplication', 'Failed to save window state: ' + errorMessage)
      }
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    logger.info('MiraApplication', 'Starting application cleanup')
    
    // 保存窗口状态
    this.saveWindowState()
    
    // 移除 IPC 处理器
    if (this.ipcHandlers) {
      this.ipcHandlers.removeAllHandlers()
      this.ipcHandlers = null
      logger.debug('MiraApplication', 'IPC handlers removed')
    }

    // 清理协议服务
    this.protocolService?.cleanup()
    this.protocolService = null

    // 清理托盘服务
    this.trayService?.cleanup()
    this.trayService = null

    // 清理窗口状态管理器引用
    this.windowState = null

    logger.info('MiraApplication', 'Application cleanup completed')
  }
}

// 创建应用实例
new MiraApplication()
