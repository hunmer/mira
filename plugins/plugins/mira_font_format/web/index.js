;(function () {
  const PLUGIN_ID = '39e18010-2cca-420b-a923-9e51180b4077'
  const registrations = []
  const extensions = ['ttf', 'otf', 'woff', 'woff2', 'ttc']
  const mimeTypes = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-sfnt', 'application/vnd.ms-opentype']
  const scriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = /^https?:\/\//i.test(scriptUrl) ? new URL('.', scriptUrl) : null

  function getPreviewUrl(file) {
    const fileUrl = file?.url || file?.path || ''
    if (!pluginBaseUrl || !/^https?:\/\//i.test(fileUrl)) return ''
    const viewerUrl = new URL('viewer.html', pluginBaseUrl)
    viewerUrl.searchParams.set('fileUrl', fileUrl)
    viewerUrl.searchParams.set('fileName', file.name || 'Font')
    viewerUrl.searchParams.set('format', String(file.extension || '').replace(/^\./, '').toUpperCase())
    viewerUrl.searchParams.set('fileId', String(file.id || ''))
    return viewerUrl.toString()
  }

  function setup() {
    if (!window.pluginSystem?.registerPluginInstance) {
      setTimeout(setup, 100)
      return
    }
    window.pluginSystem.registerPluginInstance(PLUGIN_ID, async function (context) {
      registrations.push(context.api.media.registerFileFormat({
        id: 'mira-font-preview',
        title: '字体预览',
        icon: 'text_fields',
        extensions,
        mimeTypes,
        getPreviewUrl,
      }))
      context.api.log.info('Font preview registered for TTF, OTF, WOFF, WOFF2 and TTC')
      return {
        cleanup: async function () {
          registrations.splice(0).forEach((unregister) => unregister())
        },
      }
    })
  }

  setup()
})()
