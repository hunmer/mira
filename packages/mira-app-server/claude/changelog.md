# changelog

文档变更记录（倒序）。本次为按新结构（索引 + 详情分离，10 文件）的全量重写。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-05 | 重建（v2.0.1） | 按 `package.json` v2.0.1 全量重写 `CLAUDE.md` 与 `claude/` 详情；新增 `conventions.md` / `module-responsibilities.md` / `entrypoints.md` / `dependencies-and-config.md` / `data-model.md` / `testing-and-quality.md`；重写 `overview.md` / `public-interfaces.md` / `file-map.md`；删除旧 `faq.md`（内容并入 conventions）。修正：补全 17 个路由、6 个 Handler、`ServerSettings` 默认值、`plugins.json` 实际启用项、`.env.example` 字段、MiraServer 启动序列；指出 `cli.ts` 内嵌版本号（1.0.17 / v1.0.0）与 package.json（2.0.1）不一致。 |
| 2026-06-09 | 结构重构 | 拆分为索引 + 详情；当时版本 1.0.25。 |
| 2026-05-26 | 增量更新 | 新增 ThumbnailService、SettingsManager、ThumbRouter、StatisticsRouter。 |
| 2026-05-25 | 增量更新 | 补充完整路由清单、核心类、Handler、LibraryWatcher、HttpHook。 |
| 2026-05-20 | 初始化 | 首次生成模块文档。 |
