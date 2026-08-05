/**
 * 悬浮球窗口入口
 *
 * 基于通用 FloatingWindowCore 与主进程通信。
 * - 自定义拖拽：全向自由移动（nt-drag-* 消息），松手后主进程 clamp 到屏幕内并持久化
 * - 接收文件拖放：用 webUtils.getPathForFile 取真实路径，转发主渲染进程触发上传
 * - 点击行为：由主进程按设置决定（打开上传对话框 / 切换主窗口）
 */

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const Core = window.FloatingWindowCore
    if (!Core || typeof Vue === 'undefined') {
      const app = document.getElementById('floating-ball-app')
      app.innerHTML = '<div style="color:#ef4444;text-align:center;font-size:12px;">悬浮球初始化失败</div>'
      return
    }

    await initFloatingBall()
  } catch (error) {
    console.error('悬浮球初始化失败:', error)
  }
})

let bridgeRef = null

async function initFloatingBall() {
  const Core = window.FloatingWindowCore
  const { createApp } = Vue

  const bridge = Core.createBridge({
    role: 'floating-ball',
    onMessage: (data) => {
      // 预留：接收主进程下发的消息（如更换图标）
      if (data.type === 'fb-state') {
        // noop
      }
    },
    onReady: () => {
      bridge.send({ type: 'fb-ready', timestamp: Date.now() })
    },
  })
  bridgeRef = bridge
  bridge.start()

  const app = createApp({
    data() {
      return {
        isDragging: false,
        isDragover: false,
        // 自定义拖拽追踪（相对增量，主进程 setPosition）
        dragStartCursor: null,
        // 本次按下是否真的发生过位移（用于区分点击与拖拽）
        dragMoved: false,
      }
    },
    template: `
      <div
        class="floating-ball fb-pulse"
        :class="{ 'is-dragging': isDragging, 'is-dragover': isDragover }"
        title="拖拽移动 · 拖入文件上传 · 单击触发动作"
        @mousedown="handleDragStart"
        @click="handleClick"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <span class="material-icons">add</span>
        <div class="fb-drop-hint" :class="{ 'is-visible': isDragover }">松开以导入文件</div>
      </div>
    `,
    mounted() {
      document.addEventListener('contextmenu', (e) => e.preventDefault())
      // 拖拽期间在 document 上追踪 mousemove/mouseup（鼠标离开窗口也能继续）
      this._onMouseMove = (e) => this.handleDragMove(e)
      this._onMouseUp = (e) => this.handleDragEnd(e)
      document.addEventListener('mousemove', this._onMouseMove)
      document.addEventListener('mouseup', this._onMouseUp)
    },
    unmounted() {
      if (this._onMouseMove) document.removeEventListener('mousemove', this._onMouseMove)
      if (this._onMouseUp) document.removeEventListener('mouseup', this._onMouseUp)
    },
    methods: {
      handleClick() {
        // 拖拽发生过则不触发点击
        if (this.dragMoved) {
          this.dragMoved = false
          return
        }
        bridge.send({ type: 'fb-click', timestamp: Date.now() })
      },
      // ===== 自定义 JS 拖拽（全向自由移动，主进程 setPosition）=====
      handleDragStart(e) {
        // 仅左键触发
        if (e.button !== 0 || this.isDragging) return
        this.isDragging = true
        this.dragMoved = false
        this.dragStartCursor = { x: e.screenX, y: e.screenY }
        bridge.send({ type: 'nt-drag-start', timestamp: Date.now() })
        e.preventDefault()
      },
      handleDragMove(e) {
        if (!this.isDragging || !this.dragStartCursor) return
        // 记录最新光标位置，用 rAF 节流，避免 mousemove 高频发消息淹没主进程
        this._lastMove = { x: e.screenX, y: e.screenY }
        if (this._rafId) return
        this._rafId = requestAnimationFrame(() => {
          this._rafId = 0
          if (!this.isDragging || !this.dragStartCursor || !this._lastMove) return
          const deltaX = this._lastMove.x - this.dragStartCursor.x
          const deltaY = this._lastMove.y - this.dragStartCursor.y
          // 任一方向有实际位移即视为拖拽
          if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) this.dragMoved = true
          bridge.send({ type: 'nt-drag-move', deltaX, deltaY, timestamp: Date.now() })
        })
      },
      handleDragEnd() {
        if (!this.isDragging) return
        this.isDragging = false
        this.dragStartCursor = null
        if (this._rafId) {
          cancelAnimationFrame(this._rafId)
          this._rafId = 0
        }
        bridge.send({ type: 'nt-drag-end', timestamp: Date.now() })
      },
      // ===== 文件拖放：取真实路径转发主渲染进程 =====
      onDragEnter(e) {
        // 仅当拖入的是文件时高亮
        if (hasFiles(e)) this.isDragover = true
      },
      onDragOver(e) {
        if (hasFiles(e)) this.isDragover = true
      },
      onDragLeave(e) {
        // 离开球体区域时取消高亮（dragleave 会冒泡，简单处理即可）
        this.isDragover = false
      },
      onDrop(e) {
        this.isDragover = false
        const files = collectDroppedFiles(e)
        if (files.length === 0) return
        bridge.send({ type: 'fb-file-drop', files, timestamp: Date.now() })
      },
    },
  })

  app.mount('#floating-ball-app')
}

/**
 * 判断拖放事件是否包含文件
 */
function hasFiles(e) {
  if (!e.dataTransfer) return false
  // 某些类型表示拖入的是文件
  return Array.from(e.dataTransfer.types || []).includes('Files')
}

/**
 * 从 drop 事件收集文件节点（含真实路径）。
 * 路径经 preload 暴露的 webUtils.getPathForFile 获取。
 */
function collectDroppedFiles(e) {
  const dt = e.dataTransfer
  if (!dt) return []
  const api = window.electronAPI || {}
  const fileArr = Array.from(dt.files || [])
  const result = []
  for (const f of fileArr) {
    let path = ''
    try {
      path = typeof api.getPathForFile === 'function' ? api.getPathForFile(f) : ''
    } catch (_) {
      path = ''
    }
    const name = f.name || ''
    const ext = extractExt(name)
    result.push({
      name,
      path,
      isDir: false,
      size: f.size || 0,
      ext,
    })
  }
  return result
}

function extractExt(name) {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}
