;(function () {
  const PLUGIN_ID = '7e2d31a4-8a3f-4bd8-a44c-f5a7b2d0c901'
  const CONTRIBUTION_ID = 'mira-custom-tab-demo:open'

  class CustomTabDemoPlugin {
    constructor(context) {
      this.api = context.api
    }

    async initialize() {
      if (!this.api.tabs?.registerCustomTab) {
        throw new Error('当前客户端不支持自定义 Tab API')
      }

      this.unregisterTab = this.api.tabs.registerCustomTab({
        id: 'main',
        label: '自定义 UI Demo',
        icon: 'widgets',
        iconColor: '#8B5CF6',
        render: (container, context) => {
          let count = 0
          container.innerHTML = `
            <main style="min-height:100%;padding:32px;background:linear-gradient(135deg,#111827,#312e81);color:#fff;font-family:system-ui">
              <div style="max-width:720px;margin:auto;padding:32px;border:1px solid rgba(255,255,255,.18);border-radius:20px;background:rgba(255,255,255,.08);box-shadow:0 24px 70px rgba(0,0,0,.25)">
                <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd">Mira Client Plugin API</div>
                <h1 style="margin:10px 0;font-size:36px">自定义 Tab UI</h1>
                <p style="color:#ddd6fe;line-height:1.7">此界面完全由插件的 DOM render 回调创建，宿主负责 Tab 生命周期和清理。</p>
                <button data-count style="margin-top:20px;padding:10px 18px;border:0;border-radius:10px;background:#8b5cf6;color:white;cursor:pointer">点击计数：0</button>
                <pre style="margin-top:24px;padding:16px;border-radius:12px;background:rgba(0,0,0,.25);white-space:pre-wrap">Tab ID: ${context.tabId}\nPlugin ID: ${context.pluginId}</pre>
              </div>
            </main>`
          const button = container.querySelector('[data-count]')
          const onClick = () => {
            count += 1
            button.textContent = `点击计数：${count}`
          }
          button.addEventListener('click', onClick)
          return () => {
            button.removeEventListener('click', onClick)
            container.replaceChildren()
          }
        }
      })

      window.pluginSystem?.contributions?.register({
        id: CONTRIBUTION_ID,
        pluginId: PLUGIN_ID,
        title: '打开自定义 Tab Demo',
        icon: { type: 'material', value: 'widgets' },
        behavior: 'window',
        onActivate: () => this.api.tabs.openCustomTab('main')
      })

      this.api.log.info('自定义 Tab Demo 已注册')
    }

    async cleanup() {
      window.pluginSystem?.contributions?.unregister(CONTRIBUTION_ID)
      this.unregisterTab?.()
      this.api.log.info('自定义 Tab Demo 已清理')
    }
  }

  async function initialize(context) {
    const plugin = new CustomTabDemoPlugin(context)
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
