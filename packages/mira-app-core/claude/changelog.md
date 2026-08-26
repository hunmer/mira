# 变更记录（倒序，最近 5 条）

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-25 | 增量更新 | 版本 2.0.8→**3.0.1**。SDK 模块仍 17 个但扩容：+createShareTicket / user readFile·writeFile / importFrom·进度·取消 / scanDuplicates(matchMode)、FileModule download 路径修正、types +PluginSource/ImportSource/ShareTicket 等；WebSocketClient 跨 Node·浏览器适配 + sendBinary/bufferedAmount；FileImport **导入三模式重构**（copy path=NULL / move 进系统回收站 / link 符号链接+Win 硬链接回退）；FileOperations custom_fields 序列化 + onFileDeleted 钩子；覆盖统计 128/117→**138/125**（08-24 重生成）。 |
| 2026-08-23 | 增量更新 | 08-20 以来小改（版本仍 2.0.8）：SDK `FileModule`（+`FileModule.contract.test.ts` 契约测试）、`sdk/types.ts`、`sdk/index.ts` 微调。 |
| 2026-08-20 | 增量更新 | 版本 2.0.1 → 2.0.8；SDK Module 10 → 17（新增 CookieSite/Settings/Admin/Download/FileSystem/Statistics/Thumbnail，MiraClient 新增对应访问器）；新增 vitest 测试体系（27 个测试文件 + test-helpers.ts + vitest.config.ts）；引用 `.audit/sdk-coverage-report.md` 覆盖统计（128 条 API：covered 117 / missing 11 / excluded 13 / dynamic 7）。 |
| 2026-08-05 | 初始化 AI 上下文 | 按 monorepo 约定重建 AI 上下文文档：CLAUDE.md 轻量索引 + claude/ 8 个详情文件（overview / conventions / module-responsibilities / entrypoints / public-interfaces / dependencies-and-config / file-map / changelog）。确认包版本升至 2.0.1；订正 README 中"无 ws/数据库依赖"的过时描述（实际依赖 sqlite3、ws）。 |
| 2026-06-09 | 结构重构 | 确认 storage/sqlite 和 shared/sdk 已合并到 core 内部；文档拆分为索引+详情。 |
| 2026-05-25 | 增量更新 | 接口签名不变，补充 EventArgs 优先级机制细节。 |
