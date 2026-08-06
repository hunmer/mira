# 自由白板 (mira-whiteboard)

基于 [`@woven-canvas/vue`](https://www.npmjs.com/package/@woven-canvas/vue) 的自由无限画板插件。

## 功能

- 在 Mira 主窗口右侧栏顶部提供「自由画板」入口（插件图标列表）。
- 点击图标弹出 popover：管理画布工程（**新建 / 重命名 / 删除**）。
- 点击工程 → 弹出**独立窗口**加载该工程的无限画布（dist SPA）。
- 画布支持平移 / 缩放 / 形状 / 文本 / 图片 / 手绘 / 箭头等。
- 本地优先持久化：每个工程的画布内容按 `projectId` 存储在浏览器 IndexedDB，离线可用、刷新不丢。

## 架构（双进程侧）

```
┌─────────────────────────────── Mira 主窗口（渲染进程）───────────────────────────────┐
│  index.js (本插件宿主侧脚本)                                                          │
│    ├─ registerPluginInstance(factory)   ← 注入 document 后注册工厂                     │
│    └─ registerContribution(...)         ← 向 HomeView 右侧栏注册 UI 入口               │
│        └─ render(container, ctx)        ← 原生 DOM 渲染工程列表（新建/编辑/删除）        │
│            └─ ctx.openPluginWindow(...) ← 点击工程 → 请求主进程开窗                     │
└──────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │ IPC: plugin-window:open
                           ┌───────────────▼─────────────────┐
                           │  主进程 PluginWindowHandlers    │
                           │  new BrowserWindow(loadFile)    │
                           └───────────────┬─────────────────┘
                                           │ loadFile dist/index.html?projectId=xxx
                ┌──────────────────────────▼───────────────────────────┐
                │  独立画布窗口（dist SPA）                              │
                │  <WovenCanvas> (@woven-canvas/vue)                    │
                │    store.persistence.documentId = projectId           │
                └──────────────────────────────────────────────────────┘
```

## 目录结构

```
mira-whiteboard/
├── plugin.json        # 插件元数据
├── index.js           # 宿主侧脚本（注入主窗口，注册工厂 + UI 贡献）
├── README.md
├── package.json       # dist SPA 依赖与构建脚本
├── vite.config.ts     # dist 构建（@vitejs/plugin-vue）
├── index.html         # dist SPA HTML 入口
├── src/
│   ├── main.ts        # createApp(<WovenCanvas>)
│   └── App.vue        # 画布组件（读取 location.search.projectId）
└── dist/              # 构建产物（需执行 pnpm install && pnpm build 生成）
```

## 构建 dist（必须，否则无法打开画布窗口）

窗口加载的是 `dist/index.html`，因此**首次使用前必须在插件目录构建一次**：

```bash
cd online_client_plugins/plugins/mira-whiteboard
pnpm install
pnpm build
# 生成 dist/
```

## 安装到 Mira（本地验证）

构建出 `dist/` 后，把整个 `mira-whiteboard/` 目录（含 `dist/`）放入用户插件目录
（应用设置 → 插件 → 插件目录），重启或重新发现插件，在插件管理中**启用**本插件，
右侧栏即出现「自由画板」入口。

> 说明：当前市场索引脚本默认忽略 `dist/`，因此**经插件市场分发时 dist 不会进入 plugins.json**。
> 本次以本地插件目录为主要验证路径。市场分发 dist 的完善（调整索引规则或 CDN 化）作为后续项。

## 运行时依赖

- `@woven-canvas/vue` — 无限画布 Vue 组件
- `vue` — 仅 dist SPA 运行时使用（主窗口已自带，dist 内独立打包）
