# 透明玻璃效果（Glassmorphism）改造指南

> 本文档说明如何将现有 UI 的配色/样式改造成透明玻璃（磨砂）效果。
> 适用于本项目（Vue 3 + TailwindCSS + shadcn-vue），原则同样适用于其他技术栈。

---

## 1. 核心原理

玻璃质感 = **半透明背景 + 背景模糊 + 高光描边 + 有色柔和阴影**，四者缺一不可：

| 要素 | 作用 | Tailwind 实现 |
| --- | --- | --- |
| 半透明背景 | 让底色透出来 | `bg-white/40`（关键：`/透明度`，不是纯色） |
| 背景模糊 | 磨砂感 | `backdrop-blur-xl` |
| 高光描边 | 玻璃边缘的反光 | `border border-white/60` |
| 有色阴影 | 悬浮感、与主色呼应 | `shadow-[0_12px_40px_rgba(99,102,241,0.10)]` |

**最常见的错误**：只加 `backdrop-blur` 但背景是不透明的（如 `bg-white`），模糊完全不生效——模糊的是"透过来的东西"，背景不透明就没有东西可透。

---

## 2. 改造五步法

### Step 1：铺一个有内容的底色

玻璃效果需要"有东西可透"。应用根背景从纯色改为柔和渐变：

```html
<!-- 改前 -->
<div class="bg-white">

<!-- 改后：冷调灰紫渐变（本项目取值） -->
<div class="bg-gradient-to-br from-[#e3e7f7] via-[#eceefc] to-[#dde3f5]
            dark:from-muted dark:via-muted dark:to-muted">
```

### Step 2：建立透明度阶梯

不要所有面板一个透明度，按层级递减，拉开层次：

| 层级 | 透明度 | 用途 |
| --- | --- | --- |
| 最底层内容区 | `bg-white/30` | 主内容面板（透出最多底色） |
| 结构面板 | `bg-white/40` | 侧栏、顶栏、详情面板 |
| 辅助条 | `bg-white/50` | 状态栏、空状态卡片 |
| 浮动控件 | `bg-white/60` | 浮动操作栏、Card |
| 弹出层 | `bg-white/65` | Popover / Dropdown / ContextMenu |
| 对话框 | `bg-white/70` | Dialog（需保证文字可读，最不透） |

> 经验：弹出层浮在白色面板上时 `/80` 会显得不透明，建议 `/65` 起步。

### Step 3：批量替换映射规则

| 改前 | 改后 |
| --- | --- |
| `bg-white` / `bg-card` / `bg-background` | `bg-white/40~70 backdrop-blur-xl` |
| `bg-muted` | `bg-muted/60`（暗色场景同理加透明度） |
| `border` / `border-border` | `border border-white/60 dark:border-border` |
| `rounded-md` / `rounded-lg` | `rounded-xl` / `rounded-2xl` |
| `shadow-sm` / `shadow-lg`（灰色） | `shadow-[0_12px_40px_rgba(99,102,241,0.10)]`（带主色调） |
| `hover:bg-muted` | `hover:bg-primary/5` 或 `hover:bg-white/50` |
| 选中态 `bg-primary text-primary`（对比度 bug） | `bg-primary/10 text-primary` |

### Step 4：在基础组件层统一定制

不要逐个业务组件改，改 shadcn-vue 基础组件的默认 class，全局生效：

- `ui/popover/PopoverContent.vue` — 所有 Dropdown 的底座
- `ui/dropdown-menu/DropdownMenuContent.vue`
- `ui/context-menu/ContextMenuContent.vue`
- `ui/dialog/DialogContent.vue` + `DialogOverlay.vue`（遮罩改 `bg-black/40 backdrop-blur-sm`）
- `ui/card/Card.vue`

### Step 5：暗色模式适配

```
dark:bg-muted/60~80  dark:border-border
```

暗色下白色半透明会发灰，改用 `muted` 色系加透明度；阴影可省略或降低不透明度。

---

## 3. 布局配套（让玻璃"浮"起来）

- 面板**不贴边**：根容器 `p-3`，面板间 `gap-3`，删除 `border-r` 这类拼接分隔线
- 分割条透明化：可调整面板间的拖拽手柄改 `bg-transparent w-3`，让间隙成为视觉分隔
- 低信息密度：列表行距 `space-y-1`、网格 `gap-6`、弱化次要信息 `text-muted-foreground text-xs`

---

## 4. 常见坑

1. **`backdrop-blur` 无效** → 背景不是半透明；或元素在 portal（Teleport）中，身后没有内容（检查 z-index/层级）。
2. **透明度选了看起来还是不透明** → 它浮在白色面板上。要么降透明度，要么让底层有颜色/图片。
3. **文字可读性下降** → 弹出层/对话框透明度不要低于 `/60`；文字保持 `text-foreground`，不要跟着变透明。
4. **面板对不齐** → 悬浮栏内控件高度不一致会撑高容器（如 `p-1 + w-7` 的按钮 = 36px > `h-8`），固定按钮尺寸 `h-8 w-8` 再用 `flex` 居中内容。
5. **硬阴影破坏柔和感** → 阴影颜色不要用纯黑，用主色调 `rgba(99,102,241,0.08~0.15)`。
6. **Splitter/Resizable 布局错乱** → 不要在面板组上加 `gap`（破坏尺寸计算），用透明手柄做间隔。

---

## 5. 验收清单

- [ ] 所有面板能透出底层渐变/图片
- [ ] 弹出层（下拉、右键菜单、对话框）与面板质感一致
- [ ] 无纯黑描边、无灰色硬阴影
- [ ] 暗色模式下不发灰、文字可读
- [ ] 面板之间有呼吸间距，无硬拼贴
