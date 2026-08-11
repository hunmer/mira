# 变更记录(文档索引)

> 本记录只保留最近 5 条,倒序。仅记录 AI 上下文文档的生成/更新,非产品 Changelog。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-11 | 增量更新 | 重大变化:识别插件**双协议**(`ServerPlugin` vs `registerFileFormat`);plugins 从 3 扩到 13 个(含 10 格式插件);core/server 版本 2.0.1→2.0.3、路由 15→19;新增模块索引 mira-browser-extension/vue-masonry/landing-page;补建 mira-doc/vue-masonry/landing-page 的 CLAUDE.md;重写 plugins/CLAUDE.md + plugins/claude/overview.md;**深扫 ServerPluginManager.ts** 产出 `packages/mira-app-server/claude/plugin-system.md`;**清理 pnpm-workspace.yaml 2 条陈旧条目**(`mira-server-sdk-examples`、`n8n-nodes-mira-ws-trigger`);分支改回 main(shadcn-vue 迁移已合并);标注 mira_thumb_imagemagick 已移除 |
| 2026-08-05 | 全面更新 | 重点更新 mira-client UI 框架迁移现状(shadcn-vue 晚期);补齐根级详情文件(entrypoints/public-interfaces/dependencies-and-config/data-model/testing-and-quality/faq);修正 core/server 版本漂移(实际 v2.0.1);标注 tailwind.config.js 为死文件、workspace 陈旧条目 |
| 2026-06-09 | 全面重构 | 发现 mira-storage-sqlite / mira-server-sdk 已合并到 mira-app-core;新增 mira_duplicate_scanner 插件;重构所有 CLAUDE.md 为索引+详情分离 |
| 2026-05-26 | 增量更新 | mira-dashboard 替换为 mira-dashboard-next(shadcn-vue 重写);新增 mira_thumb_imagemagick;服务端新增 ThumbnailService/SettingsManager |
| 2026-05-20 | 初始化 | 首次生成完整架构文档,覆盖 10+ 模块 |
