/**
 * 通用浮动窗口渲染层脚手架
 *
 * 由搜索窗口、通知窗口等独立 HTML 页面共享。
 * 以普通 <script> 引入，暴露全局对象 window.FloatingWindowCore。
 *
 * 提供：
 *   - MessagePort 与主进程的建立（基于 preload 转发的 DOM message）
 *   - 主题应用（dark / light）
 *   - 通用消息发送：send / requestDrag / requestClose / toggleDevtools
 *   - showError：统一的错误占位 UI
 *   - waitForVue：等待全局 Vue 加载完成的工具
 *
 * 注意：每个窗口的 ready 事件 type 由各窗口自行约定（与主进程 messageHandlers 对齐），
 *       本模块在 MessagePort 建立后通过 onReady 回调通知业务代码。
 */
;(function (global) {
  'use strict'

  /**
   * 创建一个浮动窗口通信控制器
   * @param {object} opts
   * @param {string} opts.role          MessagePort 角色标识，用于过滤 connect 消息
   * @param {function} [opts.onMessage] 收到主进程消息时回调 (data) => void
   * @param {function} [opts.onReady]   MessagePort 建立完成回调 () => void
   * @param {function} [opts.onTheme]   主题更新回调 (isDark) => void
   */
  function createBridge(opts) {
    opts = opts || {}
    var role = opts.role
    var port = null

    function start() {
      // 监听来自主进程（经 preload 转发）的 MessagePort 连接
      window.addEventListener('message', function (event) {
        var data = event.data || {}
        var ports = event.ports || []
        // preload 转发 connect 时携带 role
        if (data.role === role && ports[0]) {
          setupPort(ports[0])
        }
      })
    }

    function setupPort(p) {
      port = p
      port.start()
      port.onmessage = function (event) {
        var data = event.data
        if (!data) return

        // 主题更新由核心统一处理
        if (data.type === 'theme-update') {
          applyTheme(!!data.isDark)
          if (typeof opts.onTheme === 'function') opts.onTheme(!!data.isDark)
          return
        }

        if (typeof opts.onMessage === 'function') opts.onMessage(data)
      }

      // 通知主进程窗口已就绪（各业务 ready type 由各窗口自行 send，
      // 这里仅触发 onReady 回调）
      if (typeof opts.onReady === 'function') opts.onReady()

      console.log('✅ [' + role + '] MessagePort 已建立')
    }

    function send(message) {
      if (port) {
        port.postMessage(message)
      } else {
        console.warn('⚠️ [' + role + '] MessagePort 未初始化，消息未发送:', message)
      }
    }

    /** 请求原生拖拽（drag-handle 区域使用） */
    function requestDrag() {
      send({ type: 'drag-start', timestamp: Date.now() })
    }

    /** 请求关闭/隐藏窗口 */
    function requestClose() {
      send({ type: 'close-window', timestamp: Date.now() })
    }

    /** 切换开发者工具 */
    function toggleDevtools() {
      send({ type: 'toggle-devtools', timestamp: Date.now() })
    }

    function isReady() {
      return !!port
    }

    return {
      start: start,
      send: send,
      requestDrag: requestDrag,
      requestClose: requestClose,
      toggleDevtools: toggleDevtools,
      isReady: isReady,
    }
  }

  /**
   * 应用主题到 <html>（dark / light class）
   */
  function applyTheme(isDark) {
    var root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(isDark ? 'dark' : 'light')
  }

  /**
   * 等待全局 Vue 加载完成（轮询）
   */
  function waitForVue(cb, timeout) {
    timeout = timeout || 5000
    var start = Date.now()
    if (typeof global.Vue !== 'undefined') {
      cb()
      return
    }
    var timer = setInterval(function () {
      if (typeof global.Vue !== 'undefined') {
        clearInterval(timer)
        cb()
      } else if (Date.now() - start > timeout) {
        clearInterval(timer)
        cb(new Error('Vue 框架未加载'))
      }
    }, 50)
  }

  /**
   * 在指定容器内显示统一错误占位
   */
  function showError(container, message) {
    if (!container) return
    container.innerHTML =
      '<div style="padding:2rem;text-align:center;color:#EF4444;height:100vh;' +
      'display:flex;align-items:center;justify-content:center;flex-direction:column;' +
      'background:transparent;">' +
      '<span class="material-icons" style="font-size:4rem;margin-bottom:1rem;">error</span>' +
      '<h3 style="margin:0 0 1rem 0;color:#d1d5db;">窗口错误</h3>' +
      '<p style="margin:0;color:#9CA3AF;">' + message + '</p></div>'
  }

  /**
   * 注册全局键盘快捷键（ESC 关闭、Ctrl+W 关闭、F12 devtools）
   * @param {object} bridge createBridge 返回值
   */
  function registerDefaultShortcuts(bridge) {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        bridge.requestClose()
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault()
        bridge.requestClose()
      } else if (event.key === 'F12') {
        event.preventDefault()
        bridge.toggleDevtools()
      }
    })
  }

  global.FloatingWindowCore = {
    createBridge: createBridge,
    applyTheme: applyTheme,
    waitForVue: waitForVue,
    showError: showError,
    registerDefaultShortcuts: registerDefaultShortcuts,
  }
})(window)
