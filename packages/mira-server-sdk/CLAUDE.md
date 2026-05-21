[根目录](../../CLAUDE.md) > [packages](..) > **mira-server-sdk**

# mira-server-sdk

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 服务端 TypeScript SDK，提供链式调用的 API 客户端，用于与 Mira App Server 的 HTTP 和 WebSocket 接口交互。被 `mira-client`（桌面客户端）、`mira-app-server`（插件系统）和外部程序使用。

核心特性：
1. **链式调用**: `client.auth().login().then(() => client.libraries().getAll())`
2. **模块化架构**: 按 API 领域分为 10 个模块
3. **双通道支持**: HTTP (axios) + WebSocket (ws)
4. **工具方法**: `batch()`, `safe()`, `retry()` 异步操作辅助

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出 MiraClient, WebSocketClient 和所有模块
- **构建产物**: `dist/index.js` + `dist/index.d.ts`
- **构建命令**: `tsc` / `pnpm run build` / `pnpm run rebuild`
- **ESM 构建**: `vite build --config vite.esm.config.ts`
- **发布**: npm (MIT 许可)

## 对外接口

### MiraClient (src/client/MiraClient.ts)

主客户端类，链式调用入口：

```typescript
const client = new MiraClient('http://localhost:8081');
await client.login('username', 'password');
const libraries = await client.libraries().getAll();
```

### 模块一览

| 模块 | 文件 | 说明 |
|------|------|------|
| `AuthModule` | `modules/AuthModule.ts` | 认证：login, logout, getStatus |
| `UserModule` | `modules/UserModule.ts` | 用户信息：getInfo, update |
| `LibraryModule` | `modules/LibraryModule.ts` | 素材库：getAll, start, stop, create, delete |
| `PluginModule` | `modules/PluginModule.ts` | 插件管理 |
| `FileModule` | `modules/FileModule.ts` | 文件上传/下载/管理 |
| `DatabaseModule` | `modules/DatabaseModule.ts` | 数据库查询/操作 |
| `DeviceModule` | `modules/DeviceModule.ts` | 设备管理 |
| `SystemModule` | `modules/SystemModule.ts` | 系统信息/健康检查 |
| `TagModule` | `modules/TagModule.ts` | 标签 CRUD |
| `FolderModule` | `modules/FolderModule.ts` | 文件夹 CRUD |

### WebSocketClient (src/client/WebSocketClient.ts)

WebSocket 客户端，支持事件订阅和消息收发。

### HttpClient (src/client/HttpClient.ts)

基于 axios 的 HTTP 客户端，封装了 token 管理、请求拦截。

## 关键依赖与配置

- **运行时依赖**: `axios` (^1.7.2), `form-data` (^4.0.0), `ws` (^8.18.0)
- **开发依赖**: `typescript`, `jest`, `ts-jest`, `eslint`
- **Node**: >= 16.0.0

## 数据模型

类型定义在 `src/types.ts`，主要包括 `ClientConfig`、`WebSocketOptions` 等。

## 测试与质量

- **测试框架**: Jest (ts-jest)
- **测试命令**: `pnpm test`, `pnpm run test:coverage`, `pnpm run test:ci`
- **Lint**: `pnpm run lint`
- **验证**: `pnpm run verify`

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口 |
| `src/types.ts` | 类型定义 |
| `src/client/MiraClient.ts` | 主客户端类 |
| `src/client/HttpClient.ts` | HTTP 客户端 |
| `src/client/WebSocketClient.ts` | WebSocket 客户端 |
| `src/modules/*.ts` | 10 个 API 模块 |
| `src/utils/EventEmitter.ts` | 事件发射器 |
| `package.json` | 包配置 (v1.0.19, MIT) |
