/**
 * 格式转换 - 宿主侧脚本（注入 Mira 主窗口）
 *
 * 职责：
 *   1. 注册 window 行为 UI 贡献：右侧栏入口 → 打开插件独立窗口（web/dist SPA）。
 *   2. 注册媒体右键菜单「格式转换」：把选中的图片/视频/音频序列化进 query.media 打开窗口。
 *
 * SPA 侧由 openPluginWindow 自动注入 ?server=&token=&libraryId=（server 插件路径）。
 */
/* global window, setTimeout */
;(function () {
  const PLUGIN_ID = 'f3a9c2e7-8b4d-4f6a-9e1c-7d5b3a8f2c60'
  const ENTRY = 'dist/index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`
  const WINDOW_OPTS = {
    pluginId: PLUGIN_ID,
    entry: ENTRY,
    title: '格式转换',
    width: 1080,
    height: 760,
  }
  const MEDIA_EXTS = [
    // 图片
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif', 'svg', 'ico', 'psd',
    // 视频
    'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'ts', 'mpg', 'mpeg', '3gp', 'ogv',
    // 音频
    'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'aiff', 'amr',
  ]

  // 仅保留转换所需字段（普通对象，可结构化克隆）。
  // id + libraryId 是关键：服务端据此取库内文件记录与本地路径。
  function serializableFiles(files) {
    return JSON.parse(JSON.stringify((files || [])
      .filter((file) => {
        const ext = String(file.extension || file.name?.split('.').pop() || '').toLowerCase()
        return MEDIA_EXTS.includes(ext)
      })
      .map((file) => ({
        id: file.id != null ? String(file.id) : undefined,
        libraryId: file.libraryId != null ? String(file.libraryId) : undefined,
        name: file.name,
        url: file.url || '',
        thumbnailURL: file.thumbnailPath || '',
      }))
      .filter((file) => file.id && file.libraryId)))
  }

  class FormatConverterPlugin {
    constructor(context) {
      this.api = context.api
      this.unregisterMenu = null
    }

    open(files) {
      const payload = encodeURIComponent(JSON.stringify(serializableFiles(files)))
      return this.api.window.openPluginWindow({ ...WINDOW_OPTS, query: { media: payload } })
    }

    async initialize() {
      const ps = window.pluginSystem
      ps?.contributions?.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '格式转换',
        description: '批量转换图片/视频/音频格式，保存回素材库',
        icon: { type: 'material', value: 'swap_horiz' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow(WINDOW_OPTS),
      })
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:convert`,
        pluginId: PLUGIN_ID,
        label: '格式转换',
        icon: 'swap_horiz',
        onSelect: (files) => this.open(files),
      }) || null
      this.api.log.info('[format-converter] 已初始化')
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterMenu?.()
    }
  }

  function initialize(context) {
    const plugin = new FormatConverterPlugin(context)
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
