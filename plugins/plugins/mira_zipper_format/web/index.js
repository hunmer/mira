/* global window, document */
;(function () {
  const PLUGIN_ID = 'c3e7a1f2-9b4d-4e8a-b6c1-2f5d7a9e1b04'
  const INDEX_FILE = '__index.json'
  const registrations = []
  const scriptUrl = document.currentScript && document.currentScript.src
  const baseUrl = scriptUrl ? new URL('.', scriptUrl) : null

  async function buildPreviewUrl(file, api, embed) {
    if (!baseUrl) throw new Error('Zipper viewer URL unavailable')
    const libraryId = String(file.libraryId || '')
    const fileId = String(file.id || '')
    if (!libraryId || !fileId) throw new Error('ZIP file has no library or file ID')
    const files = await api.media.getExtraFileList(libraryId, fileId)
    if (!files.includes(INDEX_FILE)) throw new Error('ZIP index is unavailable')
    const url = new URL('viewer.html', baseUrl)
    url.searchParams.set('indexUrl', api.media.getExtraFileUrl(libraryId, fileId, INDEX_FILE))
    url.searchParams.set('fileName', file.name || 'Archive')
    url.searchParams.set('fileId', fileId)
    if (embed) url.searchParams.set('embed', '1')
    return url.toString()
  }

  function renderHoverCard(container, file, api) {
    let disposed = false
    let iframe
    const showFallback = () => {
      if (disposed || !file.thumbnailPath) return
      const image = document.createElement('img')
      image.src = file.thumbnailPath
      image.alt = file.name || 'ZIP archive'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#f4f4f5'
      container.replaceChildren(image)
    }
    const onMessage = (event) => {
      if (event.source === iframe && iframe.contentWindow && event.data && event.data.type === 'mira-zipper-preview-error') {
        showFallback()
      }
    }
    window.addEventListener('message', onMessage)
    ;(async () => {
      try {
        iframe = document.createElement('iframe')
        iframe.src = await buildPreviewUrl(file, api, true)
        iframe.title = file.name || 'Archive reader'
        iframe.loading = 'lazy'
        iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#f4f4f5'
        iframe.addEventListener('error', showFallback)
        if (!disposed) container.replaceChildren(iframe)
      } catch (error) {
        api.log.error('Zipper preview failed', error)
        showFallback()
      }
    })()
    return () => {
      disposed = true
      window.removeEventListener('message', onMessage)
      container.replaceChildren()
    }
  }

  async function initialize(context) {
    const { api } = context
    registrations.push(api.media.registerFileFormat({
      id: 'mira-zipper',
      title: '归档浏览',
      icon: 'folder_zip',
      extensions: ['zip'],
      mimeTypes: ['application/zip', 'application/x-zip-compressed'],
      openByDefault: true,
      getPreviewUrl: (file) => buildPreviewUrl(file, api, false),
      renderHoverCard: (container, file) => renderHoverCard(container, file, api),
    }))
    api.log.info('Zipper archive preview registered')
    return {
      cleanup: async () => registrations.splice(0).forEach((unregister) => unregister()),
    }
  }

  function setup() {
    if (window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    } else {
      setTimeout(setup, 100)
    }
  }
  setup()
})()
