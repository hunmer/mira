;(function () {
  const PLUGIN_ID = 'f4a8c6d2-7b91-4e2f-9c35-1d6a8b0e3f72'
  function setup () {
    if (!window.pluginSystem?.registerPluginInstance) return setTimeout(setup, 100)
    window.pluginSystem.registerPluginInstance(PLUGIN_ID, async function (context) {
      const registrations = []
      const api = context.api
      if (window.pluginSystem.contributions?.register) {
        registrations.push(window.pluginSystem.contributions.register({
          id: 'mira-tiptap:open-editor', pluginId: PLUGIN_ID, title: 'Tiptap 文档编辑器',
          icon: { type: 'material', value: 'edit_note' }, behavior: 'window',
          onActivate: () => api.window.openPluginWindow({ entry: 'dist/index.html', title: 'Tiptap 文档编辑器', width: 1100, height: 820, query: { new: '1' } }),
        }))
      }
      return { cleanup: async function () { registrations.splice(0).forEach((unregister) => { if (typeof unregister === 'function') unregister() }) } }
    })
  }
  setup()
})()
