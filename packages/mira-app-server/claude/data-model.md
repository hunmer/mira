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
      "enableAutoBackup": true,   // v3.0 起库创建默认带
      "importType": "copy",       // v3.0 起：copy / move / link 导入模式（见 docs/library-import-modes.md）
      "skipSameName": false,      // v3.0.2 起：同文件夹同名文件直接复用已有记录（导入返回 duplicate:true）
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
> v3.0.2 素材库物理迁移：`LibraryRelocationService` 完成后会把本文件中对应库的 `path` 与 `customFields.path` 改写为目标路径并保留其余字段。

## 各素材库 SQLite

- 每个库独立 SQLite 文件（位于库 `path` 下，由 `mira-app-core` 管理），接口契约 `ILibraryServerData`（from `mira-app-core/storage/sqlite`）。
- 具体 schema 由 `mira-app-core` 定义，本包未扫描到建表代码。
- 由 `LibraryRoutes` stats 查询可证（2026-11）：文件夹数量从 `folders` 表计数；文件标签存于 `files.tags` JSON 列（`json_each` 展开），不再是独立 `file_tags` 表；文件类型分布走 `getFileTypeStatistics()`。

## 插件清单 (`src/plugins/plugins.json`)

```jsonc
[
  { "name": "mira_demo",              "enabled": false, "path": "mira_demo" },
  { "name": "mira_thumb_imagemagick", "enabled": false, "path": "node_modules/mira_thumb_imagemagick", "status": "active" },
  { "name": "mira_eagle_extension",   "enabled": true,  "path": "node_modules/mira_eagle_extension" }
]
```

> 2026-11 起注册表共 15 条（v3.0.1 时 11 条）：新增 mira_html_format、mira_font_format、mira_office_viewer（均 enabled）与 mira_semantic_search（disabled），并全量重写补齐 title/category/tags 展示 meta。

重复文件扫描使用内置 `/fs/database/duplicates` 接口，不在插件清单中注册。

## 未发现

- 各素材库 SQLite 内的具体表结构（files / tags / folders / devices / statistics 等）—— 由 `mira-app-core` 实现，本包未体现。
- `users.db` 的建表 SQL 与字段细节（`UserStorage.ts` 仅扫类型，未读全）。
- 数据迁移 / 版本号机制 —— 未发现。
