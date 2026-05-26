import { app } from 'electron'
import { logger } from '../utils/Logger'

/**
 * 协议处理器类型
 */
export interface ProtocolHandler {
  type: string
  handler: (data: any) => Promise<void> | void
}

/**
 * Mira 协议数据结构
 */
export interface MiraProtocolData {
  type: string
  data: any
}

/**
 * 协议服务类 - 处理 mira:// 协议
 */
export class ProtocolService {
  private static instance: ProtocolService | null = null
  private handlers: Map<string, ProtocolHandler['handler']> = new Map()
  private isRegistered = false

  private constructor() {}

  public static getInstance(): ProtocolService {
    if (!ProtocolService.instance) {
      ProtocolService.instance = new ProtocolService()
    }
    return ProtocolService.instance
  }

  /**
   * 初始化协议服务
   */
  public init(): void {
    // 注册插件导入处理器
    this.registerHandler('importPlugin', this.handleImportPlugin.bind(this))
    if (this.isRegistered) return

    logger.info('ProtocolService', 'Initializing mira:// protocol')

    // 在开发环境中需要指定可执行文件路径
    if (process.env.NODE_ENV === 'development') {
      // 开发环境下需要指定 electron 可执行文件和主脚本
      const electronPath = process.execPath
      const mainScript = process.argv[1] || 'main.js'
      
      if (!app.isDefaultProtocolClient('mira', electronPath, [mainScript])) {
        const isRegistered = app.setAsDefaultProtocolClient('mira', electronPath, [mainScript])
        logger.info('ProtocolService', 'Development protocol registration result', { isRegistered, electronPath, mainScript })
      }
    } else {
      // 生产环境下直接注册
      if (!app.isDefaultProtocolClient('mira')) {
        const isRegistered = app.setAsDefaultProtocolClient('mira')
        logger.info('ProtocolService', 'Production protocol registration result', { isRegistered })
      }
    }

    // 注册自定义协议处理器 - 需要在 app ready 之后
    if (app.isReady()) {
      this.registerProtocolHandler()
    } else {
      app.whenReady().then(() => {
        this.registerProtocolHandler()
      })
    }
    
    // 处理应用启动时的协议参数
    this.handleAppProtocolArguments()
    
    // 监听应用打开时的协议调用
    app.on('open-url', (event, url) => {
      event.preventDefault()
      logger.info('ProtocolService', 'Received protocol URL (open-url)', { url })
      this.parseAndHandleUrl(url)
    })

    // 监听 second-instance 事件（Windows）
    app.on('second-instance', (_event, commandLine, _workingDirectory) => {
      const protocolUrl = commandLine.find(arg => arg.startsWith('mira://'))
      if (protocolUrl) {
        logger.info('ProtocolService', 'Received protocol URL (second-instance)', { url: protocolUrl })
        this.parseAndHandleUrl(protocolUrl)
      }
    })

    this.isRegistered = true
    logger.info('ProtocolService', 'Protocol service initialized successfully')
  }

  /**
   * 注册协议处理器
   */
  public registerHandler(type: string, handler: ProtocolHandler['handler']): void {
    this.handlers.set(type, handler)
    logger.debug('ProtocolService', 'Registered protocol handler', { type })
  }

  /**
   * 移除协议处理器
   */
  public unregisterHandler(type: string): void {
    this.handlers.delete(type)
    logger.debug('ProtocolService', 'Unregistered protocol handler', { type })
  }

  /**
   * 获取所有已注册的处理器类型
   */
  public getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 注册协议处理器到 Electron
   */
  private registerProtocolHandler(): void {
    try {
      // 注册自定义协议 scheme，使渲染进程可通过 <a href="mira://..."> 触发
      const { protocol } = require('electron') as typeof import('electron')
      protocol.registerStringProtocol('mira', (request: any, callback: (response: string) => void) => {
        this.parseAndHandleUrl(request.url)
        callback('')
      })
      logger.debug('ProtocolService', 'Protocol handler registration completed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('ProtocolService', `Error registering protocol handler: ${errorMessage}`)
    }
  }



  /**
   * 解析并处理 URL
   */
  private parseAndHandleUrl(url: string): void {
    try {
      // 解析 URL: mira://data?json=<base64encoded>
      const urlObj = new URL(url)
      
      if (urlObj.protocol !== 'mira:') {
        logger.warn('ProtocolService', 'Invalid protocol', { protocol: urlObj.protocol })
        return
      }

      let protocolData: MiraProtocolData

      // 尝试从查询参数获取数据
      const jsonParam = urlObj.searchParams.get('json')
      if (jsonParam) {
        // Base64 解码
        const decodedJson = Buffer.from(jsonParam, 'base64').toString('utf8')
        protocolData = JSON.parse(decodedJson)
      } else {
        // 尝试从路径获取数据
        const pathData = urlObj.pathname.replace('/', '')
        if (pathData) {
          const decodedData = Buffer.from(pathData, 'base64').toString('utf8')
          protocolData = JSON.parse(decodedData)
        } else {
          logger.warn('ProtocolService', 'No data found in protocol URL', { url })
          return
        }
      }

      logger.info('ProtocolService', 'Parsed protocol data', { 
        type: protocolData.type, 
        dataKeys: Object.keys(protocolData.data || {}) 
      })

      this.handleProtocolData(protocolData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('ProtocolService', `Error parsing protocol URL: ${errorMessage} - URL: ${url}`)
    }
  }

  /**
   * 处理协议数据
   */
  private async handleProtocolData(data: MiraProtocolData): Promise<void> {
    const { type, data: payload } = data

    const handler = this.handlers.get(type)
    if (!handler) {
      logger.warn('ProtocolService', 'No handler found for protocol type', { type })
      return
    }

    try {
      await handler(payload)
      logger.info('ProtocolService', 'Protocol handler executed successfully', { type })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('ProtocolService', `Error executing protocol handler: ${errorMessage} - Type: ${type}`)
    }
  }

  /**
   * 处理应用启动时的协议参数
   */
  private handleAppProtocolArguments(): void {
    logger.debug('ProtocolService', 'Checking startup arguments for protocol URLs', { 
      argv: process.argv,
      platform: process.platform 
    })

    // Windows 和 Linux 平台处理
    if (process.platform === 'win32' || process.platform === 'linux') {
      const protocolUrl = process.argv.find(arg => arg.startsWith('mira://'))
      if (protocolUrl) {
        logger.info('ProtocolService', 'Found protocol URL in startup arguments', { url: protocolUrl })
        // 延迟处理，确保应用完全启动
        setTimeout(() => {
          this.parseAndHandleUrl(protocolUrl)
        }, 1500) // 增加延迟时间确保应用完全初始化
      } else {
        logger.debug('ProtocolService', 'No protocol URL found in startup arguments')
      }
    } else {
      logger.debug('ProtocolService', 'Protocol argument handling not needed for this platform')
    }
  }

  /**
   * 创建协议 URL
   */
  public static createProtocolUrl(type: string, data: any): string {
    const protocolData: MiraProtocolData = { type, data }
    const jsonString = JSON.stringify(protocolData)
    const base64Data = Buffer.from(jsonString, 'utf8').toString('base64')
    return `mira://?json=${base64Data}`
  }

  /**
   * 处理插件导入协议
   */
  private async handleImportPlugin(data: { url: string }): Promise<void> {
    try {
      logger.info('ProtocolService', 'Handling plugin import request', { url: data.url })

      if (!data.url) {
        logger.warn('ProtocolService', 'Missing URL in importPlugin protocol data')
        return
      }

      // 获取插件目录配置
      // TODO: 从设置中获取插件目录
      const pluginsDirectory = ''
      if (!pluginsDirectory) {
        logger.warn('ProtocolService', 'Plugins directory not configured')
        return
      }

      // 简化：插件导入功能暂未实现
      logger.info('ProtocolService', 'Plugin import via protocol requested', {
        url: data.url,
        message: 'Plugin import functionality not yet implemented'
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('ProtocolService', `Error handling importPlugin protocol: ${errorMessage}`)
      logger.debug('ProtocolService', 'Protocol data:', { url: data.url })
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.handlers.clear()
    this.isRegistered = false
    logger.info('ProtocolService', 'Protocol service cleaned up')
  }
}
