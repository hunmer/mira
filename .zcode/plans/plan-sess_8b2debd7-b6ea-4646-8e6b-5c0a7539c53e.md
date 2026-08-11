# http URL 触发下载导入（4 入口，统一走后端执行器）

## 范围说明
用户要求 4 个入口生效：①主窗口导入 ②dashboard URL 下载按钮 ③菜单导入加 URL tab ④拖拽自动识别。下载统一走后端 `POST /api/download/start`（已就绪）+ WS `download::progress`/`download::item`（后端已广播）。后端无需改（除非补 source_url 元数据，见末尾）。

## 后端（可选小改）
`DownloadExecutorService.runOne` 入库后补写来源元数据：`createFileFromPath` 返回的 file.id 上调 `libraryService.updateFile(id, { custom_fields: { source_url: url } })`，让下载的文件保留来源（与 App.vue 插件窗口 addFromUrl 模式一致）。1 行改动。先确认 libraryService 是否有 updateFile 方法，有则加。

## mira-client renderer 改动

### 1. API 封装（基础设施）
**`MiraSDKService.ts` 新增方法**：
```ts
async startDownloadFromUrl(libraryId, urls: string[], folderId?): Promise<{ batchId, total }> {
  // axios.post ${serverUrl}/api/download/start { libraryId, urls, folderId, clientId }
  // token from useAuthStore().token，clientId from webSocketService.getClientId()
}
```
新增 `import axios` + `useAuthStore` + `webSocketService`。

### 2. 新建 `UrlImportDialog.vue`（复用入口组件）
独立 Dialog 组件（不强行改 FileUploadDialog 三栏布局，避免破坏现有逻辑）：
- textarea：每行一个 URL
- 目标文件夹选择（复用 FolderTreeComponent，可选）
- 「开始下载」按钮 → `miraSDKService.startDownloadFromUrl(...)`
- 进度区：Progress 条 + completed/total/failed/skipped 计数 + 每条 URL 状态列表
- `onMounted` 注册 `webSocketService.addEventListener('download::progress', cb)` 和 `download::item`（按 batchId 过滤）
- `onBeforeUnmount` 注销监听
- 文件列表无需手动刷（后端 createFileFromPath 触发 file::created，已有监听自动刷新）

**props**: `visible`, `initialFolderId?`, `initialTagIds?`（与 FileUploadDialog 一致）

### 3. MediaTabListView 拖拽自动识别 URL（入口 ④）
`MediaTabListView.vue` handleDrop（L423）在 files 检查**之前**插 URL 检测分支：
```ts
const uriList = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain')
const urls = uriList?.split(/\r?\n/).map(s => s.trim()).filter(s => /^https?:\/\//.test(s))
if (urls && urls.length > 0) {
  // 打开 UrlImportDialog，传入 urls + folderId
  droppedUrls.value = urls
  showUrlImportDialog.value = true
  return
}
if (!e.dataTransfer?.files?.length) return  // 原有逻辑
```
新增状态 `droppedUrls` / `showUrlImportDialog`，模板挂 `<UrlImportDialog>`。

### 4. 主窗口导入入口（入口 ①）
在 `HomeHeader` 或工具栏（`PluginContributionBar` / 主工具区）加一个「从 URL 导入」按钮 → 打开 `UrlImportDialog`。
调研一下用户惯用的导入按钮位置（FileUploadDialog 是怎么被打开的——拖拽触发 showUploadDialog，是否有独立按钮）。**最简：在 HomeHeader 用户菜单或工具栏加一个图标按钮**，点击 `showUrlImportDialog = true`。

### 5. 菜单「从 URL 导入」（入口 ③）
- `MenuService.ts` L67 后加 `{ id: 'import-from-url', label: '从 URL 导入', action: 'showImportFromUrlDialog' }`（不加快捷键避免冲突，或 `CmdOrCtrl+Shift+I`）
- `MenuHandlers.ts` L136 加 case `'showImportFromUrlDialog'` → `sendToRenderer('files:import-from-url')`
- `preload.ts` 暴露 `on('files:import-from-url', cb)`（preload 已有通配 invoke/on，但菜单走 send+on 模式，参考现有 `files:import`）
- `App.vue` 监听 `files:import-from-url` → 触发一个全局 ref 打开 UrlImportDialog（通过事件总线或 Pinia store 控制 Dialog 可见性）

**注意**：App.vue 是根组件，UrlImportDialog 若挂在 App.vue，则菜单/工具栏/拖拽都能通过「设置一个全局 store 的 visible」来打开。新建 `useUrlImportStore`（pinia）管理 `{ visible, urls, folderId }`，各入口调 `store.open(urls?, folderId?)`。这是最干净的可复用模式。

## dashboard 改动

### 6. dashboard file-manager URL 下载按钮（入口 ②，上一轮计划，本次补完）
- `file-manager/index.vue` 顶部按钮区（L412 上传按钮旁）加【URL 下载】按钮
- 新建 `UrlDownloadDialog.vue`（或内联 Dialog）：textarea + 当前选中库（只读 `useLibrary().selectedLibrary`）+ 进度
- 调 `downloadApi.start({ libraryId, urls, folderId, clientId })`（downloadApi 上一轮计划新建）
- 监听 WS `download::progress`（dashboard 的 WS 监听机制需确认，可能用原生 WebSocket 或 axios 轮询 progress 接口兜底）

## 改动文件清单

### mira-client
- `src/renderer/services/MiraSDKService.ts` — 加 startDownloadFromUrl
- `src/renderer/components/business/UrlImportDialog.vue`（新建）
- `src/renderer/stores/urlImport.ts`（新建，pinia 控制 Dialog 可见性）
- `src/renderer/components/tabs/MediaTabListView.vue` — 拖拽 URL 识别
- `src/renderer/App.vue` — 挂 UrlImportDialog + 监听菜单事件
- `src/renderer/services/MenuService.ts` — 加菜单项
- `src/main/ipc/MenuHandlers.ts` — 加 case
- `src/preload/preload.ts` —（若需要）暴露 on files:import-from-url
- `src/renderer/views/HomeView/HomeHeader.vue` 或工具栏 — 加「从 URL 导入」按钮

### dashboard
- `src/api/modules/download.ts`（新建，上一轮计划）
- `src/api/index.ts` — 导出 downloadApi
- `src/views/mira/file-manager/index.vue` — URL 下载按钮 + Dialog + 进度
- `src/i18n/locales/zh-CN.ts` / `en.ts` — 文案

### 后端
- `src/services/DownloadExecutorService.ts` — runOne 补 source_url 元数据（若 libraryService.updateFile 存在）

## 实施顺序（先验证后扩展）
1. 后端 source_url 小改（确认 updateFile 存在）
2. mira-client: MiraSDKService.startDownloadFromUrl + UrlImportDialog + urlImport store（核心）
3. mira-client: MediaTabListView 拖拽识别（入口 ④，最快见效）
4. mira-client: 菜单 + 工具栏按钮（入口 ①③）
5. dashboard: downloadApi + file-manager 按钮（入口 ②）
6. 每步 build/typecheck 验证，最后重启服务端到端测试

## 验收步骤
1. **拖拽**：从浏览器拖一个图片链接到主窗口网格 → 自动弹 UrlImportDialog 预填 URL → 点开始 → 进度推进 → 图片出现在网格
2. **菜单**：菜单栏点「从 URL 导入」→ 弹 Dialog → 粘贴 pinterest 图 URL → 下载成功（若配了 cookie）
3. **工具栏按钮**：主窗口工具栏「从 URL 导入」图标 → 同上
4. **dashboard**：file-manager 页 → 【URL 下载】→ 粘贴 URL → 进度 → 文件列表刷新
5. **cookie 生效**：未配 cookie 的 pixiv 图失败；配默认 cookie 后成功
6. **来源元数据**：下载成功的文件 source_url 字段有值

## 不做
- 不做画板/页面解析（仅图片直链）
- 不做暂停/重试 UI
- 不改 FileUploadDialog 三栏布局（用独立 UrlImportDialog）