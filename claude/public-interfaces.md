# 对外接口(全仓聚合)

> 仓库对外暴露的接口分三类:服务端 REST/WS、客户端 SDK、CLI。各接口细节见对应包 `claude/public-interfaces.md`。

## 服务端 HTTP(mira-app-server)

- 统一响应:`{ code, data, message?, timestamp }`
- 路由前缀 `/api/`,认证 `/api/auth/`,管理 `/api/admins/`
- 约 15 个路由模块(库、文件、标签、文件夹、缩略图、统计、设置、用户、管理、文件系统等)

## 服务端 WebSocket(mira-app-server)

- 连接:`ws://host:wsPort?clientId=xxx&libraryId=xxx`
- 消息格式:`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 默认端口 8018(`MIRA_SERVER_WS_PORT` / `WS_PORT`)

## TypeScript SDK(mira-app-core/src/shared/sdk)

- `MiraClient`:统一客户端门面
- `HttpClient`:REST 调用
- `WebSocketClient`:WS 订阅
- 10 个 API 模块(库/文件/标签/文件夹/缩略图/统计/设置/用户/管理等)
- 被 mira-client、mira-scripts-core、mira-dashboard-next 复用

## 客户端 IPC(mira-client)

- 通道前缀:`protocol:*`、`tray:*`、`search-window:*`、`shortcut:*`、`plugin:*`、`drag-drop:*`、`fs:*`、`hot-update:*`、`app:*`、`window:*`、`system:*`、`menu:*`、`auto-update:*`、`notification:*`
- 全部经 `contextBridge.exposeInMainWorld` 安全暴露
- 细节见 `packages/mira-client/claude/public-interfaces.md`

## 自定义协议

- `mira://`(mira-client 主进程注册),用于本地资源/缩略图安全加载

## CLI

- mira-app-server:`src/cli.ts`(commander)
- mira-scripts-core:`index.ts`(子命令 script/help/convert/import)
