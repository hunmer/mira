import { isContentCommand } from '@/shared/messages';
import { createSniffer } from './sniffer';
import { createDragDrop, type DragDropPayload } from './dragdrop';
import { createAutoScroller } from './autoscroll';
import { drawSelection } from './overlay/selection';

// 嗅探上报:发给 service worker(SNIFFER_REPORT)
const sniffer = createSniffer(resources => {
  chrome.runtime.sendMessage({ type: 'SNIFFER_REPORT', resources }).catch(() => {});
});

// 拖拽上传:发给 service worker
const dragdrop = createDragDrop({
  onUpload(payload: DragDropPayload) {
    if (payload.file) {
      // File 跨上下文序列化
      payload.file.arrayBuffer().then(buffer => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_FILES',
          payload: {
            files: [{ name: payload.file!.name, type: payload.file!.type, buffer }],
            libraryId: '', // service worker 用默认 libraryId
          },
        }).catch(() => {});
      });
    } else if (payload.url) {
      chrome.runtime.sendMessage({
        type: 'UPLOAD_FROM_URL',
        payload: { url: payload.url, kind: payload.kind, libraryId: '' },
      }).catch(() => {});
    }
  },
});

const scroller = createAutoScroller();

// content script 内部消息:截图滚动控制(SCROLL_TO/SCROLL_RESTORE 由 capturer 发)
let restoreY = 0;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // ContentCommand(service worker → content)
  if (isContentCommand(msg)) {
    switch (msg.type) {
      case 'SNIFFER_START':
        sniffer.start(msg.payload.kinds);
        sendResponse({ ok: true });
        return true;
      case 'SNIFFER_STOP':
        sniffer.stop();
        sendResponse({ ok: true });
        return true;
      case 'DISPATCH_DRAGDROP':
        dragdrop.setEnabled(msg.payload.enabled);
        sendResponse({ ok: true });
        return true;
      case 'AUTOSCROLL_START':
        scroller.start({ delay: msg.payload.delay }).then(() => sendResponse({ done: true }));
        return true;
      case 'AUTOSCROLL_STOP':
        scroller.stop();
        sendResponse({ ok: true });
        return true;
      case 'START_SCROLL_CAPTURE':
        restoreY = window.scrollY;
        sendResponse({
          scrollHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
        });
        return true;
      case 'DRAW_SELECTION':
        drawSelection().then(rect => sendResponse(rect));
        return true;
    }
  }

  // 截图滚动内部命令(capturer 用 chrome.tabs.sendMessage 发)
  if (msg?.type === 'SCROLL_TO') {
    window.scrollTo(0, msg.payload.y);
    const done = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1;
    sendResponse({ done });
    return true;
  }
  if (msg?.type === 'SCROLL_RESTORE') {
    window.scrollTo(0, restoreY);
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// 初始化:根据当前设置启用 dragdrop
chrome.runtime.sendMessage({ type: 'CONFIG_GET' }).then((settings: any) => {
  if (settings?.dragPopoverEnabled === false) dragdrop.setEnabled(false);
}).catch(() => {});
