# Handoff — mira-whiteboard 自由白板插件

> 本文档面向接手该插件后续开发的 agent。只描述**当前实现状态 + 工作机制**，不包含历史修复过程。
> 接手前请先通读 `README.md`（架构图与目录结构）与 `plugin.json`（元数据）。

---

## 一、这个插件是什么

**mira-whiteboard** 是 Mira 客户端的一款「自由白板」插件，基于 [`@woven-canvas/vue`](https://www.npmjs.com/package/@woven-canvas/vue) 提供无限画布能力。

核心交互：
1. Mira 主窗口右侧栏顶部有插件图标列表，其中一个是「自由画板」图标。
2. **点击图标 → 打开单个组合窗口**：左侧工程列表 + 右侧画布。
3. 左侧栏新建 / 重命名 / 删除画布工程。
4. 左侧栏点击工程（或菜单【项目】子菜单点击工程）→ 右侧画布切换到该工程。
5. 窗口顶部的菜单栏是**自定义**的：【项目】子菜单列出工程，点击切换；不再继承 Mira 主窗口的全局菜单。
6. 画布右上角【对象管理】展开节点侧栏；节点列表仅查询带 `Synced` 的持久化 Block，支持显示类型/所属 Frame、聚焦和级联删除。

---

## 二、架构（双进程侧 + 单组合窗口）

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
        │  自由画板组合窗口（dist/index.html，Vue SPA）         │
        │  ┌──────────────┬─────────────────────────────────┐ │
        │  │ 左侧工程列表  │ 右侧画布 <WovenCanvas>           │ │
        │  │ localStorage │ :key=currentProjectId            │ │
        │  │              │ store.persistence.documentId      │ │
        │  └──────────────┴─────────────────────────────────┘ │
        │  setMenu(template) → win.setMenu（自定义菜单栏）      │
        │  onMenuAction(({action, projectId}) => 切换/新建)    │
        └─────────────────────────────────────────────────────┘
```

关键点：
- **单窗口**承载工程列表 + 画布；不再有「管理窗口 → 画布窗口」两级弹窗。
- **画布切换**靠 `<WovenCanvas :key="currentProjectId">` 强制重挂 —— `<WovenCanvas>` 的 `documentId` 在组件构造时一次性读取（`@woven-canvas/vue` 的 `AssetManager` 构造函数，`node_modules/@woven-canvas/vue/build/index.js` 内），**非响应式**，只能靠换 key 重挂来切 IndexedDB。
- **自定义菜单**：插件窗口默认继承全局 `Menu.setApplicationMenu`（点击转发到主窗口，对插件窗口无意义）。本插件通过 `plugin-window:set-menu` IPC 用 `win.setMenu` 替换成本插件自己的菜单栏；菜单点击经主进程转发回窗口（`plugin-window:menu-action`）。
  - ⚠️ `win.setMenu` 只在 **Windows / Linux** 生效；macOS 仍走全局菜单（Electron 限制）。

---

## 三、本插件目录结构

```
mira-whiteboard/
├── plugin.json        # 插件元数据（pluginId 见下）
├── index.js           # 宿主侧脚本：注册 window 行为贡献（点击开窗）
├── index.html         # 自由画板组合窗口入口（vite 构建输入）
├── vite.config.ts     # 单页构建
├── tsconfig.json
├── package.json       # 依赖 vue / @woven-canvas/vue / vite / @vitejs/plugin-vue
├── pnpm-lock.yaml
├── src/
│   ├── app/           # 组合窗口 SPA
│   │   ├── main.ts
│   │   ├── App.vue    # 工程管理 + 画布 + 自定义菜单（localStorage 持久化）
│   │   └── CanvasObjectManager.vue # 画布对象管理侧栏
│   ├── shared/
│   │   └── loadMaterialIcons.ts
│   ├── assets/fonts/material-icons.woff2
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
| 工程列表存储 key | 组合窗口用 localStorage：`mira-whiteboard:projects`（**不是**宿主 api.storage）|
| 画布持久化 key | `<WovenCanvas>` 的 `store.persistence.documentId = "mira-whiteboard:" + projectId`，存 IndexedDB |
| 画布切换机制 | `<WovenCanvas :key="currentProjectId">`，换 key → 重挂 → 换 documentId |
| 菜单 IPC | 渲染进程 → `plugin-window:set-menu`(template) → 主进程 `win.setMenu`；点击 → `plugin-window:menu-action`(payload) 回窗口 |
| 图片剪贴板 / 外部拖拽 | `pluginWindow.copyImage(payload)` 写系统图片剪贴板；`pluginWindow.startImageDrag(payload)` 将图片写入临时文件并调用 Electron `webContents.startDrag` |
| 媒体投递 | 宿主侧 `pluginWindow.send(PLUGIN_ID, 'dist/index.html', 'media:add', files)` → 窗口 `onMessage('media:add')` 接收并插入当前工程（无当前工程则自动新建一个）|

> 组合窗口内**只有 `window.electronAPI.pluginWindow`**（来自专用 preload），没有宿主的 api.storage / 事件系统，所以工程列表走 localStorage。

---

## 五、宿主侧依赖（插件能跑起来的前提）

本插件依赖宿主（`packages/mira-client`）提供的几个机制，改动宿主时要同步考虑：

1. **插件贡献系统（`behavior:'window'` 模式）**
   - 类型定义：`packages/mira-client/src/renderer/plugins/types.ts` 的 `PluginContribution`（含 `behavior`、`onActivate`、`render`）。
   - 注册中心：`packages/mira-client/src/renderer/plugins/instanceManager.ts` 的 `initializeGlobalPluginSystem()` 内的 `contributions`。
   - 渲染入口：`packages/mira-client/src/renderer/views/HomeView/PluginContributionBar.vue`（按 behavior 分流：window→点击开窗 / popover→弹 render）。

2. **插件窗口机制（主进程）**
   - `packages/mira-client/src/main/ipc/PluginWindowHandlers.ts`：标准带 frame 的 BrowserWindow，按 `<pluginsDir>/<插件actualDirectory>/<entry>` 定位，windowId = `pluginId:entry:projectId`。
   - 专用 preload：`packages/mira-client/src/preload/plugin-window-preload.js`（额外暴露图片专用的 copyImage/startImageDrag，不开放通用文件系统）。
   - vite 入口：`packages/mira-client/vite.preload.config.ts` 已注册 `plugin-window-preload`。
   - IPC 注册：`packages/mira-client/src/main/ipc/handlers.ts`（IPCHandlers 构造 + cleanup）。

3. **窗口自定义菜单（主进程，本插件新增能力）**
   - `PluginWindowHandlers.handleSetMenu`：处理 `plugin-window:set-menu`，用 `BrowserWindow.fromWebContents(event.sender)` 拿发起窗口，递归处理模板（`action` → 挂 click 转发回窗口；`role`/`separator`/`radio`/`checkbox` 原样透传），`win.setMenu(Menu.buildFromTemplate(...))`。
   - 转发 channel：`plugin-window:menu-action`，payload = 模板里带 `action` 的项（含 `action` 与任意附加字段，如 `projectId`）。

4. **插件 API（`window.openPluginWindow`）**
   - `PluginService.createPluginContext` 注入 `api.window.openPluginWindow`（宿主侧调用路径）。
   - 共享类型：`packages/mira-client/src/shared/types.ts` 的 `PluginAPI.window` / `PluginWindowOpenOptions` / `ElectronAPI.pluginWindow`（含 setMenu/onMenuAction）。

5. **插件目录解析**
   - `PluginHandler.getPluginActualDirectory(pluginId)`：通过扫描返回插件真实目录名（目录名 ≠ pluginId 时也能解析）。PluginWindowHandlers 依赖它。

---

## 六、构建 & 安装流程

### 构建产物
```bash
cd online_client_plugins/plugins/mira-whiteboard
pnpm install --ignore-workspace   # 本插件在 monorepo 外，需忽略 workspace
pnpm build                        # 生成 dist/（index.html + assets）
```

### 安装到 Mira（本地验证路径）
运行时插件目录 ≠ 市场源仓库。默认 `pluginsDirectory` = `<userData>/plugins`（如 `%APPDATA%/mira-web/plugins`）。插件目录名 = **pluginId**（市场安装时强制用 `entry.pluginId` 作为目录名）。

把整个插件目录（**必须含 `dist/`**）放进去 → 应用设置里启用插件 → 重启 → 右侧栏出现图标。

### 市场分发
- 索引脚本：`scripts/build-client-plugins-index.mjs`，扫描 `online_client_plugins/plugins/*/` 生成根目录 `plugins.json`。
- **dist/ 会进入索引**（不在默认排除列表）；**src/、vite.config、tsconfig、根 html、lock 文件默认被排除**（构建期文件不进安装包）。
- 单个插件可放 `.pluginignore`（gitignore 语法，支持 `!` 取反）覆盖默认排除规则。

---

## 七、已知限制 / 后续可做

1. **macOS 菜单不生效**：`win.setMenu` 只在 Windows/Linux 替换窗口菜单栏；macOS 仍显示全局菜单（Electron 限制）。本应用主平台 win32，可接受。
2. **画布能力较基础**：当前只用了 `<WovenCanvas>` 的点阵背景 + IndexedDB 持久化。协同（WebSocket 多人同步）、自定义 block/tool、导出图片等能力未实现。
3. **工程管理 UI 用原生 prompt/confirm**：体验较朴素，可换成自绘弹窗。
4. **删除工程不清理 IndexedDB**：工程列表在 localStorage，画布内容在 IndexedDB，两者仅靠 projectId 关联。删除工程不会清理对应画布的 IndexedDB 数据。
5. **无图标资源**：右侧栏用的是 Material Icons 字体类名 `dashboard_customize`，未提供 icon.png。

---

## 八、建议接手时先做的事

1. 读 `README.md` 的架构图 + 本文档第二章。
2. `pnpm install --ignore-workspace && pnpm build` 确认能构建出 `dist/index.html`。
3. 启动 Mira，确认右侧栏图标 → 组合窗口 → 左侧栏切工程 / 菜单【项目】切工程 → 画布切换整条链路通。
4. 改动前先判断属于哪一层（宿主侧 / 插件窗口侧 / 主进程侧），避免改错位置。

---

## 九、建议技能（Suggested Skills）

接手本插件开发时，以下技能可能有帮助：

- **diagnose**：窗口加载失败、菜单不生效、IPC 不通、构建报错等疑难问题，按「复现 → 最小化 → 假设 → 修复 → 回归」流程定位。
- **planning-with-files**：如果要扩展画布能力（协同 / 自定义 block），先用它拆解多步任务。
- **superpowers:test-driven-development**：给工程管理 / 画布持久化逻辑加测试时使用。
- **superpowers:systematic-debugging**：遇到白屏 / dist 加载 404 / preload 未注入 / 菜单不刷新等问题时的系统化排查。
