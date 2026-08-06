/**
 * 欢迎示例插件
 * 演示 Mira 客户端本地插件系统的基本功能（市场分发版本）
 *
 * 本脚本作为普通 <script> 注入主窗口 document，因此采用浏览器友好的 IIFE
 * 写法（不使用 CommonJS 的 module.exports，避免 "module is not defined"）。
 * 通过 window.pluginSystem.registerPluginInstance 向宿主注册实例工厂，
 * 与 mira-whiteboard 的注册契约保持一致。
 */
;(function () {
  // 与 plugin.json 的 pluginId 保持一致；宿主启用时以此 id 查找 factory
  const PLUGIN_ID = 'b1c2d3e4-5f60-4a7b-8c9d-0a1b2c3d4e5f'

  // 插件实例：封装 initialize / cleanup，供宿主按生命周期调用
  class WelcomeDemoPlugin {
    constructor(context) {
      this.context = context
      this.handlers = {}
    }

    async initialize() {
      const { api } = this.context

      api.log.info('欢迎示例插件初始化开始')

      // 读取配置
      const exampleSetting = api.config.get('exampleSetting')
      const enableLogging = api.config.get('enableLogging')

      if (enableLogging) {
        api.log.info(`欢迎示例插件配置: exampleSetting=${exampleSetting}`)
      }

      // 监听事件（记录句柄，便于 cleanup 时解绑）
      const onFileOpened = (data) => {
        if (enableLogging) {
          api.log.info('检测到文件打开事件', data)
        }
      }
      const onFileSelected = (data) => {
        if (enableLogging) {
          api.log.info('检测到文件选择事件', data)
        }
      }
      api.events.on('fileOpened', onFileOpened)
      api.events.on('fileSelected', onFileSelected)
      this.handlers = { fileOpened: onFileOpened, fileSelected: onFileSelected }

      // 显示初始化通知
      api.ui.showNotification('欢迎示例插件已成功初始化', 'success')

      api.log.info('欢迎示例插件初始化完成')
    }

    async cleanup() {
      const { api } = this.context
      console.log('欢迎示例插件正在清理资源...')
      // 尽力解绑事件（api.events 提供 off 时才尝试）
      try {
        if (typeof api.events.off === 'function') {
          if (this.handlers.fileOpened) api.events.off('fileOpened', this.handlers.fileOpened)
          if (this.handlers.fileSelected) api.events.off('fileSelected', this.handlers.fileSelected)
        }
      } catch (e) {
        // 忽略解绑失败
      }
    }
  }

  /**
   * 插件实例工厂：宿主以 PLUGIN_ID 查找并调用 factory(context) 创建实例。
   * 返回的实例需提供 initialize() / cleanup() 生命周期方法。
   */
  async function initialize(context) {
    const plugin = new WelcomeDemoPlugin(context)
    await plugin.initialize()
    return plugin
  }

  /**
   * 注册工厂到全局插件系统（脚本注入后立即执行）
   */
  function setup() {
    if (typeof window !== 'undefined' && window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
      console.log('🏭 mira-welcome-demo plugin factory registered')
    } else {
      // pluginSystem 尚未就绪时轮询重试
      setTimeout(setup, 100)
    }
  }

  setup()
})()
