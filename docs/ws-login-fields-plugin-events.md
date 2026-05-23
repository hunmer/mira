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
```

## 相关文件

| 文件 | 职责 |
|------|------|
| `packages/mira-app-server/src/WebSocketServer.ts` | WS 连接注册、消息分发、向客户端发送事件 |
| `packages/mira-app-server/src/handlers/LibraryHandler.ts` | `open/connect` 握手与 `client::before_connect` 广播 |
| `packages/mira-app-server/src/ServerPluginManager.ts` | 插件加载、字段注册、插件目录解析 |
| `packages/mira-client/src/renderer/services/WebSocketService.ts` | 客户端 WS 握手、`fields` 保存与发送 |
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
