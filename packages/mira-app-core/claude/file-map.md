# 文件清单

src/ 下共 28 个 .ts 文件（基于 find 扫描）。

## 核心层（src/）

| 文件 | 说明 |
|------|------|
| src/index.ts | 包主入口，导出核心类型 + EventManager + 库列表工具 |
| src/event-manager.ts | EventArgs / EventSubscription / EventManager（优先级、可中断） |
| src/LibraryList.ts | librarys.json 读写（saveLibraries / getLibraries） |

## 存储层（src/storage/sqlite/）

| 文件 | 说明 |
|------|------|
| src/storage/sqlite/index.ts | 存储层入口，导出接口与实现 |
| src/storage/sqlite/ILibraryServerData.ts | 存储接口契约 |
| src/storage/sqlite/LibraryServerDataSQLite.ts | SQLite 主实现（组合 mixins） |
| src/storage/sqlite/mixins/FileOperations.ts | 文件 CRUD |
| src/storage/sqlite/mixins/FileImport.ts | 文件批量导入 |
| src/storage/sqlite/mixins/FolderOperations.ts | 文件夹操作 |
| src/storage/sqlite/mixins/TagOperations.ts | 标签操作 |
| src/storage/sqlite/mixins/Statistics.ts | 统计数据 |
| src/storage/sqlite/mixins/types.ts | mixin 类型定义 |

## SDK 层（src/shared/sdk/）

| 文件 | 说明 |
|------|------|
| src/shared/sdk/index.ts | SDK 入口，导出 client/modules/types |
| src/shared/sdk/types.ts | SDK 类型（WebSocketOptions 等） |
| src/shared/sdk/client/MiraClient.ts | 主客户端（链式 API） |
| src/shared/sdk/client/HttpClient.ts | HTTP 通道（axios） |
| src/shared/sdk/client/WebSocketClient.ts | WebSocket 通道（ws） |
| src/shared/sdk/utils/EventEmitter.ts | SDK 内部事件发射器 |
| src/shared/sdk/modules/AuthModule.ts | 认证模块 |
| src/shared/sdk/modules/UserModule.ts | 用户模块 |
| src/shared/sdk/modules/LibraryModule.ts | 素材库模块 |
| src/shared/sdk/modules/PluginModule.ts | 插件模块 |
| src/shared/sdk/modules/FileModule.ts | 文件模块 |
| src/shared/sdk/modules/DatabaseModule.ts | 数据库模块 |
| src/shared/sdk/modules/DeviceModule.ts | 设备模块 |
| src/shared/sdk/modules/SystemModule.ts | 系统模块 |
| src/shared/sdk/modules/TagModule.ts | 标签模块 |
| src/shared/sdk/modules/FolderModule.ts | 文件夹模块 |

## 配置文件（包根）

| 文件 | 说明 |
|------|------|
| package.json | 依赖、脚本、exports |
| tsconfig.json | TS 编译配置 |
| vite.sdk.config.ts | SDK ESM 打包配置 |
| README.md | 包说明（注意：其中"无 ws/数据库依赖"描述已过时） |
