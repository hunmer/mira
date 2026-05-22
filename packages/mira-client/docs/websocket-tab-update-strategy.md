# Client ↔ Server WebSocket 通讯协议

## 连接

```
ws://{host}:{wsPort}?clientId={clientId}&libraryId={libraryId}
```

- 默认端口 `8018`（`MIRA_SERVER_WS_PORT`）
- 每个连接绑定一个 libraryId，服务端按 libraryId 分组管理连接（`libraryClients: Map<libraryId, WebSocket[]>`）
- 客户端断连后指数退避重连（最多 5 次，延迟 1s/2s/4s/8s/16s）

## 消息格式

### 客户端 → 服务端（请求）

```json
{
  "action": "create|update|delete|read|all|...",
  "requestId": "unique-id",
  "libraryId": "1778657429682",
  "clientId": "client-123",
  "payload": {
    "type": "file|folder|tag|library|plugin",
    "data": { ... }
  }
}
```

### 服务端 → 客户端（响应）

**操作结果**（对应 requestId）：
```json
{
  "requestId": "unique-id",
  "libraryId": "1778657429682",
  "status": "success",
  "data": { ... }
}
```

**广播事件**（无 requestId，由服务端主动推送）：
```json
{
  "eventName": "file::created",
  "data": { "libraryId": "...", "fileId": 33, ... }
}
```

## 服务端路由

```
WebSocket 消息
    │
    ▼
WebSocketRouter.route()          ← routes/WebSocketRouter.ts
    │ payload.type
    ├── 'file'    → FileHandler
    ├── 'folder'  → FolderHandler
    ├── 'tag'     → TagHandler
    ├── 'library' → LibraryHandler
    └── 'plugin'  → PluginMessageHandler
```

## 事件广播机制

服务端有三种广播方式：

| 方法 | 范围 | 用途 |
|------|------|------|
| `broadcastLibraryEvent(libraryId, eventName, data)` | 该 libraryId 下所有 WS 客户端 | **主要机制**，客户端实时更新依赖此通道 |
| `broadcastPluginEvent(eventName, data)` | 插件事件系统（EventManager） | 服务端插件监听处理 |
| `sendToWebsocket(ws, data)` | 仅发起请求的那个客户端 | 特定响应（如上传完成通知） |

**关键点**：客户端实时同步几乎完全依赖 `broadcastLibraryEvent`。

## 事件来源

同一事件可从多个入口触发，最终都通过 `broadcastLibraryEvent` 广播给所有客户端：

### 1. HTTP REST API（Dashboard / 外部程序调用）

| 路由 | 文件 | 广播的事件 |
|------|------|-----------|
| `POST /api/files/upload` | FileRoutes.ts | `file::created` |
| `PUT /api/files/update` | FileRoutes.ts | `file::updated` |
| `DELETE /api/files/delete` | FileRoutes.ts | `file::deleted` |
| `POST /api/files/trash/empty` | FileRoutes.ts | `files::trash-emptied` |
| `POST /api/folders/create` | FolderRouter.ts | `folder::created` |
| `PUT /api/folders/update` | FolderRouter.ts | `folder::updated` |
| `DELETE /api/folders/delete` | FolderRouter.ts | `folder::deleted` |

### 2. WebSocket Handler（客户端 SDK 调用）

| Handler | action | 广播的事件 |
|---------|--------|-----------|
| FileHandler | create | `file::created` |
| FileHandler | update | `file::updated` |
| FileHandler | delete | `file::deleted` |
| FileHandler | recover | `file::recovered` |
| FolderHandler | create | `folder::created` |
| FolderHandler | update | `folder::updated` |
| FolderHandler | delete | `folder::deleted` |
| FolderHandler | file_set | `file::setFolder` |
| TagHandler | create | `tag::created` |
| TagHandler | update | `tag::updated` |
| TagHandler | delete | `tag::deleted` |
| TagHandler | file_set | `file::setTag` |

### 3. LibraryWatcher（文件系统监听）

| 文件系统事件 | 广播的事件 | 说明 |
|-------------|-----------|------|
| 文件新增 | `file::created` | 自动导入新文件到 DB |
| 文件删除 | `file::deleted` | 3 秒延迟确认，防止移动误判 |
| 文件移动/重命名 | `file::updated` | 匹配大小后更新路径 |
| 启动扫描 | `file::synced` | 初始同步完成后广播 |

## 客户端事件处理

客户端 `WebSocketService.ts` 连接后注册事件监听器，收到广播后执行两类响应：

### 类型 A：刷新数据 + UI 同步

```
WS 广播事件
    │
    ▼
WebSocketService.addEventListener()
    │
    ├── 文件夹事件 (folder::created / folder::updated / folder::deleted)
    │     └── libraryStore.refreshFolders(libraryId)
    │           └── FolderTreeComponent props 更新 → 树重新渲染
    │
    ├── 标签事件 (tag::created / tag::update / tag::delete)
    │     └── libraryStore.refreshTags(libraryId)
    │
    ├── 缩略图事件 (thumbnail::generated)
    │     └── window 'thumbnail-updated' 事件 → 图片刷新
    │
    └── 文件事件 (file::created / file::updated / file::deleted)
          └── handleFileEvent() → markTabsForEvent()
                │
                ├── 遍历每个 tab，调用 tabType.shouldUpdateForEvent()
                │     └── 匹配的 tab 标记 needUpdate = true
                │
                └── 活跃 tab → window 'active-tab-refresh' 事件
                      └── MediaTabListView.handleRefresh()
```

### 类型 B：关闭 Tab

```
folder::deleted 事件
    │
    ▼
WebSocketService
    ├── libraryStore.refreshFolders()     ← 刷新文件夹树
    └── closeTab(`folder-${data.id}`)     ← 关闭已打开的 tab
```

## Tab 匹配规则

文件事件到达后，每种 Tab 类型通过 `shouldUpdateForEvent(tabData, eventData)` 判断是否需要刷新：

| Tab 类型 | 匹配条件 |
|----------|---------|
| `all` | `tab.libraryId === event.libraryId` |
| `folder` | libraryId 匹配 且 `folder_id === tab.folderId` |
| `tag` | libraryId 匹配 且 事件 tags 包含该标签 |
| `trash` | libraryId 匹配 且 `recycled != null` |
| `uncategorized` | libraryId 匹配 且 `folder_id` 为空 |
| `untagged` | libraryId 匹配 且 `tags` 为空 |
| `home` | 不匹配 |

**活跃 Tab**：立即派发 `active-tab-refresh`，`MediaTabListView` 收到后调用 `handleRefresh()` 刷新数据。

**非活跃 Tab**：仅标记 `needUpdate = true`，用户切回时由 `switchToTab` 触发懒加载刷新。

## 涉及文件

### 服务端

| 文件 | 职责 |
|------|------|
| `mira-app-server/src/WebSocketServer.ts` | WS 服务器，连接管理，三种广播方法 |
| `mira-app-server/src/routes/WebSocketRouter.ts` | 按 payload.type 路由到 Handler |
| `mira-app-server/src/handlers/*.ts` | 各资源类型的 CRUD + 广播 |
| `mira-app-server/src/routes/FolderRouter.ts` | HTTP 文件夹路由，删除时广播 |
| `mira-app-server/src/routes/FileRoutes.ts` | HTTP 文件路由，各操作广播 |
| `mira-app-server/src/LibraryWatcher.ts` | 文件系统监听，变更广播 |

### 客户端

| 文件 | 职责 |
|------|------|
| `services/WebSocketService.ts` | WS 连接管理 + 事件监听注册 + 分发 |
| `composables/useTabs.ts` | `markTabsForEvent()` 遍历标记 + `closeTab()` |
| `composables/TabRegistry.ts` | `TabTypeDefinition.shouldUpdateForEvent` 接口 |
| `composables/tabs/*.ts` | 各 Tab 类型的匹配规则实现 |
| `components/tabs/MediaTabListView.vue` | 监听 `active-tab-refresh` 立即刷新 |
| `stores/library.ts` | `refreshFolders()` / `refreshTags()` 数据刷新 |

## 扩展指南

### 服务端新增需要广播的操作

在对应 Handler 或 Router 的操作成功后调用：
```typescript
this.server.broadcastLibraryEvent(libraryId, 'resource::action', { ...data, libraryId });
```

### 客户端新增事件监听

在 `WebSocketService.ts` 的 `setupEventListeners()` 中添加：
```typescript
webSocketService.addEventListener('resource::action', (data) => {
  // 处理逻辑
});
```

### 新增 Tab 类型

1. 在 `composables/tabs/` 新建类型文件，覆写 `shouldUpdateForEvent(tabData, eventData)`
2. `markTabsForEvent` 会自动调用，无需修改其他文件
