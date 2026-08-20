# 公开接口

基于 src/index.ts、src/event-manager.ts、src/storage/sqlite/index.ts、src/shared/sdk/index.ts 的导出。

## 核心导出（mira-app-core）

### 类型

```typescript
export type User = {
  id: number; username: string; password: string; role: string;
  permissions: string[]; created_at: number; updated_at: number;
  is_active: boolean; email?: string;
};

export type Session = {
  token: string; user_id: number; created_at: number;
  expires_at: number; is_active: boolean;
};

export interface WebSocketMessage {
  action: string; requestId: string; libraryId: string; clientId: string;
  payload: { type: string; data: Record<string, any> };
};
```

### 事件系统（来自 event-manager.ts）

```typescript
export class EventArgs {
  eventName: string;
  readonly whenOccurred: Date;
  args: Record<string, any>;
  constructor(eventName?: string, args?: Record<string, any>);
}

export class EventSubscription<T extends EventArgs = EventArgs> {
  readonly id: string;        // 形如 sub_<timestamp>_<rand>
  readonly isActive: boolean;
  // 构造参数：eventName, handler, priority=0
}

export class EventManager /* extends EventEmitter */ {
  static instance: EventManager;          // 单例
  subscribe<T>(eventName, handler, priority?): string;
  subscribeOnce<T>(eventName, handler): string;
  unsubscribe(subscriptionId): boolean;
  broadcast<T>(eventName, args): Promise<boolean>;  // 处理器返回 false 中断
  dispose(): void;
}
```

### 库列表（来自 LibraryList.ts）

```typescript
export function getLibraries(dirPath?: string): Promise<any[]>;
export function saveLibraries(dirPath: string, libraries: any[]): Promise<void>;
```

## 存储接口（mira-app-core/storage/sqlite）

```typescript
export interface ILibraryServerData {
  // 文件
  addFile(file): Promise<any>;
  getFile(id): Promise<any>;
  getFiles(query): Promise<any[]>;
  deleteFile(id): Promise<boolean>;
  updateFile(id, data): Promise<any>;
  // 文件夹
  addFolder(folder): Promise<any>;
  getFolders(query?): Promise<any[]>;
  deleteFolder(id): Promise<boolean>;
  updateFolder(id, data): Promise<any>;
  // 标签
  addTag(tag): Promise<any>;
  getTags(query?): Promise<any[]>;
  deleteTag(id): Promise<boolean>;
  updateTag(id, data): Promise<any>;
  // 统计 / 导入
  getFileStatistics(): Promise<any>;
  importFiles(files, options?): Promise<any>;
}

export class LibraryServerDataSQLite implements ILibraryServerData { /* mixins 组合 */ }
```

## SDK 接口（mira-app-core/shared/sdk）

```typescript
export class MiraClient {
  constructor(config: { baseUrl: string; wsUrl?: string });
  auth(): AuthModule;
  user(): UserModule;
  libraries(): LibraryModule;
  plugins(): PluginModule;
  files(): FileModule;
  database(): DatabaseModule;
  devices(): DeviceModule;
  system(): SystemModule;
  tags(): TagModule;
  folders(): FolderModule;
  cookieSites(): CookieSiteModule;
  settings(): SettingsModule;
  admins(): AdminModule;
  downloads(): DownloadModule;
  fs(): FileSystemModule;
  statistics(): StatisticsModule;
  thumbnails(): ThumbnailModule;
}

export class WebSocketClient { /* ws 封装 */ }
export class HttpClient { /* axios 封装 */ }

// 17 个 Module：AuthModule、UserModule、LibraryModule、PluginModule、
// FileModule、DatabaseModule、DeviceModule、SystemModule、TagModule、FolderModule、
// CookieSiteModule、SettingsModule、AdminModule、DownloadModule、
// FileSystemModule、StatisticsModule、ThumbnailModule
```

> 各 Module 的方法签名本次未逐一扫描，需查阅 src/shared/sdk/modules/*.ts。
> SDK 覆盖审计（`.audit/sdk-coverage-report.md`，2026-08-19）：server 固定 JSON API 128 条中 covered 117 / missing 11 / excluded 13 / dynamic 7。

## package.json exports 映射

| 子路径 | types | 运行时 |
|--------|-------|--------|
| `.` | dist/index.d.ts | dist/index.js |
| `./storage/sqlite` | dist/storage/sqlite/index.d.ts | dist/storage/sqlite/index.js |
| `./shared/sdk` | dist/shared/sdk/index.d.ts | dist/shared/sdk/mira-sdk.esm.mjs（import/default），dist/shared/sdk/index.js（require） |
