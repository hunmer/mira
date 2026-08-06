# 自由白板插件实现计划

## 目标
1. 新建白板插件 `online_client_plugins/plugins/mira-whiteboard/`，参考 `woven-canvas` 文档，画布 dist 用 `@woven-canvas/vue` 构建为独立 SPA。
2. 在 `HomeView/index.vue:422~441` 右侧栏最顶部新增横向「插件图标列表」(PluginContributionBar)，点击用 popover 弹出插件自定义内容。
3. 新建通用「插件 BrowserWindow」机制：点击画布工程 → 弹出独立窗口加载插件 `dist/index.html`。

## 契约决策（已确认）
- 画布技术：集成 `@woven-canvas/vue`（插件自带 Vite 构建 → dist SPA）。
- UI 契约：**DOM 渲染契约**——扩展 `window.pluginSystem.registerContribution()`，插件用原生 DOM 把工程列表渲染进宿主容器。
- 图标范围：展示**所有已注册 contribution 的插件**图标（通用可扩展）。

---

## 一、扩展插件 Contribution 系统（宿主侧）

**`src/renderer/plugins/instanceManager.ts`** — `initializeGlobalPluginSystem()` 内扩展 `window.pluginSystem`：
```js
contributions: {
  list: [], listeners: [],
  register(contribution) { ...; emit() },   // { id, pluginId, icon, title, render(container, ctx)→cleanup }
  unregister(id) { ...; emit() },
  getContributions() { return list },
  subscribe(fn) { listeners.push(fn); return () => listeners.splice(...) }
}
```
- `icon` 用 `{ type: 'material'|'emoji'|'text', value }`，避免路径解析（宿主已加载 material icons 字体）。
- `render(container, ctx)` 返回 cleanup 函数；`ctx = { api, openPluginWindow(opts) }`。

**`src/renderer/plugins/types.ts`** — 补充 `PluginContribution` 与 `PluginSystemAPI` 的 contributions 字段类型。

## 二、扩展插件 API：打开插件窗口

**`src/shared/types.ts`** — `PluginAPI` 增：
```ts
window: { openPluginWindow(opts: { pluginId; entry?: string; title?; width?; height?; query?: Record<string,string> }): Promise<{success; windowId?}> }
```

**`src/preload/preload.ts`** — `electronAPI` 增加：
```ts
pluginWindow: {
  open: (opts) => ipcRenderer.invoke('plugin-window:open', opts),
  close: (windowId) => ipcRenderer.invoke('plugin-window:close', windowId),
}
```
并在 `ElectronAPI` 接口(`types.ts`)补 `pluginWindow` 类型。

**`src/renderer/services/PluginService.ts`** — `createPluginContext` 的 `api` 增加 `window.openPluginWindow`（转发到 `electronAPI.pluginWindow.open`）。

## 三、通用插件 BrowserWindow（主进程）

**新建 `src/main/ipc/PluginWindowHandlers.ts`**（标准带 frame 窗口，非透明浮动）：
- IPC：`plugin-window:open` / `plugin-window:close`。
- `open(opts)`：
  - 解析路径：通过注入的 `PluginHandler`/`pluginsDirectory` → `<pluginsDir>/<pluginId>/<entry||'dist/index.html'>`。
  - 复用窗口：以 `windowId = ${pluginId}:${projectId||'default'}` 为 key，已存在则 focus 并通过 `loadURL` 带 query 切换，否则新建。
  - `new BrowserWindow({ width, height, title, frame:true, webPreferences:{ contextIsolation:true, preload: 复用主 preload 或无 } })`；`loadFile(distPath, { hash/query })`。
- 注册到 `src/main/ipc/handlers.ts`（`IPCHandlers` 构造 + cleanup）。pluginsDirectory 通过 config/PluginHandler 获取。

## 四、HomeView 右侧栏集成

**新建 `src/renderer/views/HomeView/components/PluginContributionBar.vue`**（横向图标条）：
- `onMounted` 订阅 `window.pluginSystem.contributions.subscribe`，响应式更新 `contributions`。
- 每个 contribution 渲染为一个图标按钮（用 `Dropdown`/Popover 组件）。
- 打开 popover 时 `nextTick` 拿到容器 ref → 调 `contribution.render(containerEl, { api, openPluginWindow: electronAPI.pluginWindow.open })`；关闭时调返回的 cleanup。
- 样式与 HomeHeader 玻璃态一致，无 contribution 时返回 null（不占位）。

**`HomeView/index.vue`** — 右侧栏容器（第 424 行 `<div class="flex flex-col gap-3 ...">`）内，在 `<HomeHeader>` **之前**插入 `<PluginContributionBar />`。

## 五、白板插件本体

**`online_client_plugins/plugins/mira-whiteboard/`**：
- **`plugin.json`**：pluginId(新 UUID)、permission `[ui, config]`、category `productivity`、config `{ projects: [] }`。
- **`index.js`**（宿主侧，IIFE 注册 factory + contribution）：
  - `async initialize(context)`：
    - 注册 contribution（icon material `dashboard_customize`，title「自由画板」）。
    - `render(container, ctx)` 用原生 DOM 构建工程列表（新建/编辑/删除按钮 + 工程卡片），数据走 `api.storage.get/set('projects')`（持久化工程列表）。
    - 工程卡片点击 → `ctx.openPluginWindow({ pluginId, entry:'dist/index.html', title: 项目名, query:{projectId} })`。
  - 返回 `{ initialize, cleanup }`，cleanup 调 `contributions.unregister`。
- **`src/`**（独立 Vue 画布 SPA，被 Vite 构建为 dist）：
  - `main.ts`：`createApp` + `<WovenCanvas>`（来自 `@woven-canvas/vue`），配 `background:{kind:'dots'}` + `store.persistence.documentId = projectId`（从 `location.search` 读取 `projectId`）。
  - `App.vue` + `index.html`（独立 HTML，引入 vue + woven-canvas）。
  - `package.json`：依赖 `vue`、`@woven-canvas/vue`、`@vitejs/plugin-vue`、`vite`；脚本 `"build": "vite build"`（outDir `dist`，`base:'./'`）。
  - `vite.config.ts`：Vue 插件，`build.outDir='dist'`、`emptyOutDir`、单页。
- **`README.md`**：说明 `pnpm install && pnpm build` 生成 dist；如何放入 pluginsDirectory；架构（index.js 宿主侧 / dist 窗口侧）。
- **`icon.png`**：贡献条占位图标（可选；主要用 material icon）。

**运行前提**：插件需在 `dist/` 构建产物存在时才能开窗。开发流程：在插件目录 `pnpm install && pnpm build`，再把整个目录（含 dist）放入用户 `pluginsDirectory`，应用内启用插件。

## 六、验证与收尾
- 重新生成市场索引：`pnpm build:client-plugins-index`（注意：现有索引脚本忽略 `dist/`，dist 不会进 plugins.json——市场分发 dist 的完善作为后续项，本次以本地 pluginsDirectory 为主验证路径）。
- 类型/编译：`pnpm -F mira-client build`（或类型检查）确认 preload/main/renderer 类型无误。
- 手动流程验证：启用插件 → 右侧栏出现图标 → popover 显示工程列表 → 新建工程 → 点击工程 → 弹出独立窗口加载白板 dist。

## 已知限制 / 后续
- 市场分发需让 `dist/` 进入 `plugins.json`（调整 `build-client-plugins-index.mjs` 的 IGNORED 规则或为白板插件开例外）——本次先打通本地流程，标记为 follow-up。
- 白板 dist 的打包体积/CDN 化、协同(WebSocket)配置未包含（quick-start 基础本地持久化即可）。

## 涉及文件清单
**新增**：
- `online_client_plugins/plugins/mira-whiteboard/{plugin.json, index.js, README.md, package.json, vite.config.ts, src/main.ts, src/App.vue, index.html}`
- `packages/mira-client/src/main/ipc/PluginWindowHandlers.ts`
- `packages/mira-client/src/renderer/views/HomeView/components/PluginContributionBar.vue`

**修改**：
- `packages/mira-client/src/renderer/plugins/{instanceManager.ts, types.ts}`
- `packages/mira-client/src/renderer/services/PluginService.ts`
- `packages/mira-client/src/preload/preload.ts`
- `packages/mira-client/src/shared/types.ts`
- `packages/mira-client/src/main/ipc/handlers.ts`
- `packages/mira-client/src/renderer/views/HomeView/index.vue`