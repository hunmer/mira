/* global window, document */
;(function () {
  const PLUGIN_ID = '8fbfb659-395d-4fe4-a745-a5aebe0f1dc0'
  const registrations = []
  const scriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = scriptUrl ? new URL('.', scriptUrl) : null

  async function getPreviewUrl(file, api) {
    if (!pluginBaseUrl) throw new Error('LIVP viewer URL unavailable')
    const libraryId = String(file.libraryId || '')
    const fileId = String(file.id || '')
    if (!libraryId || !fileId) throw new Error('LIVP 文件缺少素材库或文件 ID')
    const files = await api.media.getExtraFileList(libraryId, fileId)
    if (!files.includes('photo.png') || !files.includes('video.mp4')) {
      throw new Error('LIVP 文件缺少照片或视频')
    }
    const viewerUrl = new URL('viewer.html', pluginBaseUrl)
    viewerUrl.searchParams.set('imageUrl', api.media.getExtraFileUrl(libraryId, fileId, 'photo.png'))
    viewerUrl.searchParams.set('videoUrl', api.media.getExtraFileUrl(libraryId, fileId, 'video.mp4'))
    viewerUrl.searchParams.set('fileName', file.name || 'Live Photo')
    viewerUrl.searchParams.set('fileId', fileId)
    return viewerUrl.toString()
  }

  class LivpFormatPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      registrations.push(api.media.registerFileFormat({
        id: 'mira-livp',
        title: 'Live Photo 预览',
        icon: 'live_photo',
        extensions: ['livp'],
        mimeTypes: ['application/x-livp'],
        getPreviewUrl: (file) => getPreviewUrl(file, api),
      }))
      api.log.info('LIVP format preview registered')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new LivpFormatPlugin(context)
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
