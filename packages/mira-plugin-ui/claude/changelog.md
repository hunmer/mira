# mira-plugin-ui 变更记录（文档索引）

> 倒序，只保留最近 5 条。仅记录 AI 上下文文档的生成/更新。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-23 | 增量更新 | ui 组件 13 族→67 目录/376 vue（08-20~21 批量导入官方 registry + questionnaire/message-scroller 等扩展块）；library 扩为媒体库组件族（+MediaBrowser/MediaWaterfall/MediaDetail/MediaLibraryView/MediaPickerDialog/FilterBar/SavedFilterDialog/serverAuth/filterBar）；消费方 2→8（+mira-cep-panel、image_cropper/format_converter/ai_sdk 的 web/、video-editor/image-search/whiteboard）；file-map 重写 |
| 2026-08-20 | 首次生成文档索引（来源 /init-project） | 扫描范围：package.json、vite.config.ts、components.json、README、src/index.ts、src/library/index.ts 与 types.ts、src/types.ts、tree/drag-data/i18n 头部、顶层 5 个业务组件 Props、assets/tailwind.css、demo/，以及全量文件清单（src 106 文件）与仓库内消费方 grep；components/ui 13 族仅清点未逐个读实现 |
