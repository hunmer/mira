# 变更记录(文档索引)

> 本记录只保留最近 5 条,倒序。仅记录 AI 上下文文档的生成/更新,非产品 Changelog。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | 基线 08-11(约 200+ 提交):版本 core→2.0.8/server→2.0.9/client→2.0.9;**新建 mira-plugin-ui 全套文档(12 文件)+ vue-selection-box 轻量文档;根索引补入此前遗漏的 mira_mobile**;plugins 13→14(+mira_tiptap_format 新建文档;mira_gallery_dl 补记旧协议;mira_duplicate_scanner 08-13 移除);SDK 模块 10→17、覆盖率 117/128;server 新增 MCP 服务与多命令 CLI;client UI 52 组件/IPC 18 Handler/15 Store/i18n/悬浮球;dashboard API 迁移到 SDK;extension src 54→101;landing-page 移除 shadcn registry 改静态导出;workspace.yaml 7→9 包;根级 module-index/overview/file-map/testing-and-quality 等同步重写;`.claude/index.json` 同步。**后续优化**:补建其余 11 个插件 CLAUDE.md(14 个齐);核对 online_client_plugins(4 个在线插件全独立,11 个 web 查看器无在线分发);清理 client vite SCSS 残留注入与 dashboard react-selectable-fast 遗留依赖;dependency-switch 配置确认已移除并修正文档 |
| 2026-08-11 | 增量更新 | 重大变化:识别插件**双协议**(`ServerPlugin` vs `registerFileFormat`);plugins 从 3 扩到 13 个(含 10 格式插件);core/server 版本 2.0.1→2.0.3、路由 15→19;新增模块索引 mira-browser-extension/vue-masonry/landing-page;补建 mira-doc/vue-masonry/landing-page 的 CLAUDE.md;重写 plugins/CLAUDE.md + plugins/claude/overview.md;**深扫 ServerPluginManager.ts** 产出 `packages/mira-app-server/claude/plugin-system.md`;**清理 pnpm-workspace.yaml 2 条陈旧条目**(`mira-server-sdk-examples`、`n8n-nodes-mira-ws-trigger`);分支改回 main(shadcn-vue 迁移已合并);标注 mira_thumb_imagemagick 已移除 |
| 2026-08-05 | 全面更新 | 重点更新 mira-client UI 框架迁移现状(shadcn-vue 晚期);补齐根级详情文件(entrypoints/public-interfaces/dependencies-and-config/data-model/testing-and-quality/faq);修正 core/server 版本漂移(实际 v2.0.1);标注 tailwind.config.js 为死文件、workspace 陈旧条目 |
| 2026-06-09 | 全面重构 | 发现 mira-storage-sqlite / mira-server-sdk 已合并到 mira-app-core;新增 mira_duplicate_scanner 插件;重构所有 CLAUDE.md 为索引+详情分离 |
| 2026-05-26 | 增量更新 | mira-dashboard 替换为 mira-dashboard-next(shadcn-vue 重写);新增 mira_thumb_imagemagick;服务端新增 ThumbnailService/SettingsManager |
