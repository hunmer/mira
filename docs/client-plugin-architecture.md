# 客户端本地插件系统架构

本文档描述 Mira 客户端（`packages/mira-client`）的**本地插件系统**——插件的发现、加载、启用、市场分发、更新检查与 UI 贡献的完整架构。

> 服务端插件（基于 `mira-app-server`）请参阅 [server-plugin-development.md](./server-plugin-development.md)。本文仅涉及运行在 Electron 客户端主窗口内的本地插件。

---

## 目录

- [整体分层](#整体分层)
- [核心概念](#核心概念)
- [启动与加载流程](#启动与加载流程)
- [插件生命周期](#插件生命周期)
- [插件脚本契约](#插件脚本契约)
- [插件市场分发](#插件市场分发)
- [更新检查](#更新检查)
- [UI 贡献（Contributions）](#ui 贡献contributions)
- [素材上下文菜单](#素材上下文菜单)
- [插件独立窗口](#插件独立窗口)
- [状态持久化与恢复](#状态持久化与恢复)
- [IPC 通道一览](#ipc-通道一览)
- [关键文件索引](#关键文件索引)
- [已知约束与注意事项](#已知约束与注意事项)

---

## 整体分层

插件系统分四层，各层职责严格分离：

```
┌──────────────────────────────────────────────────────────────┐
│  UI 层                                                        │
│  PluginsDialog.vue    PluginContributionBar.vue    pluginPlan │
│  (插件管理对话框)      (右侧栏图标/贡献)            (设置页)    │
└───────────────────────────┬──────────────────────────────────┘
                            │ Pinia
┌───────────────────────────▼──────────────────────────────────┐
│  Store 层  stores/plugin.ts                                   │
│  状态管理 + 业务编排（启用/禁用/市场安装/更新检查/持久化）       │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  Service 层  services/PluginService.ts (单例)                 │
│  跨平台抽象 + 本地/在线插件合并 + 上下文构造(createPluginContext)│
│  + 渲染进程侧的文件校验/市场安装转发                            │
└──────────┬───────────────────────────────────┬───────────────┘
           │ plugins/ (运行时模块)               │ IPC (Electron)
┌──────────▼─────────────────┐    ┌─────────────▼───────────────┐
│ instanceManager /           │    │  Main 层                     │
│ operationManager /          │    │  handlers/PluginHandler.ts   │
│ scriptManager /             │    │  ipc/PluginWindowHandlers.ts │
│ storage / utils             │    │  (文件系统/发现/下载/校验/窗口)│
│ (脚本注入/工厂/实例/操作)    │    │                              │
└─────────────────────────────┘    └──────────────────────────────┘
```

**核心原则**：
- **Main 层只做文件系统操作**（发现插件目录、下载、校验），不感知 loaded/disabled 语义。
- **Service 层**是渲染进程的插件元数据中心（`Map<pluginId, PluginRuntime>`）。
- **plugins/ 模块**负责脚本注入、工厂注册、实例生命周期。
- **Store 层**编排业务流程并驱动 UI 响应式状态。

---

## 核心概念

### PluginRuntime（运行时对象）

```ts
interface PluginRuntime {
  config: LocalPluginConfig   // 来自 plugin.json 的配置
  status: 'loading' | 'loaded' | 'error' | 'disabled'
  directory: string           // 插件实际目录绝对路径
  context?: PluginContext     // 运行时上下文（含 api）
  module?: any
  error?: string
  loadedAt?: string
}
```

**`status` 的真实语义在渲染进程**：主进程 `handleGetAllPlugins` 一律返回 `'loaded'`（表示"已安装/存在"），而 loaded（已启用运行）vs disabled（已禁用）的区分完全由渲染进程的 `PluginService.discoverAndLoadPlugins` + Store 的 `restoreLocalPluginStates` 决定。

### window.pluginSystem（全局插件系统对象）

由 `instanceManager.initializeGlobalPluginSystem()` 创建并挂到 `window.pluginSystem`，包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `plugins` | `Map<id, {config, context}>` | 插件注册表（script onload 时写入） |
| `instancesFactory` | `Map<id, () => any>` | 实例工厂（插件脚本自行注册） |
| `instances` | `Map<id, instance>` | 已创建的插件实例 |
| `contributions` | 注册中心 | UI 贡献入口（见下文） |
| `mediaContextMenus` | 注册中心 | 媒体网格右键菜单（见下文） |
| `fileFormats` | 注册中心 | 自定义文件格式、预览地址与打开方式（见下文） |
| `events` | 事件总线 | on/emit/off |

关键方法：`registerPlugin`、`registerPluginInstance`、`getPluginInstanceFactory`、`loadPluginInstance(id, ctx)`、`unloadPluginInstance(id)`、`getPluginInstance(id)`。

> ⚠️ **架构注记**：项目存在两份 `window.pluginSystem` 实现——`services/PluginSystemCore.ts`（DOM ready 时先挂）与 `plugins/instanceManager.ts`（`initializeLocalPlugins` 时覆盖）。**运行时生效的是 instanceManager 版本**（operationManager/scriptManager 通过 `window.pluginSystem` 访问）。`PluginService.createPluginContext` 内 `context.api.pluginSystem` 引用的是 PluginSystemCore 的旧对象，属历史遗留。

---

## 启动与加载流程

应用启动由 `InitializationService.initializeApp()` 驱动，插件相关阶段：

```
1. globalPluginManager.initialize()        ← 进度 20%
   ├─ 读 settings 构造 PluginManagerConfig
   ├─ pluginStore.initializeLocalPlugins(config)
   │   ├─ initializeGlobalPluginSystem()          // 建 window.pluginSystem
   │   ├─ pluginService.initialize(config)        // IPC plugin:initialize
   │   │   └─ discoverAndLoadPlugins()            // IPC plugin:getAll
   │   └─ loadLocalPlugins()
   │       ├─ getAllPlugins()
   │       ├─ restoreLocalPluginStates()          // 按持久化恢复 loaded/disabled
   │       └─ injectPluginsToDocument()           // 为 loaded 插件注入 <script>
   └─ （失败不阻止启动，仅记录警告）

2. globalPluginManager.enableAllPlugins()   ← 进度 40%
   ├─ 遍历 localPlugins，并行 enableLocalPluginNew(id)
   │   └─ （失败会阻止应用启动！）
   └─ 校验 window.pluginSystem.instances.has(id)
```

### 插件目录默认值

`settings.pluginsDirectory` 默认为空。`settings.ts` 的 `loadSettings()` 中，若该字段为空，会用 **`app.getPath('userData') + '/plugins'`**（如 `%APPDATA%/mira-web/plugins`）兜底并落库——保证首次使用即有可用的安装目录。

---

## 插件生命周期

### 启用（Enable）

核心链路（`operationManager.enableLocalPluginNew`）：

```
enableLocalPluginNew(pluginId)
  ├─ 1. 找到 plugin，若 status!=='loaded' 先 injectPluginScript(plugin)
  │      （注入 <script src=".../index.js">，onload 时插件自注册 factory）
  ├─ 2. 轮询等待 factory：最多 10 次 × 300ms（共 ~3s）
  │      getPluginInstanceFactory(pluginId)
  ├─ 3. factory 仍无 → 按插件名降级匹配；再无则抛 "Plugin factory not registered"
  ├─ 4. 复用或创建 context（pluginService.createPluginContext）
  ├─ 5. loadPluginInstance(id, context)  // 调 factory(ctx)，存 instances Map
  │      └─ factory 内部执行插件的 initialize()
  └─ 6. plugin.status = 'loaded'
```

**关键**：factory 的存在与 `pluginId` 匹配是启用的前提。插件脚本必须在加载时调 `registerPluginInstance(PLUGIN_ID, factory)`，且 `PLUGIN_ID` 与 `plugin.json` 的 `pluginId` 一致。

### 禁用（Disable）

```
disableLocalPluginNew(pluginId)
  ├─ unloadPluginInstance(pluginId)  // 调 instance.cleanup()
  └─ plugin.status = 'disabled'
```

禁用**保留脚本标签**（只卸载实例），便于快速重新启用。

### 重载（Reload）

```
reloadLocalPlugin(pluginId)
  ├─ cleanupPluginScript(pluginId)      // 删 <script> + 注销 plugins Map
  ├─ pluginService.reloadPlugin(id)     // IPC plugin:get 刷新元数据，保留 status
  └─ 若 status==='loaded' → injectPluginScript  // 重新注入脚本
```

---

## 插件脚本契约

插件入口文件（默认 `index.js`，由 `plugin.json` 的 `index` 字段指定）作为**普通 `<script>` 标签**注入主窗口 document。因此**必须用浏览器友好的写法**。

### 必须遵循的契约

1. **IIFE 包裹**：`(function(){ ... })()`，不使用 CommonJS 的 `module.exports`（浏览器环境无 `module`，会抛 `ReferenceError: module is not defined`）。
2. **注册工厂**：脚本执行时调 `window.pluginSystem.registerPluginInstance(PLUGIN_ID, factory)`，`PLUGIN_ID` 必须与 `plugin.json` 的 `pluginId` 完全一致。
3. **factory 返回实例**：`factory(context)` 应返回带 `initialize()` / `cleanup()` 生命周期的实例对象。
4. **pluginSystem 未就绪时轮询**：`setup()` 内检查 `window.pluginSystem` 存在性，不存在则 `setTimeout(setup, 100)` 重试。

### 标准模板

```javascript
;(function () {
  const PLUGIN_ID = '<与 plugin.json pluginId 相同的 UUID>'

  class MyPlugin {
    constructor(context) {
      this.context = context
      this.api = context.api
    }

    async initialize() {
      const { api } = this
      api.log.info('插件初始化')
      // 读配置（来自 plugin.json 的 config 字段）
      const setting = api.config.get('mySetting')
      // 监听事件
      api.events.on('fileOpened', (data) => { /* ... */ })
      // 注册 UI 贡献（可选）
      if (window.pluginSystem?.contributions?.register) {
        window.pluginSystem.contributions.register({
          id: 'my-plugin:main',
          pluginId: PLUGIN_ID,
          title: '我的插件',
          icon: { type: 'material', value: 'extension' },
          behavior: 'window',
          onActivate: (ctx) => ctx.openPluginWindow({ title: '我的插件' })
        })
      }
    }

    async cleanup() {
      // 解绑事件、注销贡献
      window.pluginSystem?.contributions?.unregister('my-plugin:main')
    }
  }

  async function initialize(context) {
    const plugin = new MyPlugin(context)
    await plugin.initialize()
    return plugin
  }

  function setup() {
    if (window.pluginSystem?.registerPluginInstance) {
      window.pluginSystem.registerPluginInstance(PLUGIN_ID, initialize)
    } else {
      setTimeout(setup, 100)
    }
  }
  setup()
})()
```

### plugin.json 字段

```jsonc
{
  "pluginName": "插件名",
  "pluginId": "<UUID>",            // 必须与脚本中的 PLUGIN_ID 一致
  "version": "1.0.0",
  "index": "index.js",             // 入口文件，默认 index.js
  "priority": 1,                   // 加载优先级，越大越先
  "category": "productivity",      // communication/documentation/productivity/development/other
  "tags": ["标签"],
  "description": "描述",
  "author": "作者",
  "enable": true,
  "config": { /* 默认配置，通过 api.config.get 读取 */ },
  "hotkey": { "ctrl+shift+e": "action" },
  "events": ["fileOpened"],        // 声明监听的事件
  "dependencies": [],              // 依赖的其他插件 ID
  "permissions": ["ui", "config"],
  "platform": ["win32", "darwin", "linux"],
  "minAppVersion": "1.0.0"
}
```

### context.api 能力

| 命名空间 | 方法 | 说明 |
|----------|------|------|
| `log` | info/warn/error/debug | 带 `[pluginName]` 前缀的 console |
| `config` | get/set/has/delete | 读写 plugin.json 的 config 字段（**非**持久化存储） |
| `events` | emit/on/off | 基于 `window.dispatchEvent(CustomEvent('plugin_<id>_<event>'))` |
| `ui` | showNotification / showDialog | 通知与对话框 |
| `tabs` | registerCustomTab / openCustomTab | 注册并打开宿主内的自定义 UI Tab |
| `storage` | set/get/has/delete | 基于 ConfigStorage，key 前缀 `plugin_<id>_`，**实际为 async** |
| `media` | setLocalFile / setLocalFiles / registerContextMenu / registerFileFormat | 本地文件关联、媒体网格右键菜单和自定义格式处理注册 |
| `window` | openPluginWindow(opts) | 打开插件独立窗口，**默认 pluginId 锁定为当前插件** |
| `dom`* | querySelector / createElement 等 | 直通 document |
| `http`* | get / post | fetch + json |
| `app` | version / platform / isDev | 应用信息 |

> *`dom`、`http`、`pluginSystem` 由 `createPluginContext` 额外提供，但不在 `PluginAPI` 类型定义中（通过 `as any` 绕过）。

### 注册自定义 Tab

```javascript
const unregister = api.tabs.registerCustomTab({
  id: 'main',
  label: '插件页面',
  icon: 'widgets',
  render(container, context) {
    container.textContent = `Tab: ${context.tabId}`
    return () => container.replaceChildren()
  },
})

await api.tabs.openCustomTab('main')
// cleanup 时调用 unregister()
```

自定义 Tab 是会话级视图，不跨应用重启持久化。`render` 返回的函数会在 Tab 关闭时执行。

### 注册媒体上下文菜单

插件可以向媒体网格右键菜单注册操作。宿主会按插件 Contribution 自动分组，菜单层级为：

```text
调用插件 → 插件图标 + 插件名称 → 菜单项
```

注册接口位于 `context.api.media.registerContextMenu`：

```javascript
const unregister = api.media.registerContextMenu({
  id: 'my-plugin:send-to-board',
  label: '发送到我的画板',
  icon: 'add_to_photos',
  async onSelect(files) {
    // files 是普通、可结构化克隆的 FileInfo[]，不是 Vue Proxy
    console.log('选中的素材:', files)
  },
})

// cleanup 时注销
unregister()
```

### 自定义文件格式与多种打开方式

`registerFileFormat` 按文件扩展名或 MIME 类型匹配。同一种文件可以匹配多个注册项：`fileFormats.getForFile(file)` 返回第一个，`fileFormats.getAllForFile(file)` 返回全部。宿主使用全部匹配项生成以下入口：

- `PreviewHeader.vue` 右侧的格式图标。
- 媒体网格右键菜单中的“其他打开方式”子菜单。

`renderThumbnail` 获得列表/网格中的静态缩略图容器；`renderHoverCard` 获得 hovercard 内容容器。两个钩子都可返回清理函数，宿主会在文件切换或组件卸载时调用。

格式注册字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 格式处理器唯一 ID，也是 `/file-preview` 的 `viewer` 参数 |
| `title` | 否 | 打开方式显示名称 |
| `icon` | 否 | Material Symbols 图标名，默认 `extension` |
| `extensions` / `mimeTypes` | 至少一项 | 文件匹配条件，不区分大小写，扩展名可带或不带 `.` |
| `openByDefault` | 否 | 仅影响双击默认行为；设为 `false` 时保留宿主默认路由 |
| `getPreviewUrl(file)` | 否 | 返回完整 Viewer URL，由宿主 `IframePreview` 内嵌显示，可异步 |
| `open(file)` | 否 | 旧式或特殊打开逻辑；没有 `getPreviewUrl` 时由打开方式入口调用 |
| `renderThumbnail` / `renderHoverCard` | 否 | 自定义缩略图和悬停预览 |

```javascript
const unregister = api.media.registerFileFormat({
  id: 'psd-layer-viewer',
  title: 'PSD 分层预览',
  icon: 'layers',
  openByDefault: false,
  extensions: ['psd', 'psb'],
  mimeTypes: ['image/vnd.adobe.photoshop'],
  renderThumbnail(container, file) {
    const image = document.createElement('img')
    image.src = file.thumbnailPath || ''
    image.alt = file.name
    image.style.cssText = 'width:100%;height:100%;object-fit:cover'
    container.replaceChildren(image)
    return () => container.replaceChildren()
  },
  renderHoverCard(container, file) {
    // 仅 hovercard 打开时创建交互式预览。
    container.textContent = `PSD: ${file.name}`
    return () => container.replaceChildren()
  },
  getPreviewUrl(file) {
    const url = new URL('dist/index.html', pluginBaseUrl)
    url.searchParams.set('fileUrl', file.path || file.url || '')
    url.searchParams.set('fileName', file.name || '')
    return url.toString()
  },
})
// 插件 cleanup 中调用 unregister()
```

#### 内嵌预览调用链

```text
顶部格式图标 / 右键“其他打开方式”
  → router.push('/file-preview?...&viewer=<format.id>')
  → FilePreviewView 按 viewer 从 getAllForFile(file) 精确选择格式
  → format.getPreviewUrl(file)
  → IframePreview.vue 加载返回的完整 URL
```

实现 `getPreviewUrl` 时，插件负责解析自身资源并构造完整 URL；宿主不拼接插件专用参数。详情 Viewer 不应传 hovercard 使用的 `embed=1`，否则可能隐藏完整工具栏或面板。

`IframePreview` 内部的 `PreviewHeader` 会隐藏格式打开图标，防止当前插件 Viewer 重复打开自身；其他预览页和媒体右键菜单仍展示可用的其他打开方式。

双击文件仍遵循宿主默认类型路由。只有格式同时实现 `open()` 且 `openByDefault !== false` 时，Electron 客户端才允许该格式优先接管双击。需要保留图片默认 `/image-preview/:id`、同时提供插件打开方式时，应实现 `getPreviewUrl` 并设置 `openByDefault: false`，无需实现 `open()`。

为了兼容旧插件，没有 `getPreviewUrl` 但实现了 `open()` 的格式仍会显示在两处打开方式入口中，并直接执行 `open(file)`。

`onSelect(files)` 接收当前右键目标对应的素材列表：单选时为当前素材，多选时为当前选中的全部素材。菜单回调边界会将响应式对象转换为普通 JSON 对象，插件不应依赖 Vue 响应式能力。

菜单注册项的 `id` 在全局范围内必须唯一；插件禁用或清理时应调用返回的注销函数。

---

## 插件市场分发

### 市场源

市场源是一个提供 `plugins.json` 的 **HTTP 静态服务**。支持**多源配置**：

- `settings.clientPluginMarketUrls: string[]` —— 已配置的源列表。
- `settings.clientPluginMarketUrl: string` —— 当前选中的源（plugin store 读取此字段作为拉取目标）。

设置页（`pluginPlan.vue`）可增删源；PluginsDialog 的「插件市场」Tab 顶部有下拉切换源。旧版本的单值字段保留作向后兼容迁移。

### 索引构建

`scripts/build-client-plugins-index.mjs` 扫描 `online_client_plugins/plugins/` 生成 `plugins.json`：

- 为每个文件计算 sha256，为整目录计算聚合 checksum（按 posix 相对路径排序，可重现）。
- 支持 `--watch`（监听重建）、`--serve`（8080 起静态服务，带 CORS）、`--sync <installDir>`（生成后同步覆盖到安装目录，checksum 一致则跳过）。

### 安装流程

```
PluginsDialog.installMarketplacePlugin(entry)
  └─ pluginStore.installMarketplacePlugin(entry)
      └─ pluginService.installMarketplacePlugin(marketUrl, toPlainObject(entry))
          │  ⚠️ toPlainObject: 递归 toRaw 剥离 Vue Proxy，避免 IPC "对象不能被克隆"
          └─ IPC plugin:install-from-marketplace
              └─ PluginHandler.handleInstallFromMarketplace
                  ├─ targetDir = pluginsDirectory/<pluginId>
                  ├─ 清空旧目录 → mkdir
                  ├─ 逐文件下载 + sha256 校验（downloadAndVerifyFile）
                  │   （无 files 清单时兜底最小下载：plugin.json + 入口文件）
                  └─ parsePluginConfig 校验 → 失败则回滚删目录
      └─ 成功后 loadLocalPlugins() 刷新
```

---

## 更新检查

`pluginStore.checkPluginUpdates()` 对比本地已安装插件与市场条目，**双判定**：

1. **版本落后**：`compareVersions(market.version, local.version) > 0`
2. **文件不一致**：仅当市场条目含 `files` 清单时，调 `pluginService.getLocalFileChecksums(pluginId)`（IPC `plugin:compute-file-checksums`）计算本地文件 sha256，按 path→checksum 逐文件比对。数量不同或某文件 checksum 不匹配 → `fileMismatch`。

满足任一即标记可更新，结果存入 `pluginUpdates: Map<id, {entry, versionOutdated, fileMismatch}>`。

- PluginsDialog 切换到本地 Tab 且有市场源时**后台静默**检查（仅刷新徽章，不弹 toast）。
- 顶部「检查更新」按钮手动触发，弹 toast 反馈数量。
- 本地插件卡片显示「可更新」徽章，操作栏提供「更新」按钮（走市场安装覆盖）。

---

## UI 贡献（Contributions）

插件通过 `window.pluginSystem.contributions` 在 HomeView 右侧栏注册 UI 入口。`PluginContributionBar.vue` 订阅 contributions 列表并渲染。

### Contribution 类型

```ts
interface PluginContribution {
  id: string                              // 唯一标识（建议 '<pluginId>:<name>'）
  pluginId: string
  icon?: { type: 'material'|'emoji'|'text'; value: string }
  title: string
  description?: string
  behavior?: 'window' | 'popover'         // 默认 'window'
  onActivate?(ctx): void | Promise<void>  // window 行为：一般调 ctx.openPluginWindow
  render?(container, ctx): cleanup | void // popover 行为：渲染自定义 DOM
}
```

### 两种行为

- **`window`（默认）**：渲染为按钮，点击调 `onActivate(ctx)`。`ctx` 提供 `{ api, openPluginWindow(opts) }`，通常在此打开插件主界面窗口。
- **`popover`**：渲染为 Dropdown，展开后用 `ContributionHost` 组件承载——其 `onMounted` 调 `render(containerEl, ctx)`，把返回的 cleanup 在卸载时执行。

### 订阅机制

```js
const unsubscribe = window.pluginSystem.contributions.subscribe((list) => {
  // 立即推送一次当前快照，后续 register/unregister 时推送
})
```

`register`/`unregister` 内部调 `emit()`，对所有 listeners 推送 `list.slice()` 快照。

## 素材上下文菜单

素材上下文菜单使用独立的 `window.pluginSystem.mediaContextMenus` 注册中心：

```ts
interface PluginMediaContextMenu {
  id: string
  pluginId: string
  label: string
  icon?: string                 // Material Icons 名称
  onSelect: (files: FileInfo[]) => void | Promise<void>
}
```

---

## 插件独立窗口

插件可打开独立的 `BrowserWindow` 加载自己的 `dist/`（Vue SPA 等）。

```
ctx.openPluginWindow({ pluginId, entry?, title?, width?, height?, query? })
  └─ electronAPI.pluginWindow.open(opts)
      └─ IPC plugin-window:open
          └─ PluginWindowHandlers.handleOpen
              ├─ resolveEntryPath: pluginsDirectory/<pluginId>/<entry>
              │   不存在则回退 discoverPlugins().actualDirectory/<entry>
              ├─ windowId = `${pluginId}:${entry}:${projectId||'default'}`
              ├─ 复用：同 windowId 已存在 → show+focus + loadEntry(切 query)
              └─ 新建：BrowserWindow(1200×800, frame, preload=plugin-window-preload.js)
                  └─ loadFile(entryPath, { query })
```

- `entry` 默认 `dist/index.html`——**插件需自行构建 dist**（如 `pnpm build`），否则打开失败。
  SPA 中消费 `mira-plugin-ui` 组件（shadcn-vue）须按[源码消费指南](./plugin-ui-source-consumption.md)配置 Tailwind `@source` 等，否则弹窗类组件样式会静默缺失。
- 插件窗口的 preload（`plugin-window-preload.js`）只暴露最小白名单 `electronAPI.pluginWindow.{open,close,send,onMessage}`，不暴露 fs/插件管理 API（最小权限）。
- `query` 通过 `document.location.search` 传递，插件 SPA 可据此区分不同实例（如 whiteboard 按 `projectId`）。

### 插件窗口间消息

主窗口可向已存在的插件窗口发送结构化消息：

```ts
await window.electronAPI.pluginWindow.send(
  pluginId,
  'dist/canvas.html',
  'media:add',
  files,
)
```

返回值为 `{ success, delivered }`。`delivered=false` 表示没有匹配的已打开窗口，调用方通常应改为打开管理窗口或创建新实例。

插件窗口通过 preload 监听消息：

```javascript
const off = window.electronAPI.pluginWindow.onMessage((channel, data) => {
  if (channel === 'media:add') {
    // 处理素材列表
  }
})
// 页面卸载前调用 off()
```

窗口匹配使用 `${pluginId}:${entry}:` 前缀；同一入口存在多个窗口时优先投递到当前聚焦窗口，否则投递到最近创建的窗口。IPC 数据必须是可结构化克隆的普通对象，不能直接传 Vue Proxy、函数或 DOM 节点。

### mira-whiteboard 插入流程

`mira-whiteboard` 注册 `mira-whiteboard:add-to-canvas` 菜单项“添加到画布”：

1. 菜单回调接收素材列表。
2. 先通过 `plugin-window.send(..., 'media:add', files)` 尝试投递到已有 `canvas.html` 窗口。
3. 如果没有已打开画布，打开 `dist/index.html` 工程管理窗口，并通过 `media` query 传递素材列表。
4. 用户选择工程后，管理窗口打开 `dist/canvas.html?projectId=...&media=...`。
5. 画布窗口在 `<WovenCanvas>` 子树内调用 `useImageCreation().createImageBlock()`，根据素材 `url` 或 `thumbnailPath` 下载并插入图片块。

只有提供可访问 URL 的素材能自动插入；仅有本地路径的素材需要额外的文件读取能力。

---

## 状态持久化与恢复

### 持久化内容

`persistPluginState`（storage.ts）→ `LibraryStorage.setItem('plugins', ...)`，存储：

```ts
{
  plugins: ExtendedPluginInfo[],  // 含 id, enabled, isLocal 等
  currentPlugin, searchQuery, filterStatus, sortBy, sortOrder, lastUpdated
}
```

启用/禁用/reload 成功后由 store 调 `persistState()` 落库。

### 恢复逻辑

`loadLocalPlugins` → `restoreLocalPluginStates(plugins)`：

1. 读持久化的 `plugins`，构 `Map<pluginId, boolean>`（仅 `isLocal` 条目）。
2. 对每个当前插件，若持久化有记录：`status = savedEnabled ? 'loaded' : 'disabled'`。
3. 若从 loaded 变 disabled：`unloadPluginInstance` + `cleanupPluginScript` 清理。

> **注意**：`restoreLocalPluginStates` 仅在持久化**有记录**时才恢复。新装插件无记录时保持 `discoverAndLoadPlugins` 设的默认值。`discoverAndLoadPlugins` 已修复为**保留正在运行插件的真实 status**（刷新时不重置为 disabled），避免 UI 显示与实际运行状态不一致。

---

## IPC 通道一览

主进程 `PluginHandler` 注册的 channel（preload 的 `electronAPI.plugin` 命名空间映射）：

| Channel | 用途 |
|---------|------|
| `plugin:initialize` | 初始化（存 config、ensurePluginsDirectory、可选定时扫描） |
| `plugin:getAll` | 返回所有已发现插件（status 恒为 loaded） |
| `plugin:get` | 返回单个插件 |
| `plugin:discover` | 重新发现插件目录 |
| `plugin:reload-all` | 重新发现全部 |
| `plugin:install-from-marketplace` | 市场安装（逐文件下载 + sha256 校验） |
| `plugin:compute-file-checksums` | 计算本地插件文件 sha256 清单（更新检查用） |
| `plugin:uninstall` | 卸载（删目录） |
| `plugin:import-from-file` / `plugin:import-from-url` | 导入 |
| `plugin:select-directory` / `plugin:select-zip-file` | 文件选择对话框 |
| `plugin:update-config` / `plugin:get-config` / `plugin:clear-cache` | 配置管理 |
| `plugin:enable` / `plugin:disable` / `plugin:reload` / `plugin:execute` | ⚠️ 仅记日志返回 success，**真正逻辑在渲染进程 operationManager** |

`PluginWindowHandlers`：`plugin-window:open` / `plugin-window:close` / `plugin-window:send`。

---

## 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/main/handlers/PluginHandler.ts` | 主进程：插件发现、文件系统、市场下载校验、checksum 计算 |
| `src/main/ipc/PluginWindowHandlers.ts` | 主进程：插件独立窗口管理 |
| `src/preload/preload.ts` | preload：`electronAPI.plugin` / `pluginWindow` 命名空间 |
| `src/shared/types.ts` | 所有插件相关类型定义（LocalPluginConfig / PluginRuntime / PluginAPI / Marketplace* / ElectronAPI） |
| `src/renderer/services/PluginService.ts` | 渲染进程服务单例：跨平台抽象、元数据中心、createPluginContext、市场安装转发 |
| `src/renderer/services/GlobalPluginManager.ts` | 应用级插件初始化编排（initialize / enableAllPlugins） |
| `src/renderer/services/InitializationService.ts` | 启动流程（插件初始化在 20%-40% 阶段） |
| `src/renderer/stores/plugin.ts` | Pinia store：状态管理 + 业务编排（启用/禁用/市场/更新检查/持久化） |
| `src/renderer/plugins/instanceManager.ts` | `window.pluginSystem` 对象 + contributions/mediaContextMenus 注册中心 + 状态监控 |
| `src/renderer/components/preview/PreviewHeader.vue` | 预览标题栏 + 匹配格式的打开方式图标 |
| `src/renderer/components/preview/IframePreview.vue` | 在宿主预览布局中内嵌插件 Viewer URL |
| `src/renderer/components/business/MediaGridComponent/composables/useContextMenu.ts` | 媒体右键菜单 + “其他打开方式”入口 |
| `src/renderer/views/FilePreviewView.vue` | 按 `viewer` 选择格式并调用 `getPreviewUrl` |
| `src/renderer/plugins/operationManager.ts` | enable/disable/reload/通用操作分发（含 factory 等待重试） |
| `src/renderer/plugins/scriptManager.ts` | 脚本注入（`<script>` 标签 + onload 注册） |
| `src/renderer/plugins/storage.ts` | 持久化（LibraryStorage key='plugins'） |
| `src/renderer/plugins/types.ts` | PluginContribution / PluginSystemAPI 等运行时类型 |
| `src/renderer/plugins/utils.ts` | convertToScriptUrl / withOperation / cleanupPluginScript |
| `src/renderer/components/business/PluginsDialog.vue` | 插件管理对话框（本地/市场双 Tab） |
| `src/renderer/views/HomeView/PluginContributionBar.vue` | 右侧栏贡献图标（window/popover 两种行为） |
| `src/renderer/views/settings/pluginPlan.vue` | 设置页：插件目录 + 市场源列表配置 |
| `scripts/build-client-plugins-index.mjs` | 市场索引构建（--watch/--serve/--sync） |
| `online_client_plugins/plugins/` | 市场分发的插件源（mira-whiteboard / mira-welcome-demo） |

---

## 已知约束与注意事项

1. **脚本必须是 IIFE**：插件入口作为普通 `<script>` 注入，不能用 `module.exports`（会抛 `module is not defined`）或 ESM `import`。
2. **PLUGIN_ID 必须与 plugin.json 一致**：否则 `enableLocalPluginNew` 找不到 factory，报 `Plugin factory not registered`。
3. **IPC 不能传 Vue Proxy**：市场安装时 `entry` 来自 Pinia 响应式状态，跨 IPC 前必须 `toPlainObject`（递归 toRaw），否则抛"对象不能被克隆"。
   媒体菜单 `onSelect(files)` 同样只应传递普通 `FileInfo[]`；向 `pluginWindow.send` 发送的数据不能包含 Proxy、函数或 DOM 节点。
4. **插件窗口需自建 dist**：`openPluginWindow` 默认加载 `dist/index.html`，插件须自行构建。
5. **`window.pluginSystem` 双实现**：PluginSystemCore（旧，先挂）与 instanceManager（新，覆盖）。运行时以 instanceManager 为准。
6. **主进程 enable/disable 是占位**：`plugin:enable` 等 4 个 channel 仅记日志，真正逻辑在渲染进程 operationManager。
7. **status 语义跨进程不一致**：主进程恒返回 loaded，loaded/disabled 区分在渲染进程。
8. **更新检查的文件比对依赖市场索引的 files 清单**：无 files 时仅比对版本。
