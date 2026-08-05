/**
 * 悬浮球窗口专用 preload 脚本
 *
 * 与 notification-preload.js 结构一致（转发 connect MessagePort），
 * 额外通过 webUtils.getPathForFile 把拖入的 File 转成真实文件路径，
 * 以便渲染层把路径随 fb-file-drop 消息转发给主渲染进程触发上传。
 */
const { ipcRenderer, contextBridge, webUtils } = require('electron');

console.log('🔵 悬浮球 preload 已加载');

// 从主进程收到 MessagePortMain，转发为 DOM message（带 ports）
ipcRenderer.on('connect', (event, payload) => {
  const [port] = event.ports;
  if (port) {
    window.dispatchEvent(new MessageEvent('message', {
      data: payload,        // { role: 'floating-ball' }
      ports: [port],        // 关键：把 MessagePort 转过去
      origin: location.origin,
    }));
  } else {
    console.error('❌ 悬浮球 preload 未收到 MessagePort');
  }
});

// 暴露给渲染进程的 API（白名单）
contextBridge.exposeInMainWorld('electronAPI', {
  // 把拖入的 File 对象转成磁盘上的真实路径
  // （Electron 38 起 webUtils.getPathForFile 在 sandboxed preload 中可用）
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (err) {
      console.error('getPathForFile 失败:', err);
      return '';
    }
  },
});

console.log('🔵 悬浮球 preload 初始化完成');
