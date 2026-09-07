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

const FORMATS = [
  { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', title: 'Word 文档预览', icon: 'description' },
  { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', title: 'Excel 表格预览', icon: 'grid_on' },
  { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', title: 'PowerPoint 演示预览', icon: 'slideshow' },
  { ext: 'pdf', mime: 'application/pdf', title: 'PDF 文档预览', icon: 'picture_as_pdf' },
]

class OfficeViewerPlugin {
  private unregister?: () => void

  constructor(inst: any) {
    const manager = inst.pluginManager as FileFormatManager
    this.unregister = manager.registerFileFormat('mira_office_viewer', {
      id: 'mira-office-documents',
      extensions: FORMATS.map((format) => format.ext),
      mimeTypes: FORMATS.map((format) => format.mime),
      viewers: FORMATS.map((format) => ({
        viewerId: `mira-office-${format.ext}`,
        title: format.title,
        icon: format.icon,
        entry: 'viewer.html',
        priority: 20,
        getQuery: ({ file, fileId, fileUrl }: any) => ({
          fileId,
          fileUrl,
          fileName: file?.name || `${format.ext.toUpperCase()} 文件`,
          format: format.ext,
        }),
      })),
    })
  }

  cleanup() {
    this.unregister?.()
    this.unregister = undefined
  }
}

export function init(inst: any) {
  return new OfficeViewerPlugin(inst)
}
