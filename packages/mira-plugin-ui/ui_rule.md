# UI 样式规则（mira-plugin-ui）

适用于 `packages/mira-plugin-ui`（含 `src/library` 树组件体系）的所有组件：

1. **样式一律使用 shadcn-vue / tailwindcss 原子类**，组件内不再手写 `<style scoped>` CSS。
2. **颜色、间距、圆角、阴影全部走 shadcn 设计 token**（`--background/--foreground/--primary/--muted/--accent/--border/--radius` 等），禁止再引入自定义语义变量（如 `--fg/--bg-elev/--muted-fg` 这类旧体系）。
3. **交互态用 tailwind 变体表达**：`hover:` / `focus-visible:` / `data-[state=...]` / `disabled:` 等；互斥状态用 `:class` 条件绑定保证类互斥，避免同名工具类的顺序歧义。
4. **基础组件（dialog/tabs/combobox/…）优先从 shadcn-vue `new-york-v4` 官方源码移植**，与官方保持一致；本地仅做明确要求的裁剪（如 TabsTrigger 去描边），并在变更时于提交说明中注明。
5. **唯一例外**：tailwind 无法表达的复杂过渡/关键帧（如 grid `0fr→1fr` 高度展开动画、拖拽 80ms 定时描边之类的 JS 状态动效）允许少量 scoped CSS，但其中不得引入颜色/间距 token——颜色一律原子类。
6. 新增 class 所在源文件必须被 `src/assets/tailwind.css` 的 `@source` 覆盖（或位于被库构建扫描的模块图中），否则 dist CSS 会缺类。
