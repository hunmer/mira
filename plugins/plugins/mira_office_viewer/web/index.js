;(function () {
  const PLUGIN_ID = 'd4e5f607-1829-4abc-9def-0123456789ab'
  const registrations = []
  const exts = ['docx', 'xlsx', 'pptx', 'pdf']
  function url(file) { return file?.path || file?.url || file?.localFile || '' }
  function preview(file) {
    const value = url(file)
    if (!value) return ''
    const target = new URL('viewer.html', document.currentScript?.src || location.href)
    target.searchParams.set('fileUrl', value)
    target.searchParams.set('format', (file.extension || file.name || '').split('.').pop().toLowerCase())
    target.searchParams.set('fileName', file.name || '')
    return target.href
  }
  class Plugin {
    constructor(context) { this.context = context }
    async initialize() {
      const api = this.context.api
      exts.forEach((ext) => registrations.push(api.media.registerFileFormat({
        id: `mira-office-${ext}`, title: `${ext.toUpperCase()} 文档预览`, icon: 'description',
        extensions: [ext], getPreviewUrl: preview,
      })))
      api.log.info('Office viewer registered for docx/xlsx/pptx/pdf')
    }
    async cleanup() { registrations.splice(0).forEach((unregister) => unregister()) }
  }
  function setup() {
    if (window.pluginSystem?.registerPluginInstance) window.pluginSystem.registerPluginInstance(PLUGIN_ID, async (context) => { const plugin = new Plugin(context); await plugin.initialize(); return plugin })
    else setTimeout(setup, 100)
  }
  setup()
})()
