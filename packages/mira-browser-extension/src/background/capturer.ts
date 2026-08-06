import type { Uploader } from './uploader';
import { dataUrlToBlob } from '@/shared/staged-file';
import { getSettings } from './settings';
import { stitchFrames, cropImage } from './offscreen';
import { dbg } from '@/shared/debug';
import { sendToContent } from './inject';

export interface CapturerDeps {
  uploader: Uploader;
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
    dbg.info('capture', 'enqueue', { suffix, tabId, dataUrlLen: dataUrl.length, fileSize: file.size, libraryId: settings.libraryId });
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
    dbg.info('capture', 'captureVisible start', { tabId });
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
        format: 'png',
      });
      dbg.log('capture', 'captureVisible got dataUrl', { len: dataUrl?.length });
      if (!dataUrl) throw new Error('captureVisibleTab 返回空(可能页面受限或权限不足)');
      await captureAndEnqueue(dataUrl, tabId, 'visible');
    } catch (e: any) {
      dbg.error('capture', 'captureVisible error', e);
      throw e;
    }
  }

  /** 整页滚动截图 */
  async function captureFullPage(tabId: number): Promise<void> {
    dbg.info('capture', 'captureFullPage start', { tabId });
    const settings = await getSettings();
    // 通知 content script 开始滚动捕获,逐帧收集
    const frames: string[] = [];
    const dims = (await sendToContent<{ scrollHeight: number; viewportHeight: number }>(tabId, {
      type: 'START_SCROLL_CAPTURE',
      payload: { delay: settings.autoScrollDelay },
    }));
    dbg.log('capture', 'fullpage dims', dims);

    let y = 0;
    while (y < dims.scrollHeight) {
      const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
        format: 'png',
      });
      frames.push(dataUrl);
      y += dims.viewportHeight;
      const arrived = await sendToContent<{ done: boolean }>(tabId, { type: 'SCROLL_TO', payload: { y } });
      if (!arrived.done) break; // 到底
    }
    // 恢复原位
    await sendToContent(tabId, { type: 'SCROLL_RESTORE' });
    dbg.log('capture', 'fullpage frames', { count: frames.length });

    // 拼接走 offscreen(见 Task 11)
    const stitched = await stitchFrames(frames, dims);
    dbg.log('capture', 'fullpage stitched', { len: stitched?.length });
    await captureAndEnqueue(stitched, tabId, 'fullpage');
  }

  /** 选区截图 */
  async function captureSelection(tabId: number): Promise<void> {
    dbg.info('capture', 'captureSelection start', { tabId });
    // content script 画选框,返回 rect
    const rect = (await sendToContent<{
      x: number;
      y: number;
      w: number;
      h: number;
      dpr: number;
    } | null>(tabId, { type: 'DRAW_SELECTION' }));
    dbg.log('capture', 'selection rect', rect);
    if (!rect) { dbg.warn('capture', 'selection cancelled (no rect)'); return; } // 用户取消

    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
    });
    dbg.log('capture', 'selection captured', { len: dataUrl?.length });
    const cropped = await cropImage(dataUrl, rect);
    await captureAndEnqueue(cropped, tabId, 'selection');
  }

  return { captureVisible, captureFullPage, captureSelection };
}
