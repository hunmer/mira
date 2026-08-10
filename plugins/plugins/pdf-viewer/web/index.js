/* global window, document */
/**
 * PDF 预览插件入口（IIFE）。
 *
 * 职责：
 * 1. 注册 .pdf 文件格式：getPreviewUrl 直接返回带 token 的文件 URL，
 *    由宿主 IframePreview 用 iframe 加载，浏览器内置 PDF 渲染器负责显示，
 *    前端无需引入 pdfobject / pdf.js 等任何 PDF 依赖。
 * 2. renderHoverCard 提供悬停缩略图回退。
 *
 * 注意：file.path / file.url 由 MiraSDKService 构建为带 token 的完整可 fetch URL；
 *       本地 Electron 模式下 file.localFile 为 SMB 映射的本地路径。
 */
;(function () {
  const PLUGIN_ID = 'b7c1f9a2-3d4e-4f5a-8b6c-7d8e9f0a1b2c'
  const registrations = []

  /** 把任意路径规整为浏览器内置 PDF 渲染器可加载的 URL（http/https/file/blob） */
  function toPreviewUrl(value) {
    if (!value) return ''
    if (/^(https?|file|blob):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    if (/^[a-zA-Z]:/.test(normalized)) return `file:///${normalized}`
    return normalized
  }

  /** 取主文件可加载 URL（优先 file.path，回退 url / localFile） */
  function resolvePdfUrl(file) {
    return toPreviewUrl(file.path || file.url || file.localFile || '')
  }

  function buildQuery(params) {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
    }
    return usp.toString()
  }

  /** 完整预览：直接返回 PDF 文件 URL，由 IframePreview 用 iframe 加载，浏览器原生渲染 */
  function getPreviewUrl(file) {
    const url = resolvePdfUrl(file)
    if (!url) return ''
    // 附加文件名，便于浏览器显示标题；search 仅为可读性，不强制
    const search = buildQuery({ name: file.name || '' })
    return search ? `${url}#${search}` : url
  }

  /** 悬停预览：显示缩略图回退（PDF 二进制较大，不在 hover 卡片中内嵌 iframe） */
  function renderHoverCard(container, file) {
    const thumbnailUrl = file.thumbnailPath || ''
    let disposed = false

    const showFallback = () => {
      if (disposed) return
      if (thumbnailUrl) {
        const image = document.createElement('img')
        image.src = thumbnailUrl
        image.alt = file.name || 'PDF thumbnail'
        image.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'
        container.replaceChildren(image)
      } else {
        const placeholder = document.createElement('div')
        placeholder.style.cssText =
          'display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:3rem;opacity:0.6'
        placeholder.textContent = '📄'
        container.replaceChildren(placeholder)
      }
    }

    showFallback()

    return () => {
      disposed = true
      container.replaceChildren()
    }
  }

  class PdfViewerPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      const unregister = api.media.registerFileFormat({
        id: 'mira-pdf',
        title: 'PDF 文档预览',
        icon: 'file-text',
        openByDefault: true,
        extensions: ['pdf'],
        mimeTypes: ['application/pdf'],
        getPreviewUrl,
        renderHoverCard: (container, file) => renderHoverCard(container, file),
      })
      registrations.push(unregister)
      api.log.info('PDF viewer registered for .pdf (browser-native renderer)')
    }

    async cleanup() {
      registrations.splice(0).forEach((unregister) => unregister())
    }
  }

  async function initialize(context) {
    const plugin = new PdfViewerPlugin(context)
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
