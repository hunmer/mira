/**
 * 自由白板插件（mira-whiteboard）
 *
 * 架构（单组合窗口）：
 *   1. 本文件 index.js —— 宿主侧脚本，被注入到 Mira 主窗口 document。
 *      职责：仅注册插件实例工厂 + 一个「window 行为」UI 贡献（右侧栏入口）。
 *      点击图标 → 调 ctx.openPluginWindow 打开「自由画板」组合窗口。
 *   2. dist/index.html —— 自由画板组合窗口（Vue SPA），由插件窗口加载。
 *      一个窗口同时承载：左侧工程列表（新建/重命名/删除）+ 右侧画布。
 *      画布按 projectId（localStorage 维护）持久化到 IndexedDB（@woven-canvas/vue）。
 *      窗口自定义 Electron 菜单栏：【项目】子菜单列出工程，点击切换画布；
 *      不再继承 Mira 主窗口的全局菜单。
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
     * 注册右侧栏 UI 贡献（window 行为：点击直接打开自由画板组合窗口）
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
        description: '打开自由画板，管理画布工程并直接绘画',
        icon: { type: 'material', value: 'dashboard_customize' },
        // 默认行为：点击图标直接打开自由画板组合窗口
        behavior: 'window',
        // ctx 由宿主提供：{ api, openPluginWindow }
        onActivate: (ctx) => {
          return ctx.openPluginWindow({
            pluginId: PLUGIN_ID,
            entry: 'dist/index.html',
            title: '自由画板',
            width: 1280,
            height: 800,
          })
        },
      })
      this.unregisterMediaMenu = this.api.media?.registerContextMenu?.({
        id: 'mira-whiteboard:add-to-canvas',
        label: '添加到画布',
        icon: 'add_to_photos',
        onSelect: (files) => this.openWithMedia(files),
      })
      this.contributionRegistered = true
      this.api.log.info('自由白板贡献已注册（window 行为）')
    }

    /**
     * 「添加到画布」右键菜单回调：把媒体投递到已打开的画板窗口。
     * 已打开则通过 pluginWindow.send('media:add') 投递（窗口会插入到当前工程，
     * 无当前工程时自动新建一个）；否则开窗并在 URL 上带 ?media=。
     */
    async openWithMedia(files) {
      const w = typeof window !== 'undefined' ? window.electronAPI : null
      if (!w?.pluginWindow?.open) return { success: false, message: '插件窗口 API 不可用' }
      // IPC 只接受可结构化克隆的数据，插件回调可能收到宿主的响应式对象。
      const serializableFiles = JSON.parse(JSON.stringify(files || []))
      const delivered = await w.pluginWindow.send?.(
        PLUGIN_ID,
        'dist/index.html',
        'media:add',
        serializableFiles,
      )
      if (delivered?.delivered) return delivered
      const media = encodeURIComponent(JSON.stringify(serializableFiles))
      // 走插件 api 的 openPluginWindow：query 会自动注入 server + token，
      // 白板窗口内的素材库浏览器（MediaBrowser）需要它们直连 server API。
      return this.api.window.openPluginWindow({
        pluginId: PLUGIN_ID,
        entry: 'dist/index.html',
        title: '自由画板',
        width: 1280,
        height: 800,
        query: { media },
      })
    }

    async cleanup() {
      const ps = typeof window !== 'undefined' ? window.pluginSystem : null
      if (ps?.contributions?.unregister && this.contributionRegistered) {
        ps.contributions.unregister(CONTRIBUTION_ID)
        this.contributionRegistered = false
      }
      if (this.unregisterMediaMenu) this.unregisterMediaMenu()
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
