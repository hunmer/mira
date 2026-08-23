/**
 * AI 图片生成器 - 宿主侧脚本（注入 Mira 主窗口）
 *
 * 职责：
 *   1. 注册 window 行为 UI 贡献：右侧栏入口 → 打开插件独立窗口（web/dist SPA）。
 *   2. 注册媒体右键菜单「AI 生成 / 编辑」：把选中图片序列化进 query.media 打开窗口，
 *      SPA 将其作为参考图（图生图模式）。
 *
 * SPA 侧由 openPluginWindow 自动注入 ?server=&token=&libraryId=。
 */
/* global window, setTimeout */
;(function () {
  const PLUGIN_ID = '18a04e8d-3423-4fd3-9ecb-e85884d3d830'
  const ENTRY = 'dist/index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`
  const WINDOW_OPTS = {
    pluginId: PLUGIN_ID,
    entry: ENTRY,
    title: 'AI 图片生成器',
    width: 1280,
    height: 860,
  }
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg']

  // 普通对象（可结构化克隆），libraryId + id 供 SPA 构造 /api/files/file 原图直链
  function serializableFiles(files) {
    return JSON.parse(JSON.stringify((files || [])
      .filter((file) => {
        const ext = String(file.extension || file.name?.split('.').pop() || '').toLowerCase()
        return IMAGE_EXTS.includes(ext)
      })
      .map((file) => ({
        id: file.id != null ? String(file.id) : undefined,
        libraryId: file.libraryId != null ? String(file.libraryId) : undefined,
        name: file.name,
      }))
      .filter((file) => file.id && file.libraryId)))
  }

  class AiImagePlugin {
    constructor(context) {
      this.api = context.api
      this.unregisterMenu = null
    }

    async open(files) {
      const payload = encodeURIComponent(JSON.stringify(serializableFiles(files)))
      return this.api.window.openPluginWindow({ ...WINDOW_OPTS, query: { media: payload } })
    }

    async initialize() {
      const ps = window.pluginSystem
      ps?.contributions?.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: 'AI 图片生成器',
        description: '文生图 / 图生图 / 蒙版重绘，结果一键入库',
        icon: { type: 'material', value: 'auto_awesome' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow(WINDOW_OPTS),
      })
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:generate`,
        pluginId: PLUGIN_ID,
        label: 'AI 生成 / 编辑',
        icon: 'auto_awesome',
        onSelect: (files) => this.open(files),
      }) || null
      this.api.log.info('[ai-image] 已初始化')
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterMenu?.()
    }
  }

  function initialize(context) {
    const plugin = new AiImagePlugin(context)
    plugin.initialize()
    return plugin
  }

  function setup() {
    if (window.pluginSystem?.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    } else {
      setTimeout(setup, 100)
    }
  }
  setup()
})()
