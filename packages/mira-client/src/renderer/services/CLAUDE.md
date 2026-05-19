# src/renderer/services - 业务服务层

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **services**

> 导航: [搜索子服务](./search/CLAUDE.md)

## 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 新建文档 | 首次创建，记录全部 11 个服务模块 |

## 模块职责

渲染进程的业务服务层，封装 SDK 通信、插件管理、搜索、快捷键、WebSocket 等核心业务逻辑。所有服务均为单例模式。

## 服务清单

### 核心 SDK 服务

| 服务 | 文件 | 行数 | 单例导出 | 描述 |
|------|------|------|----------|------|
| **MiraSDKService** | `MiraSDKService.ts` | 891 | `miraSDKService` | mira-server-sdk 封装，连接/认证/文件/文件夹/标签/系统信息 |
| **MiraService** | `MiraService.ts` | 268 | `MiraService.getInstance()` | 轻量 HTTP 客户端（fetch 直连），Web 环境备用方案 |
| **ElectronService** | `ElectronService.ts` | 256 | `electronService` | Electron IPC 封装：剪切板/文件对话框/窗口管理/应用控制 |
| **AppService** | `index.ts` | 282 | `appService` | 统一门面，聚合 MiraSDKService + ElectronService |

### 初始化与插件

| 服务 | 文件 | 行数 | 单例导出 | 描述 |
|------|------|------|----------|------|
| **InitializationService** | `InitializationService.ts` | 511 | `initializationService` | 应用启动流程：插件初始化 -> 连接服务器 -> 认证 -> 加载数据 |
| **PluginService** | `PluginService.ts` | 534 | `pluginService` | 本地 + 在线插件管理（安装/卸载/上下文创建） |
| **GlobalPluginManager** | `GlobalPluginManager.ts` | 244 | `globalPluginManager` | 应用级插件生命周期：初始化/启用全部/设置监听 |
| **PluginSystemCore** | `PluginSystemCore.ts` | 131 | `pluginSystem` | 插件实例工厂注册表，挂载到 `window.pluginSystem` |

### 搜索与交互

| 服务 | 文件 | 行数 | 单例导出 | 描述 |
|------|------|------|----------|------|
| **SearchHandlers** | `SearchHandlers.ts` | 599 | `SearchHandlers.getInstance()` | 全局搜索：文件/标签/文件夹搜索 + 搜索窗口 IPC 通信 |
| **ShortcutService** | `ShortcutService.ts` | 612 | `shortcutService` | 快捷键管理：动作注册/绑定/全局快捷键/用户自定义持久化 |

### 系统 UI

| 服务 | 文件 | 行数 | 单例导出 | 描述 |
|------|------|------|----------|------|
| **WebSocketService** | `WebSocketService.ts` | 296 | `webSocketService` | WebSocket 连接/重连/事件分发（文件/文件夹/标签实时通知） |
| **MenuService** | `MenuService.ts` | 422 | `menuService` | Electron 菜单管理：文件/编辑/视图/导航/窗口/帮助 |

## 服务依赖关系

```
AppService (门面)
  ├── MiraSDKService ── mira-server-sdk
  │     └── WebSocketService (实时通知)
  └── ElectronService ── window.electronAPI (IPC)

InitializationService
  ├── GlobalPluginManager
  │     └── PluginService
  │           └── PluginSystemCore
  └── MiraSDKService

SearchHandlers
  ├── MiraSDKService (文件搜索)
  ├── FolderStore (文件夹搜索)
  └── TagStore (标签搜索)

ShortcutService
  └── ElectronService (全局快捷键 IPC)
```

## MiraSDKService API 分类

| 分类 | 方法 |
|------|------|
| 连接 | `connect()`, `disconnect()`, `testConnection()`, `isClientConnected()` |
| WebSocket | `initializeWebSocket()`, `disconnectWebSocket()`, `isWebSocketConnected` |
| 认证 | `login()`, `register()`, `logout()`, `getCurrentUser()` |
| 文件 | `listFiles()`, `getFile()`, `uploadFile()`, `downloadFile()`, `deleteFile()` |
| 文件夹 | `getAllFolders()`, `createFolder()`, `updateFolder()`, `deleteFolder()`, `moveFolder()`, `cloneFolder()` |
| 标签 | `createTag()`, `deleteTag()` |
| 库 | `getLibraries()`, `createLibrary()` |
| 系统 | `getSystemInfo()`, `getSystemHealth()`, `getConnectionConfig()` |

## ConfigStorage 依赖

`PluginService` / `ShortcutService` 使用 `ConfigStorage`（utils/）做持久化存储。

## 测试与质量

无独立测试。
