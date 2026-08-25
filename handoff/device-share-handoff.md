# 设备间文件分享（Device Share）Handoff

日期：2026-08-25（增量更新；初版 2026-08-24）
状态：**发送/接收/进度回传/传输管理/设置面板/配对页 UI 全部完成，已本地验证**；2026-08-25 晚增量：设备列表多列卡片、Dropzone 本地文件 + **WS 二进制端到端传输**（mira-client ⇄ pair.html 双向），代码未提交。

## 背景与目标

在 mira 素材库中实现「发送到其他设备」：
- 素材右键菜单 / 浮动工具栏 → 选择当前库已连接的设备（或扫 QR 配对新设备）→ 对端收到确认弹窗后下载（只传 HTTP 直链，不传二进制）。
- 接收端三形态：mira 桌面端（Electron，可选保存位置）、web 端（浏览器默认下载目录）、独立配对静态页（扫码打开，免安装）。
- 多文件打包 ZIP；配对页可反向把手机文件发回桌面端；双端接收进度互见。

## 已实现（按链路）

### 消息协议（核心，跨端共用）

通过既有 `POST /api/devices/send-message` 下发，WS 事件名固定为 `admin_message`，消息体在其 `data.message` 中：

```jsonc
// 分享消息
{
  "type": "mira-share",
  "id": "<shareId>",            // ★新增：一次分享的唯一标识，ack 关联用
  "from": "<发送端 clientId>",
  "fromLabel": "Windows · 192.168.x.x",
  "libraryId": "1787567993454",
  "files": [{ "id": "1", "name": "a.png", "path": "a.png", "size": 123, "url": "http://<host>/api/files/download/<lib>/<id>?token=..." }],
  "ticketUrl": "http://<lan-host>/api/devices/share/<ticketId>"  // 可选，优先
}
// ★新增：接收端 → 发送端的进度/状态回传（同样走 admin_message）
{ "type": "mira-share-ack", "shareId": "<上述 id>", "state": "receiving|done|failed|declined", "percent": 0.42 }
```

- `files[].url`：单文件直链（含发送端 token，接收端会用本机 token 重建兜底）。
- `files[].path`：库内相对路径，供 `/api/fs/download` 打包。
- `ticketUrl`：一次性票据链接（TTL 30min / 限 20 次），多文件即 ZIP，免 token。
- ack 双向：pair.html 与 mira-client 接收端都会回传（各自内置 ≥5% 进度节流，终态必发）。

### 二进制端到端传输（2026-08-25 增量）

本地文件（Dropzone 选择）不经 server 磁盘/URL 中转，直接 WS 二进制帧推流：

- **帧协议**（三处实现需保持一致：`binaryTransfer.ts` / `pair.html` / server 只转发不解析载荷）：
  - client→server：`[0x4D][u16 targetLen][target utf8][u16 shareIdLen][shareId][u8 flags][u32 seq][u32 payloadLen][payload]`
  - server→接收端：剥掉 target 段原样转发；flags bit0=eos（流结束）；多文件按 files 顺序串行拼流，接收端按 `files[].size` 切分落盘。
- **控制消息**（走既有 admin_message）：`mira-share(binary:true, files 带 binary:true 项)` → 接收端确认后回 `mira-share-accept{shareId}` → 发送端推流；进度/终态沿用 `mira-share-ack`。
- **server**：`WebSocketServer.ts` `ws.on('message')` 加 `isBinary` 分支 → `relayBinaryMessage`（校验 magic 0x4D、按 target 跨库查连接、剥头转发）；`findDeviceClient` 新增。
- **SDK**：`WebSocketClient.ts` 加 `sendBinary()` / `bufferedAmount` getter / binaryType='arraybuffer' / 非文本消息 `emit('binary')`。
- **mira-client**：
  - `WebSocketService.ts`：`sendBinary()` / `getBufferedAmount()` / `setBinaryHandler()`（单播）；`admin_message` 分发新增 `mira-share-accept`（→ onBinaryShareAccept）与 ack failed/declined（→ cancelBinarySend）。
  - `binaryTransfer.ts`（DeviceShareDialog 目录，新文件）：帧编解码 + 发送会话（等 accept 60s 超时→记录置 failed；256KB 分块推流；bufferedAmount>8MB 轮询流控；eos 帧）+ 接收会话（30s 停顿判失败；按 size 切分；Electron `fs:writeFile` / Web blob 下载）。⚠️ `ensureBinaryShareInstalled()` 懒注册 WS handler（避免与 WebSocketService 循环初始化），勿改回模块顶层注册。
  - `downloadShare.ts`：新增 `receiveShareFiles()`（URL/票据部分与二进制部分并行接收，进度按总字节合并）；IncomingShareDialog/autoAccept 均改走它。
  - `DeviceShareDialog.vue`：send 页签接入 Dropzone（`components/ui/dropzone/`，自 plugin-ui 复制，drag-data 精简为 canAcceptDrop/urlKind）；发送时 binary 文件并入 files（无 url，`binary:true`），不进票据；含 binary 的传输记录禁用重发（File 对象不随记录保留）。
- **pair.html**：发送页签 Dropzone 替换原「上传到素材库」链路（不再 `files().upload`，直接二进制推流给选中设备）；接收端 `downloadShare` 支持 binary/混合（同款并行+合并进度）；`ws.on('binary')` 分发接收会话。
- 混合分享语义：素材文件走票据/直链，本地文件走二进制流，一条 mira-share 消息两类并存。

### 一次性分享票据（免 token 下载）

- Server：`packages/mira-app-server/src/routes/DeviceRoutes.ts` — `POST /share-tickets`（认证创建，路径穿越校验，解析成绝对路径存内存）+ `GET /share/:ticketId`（免认证，单文件流 / 多文件 ZIP，复用 archiver）。
- 免认证放行：`src/middleware/permission.ts` `PUBLIC_PREFIXES` 加了 `/devices/share/`（仅 GET）。
- SDK：`mira-app-core/src/shared/sdk/modules/DeviceModule.ts` `createShareTicket()`，类型 `ShareTicketRequest/Response`（`types.ts`），契约测试在 `DeviceModule.contract.test.ts`。
- `GET /api/devices/library/:id` 对不存在的库返回 404（`libraryExists` 校验）——配对页/组件需按此兜底。

### 发送端（mira-client）

- `src/renderer/composables/useDeviceShare.ts`：全局状态（`shareDialogOpen/shareFiles/incomingShare/shareDialogTab` 模块级 ref）、`openDeviceShare`（重置 send 页签）、`toDeviceShareFiles`、`buildPairUrl()`、`resolveServerOrigin()`、`createShareId()`、`sendShareAck()`（内置 5% 节流 + 终态清理）、`autoAcceptShare()`（自动接收，失败回落确认框，带 ack）、`describeDevice/getSelfClientId`。
- `components/business/DeviceShareDialog/`：
  - `DeviceShareDialog.vue` **双页签合并对话框**（80vw）：`send`（DeviceListPicker + 配对 QR + 发送，发送成功自动切传输页签）/ `transfers`（传输记录列表）。传输记录 = 记录头（状态图标/目标设备/状态/相对时间 + 进度条）+ 单文件 Attachment 直显或多文件 **Collapsible 折叠**逐文件 Attachment（默认收起，chevron 旋转），折叠触发行右侧**重新发送按钮**（重新生成票据+shareId 发原目标，记录重置待接收态）。票据创建提取为共享 `createTicketUrl()`。
  - `DeviceListPicker.vue`：本地图层（mira-client 版，`devices().getByLibrary`，排除自身，10s 轮询）；设备列表为**多列响应式卡片**（grid 1/2/3 列 @ sm/xl，竖式卡片：图标+状态点/设备名/clientId+活跃时间）。
  - `IncomingShareDialog.vue`：接收确认；`fs:selectDirectory` 返回 **`{success, path}`**（早期取 `result.data` 的 bug 已修）；saveDir 一次性（不写配置，每次打开恢复设置默认值）；下载进度/终态/拒绝均回传 ack。
  - `useDeviceTransfers.ts`：**模块级** `deviceTransfers`（≤50 条）+ `shareDialogTab` + `activeTransferCount/addDeviceTransfer/applyShareAck/clearFinishedTransfers/resetTransferForResend`（`DeviceTransferItem` 含 `targetClientId` 供重发）。
  - `downloadShare.ts`：两套下载（票据优先 → 多文件 POST `/api/fs/download` → 单文件直链；Electron `fs:writeFile` 落盘 / Web blob+`<a download>`）。
- `components/ui/attachment/`：**从 mira-plugin-ui 复制**（mira-client 不引用组件库；两包 `src/components/ui`+`src/lib/utils` 结构一致，相对路径零修改；仅 AttachmentAction 去掉未用 props 绑定满足 noUnusedLocals）。⚠️ 两处维护，改样式需同步。
- 入口：`MediaGridComponent/composables/useContextMenu.ts`（右键）、`MediaTabListView/useMediaTabBatchOps.ts` 拦截 `'share'` action。
- `views/HomeView/HomeDialogs.vue` 挂载两个 Dialog（自管理状态）。
- `views/HomeView/HomeHeader.vue`：传输入口按钮（swap_vert + 进行中 badge）→ 打开合并对话框并定位 transfers 页签。
- WS 接收：`services/WebSocketService.ts` `setupEventListeners` 末尾 `admin_message` 分发 `mira-share`（→ pushIncomingShare）与 **`mira-share-ack`（→ applyShareAck）**。

### 接收设置（文件共享面板）

- `stores/settings.ts`：`deviceShareAutoAccept`（默认 false）、`deviceShareSaveDir`（默认 ''）。
- `views/settings/FileSharePanel.vue`（新增）+ `ExtensionsPanel.vue` 注册「文件共享」分组：自动接收开关；保存位置选择（仅 Electron，Web 显示说明）。
- `pushIncomingShare` 开启自动接收时不弹框直接下载（toast loading→结果），失败回落确认框。

### 静态配对页（mira-app-server/public/pair.html，本轮大改）

- **技术栈**：shadcn-vue + mira-plugin-ui **dist 免构建消费**——`public/vendor/`（`mira-plugin-ui.umd.js` + `mira-plugin-ui.css` + `vue.global.prod.js`），经 `scripts/copy-plugin-ui.mjs`（package.json `build:plugin-ui`）构建并同步（Windows 杀软瞬时占用文件已加重试；读写在应用层完成）。dist 路线原因：pair.html 无构建链路，源码消费（`docs/plugin-ui-source-consumption.md`）需要 Vite+Tailwind；dist 全量 CSS 含全部组件类，自有标记只用已验证存在的工具类。
- **UI**：Vue app（`app.use(MiraPluginUI.default)` 全局注册），Tabs「接收/发送」双页签；发送页签双栏（DeviceListPicker + 信息/操作侧栏），小屏堆叠；接收列表用 Attachment（状态映射 idle/uploading/done/error）+ Empty 等待态。响应式断点 640/1024/480（大屏固定 960px、`tab-body` 固定 min-height 防跳动），全部走页面自有 media query。
- **主题**：右上角亮/暗切换（`html.dark`，localStorage `mira-pair-theme`，默认跟随系统，head 首帧前应用防闪）；token 覆盖把默认蓝紫 primary（oklch hue 260）改为绿色（hue 163）。
- **多语言**：右上角中/英切换，35 key 双语字典 + `t(key, params)`，localStorage `mira-pair-lang`，默认跟随浏览器。
- **设备选择发送**：发送页签任选在线设备（QR `from` 参数自动预选）；`libraryId` 连接时校验（404 → 明确报错），列表服务对 404 兜底空列表。
- **稳定 clientId**：localStorage `mira-pair-client-id`，刷新/重开复用同 id 重连（server `registerClient` 对同 id 是顶替式注册，安全）。修复：此前每次刷新随机 id 导致发送端传输记录里的 targetClientId 失效 → 重发 "Device not found"。
- **进度回传**：下载中 `mira-share-ack receiving`(≥5% 节流) + 终态，发给 `msg.from`。
- 流程：query（token/libraryId/ws/from）→ MiraClient(origin)+setToken → ws(0,{url,clientId,libraryId,token}).start() → bind('admin_message')；下载票据优先 → reachableUrl 替换 host。

### mira-plugin-ui（组件库增量）

- `src/DeviceListPicker.vue`（新增，主入口导出）：**services 注入模式**（`listDevices(libraryId)`），props `selfClientId/excludeSelf/pollInterval`，v-model:selected，emit devices，内置 describeDevice/活跃时间中文文案；shadcn 原子类 + lucide 图标。
- `src/types.ts`：`DeviceListItem`（后端 Device 兼容子集）/`DeviceListPickerServices`。
- `demo/App.vue`：演示卡片（连接走 SDK，未连接 mock，disconnected 项演示过滤）。

## 验证状态

- client：`pnpm run type-check` 0 错误（含全部本轮改动）。
- plugin-ui：`pnpm build` 通过（Dropzone 已导出并注册进 UMD install，vendor 三件套已同步）。
- server：`tsc --noEmit` 0 错误；pair.html 内联 module 脚本 `node --check` 通过；/static 资源（pair.html/vendor 三件套/sdk mjs）curl 200。
- **二进制转发自测通过**：Node 双 WS 客户端直连 8018，A 发数据帧+eos 帧 → server 剥 target 头转发 → B 收到且 payload/shareId/flags 正确（RELAY OK）。
- 交互验证（用户侧已确认/待回归）：发送→传输页签进度推进、重发（clientId 稳定后）、保存位置记忆与一次性语义、自动接收；**本轮待回归：Dropzone 本地文件双向传输（client→pair、pair→client）、混合分享**。

## 关键端口/进程（本机 dev）

- HTTP `127.0.0.1:8081`（/static、/api），WS `8018`；client dev `localhost:3000`。
- procm 进程：`UOsnBBif` mira-app-server-dev；`4gQ3FFGJ` start:client:win（vite 热加载，client 改动无需重启）。

## 未完成 / 后续工作

1. 真机扫码端到端（手机 + 局域网 IP）仍未系统验证；Electron 打包后（file://）`buildPairUrl` 的局域网主机替换需实测。
2. attachment / Dropzone 组件两处维护（plugin-ui 源 / mira-client 复制版；Dropzone 的 drag-data 在 client 侧为精简版），样式变更需手动同步。
3. `DeviceListPicker`（plugin-ui 版）组件内文案硬编码中文，未接 t 注入；pair.html 的 DeviceListPicker 仍是单列（本轮只改了 mira-client 版）。
4. 自动接收无进度百分比 toast；传输记录仅内存（应用重启丢失），可持久化 localStorage。
5. 单文件传输记录无重发按钮（按钮目前只在多文件 Collapsible 行）；对端离线重发可前置检测。
6. 二进制传输：无中途取消/断点续传；接收端全内存组装（超大文件内存峰值高，Electron 可改流式 append）；binary 记录不可重发（File 对象不保留）；发送端无本地推送进度展示（仅对端 ack 进度）。
7. 同浏览器双开 pair 标签页共用一个 clientId 会相互顶替连接，需要时加标签页级后缀。
8. `docs/plugin-ui-source-consumption.md` 可补「无构建静态页走 dist」一节（pair.html 即参考实现）。
9. `GET /api/plugins/store` 已登记 P2（dashboard 在用），建议纳入 `PluginModule`；票据存内存重启失效，多实例部署考虑落 SQLite；票据无限速/无 referer 校验。

## 环境注意事项（AGENTS.md 摘要 + 本任务补充）

- 改 `mira-app-core` 后：`pnpm build` → 拷贝 `dist/shared/sdk/mira-sdk.esm.mjs` 到 `packages/mira-app-server/public/sdk/` → `pnpm -C packages/mira-app-server install` → procm 重启 server dev。
- 改 `mira-plugin-ui` 且 pair.html 消费其组件：`pnpm -C packages/mira-app-server run build:plugin-ui`（构建+同步 vendor 三件套）。server 静态文件（public/）改动无需重启；client 改动 vite 热加载。
- pair.html 自有标记只能用 dist CSS 中已存在的工具类（新增类先 grep `dist/mira-plugin-ui.css`）；响应式/特殊断点走页面自有 `<style>` media query。
- 工作区有用户既有未提交改动（LibraryStorage.ts、ThumbnailService.ts、sqlite/* 等），不要动。

## Suggested skills

- `procm-mcp`：server 需要启用/重启时使用（MCP 不可用时查 `.agents/skills/procm-mcp`）。
- `mira-cli`：从命令行操作 server（库/文件/设备管理）做接口调试。
- `mira-sdk-coverage-audit`：新增/修改 server API 路由或 SDK 方法后重跑 `.audit/` 流水线。
- `diagnose`：真机配对/下载链路异常时按复现→最小化→假设→排查（WS 消息、票据 410、CORS、局域网可达性是常见嫌疑）。
- `port-react-to-vue` / `design-taste-frontend`：后续往组件库移植 UI 时的规范参考。
