;(function () {
  const PLUGIN_ID = '7436113a-2cf4-4c28-b821-32764b480cd5'
  const registrations = []
  const scriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = /^https?:\/\//i.test(scriptUrl) ? new URL('.', scriptUrl) : null

  function getPreviewUrl(file) {
    const fileUrl = file?.url || file?.path || ''
    if (!pluginBaseUrl || !/^https?:\/\//i.test(fileUrl)) return ''
    const viewerUrl = new URL('viewer.html', pluginBaseUrl)
    viewerUrl.searchParams.set('fileUrl', fileUrl)
    viewerUrl.searchParams.set('fileName', file.name || 'HTML')
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
        id: 'mira-html',
        title: 'HTML 页面预览',
        icon: 'html',
        extensions: ['html', 'htm'],
        mimeTypes: ['text/html'],
        getPreviewUrl,
      }))
      context.api.log.info('HTML HTTP viewer registered for .html and .htm')
      return {
        cleanup: async function () {
          registrations.splice(0).forEach((unregister) => unregister())
        },
      }
    })
  }

  setup()
})()
