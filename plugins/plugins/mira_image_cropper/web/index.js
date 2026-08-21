/**
 * 多选区裁切 - 宿主侧脚本（注入 Mira 主窗口）
 *
 * 职责：
 *   1. 注册 window 行为 UI 贡献：右侧栏入口 → 打开插件独立窗口（web/dist SPA）。
 *   2. 注册媒体右键菜单「多选区裁切」：把选中图片序列化进 query.media 打开窗口。
 *
 * SPA 侧由 openPluginWindow 自动注入 ?server=&token=&libraryId=（server 插件路径，
 * 见 packages/mira-client/src/renderer/plugins/openPluginWindow.ts）。
 */
/* global window, document */
;(function () {
  const PLUGIN_ID = 'a4d2b8c6-1e3f-4a7b-9c5d-8e6f2a0b1c9d'
  const ENTRY = 'dist/index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`
  const WINDOW_OPTS = {
    pluginId: PLUGIN_ID,
    entry: ENTRY,
    title: '多选区裁切',
    width: 1280,
    height: 800,
  }
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg']

  // 仅保留裁切所需的图片字段（普通对象，可结构化克隆）。
  // libraryId + id 是关键：SPA 据此构造 /api/files/download 原图直链
  // （url 字段常为本地路径或外链引用，不可靠）。
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
        width: file.metadata?.width || 0,
        height: file.metadata?.height || 0,
        url: file.url || '',
        thumbnailURL: file.thumbnailPath || file.url || '',
      }))
      .filter((file) => (file.id && file.libraryId) || file.url || file.thumbnailURL)))
  }

  class ImageCropperPlugin {
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
        title: '多选区裁切',
        description: '在图片上绘制多个选区，批量裁切导出',
        icon: { type: 'material', value: 'crop' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow(WINDOW_OPTS),
      })
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:crop`,
        pluginId: PLUGIN_ID,
        label: '多选区裁切',
        icon: 'crop',
        onSelect: (files) => this.open(files),
      }) || null
      this.api.log.info('[image-cropper] 已初始化')
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterMenu?.()
    }
  }

  function initialize(context) {
    const plugin = new ImageCropperPlugin(context)
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
