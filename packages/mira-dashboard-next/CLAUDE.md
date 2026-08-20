# mira-dashboard-next

Mira 的 Web 管理面板。基于 Vue 3.5 + Tailwind CSS 4 + shadcn-vue（reka-ui）构建的 SPA，替代旧版 Vben Admin 实现。提供素材库/插件/管理员/设备/文件/统计/媒体维护（缩略图/元数据/库扫描）/服务端设置等管理能力，支持中英文 i18n 与动态插件前端路由。

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
- API：**业务请求统一经 `src/api/modules/*` 调 `src/lib/miraClient.ts` 的 `getMiraClient()`**（mira-app-core workspace SDK，12/13 模块已迁移）；`src/api/client.ts` 仅保留 axios 实例与 baseURL/token 运行时配置（`getApiBaseURL` 供 miraClient 复用）。
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
- **扫描时间**: 2026-08-20（上次 2026-08-05；本次为增量核对：git log since 2026-08-11，19 commits，src 33 增 0 删 43 改）
- **本次要点**:
  - API 层迁移到 mira-app-core SDK：新增 `src/lib/miraClient.ts`（`getMiraClient()` 单例），12/13 个 `api/modules` 已改走 SDK；axios `client.ts` 仅剩 baseURL/token 配置职责。
  - 路由 10→11 个业务子路由：删 `/thumbnail`（并入新 `/media` 页：ThumbnailCard/MetadataCard/DatabaseScanCard），新增 `/settings`（服务端设置 + cookie 站点管理）与 `/media`（super/admin）。
  - 新组件/页面：ui 新增 `combobox`/`input-group`/`alert-dialog`（共 30 个）；`LibraryTreeSelect/Node`、`PageLoading`；admin `TokenManageDialog`、library `ShareDialog`（qrcode 分享）、plugin `InstallTerminalDialog`（安装终端）；composables 新增 `useConfirmDialog`/`usePluginSources`。
  - api/modules 新增 `cookieSites.ts`（cookieSiteApi）、`download.ts`（downloadApi，批量 URL 导入）。
- **测试**: 无（未发现）
- **下一步建议**: `react-selectable-fast`（React 包）仍在 dependencies，疑似遗留可清理；types/mira.ts 新实体未逐字段展开。
