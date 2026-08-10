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

class PsdViewerPlugin {
  private pluginName = 'psd-viewer';
  private unregisterFormat?: () => void;

  constructor(inst: any) {
    const pluginManager = inst.pluginManager as FileFormatManager;

    this.unregisterFormat = pluginManager.registerFileFormat(this.pluginName, {
      id: 'mira-psd',
      extensions: ['psd', 'psb'],
      mimeTypes: ['image/vnd.adobe.photoshop'],
      viewers: [{
        viewerId: 'mira-psd',
        title: 'PSD 分层预览',
        icon: 'layers',
        entry: 'dist/index.html',
        priority: 10,
        getQuery: ({ file, fileId, fileUrl }) => ({
          fileId,
          psdUrl: fileUrl,
          fileName: file.name || 'PSD',
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
  return new PsdViewerPlugin(inst);
}
