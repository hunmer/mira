# 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-06-09 | 全面重构更新 | 发现重大结构变化：mira-storage-sqlite 和 mira-server-sdk 已合并到 mira-app-core；新增 mira_duplicate_scanner 插件；mira-client 版本升级到 v1.0.5；重构所有 CLAUDE.md 为索引+详情分离结构 |
| 2026-05-26 | 增量更新扫描 | 发现重大结构变化：mira-dashboard 替换为 mira-dashboard-next（shadcn-vue 重写）；新增 mira_thumb_imagemagick 插件；服务端新增 ThumbnailService/SettingsManager/ThumbRouter/StatisticsRouter |
| 2026-05-25 | 增量更新扫描 | 更新模块版本号、服务端路由清单（新增 FsRouter、BaseRouter、LibraryWatcher、UserStorage）、插件深度扫描、SDK 模块清单完善 |
| 2026-05-20 | 初始化架构扫描 | 首次生成完整架构文档，覆盖 10+ 个模块 |
