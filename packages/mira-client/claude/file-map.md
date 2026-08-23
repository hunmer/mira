# mira-client 文件地图

## 顶层(packages/mira-client/)

```
packages/mira-client/
├── CLAUDE.md                      # 模块索引(轻量)
├── claude/                        # 详情文档目录
├── components.json                # shadcn-vue 配置(style=new-york)
├── tailwind.config.js             # ⚠ 死文件(v3 遗留,未引用)
├── electron-builder.*             # 打包配置
├── vite.renderer.config.ts        # 渲染构建
├── vite.main.config.ts            # 主进程构建
├── vite.preload.config.ts         # 预加载构建
├── *.html                         # 窗口入口:index / floating-ball-window / notification-window / search-window / loader3-preview
├── public/                        # icons/(188 个图标,替代已删的 ext_icons)、ui-test-panel.html
├── scripts/                       # start-electron.js / build-production.js / mira-server-service.mjs / test-ui.mjs(procm UI 测试驱动) / after-pack.js / deploy.js / notarize.js 等
└── src/
```

## src/ 主进程(main/)

| 文件/目录 | 说明 |
|------|------|
| `main/main.ts` | 应用入口,MiraApplication 类(323 行,v2.x 从 ~595 行拆分瘦身) |
| `main/handlers/` | DragDropHandler(拖拽)、PluginHandler(插件) |
| `main/i18n/` | 主进程轻量 i18n(托盘菜单文案,zh-CN/en-US,v2.x 新增) |
| `main/ipc/handlers.ts` | IPC 注册中心 |
| `main/ipc/*Handlers.ts` | 20 个 Handler:App、AutoUpdate、FileSystem、FloatingBallWindow、FloatingWindow、LoginWindow、Menu、Network、Notification、NotificationWindow、PluginExec、PluginWindow、Protocol、Screenshot、SearchWindow、ServerControl、ServerDeploy、Shortcut、System、Tray |
| `main/services/` | MiraService(后端 SDK 通信)、MainWindowService(主窗口,拆自 main.ts)、LocalServerService(内置服务端)、ServerControl 相关、DownloadService(含 DownloadService.test.ts 单测)、PluginDiscoveryService、ProtocolService(`mira://`)、ProcmService、TrayService、useAutoUpdater |
| `main/utils/` | Logger、extIcons(扩展名图标)、consoleHook、windowStateKeeper |

## src/ 预加载 / 共享 / 独立窗口

| 路径 | 说明 |
|------|------|
| `preload/preload.ts` | contextBridge 暴露 API |
| `floating-ball-window/` | 悬浮球窗口(FloatingBallApp.vue + main.ts,v2.x 新增) |
| `floating-window/` | 仅剩 `bridge.ts`(vendor/ 与 floating-window-core.js 已删,独立构建体系移除) |
| `notification-window/` | 通知窗口 |
| `search-window/` | 搜索窗口 |
| `shared/types.ts` | 跨进程共享类型 |
| `types/` | 类型定义 |
| `lib/` | 通用工具(`cn()` 等) |

## src/ 渲染进程(renderer/)

| 目录 | 说明 |
|------|------|
| `App.vue` / `main.ts` | SPA 根与挂载 |
| `stores/`(15) | Pinia 状态 |
| `views/`(8) | 页面视图(+ settings/ 子面板、playground/ 演练场) |
| `components/` | 应用级组件:`business/` `common/` `layout/` `preview/` `search/` `tabs/` + 顶层 Aurora/FileUpload/GlobalLoading/RegisterDialog/ServerStartupLoading |
| `composables/` | 组合式 API(Tab 系统、hooks) |
| `api/` | API 封装 |
| `services/` | 业务服务 |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 客户端插件系统 |
| `procm-ui-tests/` | 真实页面 UI 测试注册表(约 30 用例,仅开发构建加载,v2.x 新增) |
| `i18n/` | vue-i18n(zh-CN/en-US locales,v2.x 新增) |
| `router/` | 路由 |
| `config/` | 配置 |
| `assets/` | 静态资源(仅 `main.css` 主题入口 + mira-logo.png;scss 已删) |
| `types/` `utils/` | 类型与工具 |

## UI 组件库(components/ui/)

53 个 shadcn-vue 组件目录(alert … tooltip,+chart),详见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。关键:`date-picker/`(本地组合 Input+Popover+Calendar)、`sonner/`(导出名 Toaster)、`file-card/`+`file-icon/`+`folder/`(业务化组件)、`color-picker/` 系列、`command/`(v2.x 回归)。
