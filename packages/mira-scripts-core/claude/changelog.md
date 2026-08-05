# changelog

倒序排列（最新在前）。

| 日期 | 类型 | 说明 |
|------|------|------|
| 2026-08-05 | 初始化 | 按新模板重新生成 AI 上下文文档：新增 `conventions.md` / `entrypoints.md` / `public-interfaces.md` / `dependencies-and-config.md` / `file-map.md`；重写 `overview.md` 与 `CLAUDE.md`；澄清 `index.ts` 未使用 commander，真实子命令为 `convert` / `import`。扫描 `package.json`、`index.ts`（全文）、`tsconfig.json`，抽样两个脚本前 50 行。 |
| 2026-06-09 | 结构重构 | 重构文档为索引 + 详情分离。 |
| 2026-05-25 | 增量更新 | 补充命令路由机制说明。 |
| 2026-05-20 | 初始化 | 首次生成模块文档。 |
