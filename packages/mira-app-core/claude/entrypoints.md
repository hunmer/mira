# 入口与启动流程

## 包入口

本包是纯库，不提供可执行进程。所谓"入口"是导出路径。

### 主入口 `mira-app-core` → `src/index.ts`

```typescript
export type User = { id, username, password, role, permissions, created_at, updated_at, is_active, email? };
export type Session = { token, user_id, created_at, expires_at, is_active };
export interface WebSocketMessage { action, requestId, libraryId, clientId, payload: { type, data } };

export { EventArgs, EventSubscription, EventManager } from './event-manager';
export { saveLibraries, getLibraries } from './LibraryList';
export type * from './event-manager';
```

> 注：src/index.ts 注释标明 "Core exports for mira_core package (SDK only)"。

### 存储入口 `mira-app-core/storage/sqlite` → `src/storage/sqlite/index.ts`

```typescript
export { ILibraryServerData } from './ILibraryServerData';
export { LibraryServerDataSQLite } from './LibraryServerDataSQLite';
```

### SDK 入口 `mira-app-core/shared/sdk` → `src/shared/sdk/index.ts`

导出 MiraClient、WebSocketClient、10 个 Module、SDK 全部类型。
构建时通过 `vite.sdk.config.ts` 打包为 ESM bundle `dist/shared/sdk/mira-sdk.esm.mjs`（library name `MiraSDK`）。

## 启动流程

- `pnpm run start` → `node dist/index.js`：dist/index.js 由 tsc 从 src/index.ts 编译产出。由于 src/index.ts 仅含 export，执行后无副作用（不启动服务）。
- `pnpm run dev` / `start:ts` → `ts-node src/index.ts`：同上，开发模式直接跑源码。

## 使用示例（来自 SDK 入口注释）

```typescript
import { MiraClient } from 'mira-app-core/shared/sdk';
const client = new MiraClient('http://localhost:8081');
await client.auth().login('username', 'password');
const libraries = await client.libraries().getAll();
```
