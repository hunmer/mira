# mira-plugin-ui 变更记录（文档索引）

> 倒序，只保留最近 5 条。仅记录 AI 上下文文档的生成/更新。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-11-21 | 增量更新（基线 bc638a73 后 21 个提交/34 文件，提交信息全 "fix"，靠 diff 取证） | ui 67→68 目录（+draggable 转发 vue-draggable-plus ^0.6.1，.vue 仍 376）；新增包级 i18n 单例 `src/i18n.ts`（631 行 zh/en + setLocale/useI18n/parseLocale，library/i18n.ts 收敛为兜底转发，顶层组件含 DeviceListPicker 全部文案 i18n 化）；树体系大改（sort 五模式+sortTree、view='tiles' 平铺、refreshKey、fileDrop/useDefaultDropUpload/defaultDropUploadMode、跨层确认内置 AlertDialog、分支连接线动画、useLibraryTreeData+seed）；FilterBar 7→8 筛选器（+date→imported/created_after/before）；drag-data 改 DOMParser（data-src 系列+srcset 最大档+x-moz-url 回退+Pinterest 专属数据）；标签 target 标题→ID（兼容旧值）；MediaBrowser 分页 500→200；消费方口径修正 8→9 源码+pair.html CDN（copy-plugin-ui.mjs）；新增 claude/report.md 代码自检 |
| 2026-08-23 | 增量更新 | ui 组件 13 族→67 目录/376 vue（08-20~21 批量导入官方 registry + questionnaire/message-scroller 等扩展块）；library 扩为媒体库组件族（+MediaBrowser/MediaWaterfall/MediaDetail/MediaLibraryView/MediaPickerDialog/FilterBar/SavedFilterDialog/serverAuth/filterBar）；消费方 2→8（+mira-cep-panel、image_cropper/format_converter/ai_sdk 的 web/、video-editor/image-search/whiteboard）；file-map 重写 |
| 2026-08-20 | 首次生成文档索引（来源 /init-project） | 扫描范围：package.json、vite.config.ts、components.json、README、src/index.ts、src/library/index.ts 与 types.ts、src/types.ts、tree/drag-data/i18n 头部、顶层 5 个业务组件 Props、assets/tailwind.css、demo/，以及全量文件清单（src 106 文件）与仓库内消费方 grep；components/ui 13 族仅清点未逐个读实现 |
