# mira-client 变更记录(文档索引)

> 倒序,只保留最近 5 条。仅记录 AI 上下文文档的生成/更新。

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-20 | 增量更新 | 版本 1.0.5→2.0.9,迁移已合回 main;ui 组件 34→52、Store 11→15、主进程 IPC Handler 13→18(main.ts 拆分);新增悬浮球窗口、i18n、procm-ui-tests 远程 UI 测试、@hunmer/vue-selection-box;SCSS 体系确认删除(vite 残留注入列为技术债);ext_icons→public/icons |
| 2026-08-05 | 全面更新 | 重点记录 shadcn-vue 迁移晚期现状(volt 已删、34 个 ui 组件、reka-ui 封装层);补齐 conventions/module-responsibilities/entrypoints/dependencies-and-config/data-model/testing-and-quality/faq;标注 tailwind.config.js 为死文件、main.css 为真实主题源、2 处 radix-vue 残留、动画 dev 技术债 |
| 2026-06-09 | 结构重构 | 重构文档为索引+详情分离;版本升级到 v1.0.5;发现新增 AutoUpdateHandlers、NotificationHandlers |
| 2026-05-25 | 增量更新 | 确认架构不变,版本 v1.0.2 |
| 2026-05-20 | 架构扫描更新 | 更新根级导航面包屑 |
