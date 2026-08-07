## 目标
点击 Breadcrumb 时，**替换当前 tab 的内容**（保留同一个 tab 槽位），而不是新建/切换到另一个 tab。

## 背景分析
- `Breadcrumb.vue` 通过 `@select` 抛出被点击项；`MediaTabListView.vue` 的 `handleBreadcrumbClick`（line 572-587）调用 `createTabFromFolder`/`createTabFromTag`，这两个函数会**新建 tab 或切换到已存在 tab**（`useTabs.ts:375`、`426`）。
- Tab 视图配置由 `useHomeTabManagement` 缓存在 `tabViewConfigMap`（按 `tab.id` 缓存），`TabViewRenderer` 用 `:key="viewConfig.key || tabId"` + `KeepAlive`，`MediaViewTabType.getViewConfig` 的 key 为 `${this.name}-${context.tabId}`。
- 因此"原地替换"必须同时：更新当前 tab 的 `id/type/data/label/icon`、清掉该 tab 的旧视图配置缓存（触发重新拉取）、清掉媒体数据缓存、重新加载数据、同步路由参数。

## 实现方案

### 1. 在 `useHomeTabManagement.ts` 新增 `replaceCurrentTab`（核心）
位置：`packages/mira-client/src/renderer/views/HomeView/useHomeTabManagement.ts`

参考已有的 `refreshCurrentTabAfterLibrarySwitch`（line 366-377）模式，新增：
```ts
const replaceCurrentTab = async (
  kind: 'folder' | 'tag' | 'all',
  payload: { id?: string; title?: string; label?: string }
) => {
  const current = getCurrentTab()
  if (!current) return

  // 1. 计算新的 tab 元数据（与 createTabFromFolder/Tag 保持一致）
  let newId = current.id
  let newType = current.type
  let newData = current.data
  let newLabel = current.label
  let newIcon = current.icon

  if (kind === 'all') {
    newId = 'all'; newType = 'all'; newLabel = '全部文件'; newIcon = 'folder'
    newData = { ...current.data, id: 'all', title: '全部文件', libraryId: current.data?.libraryId }
  } else if (kind === 'folder') {
    const folderId = String(payload.id)
    newId = folderId.startsWith('folder-') ? folderId : `folder-${folderId}`
    newType = 'folder'; newIcon = 'folder'
    newLabel = payload.title || payload.label || folderId
    newData = { ...current.data, id: folderId, title: newLabel, libraryId: current.data?.libraryId }
  } else { // tag
    const tagId = String(payload.id)
    newId = tagId.startsWith('tag-') ? tagId : `tag-${tagId}`
    newType = 'tag'; newIcon = 'label'
    newLabel = payload.title || `标签: ${payload.label || tagId}`
    newData = { ...current.data, id: tagId, title: newLabel, libraryId: current.data?.libraryId }
  }

  // 2. 原地更新当前 tab（保留槽位，但 id 变化以匹配新内容）
  const oldId = current.id
  Object.assign(current, { id: newId, type: newType, data: newData, label: newLabel, icon: newIcon, needUpdate: true })

  // 3. 清除旧/新 id 的视图配置缓存（id 变化后 watch 会自动重新拉取新 id 的配置，
  //    但显式清掉 oldId 防止残留）
  delete tabViewConfigMap.value[oldId]
  // 主动为新 id 加载视图配置
  await loadTabViewConfig(current)
  currentTabViewConfig.value = tabViewConfigMap.value[newId] ?? null

  // 4. 清掉媒体数据缓存 & 重置分页，触发重新加载
  clearTabCache(newId)
  setTabNeedUpdate(newId, true)

  // 5. 同步路由 / 控制器状态（复用现有 switch 回调）并触发数据懒加载
  await handleTabSwitch(current)
  switchToTabWithCallback(newId)
}
```
需要的 imports：`clearTabCache`（来自 `@renderer/composables/useMediaTabData`，已 import `cacheTabData`/`useMediaTabData`，补 `clearTabCache`）。
在返回对象中导出 `replaceCurrentTab`。

### 2. `HomeView/index.vue` 透传 `replaceCurrentTab` 并注册事件
- 从 `tabManagement` 解构 `replaceCurrentTab`。
- 注册自定义事件 `home-tab-replace` 监听器（参考 `home-folder-selected` 的 `registerGlobalEvents` 模式），在回调里调用 `replaceCurrentTab(e.detail.kind, e.detail.payload)`，并 cleanup。

### 3. `MediaTabListView.vue` 改 `handleBreadcrumbClick`
将 line 572-587 的逻辑从"创建/切换 tab"改为"派发 `home-tab-replace` 事件"：
```ts
const handleBreadcrumbClick = (item: BreadcrumbItem) => {
  let kind: 'folder' | 'tag' | 'all'
  let payload: any = {}
  if (item.id === 'all') {
    kind = 'all'
  } else if (item.id.startsWith('folder-')) {
    kind = 'folder'
    payload.id = item.id.slice('folder-'.length)
    payload.title = item.label
  } else if (item.id.startsWith('tag-')) {
    kind = 'tag'
    payload.id = item.id.slice('tag-'.length)
    payload.title = item.label
  } else {
    return
  }
  window.dispatchEvent(new CustomEvent('home-tab-replace', { detail: { kind, payload } }))
}
```
不再需要 `createTabFromFolder`/`createTabFromTag`（可从 `useTabs()` 解构中移除）。

## 涉及文件
1. `packages/mira-client/src/renderer/views/HomeView/useHomeTabManagement.ts` — 新增 `replaceCurrentTab`
2. `packages/mira-client/src/renderer/views/HomeView/index.vue` — 透传 + 注册 `home-tab-replace` 事件
3. `packages/mira-client/src/renderer/components/tabs/MediaTabListView.vue` — 改 `handleBreadcrumbClick` 派发事件

## 验证
- 打开一个深层文件夹 tab，Breadcrumb 显示 全部文件 / 父文件夹 / 当前文件夹。
- 点击"全部文件"：当前 tab 变成"全部文件"（tab 条槽位不变，无新 tab），内容刷新为全部文件。
- 点击"父文件夹"：当前 tab 变成父文件夹内容，无新 tab。
- 标签 tab 下点击"全部文件"：当前 tab 变成全部文件。
- 确认 tab 条不增加、路由参数随内容更新、瀑布流/列表数据正确刷新。