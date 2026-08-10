/* global window, document */
;(function () {
  const PLUGIN_ID = 'b2389538-38f6-4cd9-92b9-54a450d588b0'
  const registrations = []
  const scriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = scriptUrl ? new URL('.', scriptUrl) : null

  function sourceUrl(file) {
    const value = file.url || file.path || file.localFile || ''
    if (!value) return ''
    if (/^(https?|file|blob):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    return /^[a-zA-Z]:/.test(normalized) ? `file:///${normalized}` : normalized
  }

  function viewerUrl(file, embed) {
    if (!pluginBaseUrl) throw new Error('SWF viewer URL unavailable')
    const fileUrl = sourceUrl(file)
    if (!fileUrl) throw new Error('SWF source URL unavailable')
    const url = new URL('viewer.html', pluginBaseUrl)
    url.searchParams.set('fileUrl', fileUrl)
    url.searchParams.set('fileName', file.name || 'SWF')
    url.searchParams.set('fileId', String(file.id || ''))
    if (embed) url.searchParams.set('embed', '1')
    return url.toString()
  }

  function renderHoverCard(container, file, api) {
    let disposed = false
    let iframe
    const fallback = () => {
      if (disposed) return
      if (!file.thumbnailPath) return container.replaceChildren()
      const image = document.createElement('img')
      image.src = file.thumbnailPath
      image.alt = file.name || 'SWF preview'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;background:#111'
      container.replaceChildren(image)
    }
    const onMessage = (event) => {
      if (event.source === iframe?.contentWindow && event.data?.type === 'mira-swf-preview-error') fallback()
    }
    window.addEventListener('message', onMessage)
    try {
      iframe = document.createElement('iframe')
      iframe.src = viewerUrl(file, true)
      iframe.title = file.name || 'SWF player'
      iframe.loading = 'lazy'
      iframe.allow = 'autoplay; fullscreen'
      iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#111'
      iframe.addEventListener('error', fallback)
      container.replaceChildren(iframe)
    } catch (error) {
      api.log.error('SWF preview failed', error)
      fallback()
    }
    return () => {
      disposed = true
      window.removeEventListener('message', onMessage)
      container.replaceChildren()
    }
  }

  async function initialize(context) {
    const { api } = context
    registrations.push(api.media.registerFileFormat({
      id: 'mira-swf-player',
      title: 'SWF Player',
      icon: 'movie',
      extensions: ['swf'],
      mimeTypes: ['application/x-shockwave-flash', 'application/vnd.adobe.flash.movie'],
      getPreviewUrl: (file) => viewerUrl(file, false),
      renderHoverCard: (container, file) => renderHoverCard(container, file, api),
    }))
    api.log.info('SWF Ruffle viewer registered')
    return { cleanup: async () => registrations.splice(0).forEach((unregister) => unregister()) }
  }

  function setup() {
    if (window.pluginSystem?.registerPluginInstance) window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    else setTimeout(setup, 100)
  }
  setup()
})()
