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
├── *.html                         # 窗口入口:index / floating-ball-window / notification-window / search-window / screenshot-window / loader3-preview
├── docs/                          # 本模块笔记与产物:mira-client-architecture.html(1.4 万行架构图,v3.0.2 新增)+ .architecture.json + visual-check.* (html/json + 4 PNG)、ui-design-spec、reka-ui-binding-pitfalls 等
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
| `main/ipc/*Handlers.ts` | **19 个 Handler**(实例化计):App、AutoUpdate、FileSystem、FloatingBallWindow、LoginWindow、Menu、Network、Notification、NotificationWindow、PluginExec、PluginWindow、Protocol、Screenshot、SearchWindow、ServerControl、ServerDeploy、Shortcut、System、Tray;`FloatingWindowHandler.ts` 为悬浮窗基类模板(被 FloatingBallWindowHandlers extends,不独立注册);v3.0.2 新通道 `plugin-window:font-action`、`notification:set-max-visible` |
| `main/services/` | MiraService(后端 SDK 通信)、MainWindowService(主窗口,拆自 main.ts)、LocalServerService(内置服务端)、ServerControl 相关、DownloadService(含 DownloadService.test.ts 单测)、PluginDiscoveryService、ProtocolService(`mira://`)、ProcmService、TrayService、useAutoUpdater、**FontActionService**(v3.0.2:fontkit 字体激活/推送 Adobe) |
| `main/utils/` | Logger、extIcons(扩展名图标)、consoleHook、windowStateKeeper |

## src/ 预加载 / 共享 / 独立窗口

| 路径 | 说明 |
|------|------|
| `preload/preload.ts` | contextBridge 暴露 API(v3.0.2:+fs.getPathForFile) |
| `floating-ball-window/` | 悬浮球窗口(FloatingBallApp.vue + main.ts,v2.x 新增) |
| `floating-window/` | 仅剩 `bridge.ts`(vendor/ 与 floating-window-core.js 已删,独立构建体系移除) |
| `notification-window/` | 通知窗口(v3.0.2:按 __maxVisible 动态分页) |
| `search-window/` | 搜索窗口 |
| `screenshot-window/` | 截图窗口(main.ts + style.css + screenshot-window.html) |
| `shared/types.ts` | 跨进程共享类型(v3.0.2:FileInfo +recycled、ElectronAPI +getPathForFile) |
| `types/` | 类型定义 |
| `lib/` | 通用工具(`cn()` 等) |

## src/ 渲染进程(renderer/)

| 目录 | 说明 |
|------|------|
| `App.vue` / `main.ts` | SPA 根与挂载(App.vue 内含更新对话框,ReleaseNotes 渲染更新日志) |
| `stores/`(15) | Pinia 状态(settings 新增 uploadMax* 三项 + maxVisibleNotifications;auth 新增 reauthenticate) |
| `views/`(6 + settings/) | HomeView(目录)、LoginView(目录)、SettingsView.vue、FilePreviewView.vue、PlaygroundView.vue、NotFoundView.vue + settings/ 子面板(7 分区 + playground/);FileUploadView 已删(v3.0.2) |
| `components/` | 应用级组件:`business/`(FileUploadDialog/UploadQueueDialog/ReleaseNotes/DeviceShareDialog 等)`common/` `layout/` `preview/`(MediaPreviewContent:document/文本预览)`search/` `tabs/`(MediaTabListView + useFolderCollect/FolderCollectOverlay)+ 顶层 Aurora/GlobalLoading/RegisterDialog/ServerStartupLoading |
| `composables/` | 组合式 API(Tab 系统、hooks、useFolderCollect 收入文件夹动画) |
| `api/` | API 封装 |
| `services/` | 业务服务;**EventBus.ts**(v3.0.2:miraEventBus)、MiraSDKService(onUnauthorized/importLocalFilePath)、WebSocketService、PluginService(authPost/getAuthToken) |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 客户端插件系统;instanceManager.ts(v3.0.2:注册 window.pluginSystem 全局) |
| `procm-ui-tests/` | 真实页面 UI 测试注册表(约 30 用例,仅开发构建加载,v2.x 新增;test:ui:remote 脚本已删,可 node scripts/test-ui.mjs 直跑) |
| `i18n/` | vue-i18n(zh-CN/en-US locales,v2.x 新增;v3.0.2:business.json 增语义搜索/查重/上传设置 key 组) |
| `router/` | 路由(v3.0.2:/upload 路由删除) |
| `config/` | 配置 |
| `assets/` | 静态资源(仅 `main.css` 主题入口 + mira-logo.png;scss 已删) |
| `types/` `utils/` | 类型与工具;utils/localFilePath.ts(v3.0.2,含 .test.ts) |

## UI 组件库(components/ui/)

60 个 shadcn-vue 组件目录(v3.0.2:+images-badge、+pagination、+scrollbar,-chapter-scrubber),详见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。关键:`date-picker/`(本地组合 Input+Popover+Calendar)、`sonner/`(导出名 Toaster)、`file-card/`+`file-icon/`+`folder/`(业务化组件)、`color-picker/` 系列、`command/`(v2.x 回归)、`pagination/`(上传待传列表/队列分页,v3.0.2)、`scrollbar/`(scrollbar-but-cooler 移植,v3.0.2)。
