/* global window, document */
;(function () {
  const PLUGIN_ID = 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70'
  const registrations = []
  const currentScriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = currentScriptUrl ? new URL('.', currentScriptUrl) : null

  function toPreviewUrl(value) {
    if (!value) return ''
    if (/^(https?|file|blob):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    if (/^[a-zA-Z]:/.test(normalized)) return `file:///${normalized}`
    return normalized
  }

  function mountHoverCard(container, file) {
    const fileUrl = toPreviewUrl(file.url || file.path || file.localFile || '')
    const thumbnailUrl = file.thumbnailPath || ''
    let timeoutId
    let disposed = false

    const showFallback = () => {
      if (disposed || !thumbnailUrl) return
      const image = document.createElement('img')
      image.src = thumbnailUrl
      image.alt = file.name || '3D model thumbnail'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'
      container.replaceChildren(image)
    }

    if (!pluginBaseUrl || !fileUrl) {
      showFallback()
      return () => {
        disposed = true
        container.replaceChildren()
      }
    }

    const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
    viewerUrl.searchParams.set('embed', '1')
    viewerUrl.searchParams.set('fileUrl', fileUrl)
    viewerUrl.searchParams.set('fileName', file.name || '3D model')
    viewerUrl.searchParams.set('mimeType', file.mimeType || '')
    viewerUrl.searchParams.set('fileId', String(file.id || ''))

    const iframe = document.createElement('iframe')
    iframe.src = viewerUrl.toString()
    iframe.title = file.name || '3D model preview'
    iframe.loading = 'lazy'
    iframe.allow = 'fullscreen'
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#0b121b'

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return
      if (event.data?.fileId !== String(file.id || '')) return
      if (event.data?.type === 'mira-3d-preview-loaded') {
        clearTimeout(timeoutId)
      } else if (event.data?.type === 'mira-3d-preview-error') {
        clearTimeout(timeoutId)
        showFallback()
      }
    }
    const onIframeError = () => {
      clearTimeout(timeoutId)
      showFallback()
    }

    window.addEventListener('message', onMessage)
    iframe.addEventListener('error', onIframeError)
    container.replaceChildren(iframe)
    timeoutId = window.setTimeout(showFallback, 30000)

    return () => {
      disposed = true
      clearTimeout(timeoutId)
      window.removeEventListener('message', onMessage)
      iframe.removeEventListener('error', onIframeError)
      container.replaceChildren()
    }
  }

  function getPreviewUrl(file) {
    if (!pluginBaseUrl) return ''
    const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
    viewerUrl.searchParams.set('fileUrl', toPreviewUrl(file.url || file.path || file.localFile || ''))
    viewerUrl.searchParams.set('fileName', file.name || '3D model')
    viewerUrl.searchParams.set('mimeType', file.mimeType || '')
    viewerUrl.searchParams.set('fileId', String(file.id || ''))
    return viewerUrl.toString()
  }

  class ThreeFormatPreviewPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      const unregister = api.media.registerFileFormat({
        id: 'mira-3d-model',
        extensions: ['glb', 'gltf'],
        mimeTypes: ['model/gltf-binary', 'model/gltf+json'],
        getPreviewUrl,
        renderHoverCard: mountHoverCard,
        open: (file) => {
          const w = window.electronAPI
          if (!w?.pluginWindow?.open) {
            api.ui.showNotification('当前环境不支持打开 3D 窗口', 'warning')
            return true
          }
          return w.pluginWindow.open({
            pluginId: PLUGIN_ID,
            entry: 'dist/index.html',
            title: `3D 预览 - ${file.name || '模型'}`,
            width: 1280,
            height: 860,
            query: {
              fileUrl: toPreviewUrl(file.url || file.path || file.localFile || ''),
              fileName: file.name || '3D model',
              mimeType: file.mimeType || '',
            },
          }).then(() => true)
        },
      })
      registrations.push(unregister)
      api.log.info('3D format preview registered for GLB/GLTF')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new ThreeFormatPreviewPlugin(context)
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
