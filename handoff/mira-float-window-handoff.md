# Handoff：mira-client 浮动窗口 Vite 多页入口迁移

日期：2026-08-14
仓库：`D:\mira_typescript`（pnpm monorepo，`packages/mira-client` 为 Electron + Vue 3 + Vite 应用）

## 当前状态（已完成）

三个浮动窗口（通知 / 全局搜索 / 悬浮球）已从「纯 HTML + dist-float 扁平拷贝 + loadFile」整体迁移为
**渲染器应用的 Vite 多页入口（MPA）+ Vue SFC**，dist-float 体系已废弃删除。

### 迁移后架构

- 主进程 `FloatingWindowHandler`（`src/main/ipc/FloatingWindowHandler.ts`）通过必填的
  `rendererEntry` 选项加载页面：开发态 `VITE_DEV_SERVER_URL/<entry>`，生产态 `dist-renderer/<entry>`。
  旧的 `htmlFileName`/`htmlDirName` 与 dist-float 分支已删除。
- 三个使用方均已在构造时传 `rendererEntry`：
  - `NotificationWindowHandlers.ts` → `notification-window.html`（vue-sonner 实现，含鼠标穿透 set-mouse-events 逻辑）
  - `SearchWindowHandlers.ts` → `search-window.html`
  - `FloatingBallWindowHandlers.ts` → `floating-ball-window.html`
- 通信桥共享模块：`src/floating-window/bridge.ts`（`createFloatingWindowBridge`，MessagePort 经各窗口
  preload 转发的 `connect` DOM 消息建立；统一处理 theme-update；提供 send/requestDrag/requestClose/toggleDevtools）。
  三个窗口入口共用，各 preload（`src/preload/*-preload.js`）保持不变。
- 每个窗口一个根目录入口 HTML + `src/<window-name>/main.ts` 轻量入口（不初始化主应用的
  pinia/router/i18n/插件系统，仅引入 `renderer/assets/main.css` 与自身样式）。

### 关键文件

| 窗口 | 入口 HTML | 渲染层 | 说明 |
|---|---|---|---|
| 通知 | `packages/mira-client/notification-window.html` | `src/notification-window/`（NotificationWindowApp.vue + NotificationCard.vue） | vue-sonner Toaster，toast.custom 渲染卡片，高度测量回传 measure-ready |
| 搜索 | `packages/mira-client/search-window.html` | `src/search-window/`（SearchWindowApp.vue） | shadcn-vue Command 组件族 + Tabs/Badge/Skeleton/Empty，见下 |
| 悬浮球 | `packages/mira-client/floating-ball-window.html` | `src/floating-ball-window/`（FloatingBallApp.vue） | 保留文件夹 CSS 动画、nt-drag-* 自定义拖拽、文件拖放（getPathForFile） |

- `vite.config.ts` 的 `build.rollupOptions.input` 注册了 4 个入口（main + 3 窗口）。
- 已删除：`scripts/build-float.js`、`package.json` 的 `build:float` 脚本、`electron-builder.json` 的
  `dist-float` 打包项、`src/floating-window/floating-window-core.js` 与 `vendor/vue.global.prod.js`、
  各窗口旧 html/js 及过时测试。

### shadcn-vue 组件（本次新增）

- `src/components/ui/command/`：从官方 v4 registry（reka-ui Listbox 原语）拉取，做了适配：
  - `CommandDialog.vue` 的 registry 内部 import 已改为 `@/components/ui/dialog`；
  - `Command.vue` 新增 `shouldFilter` prop：服务端搜索（拼音）场景传 `:should-filter="false"`
    禁用客户端文本过滤，同时保留 CommandEmpty 判定（含 allItems 数量联动 watch）。
- `src/components/ui/skeleton/`：官方骨架屏组件。
- 项目组件体系：new-york 风格 + reka-ui + Tailwind v4 + lucide 图标，`components.json` 已配置。

## IPC 消息协议（未变更，供参考）

- 搜索窗口：`search-request` / `open-item` / `drag-file` → 主进程；`search-results` / `search-error` ← 主进程。
- 通知窗口：`click` / `action` / `dismiss-item` / `measure-ready` / `hover-pause|resume` / `set-mouse-events` → 主进程；
  `notification-content` / `notification-auto-hide` ← 主进程。
- 悬浮球：`fb-click` / `fb-context-menu` / `fb-file-drop` / `nt-drag-*` → 主进程；`fb-drop-accepted` ← 主进程。

## 验证方式

- 类型检查：`pnpm -C packages/mira-client type-check`（存在 3 处与本次无关的存量错误：DownloadService/TrayService/ServerEditDialog）
- 构建：`pnpm -C packages/mira-client build`（4 入口均产出，窗口入口为轻量 chunk）
- 运行：dev 由 procm 托管（进程名 `electron:dev`），dev server 端口 3000；
  窗口页面可直接探测 `http://localhost:3000/<window-name>.html`
- 手动验收入口：通知 = 设置 → Playground → 通知；搜索 = Ctrl+K；悬浮球 = 设置开启

## Suggested skills

- `procm-mcp`：重启/查看 `electron:dev`（IrWYTFuW）与 mira-app-server-dev 进程及日志
- `planning-with-files`：如需继续多步改造（如剩余窗口特性迭代），维护 task_plan.md/progress.md
- `find-skills`：需要其他工作流技能时检索

## 环境备注

- Windows + Git Bash；终端乱码时用 PowerShell 7；路径始终加双引号
- 仓库根 `AGENTS.md` 的工程师规则适用（最小改动优先、输出格式等）
- git 工作区尚有未提交改动（含 `packages/mira-client` 本迁移全部文件）
