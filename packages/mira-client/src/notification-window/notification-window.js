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
            @mouseup="handleDragEnd"
          >
            <span class="material-icons notification-icon" :class="type">{{ displayIcon }}</span>
            <div class="notification-title">{{ title }}</div>
            <button class="notification-close" @click.stop="handleClose" title="关闭">
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
            >{{ action.label }}</button>
          </div>
        </div>
      </div>
    `,
    mounted() {
      document.addEventListener('contextmenu', (e) => e.preventDefault())
      document.addEventListener('dragover', (e) => e.preventDefault())
      document.addEventListener('drop', (e) => e.preventDefault())
      // 鼠标离开窗口（拖到桌面）后也要结束拖拽态
      window.addEventListener('mouseup', this.handleDragEnd)
    },
    unmounted() {
      window.removeEventListener('mouseup', this.handleDragEnd)
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
      // 拖拽：通知主进程临时启用 -webkit-app-region: drag
      handleDragStart() {
        if (this.isDragging) return
        this.isDragging = true
        bridge.send({ type: 'drag-start', timestamp: Date.now() })
      },
      handleDragEnd() {
        if (!this.isDragging) return
        this.isDragging = false
        // 拖拽结束，通知主进程 clamp 到屏幕内
        bridge.send({ type: 'drag-end', timestamp: Date.now() })
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
