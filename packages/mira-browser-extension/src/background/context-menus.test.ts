import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupContextMenus, type ContextMenuDeps } from './context-menus';

let installedListener: () => void;
let clickedListener: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void;
const create = vi.fn();

globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: (listener: () => void) => { installedListener = listener; } },
  },
  contextMenus: {
    create,
    removeAll: (callback: () => void) => callback(),
    onClicked: {
      addListener: (listener: typeof clickedListener) => { clickedListener = listener; },
    },
  },
} as any;

describe('setupContextMenus', () => {
  let deps: ContextMenuDeps;

  beforeEach(() => {
    create.mockClear();
    deps = {
      captureVisible: vi.fn(),
      captureFullPage: vi.fn(),
      captureSelection: vi.fn(),
      uploadImageUrl: vi.fn(),
      openImportDialog: vi.fn(),
      toggleDragUploadHost: vi.fn(),
    };
    setupContextMenus(deps);
  });

  it('安装时创建当前网站拖拽快传切换菜单', () => {
    installedListener();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mira-toggle-drag-upload',
      contexts: ['all'],
    }));
  });

  it('点击菜单时把当前标签页 host 交给切换回调', async () => {
    clickedListener(
      { menuItemId: 'mira-toggle-drag-upload' } as chrome.contextMenus.OnClickData,
      { id: 8, url: 'https://Example.com/path' } as chrome.tabs.Tab,
    );
    await vi.waitFor(() => expect(deps.toggleDragUploadHost).toHaveBeenCalledWith('example.com'));
  });
});
