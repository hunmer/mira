export interface ContextMenuDeps {
  captureVisible: (tabId: number) => Promise<void>;
  captureFullPage: (tabId: number) => Promise<void>;
  captureSelection: (tabId: number) => Promise<void>;
  uploadImageUrl: (url: string) => Promise<void>;
  /** 在指定 tab 打开「批量导入」对话框(由 content script 处理选区 → URL) */
  openImportDialog: (tabId: number) => Promise<void>;
  /** 切换指定 host 的图片拖拽快传启用状态 */
  toggleDragUploadHost: (host: string) => Promise<void>;
}

export function setupContextMenus(deps: ContextMenuDeps): void {
  const menus: chrome.contextMenus.CreateProperties[] = [
    // 页面右键:截图三件套
    { id: 'mira-capture-visible', title: 'Mira · 截图可视区域', contexts: ['page', 'image'] },
    { id: 'mira-capture-fullpage', title: 'Mira · 整页截图', contexts: ['page'] },
    { id: 'mira-capture-selection', title: 'Mira · 选区截图', contexts: ['page'] },
    { id: 'mira-toggle-drag-upload', title: 'Mira · 切换当前网站是否开启图片拖拽快速上传', contexts: ['all'] },
    // 图片右键:收藏到素材库(即上传此图片到当前库)
    { id: 'mira-separator-img', type: 'separator', contexts: ['image'] },
    { id: 'mira-favorite-image', title: 'Mira · 收藏到素材库', contexts: ['image'] },
    // 选区右键:从选中文字里提取 URL 批量导入
    { id: 'mira-separator-selection', type: 'separator', contexts: ['selection'] },
    { id: 'mira-import-selection', title: 'Mira · 从选中批量导入', contexts: ['selection'] },
    // 扩展图标右键:快捷截图入口(Chrome 不支持拖到工具栏图标,以右键图标代替)
    { id: 'mira-separator-action', type: 'separator', contexts: ['action'] },
    { id: 'mira-action-capture-visible', title: '截图可视区域', contexts: ['action'] },
    { id: 'mira-action-capture-fullpage', title: '整页截图', contexts: ['action'] },
    { id: 'mira-action-capture-selection', title: '选区截图', contexts: ['action'] },
  ];
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      menus.forEach(m => chrome.contextMenus.create(m));
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    switch (info.menuItemId) {
      case 'mira-capture-visible':
      case 'mira-action-capture-visible':
        await deps.captureVisible(tab.id);
        break;
      case 'mira-capture-fullpage':
      case 'mira-action-capture-fullpage':
        await deps.captureFullPage(tab.id);
        break;
      case 'mira-capture-selection':
      case 'mira-action-capture-selection':
        await deps.captureSelection(tab.id);
        break;
      // 收藏到素材库 = 上传此图片(沿用 uploadImageUrl:fetch → File → 当前库)
      case 'mira-favorite-image':
      case 'mira-upload-image':
        if (info.srcUrl) await deps.uploadImageUrl(info.srcUrl);
        break;
      // 从选中文字提取 URL 批量导入(选区→URL 提取在 content script 完成)
      case 'mira-import-selection':
        await deps.openImportDialog(tab.id);
        break;
      case 'mira-toggle-drag-upload': {
        let host = '';
        try { host = tab.url ? new URL(tab.url).host : ''; } catch { host = ''; }
        if (host) await deps.toggleDragUploadHost(host);
        break;
      }
    }
  });
}
