/**
 * 图片搜索（image-search，原 mira-pinterest-search-v2）
 *
 * 架构：
 *   1. 本文件 index.js —— 宿主侧脚本，注入到 Mira 主窗口 document。
 *      注册「window 行为」UI 贡献 + 媒体右键菜单；把选中图片序列化成
 *      query.media 传给插件窗口。
 *   2. dist/index.html —— Vue SPA（vite 构建），由插件窗口 loadFile 加载。
 *      窗口内经 plugin-window-preload 注入的 window.mira（Eagle 兼容 API）
 *      读取选中图片 / 保存素材 / 切换置顶 / 跟随主题。
 *      两种搜索模式：Pinterest 走接口搜图；其他站点经临时图床上传后
 *      以 URL 反搜，页面由 <webview> 内嵌加载。
 *
 * 契约：window 行为贡献（behavior:'window' + onActivate）见宿主 renderer/plugins/types.ts。
 */
;(function () {
  const PLUGIN_ID = '7c1f9e2a-4b3d-4c8e-9f6a-2d5b8e7c1a04'
  const ENTRY = 'dist/index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`
  const WINDOW_OPTS = {
    pluginId: PLUGIN_ID,
    entry: ENTRY,
    title: '图片搜索',
    width: 1280,
    height: 760,
  }

  function serializableFiles(files) {
    return JSON.parse(JSON.stringify((files || []).map((file) => ({
      id: file.id,
      name: file.name,
      ext: file.extension || file.name?.split('.').pop() || '',
      width: file.metadata?.width || 0,
      height: file.metadata?.height || 0,
      thumbnailURL: file.thumbnailPath || file.url,
      url: file.url || file.thumbnailPath,
    })).filter((file) => file.thumbnailURL)))
  }

  class PinterestSearchPlugin {
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
      const contribution = {
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '图片搜索',
        description: '用选中的图片在多个网站搜索相似内容',
        icon: { type: 'material', value: 'image_search' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow(WINDOW_OPTS),
      }
      ps?.contributions?.register(contribution)
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:selected`,
        pluginId: PLUGIN_ID,
        label: '图片搜索',
        icon: 'image_search',
        onSelect: (files) => this.open(files),
      }) || null
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterMenu?.()
    }
  }

  function initialize(context) {
    const plugin = new PinterestSearchPlugin(context)
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
