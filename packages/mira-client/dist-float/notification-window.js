/**
 * 通知窗口专用入口文件 (Vue 版本)
 *
 * 基于通用 FloatingWindowCore 与主进程通信。
 * - 多实例并存：每条通知一个独立窗口，主进程侧窗口池管理堆叠
 * - 无初次 loading：页面加载后即就绪，等待 notification-content 下发内容
 * - 内容自适应：接收内容后测量实际高度回传 measure-ready
 * - 支持拖拽：卡片头部可拖动移动窗口，松手后主进程 clamp 到屏幕内
 * - 悬停暂停自动消失
 */

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const Core = window.FloatingWindowCore
    if (!Core || typeof Vue === 'undefined') {
      const app = document.getElementById('notification-app')
      app.innerHTML = '<div style="padding:2rem;color:#ef4444;text-align:center;font-size:13px;">通知窗口初始化失败</div>'
      return
    }

    await initNotificationWindow()
  } catch (error) {
    console.error('通知窗口初始化失败:', error)
  }
})

let bridgeRef = null

async function initNotificationWindow() {
  const Core = window.FloatingWindowCore
  const { createApp } = Vue

  // 内容渲染后测量实际高度并回传，主进程据此调整窗口尺寸并重定位
  function reportMeasure() {
    Vue.nextTick(() => {
      const card = document.querySelector('.notification-card')
      if (card) {
        const rect = card.getBoundingClientRect()
        // 高度含 padding，留少量余量
        const height = Math.ceil(rect.height) + 4
        if (bridgeRef) {
          bridgeRef.send({ type: 'measure-ready', height, timestamp: Date.now() })
        }
      }
    })
  }

  const bridge = Core.createBridge({
    role: 'notification',
    onMessage: (data) => {
      if (data.type === 'notification-content' && data.payload) {
        appVM.applyContent(data.payload)
        reportMeasure()
      }
    },
    onReady: () => {
      bridge.send({ type: 'notification-ready', timestamp: Date.now() })
    },
  })
  bridgeRef = bridge
  bridge.start()

  const app = createApp({
    data() {
      return {
        title: '',
        body: '',
        icon: '',
        type: 'info',
        actions: [],
        html: '',
        hasContent: false,
        isDragging: false,
        // 自定义拖拽追踪（相对增量，主进程侧 setPosition）
        dragStartCursor: null,
      }
    },
    computed: {
      displayIcon() {
        if (this.icon) return this.icon
        switch (this.type) {
          case 'success': return 'check_circle'
          case 'warning': return 'warning'
          case 'error': return 'error'
          case 'info':
          default: return 'notifications'
        }
      },
    },
    template: `
      <div
        v-if="hasContent"
        class="notification-card"
        @click="handleCardClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <div class="notification-bar" :class="type"></div>
        <div class="notification-main">
          <div
            class="notification-header"
            @mousedown="handleDragStart"
          >
            <span class="material-icons notification-icon" :class="type">{{ displayIcon }}</span>
            <div class="notification-title">{{ title }}</div>
            <button class="notification-close" @click.stop="handleClose" @mousedown.stop title="关闭">
              <span class="material-icons" style="font-size:16px;">close</span>
            </button>
          </div>
          <div v-if="html" class="notification-html" v-html="html"></div>
          <p v-else-if="body" class="notification-body">{{ body }}</p>
          <div v-if="actions && actions.length" class="notification-actions">
            <button
              v-for="action in actions"
              :key="action.id"
              class="notification-action"
              @click.stop="handleAction(action)"
              @mousedown.stop
            >{{ action.label }}</button>
          </div>
        </div>
      </div>
    `,
    mounted() {
      document.addEventListener('contextmenu', (e) => e.preventDefault())
      document.addEventListener('dragover', (e) => e.preventDefault())
      document.addEventListener('drop', (e) => e.preventDefault())
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
      applyContent(payload) {
        this.title = payload.title || ''
        this.body = payload.body || ''
        this.icon = payload.icon || ''
        this.type = payload.type || 'info'
        this.actions = Array.isArray(payload.actions) ? payload.actions : []
        this.html = payload.html || ''
        this.hasContent = true
      },
      handleCardClick() {
        bridge.send({ type: 'click', timestamp: Date.now() })
      },
      handleAction(action) {
        bridge.send({ type: 'action', id: action.id, timestamp: Date.now() })
      },
      handleClose() {
        bridge.send({ type: 'dismiss', timestamp: Date.now() })
      },
      // ===== 自定义 JS 拖拽（主进程 setPosition，实时 clamp 到屏幕内）=====
      // 使用通知专有消息类型，避免与基类内置 drag-start（-webkit-app-region hack）冲突
      handleDragStart(e) {
        // 仅左键触发
        if (e.button !== 0 || this.isDragging) return
        this.isDragging = true
        this.dragStartCursor = { x: e.screenX, y: e.screenY }
        // 通知主进程记录窗口起始位置
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
          bridge.send({ type: 'nt-drag-move', deltaX, deltaY, timestamp: Date.now() })
        })
      },
      handleDragEnd(e) {
        if (!this.isDragging) return
        this.isDragging = false
        this.dragStartCursor = null
        if (this._rafId) {
          cancelAnimationFrame(this._rafId)
          this._rafId = 0
        }
        bridge.send({ type: 'nt-drag-end', timestamp: Date.now() })
      },
      // 悬停暂停 / 离开恢复自动消失
      handleMouseEnter() {
        bridge.send({ type: 'hover-pause', timestamp: Date.now() })
      },
      handleMouseLeave() {
        bridge.send({ type: 'hover-resume', timestamp: Date.now() })
      },
    },
  })

  const appVM = app.mount('#notification-app')
}
