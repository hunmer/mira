# Mira Browser Extension: Save Location 暗色主题交接

## 当前目标

验证并收尾浏览器扩展中 `SnifferView` 的“导入到”对话框暗色模式显示。此前截图中 Tabs 区域为浅灰背景配白字，可视度很低，而 `mira-plugin-ui` Demo 表现正常。

## 当前状态

- 分支：`main`，当前与 `origin/main` 一致。
- 工作区：生成本文档前无未提交修改。
- 相关修改已提交：
  - `eef05e25`：SaveLocation 初始标签接线，以及 `mira-plugin-ui` 的 Dialog 前景色、Tabs 去描边、标准 Textarea 等调整。
  - `2fb0fa5f`：修复浏览器扩展的 shadcn `--muted` token 冲突。
- 最新源码尚未完成扩展构建和真实 Chrome 暗色模式验收。

不要从聊天记录重做修改；先查看上述两个提交及当前源码。

## 已确认根因

`packages/mira-browser-extension/src/ui/style.css` 曾声明：

```css
--muted: var(--muted-foreground);
```

这把 shadcn 用作弱化背景的 `--muted` 覆盖成了弱化文字色。`mira-plugin-ui` 的 `TabsList` 使用 `bg-muted`，因此在扩展暗色模式中得到过亮背景；组件库 Demo 没有该宿主覆盖，所以显示正常。

提交 `2fb0fa5f` 已删除该覆盖，并将扩展自绘 UI 中 41 处弱化文字显式改为 `var(--muted-foreground)`。静态检查时，`packages/mira-browser-extension/src/ui` 下已无作为历史文字别名的 `var(--muted)` 用法。

## 相关代码

- 对话框调用：`packages/mira-browser-extension/src/ui/components/sniffer/SnifferView.vue:603`
- 扩展主题入口：`packages/mira-browser-extension/src/ui/style.css`
- 暗色类同步：`packages/mira-browser-extension/src/ui/theme.ts`
- 组件库主题：`packages/mira-plugin-ui/src/assets/tailwind.css`
- 保存位置表单：`packages/mira-plugin-ui/src/SaveLocationForm.vue`
- 标准 Textarea 接入：`packages/mira-plugin-ui/src/FileInfoForm.vue`
- Tabs 去描边：`packages/mira-plugin-ui/src/components/ui/tabs/TabsTrigger.vue`
- Dialog 前景色：`packages/mira-plugin-ui/src/components/ui/dialog/DialogContent.vue`

架构和验证约定已有文档，不在此重复：

- `packages/mira-browser-extension/CLAUDE.md`
- `packages/mira-browser-extension/claude/testing-and-quality.md`
- `packages/mira-plugin-ui/CLAUDE.md`

## 下一步

1. 运行 `pnpm --filter mira-browser-extension build`。
2. 在 Chrome 扩展管理页重新加载 `packages/mira-browser-extension/dist`。
3. 打开扩展，切换暗黑模式，在资源嗅探页选择资源并打开“导入到”。
4. 验证 TabsList 为暗色背景、激活 Tab 有背景提示但无按钮描边、标题和表单文字清晰。
5. 同时抽查设置页、上传队列、资源嗅探工具栏等弱化文字，确认 `--muted-foreground` 迁移没有回归。
6. 再切换亮色模式，确认 Tabs 和 Textarea 与 `mira-plugin-ui` Demo 一致。

若视觉问题仍存在，先在 DevTools 中读取 TabsList 的 `background-color` 以及 `--muted`、`--muted-foreground`、`--input` 的 computed value，并确认 Portal 节点位于 `html.dark` 后代范围，再决定是否改代码。

## 验收标准

- 暗黑模式下不再出现浅灰 TabsList 配白字。
- 激活 Tab 有可辨识背景，且没有按钮式边框。
- Dialog 标题、正文、输入框和 Textarea 对比正常。
- 亮色模式无回归。
- 扩展构建通过。

## Suggested Skills

- `diagnose`：若真实 Chrome 验收仍失败，按 computed style 建立可复现反馈环，区分 token、选择器优先级和 Portal 主题作用域。
- `zoom-out`：若发现主题 token 在 popup、side panel、content overlay 三个入口继续漂移，用于梳理各入口的 CSS 所有权和加载链路。
