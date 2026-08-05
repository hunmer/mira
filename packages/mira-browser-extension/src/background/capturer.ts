import type { Uploader } from './uploader';
import { dataUrlToBlob } from '@/shared/staged-file';
import { getSettings } from './settings';

export interface CapturerDeps {
  uploader: Uploader;
}

// 占位:Task 11(offscreen)实现后替换
async function stitchFrames(
  frames: string[],
  dims: { scrollHeight: number; viewportHeight: number },
): Promise<string> {
  throw new Error('offscreen not implemented');
}
async function cropImage(
  dataUrl: string,
  rect: { x: number; y: number; w: number; h: number; dpr: number },
): Promise<string> {
  throw new Error('offscreen not implemented');
}

export function createCapturer(deps: CapturerDeps) {
  async function captureAndEnqueue(dataUrl: string, tabId: number, suffix: string) {
    const settings = await getSettings();
    const tab = await chrome.tabs.get(tabId);
    const domain = new URL(tab.url ?? 'unknown').hostname || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${domain}-${timestamp}-${suffix}.png`;
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], filename, { type: 'image/png' });
    deps.uploader.enqueue({
      file,
      libraryId: settings.libraryId,
      source: 'screenshot',
      tags: [...(settings.tags ?? []), 'screenshot', domain],
      folderId: settings.folderId,
    });
  }

  /** 可视区域截图 */
  async function captureVisible(tabId: number): Promise<void> {
    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
    });
    await captureAndEnqueue(dataUrl, tabId, 'visible');
  }

  /** 整页滚动截图 */
  async function captureFullPage(tabId: number): Promise<void> {
    const settings = await getSettings();
    // 通知 content script 开始滚动捕获,逐帧收集
    const frames: string[] = [];
    const dims = (await chrome.tabs.sendMessage(tabId, {
      type: 'START_SCROLL_CAPTURE',
      payload: { delay: settings.autoScrollDelay },
    })) as { scrollHeight: number; viewportHeight: number };

    let y = 0;
    while (y < dims.scrollHeight) {
      const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
        format: 'png',
      });
      frames.push(dataUrl);
      y += dims.viewportHeight;
      const arrived = await chrome.tabs.sendMessage(tabId, { type: 'SCROLL_TO', payload: { y } });
      if (!arrived.done) break; // 到底
    }
    // 恢复原位
    await chrome.tabs.sendMessage(tabId, { type: 'SCROLL_RESTORE' });

    // 拼接走 offscreen(见 Task 11)
    const stitched = await stitchFrames(frames, dims);
    await captureAndEnqueue(stitched, tabId, 'fullpage');
  }

  /** 选区截图 */
  async function captureSelection(tabId: number): Promise<void> {
    // content script 画选框,返回 rect
    const rect = (await chrome.tabs.sendMessage(tabId, { type: 'DRAW_SELECTION' })) as {
      x: number;
      y: number;
      w: number;
      h: number;
      dpr: number;
    } | null;
    if (!rect) return; // 用户取消

    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
    });
    const cropped = await cropImage(dataUrl, rect);
    await captureAndEnqueue(cropped, tabId, 'selection');
  }

  return { captureVisible, captureFullPage, captureSelection };
}
