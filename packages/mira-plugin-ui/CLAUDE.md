# mira-plugin-ui

Mira 插件共享 UI 组件库（`mira-plugin-ui`，v1.1.0，private）。构建产物**自包含**（ESM + UMD + 编译好的 CSS，仅 `vue` external），可经 CDN 直接引入任意 HTML 页面，不依赖宿主页面的组件库。内部三层：`src/components/ui/`（**68 个组件目录/376 个 .vue**：shadcn-vue 官方组件批量导入 + 扩展块 questionnaire/message-scroller/bubble/item/field/stepper 等，只增不改；`draggable/` 转发 vue-draggable-plus）、`src/` 顶层业务组件（批量上传/保存位置/文件信息/设备选择，6 个 .vue）、`src/library/` **媒体库组件族**（15 个 .vue：MediaBrowser/MediaWaterfall/MediaDetail/MediaLibraryView/MediaPickerDialog/FilterBar/SavedFilterDialog + 树体系 + 服务器管理；独立子入口源码消费，数据经 services 注入）。

包级 **i18n 单例**（`src/i18n.ts`，zh/en，不依赖 vue-i18n）：`setLocale`/`useI18n` 双入口导出，初始语言自动探测（`window.mira.app.locale` → `navigator.language` → zh）；业务组件文案缺省走内置词典、props 覆盖，library 组件可传 `t` prop 接管。

当前消费方（grep 实测 9 处源码 import + 1 处 CDN）：`mira-browser-extension`（library 子入口 + src 直引）、`mira-cep-panel`、`plugins/plugins/mira_tiptap_format/web`（file: 链接）、`mira_image_cropper`/`mira_format_converter`/`mira_ai_sdk` 的 `web/`、客户端市场插件 `mira-video-editor`/`image-search`/`mira-whiteboard`；另 `mira-app-server/public/pair.html` 经 `scripts/copy-plugin-ui.mjs` 拷贝 dist 至 `public/vendor/` 以 CDN 形态消费。

## 约定的规则

- **禁止手写/魔改 `src/components/ui/` 官方组件**：曾因 `v-bind="props"` 透传 `undefined` 键触发 reka-ui 受控误判（Select 打不开）；业务组件只组合不重实现
- **新组件文案一律走 `src/i18n.ts`**（`t()` / `useI18n()`），禁止硬编码中文；library 组件保留 `t` prop 注入口，业务组件保留文案 props 覆盖
- 样式一律 tailwind 原子类 + shadcn token（规则权威来源：仓库根 `ui_rule.md`）；新增 class 必须被 `src/assets/tailwind.css` 的 `@source "../"` 覆盖
- library 组件不访问数据源，由宿主注入 `LibraryTreeServices` / `LibraryTreeDialog` / `LibraryTreeUpload`
- 树拖放上传：宿主传 `fileDrop` 回调即自定义处理；未传（或显式 `useDefaultDropUpload=true`）走内置 `defaultDropUpload`（direct 直传 / dialog 打开 `upload.pick` 预填）
- 构建：`pnpm --filter mira-plugin-ui build`（产物 `dist/mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css`）；开发 demo：`pnpm --filter mira-plugin-ui dev`（代理 `/mira-api → 127.0.0.1:8081` 连真实 server）
- `file:` 消费方改源码后需重新 `build`（开发期 `build:watch`）；**无自动化测试**，靠 demo 手动验证

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 定位、三层结构、消费方、技术栈 | 首次了解模块 |
| [claude/conventions.md](claude/conventions.md) | 命令、组件/样式/i18n 规则、禁止事项 | 改代码前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 目录职责，library 逐文件说明 | 定位文件/子模块 |
| [claude/entrypoints.md](claude/entrypoints.md) | exports 三入口、三种消费形态、demo 与构建 | 对接/构建 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 导出组件清单、关键 Props | 使用/封装组件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖版本、vite/components.json/tailwind.css | 排查依赖/构建 |
| [claude/data-model.md](claude/data-model.md) | 类型体系与注入接口（services/dialog/upload） | 改树体系/对接数据 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | 无测试现状、手动验证方式、质量风险 | 质量评估 |
| [claude/file-map.md](claude/file-map.md) | 完整目录与文件清单 | 找文件 |
| [claude/faq.md](claude/faq.md) | reka-ui 误判事故、CSS 缺类、入口选择、i18n 接管等 | 遇到坑 |
| [claude/report.md](claude/report.md) | 代码自检报告（结构/重复/可读性/可复用） | 写新功能前 / 排查质量问题时 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **版本**: 1.1.0（未变）
- **更新时间**: 2026-11-21（基线 bc638a73，2026-08-25；此后 21 个提交全标 "fix"，34 文件 +1829/-514）
- **已扫描**: 上述 diff 全量 + 当前 src/index.ts、library/index.ts、types.ts、tree.ts、filterBar.ts、drag-data.ts、i18n.ts、defaultDropUpload.ts、FilterBar/LibraryTree/LibraryTreeView 关键 diff；全仓消费方 grep 复测
- **本次更新(2026-11-21)要点**: ui 67→68 目录（+draggable 转发 vue-draggable-plus ^0.6.1）；新增包级 i18n 单例 `src/i18n.ts`（631 行 zh/en，library/i18n.ts 词典收敛为兜底转发，全部业务组件文案 i18n 化）；树体系大改（`sort` 五模式 + `sortTree`、`view='tiles'` 平铺视图、`refreshKey`、拖放上传 `fileDrop`/`useDefaultDropUpload`/`defaultDropUploadMode`、跨层确认改内置 AlertDialog、分支连接线动画）；FilterBar 7→8 筛选器（+date 日期区间，映射 imported_after/before 或 created_after/before）；drag-data 用 DOMParser 解析（data-src 系列 + srcset 最大档 + text/x-moz-url 回退 + Pinterest 专用拖拽数据优先）；标签 target 从标题名改为 **ID**（兼容旧标题值）；MediaBrowser 分页 500→200；消费方口径修正 8→9（+pair.html CDN 共 10 个消费点，旧文档漏计 DeviceListPicker 顶层组件）
- **跳过**: `src/components/ui/` 68 目录实现体（官方源码，仅清点）；demo/App.vue 实现细节；dist 产物内容
- **下一步建议**: FilterBar.vue 已 1140 行（包内最大），后续加筛选器建议拆分；可补 type-check 最小门禁
