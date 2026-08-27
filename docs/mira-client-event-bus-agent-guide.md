# mira-client 内部事件总线 Agent 指南

本文档描述 `packages/mira-client` 渲染进程内的业务事件总线。后续 Agent 修改跨组件通知、WebSocket 事件联动或 Home 路由事件时，应先阅读本文。

## 目标与边界

业务事件统一通过 `miraEventBus` 传递，避免使用 `window.dispatchEvent(new CustomEvent(...))` 在渲染进程内传递业务状态。

保留浏览器原生事件的场景：

- `resize`、`keydown`、`pointer*` 等 DOM 交互事件。
- 插件或外部宿主明确要求的 `window.electronAPI` 事件。

## 核心实现

入口文件：[`packages/mira-client/src/renderer/services/EventBus.ts`](../packages/mira-client/src/renderer/services/EventBus.ts)

```ts
import { miraEventBus } from '@renderer/services/EventBus'

const handler = (detail) => {
  // 处理事件
}

miraEventBus.on('home-tab-replace', handler)
miraEventBus.off('home-tab-replace', handler)
miraEventBus.emit('home-tab-replace', {
  kind: 'folder',
  payload: { id: '12', title: '设计素材' },
})
```

底层库是 `event-emitter-adv`，依赖声明位于 `packages/mira-client/package.json`。

支持的调用：

| 方法 | 语义 |
| --- | --- |
| `on(event, listener, weight?)` | 注册监听器；`weight` 越大越先执行 |
| `off(event, listener)` | 移除指定监听器 |
| `emit(event, detail)` | 同步触发 |
| `emitAsync(event, detail)` | 串行等待异步监听器 |

`miraEventBus` 是模块级单例。不要在组件或 composable 中 `new EventEmitter()`，否则发布者和订阅者会落在不同实例上。

## 事件契约

事件名和载荷类型集中定义在 `EventBus.ts` 的 `MiraEventMap`。

| 事件 | 载荷 | 发布位置 | 主要订阅者 |
| --- | --- | --- | --- |
| `active-tab-refresh` | `{ tabId, eventType, data }` | `WebSocketService` | `MediaTabListView` |
| `library-file-changed` | `{ libraryId?, eventType }` | `WebSocketService` | `SidebarShortcutsModule` |
| `refresh-folders` | `{ libraryId? }` | `libraryStore` | `FolderTreeComponent` |
| `refresh-tags` | `{ libraryId? }` | `libraryStore` | `FolderTreeComponent` |
| `thumbnail-updated` | `{ fileId, thumbPath }` | `WebSocketService` | `MediaThumbnail`、`WaterfallComponent` |
| `home-folder-selected` | 文件夹对象 | `folderHandler`、文件夹操作 | `useHomeEventHandlers` |
| `home-tag-selected` | 标签对象 | `tagHandler`、标签操作 | `useHomeEventHandlers` |
| `home-folder-cleared` | `undefined` | `folderHandler` | 预留给 Home 状态消费者 |
| `home-tag-cleared` | `undefined` | `tagHandler` | 预留给 Home 状态消费者 |
| `home-route-folder` | `{ folderId, libraryId?, title? }` | `routeHandler`、子文件夹区 | `folderHandler` |
| `home-route-tag` | `{ tagId, libraryId?, title? }` | `routeHandler` | `tagHandler` |
| `home-tab-replace` | `{ kind, payload }` | 面包屑、子文件夹区 | `HomeView` |
| `collection-changed` | `{ collection?, libraryId? }` | `useHomeLibraryManagement` | 按需订阅 |

新增事件必须同时完成三件事：

1. 在 `MiraEventMap` 增加载荷类型。
2. 在发布者和订阅者之间使用同一事件名及载荷结构。
3. 组件卸载时使用同一个函数引用调用 `off`。

## 关键调用链

### WebSocket 文件变更到已打开 Tab

```text
WebSocketService.handleMessage()
  -> setupEventListeners() 注册的 file::created/file::updated/file::deleted/file::recovered
  -> handleFileEvent(data, eventType)
  -> useTabs().markTabsForEvent(data, eventType)
  -> dispatchActiveTabRefresh(tabId, eventType, data)
  -> miraEventBus.emit('active-tab-refresh', detail)
  -> MediaTabListView.onMounted() 注册的 handler
  -> useMediaTabFetch.handleActiveTabRefresh(detail)
  -> handleRefresh() / fetchPageData(1)
```

`file::created` 带 `uploadBatchId` 时会先进入批次队列，在 `file::upload-completed` 时调用 `flushUploadBatchRefresh()`。Tree 统计则由同一文件事件触发文件夹和标签 store 刷新，并有延迟重试覆盖异步落盘。

### 文件事件到侧栏 Tree

```text
file::created / file::deleted / file::recovered / file::updated
  -> scheduleTreeRefresh(libraryId)
  -> useFolderStore().refreshFolders(libraryId)
  -> useTagStore().refreshTags(libraryId)
  -> HomeDataManager.folderTree computed 重新计算
  -> SidebarModuleList :folders / :tags 响应式更新
```

`WebSocketService` 对 store 使用动态 `import()`，这是刻意设计：`folderStore/tagStore -> MiraSDKService -> WebSocketService` 存在潜在循环依赖，不要改回顶层静态导入。

### Home 路由事件

```text
routeHandler.handleFolderRoute()
  -> miraEventBus.emit('home-route-folder', detail)
  -> folderHandler.listenToRouteEvents() 的 handler
  -> openFolder()
  -> miraEventBus.emit('home-folder-selected', folder)
  -> useHomeEventHandlers.handleFolderSelected()
  -> createTabFromFolder() / switchToTabWithCallback()
```

标签路由使用同样结构，将 `folder` 替换为 `tag`。

## Tab ID 与业务 ID

UI Tab ID 可以带类型前缀，业务数据 ID 不应带前缀：

```ts
{
  id: 'tag-1',       // Tab 唯一标识，可用于路由和渲染
  data: {
    id: '1',         // 业务标签 ID，持久化必须是纯 ID
    libraryId: '...'
  }
}
```

`createTabFromTag()` 会将输入中的 `tag-` 去掉后写入 `data.id`；恢复旧持久化数据时也会做同样规范化。文件夹 Tab 使用对应的 `folder-` 规则。

## 订阅生命周期规范

### Vue 组件

```ts
const onChanged = (detail: LibraryFileChangedDetail) => {
  // 使用 detail，不再读取 CustomEvent.detail
}

onMounted(() => miraEventBus.on('library-file-changed', onChanged))
onUnmounted(() => miraEventBus.off('library-file-changed', onChanged))
```

### Composable 返回清理函数

路由处理器等长期对象应在 `listenToRouteEvents()` 中返回清理函数：

```ts
const cleanup = handler.listenToRouteEvents()
// 生命周期结束时调用 cleanup()
```

不要使用匿名函数注册后再用另一个匿名函数取消；`off` 需要同一个函数引用。

## 迁移规则

迁移旧的 DOM 业务事件时：

```ts
// 旧代码
window.dispatchEvent(new CustomEvent('home-tab-replace', { detail }))
window.addEventListener('home-tab-replace', onReplace)

// 新代码
miraEventBus.emit('home-tab-replace', detail)
miraEventBus.on('home-tab-replace', onReplace)
```

订阅回调收到的就是载荷本身，不是 `Event`：

```ts
// 正确
const onReplace = ({ kind, payload }: HomeTabReplaceDetail) => {}

// 错误：不要再读取 event.detail
const onReplace = (event: Event) => (event as CustomEvent).detail
```

测试辅助脚本中的 `window.dispatchEvent` 可以暂时保留，但新的运行时代码不得新增同类业务事件。

## 排错清单

事件没有生效时按以下顺序检查：

1. 发布者是否确实调用 `miraEventBus.emit()`，事件名是否拼写一致。
2. 订阅者是否已经挂载，是否使用 `on()` 而不是旧的 `window.addEventListener()`。
3. `off()` 是否在组件复用/卸载时误删了其他监听器，或传入了不同函数引用。
4. `MiraEventMap` 的载荷是否与发布方一致。
5. Tab 刷新链中，`markTabsForEvent()` 是否返回目标 Tab ID。
6. 标签事件的业务 ID 是否为纯 ID，事件中的 `tags` 是否需要解析 JSON 字符串。
7. WebSocket 事件是否带正确的 `libraryId`；缺失时只能回退当前素材库。

## 修改影响面索引

| 文件 | 职责 |
| --- | --- |
| `packages/mira-client/src/renderer/services/EventBus.ts` | 单例总线和所有事件类型 |
| `packages/mira-client/src/renderer/services/WebSocketService.ts` | WS 事件接收、业务事件发布、Tab/Tree 刷新调度 |
| `packages/mira-client/src/renderer/composables/useTabs.ts` | 根据文件事件标记需要刷新的 Tab |
| `packages/mira-client/src/renderer/components/tabs/MediaTabListView/useMediaTabFetch.ts` | 消费 `active-tab-refresh` 并重新取数 |
| `packages/mira-client/src/renderer/stores/library.ts` | 发布文件夹/标签刷新请求 |
| `packages/mira-client/src/renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue` | 订阅 Tree 刷新事件 |
| `packages/mira-client/src/renderer/modules/home/folderHandler.ts` | 文件夹选择、清除、路由事件 |
| `packages/mira-client/src/renderer/modules/home/tagHandler.ts` | 标签选择、清除、路由事件 |
| `packages/mira-client/src/renderer/modules/home/routeHandler.ts` | 将路由参数发布为内部事件 |
| `packages/mira-client/src/renderer/views/HomeView/useHomeEventHandlers.ts` | 消费 Home 选择事件并创建/切换 Tab |
| `packages/mira-client/src/renderer/views/HomeView/index.vue` | 消费 `home-tab-replace` |

