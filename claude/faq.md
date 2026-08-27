# 常见问题(FAQ)

## Q: 为什么 `pnpm install` 报 workspace 包找不到?

2026-08-11 已从 `pnpm-workspace.yaml` 清理两条陈旧条目(`mira-server-sdk-examples`、`n8n-nodes-mira-ws-trigger`),磁盘上本就不存在。`dependency-switch-config-{macos,windows}.json` 与 `tool.js` 也已于 2026-08-20 前从仓库移除,不再存在悬空引用。

## Q: 客户端的真实 Tailwind 配置在哪?

**不是** `packages/mira-client/tailwind.config.js`(那是 Tailwind v3 遗留死文件,未被任何构建引用)。真正生效的是 `src/renderer/assets/main.css`,用 Tailwind v4 的 `@import "tailwindcss"` + `@theme inline` 定义主题与语义 token。

## Q: 客户端应该用哪种 UI 组件?

统一用 `@/components/ui/*`(shadcn-vue,new-york 样式)。**禁止**原生 HTML 控件、**禁止**直接 import `reka-ui`、**禁止** reintroduce 旧的 `volt/` 库或 `--mira-*` 变量。详见 `packages/mira-client/claude/conventions.md`。

## Q: 服务端和客户端的模块版本为什么和旧文档不一致?

core/server/client 当前均为 **v3.0.1**(2026-08-24 起;v3.0.0 = 导入三模式 + 设备分享 + 跨库导入,详见根 [CLAUDE.md](../CLAUDE.md) 扫描状态)。

## Q: 文件导入的 copy/move/link 三种模式有什么区别?

见 `docs/library-import-modes.md`:copy 完整副本(库内 `path=NULL`)、move 复制后源文件进系统回收站、link 符号链接(Windows 无权限时回退硬链接,`path` 存源路径);库级 `customFields.importType` 配置,改后即时生效。

## Q: 如何加一个新的 shadcn-vue 组件?

在 `packages/mira-client` 下 `npx shadcn-vue@latest add <name>`(配置见 `components.json`),会写入 `src/components/ui/<name>/`。

## Q: 怎么启动整个后端栈?

根目录 `pnpm run start:server`(= 构建 core + server + 插件)。客户端单独在 `packages/mira-client` 下 `pnpm run electron:dev`。

## Q: 客户端弹出层动画在 dev 下不生效?

这是当前已知的未决技术债,排查记录见 `handoff/handoff-dropdown-animation.md`(已移入 handoff/ 目录)。生产构建下正常。

## Q: AI 上下文/交接类文档放在哪?

- 各模块 AI 上下文:各目录 `CLAUDE.md` + `claude/` 详情文件
- 任务交接设计文档:根目录 `handoff/`(device-share、dropdown-animation、thumbnail-cache、float-window、tiptap-notion)
- SDK 覆盖审计:`.audit/`(manifest、coverage-report、decide 工具)
- 迁移期的 `task_plan.md`/`progress.md` 与 `.claude/`、`tool.js`、`deploy.bat` 等已于 2026-08-24/25 清理删除
