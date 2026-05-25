[根目录](../../CLAUDE.md) > [packages](..) > **mira-app-core**

# mira-app-core

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 确认接口签名不变，补充 EventArgs 优先级机制细节 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 核心库，提供不自动执行的共享基础能力，被 `mira-app-server`、`mira-storage-sqlite`、`mira-scripts-core` 等模块依赖。核心职责：

1. **事件管理器 (EventManager)**: 基于 Node.js EventEmitter 的事件系统，支持订阅/取消/广播，支持优先级排序（数字越大越先执行）
2. **库列表管理**: 读写 `librarys.json` 配置文件，管理多素材库的元信息
3. **共享类型**: `User`、`Session`、`WebSocketMessage` 等跨模块共享类型定义

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出 EventManager、getLibraries、saveLibraries 和共享类型
- **构建产物**: `dist/index.js` + `dist/index.d.ts`
- **构建命令**: `tsc` / `pnpm run build` / `pnpm run rebuild`

本模块是纯库，不独立启动。

## 对外接口

### EventManager (src/event-manager.ts)

```typescript
class EventManager extends EventEmitter {
  subscribe<T>(eventName: string, handler: (args: T) => void | boolean | Promise<boolean>, priority?: number): string
  subscribeOnce<T>(eventName: string, handler: (args: T) => void): string
  unsubscribe(subscriptionId: string): boolean
  broadcast<T>(eventName: string, args: T): Promise<boolean>
  dispose(): void
}
```

- 单例模式 `EventManager.instance`（也可 `new EventManager()` 独立实例化）
- `EventArgs` 基类携带 `eventName`、`args`、`whenOccurred`
- `broadcast` 按优先级排序执行，处理器返回 `false` 可中断传播链
- `EventSubscription` 句柄可调用 `cancel()` 取消订阅

### 库列表 (src/LibraryList.ts)

```typescript
getLibraries(dirPath?: string): Promise<any[]>
saveLibraries(dirPath?: string, libraries: any): Promise<void>
```

- 读写指定目录下的 `librarys.json`，文件不存在时自动创建空数组

### 共享类型

```typescript
type User = { id, username, password, role, permissions, created_at, updated_at, is_active, email? }
type Session = { token, user_id, created_at, expires_at, is_active }
interface WebSocketMessage = { action, requestId, libraryId, clientId, payload: { type, data } }
```

## 关键依赖与配置

- **依赖**: `axios` (HTTP 请求), `queue` (队列管理)
- **开发依赖**: `typescript`, `ts-node`, `@types/node`
- **TypeScript**: strict mode，目标 ES2020+

## 数据模型

本模块不直接管理数据库，但定义了核心业务类型 `User` 和 `Session`。

## 测试与质量

当前无独立测试文件。

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/index.ts` | 39 | 模块入口，导出所有公共 API 和类型 |
| `src/event-manager.ts` | 226 | EventManager + EventArgs + EventSubscription |
| `src/LibraryList.ts` | 46 | 库列表 JSON 文件读写 |
| `package.json` | -- | 包配置 (name: mira-app-core, v1.0.24) |
