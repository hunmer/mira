;(function () {
  const PLUGIN_ID = '6c444c09-b708-4fa6-a597-47e7aa2b5e5c'
  const CONTRIBUTION_ID = 'mira-font-actions:main'
  const MENU_ID = 'mira-font-actions:open'
  const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'ttc'])

  function isFont(file) {
    const extension = String(file?.extension || file?.ext || file?.name?.split('.').pop() || '').replace(/^\./, '').toLowerCase()
    return FONT_EXTENSIONS.has(extension)
  }

  class FontActionsPlugin {
    constructor(context) {
      this.context = context
      this.api = context.api
    }

    async initialize() {
      const pluginSystem = window.pluginSystem
      pluginSystem.contributions.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '字体操作',
        description: '激活字体或应用到 Adobe 文字对象',
        icon: { type: 'material', value: 'text_fields' },
        behavior: 'window',
        onActivate: () => this.open([]),
      })
      this.unregisterMenu = this.api.media.registerContextMenu({
        id: MENU_ID,
        label: '激活或发送字体',
        icon: 'text_fields',
        onSelect: (files) => this.open((files || []).filter(isFont)),
      })
      this.api.log.info('字体操作插件已注册')
    }

    async open(files) {
      const serializable = JSON.parse(JSON.stringify(files || []))
      const existing = await window.electronAPI?.pluginWindow?.send?.(PLUGIN_ID, 'dist/index.html', 'media:add', serializable)
      if (existing?.delivered) return existing
      return this.api.window.openPluginWindow({
        pluginId: PLUGIN_ID,
        entry: 'dist/index.html',
        title: '字体操作',
        width: 860,
        height: 640,
        query: { media: encodeURIComponent(JSON.stringify(serializable)) },
      })
    }

    async cleanup() {
      this.unregisterMenu?.()
      window.pluginSystem?.contributions?.unregister?.(CONTRIBUTION_ID)
    }
  }

  async function initialize(context) {
    const plugin = new FontActionsPlugin(context)
    await plugin.initialize()
    return plugin
  }

  function setup() {
    if (window.pluginSystem?.registerPluginInstance) window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    else setTimeout(setup, 100)
  }

  setup()
})()
