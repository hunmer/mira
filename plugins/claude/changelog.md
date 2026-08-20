# 变更记录

> 本记录只保留最近 5 条,倒序。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | 插件清单 13 → 14:新增 mira_tiptap_format(协议 B,+.tiptap 格式与 Vue3 编辑器前端,新建独立 CLAUDE.md);补记 mira_gallery_dl 为协议 A 类深度插件(getRoutes/registerRounter);版本修正 mira_3d_format 1.0.2、mira_spine_format 1.1.1、psd-viewer 1.0.1;注册表更正:源码侧为 `plugins.recommend.json`(12 条),运行时在 server `src/plugins/plugins.json`;确认 mira_duplicate_scanner 已移除(8-13,功能内置 DuplicateScanner)。 |
| 2026-08-13 | 功能内置 | 重复文件扫描迁移到 mira-app-server 与 Dashboard 数据库扫描卡片，移除 mira_duplicate_scanner 插件 |
| 2026-08-11 | 重大更新 | 插件清单从 3 扩到 13;识别并文档化**双协议**(`extends ServerPlugin` vs `registerFileFormat`);重写 plugins/CLAUDE.md + overview.md;标注 mira_thumb_imagemagick 已移除 |
| 2026-06-09 | 结构重构 | 新增 mira_duplicate_scanner 插件;重构文档为索引+详情分离 |
| 2026-05-26 | 增量更新 | 新增 mira_thumb_imagemagick 插件(本次确认已移除) |
