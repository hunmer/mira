;(function () {
  const PLUGIN_ID = '2c6f4ed1-d7b9-4d6a-b0f8-8e0c8c9e6a1f'
  const registrations = []
  const base = document.currentScript?.src ? new URL('.', document.currentScript.src) : null
  function toFileUrl(value) {
    if (!value || /^(https?|file|blob):/i.test(value)) return value || ''
    const normalized = value.replace(/\\/g, '/')
    return /^[a-zA-Z]:/.test(normalized) ? `file:///${normalized}` : normalized
  }
  function getPreviewUrl(file) {
    if (!base) return ''
    const viewer = new URL('viewer.html', base)
    viewer.searchParams.set('fileUrl', toFileUrl(file.url || file.localFile || file.path || ''))
    viewer.searchParams.set('fileName', file.name || 'PAG')
    return viewer.href
  }
  class PagPlugin {
    constructor(context) { this.context = context }
    async initialize() {
      registrations.push(this.context.api.media.registerFileFormat({ id: 'mira-pag', title: 'PAG 预览', icon: 'animation', extensions: ['pag'], mimeTypes: ['application/x-pag'], getPreviewUrl }))
      this.context.api.log.info('PAG format preview registered')
    }
    async cleanup() { registrations.splice(0).forEach((fn) => fn()) }
  }
  function setup() { window.pluginSystem?.registerPluginInstance ? window.pluginSystem.registerPluginInstance(PLUGIN_ID, async (ctx) => { const p = new PagPlugin(ctx); await p.initialize(); return p }) : setTimeout(setup, 100) }
  setup()
})()
