# 对外接口(全仓聚合)

> 仓库对外暴露的接口分四类:服务端 REST/WS、TypeScript SDK、客户端 IPC、CLI。各接口细节见对应包 `claude/public-interfaces.md`。

## 服务端 HTTP(mira-app-server)

- 统一响应:`{ code, data, message?, timestamp }`
- 路由前缀 `/api/`,认证 `/api/auth/`,管理 `/api/admins/`
- **19 个路由模块**(见下),全部继承 `BaseRouter.ts`
- v3.0 新增端点亮点:`POST /api/devices/share-tickets` + `GET /api/devices/share/:ticketId`(设备分享票据,免认证下载,TTL 30 分钟)、`POST|GET /api/libraries/import(/:id(/cancel))`(Eagle/Billfish 跨库导入)、`GET|PUT /api/user/files`(用户文本文件读写)、`GET /api/plugins/store`(插件商店代理)、`POST /api/files/upload` 支持 importType copy/move/link

```
AdminsRouter AuthRouter BaseRouter CookieSitesRouter DatabaseRoutes DeviceRoutes
DownloadRoutes FileRoutes FolderRouter FsRouter HttpRouter LibraryRoutes PluginRoutes
SettingsRouter StatisticsRouter TagRouter ThumbRouter UserRouter WebSocketRouter
```

## 服务端 WebSocket(mira-app-server)

- 连接:`ws://host:wsPort?clientId=xxx&libraryId=xxx`
- 消息格式:`{ action, requestId, libraryId, clientId, payload: { type, data } }`
- 默认端口 8018(`MIRA_SERVER_WS_PORT` / `WS_PORT`)
- **二进制帧端到端转发**(v3.0):帧头 `[0x4D 魔数][u16 clientId 长度][clientId]`,server 只按 clientId 路由不落盘(设备间文件分享)

## 插件对外扩展点(mira-app-server)

`ServerPluginManager` 同时支持两套注册协议(见 [插件系统](#)):

- **旧协议**:`extends ServerPlugin`,导出 `init(inst): ServerPlugin`,可注册 HTTP Hook、WebSocket 监听、缩略图生成器、前端路由
- **新协议(格式插件)**:`init(inst)` 内调用 `inst.pluginManager.registerFileFormat(pluginName, ServerFileFormatHandler)`,声明 `extensions` / `mimeTypes` / `thumbnailExtensions` / `thumbnail(src, dest)` / `viewers[]`

## TypeScript SDK(mira-app-core/src/shared/sdk)

- `MiraClient`:统一客户端门面
- `HttpClient`:REST 调用
- `WebSocketClient`:WS 订阅
- **17 个 API 模块**(库/文件/标签/文件夹/缩略图/统计/设置/用户/管理/CookieSite/Admin/Download/FileSystem 等;v3.0 新增 createShareTicket、user readFile/writeFile、importFrom/进度/取消、scanDuplicates matchMode;v3.0.2 新增 importFilePath/checkDuplicates/relocate/setFileTagsBatch,HttpClient 401 自动重认证单飞重放,retryFileOperation 对 EBUSY/EPERM/EACCES 指数退避)
- SDK 覆盖(`.audit/sdk-coverage-report.md`,2026-09-09):固定 JSON API 141 条,covered 128 / missing 13 / excluded 13 / dynamic 7
- v3.0.2 新端点 5 条:`POST /api/libraries/:id/relocate` + `GET /api/libraries/:id/relocate/progress`(LibraryRelocationService 停库→流式复制→改写 librarys.json→删源→重启)、`POST /api/files/import-path`(**仅 loopback**)、`POST /api/files/checkDuplicates`、`POST /api/tags/file/set-batch`;**回收站只读**:recycled 文件的 rename/update/tag/folder 操作统一 409;**名称/ID 关联**:`FileAssociationResolver`(resolveTagIds/resolveFolderId,按名解析无则创建)接入 File/Tag/Folder/Download 四路由与 MCP
- 被 mira-client、mira-scripts-core、mira-dashboard-next(13 个 api 模块基本全走 SDK)、mira-browser-extension 复用

## 浏览器扩展消息(mira-browser-extension)

- Chrome MV3 四上下文消息协议:`shared/messages.ts` 联合类型 + `*_TYPES` 集合
- 跨上下文传文件必须用 `fileToStaged`(`number[]`)
- 细节见 `packages/mira-browser-extension/claude/public-interfaces.md`

## 客户端 IPC(mira-client)

- 通道前缀:`protocol:*`、`tray:*`、`search-window:*`、`shortcut:*`、`plugin:*`、`drag-drop:*`、`fs:*`、`hot-update:*`、`app:*`、`window:*`、`system:*`、`menu:*`、`auto-update:*`、`notification:*`
- 全部经 `contextBridge.exposeInMainWorld` 安全暴露
- 细节见 `packages/mira-client/claude/public-interfaces.md`

## 自定义协议

- `mira://`(mira-client 主进程注册),用于本地资源/缩略图安全加载

## MCP 服务(mira-app-server)

- `src/mcp/`,启动参数 `--mcp`(stdio 传输),基于 `@modelcontextprotocol/sdk`

## CLI

- mira-app-server:`src/cli.ts` + `src/cli/commands/`(commander;顶层 5 命令 + 11 个域子命令 + doctor;凭证多 profile `~/.mira/credentials.json`)
- mira-scripts-core:`index.ts`(子命令 script/help/convert/import)
- mira-browser-extension:`chrome` 加载已构建扩展
