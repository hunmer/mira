# 通知窗口代码入口

## 业务入口

- `packages/mira-client/src/renderer/services/WebSocketService.ts`
  - `file::created`：文件导入事件入口。
  - `notifyFileImported()`：聚合导入事件并准备通知数据。
  - `doShowImportNotification()`：调用 `window.electronAPI.notificationWindow.show()`。
  - 当前通知时长：`60000ms`。
  - 业务数据：`{ fileId, count, previewType: 'image' | 'video' }`。

## Renderer 到主进程

- `packages/mira-client/src/preload/preload.ts`
  - `notificationWindow.show(payload)` 调用 IPC：`notification:window-show`。
- `packages/mira-client/src/main/ipc/NotificationWindowHandlers.ts`
  - `handleShowNotification()` / `showNotification()`：创建通知窗口。
  - `createSlotHandler()`：配置单条通知窗口及 MessagePort handlers。

## 通知窗口入口

- `packages/mira-client/src/notification-window/notification-window.html`
  - 通知页面、按钮样式及本地 Vue/Core 脚本入口。
- `packages/mira-client/src/notification-window/notification-window.js`
  - `applyContent()`：接收并渲染 `notification-content`。
  - `handleCardClick()`：发送 `{ type: 'click', data }`。
  - `handleAction()`：发送 `{ type: 'action', id, data }`。
  - `handleClose()`：发送 `{ type: 'dismiss' }`。
  - 发送业务数据前使用 `Vue.toRaw()` 转为普通对象。
- `packages/mira-client/src/floating-window/floating-window-core.js`
  - `createBridge()`：建立 MessagePort。
  - `send()`：通知窗口消息出口。

## 主进程出口

- `packages/mira-client/src/main/ipc/NotificationWindowHandlers.ts`
  - `messageHandlers.click`：转发通知卡片点击。
  - `messageHandlers.action`：关闭对应通知并转发操作。
  - `messageHandlers.dismiss`：关闭对应通知。
  - `forwardToMainRenderer()`：通过 `notification-from-window` 发送到主页面。

## 主页面路由出口

- `packages/mira-client/src/renderer/App.vue`
  - `setupElectronListeners()` 监听 `notification-from-window`。
  - `previewType === 'video'` 跳转 `/video-preview/:id`。
  - 其他类型跳转 `/image-preview/:id`。

## 调试入口

- 通知窗口、MessagePort、主进程和主页面当前使用统一前缀：`[NotificationDebug]`。
- 开发环境创建通知时会打开通知窗口的独立 DevTools。
