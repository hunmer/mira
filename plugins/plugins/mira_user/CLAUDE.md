[根目录](../../../CLAUDE.md) > [plugins](../../CLAUDE.md) > [plugins](..) > **mira_user**

# mira_user

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 初始化 | 深度扫描后生成模块文档 |

## 模块职责

用户登录认证插件。通过 `mira-server-sdk` 连接 Mira 服务端进行权限验证，控制文件访问。

核心功能：
- WebSocket 连接前拦截认证，弹出登录对话框
- 使用 `MiraClient.auth().login()` 校验用户名密码
- HTTP Hook 拦截文件访问 API（`/api/files/getFiles`, `/api/files/getFile`）
- 维护已登录客户端列表

## 入口与启动

- **入口文件**: `index.ts` -- 导出 `init(inst): UserPlugin` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化

## 对外接口

### HTTP 路由

| 路径 | 方法 | 说明 |
|------|------|------|
| `/user/login` | POST | 用户登录 |
| `/user/register` | POST | 用户注册 |
| `/user/logout` | POST | 退出登录 |
| `/user/*` | GET | 静态登录页面 |

### 事件监听

| 事件 | 说明 |
|------|------|
| `client::before_connect` | 拦截未认证连接 |

### 事件广播

| 事件 | 说明 |
|------|------|
| `user::connected` | 用户登录成功 |
| `user::disconnected` | 用户断开连接 |
| `client::connected` | 客户端连接就绪 |

### 注册字段

- `{ action: 'connect', type: 'library', field: 'username' }`
- `{ action: 'connect', type: 'library', field: 'password' }`

## 关键依赖与配置

- `mira-server-sdk`: MiraClient 用于服务端认证
- `mira-app-server`: ServerPlugin 基类
- `mira-storage-sqlite`: ILibraryServerData 数据接口

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | 插件主实现 (259 行) |
| `package.json` | 包配置 (v1.0.9) |
| `web/` | 登录页面静态文件 |
