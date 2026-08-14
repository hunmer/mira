# Mira Server API 与 SDK 覆盖报告

生成时间: 2026-08-14T08:35:21.360Z

匹配键: HTTP method + 归一化路径（动态参数统一为 `:param`，query string 不参与匹配）。

## 总览

| 分类 | 数量 | 说明 |
|------|------|------|
| covered | 65 | SDK 有等价 method+path |
| partial | undefined | path 匹配但 method 不匹配 |
| missing | 61 | SDK 无对应方法 |
| excluded | 13 | 资源/流式/SPA/通配, 不生成普通 CRUD |
| dynamic | 7 | 插件运行时注册/正则路由 |

固定 JSON API 共 126 条, 已 100% 分类（covered 65 / partial undefined / missing 61）。

## Missing (SDK 无对应方法)

| method | path | 域 | 来源 | SDK | 备注 |
|--------|------|----|------|-----|------|
| GET | `/api/admins` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:17 | - |  |
| POST | `/api/admins` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:40 | - |  |
| PUT | `/api/admins/:param` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:112 | - |  |
| DELETE | `/api/admins/:param` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:158 | - |  |
| GET | `/api/admins/:param/tokens` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:203 | - |  |
| POST | `/api/admins/:param/tokens` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:214 | - |  |
| PUT | `/api/admins/:param/tokens/:param` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:235 | - |  |
| DELETE | `/api/admins/:param/tokens/:param` | admins | packages/mira-app-server/src/routes/AdminsRouter.ts:256 | - |  |
| POST | `/api/database/query` | database | packages/mira-app-server/src/routes/DatabaseRoutes.ts:107 | - |  |
| POST | `/api/devices/broadcast` | devices | packages/mira-app-server/src/routes/DeviceRoutes.ts:38 | - |  |
| POST | `/api/devices/:param/disconnect` | devices | packages/mira-app-server/src/routes/DeviceRoutes.ts:42 | - |  |
| POST | `/api/devices/:param/message` | devices | packages/mira-app-server/src/routes/DeviceRoutes.ts:46 | - |  |
| POST | `/api/devices/:param/test` | devices | packages/mira-app-server/src/routes/DeviceRoutes.ts:47 | - |  |
| GET | `/api/devices/:param/messages` | devices | packages/mira-app-server/src/routes/DeviceRoutes.ts:48 | - |  |
| GET | `/api/download/progress/:param` | download | packages/mira-app-server/src/routes/DownloadRoutes.ts:57 | - |  |
| POST | `/api/fs/mkdir` | fs | packages/mira-app-server/src/routes/FsRouter.ts:47 | - |  |
| GET | `/api/fs/dirs` | fs | packages/mira-app-server/src/routes/FsRouter.ts:63 | - |  |
| GET | `/api/fs/list` | fs | packages/mira-app-server/src/routes/FsRouter.ts:101 | - |  |
| POST | `/api/fs/move` | fs | packages/mira-app-server/src/routes/FsRouter.ts:170 | - |  |
| POST | `/api/fs/remove` | fs | packages/mira-app-server/src/routes/FsRouter.ts:205 | - |  |
| POST | `/api/fs/sync` | fs | packages/mira-app-server/src/routes/FsRouter.ts:239 | - |  |
| GET | `/api/fs/database/missing` | fs | packages/mira-app-server/src/routes/FsRouter.ts:265 | - |  |
| DELETE | `/api/fs/database/missing` | fs | packages/mira-app-server/src/routes/FsRouter.ts:281 | - |  |
| POST | `/api/fs/database/new` | fs | packages/mira-app-server/src/routes/FsRouter.ts:301 | - |  |
| POST | `/api/fs/database/new/import` | fs | packages/mira-app-server/src/routes/FsRouter.ts:320 | - |  |
| DELETE | `/api/fs/database/new` | fs | packages/mira-app-server/src/routes/FsRouter.ts:349 | - |  |
| POST | `/api/fs/database/duplicates` | fs | packages/mira-app-server/src/routes/FsRouter.ts:385 | - |  |
| DELETE | `/api/fs/database/duplicates` | fs | packages/mira-app-server/src/routes/FsRouter.ts:399 | - |  |
| POST | `/api/fs/download` | fs | packages/mira-app-server/src/routes/FsRouter.ts:419 | - |  |
| GET | `/api/libraries/:param/stats` | libraries | packages/mira-app-server/src/routes/LibraryRoutes.ts:397 | - |  |
| POST | `/api/libraries/:param/query` | libraries | packages/mira-app-server/src/routes/LibraryRoutes.ts:467 | - |  |
| POST | `/api/libraries/:param/execute` | libraries | packages/mira-app-server/src/routes/LibraryRoutes.ts:507 | - |  |
| GET | `/api/libraries/:param/schema/:param` | libraries | packages/mira-app-server/src/routes/LibraryRoutes.ts:551 | - |  |
| PUT | `/api/libraries/:param/record/:param/:param` | libraries | packages/mira-app-server/src/routes/LibraryRoutes.ts:588 | - |  |
| POST | `/api/plugins/sync-meta` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:504 | - |  |
| POST | `/api/plugins/upload` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:523 | - |  |
| POST | `/api/plugins/toggle-status` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:714 | - |  |
| POST | `/api/plugins/disable-all` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:767 | - |  |
| POST | `/api/plugins/:param/start` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:803 | - |  |
| POST | `/api/plugins/:param/stop` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:851 | - |  |
| GET | `/api/plugins/:param/config` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:898 | - |  |
| PUT | `/api/plugins/:param/config` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:931 | - |  |
| GET | `/api/statistics/:param/upload` | statistics | packages/mira-app-server/src/routes/StatisticsRouter.ts:22 | - |  |
| GET | `/api/statistics/:param/upload/daily` | statistics | packages/mira-app-server/src/routes/StatisticsRouter.ts:53 | - |  |
| GET | `/api/statistics/:param/file-types` | statistics | packages/mira-app-server/src/routes/StatisticsRouter.ts:71 | - |  |
| GET | `/api/statistics/:param/recent-uploads` | statistics | packages/mira-app-server/src/routes/StatisticsRouter.ts:89 | - |  |
| GET | `/api/thumb/scan` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:20 | - |  |
| GET | `/api/thumb/progress` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:29 | - |  |
| GET | `/api/thumb/cancel` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:38 | - |  |
| GET | `/api/thumb/stats` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:43 | - |  |
| GET | `/api/thumb/generators` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:52 | - |  |
| GET | `/api/thumb/sync` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:60 | - |  |
| GET | `/api/thumb/metadata/stats` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:69 | - |  |
| GET | `/api/thumb/metadata/scan` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:75 | - |  |
| GET | `/api/thumb/metadata/progress` | thumb | packages/mira-app-server/src/routes/ThumbRouter.ts:87 | - |  |
| PUT | `/api/user/change-password` | user | packages/mira-app-server/src/routes/UserRouter.ts:100 | - |  |
| POST | `/api/user/avatar` | user | packages/mira-app-server/src/routes/UserRouter.ts:174 | - |  |
| GET | `/api/user/tokens` | user | packages/mira-app-server/src/routes/UserRouter.ts:211 | - |  |
| GET | `/api/user/avatar/:param` | user | packages/mira-app-server/src/routes/UserRouter.ts:233 | - |  |
| GET | `/api/plugin-routes` | http-server-direct | packages/mira-app-server/src/HttpServer.ts:364 | - |  |
| GET | `/api/plugin-routes/:param` | http-server-direct | packages/mira-app-server/src/HttpServer.ts:403 | - |  |

## Partial (path 匹配, method 不匹配)

| method | path | 域 | 来源 | SDK | 备注 |
|--------|------|----|------|-----|------|

## Excluded (资源/流式/静态, 不生成普通 CRUD)

| method | path | 域 | 来源 | SDK | 备注 |
|--------|------|----|------|-----|------|
| GET | `/api/files/thumb/:param/:param` | files | packages/mira-app-server/src/routes/FileRoutes.ts:358 | - | thumbnail image stream |
| GET | `/api/files/extra/:param/:param` | files | packages/mira-app-server/src/routes/FileRoutes.ts:375 | - | extra file resource stream |
| GET | `/api/files/extra/:param/:param/*` | files | packages/mira-app-server/src/routes/FileRoutes.ts:393 | - | extra file resource wildcard |
| GET | `/api/files/preview/:param/:param/index.m3u8` | files | packages/mira-app-server/src/routes/FileRoutes.ts:451 | - | HLS manifest resource |
| GET | `/api/files/preview/:param/:param/segment/:param.ts` | files | packages/mira-app-server/src/routes/FileRoutes.ts:480 | - | HLS segment resource |
| GET | `/api/files/preview/:param/:param` | files | packages/mira-app-server/src/routes/FileRoutes.ts:509 | - | preview file stream |
| GET | `/api/files/file/:param/:param` | files | packages/mira-app-server/src/routes/FileRoutes.ts:540 | - | raw file stream (Range support) |
| GET | `/api/plugins/:param/:param/*` | api-root | packages/mira-app-server/src/routes/HttpRouter.ts:148 | - | plugin static/resource wildcard |
| GET | `/api/plugins/install/stream` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:369 | - | SSE install progress stream |
| GET | `/api/plugins/:param/icon/:param` | plugins | packages/mira-app-server/src/routes/PluginRoutes.ts:1017 | - | plugin icon image resource |
| GET | `/` | http-server-direct | packages/mira-app-server/src/HttpServer.ts:285 | - | root redirect to /web/ |
| GET | `/server-plugins/:param/:param/*` | http-server-direct | packages/mira-app-server/src/HttpServer.ts:311 | - | plugin static resource wildcard |
| GET | `/api/logs/stream` | http-server-direct | packages/mira-app-server/src/HttpServer.ts:467 | - | SSE log stream, not JSON API |

## Dynamic (插件运行时注册, 无法静态枚举)

- `HttpRouter` 提供插件运行时 `POST/GET/PUT/DELETE/PATCH /api/*` 动态注册（来源 `packages/mira-app-server/src/routes/HttpRouter.ts:52-64`）。
- 插件静态资源通配 `/api/plugins/:libraryId/:pluginName/*`。
- SPA 正则路由 `/dashboard`、`/web`。
- 建议: 需要时提供通用 plugin request API 或 URL builder, 不逐一建 SDK 方法。

## Covered 明细

| method | path | 域 | SDK 方法 |
|--------|------|----|---------|
| GET | `/api/auth/codes` | auth | Auth.getCodes |
| POST | `/api/auth/register` | auth | Auth.register |
| POST | `/api/auth/login` | auth | Auth.login |
| POST | `/api/auth/logout` | auth | Auth.logout |
| GET | `/api/auth/verify` | auth | Auth.verify |
| GET | `/api/cookie-sites` | cookie-sites | CookieSite.getAll |
| POST | `/api/cookie-sites` | cookie-sites | CookieSite.create |
| PUT | `/api/cookie-sites/:param` | cookie-sites | CookieSite.update |
| PUT | `/api/cookie-sites/:param/default` | cookie-sites | CookieSite.setDefault |
| DELETE | `/api/cookie-sites/:param` | cookie-sites | CookieSite.delete |
| GET | `/api/database/tables` | database | Database.getTables |
| GET | `/api/database/tables/:param/data` | database | Database.getTableData |
| GET | `/api/database/tables/:param/schema` | database | Database.getTableSchema |
| GET | `/api/devices` | devices | Device.getAll |
| GET | `/api/devices/library/:param` | devices | Device.getByLibrary |
| POST | `/api/devices/disconnect` | devices | Device.disconnect |
| POST | `/api/devices/send-message` | devices | Device.sendMessage |
| GET | `/api/devices/stats` | devices | Device.getStats |
| POST | `/api/download/start` | download | File.batchImportFromUrls |
| POST | `/api/files/upload` | files | File.upload, File.writeFile |
| POST | `/api/files/cover/:param/:param` | files | File.setCover |
| DELETE | `/api/files/:param/trash` | files | File.emptyTrash |
| POST | `/api/files/batch-delete` | files | File.batchDelete |
| POST | `/api/files/batch-recover` | files | File.batchRestoreFiles |
| POST | `/api/files/recover` | files | File.restoreFile |
| DELETE | `/api/files/:param/:param` | files | File.delete |
| POST | `/api/files/metadata` | files | File.getMetadataByIds |
| POST | `/api/files/getFiles` | files | File.getFiles |
| POST | `/api/files/getFile` | files | File.getFile |
| POST | `/api/files/getPreviewViewers` | files | File.getPreviewViewers |
| POST | `/api/files/rename` | files | File.renameFile |
| POST | `/api/files/update` | files | File.updateFile |
| GET | `/api/folders/all` | folders | Folder.getAll |
| POST | `/api/folders/query` | folders | Folder.query |
| POST | `/api/folders/create` | folders | Folder.create |
| PUT | `/api/folders/update` | folders | Folder.update |
| PUT | `/api/folders/sort-index` | folders | Folder.updateSortIndex |
| DELETE | `/api/folders/delete` | folders | Folder.delete |
| POST | `/api/folders/file/set` | folders | Folder.setFileFolder |
| GET | `/api/folders/file/:param` | folders | Folder.getFileFolder |
| GET | `/api/libraries` | libraries | Library.getAll |
| POST | `/api/libraries` | libraries | Library.create |
| PUT | `/api/libraries/:param` | libraries | Library.update |
| PATCH | `/api/libraries/:param/status` | libraries | Library.setStatus |
| DELETE | `/api/libraries/:param` | libraries | Library.delete |
| GET | `/api/plugins/web` | plugins | Plugin.getWeb |
| GET | `/api/plugins` | plugins | Plugin.getAll |
| GET | `/api/plugins/by-library` | plugins | Plugin.getByLibrary |
| POST | `/api/plugins/install` | plugins | Plugin.install |
| DELETE | `/api/plugins/:param` | plugins | Plugin.uninstall |
| GET | `/api/plugins/:param` | plugins | Plugin.getById |
| GET | `/api/settings` | settings | Settings.get |
| PUT | `/api/settings` | settings | Settings.update |
| GET | `/api/tags/all` | tags | Tag.getAll |
| POST | `/api/tags/query` | tags | Tag.query |
| POST | `/api/tags/create` | tags | Tag.create |
| PUT | `/api/tags/update` | tags | Tag.update |
| PUT | `/api/tags/sort-index` | tags | Tag.updateSortIndex |
| DELETE | `/api/tags/delete` | tags | Tag.delete |
| POST | `/api/tags/file/set` | tags | Tag.setFileTags |
| GET | `/api/tags/file/:param` | tags | Tag.getFileTags |
| GET | `/api/user/info` | user | User.getInfo |
| PUT | `/api/user/info` | user | User.updateInfo |
| GET | `/api/health` | http-server-direct | System.getHealth |
| GET | `/health` | http-server-direct | System.getSimpleHealth |
