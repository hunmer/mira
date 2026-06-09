# Findings: Package Consolidation

## Package Boundaries
- 根工作区当前包含独立包：`mira-app-core`、`mira-app-server`、`mira-server-sdk`、`mira-storage-sqlite` 等。
- `mira-app-core` 当前只有 `event-manager.ts`、`LibraryList.ts`、`index.ts`。
- `mira-storage-sqlite` 当前导出 SQLite 数据层与 `ILibraryServerData` 接口，依赖 `mira-app-core` 和 `sqlite3`。
- `mira-server-sdk` 当前导出 SDK 客户端、模块、类型与 WebSocket/HTTP 通信能力，依赖 `axios`、`form-data`、`ws`。

## Dependency Findings
- 根脚本存在独立构建：`build:sdk`、`build:storage`，`start:server` 先构建 core/storage/server/plugins。
- `mira-app-server` 当前依赖 `mira-app-core`、`mira-server-sdk`、`mira-storage-sqlite`。
- `mira-scripts-core` 当前依赖 `mira-storage-sqlite`。
- `mira-client` 当前依赖 `mira-server-sdk`。
- 迁移后 `mira-app-server`、`mira-client`、`mira-scripts-core` 均只依赖 `mira-app-core` 获取 shared SDK 与 SQLite 存储能力。

## Reference Findings
- `mira-storage-sqlite` 源码引用出现在 `mira-app-server` 多个 handlers/routes/services、`mira-scripts-core` 两个脚本、部分插件与文档。
- `mira-server-sdk` 源码引用出现在 `mira-client` 主进程/渲染进程服务、`mira-app-server/src/ServerPluginManager.ts`、构建配置与文档。
- 运行时代码导入已迁移为 `mira-app-core/storage/sqlite` 与 `mira-app-core/shared/sdk`。
