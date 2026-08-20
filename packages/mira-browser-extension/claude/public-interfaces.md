# 对外接口

本扩展不暴露 REST/WebSocket/CLI;对外接口 = **内部消息协议**(`shared/messages.ts`)+ **对后端 SDK 调用**。

## 消息协议(chrome.runtime / chrome.tabs.sendMessage)

### Request(UI/content → Service Worker)
`isRequest(m)` 守卫,`REQUEST_TYPES` 集合登记。

| type | payload | 返回 | 处理 |
|------|---------|------|------|
| `AUTH_LOGIN` | `{username, password}` | `{success}` | login + 存凭据 |
| `AUTH_VERIFY` | — | `{authenticated}` | SDK verify |
| `CONFIG_GET` | — | `ExtensionSettings` | 读 storage |
| `CONFIG_SET` | `Partial<ExtensionSettings>` | `ExtensionSettings` | 合并写 storage |
| `SERVERS_LIST` / `SERVERS_SAVE` / `SERVER_ACTIVATE` / `SERVER_TEST` | 多服务器 payloads | 服务器列表/激活结果 | 多服务器管理(2026-08-11 后新增) |
| `LIB_LIST` | — | `Library[]` | `client.libraries().getAll()` |
| `FOLDER_LIST` / `TAG_LIST` | `{libraryId}` | `Folder[]`/`Tag[]` | 全量文件夹/标签 |
| `NODE_CREATE` / `NODE_DELETE` / `NODE_UPDATE` / `NODE_MOVE` / `NODE_SORT_INDEX` | 节点 payloads | 节点/结果 | 文件夹/标签节点 CRUD + 排序(新增) |
| `UPLOAD_FILES` | `{files: StagedFile[], libraryId, tags?, folderId?}` | `{enqueued}` | stagedToFile → uploader |
| `UPLOAD_FROM_URL` | `{url, kind, libraryId, folderId?}` | `{enqueued}` | fetch → Blob → File → uploader |
| `BATCH_IMPORT` | URL 列表 + 目标(文件夹/标签) | 进度 Event | 批量导入(新增,配 `batchImportConcurrency`) |
| `DOWNLOAD_RESOURCES` | 资源列表 | — | 下载资源(新增,resource-fetch) |
| `OPEN_URL_IN_TAB` | `{url}` | — | 新标签打开(新增) |
| `CUSTOM_UPLOAD_SIDEPANEL_OPEN` / `CUSTOM_UPLOAD_SESSION_GET` / `CUSTOM_UPLOAD_SESSION_CLOSE` | 批量上传会话 | 会话状态 | popup ↔ upload 独立窗口协同(新增) |
| `UPLOAD_STATUS` | — | `UploadTask[]` | uploader.getQueue |
| `UPLOAD_CANCEL` | `{id}` | `{success}` | uploader.cancelTask |
| `UPGRADE_IMAGE_URL` | `{url, timeout?, rules?}` | 候选数组 | maxurl 高清升级 |
| `CAPTURE_VISIBLE` / `CAPTURE_FULLPAGE` / `CAPTURE_SELECTION` | `{tabId}` | `{success}` | capturer |
| `SNIFFER_START` / `SNIFFER_STOP` | `{tabId, kinds?}` | `{success}` | sendToContent |
| `SNIFFER_QUERY` | `{tabId}` | `{resources}` | 读内存快照 |
| `AUTOSCROLL_START` / `AUTOSCROLL_STOP` | `{tabId}` | `{success}` | sendToContent |

### Event(Service Worker → 广播给 UI/content)
`isEvent(m)` 守卫。

| type | payload | 触发 |
|------|---------|------|
| `UPLOAD_PROGRESS` | `{id, percent, status}` | uploader.onQueueChange |
| `SNIFFER_FOUND` | `{tabId, resources}` | 收到 SNIFFER_REPORT |
| `AUTH_EXPIRED` | — | router 遇 401 |
| `BATCH_PROGRESS` | 批量导入进度 | BATCH_IMPORT 执行中(新增) |
| `CUSTOM_UPLOAD_SESSION_OPEN` | 批量上传窗口会话 | popup 打开 upload 窗口(新增) |

### ContentCommand(Service Worker → content,经 chrome.tabs.sendMessage)
`isContentCommand(m)` 守卫。

| type | payload | content 处理 |
|------|---------|--------------|
| `SNIFFER_START` | `{kinds}` | sniffer.start |
| `SNIFFER_STOP` | — | sniffer.stop |
| `DISPATCH_DRAGDROP` | `{enabled}` | dragdrop.setEnabled |
| `DISPATCH_HOVER_BUTTON` | `{enabled}` | hover-button.setEnabled(新增) |
| `AUTOSCROLL_START` | `{delay}` | scroller.start |
| `AUTOSCROLL_STOP` | — | scroller.stop |
| `START_SCROLL_CAPTURE` | `{delay}` | 截图滚动初始化(返回 scrollHeight/viewportHeight) |
| `DRAW_SELECTION` | — | drawSelection(返回 rect 或 null) |
| `UPGRADE_IMAGE_URL` | `{url, timeout?, rules?}` | maxurl 升级(新增) |
| `OPEN_IMPORT_DIALOG` | `{urls?, referrer?}` | 打开网页内批量导入对话框(新增) |

### 内部命令(非协议,直发)
- `SNIFFER_REPORT`(content→SW):`{type, resources}` → 存快照 + 广播
- `SCROLL_TO` / `SCROLL_RESTORE`(SW→content):capturer 直接发,截图滚动用

## 对后端 SDK 接口(`mira-app-core/shared/sdk`)

`mira-client.ts` 的 `MiraClient` 实例:
- `client.auth().login(user, pass)` → `{accessToken}`;`.verify()`;`.logout()`
- `client.libraries().getAll()` → `Library[]`
- `client.folders().getAll(libraryId)` → `Folder[]`
- `client.files().uploadFile(file, libraryId, {tags?, folderId?})` → `UploadResponse`

`folderId` 在 SDK 是 `string`(`Folder.id` 是 `number`,边界处 `String(folderId)`)。

## Chrome API 依赖

- `permissions`:activeTab, tabs, storage, scripting, contextMenus, sidePanel, offscreen, commands
- `host_permissions`:`<all_urls>`
- 关键 API:`chrome.tabs.captureVisibleTab`(截图)、`chrome.offscreen.createDocument`(BLOBS)、`chrome.scripting.executeScript`(注入兜底)、`chrome.contextMenus`(右键)、`chrome.storage.local`(设置)/`.session`(token)、`chrome.commands`(快捷键)

## maxurl bridge(页面 MAIN world ↔ content)

页面注入的桥接脚本用 `window.postMessage` 通信:
- content → page:`{tag:'__mira_imu_req__', id, url, iterations}`
- page → content:`{tag:'__mira_imu_res__', id, result|error}`
- 详见 [data-model.md](data-model.md) 的 imu 部分。

## 新增消息的步骤

1. `shared/messages.ts`:加联合类型成员 + 对应 `*_TYPES` 集合
2. `message-router.ts` 或 content:加 case 处理
3. `useBackground.ts`:如 UI 要用,加封装方法
