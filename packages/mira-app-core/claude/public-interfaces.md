# 公开接口

## 核心导出 (src/index.ts)

```typescript
// 类型
export type User = { id, username, password, role, permissions, created_at, updated_at, is_active, email? }
export type Session = { token, user_id, created_at, expires_at, is_active }
export interface WebSocketMessage = { action, requestId, libraryId, clientId, payload: { type, data } }

// 事件系统
export class EventManager extends EventEmitter {
  subscribe<T>(eventName, handler, priority?): string
  subscribeOnce<T>(eventName, handler): string
  unsubscribe(subscriptionId): boolean
  broadcast<T>(eventName, args): Promise<boolean>
  dispose(): void
}
// 单例: EventManager.instance

// 库列表
export function getLibraries(dirPath?): Promise<any[]>
export function saveLibraries(dirPath?, libraries): Promise<void>
```

## 存储层 (src/storage/sqlite/)

```typescript
export interface ILibraryServerData {
  // 文件操作
  addFile(file): Promise<any>
  getFile(id): Promise<any>
  getFiles(query): Promise<any[]>
  deleteFile(id): Promise<boolean>
  updateFile(id, data): Promise<any>
  // 文件夹操作
  addFolder(folder): Promise<any>
  getFolders(query?): Promise<any[]>
  deleteFolder(id): Promise<boolean>
  updateFolder(id, data): Promise<any>
  // 标签操作
  addTag(tag): Promise<any>
  getTags(query?): Promise<any[]>
  deleteTag(id): Promise<boolean>
  updateTag(id, data): Promise<any>
  // 统计
  getFileStatistics(): Promise<any>
  // 导入
  importFiles(files, options?): Promise<any>
}

export class LibraryServerDataSQLite implements ILibraryServerData { ... }
```

## SDK (src/shared/sdk/)

```typescript
export class MiraClient {
  constructor(config: { baseUrl, wsUrl? })
  auth(): AuthModule
  user(): UserModule
  libraries(): LibraryModule
  plugins(): PluginModule
  files(): FileModule
  database(): DatabaseModule
  devices(): DeviceModule
  system(): SystemModule
  tags(): TagModule
  folders(): FolderModule
}

export class WebSocketClient { ... }
export class HttpClient { ... }
```

## package.json exports

```json
{
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./storage/sqlite": { "types": "./dist/storage/sqlite/index.d.ts", ... },
  "./shared/sdk": { "types": "./dist/shared/sdk/index.d.ts", "import": "./dist/shared/sdk/mira-sdk.esm.mjs", ... }
}
```
