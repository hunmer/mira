/* global window, document */
;(function () {
  const PLUGIN_ID = 'f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192'
  const registrations = []
  const scriptUrl = document.currentScript?.src || ''
  const baseUrl = scriptUrl ? new URL('.', scriptUrl) : null

  async function readerUrl(file, api, embed) {
    if (!baseUrl) throw new Error('EPUB reader URL unavailable')
    const libraryId = String(file.libraryId || '')
    const fileId = String(file.id || '')
    if (!libraryId || !fileId) throw new Error('EPUB file has no library or file ID')
    const files = await api.media.getExtraFileList(libraryId, fileId)
    if (!files.includes('book.epub')) throw new Error('EPUB source is unavailable')
    const url = new URL('viewer.html', baseUrl)
    url.searchParams.set('path', api.media.getExtraFileUrl(libraryId, fileId, 'book.epub'))
    url.searchParams.set('fileName', file.name || 'EPUB')
    url.searchParams.set('fileId', fileId)
    url.searchParams.set('theme', 'LIGHT')
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
      image.alt = file.name || 'EPUB cover'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#f1ede4'
      container.replaceChildren(image)
    }
    const onMessage = (event) => {
      if (event.source === iframe?.contentWindow && event.data?.type === 'mira-epub-preview-error') showFallback()
    }
    window.addEventListener('message', onMessage)
    ;(async () => {
      try {
        iframe = document.createElement('iframe')
        iframe.src = await readerUrl(file, api, true)
        iframe.title = file.name || 'EPUB reader'
        iframe.loading = 'lazy'
        iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#f1ede4'
        iframe.addEventListener('error', showFallback)
        if (!disposed) container.replaceChildren(iframe)
      } catch (error) {
        api.log.error('EPUB preview failed', error)
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
      id: 'mira-epub-reader',
      title: 'EPUB Reader',
      icon: 'menu_book',
      extensions: ['epub'],
      mimeTypes: ['application/epub+zip'],
      getPreviewUrl: (file) => readerUrl(file, api, false),
      renderHoverCard: (container, file) => renderHoverCard(container, file, api),
    }))
    api.log.info('EPUB reader registered')
    return { cleanup: async () => registrations.splice(0).forEach((unregister) => unregister()) }
  }

  function setup() {
    if (window.pluginSystem?.registerPluginInstance) window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    else setTimeout(setup, 100)
  }
  setup()
})()
