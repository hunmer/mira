# mira-client 模块职责

## 一级目录(src/)

| 目录 | 职责 |
|------|------|
| `main/` | Electron 主进程:应用生命周期、窗口、IPC、协议、托盘、自动更新 |
| `preload/` | 预加载脚本:contextBridge 安全 API |
| `renderer/` | 渲染进程:Vue 3 SPA 主界面 |
| `floating-window/` | 浮动窗口(含 vendor 第三方) |
| `notification-window/` | 系统通知窗口 |
| `search-window/` | 全局搜索窗口 |
| `components/ui/` | shadcn-vue 基础组件库(34 目录) |
| `lib/` | 通用工具(`cn()` 等) |
| `shared/` `types/` | 跨进程共享类型 |

## 主进程(src/main/)

| 子目录 | 职责 |
|--------|------|
| `handlers/` | DragDropHandler(拖拽)、PluginHandler(插件) |
| `ipc/` | IPC 处理器注册中心 + 13 个 Handler(App/AutoUpdate/FileSystem/FloatingWindow/Menu/Notification/NotificationWindow/Protocol/SearchWindow/Shortcut/System/Tray) |
| `services/` | MiraService(后端 SDK 通信)、PluginDiscoveryService、ProtocolService(`mira://`)、TrayService、useAutoUpdater |
| `utils/` | Logger、extIcons(扩展名图标) |
| `main.ts` | 应用入口,MiraApplication 类(~595 行) |

## 渲染进程(src/renderer/)

| 子目录 | 职责 |
|--------|------|
| `stores/` | 11 个 Pinia Store |
| `views/` | 7 个页面视图(HomeView 含子目录、Settings、Login、FileUpload、FilePreview、NotFound、MenuTest) |
| `components/` | 应用级组件:`business/` `common/` `layout/` `preview/` `search/` `tabs/` + 顶层 Aurora/FileUpload/GlobalLoading/RegisterDialog |
| `composables/` | 组合式 API(Tab 系统、通用 hooks) |
| `api/` | API 接口封装 |
| `services/` | 业务服务 |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 客户端插件系统 |
| `router/` | 路由 |
| `config/` | 配置 |
| `assets/` | 静态资源(含 `main.css` 主题入口、scss 变量) |
| `types/` `utils/` | 类型与工具 |

## UI 组件库(src/components/ui/)

shadcn-vue 基础组件,样式基线 new-york-v4。34 个组件目录:alert、alert-dialog、avatar、badge、button、calendar、card、checkbox、context-menu、date-picker(本地组合 Input+Popover+Calendar)、dialog、dropdown-menu、empty、hover-card、input、label、masonry(自定义扩展)、native-select、popover、progress、radio-group、resizable、select、separator、sheet、slider、sonner(Toaster)、stepper、switch、table、tabs、textarea、toggle、toggle-group、tooltip。

详见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。

## 子模块文档

主进程 / 预加载 / 渲染 / 共享 / UI 各有独立 CLAUDE.md:
- [src/main/CLAUDE.md](../src/main/CLAUDE.md)
- [src/preload/CLAUDE.md](../src/preload/CLAUDE.md)
- [src/renderer/CLAUDE.md](../src/renderer/CLAUDE.md)
- [src/shared/CLAUDE.md](../src/shared/CLAUDE.md)
- [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)
