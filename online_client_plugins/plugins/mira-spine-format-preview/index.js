/* global window, document */
/**
 * Spine 格式预览插件入口（IIFE）。
 *
 * 职责：
 * 1. 注册 .skel/.spine 文件格式（renderHoverCard 用 iframe embed 预览；open 打开独立窗口）。
 * 2. .skel 使用同目录资源；.spine 通过 SDK 获取服务端临时解压资源 URL。
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

  function getExtension(file) {
    return String(file.extension || file.name?.split('.').pop() || '').replace(/^\./, '').toLowerCase()
  }

  function pickFile(files, extensions, preferredBase) {
    const matches = files.filter((name) => extensions.some((ext) => name.toLowerCase().endsWith(ext)))
    return matches.find((name) => name.split('/').pop().replace(/\.[^/.]+$/, '').toLowerCase() === preferredBase) || matches[0] || ''
  }

  async function resolveResourceUrls(file, api) {
    if (getExtension(file) !== 'spine') {
      return deriveSiblingUrls(file.localFile || file.path || file.url || '')
    }
    const libraryId = String(file.libraryId || '')
    const fileId = String(file.id || '')
    if (!libraryId || !fileId) throw new Error('Spine 文件缺少素材库或文件 ID')
    const files = await api.media.getExtraFileList(libraryId, fileId)
    const preferredBase = String(file.name || '').replace(/\.spine$/i, '').toLowerCase()
    const skeleton = pickFile(files, ['.json', '.skel'], preferredBase)
    const atlas = pickFile(files, ['.atlas'], preferredBase)
    const png = pickFile(files, ['.png'], preferredBase)
    if (!skeleton || !atlas || !png) throw new Error('Spine 包缺少 .json/.skel、.atlas 或 .png')
    return {
      skel: api.media.getExtraFileUrl(libraryId, fileId, skeleton),
      atlas: api.media.getExtraFileUrl(libraryId, fileId, atlas),
      png: api.media.getExtraFileUrl(libraryId, fileId, png),
    }
  }

  function buildQuery(params) {
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
    }
    return usp.toString()
  }

  async function getPreviewUrl(file, api) {
    if (!pluginBaseUrl) throw new Error('Spine viewer URL unavailable')
    const { skel, atlas, png } = await resolveResourceUrls(file, api)
    const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
    viewerUrl.search = buildQuery({
      skelUrl: skel, atlasUrl: atlas, pngUrl: png,
      fileName: file.name || 'Spine',
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
      image.alt = file.name || 'Spine thumbnail'
      image.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover'
      container.replaceChildren(image)
    }

    ;(async () => {
      try {
        if (!pluginBaseUrl) throw new Error('Spine viewer URL unavailable')
        const { skel, atlas, png } = await resolveResourceUrls(file, api)
        if (disposed || !skel) return
        const viewerUrl = new URL('dist/index.html', pluginBaseUrl)
        viewerUrl.search = buildQuery({
          embed: '1', fileId: String(file.id || ''), skelUrl: skel, atlasUrl: atlas, pngUrl: png,
          fileName: file.name || 'Spine',
        })
        iframe = document.createElement('iframe')
        iframe.src = viewerUrl.toString()
        iframe.title = file.name || 'Spine preview'
        iframe.loading = 'lazy'
        iframe.allow = 'fullscreen'
        iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:#eef0f3'
        onMessage = (event) => {
          if (event.source !== iframe.contentWindow || event.data?.fileId !== String(file.id || '')) return
          if (event.data?.type === 'mira-spine-preview-loaded') clearTimeout(timeoutId)
          else if (event.data?.type === 'mira-spine-preview-error') {
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
        timeoutId = window.setTimeout(showFallback, 30000)
      } catch (error) {
        api.log.error('Spine preview resources failed', error)
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

  class SpineFormatPreviewPlugin {
    constructor(context) {
      this.context = context
    }

    async initialize() {
      const { api } = this.context
      const unregister = api.media.registerFileFormat({
        id: 'mira-spine',
        extensions: ['skel', 'spine'],
        mimeTypes: ['application/x-spine'],
        getPreviewUrl: (file) => getPreviewUrl(file, api),
        renderHoverCard: (container, file) => mountHoverCard(container, file, api),
      })
      registrations.push(unregister)
      api.log.info('Spine format preview registered for .skel/.spine (4.2)')
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
