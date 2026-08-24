# 设备间文件分享（Device Share）Handoff

日期：2026-08-24
状态：**主体功能与三项优化全部完成，已验证**。代码未提交（工作区另有用户既有未提交改动，提交时注意区分）。

## 背景与目标

在 mira 素材库中实现「发送到其他设备」：
- 素材右键菜单 / 浮动工具栏 → 选择当前库已连接的设备（或扫 QR 配对新设备）→ 对端收到确认弹窗后下载（只传 HTTP 直链，不传二进制）。
- 接收端三形态：mira 桌面端（Electron，可选保存位置）、web 端（浏览器默认下载目录）、独立配对静态页（扫码打开，免安装）。
- 多文件打包 ZIP；配对页可反向把手机文件发回桌面端。

## 已实现（按链路）

### 消息协议（核心，跨端共用）

通过既有 `POST /api/devices/send-message` 下发，WS 事件名固定为 `admin_message`，消息体在其 `data.message` 中：

```jsonc
{
  "type": "mira-share",
  "from": "<发送端 clientId>",
  "fromLabel": "Windows · 192.168.x.x",
  "libraryId": "1787567993454",
  "files": [{ "id": "1", "name": "a.png", "path": "a.png", "size": 123, "url": "http://<host>/api/files/download/<lib>/<id>?token=..." }],
  "ticketUrl": "http://<lan-host>/api/devices/share/<ticketId>"  // 可选，优先
}
```

- `files[].url`：单文件直链（含发送端 token，接收端会用本机 token 重建兜底）。
- `files[].path`：库内相对路径（来自 FileInfo.path 去掉 `/api/files/file/<lib>/` 前缀），供 `/api/fs/download` 打包。
- `ticketUrl`：一次性票据链接（见下），多文件即 ZIP，免 token。

### 一次性分享票据（免 token 下载）

- Server：`packages/mira-app-server/src/routes/DeviceRoutes.ts` — `POST /share-tickets`（认证创建，路径穿越校验，解析成绝对路径存内存；TTL 30min / 限 20 次）+ `GET /share/:ticketId`（免认证，单文件流 / 多文件 ZIP，复用 archiver）。
- 免认证放行：`src/middleware/permission.ts` `PUBLIC_PREFIXES` 加了 `/devices/share/`（仅 GET）。
- SDK：`mira-app-core/src/shared/sdk/modules/DeviceModule.ts` `createShareTicket()`，类型 `ShareTicketRequest/Response`（`types.ts`），契约测试在 `DeviceModule.contract.test.ts`。

### 发送端（mira-client）

- `src/renderer/composables/useDeviceShare.ts`：全局状态（`shareDialogOpen/shareFiles/incomingShare` 模块级 ref）、`openDeviceShare(FileInfo[])`、`toDeviceShareFiles`、`buildPairUrl()`（QR 内容，loopback→局域网主机替换）、`resolveServerOrigin()`。
- `components/business/DeviceShareDialog/`：
  - `DeviceListPicker.vue` 设备列表选择器（`devices().getByLibrary`，排除本机，10s 轮询）
  - `DeviceShareDialog.vue` 发送 Dialog（列表 + QR（`qrcode` 包）+ 发送前建票据）
  - `IncomingShareDialog.vue` 接收确认（Electron 可 `fs:selectDirectory` 选目录）
  - `downloadShare.ts` 两套下载：票据优先 → 多文件 POST `/api/fs/download` → 单文件直链；Electron `fs:writeFile(Uint8Array)` 落盘 / Web blob+`<a download>`
- 入口：`MediaGridComponent/composables/useContextMenu.ts`（右键菜单项）、`MediaTabListView/useMediaTabBatchOps.ts` 拦截 `'share'` action（浮动工具栏按钮在 `MediaTabListView.vue`，原 open 已替换为 share）。
- 两个 Dialog 挂载于 `views/HomeView/HomeDialogs.vue`（自管理状态，无 props）。
- WS 接收：`services/WebSocketService.ts` `setupEventListeners` 末尾监听 `admin_message` → `pushIncomingShare`。

### SDK WebSocketClient 增强（mira-app-core）

`WebSocketClient.ts` 构造器支持 `options.url`（完整 ws 地址）/ `options.host`——跨设备访问不再写死 `ws://localhost`。**这是破坏性兼容点：静态页依赖此能力，回滚需同步。**

### 静态配对页（mira-app-server）

- `public/pair.html`：`<script type=module>` import `/static/sdk/mira-sdk.esm.mjs`（从 core 构建产物拷贝到 `public/sdk/`，**core 每次改 SDK 后要重新 `pnpm build` 并拷贝**）。
- 流程：解析 query（token/libraryId/ws/from）→ `MiraClient(origin)+setToken` 认证 → `client.websocket(0,{url:...}).start()` → `bind('admin_message')` → 渲染列表 → 接收下载（票据优先；`reachableUrl()` 把链接 host 替换为页面 host）。
- **双向发送**：QR 带 `from=<桌面端clientId>`；页面选文件 → `client.files().upload`（上传到库，带进度）→ `client.devices().sendMessage(from, ...)` 回推 → 桌面端弹 IncomingShareDialog。
- `package.json` files 字段已加 `public/**/*`（npm 发布不遗漏）。

## 验证状态（全部通过）

- core：81 tests（含新契约测试）；`pnpm build` 成功。
- server：`tsc --noEmit` 0 错误；已用 procm-mcp 重启 dev 进程（`UOsnBBif`），冒烟：`POST share-tickets` 无 token→401、`GET share/:fake`→410（免认证放通生效）、`pair.html`/mjs→200。
- client：`pnpm run type-check` 0 错误（含修复的 `DeploymentChecklist.vue`——watch 移到声明之后）。
- audit 流水线（`.audit/`）重跑通过：无「未编码决策」；`GET /api/devices/share/:param` 记 P3（文件流），顺带补了既有缺口 `GET /api/plugins/store` 为 P2；记录在 `.audit/progress.md`。

## 关键端口/进程（本机 dev）

- HTTP `127.0.0.1:8081`（/static、/api），WS `8018`。
- procm 进程：`UOsnBBif` mira-app-server-dev；`4gQ3FFGJ` start:client:win（vite 热加载，client 改动无需重启）。

## 未完成 / 后续工作

1. `GET /api/plugins/store` 已登记 P2（dashboard 插件商店页在用），建议下批纳入 `PluginModule`（决策见 `.audit/decide.ts`）。
2. 票据存内存（server 重启失效），跨进程/多实例部署考虑落 SQLite。
3. 端到端真机验证（手机扫码 + 局域网 IP）尚未做过——QR 的局域网主机替换逻辑（`buildPairUrl`）只在同源 web 部署下自动生效，Electron 打包后（file://）依赖 serverUrl 非 loopback，建议实测。
4. i18n 已覆盖 zh-CN/en-US（`business.json` 的 `deviceShare.*`、`contextMenu.sendToDevice*`；`tabs.json` 的 `mediaTabListView.share`），其他语言包未加。
5. 票据下载无限速/无 referer 校验，公网暴露场景建议加来源限制。

## 环境注意事项（AGENTS.md 摘要 + 本任务补充）

- 改 `mira-app-core` 后：`pnpm build` → 拷贝 `dist/shared/sdk/mira-sdk.esm.mjs` 到 `packages/mira-app-server/public/sdk/` → `pnpm -C packages/mira-app-server install` → procm 重启 server dev。
- server 静态文件（public/）改动无需重启；client 改动 vite 热加载。
- 工作区有用户既有未提交改动（LibraryStorage.ts、ThumbnailService.ts、sqlite/* 等），不要动。

## Suggested skills

- `mira-sdk-coverage-audit`：新增/修改 server API 路由或 SDK 方法后重跑 `.audit/` 流水线（`decide.ts` 对未编码决策会抛错，是新增路由检测器）。
- `procm-mcp`：server 需要启用/重启时使用（MCP 不可用时查 `.agents/skills/procm-mcp`）。
- `mira-cli`：从命令行操作 server（库/文件/设备管理）做接口调试。
- `diagnose`：若真机配对/下载链路异常，按复现→最小化→假设→插桩流程排查（WS 消息、票据 410、CORS、局域网可达性是常见嫌疑）。
