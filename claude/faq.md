# 常见问题(FAQ)

## Q: 为什么 `pnpm install` 报 workspace 包找不到?

2026-08-11 已从 `pnpm-workspace.yaml` 清理两条陈旧条目(`mira-server-sdk-examples`、`n8n-nodes-mira-ws-trigger`),磁盘上本就不存在。若仍报警告,检查 `dependency-switch-config-{macos,windows}.json` 中是否还残留 `n8n-nodes-mira-ws-trigger` 的悬空 `file:` 引用(仅被 `tool.js` 消费,可一并删除)。

## Q: 客户端的真实 Tailwind 配置在哪?

**不是** `packages/mira-client/tailwind.config.js`(那是 Tailwind v3 遗留死文件,未被任何构建引用)。真正生效的是 `src/renderer/assets/main.css`,用 Tailwind v4 的 `@import "tailwindcss"` + `@theme inline` 定义主题与语义 token。

## Q: 客户端应该用哪种 UI 组件?

统一用 `@/components/ui/*`(shadcn-vue,new-york 样式)。**禁止**原生 HTML 控件、**禁止**直接 import `reka-ui`、**禁止** reintroduce 旧的 `volt/` 库或 `--mira-*` 变量。详见 `packages/mira-client/claude/conventions.md`。

## Q: 服务端和客户端的模块版本为什么和旧文档不一致?

旧根文档曾写 core v1.0.24 / server v1.0.25,实际两者均已升至 **v2.0.1**(本次 2026-08-05 更新已修正)。

## Q: 如何加一个新的 shadcn-vue 组件?

在 `packages/mira-client` 下 `npx shadcn-vue@latest add <name>`(配置见 `components.json`),会写入 `src/components/ui/<name>/`。

## Q: 怎么启动整个后端栈?

根目录 `pnpm run start:server`(= 构建 core + server + 插件)。客户端单独在 `packages/mira-client` 下 `pnpm run electron:dev`。

## Q: 客户端弹出层动画在 dev 下不生效?

这是当前已知的未决技术债,排查记录见根目录 `handoff-dropdown-animation.md`。生产构建下正常。

## Q: 哪里看迁移整体进度?

根目录 `task_plan.md`(Phase 1–8 计划)与 `progress.md`(进度,已全部 complete)。这些是迁移期临时文件。
