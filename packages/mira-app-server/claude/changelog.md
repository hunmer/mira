# changelog

文档变更记录（倒序）。本次为按新结构（索引 + 详情分离，10 文件）的全量重写。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-23 | 增量更新 | 08-20 以来小改（版本仍 2.0.9）：`ServerPluginManager` 增从 package.json 同步展示 meta 到 plugins.json 的能力（兼容源码侧 `plugins/plugins/plugins.json` 3 条目展示注册表）；运行时 `src/plugins/plugins.json` 扩至 11 条（新 3 个深度插件 mira_image_cropper/mira_format_converter/mira_ai_sdk enabled，path 回指仓库 plugins/ 目录）；改动点：HttpServer、middleware/permission、FileRoutes、MetadataService。 |
| 2026-08-20 | 增量更新 | 版本 2.0.1 → 2.0.9（8-11 扫描时为 2.0.3）；路由 17 → 19 个文件（新增 `CookieSitesRouter` `/api/cookie-sites`、`DownloadRoutes` `/api/download`）；CLI 重构为完整 SDK 工具（顶层 5 命令 + 11 域子命令 + doctor，凭证多 profile `~/.mira/credentials.json`，版本号改从 package.json 读取）；新增 `src/mcp/` MCP 服务（`--mcp` stdio，`@modelcontextprotocol/sdk`）、`src/sync/`、`src/services/` 扩至 7 个服务；构建改为 `copy-dashboard + copy-web + tsc`；CI 将 server 依赖打入 Electron 发行版；`ServerPluginManager` 576 → 660 行。 |
| 2026-08-11 | 增量 | 深扫 `ServerPluginManager.ts`，产出 `plugin-system.md`；记录版本 2.0.3 与 cli.ts 内嵌版本号不一致。 |
| 2026-08-05 | 重建（v2.0.1） | 按 `package.json` v2.0.1 全量重写 `CLAUDE.md` 与 `claude/` 详情；新增 `conventions.md` / `module-responsibilities.md` / `entrypoints.md` / `dependencies-and-config.md` / `data-model.md` / `testing-and-quality.md`；重写 `overview.md` / `public-interfaces.md` / `file-map.md`；删除旧 `faq.md`（内容并入 conventions）。修正：补全 17 个路由、6 个 Handler、`ServerSettings` 默认值、`plugins.json` 实际启用项、`.env.example` 字段、MiraServer 启动序列。 |
| 2026-06-09 | 结构重构 | 拆分为索引 + 详情；当时版本 1.0.25。 |
| 2026-05-26 | 增量更新 | 新增 ThumbnailService、SettingsManager、ThumbRouter、StatisticsRouter。 |
