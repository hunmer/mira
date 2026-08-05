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
├── scripts/                       # build-float.js / start-electron.js / build-production.js
└── src/
```

## src/ 主进程(main/)

| 文件 | 说明 |
|------|------|
| `main/main.ts` | 应用入口,MiraApplication 类(~595 行) |
| `main/handlers/DragDropHandler.ts` | 拖拽处理 |
| `main/handlers/PluginHandler.ts` | 插件处理 |
| `main/ipc/handlers.ts` | IPC 注册中心 |
| `main/ipc/AppHandlers.ts` | 应用级 |
| `main/ipc/AutoUpdateHandlers.ts` | 自动更新 |
| `main/ipc/FileSystemHandlers.ts` | 文件系统 |
| `main/ipc/FloatingWindowHandler.ts` | 浮动窗口 |
| `main/ipc/MenuHandlers.ts` | 菜单 |
| `main/ipc/NotificationHandlers.ts` | 通知 |
| `main/ipc/NotificationWindowHandlers.ts` | 通知窗口 |
| `main/ipc/ProtocolHandlers.ts` | 协议 |
| `main/ipc/SearchWindowHandlers.ts` | 搜索窗口 |
| `main/ipc/ShortcutHandlers.ts` | 快捷键 |
| `main/ipc/SystemHandlers.ts` | 系统信息 |
| `main/ipc/TrayHandlers.ts` | 托盘 |
| `main/ipc/ipc-bindings.ts` | IPC 绑定 |
| `main/services/MiraService.ts` | 后端 SDK 通信 |
| `main/services/PluginDiscoveryService.ts` | 插件发现 |
| `main/services/ProtocolService.ts` | `mira://` 协议 |
| `main/services/TrayService.ts` | 系统托盘 |
| `main/services/useAutoUpdater.ts` | 自动更新 |
| `main/utils/Logger.ts` | 日志 |
| `main/utils/extIcons.ts` | 扩展名图标 |

## src/ 预加载 / 共享 / 独立窗口

| 路径 | 说明 |
|------|------|
| `preload/preload.ts` | contextBridge 暴露 API |
| `floating-window/`(含 `vendor/`) | 浮动窗口 |
| `notification-window/` | 通知窗口 |
| `search-window/` | 搜索窗口 |
| `shared/types.ts` | 跨进程共享类型 |
| `types/` | 类型定义 |
| `lib/` | 通用工具(`cn()` 等) |

## src/ 渲染进程(renderer/)

| 目录 | 说明 |
|------|------|
| `App.vue` / `main.ts` | SPA 根与挂载 |
| `stores/`(11) | Pinia 状态 |
| `views/`(7) | 页面视图 |
| `components/` | 应用级组件:`business/` `common/` `layout/` `preview/` `search/` `tabs/` + 顶层 Aurora/FileUpload/GlobalLoading/RegisterDialog |
| `composables/` | 组合式 API(Tab 系统、hooks) |
| `api/` | API 封装 |
| `services/` | 业务服务 |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 客户端插件系统 |
| `router/` | 路由 |
| `config/` | 配置 |
| `assets/` | 静态资源(`main.css` 主题入口、scss 变量) |
| `types/` `utils/` | 类型与工具 |

## UI 组件库(components/ui/)

34 个 shadcn-vue 组件目录(alert … tooltip),详见 [src/components/ui/CLAUDE.md](../src/components/ui/CLAUDE.md)。关键:`date-picker/`(本地组合 Input+Popover+Calendar)、`masonry/`(自定义扩展)、`sonner/`(导出名 Toaster)。
