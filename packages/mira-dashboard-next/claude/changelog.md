# 变更记录

> 倒序排列。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-05 | 重新生成 | 基于当前源码重新生成全部 AI 上下文文档。校正：移除已不存在的 `/file-upload` 路由与 `views/mira/file-upload/`（当前为 10 个业务子路由）；路由确认为 hash 模式；补充 App.vue 的 API Base URL 运行时配置能力、pluginRuntime 全局对象、stores/app 的 sidebar/getDashboardContext、依赖清单（含 react-selectable-fast 疑似遗留）、shadcn-vue 27 个组件清单、components.json(reka-mira/zinc/remixicon)、vite proxy(/api,/health)、vue alias 指向 esm-bundler。新增 conventions.md / module-responsibilities.md / entrypoints.md / dependencies-and-config.md / data-model.md |
| 2026-06-09 | 结构重构 | 重构文档为索引+详情分离；发现新增 useBroadcast 组合式函数 |
| 2026-05-26 | 初始化 | 首次生成模块文档 |
