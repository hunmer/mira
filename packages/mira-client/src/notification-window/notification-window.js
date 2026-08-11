/**
 * 通知窗口专用入口文件 (Vue 版本)
 *
 * 基于通用 FloatingWindowCore 与主进程通信。
 * - 同位置聚合：一个窗口渲染同一位置的多条通知
 * - 无初次 loading：页面加载后即就绪，等待 notification-content 下发内容
 * - 内容自适应：接收内容后测量实际高度回传 measure-ready
 * - 支持拖拽：每条卡片可在窗口内部横向滑动，滑出后只移除该条通知
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
      const card = document.querySelector('.notification-list')
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
      } else if (data.type === 'notification-auto-hide') {
        appVM.isAutoHiding = true
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
        items: [],
        body: '',
        icon: '',
        icons: [],
        type: 'info',
        actions: [],
        html: '',
        hasContent: false,
        isAutoHiding: false,
        isDragging: false,
        dragItem: null,
        dragStartCursor: null,
        dragOffsetX: 0,
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
      <TransitionGroup v-if="hasContent" name="notification-position" tag="div" class="notification-list" :class="{ 'is-auto-hiding': isAutoHiding }" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <div
        v-for="(item, index) in items"
        :key="item.__itemKey || item.notificationId || index"
        class="notification-card"
        :class="[animationClass, { 'is-dragging': dragItem === item, 'is-draggable': draggable }]"
        :style="itemStyle(item)"
        @mousedown="handleDragStart(item, $event)"
        @click="handleCardClick(item)"
      >
        <div class="notification-bar" :class="item.type || 'info'"></div>
        <!-- 最左侧：缩略图 / 图标（大尺寸） -->
        <div class="notification-thumb-wrap" :class="item.type || 'info'">
          <template v-if="itemIcons(item).length > 1">
            <div class="notification-thumb-grid">
              <img
                v-for="thumb in itemIcons(item)"
                :key="thumb"
                :src="thumb"
                class="notification-thumb-grid-item"
                draggable="false"
                referrerpolicy="no-referrer"
                @error="$event.currentTarget.style.visibility = 'hidden'"
                @mousedown.prevent
              />
            </div>
            <span class="notification-thumb-badge" :class="item.type || 'info'"></span>
          </template>
          <template v-else-if="itemIsIconUrl(item)">
            <img
              :src="item.icon"
              class="notification-thumb"
              draggable="false"
              referrerpolicy="no-referrer"
              @error="$event.currentTarget.style.visibility = 'hidden'"
              @mousedown.prevent
            />
            <span class="notification-thumb-badge" :class="item.type || 'info'"></span>
          </template>
          <span v-else class="material-icons notification-icon" :class="item.type || 'info'">{{ itemDisplayIcon(item) }}</span>
        </div>
        <!-- 右侧：信息区 -->
        <div class="notification-main">
          <div class="notification-header">
            <div class="notification-title">{{ item.title }}</div>
            <button class="notification-close" @click.stop="handleClose" @mousedown.stop title="关闭">
              <span class="material-icons" style="font-size:16px;">close</span>
            </button>
          </div>
          <div v-if="item.html" class="notification-html" v-html="item.html"></div>
          <p v-else-if="item.body" class="notification-body">{{ item.body }}</p>
          <div v-if="item.actions && item.actions.length" class="notification-actions">
            <button
              v-for="action in item.actions"
              :key="action.id"
              class="notification-action"
              @click.stop="handleAction(action, item)"
              @pointerdown.stop="debugActionPointer(action, $event, item)"
              @mousedown.stop
            >{{ action.label }}</button>
          </div>
        </div>
      </div>
      </TransitionGroup>
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
        this.isAutoHiding = false
        this.items = Array.isArray(payload.__items) ? payload.__items : [payload]
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
      itemIcons(item) {
        return Array.isArray(item.icons) ? [...new Set(item.icons.filter((icon) => typeof icon === 'string' && /^(https?:|file:|data:|\/\/)/i.test(icon)))].slice(0, 4) : []
      },
      itemIsIconUrl(item) {
        return typeof item.icon === 'string' && /^(https?:|file:|data:|\/\/)/i.test(item.icon)
      },
      itemDisplayIcon(item) {
        if (item.icon && !this.itemIsIconUrl(item)) return item.icon
        return { success: 'check_circle', warning: 'warning', error: 'error', info: 'notifications' }[item.type || 'info']
      },
      handleCardClick(item) {
        // 拖拽过则不触发点击
        if (this.dragMoved) {
          this.dragMoved = false
          return
        }
        // 回传业务数据（如 fileId），主进程转发给主渲染进程
        bridge.send({ type: 'click', data: Vue.toRaw(item.data || null), notificationId: item.notificationId, timestamp: Date.now() })
      },
      debugActionPointer(action, event, item) {
        console.info('[NotificationDebug] action pointerdown', {
          action,
          button: event.button,
          bridgeReady: bridge.isReady(),
          data: item.data,
        })
      },
      handleAction(action, item) {
        const message = {
          type: 'action',
          id: action.id,
          data: Vue.toRaw(item.data || null),
          notificationId: item.notificationId,
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
      itemStyle(item) {
        return this.dragItem === item && this.dragOffsetX
          ? { transform: `translateX(${this.dragOffsetX}px)` }
          : null
      },
      handleDragStart(item, e) {
        if (e.button !== 0 || this.isDragging) return
        this.dragItem = item
        this.dragMoved = false
        this.dragStartCursor = { x: e.screenX, y: e.screenY }
        this.dragOffsetX = 0
        this._dragArmed = true
      },
      handleDragMove(e) {
        if (!this._dragArmed || !this.dragStartCursor) return
        const deltaX = e.screenX - this.dragStartCursor.x
        if (!this.isDragging) {
          if (Math.abs(deltaX) < 4) return
          this.isDragging = true
          this.dragMoved = true
        }
        this.dragOffsetX = deltaX
      },
      handleDragEnd() {
        this._dragArmed = false
        const item = this.dragItem
        const offset = this.dragOffsetX
        if (this.isDragging && item && Math.abs(offset) > 100) {
          const index = this.items.indexOf(item)
          bridge.send({ type: 'dismiss-item', notificationId: item.notificationId, index, timestamp: Date.now() })
        }
        this.isDragging = false
        this.dragItem = null
        this.dragOffsetX = 0
        this.dragStartCursor = null
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
