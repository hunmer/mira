# Handoff — mira-whiteboard 自由白板插件

> 本文档面向接手该插件后续开发的 agent。只描述**当前实现状态 + 工作机制**，不包含历史修复过程。
> 接手前请先通读 `README.md`（架构图与目录结构）与 `plugin.json`（元数据）。

---

## 一、这个插件是什么

**mira-whiteboard** 是 Mira 客户端的一款「自由白板」插件，基于 [`@woven-canvas/vue`](https://www.npmjs.com/package/@woven-canvas/vue) 提供无限画布能力。

核心交互：
1. Mira 主窗口右侧栏顶部有插件图标列表，其中一个是「自由画板」图标。
2. **点击图标 → 直接弹出「工程管理」窗口**（不再用 popover）。
3. 工程管理窗口内：新建 / 重命名 / 删除画布工程。
4. 点击某个工程 → **再弹出一个独立的「画布窗口」**，加载该工程的无限画布。

---

## 二、双进程侧 + 两级窗口架构

```
┌─ Mira 主窗口（渲染进程）──────────────────────────────────────┐
│  index.js（宿主侧脚本，被注入 document）                       │
│    └─ registerContribution({ behavior:'window', onActivate }) │
│        点击图标 → onActivate → ctx.openPluginWindow           │
└────────────────────────────────┬──────────────────────────────┘
                                 │ IPC: plugin-window:open
                                 │   entry = dist/index.html
                 ┌───────────────▼───────────────┐
                 │  主进程 PluginWindowHandlers   │
                 │  preload: plugin-window-preload│
                 └───────────────┬───────────────┘
                                 │ loadFile dist/index.html
        ┌────────────────────────▼────────────────────────────┐
        │  ① 工程管理窗口（dist/index.html，Vue SPA）          │
        │     · localStorage 存工程列表                         │
        │     · 点击工程 → electronAPI.pluginWindow.open       │
        └────────────────────────┬────────────────────────────┘
                                 │ IPC: plugin-window:open
                                 │   entry = dist/canvas.html?projectId=xxx
                 ┌───────────────▼───────────────┐
                 │  主进程 PluginWindowHandlers   │
                 └───────────────┬───────────────┘
                                 │ loadFile dist/canvas.html?projectId=xxx
        ┌────────────────────────▼────────────────────────────┐
        │  ② 画布窗口（dist/canvas.html，Vue SPA）             │
        │  <WovenCanvas>（@woven-canvas/vue）                  │
        │    store.persistence.documentId = projectId         │
        └─────────────────────────────────────────────────────┘
```

关键点：**插件窗口配了专用 preload（`plugin-window-preload`）**，只暴露最小化的 `electronAPI.pluginWindow.{open,close}`，让工程管理窗口能再开子窗口（画布窗口）。

---

## 三、本插件目录结构

```
mira-whiteboard/
├── plugin.json        # 插件元数据（pluginId 见下）
├── index.js           # 宿主侧脚本：注册 window 行为贡献（点击开窗）
├── index.html         # ① 工程管理入口（vite 构建输入）
├── canvas.html        # ② 画布入口（vite 构建输入）
├── vite.config.ts     # 多页构建（ESM __dirname 派生）
├── tsconfig.json
├── package.json       # 依赖 vue / @woven-canvas/vue / vite / @vitejs/plugin-vue
├── pnpm-lock.yaml
├── src/
│   ├── manager/       # 工程管理 SPA
│   │   ├── main.ts
│   │   └── App.vue    # 工程列表 UI（原生 prompt/confirm，localStorage 持久化）
│   ├── canvas/        # 画布 SPA
│   │   ├── main.ts
│   │   └── App.vue    # <WovenCanvas>，按 projectId 持久化到 IndexedDB
│   └── shims-vue.d.ts
└── dist/              # 构建产物（运行时入口，必须随安装包分发）
```

**pluginId**：`c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b`

---

## 四、关键常量 / 数据契约

| 项 | 值 / 说明 |
|---|---|
| `PLUGIN_ID` | `c3f4a5b6-7d8e-4f90-8a1b-2c3d4e5f6a7b`（index.js 内硬编码，与 plugin.json 一致）|
| `CONTRIBUTION_ID` | `mira-whiteboard:main`（宿主右侧栏 UI 贡献 id）|
| 工程列表存储 key | 工程管理窗口用 localStorage：`mira-whiteboard:projects`（**不是**宿主 api.storage）|
| 画布持久化 key | `<WovenCanvas>` 的 `store.persistence.documentId = "mira-whiteboard:" + projectId`，存 IndexedDB |
| 窗口 query | 画布窗口 URL 带 `projectId`、`projectName`（画布 App.vue 从 `location.search` 读）|

> 工程管理窗口内**只有 `window.electronAPI.pluginWindow`**（来自专用 preload），没有宿主的 api.storage / 事件系统，所以工程列表走 localStorage。

---

## 五、宿主侧依赖（插件能跑起来的前提）

本插件依赖宿主（`packages/mira-client`）提供的几个机制，改动宿主时要同步考虑：

1. **插件贡献系统（`behavior:'window'` 模式）**
   - 类型定义：`packages/mira-client/src/renderer/plugins/types.ts` 的 `PluginContribution`（含 `behavior`、`onActivate`、`render`）。
   - 注册中心：`packages/mira-client/src/renderer/plugins/instanceManager.ts` 的 `initializeGlobalPluginSystem()` 内的 `contributions`。
   - 渲染入口：`packages/mira-client/src/renderer/views/HomeView/PluginContributionBar.vue`（按 behavior 分流：window→点击开窗 / popover→弹 render）。

2. **插件窗口机制（主进程）**
   - `packages/mira-client/src/main/ipc/PluginWindowHandlers.ts`：标准带 frame 的 BrowserWindow，按 `<pluginsDir>/<插件actualDirectory>/<entry>` 定位，windowId = `pluginId:entry:projectId`。
   - 专用 preload：`packages/mira-client/src/preload/plugin-window-preload.js`（仅暴露 pluginWindow.open/close）。
   - vite 入口：`packages/mira-client/vite.preload.config.ts` 已注册 `plugin-window-preload`。
   - IPC 注册：`packages/mira-client/src/main/ipc/handlers.ts`（IPCHandlers 构造 + cleanup）。

3. **插件 API（`window.openPluginWindow`）**
   - `PluginService.createPluginContext` 注入 `api.window.openPluginWindow`（宿主侧调用路径）。
   - 共享类型：`packages/mira-client/src/shared/types.ts` 的 `PluginAPI.window` / `PluginWindowOpenOptions` / `ElectronAPI.pluginWindow`。

4. **插件目录解析**
   - `PluginHandler.getPluginActualDirectory(pluginId)`：通过扫描返回插件真实目录名（目录名 ≠ pluginId 时也能解析）。PluginWindowHandlers 依赖它。

---

## 六、构建 & 安装流程

### 构建产物
```bash
cd online_client_plugins/plugins/mira-whiteboard
pnpm install --ignore-workspace   # 本插件在 monorepo 外，需忽略 workspace
pnpm build                        # 生成 dist/（index.html + canvas.html + assets）
```

> **注意 `vite.config.ts`**：因为 `package.json` 是 `"type":"module"`，ESM 下没有 `__dirname`，必须用 `dirname(fileURLToPath(import.meta.url))` 派生。多页入口在 `rollupOptions.input`（main=index.html, canvas=canvas.html）。

### 安装到 Mira（本地验证路径）
运行时插件目录 ≠ 市场源仓库。默认 `pluginsDirectory` = `<userData>/plugins`（如 `%APPDATA%/mira-web/plugins`）。插件目录名 = **pluginId**（市场安装时强制用 `entry.pluginId` 作为目录名）。

把整个插件目录（**必须含 `dist/`**）放进去 → 应用设置里启用插件 → 重启 → 右侧栏出现图标。

### 市场分发
- 索引脚本：`scripts/build-client-plugins-index.mjs`，扫描 `online_client_plugins/plugins/*/` 生成根目录 `plugins.json`。
- **dist/ 会进入索引**（不在默认排除列表）；**src/、vite.config、tsconfig、根 html、lock 文件默认被排除**（构建期文件不进安装包）。
- 单个插件可放 `.pluginignore`（gitignore 语法，支持 `!` 取反）覆盖默认排除规则。

---

## 七、已知限制 / 后续可做

1. **画布能力较基础**：当前只用了 `<WovenCanvas>` 的点阵背景 + IndexedDB 持久化。协同（WebSocket 多人同步）、自定义 block/tool、导出图片等能力未实现（参考 `woven-canvas-docs-src` 可扩展）。
2. **工程管理 UI 用原生 prompt/confirm**：体验较朴素，可换成自绘弹窗。
3. **画布窗口与工程管理窗口的数据不互通**：工程列表在 localStorage（管理窗口），画布内容在 IndexedDB（画布窗口），两者仅靠 projectId 关联。删除工程不会清理对应画布的 IndexedDB 数据。
4. **无图标资源**：右侧栏用的是 Material Icons 字体类名 `dashboard_customize`（宿主已加载该字体），未提供 icon.png。
5. **窗口标题中文**：部分环境下窗口 title 可能需确认编码（Windows 已设 chcp 65001）。

---

## 八、建议接手时先做的事

1. 读 `README.md` 的架构图 + 本文档第二章。
2. `pnpm install --ignore-workspace && pnpm build` 确认能构建出 `dist/`。
3. 启动 Mira，确认右侧栏图标 → 工程管理窗口 → 画布窗口整条链路通。
4. 改动前先判断属于哪一层（宿主侧 / 插件窗口侧 / 主进程侧），避免改错位置。

---

## 九、建议技能（Suggested Skills）

接手本插件开发时，以下技能可能有帮助：

- **diagnose**：画布窗口加载失败、IPC 不通、构建报错等疑难问题，按「复现 → 最小化 → 假设 → 修复 → 回归」流程定位。
- **planning-with-files**：如果要扩展画布能力（协同 / 自定义 block），先用它拆解多步任务。
- **superpowers:test-driven-development**：给工程管理 / 画布持久化逻辑加测试时使用。
- **superpowers:systematic-debugging**：遇到白屏 / dist 加载 404 / preload 未注入等问题时的系统化排查。
