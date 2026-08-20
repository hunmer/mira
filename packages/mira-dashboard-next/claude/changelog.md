# 变更记录

> 倒序排列，只保留最近 5 条。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | git since 2026-08-11（19 commits，src 33 增 0 删 43 改）。API 层迁移到 mira-app-core SDK（新增 `lib/miraClient.ts`，12/13 模块改走 SDK，axios client.ts 退化为 baseURL/token 配置）；路由 10→11（删 `/thumbnail` 并入新 `/media`；增 `/settings`）；api/modules 增 `cookieSites.ts`/`download.ts`（共 13）；ui 组件 27→30（+combobox/input-group/alert-dialog）；新组件 LibraryTreeSelect/Node、PageLoading、ShareDialog(qrcode)、TokenManageDialog、InstallTerminalDialog；composables 增 useConfirmDialog/usePluginSources；依赖增 qrcode/@types/qrcode、reka-ui ^2.10.3。更新 CLAUDE.md + claude/{overview,module-responsibilities,file-map,public-interfaces,dependencies-and-config,conventions} |
| 2026-08-05 | 重新生成 | 基于当前源码重新生成全部 AI 上下文文档。校正：移除已不存在的 `/file-upload` 路由与 `views/mira/file-upload/`（当前为 10 个业务子路由）；路由确认为 hash 模式；补充 App.vue 的 API Base URL 运行时配置能力、pluginRuntime 全局对象、stores/app 的 sidebar/getDashboardContext、依赖清单（含 react-selectable-fast 疑似遗留）、shadcn-vue 27 个组件清单、components.json(reka-mira/zinc/remixicon)、vite proxy(/api,/health)、vue alias 指向 esm-bundler。新增 conventions.md / module-responsibilities.md / entrypoints.md / dependencies-and-config.md / data-model.md |
| 2026-06-09 | 结构重构 | 重构文档为索引+详情分离；发现新增 useBroadcast 组合式函数 |
| 2026-05-26 | 初始化 | 首次生成模块文档 |
