# 文件清单

## 主进程 (src/main/)

| 文件 | 说明 |
|------|------|
| `main.ts` | 应用入口，MiraApplication 类 (~595 行) |
| **handlers/** | |
| `handlers/DragDropHandler.ts` | 拖拽文件处理 |
| `handlers/PluginHandler.ts` | 插件系统处理 |
| **ipc/** | |
| `ipc/handlers.ts` | IPC 处理器注册中心 |
| `ipc/AppHandlers.ts` | 应用级操作 |
| `ipc/AutoUpdateHandlers.ts` | 自动更新处理 |
| `ipc/FileSystemHandlers.ts` | 文件系统 |
| `ipc/MenuHandlers.ts` | 菜单处理 |
| `ipc/NotificationHandlers.ts` | 通知处理 |
| `ipc/ProtocolHandlers.ts` | 协议处理 |
| `ipc/SearchWindowHandlers.ts` | 搜索窗口 |
| `ipc/ShortcutHandlers.ts` | 快捷键 |
| `ipc/SystemHandlers.ts` | 系统信息 |
| `ipc/TrayHandlers.ts` | 托盘处理 |
| `ipc/ipc-bindings.ts` | IPC 绑定 |
| **services/** | |
| `services/MiraService.ts` | 后端 SDK 通信 |
| `services/PluginDiscoveryService.ts` | 插件发现 |
| `services/ProtocolService.ts` | mira:// 协议 |
| `services/TrayService.ts` | 系统托盘 |
| `services/useAutoUpdater.ts` | 自动更新 |
| **utils/** | |
| `utils/Logger.ts` | 日志工具 |
| `utils/extIcons.ts` | 文件扩展名图标 |

## 预加载 (src/preload/)

| 文件 | 说明 |
|------|------|
| `preload.ts` | contextBridge 暴露 API |

## 渲染进程 (src/renderer/)

| 目录 | 说明 |
|------|------|
| `stores/` (11 个) | Pinia 状态管理 |
| `views/` (7 个视图) | 页面级组件 |
| `components/` | UI 组件 (layout, common, preview, search, tabs) |
| `composables/` | 组合式 API (Tab 系统, 通用 hooks) |
| `api/` | API 接口封装 |
| `services/` | 业务服务 |
| `controllers/` | 控制器 |
| `modules/` | 功能模块 |
| `plugins/` | 插件系统 |
| `router/` | 路由 |
| `config/` | 配置 |
| `types/` | 类型定义 |
| `utils/` | 工具函数 |

## 共享 (src/shared/)

| 文件 | 说明 |
|------|------|
| `types.ts` | 跨进程共享类型 |

## UI 组件库

| 路径 | 说明 |
|------|------|
| `src/components/ui/` | shadcn/ui 组件 (~214 个 Vue 文件) |
| `src/components/ui/volt/` | 自定义 Volt 组件 (~58 个 Vue 文件) |
