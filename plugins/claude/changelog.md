# 变更记录

> 本记录只保留最近 5 条,倒序。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-25 | 增量更新 | **补建 3 个深度插件独立 CLAUDE.md**(image_cropper 112 行 1 路由 / format_converter 583 行 4 路由调 ImageMagick+FFmpeg / ai_sdk 571 行 11 路由 + ai 依赖,16/16 齐全);落档:librarys.json 与 librarys-mac.json 删除、4 个 data/config.json 运行时文件去 git 化、AiSdkManager.js 重构为 AI 测试合并对话框 |
| 2026-08-23 | 增量更新 | 插件 14→16:新增 mira_image_cropper/mira_format_converter/mira_ai_sdk(均为「HTTP 路由 + web/ SPA」深度插件,默认 enabled,暂无独立 CLAUDE.md);recommend 12→11 条;新增源码侧展示注册表 plugins/plugins.json(3 条);server 运行时注册表 11 条(新 3 插件 path 回指仓库目录);mira_n8n 删除落档;online_client_plugins 已建独立文档 |
| 2026-08-20 | 补建文档 | 补建 11 个插件 CLAUDE.md(mira_3d_format、mira_eagle_extension、mira_epub_format、mira_gallery_dl、mira_livp_format、mira_lottie_format、mira_pag_format、mira_spine_format、mira_swf_format、mira_zipper_format、pdf-viewer);14 个活跃插件文档齐全 |
| 2026-08-20 | 增量更新 | 插件清单 13 → 14:新增 mira_tiptap_format(协议 B,+.tiptap 格式与 Vue3 编辑器前端,新建独立 CLAUDE.md);补记 mira_gallery_dl 为协议 A 类深度插件(getRoutes/registerRounter);版本修正 mira_3d_format 1.0.2、mira_spine_format 1.1.1、psd-viewer 1.0.1;注册表更正:源码侧为 `plugins.recommend.json`(12 条),运行时在 server `src/plugins/plugins.json`;确认 mira_duplicate_scanner 已移除(8-13,功能内置 DuplicateScanner)。 |
| 2026-08-13 | 功能内置 | 重复文件扫描迁移到 mira-app-server 与 Dashboard 数据库扫描卡片，移除 mira_duplicate_scanner 插件 |
| 2026-08-11 | 重大更新 | 插件清单从 3 扩到 13;识别并文档化**双协议**(`extends ServerPlugin` vs `registerFileFormat`);重写 plugins/CLAUDE.md + overview.md;标注 mira_thumb_imagemagick 已移除 |
