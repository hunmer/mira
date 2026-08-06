# 自由白板 (mira-whiteboard)

基于 [`@woven-canvas/vue`](https://www.npmjs.com/package/@woven-canvas/vue) 的自由无限画板插件。

## 功能

- 在 Mira 主窗口右侧栏顶部提供「自由画板」入口（插件图标列表）。
- **点击图标 → 打开单个组合窗口**：左侧工程列表 + 右侧画布，同窗口内完成所有操作。
- 工程管理：新建 / 重命名 / 删除（左侧栏）。
- 画布切换：左侧栏点击工程，或菜单【项目】子菜单点击工程 → 右侧画布切换（每个工程内容按 `projectId` 隔离在 IndexedDB）。
- **自定义 Electron 菜单栏**：【项目】子菜单列出所有工程（当前项打勾，点击切换）+ 新建工程；【视图】/【窗口】为标准项。不再继承 Mira 主窗口的全局菜单。
- 画布支持平移 / 缩放 / 形状 / 文本 / 图片 / 手绘 / 箭头等。
- 本地优先持久化：每个工程的画布内容按 `projectId` 存储在浏览器 IndexedDB，离线可用、刷新不丢。

## 架构（单组合窗口）

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
                ┌──────────────────────▼───────────────────────────────┐
                │  自由画板组合窗口（dist/index.html，Vue SPA）          │
                │  ┌─────────────┬──────────────────────────────────┐  │
                │  │ 左侧工程列表 │ 右侧画布 <WovenCanvas>            │  │
                │  │ localStorage │ :key=projectId → 切 IndexedDB     │  │
                │  │ 新建/改名/删  │ store.persistence.documentId      │  │
                │  └─────────────┴──────────────────────────────────┘  │
                │  菜单：electronAPI.pluginWindow.setMenu(template)     │
                │       onMenuAction(({action, projectId}) => ...)      │
                └──────────────────────────────────────────────────────┘
```

关键点：
- **单窗口**承载列表 + 画布，不再有「管理窗口 → 画布窗口」两级弹窗。
- **画布切换**靠 `<WovenCanvas :key="currentProjectId">` 强制重挂（documentId 在组件构造时一次性读取，非响应式），换 key 即换 IndexedDB。
- **窗口自定义菜单**：插件窗口默认继承全局 `Menu.setApplicationMenu`（其点击转发到主窗口），本插件通过新增的 `plugin-window:set-menu` IPC 用 `win.setMenu` 替换成自己的菜单栏，点击经主进程转发回窗口（`plugin-window:menu-action`）。
  - ⚠️ `win.setMenu` 只在 **Windows / Linux** 生效；macOS 仍走全局菜单（Electron 限制）。本应用主平台为 win32。

## 目录结构

```
mira-whiteboard/
├── plugin.json        # 插件元数据
├── index.js           # 宿主侧脚本：注册 window 行为贡献（点击开窗）
├── README.md
├── HANDOFF.md
├── package.json       # dist SPA 依赖与构建脚本
├── vite.config.ts     # 单页构建（index.html）
├── index.html         # 自由画板组合窗口入口
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── main.ts    # createApp(组合窗口 App)
│   │   └── App.vue    # 左侧工程列表 + 右侧画布 + 自定义菜单
│   ├── shared/
│   │   └── loadMaterialIcons.ts   # 本地 Material Icons 字体注入
│   ├── assets/fonts/material-icons.woff2
│   └── shims-vue.d.ts
└── dist/              # 构建产物（需执行 pnpm install && pnpm build 生成）
```

## 构建 dist（必须，否则无法打开窗口）

窗口加载的是 `dist/index.html`，因此**首次使用前必须在插件目录构建一次**：

```bash
cd online_client_plugins/plugins/mira-whiteboard
pnpm install --ignore-workspace   # 本插件在 monorepo 外，需忽略 workspace
pnpm build
# 生成 dist/（含 index.html + assets）
```

## 安装到 Mira（本地验证）

构建出 `dist/` 后，把整个 `mira-whiteboard/` 目录（含 `dist/`）放入用户插件目录
（应用设置 → 插件 → 插件目录），重启或重新发现插件，在插件管理中**启用**本插件，
右侧栏即出现「自由画板」入口，点击即弹出组合窗口。

## 运行时依赖

- `@woven-canvas/vue` — 无限画布 Vue 组件
- `vue` — dist SPA 运行时（与主窗口隔离，独立打包）

## 宿主侧依赖（插件能跑起来的前提）

本插件依赖宿主（`packages/mira-client`）提供的机制：

1. **插件贡献系统（`behavior:'window'` 模式）** —— 右侧栏入口，点击开窗。
   - 类型：`renderer/plugins/types.ts` 的 `PluginContribution`。
2. **插件窗口机制（主进程）** —— `PluginWindowHandlers.ts` 创建带 frame 的 BrowserWindow，
   加载插件 dist；preload 为 `plugin-window-preload.js`（最小白名单 API）。
3. **窗口自定义菜单（主进程）** —— 新增 `plugin-window:open` 配套的
   `plugin-window:set-menu` IPC，渲染进程传模板，主进程按 `action` 字段挂 click 并
   通过 `plugin-window:menu-action` 转发回发起窗口。
