import fs from 'node:fs/promises';

const PLUGIN_NAME = 'mira_tiptap_format';

class MiraTiptapFormatPlugin {
  private unregister?: () => void;

  constructor(inst: any) {
    this.unregister = inst.pluginManager.registerFileFormat(PLUGIN_NAME, {
      id: 'mira-tiptap',
      extensions: ['tiptap'],
      mimeTypes: ['application/vnd.mira.tiptap+json', 'application/json'],
      process: async (filePath: string) => {
        const raw = await fs.readFile(filePath, 'utf8');
        const document = JSON.parse(raw);
        if (!document || typeof document !== 'object' || document.type !== 'doc' || !Array.isArray(document.content)) {
          throw new Error('Invalid Tiptap document');
        }
        return { format: 'tiptap', type: document.type, nodeCount: document.content.length };
      },
      viewers: [{
        viewerId: 'mira-tiptap-editor',
        title: 'Tiptap 编辑器',
        icon: 'edit_note',
        entry: 'dist/index.html',
        priority: 20,
        getQuery: ({ libraryId, fileId, fileUrl, file }: any) => {
          const parsed = new URL(fileUrl);
          return {
            libraryId,
            fileId,
            fileUrl,
            fileName: file?.name || 'document.tiptap',
            apiBaseUrl: parsed.origin,
            token: parsed.searchParams.get('token') || '',
          };
        },
      }],
    });
  }

  cleanup() {
    this.unregister?.();
    this.unregister = undefined;
  }
}

export function init(inst: any) {
  return new MiraTiptapFormatPlugin(inst);
}
