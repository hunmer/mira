export interface ContextMenuDeps {
  captureVisible: (tabId: number) => Promise<void>;
  captureFullPage: (tabId: number) => Promise<void>;
  captureSelection: (tabId: number) => Promise<void>;
  uploadImageUrl: (url: string) => Promise<void>;
}

export function setupContextMenus(deps: ContextMenuDeps): void {
  // 安装时创建菜单
  const menus: chrome.contextMenus.CreateProperties[] = [
    { id: 'mira-capture-visible', title: 'Mira · 截图可视区域', contexts: ['page', 'image'] },
    { id: 'mira-capture-fullpage', title: 'Mira · 整页截图', contexts: ['page'] },
    { id: 'mira-capture-selection', title: 'Mira · 选区截图', contexts: ['page'] },
    { id: 'separator', type: 'separator', contexts: ['image'] },
    { id: 'mira-upload-image', title: 'Mira · 上传此图片', contexts: ['image'] },
  ];
  // 清理旧的再建(chrome.runtime.onInstalled 时调用更佳)
  chrome.contextMenus.removeAll(() => {
    menus.forEach(m => chrome.contextMenus.create(m));
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;
    switch (info.menuItemId) {
      case 'mira-capture-visible':
        await deps.captureVisible(tab.id);
        break;
      case 'mira-capture-fullpage':
        await deps.captureFullPage(tab.id);
        break;
      case 'mira-capture-selection':
        await deps.captureSelection(tab.id);
        break;
      case 'mira-upload-image':
        if (info.srcUrl) await deps.uploadImageUrl(info.srcUrl);
        break;
    }
  });
}
