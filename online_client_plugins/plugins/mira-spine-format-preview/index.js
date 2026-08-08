/* global window, document */
/**
 * Spine 格式预览插件入口（IIFE）。
 *
 * 职责：
 * 1. 注册 .skel 文件格式（renderHoverCard 用 iframe embed 预览；open 打开独立窗口）。
 * 2. 从 .skel 的真实磁盘路径推导同目录 .atlas / .png 三件套 URL，传给 dist/index.html。
 *
 * 注意：FileInfo.url 在 SDK 中未填充，使用 file.localFile（真实磁盘路径）|| file.path。
 * atlas/png 不单独注册，避免与图片缩略图冲突。
 */
;(function () {
  const PLUGIN_ID = 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081'
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

  /** 由 .skel 真实路径推导同目录 .atlas / .png（同名替换扩展名） */
  function deriveSiblingUrls(rawPath) {
    const url = toPreviewUrl(rawPath)
    if (!url) return { skel: '', atlas: '', png: '' }
    // 去掉 query/hash 后再替换扩展名
    const clean = url.replace(/[?#].*$/, '')
    const base = clean.replace(/\.[^/.]+$/, '')
    return { skel: url, atlas: base + '.atlas', png: base + '.png' }
  }

  function buildQuery(params) {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
    }
    return usp.toString()
  }

  function mountHoverCard(container, file) {
    const rawPath = file.localFile || file.path || file.url || ''
    const { skel, atlas, png } = deriveSiblingUrls(rawPath)
    const thumbnailUrl = file.thumbnailPath || ''
    let timeoutId
    let disposed = false

    const showFallback = () => {
      if (disposed || !thumbnailUrl) return
      const image = document.createElement('img')
      image.src = thumbnailUrl
      image.alt = file.name || 'Spine thumbnail'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'
      container.replaceChildren(image)
    }

    if (!pluginBaseUrl || !skel) {
      showFallback()
      return () => {
        disposed = true
        container.replaceChildren()
      }
    }

    const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
    const qs = buildQuery({
      embed: '1',
      fileId: String(file.id || ''),
      skelUrl: skel,
      atlasUrl: atlas,
      pngUrl: png,
      fileName: file.name || 'Spine',
    })
    viewerUrl.search = qs

    const iframe = document.createElement('iframe')
    iframe.src = viewerUrl.toString()
    iframe.title = file.name || 'Spine preview'
    iframe.loading = 'lazy'
    iframe.allow = 'fullscreen'
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#eef0f3'

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return
      if (event.data?.fileId !== String(file.id || '')) return
      if (event.data?.type === 'mira-spine-preview-loaded') {
        clearTimeout(timeoutId)
      } else if (event.data?.type === 'mira-spine-preview-error') {
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

  class SpineFormatPreviewPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      const unregister = api.media.registerFileFormat({
        id: 'mira-spine',
        extensions: ['skel'],
        mimeTypes: ['application/x-spine'],
        renderHoverCard: mountHoverCard,
        open: (file) => {
          const w = window.electronAPI
          if (!w?.pluginWindow?.open) {
            api.ui.showNotification('当前环境不支持打开 Spine 预览窗口', 'warning')
            return true
          }
          const rawPath = file.localFile || file.path || file.url || ''
          const { skel, atlas, png } = deriveSiblingUrls(rawPath)
          return w.pluginWindow.open({
            pluginId: PLUGIN_ID,
            entry: 'dist/index.html',
            title: `Spine 预览 - ${file.name || '角色'}`,
            width: 1280,
            height: 820,
            query: {
              skelUrl: skel,
              atlasUrl: atlas,
              pngUrl: png,
              fileName: file.name || 'Spine',
            },
          }).then(() => true)
        },
      })
      registrations.push(unregister)
      api.log.info('Spine format preview registered for .skel (3.8)')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new SpineFormatPreviewPlugin(context)
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
