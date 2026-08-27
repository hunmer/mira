// @vitest-environment jsdom
/**
 * DragDropOverlay 内 LibraryTreeView 的拖拽上传链路回归:
 * 1. 网页图片/链接拖到树节点释放 → upload.urls 直接上传(曾因 Boolean prop 缺省 false 导致静默丢弃)
 * 2. 拖到根空白区 → upload.urls 无 target(上传到根)
 * jsdom 无 DragEvent/DataTransfer,用 MouseEvent + 自定义 dataTransfer 模拟。
 */
import { describe, expect, it, vi } from 'vitest';
import { createApp, type App } from 'vue';
import DragDropOverlay from './DragDropOverlay.vue';
import type { LibraryTreeServices, LibraryTreeUpload } from 'mira-plugin-ui/library';
import type { DragSource } from '../dragdrop';

function fakeDataTransfer(types: string[], data: Record<string, string> = {}) {
  return {
    types,
    files: [] as File[],
    getData: (t: string) => data[t] ?? '',
    dropEffect: 'none',
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

function dragEvent(type: string, dt: DataTransfer) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'dataTransfer', { value: dt });
  return e;
}

const services: LibraryTreeServices = {
  listFolders: async () => [{ id: 1, title: '设计素材', parent_id: 0 }],
  listTags: async () => [{ id: 1, title: '灵感', parent_id: 0 }],
  createNode: async () => 1,
  deleteNode: async () => undefined,
};

async function mountOverlay(upload: LibraryTreeUpload) {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const app: App = createApp(DragDropOverlay, {
    source: { url: 'https://example.com/pic.jpg', kind: 'image' } as DragSource,
    getLibraryId: async () => 'lib-1',
    services,
    upload,
    showCustomUpload: true,
    onUploadPayload: vi.fn(),
    onCustomUpload: vi.fn(),
    onDropped: vi.fn(),
  });
  app.mount(mount);
  // 等 getLibraryId/listFolders 微任务链 + 树渲染完成
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
  return { mount, app };
}

describe('DragDropOverlay 树拖拽上传', () => {
  it('拖图片链接(text/uri-list)到文件夹树节点 → upload.urls 直接上传到该文件夹', async () => {
    const urlsSpy = vi.fn();
    const { mount, app } = await mountOverlay({ files: vi.fn(), urls: urlsSpy });

    // 树事件绑定在 li[role=treeitem] 内层的行 div 上
    const row = mount.querySelector('[role="treeitem"] > div');
    expect(row).not.toBeNull();

    const dt = fakeDataTransfer(
      ['text/html', 'text/uri-list'],
      {
        'text/uri-list': 'https://example.com/pic.jpg',
        'text/html': '<img src="https://example.com/pic.jpg">',
      },
    );
    row!.dispatchEvent(dragEvent('dragover', dt));
    row!.dispatchEvent(dragEvent('drop', dt));

    expect(urlsSpy).toHaveBeenCalledOnce();
    expect(urlsSpy).toHaveBeenCalledWith(['https://example.com/pic.jpg'], { folderId: 1 });
    app.unmount();
    mount.remove();
  });

  it('拖链接到树的空白区域 → upload.urls 上传到根目录(无 target)', async () => {
    const urlsSpy = vi.fn();
    const { mount, app } = await mountOverlay({ files: vi.fn(), urls: urlsSpy });

    // LibraryTreeView 根容器(滚动区,树行外的空白)
    const scrollArea = mount.querySelector('.overflow-y-auto');
    expect(scrollArea).not.toBeNull();

    const dt = fakeDataTransfer(
      ['text/uri-list'],
      { 'text/uri-list': 'https://example.com/pic.jpg' },
    );
    scrollArea!.dispatchEvent(dragEvent('dragover', dt));
    scrollArea!.dispatchEvent(dragEvent('drop', dt));

    expect(urlsSpy).toHaveBeenCalledOnce();
    expect(urlsSpy).toHaveBeenCalledWith(['https://example.com/pic.jpg'], undefined);
    app.unmount();
    mount.remove();
  });
});
