/**
 * 视频剪辑器（mira-video-editor）
 *
 * 架构：
 *   1. 本文件 index.js —— 宿主侧脚本，注入到 Mira 主窗口 document。
 *      注册「window 行为」UI 贡献 + 媒体右键菜单「发送到视频剪辑器」；
 *      把选中的视频序列化成 query.media 传给插件窗口；窗口已打开时
 *      经 pluginWindow.send 推送 media:add 增量导入。
 *   2. dist/index.html —— Vue SPA（vite 构建），由插件窗口 loadFile 加载。
 *      剪辑/分割/导出能力经 plugin-window-preload 的 mira.exec（宿主白名单
 *      spawn ffmpeg/ffprobe/scenedetect）与 mira.fs 在本机执行；
 *      数据（视频列表/片段/水印）持久化在窗口 localStorage。
 */
;(function () {
  const PLUGIN_ID = '8de28d11-49d2-455e-ae21-bb77edab23a6'
  const ENTRY = 'dist/index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`
  const WINDOW_OPTS = {
    pluginId: PLUGIN_ID,
    entry: ENTRY,
    title: '视频剪辑器',
    width: 1360,
    height: 860,
  }

  const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts', '3gp', 'mts', 'm2ts']

  function isVideoFile(file) {
    const ext = (file.extension || file.name?.split('.').pop() || '').toLowerCase()
    return VIDEO_EXTENSIONS.includes(ext)
  }

  function serializableFiles(files) {
    return JSON.parse(JSON.stringify((files || [])
      .filter(isVideoFile)
      .map((file) => ({
        id: file.id,
        name: file.name,
        // 优先服务器本机绝对路径（本地部署时可直接交给 ffmpeg），否则用 HTTP URL
        path: file.localFile || file.path || '',
        url: file.url || '',
        size: file.size || 0,
        extension: file.extension || file.name?.split('.').pop() || '',
        duration: file.metadata?.duration || 0,
        width: file.metadata?.width || 0,
        height: file.metadata?.height || 0,
        thumbnailURL: file.thumbnailPath || '',
      }))))
  }

  class VideoEditorPlugin {
    constructor(context) {
      this.api = context.api
      this.unregisterMenu = null
    }

    async open(files) {
      const media = serializableFiles(files)
      if (media.length === 0) return
      // 先尝试投递到已打开的剪辑器窗口（增量导入）
      const delivered = await window.electronAPI?.pluginWindow
        ?.send(PLUGIN_ID, ENTRY, 'media:add', media)
        .catch(() => null)
      if (delivered?.delivered) return delivered
      const payload = encodeURIComponent(JSON.stringify(media))
      return this.api.window.openPluginWindow({ ...WINDOW_OPTS, query: { media: payload } })
    }

    async initialize() {
      const ps = window.pluginSystem
      const contribution = {
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '视频剪辑器',
        description: '剪辑视频片段、智能场景分割、去水印、批量导出',
        icon: { type: 'material', value: 'movie' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow(WINDOW_OPTS),
      }
      ps?.contributions?.register(contribution)
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:selected`,
        pluginId: PLUGIN_ID,
        label: '发送到视频剪辑器',
        icon: 'movie',
        onSelect: (files) => this.open(files),
      }) || null
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterMenu?.()
    }
  }

  function initialize(context) {
    const plugin = new VideoEditorPlugin(context)
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
