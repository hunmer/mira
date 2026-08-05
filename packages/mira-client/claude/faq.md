# mira-client 常见问题(FAQ)

## Q: 改了样式没生效?

先确认改对地方。**真实主题源是 `src/renderer/assets/main.css`**(Tailwind v4 `@theme inline` + shadcn 语义 token)。`tailwind.config.js` 是 v3 死文件,改它无效。

## Q: 新组件该用 shadcn 还是手写?

只用 `@/components/ui/*`(shadcn-vue)。缺组件先 `npx shadcn-vue@latest add <name>`。不要直接 import reka-ui,不要用原生 HTML 控件。

## Q: 弹出层动画在 dev 下不动?

已知技术债。CSS 侧(`--animate-in/out` 覆盖 `tw-animate-css`)已确认正确,疑点在 dev 热更新或 reka-ui Presence 时机。生产构建正常。排查记录见仓库根 `handoff-dropdown-animation.md`。

## Q: 怎么跑起来开发?

`pnpm run electron:dev`(Windows 含 chcp 65001)。类型检查用 `pnpm run type-check`(无单测,这是主门禁)。

## Q: 哪些旧的东西已经删了?

自研 `volt/` 组件库整体删除;`--mira-*` / `--surface-*` 自定义变量全部迁到 shadcn 语义 token;未引用的 ui 目录(accordion/collapsible/command/drawer/navigation-menu/pagination/scroll-area)已删;element-plus/naive 等旧库 0 引用。仅剩 2 处 radix-vue 直引待清理。

## Q: 多窗口怎么加 IPC?

在 `src/main/ipc/` 加 `XxxHandlers.ts`,在 `handlers.ts` 注册中心登记,通道用前缀(见 public-interfaces.md)。渲染侧经 preload 暴露的 contextBridge API 调用。

## Q: 迁移整体进度?

仓库根 `task_plan.md`(Phase 1–8)+ `progress.md`(已全部 complete)。剩:动画 dev bug、2 处 radix-vue 清理、人工视觉 QA。
