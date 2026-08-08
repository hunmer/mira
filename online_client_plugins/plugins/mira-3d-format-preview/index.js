/* global window */
;(function () {
  const PLUGIN_ID = 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70'
  const registrations = []

  function project(point, rx, ry, scale, width, height) {
    let x = point[0]
    let y = point[1] * Math.cos(rx) - point[2] * Math.sin(rx)
    let z = point[1] * Math.sin(rx) + point[2] * Math.cos(rx)
    const rotatedX = x * Math.cos(ry) - z * Math.sin(ry)
    const rotatedZ = x * Math.sin(ry) + z * Math.cos(ry)
    const perspective = scale / (1 + rotatedZ / 5)
    return [width / 2 + rotatedX * perspective, height / 2 + y * perspective]
  }

  function drawCube(canvas, rx, ry, scale) {
    const context = canvas.getContext('2d')
    if (!context) return
    const width = canvas.width
    const height = canvas.height
    const points = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ].map((point) => project(point, rx, ry, scale, width, height))
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
    context.clearRect(0, 0, width, height)
    context.strokeStyle = '#79e2c0'
    context.lineWidth = Math.max(1, width / 90)
    edges.forEach(([from, to]) => {
      context.beginPath()
      context.moveTo(points[from][0], points[from][1])
      context.lineTo(points[to][0], points[to][1])
      context.stroke()
    })
  }

  function mountViewer(container, file, large) {
    const canvas = document.createElement('canvas')
    const size = large ? 560 : 160
    canvas.width = size
    canvas.height = size
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.cursor = 'grab'
    container.replaceChildren(canvas)

    let rx = 0.55
    let ry = -0.6
    let raf = 0
    let dragging = false
    let lastX = 0
    let lastY = 0

    const render = () => {
      if (!dragging) ry += 0.008
      drawCube(canvas, rx, ry, large ? 150 : 42)
      raf = requestAnimationFrame(render)
    }
    const onPointerDown = (event) => {
      dragging = true
      lastX = event.clientX
      lastY = event.clientY
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event) => {
      if (!dragging) return
      ry += (event.clientX - lastX) * 0.01
      rx += (event.clientY - lastY) * 0.01
      lastX = event.clientX
      lastY = event.clientY
    }
    const onPointerUp = () => {
      dragging = false
      canvas.style.cursor = 'grab'
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    render()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      container.replaceChildren()
    }
  }

  function toPreviewUrl(value) {
    if (!value) return ''
    if (/^(https?|file):/i.test(value)) return value
    const normalized = value.replace(/\\/g, '/')
    if (/^[a-zA-Z]:/.test(normalized)) return `file:///${normalized}`
    return normalized
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
        renderThumbnail: (container, file) => mountViewer(container, file, false),
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
    if (window.pluginSystem && window.pluginSystem.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    } else {
      setTimeout(setup, 100)
    }
  }

  setup()
})()
