# mira-dashboard-next

Mira 的 Web 管理面板。基于 Vue 3.5 + Tailwind CSS 4 + shadcn-vue（reka-ui）构建的 SPA，替代旧版 Vben Admin 实现。提供素材库/插件/管理员/设备/文件/统计/媒体维护（缩略图/元数据/库扫描/重复清理）/Eagle·Billfish 跨库导入/服务端运维（/server 实时日志，仅 super）/服务端设置等管理能力，支持中英文 i18n 与动态插件前端路由。

## 约定的规则

- 包管理：pnpm monorepo 子包（`private: true`，不发布）。
- 脚本（`package.json`）：
  - `dev`: `vite`（dev server 代理 `/api`、`/health` 到 `http://127.0.0.1:8081`，mira-app-server）
  - `build`: `vue-tsc -b && vite build`
  - `preview`: `vite preview`
- 无 test 脚本（未发现测试配置）。
- 路径别名 `@/*` -> `src/*`（tsconfig + vite）。
- UI 规则：仅 shadcn-vue（reka-ui），不引入其他 UI 框架；组件生成配置见 `components.json`（style=reka-mira, baseColor=zinc, iconLibrary=remixicon）。
- 表单：vee-validate + zod。
- API：**业务请求统一经 `src/api/modules/*` 调 `src/lib/miraClient.ts` 的 `getMiraClient()`**（mira-app-core workspace SDK，13 个 api 模块基本全走 SDK，少量老接口如插件商店代理仍走 axios）；`src/api/client.ts` 保留 axios 实例与 baseURL/token 运行配置（含 `handleUnauthorized()` 统一 401 处理）。
- 路由采用 hash 模式（`createWebHashHistory`）。

## 文件索引

| 路径 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、职责、认证架构、依赖 |
| [claude/conventions.md](claude/conventions.md) | 编码与工程约定 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 各目录职责划分 |
| [claude/entrypoints.md](claude/entrypoints.md) | 应用入口与构建命令 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 页面路由、API 模块、Store、共享组件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖、构建与运行时配置 |
| [claude/data-model.md](claude/data-model.md) | Pinia store 与类型 |
| [claude/file-map.md](claude/file-map.md) | 源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 |

## 扫描状态

- **版本**: 0.0.0 (private)
- **扫描时间**: 2026-08-25（增量，上次 2026-08-23；基线 2d1710c1 以来 28 个 src 文件变更）
- **本次要点**:
  - **新增 `/server` 运维页**（`views/mira/server/index.vue` 299 行，路由 meta roles: ['super']）：SSE 实时日志（/logs/stream）、健康检查、停止服务（stopServer）；router 与 DefaultLayout 加菜单项。
  - **Eagle/Billfish 跨库导入**：新 `views/mira/library/ImportDialog.vue`（215 行，importFrom 发起 + 轮询进度 + 取消）；LibraryFormDialog 加「文件导入方式」Select（copy/move/link 写 `customFields.importType`）。
  - **settings 拆分**：`views/mira/settings/index.vue` -515 行，拆出 DownloadPanel（355 行 Cookie 站点/下载）/ServerPanel/PluginPanel/SiteEditDialog/ManualCookieDialog 5 个组件；插件源从 localStorage 一次性迁移到服务端设置（usePluginSources 改造 + 迁移后清本地键）。
  - **media 卡片**：DatabaseScanCard 加 matchMode Select（name-size/size/name）与重复文件链接；Metadata/ThumbnailCard 适配重导 Hook。
  - api：library +importFrom/getImportProgress/cancelImport（SDK）、fileManager scanDuplicates matchMode、plugin +fetchStore（→ `/api/plugins/store` 代理）、system +stopServer；client.ts 统一 401。
  - i18n en/zh-CN 各 +52 键。
- **测试**: 无（未发现）
- **下一步建议**: `claude/file-map·public-interfaces` 未随新页面/面板逐条重写，下次深扫补全
