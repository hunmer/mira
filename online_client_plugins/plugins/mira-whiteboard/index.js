/**
 * 自由白板插件（mira-whiteboard）
 *
 * 架构（双进程侧 + 窗口行为）：
 *   1. 本文件 index.js —— 宿主侧脚本，被注入到 Mira 主窗口 document。
 *      职责：仅注册插件实例工厂 + 一个「window 行为」UI 贡献（右侧栏入口）。
 *      点击图标 → 调 ctx.openPluginWindow 打开插件主界面（工程管理）窗口。
 *   2. dist/index.html —— 工程管理 SPA（Vue），由插件主界面窗口加载。
 *      职责：展示画布工程列表（新建/重命名/删除），点击工程 → 打开画布窗口。
 *      数据存 localStorage（窗口内只有 electronAPI.pluginWindow，无宿主 api.storage）。
 *   3. dist/canvas.html —— 画布 SPA（@woven-canvas/vue），由工程管理窗口再开的子窗口加载。
 *      职责：渲染无限画布，按 projectId（location.search）持久化到 IndexedDB。
 *
 * 契约：window 行为贡献（behavior:'window' + onActivate）见宿主 renderer/plugins/types.ts。
 */
;(function () {
  const PLUGIN_ID = 'c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b'
  const CONTRIBUTION_ID = 'mira-whiteboard:main'

  class WhiteboardPlugin {
    constructor(context) {
      this.context = context
      this.api = context.api
      this.contributionRegistered = false
    }

    async initialize() {
      this.api.log.info('自由白板插件初始化')
      this.registerContribution()
    }

    /**
     * 注册右侧栏 UI 贡献（window 行为：点击直接打开插件主界面窗口）
     */
    registerContribution() {
      const ps = typeof window !== 'undefined' ? window.pluginSystem : null
      if (!ps?.contributions?.register) {
        // 插件系统未就绪，延迟重试
        setTimeout(() => this.registerContribution(), 500)
        return
      }

      ps.contributions.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '自由画板',
        description: '打开自由画板，管理并打开画布工程',
        icon: { type: 'material', value: 'dashboard_customize' },
        // 默认行为：点击图标直接打开插件主界面窗口
        behavior: 'window',
        // ctx 由宿主提供：{ api, openPluginWindow }
        onActivate: (ctx) => {
          return ctx.openPluginWindow({
            pluginId: PLUGIN_ID,
            entry: 'dist/index.html',
            title: '自由画板 - 工程管理',
            width: 720,
            height: 640,
          })
        },
      })
      this.contributionRegistered = true
      this.api.log.info('自由白板贡献已注册（window 行为）')
    }

    async cleanup() {
      const ps = typeof window !== 'undefined' ? window.pluginSystem : null
      if (ps?.contributions?.unregister && this.contributionRegistered) {
        ps.contributions.unregister(CONTRIBUTION_ID)
        this.contributionRegistered = false
      }
      this.api.log.info('自由白板插件已清理')
    }
  }

  /**
   * 插件实例工厂
   */
  async function initialize(context) {
    const plugin = new WhiteboardPlugin(context)
    await plugin.initialize()
    return plugin
  }

  /**
   * 注册工厂到全局插件系统（脚本注入后立即执行）
   */
  function setup() {
    if (typeof window !== 'undefined' && window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
      console.log('🏭 mira-whiteboard plugin factory registered')
    } else {
      setTimeout(setup, 100)
    }
  }

  setup()
})()
