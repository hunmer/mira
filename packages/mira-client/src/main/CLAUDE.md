# src/main - 主进程模块

[根目录](../../CLAUDE.md) > **src/main**

> 导航: [Renderer 模块](../renderer/CLAUDE.md) | [Preload 模块](../preload/CLAUDE.md) | [Shared 模块](../shared/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充入口分析、IPC 通道清单、服务接口梳理 |

## 模块职责

主进程模块负责 Electron 应用的生命周期管理、系统集成和后端服务。通过 `MiraApplication` 单例类管理窗口、IPC 和系统服务。

## 入口与启动

- **入口文件**: `main.ts` (533 行) -- `MiraApplication` 类
- **启动流程**: 
  1. 单实例锁定 (`app.requestSingleInstanceLock`)
  2. 创建 `BrowserWindow`（使用 `electron-window-state` 持久化窗口状态）
  3. 注册自定义协议 `mira://`
  4. 初始化 `IPCHandlers`
  5. 初始化 `TrayService`
  6. 加载 `index.html`

## 目录结构

```
src/main/
├── main.ts                   # 应用入口 (533 行)
├── handlers/                 # 高级处理器
│   ├── DragDropHandler.ts   # 拖拽文件处理 (562 行)
│   ├── PluginHandler.ts     # 插件系统处理 (608 行)
│   └── PluginHandler.new.ts # 新版插件处理（空实现）
├── ipc/                      # IPC 通信模块
│   ├── handlers.ts          # 处理器注册中心 (198 行)
│   ├── AppHandlers.ts       # 应用级操作 (134 行)
│   ├── FileSystemHandlers.ts # 文件系统 (201 行)
│   ├── MenuHandlers.ts      # 菜单处理 (289 行)
│   ├── ProtocolHandlers.ts  # 协议处理 (84 行)
│   ├── SearchWindowHandlers.ts # 搜索窗口 (485 行)
│   ├── ShortcutHandlers.ts  # 快捷键处理 (231 行)
│   ├── SystemHandlers.ts    # 系统信息 (101 行)
│   ├── TrayHandlers.ts      # 托盘处理 (97 行)
│   ├── HotUpdateHandlers.ts # 热更新 (319 行)
│   └── ipc-bindings.ts      # IPC 绑定（空）
├── services/                # 系统服务
│   ├── MiraService.ts       # 后端 SDK 通信 (366 行)
│   ├── ProtocolService.ts   # mira:// 协议 (279 行)
│   ├── TrayService.ts       # 系统托盘 (321 行)
│   └── PluginDiscoveryService.ts # 插件发现（空）
└── utils/
    └── Logger.ts            # 日志工具 (55 行)
```

## 对外接口

### IPC 通道清单

| 通道前缀 | 描述 |
|----------|------|
| `protocol:*` | 协议注册/注销/查询 |
| `tray:*` | 托盘设置/闪烁/提示 |
| `search-window:*` | 搜索窗口显示/隐藏/切换 |
| `shortcut:*` | 快捷键注册/注销 |
| `plugin:*` | 插件发现/安装/执行/卸载 |
| `drag-drop:*` | 拖拽启动 |
| `fs:*` | 文件系统读写/目录选择 |
| `hot-update:*` | 热更新获取/启动 |
| `app:*` | 应用信息/版本/路径 |
| `window:*` | 窗口操作（关闭/最小化/最大化） |
| `system:*` | 系统信息/剪贴板 |
| `menu:*` | 菜单事件 |
| `dev:*` | 开发者工具 |

### 自定义协议

```
mira://<action>?<params>
```

内置处理器: `server_import` -- 快速导入服务器配置（Base64 JSON）

## 关键依赖与配置

- `electron-window-state`: 窗口状态持久化
- `electron-log`: 日志记录
- `mira-server-sdk`: 后端 SDK 通信

## 数据模型

无独立数据模型，所有数据通过 `src/shared/types.ts` 共享。

## 测试与质量

- 无独立测试文件
- 类型检查通过根级 `tsconfig.json` 配置

## 常见问题 (FAQ)

**Q: 如何新增 IPC 通道?**
A: 在 `ipc/` 目录创建新的 Handler 文件，实现 `registerHandlers()` 方法，然后在 `handlers.ts` 中注册。

**Q: 如何新增自定义协议处理器?**
A: 在 `ProtocolService.ts` 中调用 `registerHandler(type, handler)` 注册。

## 相关文件清单

- [IPC 模块](./ipc/CLAUDE.md)
- [Handlers 模块](./handlers/CLAUDE.md)
- [Services 模块](./services/CLAUDE.md)
