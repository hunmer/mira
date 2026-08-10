interface FileFormatManager {
  registerFileFormat(pluginName: string, handler: {
    id: string;
    extensions: string[];
    mimeTypes?: string[];
    viewers: Array<{
      viewerId: string;
      title: string;
      icon?: string;
      entry: string;
      priority?: number;
      getQuery: (context: any) => Record<string, unknown>;
    }>;
  }): () => void;
}

/**
 * PDF 预览插件（服务端入口）
 *
 * 注册 PDF 文件格式和服务端 Viewer，预览页使用浏览器内置 PDF 渲染器，
 * Mira 客户端无需引入 PDF 解析依赖。
 */
class PdfViewerPlugin {
  private pluginName = 'pdf-viewer';
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager;

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: 'mira-pdf',
      extensions: ['pdf'],
      mimeTypes: ['application/pdf'],
      viewers: [{
        viewerId: 'mira-pdf',
        title: 'PDF 文档预览',
        icon: 'picture_as_pdf',
        entry: 'viewer.html',
        priority: 10,
        getQuery: ({ file, fileId, fileUrl }) => ({
          fileId,
          pdfUrl: fileUrl,
          fileName: file.name || 'PDF',
        }),
      }],
    });
  }

  cleanup(): void {
    this.unregisterFormat?.();
    this.unregisterFormat = undefined;
  }
}

export function init(inst: any) {
  return new PdfViewerPlugin(inst);
}
