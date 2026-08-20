# 架构总览

## 模块定位

mira-app-core 是 monorepo 的核心库，提供共享类型、事件系统、存储实现和 SDK 客户端。**纯库，不自动执行业务逻辑，不独立启动**（无 server 监听、无主入口副作用）。

## 边界

- **做什么**：定义跨包共享的类型（User / Session / WebSocketMessage 等）、提供 EventManager 事件总线、实现 SQLite 持久化、提供面向 Mira App Server 的 SDK 客户端。
- **不做什么**：不启动 HTTP/WS 服务端、不写业务编排、不直接读写配置文件以外的运行时状态。

## 分层结构（基于 src 目录）

```
src/
├── index.ts              核心入口：类型 + EventManager + 库列表
├── event-manager.ts      事件系统（优先级、可中断）
├── LibraryList.ts        librarys.json 读写工具
├── storage/sqlite/       SQLite 持久化层（接口 + 实现 + mixins）
└── shared/sdk/           TypeScript SDK（MiraClient + 17 个 Module + HTTP/WS client）
```

## 下游依赖方

被 mira-app-server、mira-client、mira-scripts-core 等包依赖（基于既有文档记录；本次未逐一验证 import 关系）。

## 三个公开导出路径

| 路径 | 内容 |
|------|------|
| `mira-app-core` | 核心类型 + EventManager + 库列表工具 |
| `mira-app-core/storage/sqlite` | ILibraryServerData 接口 + LibraryServerDataSQLite 实现 |
| `mira-app-core/shared/sdk` | MiraClient + 17 个 Module + WebSocket/HTTP client（ESM bundle） |

## SDK 覆盖状态（2026-08-19 审计）

依据仓库根 `.audit/sdk-coverage-report.md`：server 固定 JSON API 共 128 条，SDK covered 117、missing 11（devices message/test、libraries query/execute/schema/record、plugins start/stop、user avatar、plugin-routes）、excluded 13（资源流/SSE/通配）、dynamic 7（插件运行时注册路由）。
