# mira-client 模块职责

## 一级目录(src/)

| 目录 | 职责 |
|------|------|
| `main/` | Electron 主进程:应用生命周期、窗口、IPC、协议、托盘、自动更新、主进程 i18n |
| `preload/` | 预加载脚本:contextBridge 安全 API |
| `renderer/` | 渲染进程:Vue 3 SPA 主界面 |
| `floating-ball-window/` | 悬浮球窗口(v2.x 新增,Vue 实现) |
| `floating-window/` | 浮动窗口残留(仅 `bridge.ts`,独立构建体系已移除) |
| `notification-window/` | 系统通知窗口 |
| `search-window/` | 全局搜索窗口 |
| `components/ui/` | shadcn-vue 基础组件库(52 目录) |
| `lib/` | 通用工具(`cn()` 等) |
| `shared/` `types/` | 跨进程共享类型 |

## 主进程(src/main/)

| 子目录 | 职责 |
|--------|------|
| `handlers/` | DragDropHandler(拖拽)、PluginHandler(插件) |
| `i18n/` | 主进程轻量 i18n 字典(托盘菜单文案,经 `tray:set-locale` 与渲染进程同步) |
| `ipc/` | IPC 处理器注册中心 + 18 个 Handler(App/AutoUpdate/FileSystem/FloatingBallWindow/FloatingWindow/LoginWindow/Menu/Network/Notification/NotificationWindow/PluginWindow/Protocol/SearchWindow/ServerControl/ServerDeploy/Shortcut/System/Tray) |
| `services/` | MiraService(后端 SDK 通信)、MainWindowService(主窗口管理)、LocalServerService(内置服务端)、DownloadService(含单测)、PluginDiscoveryService、ProtocolService(`mira://`)、ProcmService、TrayService、useAutoUpdater |
| `utils/` | Logger、extIcons、consoleHook、windowStateKeeper |
| `main.ts` | 应用入口,MiraApplication 类(323 行,职责已拆入 services) |

## 渲染进程(src/renderer/)

| 子目录 | 职责 |
|------|------|
| `stores/` | 15 个 Pinia Store |
| `views/` | 8 个页面视图(HomeView 含子目录、Settings、Login、FileUpload、FilePreview、Playground、MenuTest、NotFound;settings/ 子面板含 playground/ 演练场) |
| `components/` | 应用级组件:`business/` `common/` `layout/` `preview/` `search/` `tabs/` + 顶层 Aurora/FileUpload/GlobalLoading/RegisterDialog/ServerStartupLoading |
| `composables/` | 组合式 API(Tab 系统、通用 hooks) |
| `api/` | API 接口封装 |
| `services/` | 业务服务 |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 客户端插件系统 |
| `procm-ui-tests/` | 真实页面 UI 测试注册表(约 30 用例,仅开发构建经 `window.__procmUiTests` 暴露) |
| `i18n/` | vue-i18n 配置与 zh-CN/en-US 词条 |
| `router/` | 路由 |
| `config/` | 配置 |
| `assets/` | 静态资源(仅 `main.css` 主题入口 + logo;scss 已删) |
| `types/` `utils/` | 类型与工具 |

## UI 组件库(src/components/ui/)

shadcn-vue 基础组件,样式基线 new-york-v4。52 个组件目录:alert、alert-dialog、avatar、badge、button、calendar、card、carousel、chapter-scrubber、checkbox、collapsible、color-picker、color-slider、color-swatch、command、context-menu、date-picker(本地组合 Input+Popover+Calendar)、dialog、dropdown-menu、empty、expandable-gallery、file-card、file-icon、file-system、folder、form、glowing-button、glowing-shadow、hover-card、input、input-group、label、native-select、notification-list、popover、progress、radio-group、resizable、select、separator、sheet、skeleton、slider、sonner(Toaster)、stepper、switch、table、tabs、textarea、toggle、toggle-group、tooltip。

其中 v2.x 在 34 个基线上新增:carousel、chapter-scrubber、collapsible、color-picker、color-slider、color-swatch、command、expandable-gallery、file-card、file-icon、file-system、folder、form、glowing-button、glowing-shadow、input-group、notification-list、skeleton(18 个,多为业务化/复合组件)。

详见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。

## 子模块文档

主进程 / 预加载 / 渲染 / 共享 / UI 各有独立 CLAUDE.md:
- [src/main/CLAUDE.md](../src/main/CLAUDE.md)
- [src/preload/CLAUDE.md](../src/preload/CLAUDE.md)
- [src/renderer/CLAUDE.md](../src/renderer/CLAUDE.md)
- [src/shared/CLAUDE.md](../src/shared/CLAUDE.md)
- [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)
