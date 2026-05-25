[根目录](../../CLAUDE.md) > [packages](..) > **mira-server-sdk**

# mira-server-sdk

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 补充 16 个源文件行数统计、类型定义完整清单、双构建输出说明 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 服务端 TypeScript SDK，提供链式调用的 API 客户端，用于与 Mira App Server 的 HTTP 和 WebSocket 接口交互。被 `mira-client`（桌面客户端）、`mira-app-server`（插件系统）和外部程序使用。

核心特性：
1. **链式调用**: `client.auth().login().then(() => client.libraries().getAll())`
2. **模块化架构**: 按 API 领域分为 10 个模块
3. **双通道支持**: HTTP (axios) + WebSocket (ws)
4. **工具方法**: `batch()`, `safe()`, `retry()`, `waitForServer()` 异步操作辅助
5. **双构建输出**: CJS (`dist/index.js`) + ESM (`dist/mira-sdk.esm.mjs`)

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出 MiraClient, WebSocketClient 和所有模块
- **构建产物**: `dist/index.js` (CJS) + `dist/mira-sdk.esm.mjs` (ESM)
- **构建命令**: `tsc && vite build --config vite.esm.config.ts`
- **发布**: npm (MIT 许可)

## 对外接口

### MiraClient (src/client/MiraClient.ts, 323 行)

主客户端类，链式调用入口：

```typescript
const client = new MiraClient('http://localhost:8081');
await client.login('username', 'password');
const libraries = await client.libraries().getAll();
```

### 模块一览 (10 个模块)

| 模块 | 文件 | 行数 | 说明 |
|------|------|------|------|
| `AuthModule` | `modules/AuthModule.ts` | 104 | 认证：login, logout, register, getStatus |
| `UserModule` | `modules/UserModule.ts` | 63 | 用户信息：getInfo, update |
| `LibraryModule` | `modules/LibraryModule.ts` | 184 | 素材库：getAll, start, stop, create, delete, update |
| `PluginModule` | `modules/PluginModule.ts` | 194 | 插件管理：getAll, install, uninstall, configure |
| `FileModule` | `modules/FileModule.ts` | 415 | 文件上传/下载/管理，支持批量上传 |
| `DatabaseModule` | `modules/DatabaseModule.ts` | 178 | 数据库查询/操作，表结构查看 |
| `DeviceModule` | `modules/DeviceModule.ts` | 213 | 设备管理，断开连接，发送消息 |
| `SystemModule` | `modules/SystemModule.ts` | 219 | 系统信息/健康检查/等待就绪 |
| `TagModule` | `modules/TagModule.ts` | 289 | 标签 CRUD，批量操作 |
| `FolderModule` | `modules/FolderModule.ts` | 304 | 文件夹 CRUD，树形结构 |

### 客户端层

| 文件 | 行数 | 说明 |
|------|------|------|
| `client/MiraClient.ts` | 323 | 主客户端类，10 个模块统一入口 |
| `client/HttpClient.ts` | 177 | 基于 axios 的 HTTP 客户端，token 管理 |
| `client/WebSocketClient.ts` | 197 | WebSocket 客户端，事件订阅/消息收发 |

### 类型定义 (src/types.ts, 350 行)

主要类型：
- `ClientConfig`: HTTP 客户端配置
- `WebSocketOptions`: WebSocket 连接选项（clientId, libraryId, reconnect 等）
- `LoginRequest/Response`, `RegisterRequest/Response`: 认证相关
- `UserInfo`, `Admin`: 用户和管理员
- `Library`, `CreateLibraryRequest`, `UpdateLibraryRequest`: 素材库
- `Plugin`, `PluginsByLibrary`: 插件
- `FileData`, `FileFilters`, `UploadFileRequest`, `UploadResponse`: 文件
- `Tag`, `TagQuery`: 标签
- `Folder`, `FolderQuery`: 文件夹
- `DatabaseTable`, `TableColumn`: 数据库
- `Device`, `DevicesResponse`, `DeviceStatsResponse`: 设备
- `HealthResponse`: 系统健康
- `BaseResponse`, `ErrorResponse`: 通用响应

## 关键依赖与配置

- **运行时依赖**: `axios` (^1.7.2), `form-data` (^4.0.0), `ws` (^8.18.0)
- **开发依赖**: `typescript`, `jest`, `ts-jest`, `eslint`
- **Node**: >= 16.0.0
- **源文件统计**: 16 个 .ts 文件，约 3277 行代码

## 测试与质量

- **测试框架**: Jest (ts-jest)
- **测试目录**: `tests/` (HttpClient, AuthModule, MiraClient 集成测试)
- **测试命令**: `pnpm test`, `pnpm run test:coverage`, `pnpm run test:ci`
- **Lint**: `pnpm run lint`
- **验证**: `pnpm run verify`

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/index.ts` | 36 | 模块入口 |
| `src/types.ts` | 350 | 类型定义 |
| `src/client/MiraClient.ts` | 323 | 主客户端类 |
| `src/client/HttpClient.ts` | 177 | HTTP 客户端 |
| `src/client/WebSocketClient.ts` | 197 | WebSocket 客户端 |
| `src/modules/*.ts` | -- | 10 个 API 模块 |
| `src/utils/EventEmitter.ts` | 31 | 事件发射器 |
| `package.json` | -- | 包配置 (v1.0.19, MIT) |
