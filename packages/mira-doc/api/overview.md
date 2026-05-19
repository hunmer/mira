# 📋 API 概览

Mira 提供了完整的 RESTful API 和 WebSocket API，让你可以轻松地与系统进行集成和自动化操作。

## 🎯 API 设计理念

### 🔧 RESTful 设计
- **标准 HTTP 方法**：GET、POST、PUT、DELETE
- **语义化 URL**：清晰的资源路径结构
- **状态码规范**：标准的 HTTP 状态码
- **JSON 格式**：统一的数据交换格式

### 🔒 安全第一
- **身份认证**：基于 Token 的认证机制
- **权限控制**：细粒度的权限管理
- **数据验证**：严格的输入数据验证
- **安全响应**：不泄露敏感信息

### 📊 开发友好
- **详细文档**：完整的 API 文档和示例
- **错误信息**：清晰的错误描述和解决建议
- **版本管理**：向后兼容的版本策略
- **调试支持**：丰富的调试和测试工具

## 🌐 API 基础信息

### 🔗 基础 URL

```
HTTP API: http://localhost:3000/api/v1
WebSocket: ws://localhost:8081
```

### 📋 版本管理

当前 API 版本：`v1`

URL 格式：`/api/v1/{resource}`

### 📊 内容类型

- **请求**：`application/json`
- **响应**：`application/json`
- **文件上传**：`multipart/form-data`

### 🔐 认证方式

API 使用 Bearer Token 认证：

```http
Authorization: Bearer <your-token>
```

## 📚 API 分类

### 🔐 认证相关 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 用户登录 | `/auth/login` | POST | 获取访问令牌 |
| 用户登出 | `/auth/logout` | POST | 注销令牌 |
| 令牌验证 | `/auth/verify` | GET | 验证令牌有效性 |
| 获取权限码 | `/auth/codes` | GET | 获取权限代码列表 |

### 👥 用户管理 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 获取用户信息 | `/users/me` | GET | 获取当前用户信息 |
| 更新用户信息 | `/users/me` | PUT | 更新当前用户信息 |
| 管理员列表 | `/admin/list` | GET | 获取管理员列表 |
| 创建管理员 | `/admin/create` | POST | 创建新管理员 |
| 删除管理员 | `/admin/delete` | DELETE | 删除管理员 |

### 📁 文件管理 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 上传文件 | `/files/upload` | POST | 上传单个或多个文件 |
| 下载文件 | `/files/download` | GET | 下载指定文件 |
| 删除文件 | `/files/delete` | DELETE | 删除指定文件 |
| 文件列表 | `/files/list` | GET | 获取文件列表 |

### 📚 库管理 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 库列表 | `/libraries/list` | GET | 获取所有库 |
| 创建库 | `/libraries/create` | POST | 创建新库 |
| 更新库 | `/libraries/update` | PUT | 更新库信息 |
| 删除库 | `/libraries/delete` | DELETE | 删除库 |
| 启动库 | `/libraries/start` | POST | 启动库服务 |
| 停止库 | `/libraries/stop` | POST | 停止库服务 |
| 执行库 | `/libraries/execute` | POST | 执行库操作 |
| 查询库 | `/libraries/query` | GET | 查询库信息 |

### 🔌 插件管理 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 插件列表 | `/plugins/list` | GET | 获取所有插件 |
| 插件信息 | `/plugins/info` | GET | 获取插件详细信息 |
| 安装插件 | `/plugins/install` | POST | 安装新插件 |
| 卸载插件 | `/plugins/uninstall` | DELETE | 卸载插件 |
| 启动插件 | `/plugins/start` | POST | 启动插件 |
| 停止插件 | `/plugins/stop` | POST | 停止插件 |

### 📊 设备管理 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 设备列表 | `/devices/list` | GET | 获取所有设备 |
| 库设备 | `/devices/by-library` | GET | 获取指定库的设备 |
| 断开设备 | `/devices/disconnect` | POST | 断开设备连接 |
| 发送消息 | `/devices/send-message` | POST | 向设备发送消息 |
| 设备统计 | `/devices/stats` | GET | 获取设备统计信息 |

### 💾 数据库 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 表列表 | `/database/tables` | GET | 获取数据库表列表 |
| 表数据 | `/database/table-data` | GET | 获取表数据 |
| 表结构 | `/database/table-schema` | GET | 获取表结构 |

### 🔍 系统状态 API

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 健康检查 | `/system/health` | GET | 获取系统健康状态 |
| 详细状态 | `/system/status` | GET | 获取详细系统状态 |

## 📝 标准响应格式

### ✅ 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### ❌ 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息"
  },
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 📄 分页响应

```json
{
  "success": true,
  "data": {
    "items": [
      // 数据项
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## 🔧 HTTP 状态码

| 状态码 | 说明 | 常见场景 |
|--------|------|----------|
| `200` | 成功 | 请求成功处理 |
| `201` | 创建成功 | 资源创建成功 |
| `400` | 请求错误 | 参数验证失败 |
| `401` | 未认证 | 缺少或无效的认证信息 |
| `403` | 权限不足 | 没有操作权限 |
| `404` | 资源不存在 | 请求的资源不存在 |
| `409` | 冲突 | 资源冲突（如重名） |
| `422` | 数据错误 | 数据格式正确但内容无效 |
| `500` | 服务器错误 | 内部服务器错误 |
| `503` | 服务不可用 | 服务临时不可用 |

## 🔗 WebSocket API

### 连接信息

```javascript
const ws = new WebSocket('ws://localhost:8081?token=your-auth-token')
```

### 消息格式

```json
{
  "type": "event|command|response",
  "event": "事件名称",
  "data": {
    // 事件数据
  },
  "timestamp": "2025-01-01T12:00:00.000Z",
  "id": "消息ID（可选）"
}
```

### 常见事件

| 事件 | 说明 | 数据格式 |
|------|------|----------|
| `file::uploaded` | 文件上传完成 | `{path, size, type}` |
| `file::deleted` | 文件删除 | `{path}` |
| `library::started` | 库启动 | `{id, name}` |
| `library::stopped` | 库停止 | `{id, name}` |
| `device::connected` | 设备连接 | `{id, type}` |
| `device::disconnected` | 设备断开 | `{id, type}` |

## 🧪 API 测试

### 使用 curl 测试

```bash
# 登录获取 token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 使用 token 访问 API
curl -X GET http://localhost:3000/api/v1/libraries/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# 上传文件
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.txt" \
  -F "library=library_id"
```

### 使用 Postman

1. **创建环境**：设置 `baseUrl` 为 `http://localhost:3000/api/v1`
2. **设置认证**：在 Authorization 中选择 Bearer Token
3. **导入集合**：使用 Postman 集合文件（如果提供）

### 使用 JavaScript

```javascript
// 登录
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password'
  })
})

const { token } = await response.json()

// 使用 token 访问 API
const libraries = await fetch('/api/v1/libraries/list', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## 📊 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| `AUTH_INVALID_TOKEN` | 无效的认证令牌 | 重新登录获取新令牌 |
| `AUTH_TOKEN_EXPIRED` | 令牌已过期 | 刷新令牌或重新登录 |
| `PERMISSION_DENIED` | 权限不足 | 检查用户权限 |
| `RESOURCE_NOT_FOUND` | 资源不存在 | 确认资源 ID 正确 |
| `VALIDATION_ERROR` | 数据验证失败 | 检查请求参数格式 |
| `FILE_TOO_LARGE` | 文件过大 | 减小文件大小或调整限制 |
| `LIBRARY_NOT_FOUND` | 库不存在 | 确认库 ID 正确 |
| `PLUGIN_NOT_FOUND` | 插件不存在 | 确认插件 ID 正确 |

### 错误处理最佳实践

1. **检查状态码**：始终检查 HTTP 状态码
2. **解析错误信息**：读取响应中的错误详情
3. **重试机制**：对临时性错误实现重试
4. **用户友好**：将技术错误转换为用户可理解的信息
5. **日志记录**：记录错误以便调试

## 🔧 API 最佳实践

### 🚀 性能优化

1. **分页查询**：大数据集使用分页
2. **字段选择**：只请求需要的字段
3. **缓存利用**：合理使用 HTTP 缓存
4. **并发控制**：避免过多并发请求

### 🔒 安全考虑

1. **令牌管理**：安全存储和传输令牌
2. **HTTPS 使用**：生产环境使用 HTTPS
3. **输入验证**：验证所有输入数据
4. **敏感信息**：不在 URL 中传递敏感信息

### 📊 监控和调试

1. **请求日志**：记录重要的 API 调用
2. **响应时间**：监控 API 响应时间
3. **错误率**：跟踪 API 错误率
4. **调试信息**：开发环境启用详细日志

## 📚 更多资源

- [🔐 认证授权](/api/authentication) - 详细的认证机制说明
- [📁 文件 API](/api/file) - 文件操作 API 详解
- [📚 库 API](/api/library) - 库管理 API 详解
- [🔌 插件 API](/api/plugin) - 插件系统 API 详解
- [🔗 N8N 集成](/n8n/overview) - N8N 集成使用指南

---

准备好开始使用 Mira API 了吗？从 [🔐 认证授权](/api/authentication) 开始你的 API 之旅！🚀
