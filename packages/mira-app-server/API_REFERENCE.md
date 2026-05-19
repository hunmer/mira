# Mira App Server API 参考文档c

## 概述

Mira App Server 提供了一套完整的 RESTful API，用于管理素材库、用户认证、插件系统、文件管理等功能。服务器默认运行在端口 8081。

**基础 URL**: `http://localhost:8081`

## 目录

- [认证相关 API](#认证相关-api)
- [用户管理 API](#用户管理-api)
- [管理员管理 API](#管理员管理-api)
- [素材库管理 API](#素材库管理-api)
- [插件管理 API](#插件管理-api)
- [文件管理 API](#文件管理-api)
- [数据库管理 API](#数据库管理-api)
- [设备管理 API](#设备管理-api)
- [系统状态 API](#系统状态-api)

---

## 认证相关 API

### 登录
**POST** `/api/auth/login`

用户登录，获取访问令牌。

**请求体**:
```json
{
    "username": "string",
    "password": "string"
}
```

**响应** (成功):
```json
{
    "code": 0,
    "message": "登录成功",
    "data": {
        "accessToken": "string"
    }
}
```

**响应** (失败):
```json
{
    "code": 401,
    "message": "用户名或密码错误",
    "data": null
}
```

### 登出
**POST** `/api/auth/logout`

用户登出，撤销访问令牌。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
    "success": true,
    "message": "退出成功"
}
```

### 验证令牌
**GET** `/api/auth/verify`

验证当前令牌是否有效。

**请求头**:
```
Authorization: Bearer <token>
```

**响应** (成功):
```json
{
    "success": true,
    "message": "令牌有效",
    "data": {
        "user": {
            "id": "number",
            "username": "string",
            "role": "string"
        }
    }
}
```

### 获取权限码
**GET** `/api/auth/codes`

获取当前用户的权限码列表。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
    "code": 0,
    "message": "获取权限码成功",
    "data": ["AC_100100", "AC_100010", ...]
}
```

---

## 用户管理 API

### 获取用户信息
**GET** `/api/user/info`

获取当前登录用户的详细信息。

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
    "code": 0,
    "message": "获取用户信息成功",
    "data": {
        "id": "number",
        "username": "string",
        "realName": "string",
        "roles": ["string"],
        "avatar": "string",
        "desc": "string",
        "homePath": "/dashboard"
    }
}
```

### 更新用户信息
**PUT** `/api/user/info`

更新当前登录用户的信息。

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
    "realName": "string",
    "avatar": "string"
}
```

**响应**:
```json
{
    "code": 0,
    "message": "用户信息更新成功",
    "data": null
}
```

---

## 管理员管理 API

### 获取管理员列表
**GET** `/api/admins`

获取所有管理员账户列表。

**响应**:
```json
[
    {
        "id": "string",
        "username": "string",
        "email": "string",
        "role": "admin",
        "createdAt": "string",
        "updatedAt": "string"
    }
]
```

### 创建管理员
**POST** `/api/admins`

创建新的管理员账户。

**请求体**:
```json
{
    "username": "string",
    "email": "string",
    "password": "string"
}
```

**响应** (成功):
```json
{
    "success": true,
    "message": "管理员创建成功",
    "data": {
        "id": "string"
    }
}
```

---

## 素材库管理 API

### 获取素材库列表
**GET** `/api/libraries`

获取所有素材库的列表及其状态信息。

**响应**:
```json
[
    {
        "id": "string",
        "name": "string",
        "path": "string",
        "type": "local|remote",
        "status": "active|inactive|error",
        "fileCount": "number",
        "size": "number",
        "description": "string",
        "createdAt": "string",
        "updatedAt": "string"
    }
]
```

### 创建素材库
**POST** `/api/libraries`

创建新的素材库。

**请求体**:
```json
{
    "name": "string",
    "path": "string",
    "type": "local|remote",
    "description": "string",
    "icon": "string",
    "customFields": {
        "enableHash": "boolean"
    },
    "serverURL": "string",    // 仅远程库需要
    "serverPort": "number",   // 仅远程库需要
    "pluginsDir": "string"    // 可选
}
```

**响应** (成功):
```json
{
    "success": true,
    "message": "素材库创建成功",
    "data": {
        "id": "string"
    }
}
```

### 更新素材库
**PUT** `/api/libraries/:id`

更新指定素材库的信息。

**参数**:
- `id`: 素材库ID

**请求体**:
```json
{
    "name": "string",
    "description": "string",
    "customFields": {
        "enableHash": "boolean"
    }
}
```

### 删除素材库
**DELETE** `/api/libraries/:id`

删除指定的素材库。

**参数**:
- `id`: 素材库ID

### 启动素材库
**POST** `/api/libraries/:id/start`

启动指定的素材库服务。

**参数**:
- `id`: 素材库ID

### 停止素材库
**POST** `/api/libraries/:id/stop`

停止指定的素材库服务。

**参数**:
- `id`: 素材库ID

---

## 插件管理 API

### 获取插件列表
**GET** `/api/plugins`

获取所有已安装插件的列表。

**响应**:
```json
[
    {
        "id": "string",
        "pluginName": "string",
        "name": "string",
        "version": "string",
        "description": "string",
        "author": "string",
        "status": "active|inactive",
        "configurable": "boolean",
        "dependencies": ["string"],
        "main": "string",
        "libraryId": "string",
        "createdAt": "string",
        "updatedAt": "string",
        "icon": "string",
        "category": "string",
        "tags": ["string"]
    }
]
```

### 按素材库获取插件
**GET** `/api/plugins/by-library`

按素材库分组获取插件列表。

**响应**:
```json
[
    {
        "id": "string",
        "name": "string",
        "description": "string",
        "plugins": [
            // 插件对象数组，格式同上
        ]
    }
]
```

### 安装插件
**POST** `/api/plugins/install`

从 npm 安装新插件。

**请求体**:
```json
{
    "name": "string",
    "version": "string",    // 默认 "latest"
    "libraryId": "string"
}
```

### 启用插件
**POST** `/api/plugins/:id/enable`

启用指定插件。

**参数**:
- `id`: 插件ID

### 禁用插件
**POST** `/api/plugins/:id/disable`

禁用指定插件。

**参数**:
- `id`: 插件ID

### 卸载插件
**DELETE** `/api/plugins/:id`

卸载指定插件。

**参数**:
- `id`: 插件ID

---

## 文件管理 API

### 上传文件
**POST** `/api/files/upload`

上传文件到指定素材库。

**请求类型**: `multipart/form-data`

**表单字段**:
- `files`: 文件数组
- `libraryId`: 目标素材库ID
- `sourcePath`: 本地文件路径（用于验证）
- `clientId`: 客户端ID（可选）
- `fields`: JSON字符串（可选）
- `payload`: JSON字符串，包含标签和文件夹信息

**payload 结构**:
```json
{
    "data": {
        "tags": ["string"],
        "folder_id": "string"
    }
}
```

**响应**:
```json
{
    "results": [
        {
            "success": "boolean",
            "file": "string",
            "result": "object",
            "error": "string"    // 仅在失败时
        }
    ]
}
```

### 下载文件
**GET** `/api/files/download/:libraryId/:fileId`

下载指定文件。

**参数**:
- `libraryId`: 素材库ID
- `fileId`: 文件ID

### 删除文件
**DELETE** `/api/files/:libraryId/:fileId`

删除指定文件。

**参数**:
- `libraryId`: 素材库ID
- `fileId`: 文件ID

---

## 数据库管理 API

### 获取数据库表列表
**GET** `/api/database/tables`

获取数据库中所有表的信息。

**响应**:
```json
[
    {
        "name": "string",
        "schema": "string",
        "rowCount": "number"
    }
]
```

### 获取表数据
**GET** `/api/database/tables/:tableName/data`

获取指定表的数据。

**参数**:
- `tableName`: 表名

**响应**:
```json
[
    // 表数据行数组
]
```

### 获取表结构
**GET** `/api/database/tables/:tableName/schema`

获取指定表的结构信息。

**参数**:
- `tableName`: 表名

**响应**:
```json
[
    {
        "name": "string",
        "type": "string",
        "notnull": "number",
        "pk": "number",
        "dflt_value": "string"
    }
]
```

---

## 设备管理 API

### 获取所有设备连接
**GET** `/api/devices`

获取所有素材库的设备连接信息。

**响应**:
```json
{
    "success": true,
    "data": {
        "libraryId": [
            {
                "clientId": "string",
                "libraryId": "string",
                "connectionTime": "string",
                "lastActivity": "string",
                "requestInfo": {
                    "url": "string",
                    "headers": "object",
                    "remoteAddress": "string"
                },
                "status": "connected|disconnected",
                "userAgent": "string",
                "ipAddress": "string"
            }
        ]
    },
    "timestamp": "string"
}
```

### 获取特定素材库设备
**GET** `/api/devices/library/:libraryId`

获取指定素材库的设备连接信息。

**参数**:
- `libraryId`: 素材库ID

### 断开设备连接
**POST** `/api/devices/disconnect`

断开指定设备的连接。

**请求体**:
```json
{
    "clientId": "string",
    "libraryId": "string"
}
```

### 发送消息到设备
**POST** `/api/devices/send-message`

向指定设备发送消息。

**请求体**:
```json
{
    "clientId": "string",
    "libraryId": "string",
    "message": "object"
}
```

### 获取设备统计信息
**GET** `/api/devices/stats`

获取设备连接统计信息。

**响应**:
```json
{
    "success": true,
    "data": {
        "totalDevices": "number",
        "connectedDevices": "number",
        "libraryStats": {
            "libraryId": {
                "deviceCount": "number",
                "activeConnections": "number"
            }
        }
    }
}
```

---

## 系统状态 API

### 健康检查
**GET** `/api/health`

获取详细的系统健康状态。

**响应**:
```json
{
    "success": true,
    "status": "ok",
    "timestamp": "string",
    "uptime": "number",
    "version": "string",
    "nodeVersion": "string",
    "environment": "string"
}
```

### 简单健康检查
**GET** `/health`

获取简单的健康状态。

**响应**:
```json
{
    "status": "ok",
    "timestamp": "string",
    "uptime": "number",
    "version": "string"
}
```

---

## 错误响应格式

所有 API 在发生错误时会返回以下格式的响应：

```json
{
    "error": "错误类型",
    "message": "错误描述",
    "timestamp": "时间戳",
    "stack": "错误堆栈信息（仅开发环境）"
}
```

常见的 HTTP 状态码：
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未认证或令牌无效
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 认证说明

除了登录接口外，大部分 API 都需要在请求头中包含认证令牌：

```
Authorization: Bearer <your-access-token>
```

令牌可以通过登录接口获取，并且有一定的过期时间。

---

## 请求和响应日志

服务器会详细记录所有的 HTTP 请求和响应信息，包括：
- 请求方法和URL
- 客户端IP和User-Agent
- 请求头、查询参数、路由参数和请求体
- 响应状态码、响应头和响应体
- 响应时间

这些日志信息会在服务器控制台中输出，便于调试和监控。

---

## WebSocket 支持

除了 HTTP API 外，服务器还提供 WebSocket 连接用于实时通信。WebSocket 连接主要用于：
- 插件事件广播
- 文件操作实时通知
- 设备状态更新

WebSocket 连接地址：`ws://localhost:8081`

---

## 插件系统

服务器支持插件系统，插件可以：
- 注册自定义的 HTTP 路由
- 处理文件操作事件
- 扩展素材库功能

插件通过 HttpRouter 注册自定义路由，支持按素材库ID分别处理请求。
