# 鉴权与权限系统

## 概述

Mira 服务端采用 Token + 角色的统一鉴权机制，通过全局中间件拦截所有 HTTP 和 WebSocket 请求，按权限配置表集中管理，无需逐路由修改。

核心配置文件：`packages/mira-app-server/src/middleware/permission.ts`

## 认证流程

```
客户端                        服务端
──────                        ──────
POST /api/auth/login  ──────►  验证用户名密码
                              生成 Token (mira-token-{userId}-{timestamp}-{random})
◄─────────────────────  返回 accessToken

后续请求:
Authorization: Bearer <token> ──►  全局中间件校验 token
                                  ├─ 有效 → req.user = { id, username, role, ... }
                                  └─ 无效 → 401

WebSocket 连接:
ws://host:port?clientId=x&libraryId=x&token=x
                                  ├─ token 有效 + 角色匹配 → 允许连接
                                  ├─ token 无效 → close(4001)
                                  └─ 角色不匹配 → close(4003)
```

### Token 生命周期

- 格式：`mira-token-{userId}-{timestamp}-{randomBytes}`
- 有效期：24 小时
- 存储：SQLite `sessions` 表
- 清理：每小时自动清理过期会话

## 用户角色

三个固定角色：

| 角色 | 权限码 | 说明 |
|------|--------|------|
| `super` | `['*']` | 超级管理员，拥有所有权限 |
| `admin` | `AC_100100`, `AC_100010`, `AC_100020`, `AC_200000`, `AC_300000` | 管理员 |
| `user` | `AC_000100` | 普通用户 |

角色在 `UserStorage` 的 `users` 表中存储，通过 `GET /api/auth/codes` 获取当前用户的权限码列表。

## 权限层级

请求经过三个层级的检查：

```
请求进入
  │
  ├─ 1. 公开路由？ → 是 → 放行
  │
  ├─ 2. authRequired=false？ → 是 → 放行
  │
  ├─ 3. Token 校验 → 失败 → 401
  │
  ├─ 4. 库级别权限 → 角色不匹配 → 403
  │
  └─ 放行
```

### 第 1 层：公开路由

以下路由无需认证即可访问：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/register` | 注册 |
| GET | `/api/settings` | 获取服务器设置 |

### 第 2 层：服务器认证开关

`data/settings.json` 中的 `authRequired` 字段控制是否启用认证：

```json
{
  "authRequired": true,
  "allowRegistration": true
}
```

- `authRequired = false`：所有路由放行，不校验 token
- `authRequired = true`（默认）：非公开路由必须携带有效 token

### 第 3 层：素材库角色控制

素材库配置（`data/librarys.json`）中的 `allowedRoles` 字段限制访问角色：

```json
{
  "id": "library-001",
  "name": "受限素材库",
  "allowedRoles": ["super", "admin"]
}
```

| 值 | 含义 |
|----|------|
| 缺失或 `[]` | 所有角色可访问 |
| `["super", "admin"]` | 仅 super 和 admin 可访问 |

校验逻辑：

```typescript
canAccessLibrary(config, userRole) {
  if (!userRole) return true;                              // authRequired=false 时无 user
  if (!config.allowedRoles || config.allowedRoles.length === 0) return true;
  return config.allowedRoles.includes(userRole);
}
```

## 需要库权限的路由

以下路由前缀会提取 `libraryId` 并校验 `allowedRoles`：

| 路由前缀 | libraryId 来源 |
|----------|---------------|
| `/api/files/*` | `req.query.libraryId` / `req.body.libraryId` |
| `/api/tags/*` | `req.query.libraryId` / `req.body.libraryId` |
| `/api/folders/*` | `req.query.libraryId` / `req.body.libraryId` |
| `/api/database/*` | `req.params.id` / `req.query.libraryId` |
| `/api/devices/*` | `req.query.libraryId` / `req.body.libraryId` |
| `/api/fs/*` | `req.query.libraryId` / `req.body.libraryId` |
| `PUT /api/libraries/:id` | `req.params.id` |
| `DELETE /api/libraries/:id` | `req.params.id` |

libraryId 提取优先级：`req.params.id` > `req.query.libraryId` > `req.body.libraryId`

仅需认证但不需要库权限的路由：`GET /api/libraries`、`POST /api/libraries`、`/api/auth/*`、`/api/user/*`、`/api/admins/*`、`PUT /api/settings`。

## WebSocket 鉴权

### 连接参数

```
ws://host:8018?clientId=xxx&libraryId=xxx&token=xxx
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `clientId` | 是 | 客户端标识 |
| `libraryId` | 是 | 目标素材库 ID |
| `token` | authRequired=true 时 | Bearer token |

### 连接校验流程

```
连接建立
  │
  ├─ 缺少 clientId/libraryId → close()
  │
  ├─ authRequired=false → 跳过认证
  │
  ├─ 缺少 token → close(4001, 'Authentication required')
  │
  ├─ token 无效 → close(4001, 'Authentication failed')
  │
  ├─ allowedRoles 不包含 user.role → close(4003, 'Access denied to library')
  │
  └─ 注册客户端，存储 user 信息到 ConnectedClient
```

### 消息校验

每条 WS 消息也会校验目标库的 `allowedRoles`，防止客户端连接后跨库操作。

## 响应码

| HTTP 状态码 | WS close code | 含义 |
|-------------|---------------|------|
| 401 | 4001 | 未认证 / token 无效 |
| 403 | 4003 | 权限不足，无法访问该素材库 |
| 500 | - | 认证服务错误 |

错误响应格式：

```json
{
  "code": 401,
  "message": "未提供认证令牌",
  "data": null
}
```

## 客户端适配

### HTTP 请求

所有需要认证的请求在 Header 中携带 token：

```
Authorization: Bearer <token>
```

SDK（`mira-server-sdk`）的 `HttpClient` 自动管理 token，登录后自动附加。

### WebSocket 连接

客户端连接时在 URL 中传入 token：

```typescript
const wsUrl = `ws://host:8018?clientId=${clientId}&libraryId=${libraryId}&token=${token}`
```

- `mira-client` 的 `WebSocketService` 自动从 `authStore.token` 获取
- `mira-server-sdk` 的 `WebSocketClient` 通过 `options.token` 传入

## Dashboard 配置入口

Dashboard 提供两个配置入口：

1. **Overview 页 → Settings Dialog**：控制 `authRequired` 和 `allowRegistration`
2. **Library 表单 → 角色勾选**：配置每个素材库的 `allowedRoles`（默认全选）

## 架构说明

### 中间件挂载位置

```
Express 请求流
  │
  ├─ HTTP Logger Middleware    （日志）
  ├─ CORS Middleware           （跨域）
  ├─ JSON Body Parser          （解析）
  ├─ Permission Middleware ←   （鉴权，挂载在 /api）
  │
  ├─ /api/auth    → AuthRouter
  ├─ /api/files   → FileRoutes
  ├─ /api/tags    → TagRouter
  └─ ...
```

权限中间件在 body parser 之后、路由分发之前执行，对所有 `/api/*` 路由生效。

### 延迟初始化

`LibraryStorage` 在 `MiraServer.start()` 中异步初始化，晚于 `HttpServer` 构造。权限中间件通过延迟 getter 获取 LibraryStorage：

```typescript
// HttpServer.ts setupMiddleware()
this.app.use('/api', createHttpPermissionMiddleware(
    authService,
    settingsManager,
    () => this.backend.libraries  // 延迟求值
));
```

### 扩展权限配置

新增路由的权限控制只需修改 `permission.ts` 中的两个配置：

```typescript
// 新增公开路由
PUBLIC_ROUTES.add('GET /new-endpoint');

// 新增需要库权限的路由前缀
LIBRARY_SCOPED_PREFIXES.push('/new-resource/');
```

无需修改任何路由文件。
