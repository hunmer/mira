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
        console.info('[NotificationDebug] content received', data.payload)
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
        icons: [],
        type: 'info',
        actions: [],
        html: '',
        hasContent: false,
        isDragging: false,
        // 自定义拖拽追踪（相对增量，主进程 setPosition）
        dragStartCursor: null,
        // 本次按下是否真的发生过位移（用于区分点击与拖拽）
        dragMoved: false,
        // 出现动画类型
        animation: 'slide',
        // 是否允许拖拽（center 位置禁止）
        draggable: true,
        // 业务自定义数据（如 { fileId }），点击/操作时原样回传
        data: null,
      }
    },
    computed: {
      // icon 是否为图片 URL（http(s):// / file:// / data:），否则视为 Material Icons 名称
      // 加载失败(_thumbFailed)时回退到 Material Icons
      isIconUrl() {
        if (this._thumbFailed) return false
        return typeof this.icon === 'string' &&
          /^(https?:|file:|data:|\/\/)/i.test(this.icon)
      },
      displayIcons() {
        if (!Array.isArray(this.icons)) return []
        return [...new Set(this.icons.filter((icon) =>
          typeof icon === 'string' && /^(https?:|file:|data:|\/\/)/i.test(icon)
        ))].slice(0, 4)
      },
      displayIcon() {
        // 非 URL 时按类型回退到 Material Icons 名称
        if (this.isIconUrl) return ''
        if (this.icon) return this.icon
        switch (this.type) {
          case 'success': return 'check_circle'
          case 'warning': return 'warning'
          case 'error': return 'error'
          case 'info':
          default: return 'notifications'
        }
      },
      // 动画 class：slide 细化为四向（由主进程位置决定方向）
      animationClass() {
        switch (this.animation) {
          case 'fade': return 'anim-fade'
          case 'zoom': return 'anim-zoom'
          case 'bounce': return 'anim-bounce'
          case 'none': return ''
          case 'slide':
          default:
            return 'anim-slide-' + (this._animDir || 'right')
        }
      },
    },
    template: `
      <div
        v-if="hasContent"
        class="notification-card"
        :class="[animationClass, { 'is-dragging': isDragging, 'is-draggable': draggable }]"
        @mousedown="handleDragStart"
        @click="handleCardClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <div class="notification-bar" :class="type"></div>
        <!-- 最左侧：缩略图 / 图标（大尺寸） -->
        <div class="notification-thumb-wrap" :class="type">
          <div v-if="displayIcons.length > 1" class="notification-thumb-grid">
            <img
              v-for="thumb in displayIcons"
              :key="thumb"
              :src="thumb"
              class="notification-thumb-grid-item"
              draggable="false"
              referrerpolicy="no-referrer"
              @error="$event.currentTarget.style.visibility = 'hidden'"
              @mousedown.prevent
            />
          </div>
          <img
            v-else-if="isIconUrl"
            :src="icon"
            class="notification-thumb"
            draggable="false"
            referrerpolicy="no-referrer"
            @error="onThumbError"
            @mousedown.prevent
          />
          <span v-else class="material-icons notification-icon" :class="type">{{ displayIcon }}</span>
        </div>
        <!-- 右侧：信息区 -->
        <div class="notification-main">
          <div class="notification-header">
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
              @pointerdown.stop="debugActionPointer(action, $event)"
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
        this.icons = Array.isArray(payload.icons) ? payload.icons : []
        this.type = payload.type || 'info'
        this.actions = Array.isArray(payload.actions) ? payload.actions : []
        this._thumbFailed = false
        this.html = payload.html || ''
        this.animation = payload.animation || 'slide'
        this._animDir = payload.__animDir || 'right'
        this.draggable = payload.__draggable !== false
        this.data = payload.data || null
        this.hasContent = true
      },
      // 缩略图加载失败 → 回退到 Material Icons
      onThumbError() {
        this._thumbFailed = true
      },
      handleCardClick() {
        // 拖拽过则不触发点击
        if (this.dragMoved) {
          this.dragMoved = false
          return
        }
        // 回传业务数据（如 fileId），主进程转发给主渲染进程
        bridge.send({ type: 'click', data: Vue.toRaw(this.data), timestamp: Date.now() })
      },
      debugActionPointer(action, event) {
        console.info('[NotificationDebug] action pointerdown', {
          action,
          button: event.button,
          bridgeReady: bridge.isReady(),
          data: this.data,
        })
      },
      handleAction(action) {
        const message = {
          type: 'action',
          id: action.id,
          data: Vue.toRaw(this.data),
          timestamp: Date.now(),
        }
        console.info('[NotificationDebug] action click, sending message', {
          message,
          bridgeReady: bridge.isReady(),
        })
        bridge.send(message)
      },
      handleClose() {
        bridge.send({ type: 'dismiss', timestamp: Date.now() })
      },
      // ===== 自定义 JS 拖拽（主进程 setPosition，实时 clamp 到屏幕内）=====
      // 使用通知专有消息类型，避免与基类内置 drag-start（-webkit-app-region hack）冲突。
      // 采用「延迟启动」：mousedown 仅记录起点，move 超过阈值才真正发起拖拽，
      // 这样纯点击不会被误判为拖拽（保证 click 回调正常触发）。
      handleDragStart(e) {
        // 居中等不可拖拽位置直接放行（不启动拖拽）
        if (!this.draggable) return
        // 仅左键触发；忽略来自按钮等 no-drag 元素的事件（它们 @mousedown.stop 不会冒泡到这里）
        if (e.button !== 0 || this.isDragging) return
        this.dragMoved = false
        this.dragStartCursor = { x: e.screenX, y: e.screenY }
        this._dragArmed = true // 蓄势：等待 move 超阈值才真正拖拽
      },
      handleDragMove(e) {
        if (!this._dragArmed || !this.dragStartCursor) return
        const deltaX = e.screenX - this.dragStartCursor.x
        const deltaY = e.screenY - this.dragStartCursor.y
        // 超过阈值才真正启动拖拽（避免点击被吞）
        if (!this.isDragging) {
          if (Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) return
          this.isDragging = true
          this.dragMoved = true
          // 真正开始拖拽时才通知主进程记录窗口起点
          bridge.send({ type: 'nt-drag-start', timestamp: Date.now() })
        }
        // rAF 节流，避免 mousemove 高频发消息淹没主进程
        this._lastMove = { x: e.screenX, y: e.screenY }
        if (this._rafId) return
        this._rafId = requestAnimationFrame(() => {
          this._rafId = 0
          if (!this.isDragging || !this.dragStartCursor || !this._lastMove) return
          const dX = this._lastMove.x - this.dragStartCursor.x
          const dY = this._lastMove.y - this.dragStartCursor.y
          // 同时发送 deltaX / deltaY，由主进程按所在位置选择轴并限定方向
          bridge.send({ type: 'nt-drag-move', deltaX: dX, deltaY: dY, timestamp: Date.now() })
        })
      },
      handleDragEnd(e) {
        // 无论是否真正拖拽过，都清理蓄势状态
        this._dragArmed = false
        if (!this.isDragging) {
          this.dragStartCursor = null
          return
        }
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
