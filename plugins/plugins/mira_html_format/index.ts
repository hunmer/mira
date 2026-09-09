interface FileFormatManager {
  registerFileFormat(pluginName: string, handler: {
    id: string
    extensions: string[]
    mimeTypes?: string[]
    viewers: Array<{
      viewerId: string
      title: string
      icon?: string
      entry: string
      priority?: number
      getQuery: (context: any) => Record<string, unknown>
    }>
  }): () => void
}

const PLUGIN_NAME = 'mira_html_format'

class HtmlFormatPlugin {
  private unregister?: () => void

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager
    this.unregister = pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: PLUGIN_NAME,
      extensions: ['html', 'htm'],
      mimeTypes: ['text/html'],
      viewers: [{
        viewerId: 'mira-html',
        title: 'HTML 页面预览',
        icon: 'html',
        entry: 'viewer.html',
        priority: 20,
        getQuery: ({ file, fileId, fileUrl }: any) => ({
          fileId,
          fileName: file?.name || 'HTML',
          fileUrl,
        }),
      }],
    })
  }

  cleanup(): void {
    this.unregister?.()
    this.unregister = undefined
  }
}

export function init(inst: any) {
  return new HtmlFormatPlugin(inst)
}
