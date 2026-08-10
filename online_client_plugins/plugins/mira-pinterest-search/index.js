;(function () {
  const PLUGIN_ID = '22069a4c-58e0-44d7-89d9-69f014158acd'
  const ENTRY = 'index.html'
  const CONTRIBUTION_ID = `${PLUGIN_ID}:open`

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
      return this.api.window.openPluginWindow({
        pluginId: PLUGIN_ID,
        entry: ENTRY,
        title: 'Pinterest 视觉搜索',
        width: 1120,
        height: 700,
        query: { media: payload },
      })
    }

    async initialize() {
      const ps = window.pluginSystem
      const contribution = {
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: 'Pinterest 视觉搜索',
        description: '用选中的图片搜索相似内容',
        icon: { type: 'material', value: 'image_search' },
        behavior: 'window',
        onActivate: (ctx) => ctx.openPluginWindow({
          pluginId: PLUGIN_ID,
          entry: ENTRY,
          title: 'Pinterest 视觉搜索',
          width: 1120,
          height: 700,
        }),
      }
      ps?.contributions?.register(contribution)
      this.unregisterMenu = this.api.media?.registerContextMenu?.({
        id: `${PLUGIN_ID}:selected`,
        pluginId: PLUGIN_ID,
        label: 'Pinterest 视觉搜索',
        icon: 'image_search',
        onSelect: (files) => this.open(files),
      }) || null
      this.api.log.info('[mira-pinterest-search] 已初始化')
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
