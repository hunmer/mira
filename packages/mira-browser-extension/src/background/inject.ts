import { dbg } from '@/shared/debug';

/**
 * 向 tab 发消息;若 content script 未就绪(常见于 SPA / 安装扩展前已打开的页 /
 * 预渲染页 / manifest 注入时点错过),用 chrome.scripting 程序化注入后再试一次。
 * 失败抛清晰错误,避免上层误判为"成功"。
 *
 * 注入文件名从 manifest.content_scripts 动态读取(构建产物带 hash,不能写死)。
 */
export async function sendToContent<T = any>(tabId: number, message: any): Promise<T> {
  const tryOnce = () => chrome.tabs.sendMessage(tabId, message) as unknown as Promise<T>;
  try {
    return await tryOnce();
  } catch (e: any) {
    dbg.warn('inject', 'sendMessage failed, injecting content script', { tabId, err: e?.message });
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url || tab.pendingUrl || '';
    if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
      throw new Error('该页面不支持(content script 无法注入)');
    }
    // 从 manifest 取 content_scripts 的 js 文件(带 hash,不能写死)
    const manifest = chrome.runtime.getManifest();
    const files: string[] = [];
    for (const cs of manifest.content_scripts ?? []) {
      if (cs.js) files.push(...cs.js);
    }
    if (!files.length) throw new Error('content script 文件未配置');
    await chrome.scripting.executeScript({ target: { tabId }, files });
    dbg.log('inject', 'content script injected, retry sendMessage', { tabId, files });
    // 注入后稍等初始化(注册 listener / CONFIG_GET 等)
    await new Promise(r => setTimeout(r, 300));
    return await tryOnce();
  }
}
