/**
 * 搜索窗口专用 preload 脚本
 * 作为 IPC 和 DOM 之间的桥接器
 */
const { ipcRenderer, contextBridge } = require('electron');

console.log('🔗 搜索窗口 preload 已加载');

// 从主进程收到 MessagePortMain，转发为 DOM message（带 ports）
ipcRenderer.on('connect', (event, payload) => {
  console.log('🔗 preload 收到 connect 消息:', payload);
  console.log('🔗 ports:', event.ports);
  
  const [port] = event.ports;
  if (port) {
    console.log('🔗 转发 MessagePort 到 DOM');
    // 用 DOM 的 MessageEvent 转给真正的页面环境
    window.dispatchEvent(new MessageEvent('message', {
      data: payload,        // { role: 'search' }
      ports: [port],        // 关键：把 MessagePort 转过去
      origin: location.origin,
    }));
  } else {
    console.error('❌ preload 未收到 MessagePort');
  }
});

// 监听来自主进程的搜索处理消息
ipcRenderer.on('search-handler-message', (event, data) => {
  console.log('🔗 preload 收到搜索处理消息:', data);
  // 转发给 DOM 环境
  window.dispatchEvent(new CustomEvent('search-handler-message', {
    detail: data
  }));
});

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC 监听器
  on: (channel, callback) => {
    const validChannels = ['search-handler-message'];
    if (validChannels.includes(channel)) {
      // 移除旧的监听器
      ipcRenderer.removeAllListeners(channel);
      // 添加新的监听器
      ipcRenderer.on(channel, callback);
    }
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // 发送消息到主进程
  send: (channel, data) => {
    const validChannels = ['search-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // 调用主进程方法
  invoke: (channel, ...args) => {
    const validChannels = [
      'search-window:show',
      'search-window:hide', 
      'search-window:toggle'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
});

console.log('🔗 搜索窗口 preload 初始化完成');
