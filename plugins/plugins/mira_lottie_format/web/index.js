/* global window, document */
;(function () {
  const PLUGIN_ID = '45b1903a-4457-4abd-824b-0d6aa29f5697'
  const registrations = []
  const scriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = scriptUrl ? new URL('.', scriptUrl) : null

  function toFileUrl(file) {
    const value = file.url || file.path || file.localFile || ''
    if (!value) return ''
    if (/^(https?|file|blob):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    return /^[a-zA-Z]:/.test(normalized) ? `file:///${normalized}` : normalized
  }

  function getPreviewUrl(file) {
    if (!pluginBaseUrl) return ''
    const fileUrl = toFileUrl(file)
    if (!fileUrl) return ''
    const viewerUrl = new URL('viewer.html', pluginBaseUrl)
    viewerUrl.searchParams.set('fileUrl', fileUrl)
    viewerUrl.searchParams.set('fileName', file.name || 'dotLottie')
    viewerUrl.searchParams.set('fileId', String(file.id || ''))
    return viewerUrl.toString()
  }

  class LottieFormatPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      registrations.push(api.media.registerFileFormat({
        id: 'mira-lottie',
        title: 'dotLottie 预览',
        icon: 'animation',
        extensions: ['lottie'],
        mimeTypes: ['application/zip+dotlottie', 'application/x-lottie'],
        getPreviewUrl,
      }))
      api.log.info('dotLottie format preview registered')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new LottieFormatPlugin(context)
    await plugin.initialize()
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
