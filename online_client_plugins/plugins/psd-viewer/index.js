/* global window, document */
/**
 * PSD 分层预览插件入口（IIFE）。
 *
 * 职责：
 * 1. 注册 .psd / .psb 文件格式（renderHoverCard 用 iframe 加载悬停预览；
 *    getPreviewUrl 由宿主 IframePreview 加载完整预览）。
 * 2. PSD 二进制由 iframe 内 fetch 主文件 URL（file.path 已带 token）后交给 ag-psd 解析。
 *
 * 注意：FileInfo.path 由 MiraSDKService 构建为带 token 的完整可 fetch URL；
 *       本地 Electron 模式下 file.localFile 为 SMB 映射的本地路径。
 */
;(function () {
  const PLUGIN_ID = 'ea4f60c2-0e0d-41e2-b224-f436fbb4487b'
  const registrations = []
  const currentScriptUrl = document.currentScript?.src || ''
  const pluginBaseUrl = currentScriptUrl ? new URL('.', currentScriptUrl) : null

  /** 把任意路径规整为 iframe 内可 fetch 的 URL（file:// 或 http） */
  function toPreviewUrl(value) {
    if (!value) return ''
    if (/^(https?|file|blob):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    if (/^[a-zA-Z]:/.test(normalized)) return `file:///${normalized}`
    return normalized
  }

  /** 取主文件可 fetch URL（优先 file.path，回退 localFile / url） */
  function resolvePsdUrl(file) {
    return toPreviewUrl(file.path || file.localFile || file.url || '')
  }

  function buildQuery(params) {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
    }
    return usp.toString()
  }

  function getPreviewUrl(file) {
    if (!pluginBaseUrl) return ''
    const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
    viewerUrl.search = buildQuery({
      fileId: String(file.id || ''),
      psdUrl: resolvePsdUrl(file),
      fileName: file.name || 'PSD',
    })
    return viewerUrl.toString()
  }

  function mountHoverCard(container, file, api) {
    const thumbnailUrl = file.thumbnailPath || ''
    let timeoutId
    let disposed = false
    let iframe
    let onMessage
    let onIframeError

    const showFallback = () => {
      if (disposed || !thumbnailUrl) return
      const image = document.createElement('img')
      image.src = thumbnailUrl
      image.alt = file.name || 'PSD thumbnail'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'
      container.replaceChildren(image)
    }

    ;(async () => {
      try {
        if (!pluginBaseUrl) throw new Error('PSD viewer URL unavailable')
        const psdUrl = resolvePsdUrl(file)
        if (disposed || !psdUrl) {
          showFallback()
          return
        }
        const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
        viewerUrl.search = buildQuery({
          embed: '1',
          fileId: String(file.id || ''),
          psdUrl,
          fileName: file.name || 'PSD',
        })
        iframe = document.createElement('iframe')
        iframe.src = viewerUrl.toString()
        iframe.title = file.name || 'PSD preview'
        iframe.loading = 'lazy'
        iframe.allow = 'fullscreen'
        iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#0a0a0a'
        onMessage = (event) => {
          if (event.source !== iframe.contentWindow || event.data?.fileId !== String(file.id || '')) return
          if (event.data?.type === 'mira-psd-preview-loaded') clearTimeout(timeoutId)
          else if (event.data?.type === 'mira-psd-preview-error') {
            clearTimeout(timeoutId)
            showFallback()
          }
        }
        onIframeError = () => {
          clearTimeout(timeoutId)
          showFallback()
        }
        window.addEventListener('message', onMessage)
        iframe.addEventListener('error', onIframeError)
        container.replaceChildren(iframe)
        // 加载超时回退为缩略图
        timeoutId = window.setTimeout(showFallback, 30000)
      } catch (error) {
        api.log.error('PSD preview resources failed', error)
        showFallback()
      }
    })()

    return () => {
      disposed = true
      clearTimeout(timeoutId)
      if (onMessage) window.removeEventListener('message', onMessage)
      if (iframe && onIframeError) iframe.removeEventListener('error', onIframeError)
      container.replaceChildren()
    }
  }

  class PsdViewerPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      const unregister = api.media.registerFileFormat({
        id: 'mira-psd',
        title: 'PSD 分层预览',
        icon: 'layers',
        openByDefault: false,
        extensions: ['psd', 'psb'],
        mimeTypes: ['image/vnd.adobe.photoshop'],
        getPreviewUrl,
        renderHoverCard: (container, file) => mountHoverCard(container, file, api),
      })
      registrations.push(unregister)
      api.log.info('PSD viewer registered for .psd/.psb (ag-psd, browser-local)')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new PsdViewerPlugin(context)
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
