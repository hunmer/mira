# 自由白板 (mira-whiteboard)

基于 [`@woven-canvas/vue`](https://www.npmjs.com/package/@woven-canvas/vue) 的自由无限画板插件。

## 功能

- 在 Mira 主窗口右侧栏顶部提供「自由画板」入口（插件图标列表）。
- **点击图标直接打开插件主界面窗口**（工程管理）。
- 工程管理窗口内：展示画布工程列表（**新建 / 重命名 / 删除**）。
- 点击工程 → 再弹出一个**独立画布窗口**，加载该工程的无限画布。
- 画布支持平移 / 缩放 / 形状 / 文本 / 图片 / 手绘 / 箭头等。
- 本地优先持久化：每个工程的画布内容按 `projectId` 存储在浏览器 IndexedDB，离线可用、刷新不丢。

## 架构（点击即开窗 + 两级窗口）

```
┌─────────────── Mira 主窗口（渲染进程）─────────────────────────────────┐
│  index.js (宿主侧脚本)                                                  │
│    └─ registerContribution({ behavior:'window', onActivate })          │
│        点击图标 → onActivate → ctx.openPluginWindow(dist/index.html)   │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │ IPC: plugin-window:open (entry=dist/index.html)
                       ┌───────────────▼─────────────────┐
                       │  主进程 PluginWindowHandlers    │
                       │  new BrowserWindow(loadFile)    │
                       │  preload: plugin-window-preload │
                       └───────────────┬─────────────────┘
                                       │ loadFile dist/index.html
                ┌──────────────────────▼───────────────────────────┐
                │  ① 工程管理窗口（dist/index.html，Vue SPA）       │
                │     - localStorage 存工程列表                      │
                │     - 点击工程 → electronAPI.pluginWindow.open     │
                └──────────────────────┬───────────────────────────┘
                                       │ IPC: plugin-window:open (entry=dist/canvas.html?projectId=xxx)
                       ┌───────────────▼─────────────────┐
                       │  主进程 PluginWindowHandlers    │
                       │  new BrowserWindow(loadFile)    │
                       └───────────────┬─────────────────┘
                                       │ loadFile dist/canvas.html?projectId=xxx
                ┌──────────────────────▼───────────────────────────┐
                │  ② 画布窗口（dist/canvas.html，Vue SPA）          │
                │  <WovenCanvas> (@woven-canvas/vue)               │
                │    store.persistence.documentId = projectId      │
                └──────────────────────────────────────────────────┘
```

关键：插件窗口配有 `plugin-window-preload`，暴露最小化的 `electronAPI.pluginWindow.{open,close}`，
让工程管理窗口能够**再次打开子窗口**（画布窗口）。

## 目录结构

```
mira-whiteboard/
├── plugin.json        # 插件元数据
├── index.js           # 宿主侧脚本：注册 window 行为贡献（点击开窗）
├── README.md
├── package.json       # dist SPA 依赖与构建脚本
├── vite.config.ts     # 多页构建（index.html + canvas.html）
├── index.html         # ① 工程管理入口
├── canvas.html        # ② 画布入口
├── src/
│   ├── manager/
│   │   ├── main.ts    # createApp(工程管理 App)
│   │   └── App.vue    # 工程列表（新建/重命名/删除/打开）
│   ├── canvas/
│   │   ├── main.ts    # createApp(画布 App)
│   │   └── App.vue    # <WovenCanvas>（按 projectId 持久化）
│   └── shims-vue.d.ts
└── dist/              # 构建产物（需执行 pnpm install && pnpm build 生成）
```

## 构建 dist（必须，否则无法打开窗口）

窗口加载的是 `dist/index.html` 与 `dist/canvas.html`，因此**首次使用前必须在插件目录构建一次**：

```bash
cd online_client_plugins/plugins/mira-whiteboard
pnpm install
pnpm build
# 生成 dist/（含 index.html / canvas.html）
```

## 安装到 Mira（本地验证）

构建出 `dist/` 后，把整个 `mira-whiteboard/` 目录（含 `dist/`）放入用户插件目录
（应用设置 → 插件 → 插件目录），重启或重新发现插件，在插件管理中**启用**本插件，
右侧栏即出现「自由画板」入口，点击即弹出工程管理窗口。

> 说明：当前市场索引脚本默认忽略 `dist/`，因此**经插件市场分发时 dist 不会进入 plugins.json**。
> 本次以本地插件目录为主要验证路径。市场分发 dist 的完善（调整索引规则或 CDN 化）作为后续项。

## 运行时依赖

- `@woven-canvas/vue` — 无限画布 Vue 组件（仅 canvas 页用）
- `vue` — dist SPA 运行时（与主窗口隔离，独立打包）
