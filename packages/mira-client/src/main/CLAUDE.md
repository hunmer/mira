# src/main - 主进程模块

[根目录](../../CLAUDE.md) > **src/main**

> 导航: [Renderer 模块](../renderer/CLAUDE.md) | [Preload 模块](../preload/CLAUDE.md) | [Shared 模块](../shared/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | main.ts 533→323 行(窗口管理拆入 MainWindowService);IPC Handler 13→18(新增 FloatingBallWindow/LoginWindow/Network/PluginWindow/ServerControl/ServerDeploy,删 HotUpdate);services 新增 MainWindowService/LocalServerService/ProcmService/DownloadService(含单测);新增 i18n/ 目录 |
| 2026-05-12 | 架构扫描更新 | 补充入口分析、IPC 通道清单、服务接口梳理 |

## 模块职责

主进程模块负责 Electron 应用的生命周期管理、系统集成和后端服务。通过 `MiraApplication` 单例类管理窗口、IPC 和系统服务。

## 入口与启动

- **入口文件**: `main.ts` (323 行) -- `MiraApplication` 类(窗口管理已拆入 `services/MainWindowService.ts`)
- **启动流程**: 
  1. 单实例锁定 (`app.requestSingleInstanceLock`)
  2. 创建 `BrowserWindow`（MainWindowService,使用 `electron-window-state` 持久化窗口状态）
  3. 注册自定义协议 `mira://`
  4. 初始化 `IPCHandlers`
  5. 初始化 `TrayService`
  6. 加载 `index.html`

## 目录结构

```
src/main/
├── main.ts                   # 应用入口 (323 行)
├── handlers/                 # 高级处理器
│   ├── DragDropHandler.ts   # 拖拽文件处理 (450 行)
│   └── PluginHandler.ts     # 插件系统处理 (942 行)
├── i18n/                     # 主进程轻量 i18n(托盘菜单文案,zh-CN/en-US,经 tray:set-locale 同步)
├── ipc/                      # IPC 通信模块
│   ├── handlers.ts          # 处理器注册中心 (291 行)
│   ├── *Handlers.ts         # 18 个 Handler:App / AutoUpdate / FileSystem / FloatingBallWindow / FloatingWindow / LoginWindow / Menu / Network / Notification / NotificationWindow / PluginWindow / Protocol / SearchWindow / ServerControl / ServerDeploy / Shortcut / System / Tray
│   └── ipc-bindings.ts      # IPC 绑定
├── services/                # 系统服务
│   ├── MiraService.ts       # 后端 SDK 通信 (364 行)
│   ├── MainWindowService.ts # 主窗口管理 (275 行,拆自 main.ts)
│   ├── LocalServerService.ts # 内置 mira 服务端管理
│   ├── DownloadService.ts   # 下载服务(含 DownloadService.test.ts 单测)
│   ├── ProtocolService.ts   # mira:// 协议
│   ├── ProcmService.ts      # procm 集成(UI 远程测试/进程管理)
│   ├── TrayService.ts       # 系统托盘
│   ├── PluginDiscoveryService.ts # 插件发现
│   └── useAutoUpdater.ts    # 自动更新
└── utils/
    ├── Logger.ts            # 日志
    ├── extIcons.ts          # 扩展名图标(public/icons)
    ├── consoleHook.ts       # 控制台拦截
    └── windowStateKeeper.ts # 窗口状态
```

## 对外接口

### IPC 通道清单(以 preload 实际暴露为准)

| 通道前缀 | 描述 |
|----------|------|
| `protocol:*` | 协议注册/注销/查询 |
| `tray:*` | 托盘设置/闪烁/提示/语言 |
| `search-window:*` | 搜索窗口显示/隐藏/切换 |
| `floating-ball:*` | 悬浮球窗口(v2.x 新增) |
| `shortcut:*` | 快捷键注册/注销 |
| `plugin:*` / `plugin-window:*` | 插件发现/安装/执行/卸载、插件窗口 |
| `drag-drop:*` | 拖拽启动 |
| `fs:*` | 文件系统读写/目录选择 |
| `app:*` | 应用信息/版本/路径 |
| `network:*` | 网络状态(v2.x 新增) |
| `server-control:*` / `server-deploy:*` / `server-autostart:*` | 内置服务端控制/部署/自启动(v2.x 新增) |
| `library-cache:*` | 渲染层库缓存 |
| `notification:*` | 通知 |
| `update:*` / `updater:*` | 自动更新 |

(原 `hot-update:*`、`window:*`、`system:*`、`menu:*`、`auto-update:*` 前缀已不在 preload 暴露清单中)

### 自定义协议

```
mira://<action>?<params>
```

内置处理器: `server_import` -- 快速导入服务器配置（Base64 JSON）

## 关键依赖与配置

- `electron-window-state`: 窗口状态持久化
- `electron-log`: 日志记录
- `mira-app-core`: 后端 SDK 通信

## 数据模型

无独立数据模型，所有数据通过 `src/shared/types.ts` 共享。

## 测试与质量

- `services/DownloadService.test.ts`:主进程唯一单测
- 渲染侧远程 UI 测试经 `ProcmService`/procm-mcp 配合(见 renderer/procm-ui-tests)
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
