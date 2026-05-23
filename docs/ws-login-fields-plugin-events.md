# WebSocket 登录、Fields 与插件事件关系

## 概览

客户端连接 WebSocket 后，不是单纯建连即完成业务登录。当前链路分为三层：

| 层级 | 职责 |
|------|------|
| WebSocket 连接 | 建立 `clientId + libraryId` 连接，并把连接注册到后端连接池 |
| Library 握手 | 通过 `library/open` 和 `library/connect` 触发库级连接流程 |
| 插件事件 | 后端广播 `client::before_connect`，插件可读取 `fields` 并决定是否允许连接 |

`mira_user` 插件就是基于 `client::before_connect` 实现登录拦截的。

## 连接入口

客户端连接地址：

```text
ws://{host}:{wsPort}?clientId={clientId}&libraryId={libraryId}
```

后端 `MiraWebsocketServer` 在连接建立时只做连接注册：

1. 解析 `clientId` 和 `libraryId`。
2. 将当前 `ws` 保存到 `libraryClients[libraryId]`。
3. 为 `ws` 写入 `clientId`、`libraryId`、连接时间等信息。

这一步不会触发 `mira_user`。插件登录流程依赖后续的 Library 握手消息。

## Library 握手流程

客户端 WebSocket 打开后发送第一次握手：

```json
{
  "action": "open",
  "requestId": "ws_open_xxx",
  "libraryId": "1779533990551",
  "clientId": "client_xxx",
  "fields": {},
  "payload": {
    "type": "library",
    "data": {
      "fields": {}
    }
  }
}
```

后端路由：

```text
WebSocketServer.handleMessage
  -> WebSocketRouter.route
  -> LibraryHandler
```

`LibraryHandler` 收到 `action = open` 后返回：

```json
{
  "eventName": "try_connect",
  "data": {
    "fields": [
      { "action": "connect", "type": "library", "field": "username" },
      { "action": "connect", "type": "library", "field": "password" }
    ]
  }
}
```

`data.fields` 来自 `pluginManager.fields`，由插件通过 `registerFields()` 注册。

客户端收到 `try_connect` 后发送第二次握手：

```json
{
  "action": "connect",
  "requestId": "ws_connect_xxx",
  "libraryId": "1779533990551",
  "clientId": "client_xxx",
  "fields": {
    "username": "lyj",
    "password": "131255"
  },
  "payload": {
    "type": "library",
    "data": {
      "fields": {
        "username": "lyj",
        "password": "131255"
      }
    }
  }
}
```

注意：当前插件读取的是顶层 `message.fields`，所以客户端必须保留顶层 `fields`。`payload.data.fields` 是协议表达上的镜像，便于后续统一。

## 插件字段注册

`mira_user` 初始化时注册连接所需字段：

```ts
pluginManager.registerFields([
  { action: 'connect', type: 'library', field: 'username' },
  { action: 'connect', type: 'library', field: 'password' },
])
```

字段注册只声明“连接时需要哪些字段”，不负责保存字段，也不负责触发登录。

职责划分：

| 组件 | 职责 |
|------|------|
| 插件 | 注册字段、监听事件、校验字段 |
| 后端 `LibraryHandler` | 在 `open` 时返回字段声明，在 `connect` 时广播插件事件 |
| 客户端 `WebSocketService` | 保存字段，连接时把字段带回后端 |

## 插件事件触发

`LibraryHandler` 收到 `action = connect` 后广播：

```ts
this.server.broadcastPluginEvent('client::before_connect', {
  message: this.message,
  ws: this.ws,
})
```

事件进入当前素材库的 `EventManager`。插件通过以下方式监听：

```ts
obj.eventManager.on('client::before_connect', this.onUserLogin.bind(this))
```

`mira_user` 在事件里读取：

```ts
const { message, ws } = event.args
const { libraryId, clientId, fields } = message
```

返回值约定：

| 返回值 | 含义 |
|------|------|
| `true` | 允许连接，后端继续发送 `connected` |
| `false` | 拒绝连接，后端不会发送库信息 |

`EventManager.broadcast()` 会按监听器顺序执行。如果任意监听器返回 `false`，广播结果为 `false`。

## mira_user 登录逻辑

`mira_user` 的行为：

1. 如果 `clientId` 已在 `logined_clients` 中，直接返回 `true`。
2. 如果 `fields.username` 或 `fields.password` 缺失：
   - 调用 `showDialogToWeboscket()`。
   - 客户端收到 `dialog` 后打开登录页。
   - 返回 `false`，阻止当前连接完成。
3. 如果字段存在：
   - 调用 SDK 登录接口校验账号密码。
   - 成功后调用 `onLogined()`。
   - 返回 `true`，允许连接完成。

登录成功后，插件发送：

```json
{
  "eventName": "setFields",
  "libraryId": "1779533990551",
  "data": {
    "fields": {
      "username": "lyj",
      "password": "131255"
    }
  }
}
```

客户端收到 `setFields` 后需要保存字段。否则刷新页面后字段丢失，下一次 `connect` 仍然是空字段，后端会再次弹登录页。

## 客户端字段保存

`WebSocketService` 当前负责：

1. 建连前按 `url + libraryId` 从 `ConfigStorage` 读取已保存字段。
2. 收到 `setFields` 后合并到内存字段并写入 `ConfigStorage`。
3. 收到 `try_connect` 后用当前字段发送 `library/connect`。
4. 字段值为 `null` 或 `undefined` 时删除本地字段，用于退出登录。

存储 key 形态：

```text
mira_ws_fields_{websocketUrl}_{libraryId}
```

因此同一客户端连接不同服务器或不同素材库时，登录字段互不覆盖。

## HTTP 请求鉴权

WebSocket 登录只保护 WS 握手链路。HTTP REST API 如果不额外拦截，会绕过 `client::before_connect`，例如未登录时仍可能调用：

```text
POST /api/files/getFiles
POST /api/files/getFile
```

当前采用库级 HTTP hook 处理这类请求，不把 `mira_user` 写死到全局路由。

### 设计原则

HTTP 请求不携带 `username/password` 等登录字段。客户端只携带当前设备连接的 `clientId`：

```json
{
  "libraryId": "1779533990551",
  "clientId": "client_xxx",
  "filters": {}
}
```

后端根据 `libraryId + clientId` 找到当前 WebSocket 连接，再从该连接读取服务端保存的 `fields`。这样避免把敏感字段散落到每个 HTTP body 中，也避免插件逻辑污染全局路由。

### 服务端字段来源

`MiraWebsocketServer` 为每个已注册的 WS 连接维护运行时字段：

```ts
setClientFields(libraryId, clientId, fields)
getClientFields(libraryId, clientId)
```

字段写入发生在两个位置：

| 场景 | 写入来源 |
|------|------|
| `library/connect` | 客户端从本地恢复 fields 后发回，`LibraryHandler` 写入 WS 连接 |
| 登录页登录成功 | `mira_user.onLogined()` 写入当前 WS 连接 |
| 退出登录 | `mira_user` 写入 `{ username: null, password: null }`，服务端删除对应字段 |

`setClientFields()` 对 `null` 和 `undefined` 使用删除语义，避免退出后旧字段残留。

### 插件 HTTP Hook

`ServerPluginManager` 提供库级 hook：

```ts
pluginManager.registerHttpHook({
  method: 'POST',
  path: '/api/files/getFiles',
  handler: this.onHttpBeforeFiles.bind(this),
})
```

路由执行前调用：

```ts
const allowed = await obj.pluginManager.runHttpHooks({
  libraryId,
  clientId,
  method: req.method,
  path: '/api/files/getFiles',
  req,
  res,
  fields: webSocketServer.getClientFields(libraryId, clientId),
})
```

hook 返回约定：

| 返回值 | 含义 |
|------|------|
| `true` 或 `undefined` | 允许继续执行原 HTTP 路由 |
| `false` | 阻断原 HTTP 路由，插件应自行写入响应 |

`mira_user` 当前注册了：

```text
POST /api/files/getFiles
POST /api/files/getFile
```

当 hook 中拿不到 `fields.username/password`，或 SDK 校验失败时，返回：

```json
{
  "code": 401,
  "message": "Unauthorized: login required",
  "data": null
}
```

### HTTP 与 WS 的关系

HTTP 鉴权依赖当前设备的 WS 连接仍存在：

1. 客户端启动 WS，获得并保存 `clientId`。
2. WS 登录成功后，服务端把 fields 绑定到该 WS 连接。
3. HTTP 请求只发送 `clientId`。
4. HTTP 路由用 `clientId` 回查 WS fields。
5. 插件 hook 根据 fields 决定放行或拒绝。

如果没有 WS 连接，或 `clientId` 不匹配当前连接，`getClientFields()` 返回空，`mira_user` 会拒绝 HTTP 请求。

### 不要在 HTTP Body 中传 Fields

不要让普通 HTTP 请求携带：

```json
{
  "fields": {
    "username": "lyj",
    "password": "131255"
  }
}
```

原因：

| 问题 | 说明 |
|------|------|
| 安全边界弱 | 每个 HTTP 调用都暴露登录字段 |
| 职责混乱 | HTTP 客户端需要理解插件字段 |
| 难以撤销 | 退出登录后旧请求仍可能携带旧字段 |
| 插件耦合 | 非登录插件也会看到不必要的敏感数据 |

正确做法是：HTTP 只表达设备身份，即 `clientId`；登录字段由 WS 登录链路维护在服务端连接状态中。

## 完整时序

```text
客户端打开 WS
  -> 后端注册 ws(clientId, libraryId)
  -> 客户端发送 library/open
  -> 后端返回 try_connect + 插件注册字段
  -> 客户端读取本地 fields
  -> 客户端发送 library/connect + fields
  -> LibraryHandler 广播 client::before_connect
  -> mira_user 校验 fields
     -> 缺失字段：发送 dialog，返回 false
     -> 校验成功：发送 setFields，返回 true
  -> LibraryHandler 收到 true 后发送 connected
  -> 后续 HTTP 请求携带 clientId
  -> FileRoutes 通过 clientId 回查 WS fields
  -> pluginManager.runHttpHooks 执行 mira_user HTTP hook
     -> 缺失或无效 fields：返回 401
     -> 有效 fields：继续执行原 HTTP 路由
```

## 相关文件

| 文件 | 职责 |
|------|------|
| `packages/mira-app-server/src/WebSocketServer.ts` | WS 连接注册、消息分发、向客户端发送事件 |
| `packages/mira-app-server/src/handlers/LibraryHandler.ts` | `open/connect` 握手与 `client::before_connect` 广播 |
| `packages/mira-app-server/src/ServerPluginManager.ts` | 插件加载、字段注册、HTTP hook 注册和执行、插件目录解析 |
| `packages/mira-app-server/src/routes/FileRoutes.ts` | `getFiles/getFile` 调用插件 HTTP hook 后再读取素材库 |
| `packages/mira-client/src/renderer/services/WebSocketService.ts` | 客户端 WS 握手、`fields` 保存与发送 |
| `packages/mira-client/src/renderer/services/MiraSDKService.ts` | HTTP 文件查询请求附带当前 `clientId` |
| `packages/mira-server-sdk/src/modules/FileModule.ts` | 文件查询 SDK 请求支持 `clientId` |
| `plugins/plugins/mira_user/index.ts` | 登录字段注册、登录校验、`setFields` 回写 |

## 调试判断

如果后端只看到：

```text
WebSocket connection established
[WebSocketServer] Registered client ...
```

说明只完成了 WS 建连，没有进入 Library 握手。

如果看到：

```text
[mira_user] onUserLogin: ..., fields= {}
[mira_user] 缺少用户名或密码，弹出登录对话框
```

说明插件已生效，但客户端没有携带已保存字段。

如果刷新后仍弹登录页，优先检查：

1. 客户端是否收到 `setFields`。
2. `WebSocketService` 是否写入本地存储。
3. 下一次 `library/connect` 是否包含顶层 `fields.username/password`。
4. `clientId` 变更是正常行为，不应依赖旧 `clientId` 判断长期登录状态。

如果 HTTP 请求未登录仍能读取素材库，优先检查：

1. HTTP body 是否携带了当前 WS 的 `clientId`。
2. `WebSocketServer.getClientFields(libraryId, clientId)` 是否能取到 fields。
3. 目标路由是否调用了 `pluginManager.runHttpHooks()`。
4. `mira_user` 是否注册了该路由的 HTTP hook。
5. 直接访问缩略图或原文件接口时，是否也接入了同样的 hook。
