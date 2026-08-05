# 子模块职责

按 src 顶层目录划分。

## src/（顶层）

核心公共层，承担类型定义与基础工具。

- **index.ts** — 包主入口。导出 User / Session / WebSocketMessage 类型、EventManager、saveLibraries / getLibraries，并 re-export event-manager 的全部类型。
- **event-manager.ts** — 事件系统。定义 `EventArgs`（事件参数基类，含 eventName / whenOccurred / args）、`EventSubscription`（订阅句柄，含 priority 与 isActive）、`EventManager`（基于 Node EventEmitter，支持优先级、subscribeOnce、broadcast 返回 Promise<boolean>、dispose）。
- **LibraryList.ts** — 库列表工具。读写 `librarys.json` 配置文件（saveLibraries / getLibraries）。

## src/storage/sqlite/

SQLite 持久化层。

- **index.ts** — 存储层入口，导出 ILibraryServerData 接口与 LibraryServerDataSQLite 实现。
- **ILibraryServerData.ts** — 存储接口契约（文件/文件夹/标签 CRUD + 统计 + 导入）。
- **LibraryServerDataSQLite.ts** — SQLite 主实现，组合 mixins 提供完整能力。
- **mixins/** — 按职责拆分的实现片段：
  - FileOperations.ts（文件 CRUD）
  - FileImport.ts（文件批量导入）
  - FolderOperations.ts（文件夹操作）
  - TagOperations.ts（标签操作）
  - Statistics.ts（统计数据）
  - types.ts（mixin 类型定义）

## src/shared/sdk/

面向 Mira App Server 的 TypeScript SDK 客户端。

- **index.ts** — SDK 入口，导出 MiraClient、WebSocketClient、10 个 Module 类，以及 types.ts 全部类型。
- **types.ts** — SDK 类型定义（WebSocketOptions / WebSocketMessage / WebSocketEventCallback 等）。
- **client/MiraClient.ts** — 主客户端，链式 API（auth/user/libraries/plugins/files/database/devices/system/tags/folders）。
- **client/HttpClient.ts** — HTTP 通道（axios）。
- **client/WebSocketClient.ts** — WebSocket 通道（ws）。
- **utils/EventEmitter.ts** — SDK 内部事件发射器。
- **modules/** — 10 个领域模块：AuthModule、UserModule、LibraryModule、PluginModule、FileModule、DatabaseModule、DeviceModule、SystemModule、TagModule、FolderModule。
