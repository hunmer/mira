# mira-plugin-ui

Mira 插件共享 UI 组件库（`mira-plugin-ui`，v1.1.0，private）。构建产物**自包含**（ESM + UMD + 编译好的 CSS，仅 `vue` external），可经 CDN 直接引入任意 HTML 页面，不依赖宿主页面的组件库。内部三层：`src/components/ui/`（shadcn-vue 官方 13 族基础组件，只增不改）、`src/` 顶层业务组件（批量上传/保存位置/文件信息）、`src/library/` 素材库树体系（独立子入口，源码消费，数据经 services/dialog/upload 注入）。

当前消费方：`mira-browser-extension`（workspace:*，library 子入口 + src 直引）与 `plugins/plugins/mira_tiptap_format/web`（file: 链接，根入口 + dist CSS）。

## 约定的规则

- **禁止手写/魔改 `src/components/ui/` 官方组件**：曾因 `v-bind="props"` 透传 `undefined` 键触发 reka-ui 受控误判（Select 打不开）；业务组件只组合不重实现
- 样式一律 tailwind 原子类 + shadcn token（规则权威来源：仓库根 `ui_rule.md`）；新增 class 必须被 `src/assets/tailwind.css` 的 `@source "../"` 覆盖
- library 组件不访问数据源，由宿主注入 `LibraryTreeServices` / `LibraryTreeDialog` / `LibraryTreeUpload`
- 构建：`pnpm --filter mira-plugin-ui build`（产物 `dist/mira-plugin-ui.{es,umd}.js + mira-plugin-ui.css`）；开发 demo：`pnpm --filter mira-plugin-ui dev`（代理 `/mira-api → 127.0.0.1:8081` 连真实 server）
- `file:` 消费方改源码后需重新 `build`（开发期 `build:watch`）；**无自动化测试**，靠 demo 手动验证

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 定位、三层结构、消费方、技术栈 | 首次了解模块 |
| [claude/conventions.md](claude/conventions.md) | 命令、组件/样式规则、禁止事项 | 改代码前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 目录职责，library 逐文件说明 | 定位文件/子模块 |
| [claude/entrypoints.md](claude/entrypoints.md) | exports 三入口、三种消费形态、demo 与构建 | 对接/构建 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 导出组件清单、关键 Props | 使用/封装组件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖版本、vite/components.json/tailwind.css | 排查依赖/构建 |
| [claude/data-model.md](claude/data-model.md) | 类型体系与注入接口（services/dialog/upload） | 改树体系/对接数据 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | 无测试现状、手动验证方式、质量风险 | 质量评估 |
| [claude/file-map.md](claude/file-map.md) | 完整目录与文件清单（106 文件统计） | 找文件 |
| [claude/faq.md](claude/faq.md) | reka-ui 误判事故、CSS 缺类、入口选择等 | 遇到坑 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **版本**: 1.1.0
- **更新时间**: 2026-08-20 14:10 (+0800)
- **已扫描**: package.json、vite.config.ts、components.json、README、src/index.ts、src/library/index.ts、src/library/types.ts、src/types.ts、tree/drag-data/i18n 头部、顶层 5 个业务组件 Props、assets/tailwind.css、demo/（App.vue 头部 + main.ts）、src 全量文件清单、消费方 grep（mira-browser-extension / mira_tiptap_format）
- **跳过**: `src/components/ui/` 13 族 80 个 .vue 的实现体（官方源码，仅清点）；library 各 .vue 实现体（仅读类型与注释）；`tsconfig.json` 选项；dist 产物内容
- **下一步建议**: 若改动 library 树体系，深扫 `LibraryTreeView.vue` 与 `useLibraryTreeActions.ts`；可补 type-check 最小门禁
