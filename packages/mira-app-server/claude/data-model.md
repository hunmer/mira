# data-model

数据模型（基于 `src/types.ts`、`data/librarys.json`、`SettingsManager.ts`、扫描到的 SQLite 路径）。

## TypeScript 类型 (`src/types.ts`)

```ts
type User = {
  id: number;
  username: string;
  password: string;        // 哈希后存储
  role: string;            // super / admin / user
  permissions: string[];
  created_at: number;
  updated_at: number;
  is_active: boolean;
  email?: string;
};

type Session = {
  token: string;
  user_id: number;
  created_at: number;
  expires_at: number;
  is_active: boolean;
};

interface WebSocketMessage {
  action: string;
  requestId: string;
  libraryId: string;
  clientId: string;
  payload: { type: string; data: Record<string, any> };
}
```

## 服务端设置 (`data/settings.json`)

`ServerSettings`（`SettingsManager.ts`）：

```ts
interface ServerSettings {
  authRequired: boolean;     // 默认 true
  allowRegistration: boolean;// 默认 true
  dashboardPort?: number;    // 默认 5173
}
```

缺失时回退到 `DEFAULT_SETTINGS` 并写回。

## 用户库 SQLite (`data/users.db`)

- 由 `UserStorage.ts` 管理（15K，未逐表扫描）。
- 推断表：`users`（对应 `User`）、`sessions`（对应 `Session`）。具体建表 SQL 与索引未读取，标注为未发现。

## 素材库清单 (`data/librarys.json`)

数组结构（实测示例）：

```jsonc
[
  {
    "id": "1779533990551",        // 字符串 ID（时间戳）
    "name": "test1",
    "path": "D:\\test_library11", // 本地库根目录
    "type": "local",
    "description": "",
    "icon": "default",
    "customFields": {             // 库级自定义配置
      "path": "...",
      "enableHash": false,
      "enableAutoSync": true,
      "useHttpFile": true,
      "serverURL": "http://127.0.0.1",
      "serverPort": "8081"
    },
    "allowedRoles": ["super"],    // 访问该库所需角色（空数组=不限）
    "status": "active",
    "createdAt": "2026-05-23T10:59:50.551Z",
    "updatedAt": "2026-05-25T07:52:55.384Z"
  }
]
```

> 顶层冗余字段：`useHttpFile` / `serverURL` / `serverPort` 在示例中既出现在 `customFields` 内也出现在顶层（历史遗留，未规范化）。

## 各素材库 SQLite

- 每个库独立 SQLite 文件（位于库 `path` 下，由 `mira-app-core` 管理），接口契约 `ILibraryServerData`（from `mira-app-core/storage/sqlite`）。
- 具体 schema 由 `mira-app-core` 定义，本包未扫描到建表代码。

## 插件清单 (`src/plugins/plugins.json`)

```jsonc
[
  { "name": "mira_demo",              "enabled": false, "path": "mira_demo" },
  { "name": "mira_n8n",               "enabled": false, "path": "mira_n8n" },
  { "name": "mira_thumb_imagemagick", "enabled": false, "path": "node_modules/mira_thumb_imagemagick", "status": "active" },
  { "name": "mira_eagle_extension",   "enabled": true,  "path": "node_modules/mira_eagle_extension" }
]
```

重复文件扫描使用内置 `/fs/database/duplicates` 接口，不在插件清单中注册。

## 未发现

- 各素材库 SQLite 内的具体表结构（files / tags / folders / devices / statistics 等）—— 由 `mira-app-core` 实现，本包未体现。
- `users.db` 的建表 SQL 与字段细节（`UserStorage.ts` 仅扫类型，未读全）。
- 数据迁移 / 版本号机制 —— 未发现。
