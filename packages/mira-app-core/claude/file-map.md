# 文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口，导出核心类型和 API |
| `src/event-manager.ts` | EventManager + EventArgs + EventSubscription |
| `src/LibraryList.ts` | 库列表 JSON 文件读写 |
| **存储层** | |
| `src/storage/sqlite/index.ts` | 存储层入口导出 |
| `src/storage/sqlite/ILibraryServerData.ts` | 存储接口定义 |
| `src/storage/sqlite/LibraryServerDataSQLite.ts` | SQLite 实现（主文件） |
| `src/storage/sqlite/mixins/FileOperations.ts` | 文件操作 mixin |
| `src/storage/sqlite/mixins/FileImport.ts` | 文件导入 mixin |
| `src/storage/sqlite/mixins/FolderOperations.ts` | 文件夹操作 mixin |
| `src/storage/sqlite/mixins/TagOperations.ts` | 标签操作 mixin |
| `src/storage/sqlite/mixins/Statistics.ts` | 统计数据 mixin |
| `src/storage/sqlite/mixins/types.ts` | mixin 类型定义 |
| **SDK 层** | |
| `src/shared/sdk/index.ts` | SDK 入口导出 |
| `src/shared/sdk/types.ts` | SDK 类型定义 |
| `src/shared/sdk/client/MiraClient.ts` | SDK 主客户端 |
| `src/shared/sdk/client/HttpClient.ts` | HTTP 客户端 |
| `src/shared/sdk/client/WebSocketClient.ts` | WebSocket 客户端 |
| `src/shared/sdk/utils/EventEmitter.ts` | 事件发射器 |
| `src/shared/sdk/modules/AuthModule.ts` | 认证模块 |
| `src/shared/sdk/modules/UserModule.ts` | 用户模块 |
| `src/shared/sdk/modules/LibraryModule.ts` | 素材库模块 |
| `src/shared/sdk/modules/PluginModule.ts` | 插件模块 |
| `src/shared/sdk/modules/FileModule.ts` | 文件模块 |
| `src/shared/sdk/modules/DatabaseModule.ts` | 数据库模块 |
| `src/shared/sdk/modules/DeviceModule.ts` | 设备模块 |
| `src/shared/sdk/modules/SystemModule.ts` | 系统模块 |
| `src/shared/sdk/modules/TagModule.ts` | 标签模块 |
| `src/shared/sdk/modules/FolderModule.ts` | 文件夹模块 |
