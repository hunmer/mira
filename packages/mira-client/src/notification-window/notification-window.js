/**
 * 通知窗口专用入口文件 (Vue 版本)
 *
 * 基于通用 FloatingWindowCore 与主进程通信。
 * 支持结构化字段（title/body/icon/type/actions）+ 可选任意 HTML 内容。
 */

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const loadingEl = document.querySelector('.loading')
    if (loadingEl) loadingEl.style.display = 'none'

    const Core = window.FloatingWindowCore
    if (!Core || typeof Vue === 'undefined') {
      Core
        ? Core.showError(document.getElementById('notification-app'), 'Vue 框架未正确加载')
        : (document.getElementById('notification-app').innerHTML =
            '<div style="padding:2rem;color:#ef4444;text-align:center;">脚手架未加载</div>')
      return
    }

    await initNotificationWindow()
  } catch (error) {
    console.error('通知窗口初始化失败:', error)
    window.FloatingWindowCore.showError(
      document.getElementById('notification-app'),
      error.message
    )
  }
})

/**
 * 初始化通知窗口 Vue 应用
 */
async function initNotificationWindow() {
  const Core = window.FloatingWindowCore
  const { createApp } = Vue

  // 建立与主进程的 MessagePort 通信
  const bridge = Core.createBridge({
    role: 'notification',
    onMessage: (data) => {
      // 收到通知内容更新
      if (data.type === 'notification-content' && data.payload) {
        appVM.applyContent(data.payload)
      }
    },
    onReady: () => {
      // 通知主进程窗口已就绪
      bridge.send({ type: 'notification-ready', timestamp: Date.now() })
    },
  })
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
      }
    },
    computed: {
      displayIcon() {
        if (this.icon) return this.icon
        switch (this.type) {
          case 'success':
            return 'check_circle'
          case 'warning':
            return 'warning'
          case 'error':
            return 'error'
          case 'info':
          default:
            return 'notifications'
        }
      },
    },
    template: `
      <div
        v-if="hasContent"
        class="notification-card"
        @click="handleCardClick"
        @mouseenter="pauseAutoHide"
        @mouseleave="resumeAutoHide"
      >
        <div :class="['notification-bar', type]"></div>
        <div class="notification-main">
          <div class="notification-header">
            <span :class="['material-icons', 'notification-icon', type]">{{ displayIcon }}</span>
            <div class="notification-title">{{ title }}</div>
            <button class="notification-close" @click.stop="handleClose" title="关闭">
              <span class="material-icons" style="font-size:16px;">close</span>
            </button>
          </div>
          <!-- 自定义 HTML 优先；否则显示结构化 body -->
          <div
            v-if="html"
            class="notification-html"
            v-html="html"
          ></div>
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
      // 禁用右键与拖拽默认行为
      document.addEventListener('contextmenu', (e) => e.preventDefault())
      document.addEventListener('dragover', (e) => e.preventDefault())
      document.addEventListener('drop', (e) => e.preventDefault())
    },
    methods: {
      /**
       * 应用主进程下发的通知内容
       */
      applyContent(payload) {
        this.title = payload.title || ''
        this.body = payload.body || ''
        this.icon = payload.icon || ''
        this.type = payload.type || 'info'
        this.actions = Array.isArray(payload.actions) ? payload.actions : []
        this.html = payload.html || ''
        this.hasContent = true

        // 启动自动隐藏倒计时（duration 由主进程侧统一管理自动 hide，
        // 这里仅做 UI 侧的进度感知，实际关闭由主进程定时触发 dismiss）
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
      // hover 暂停/恢复：通知主进程？目前主进程单一定时器，hover 暂停由
      // 窗口 hideOnBlur=false 维持显示。这里预留接口。
      pauseAutoHide() {},
      resumeAutoHide() {},
    },
  })

  const appVM = app.mount('#notification-app')
  console.log('✅ 通知窗口 Vue 应用初始化完成')
}
