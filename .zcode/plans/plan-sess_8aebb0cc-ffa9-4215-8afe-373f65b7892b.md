## 目标

在 `HomeView/index.vue` 右侧详情面板（433~458 行的 `<aside>`）内，把它从一个纯详情面板改造成**底部双图标 tab + 内容在上**的结构：

- **Tab 1「详情」**(icon: `info_outline`)：现有 `MediaDetailComponent`，保持现有 props/emits 不变。
- **Tab 2「历史」**(icon: `history`)：一个历史列表，顶部有分段控件切换两种模式：
  - **最近添加**：`listFiles(libraryId, { sort: 'imported_at', order: 'desc', limit })`
  - **最近查看**：新浏览历史 store，**按当前素材库过滤**
- 点击历史列表项 → `router.push('/file-preview', { query: { id, libraryId, title, path, mimeType } })`

只有当 `showDetailSidebar` 为真（即侧栏展开）时才渲染整个 tab 结构——折叠时（只剩 `PluginContributionBar` 竖条）与现状一致，不动。

## 实现步骤

### 1. 新建浏览历史 store（按库过滤）

**新文件**：`packages/mira-client/src/renderer/stores/viewHistory.ts`

仿照 `stores/uploadHistory.ts` 的结构（Pinia setup store + `LibraryStorage` 持久化）。关键点：

- 接口 `ViewRecord`：`{ fileId, libraryId, name, mimeType, thumbnailPath?, path?, size?, viewedAt }`
- 存储固定前缀 `'view-history'`——`LibraryStorage` 会自动拼成 `${libraryId}_mira_view-history`，**天然按库隔离**，无需手工按库过滤；展示时直接 `getLibraryRecords(currentLibrary.id)` 即可。
- 方法：`addViewRecord(file: FileInfo, libraryId)`（去重：同 fileId 提到队首并刷新 `viewedAt`，上限 100 条）、`getLibraryRecords(libraryId)`、`clearLibraryRecords(libraryId)`、`restoreFromStorage()`、`persistToStorage()`。
- 暴露 `recentViews` 计算属性（按 `viewedAt` desc 排序）。

### 2. 在 FilePreviewView 接入「记录浏览历史」

**修改**：`packages/mira-client/src/renderer/views/FilePreviewView.vue`

在 `loadFileInfo()` 成功拿到 `fileInfo.value` 后，调用 `useViewHistoryStore().addViewRecord(fileInfo.value, libraryId)`。只记录必要字段（fileId/name/mimeType/thumbnailPath/path/size）。放 `onMounted`/`watch(route.query)` 共用的 `loadFileInfo` 末尾，避免重复。

### 3. 初始化时恢复历史（可选但推荐）

**修改**：`packages/mira-client/src/renderer/views/HomeView/useHomeInit.ts`（或在 `index.vue` 的 `onMounted` 里），加一行 `await useViewHistoryStore().restoreFromStorage()`，与 `uploadHistory` 的恢复时机对齐。（若 `useHomeInit` 不方便定位，则落在 `index.vue` `onMounted`。）

### 4. 新建历史列表子组件

**新文件**：`packages/mira-client/src/renderer/views/HomeView/HistoryPanel.vue`

- Props：`{ libraryId: string }`
- 内部 state：`mode: 'recent_added' | 'recent_viewed'`（默认 `recent_added`），分段控件在顶部。
- `recent_added` 模式：`onMounted` + 切换到此模式时调 `miraSDKService.listFiles(libraryId, { sort: 'imported_at', order: 'desc', limit: 50, recycled: 0 })`。
- `recent_viewed` 模式：读 `useViewHistoryStore().getLibraryRecords(libraryId)`。
- 列表项：缩略图（`item.thumbnailPath || item.url`，失败回退 `getExtIconUrl`）+ 文件名 + 相对时间。点击 → emit `open` 事件，由父组件 `router.push('/file-preview', …)`。
- 复用现有视觉风格（rounded-xl / border / glass），与 `MediaDetailComponent` 协调；空状态用 `@/components/ui/empty`。
- 监听 `libraryId` 变化重新加载。

### 5. 改造 `HomeView/index.vue` 右侧 `<aside>`（433~458 行）

把现有 `<aside>` 内部从单一 `MediaDetailComponent` 改成 tab 结构：

- 引入 `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`，以及 `HistoryPanel`。
- **DOM 顺序**：`TabsContent`（`flex-1` 占满）在上 → `TabsList`（`shrink-0`）在下，实现「内容在上、tabs 在底部」。`Tabs` 根用默认 `v-model`（默认值 `'detail'`）。
- `TabsList` 覆盖默认 class 为 `h-9 w-full grid grid-cols-2`，`TabsTrigger` 只放 material icon（`info_outline` / `history`）+ 极简 label。
- `TabsContent value="detail"`：现有 `MediaDetailComponent`（原 `<div class="p-4 flex-1 overflow-y-auto">…</div>` 原样搬入）。
- `TabsContent value="history"`：`<HistoryPanel :library-id="detailLibraryId" @open="openFilePreview" />`。
- 新增 `openFilePreview(file)` 方法：`router.push({ path: '/file-preview', query: { id, libraryId, title: file.name, path: file.url||file.path||'', mimeType: file.mimeType } })`——与 `SearchHandlers.openFile` 一致。
- `<aside>` 的容器布局从 `p-4 flex-1 overflow-y-auto` 调整为 `flex-1 min-h-0 flex flex-col`，让 tab 内容区接管滚动。

Tab 状态用本地 `const detailPanelTab = ref('detail')`，侧栏折叠重开时保持上次选择即可。

## 不做的事
- 不动左侧栏、中间列、`PluginContributionBar`。
- 不动 `MediaDetailComponent` 内部逻辑。
- 不改 tab 条的"详情/历史"语义之外的行为。
- 折叠态（`showDetailSidebar=false`，只剩竖条）完全不动。

## 风险/确认点
- 浏览历史只记录到当前激活库（`LibraryStorage` 按库 key 隔离）。切库后历史列表自动只显示该库——符合你选的「按当前素材库过滤」。
- 历史项点击只进 `/file-preview` 路由，不做"灌入详情并切 tab"的联动（按你的选择）。
- `FilePreviewView` 的记录点放在 `loadFileInfo` 成功分支，只对成功加载的预览留痕。