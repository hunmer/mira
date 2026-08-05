# Mira UI 设计规范（极简 · 玻璃拟态）

> 适用范围：`packages/mira-client` 渲染层（Vue 3 + shadcn-vue + TailwindCSS）。
> 风格关键词：极简、低信息密度、悬浮、圆角、玻璃/磨砂质感、柔和色彩、风格统一。
> 实现原则：**只在现有 shadcn-vue 组件上做样式定制，不新建组件；能用 Tailwind 实现就不写 style。**

---

## 1. 设计原则

| 原则 | 说明 |
| --- | --- |
| 低信息密度 | 单屏元素宁少勿多；次要信息（数量、路径、时间）一律用弱化色 |
| 悬浮布局 | 面板不贴边，四周留出呼吸空间，面板之间用 `gap` 分隔而非边框线 |
| 玻璃质感 | 面板 = 半透明白底 + `backdrop-blur` + 细浅色描边 + 柔和投影 |
| 圆角统一 | 只使用规范定义的圆角档位，禁止随意取值 |
| 色彩柔和 | 主色低饱和使用（`primary/10`、`primary/15` 做底），大面积背景用冷调浅灰紫渐变 |

---

## 2. 色彩

### 2.1 背景

- 应用底色（亮）：冷调灰紫渐变
  `bg-gradient-to-br from-[#edeffa] via-[#f3f4fb] to-[#e8ebf8]`
- 应用底色（暗）：`dark:from-muted dark:via-muted dark:to-muted`
- 内容卡片区底色：`bg-white/50`（暗色 `dark:bg-muted/50`）

### 2.2 玻璃面板（Glass Panel）

统一配方，所有悬浮面板复用这一组类：

```
rounded-2xl border border-white/60 dark:border-border
bg-white/70 dark:bg-muted/70 backdrop-blur-xl
shadow-[0_8px_30px_rgba(99,102,241,0.08)]
```

- 次级/内嵌面板透明度降为 `bg-white/50`、`bg-white/60`
- 描边用 `border-white/60`（亮）让边缘有「高光」，不用深灰描边

**弹出层（Popover / DropdownMenu / ContextMenu）**已在 shadcn-vue 基础组件统一定制：
`bg-white/65 dark:bg-muted/70 backdrop-blur-xl rounded-xl~2xl border-white/60 shadow-[0_12px_40px_rgba(99,102,241,0.12)]`

**卡片（Card）**：`bg-white/60 dark:bg-muted/60 backdrop-blur-xl rounded-2xl border-white/60 shadow-[0_8px_30px_rgba(99,102,241,0.08)]`

**对话框（Dialog）**：`bg-white/70 dark:bg-muted/80 backdrop-blur-xl rounded-2xl shadow-[0_24px_60px_rgba(99,102,241,0.15)]`；遮罩 `bg-black/40 backdrop-blur-sm`

### 2.3 强调色

- 主色：`primary`（选中态、主按钮、激活图标）
- 柔和强调底：`bg-primary/10 text-primary`（标签、计数、选中项背景）
- 危险操作：`text-destructive`，hover 底 `hover:bg-destructive/10`
- 弱化文字：`text-muted-foreground`；正文文字 `text-foreground`

### 2.4 禁忌

- 禁止大面积高饱和大色块（主色仅用于小面积强调）
- 禁止纯黑描边 / 重投影（`shadow-xl` 以上的硬阴影）

---

## 3. 圆角

| 档位 | 类 | 用途 |
| --- | --- | --- |
| 面板 | `rounded-2xl` (16px) | 侧栏、主内容面板、悬浮工具条、对话框 |
| 卡片 / 标签页 | `rounded-xl` (12px) | 图片卡片、Tab 容器、筛选器组 |
| 控件 | `rounded-lg` (8px) | 按钮、输入框、下拉项 |
| 胶囊 | `rounded-full` | 搜索框、分页按钮、标签 chip |

---

## 4. 阴影

只用两档柔和阴影，颜色带主色调（靛蓝）：

- 面板：`shadow-[0_8px_30px_rgba(99,102,241,0.08)]`
- 悬浮控件 / 激活 Tab：`shadow-sm`
- hover 抬升：`hover:shadow-[0_12px_36px_rgba(99,102,241,0.12)]` + `transition-shadow`

---

## 5. 间距与密度

- 应用边缘留白：`p-3`（12px），面板之间 `gap-3`
- 面板内边距：`p-3` ~ `p-4`
- 列表项间距：`space-y-1`（树）/ `gap-3` ~ `gap-4`（图片网格）
- 图标按钮统一 `h-8 w-8`（或 `p-2`），`rounded-lg`
- 禁止相邻面板硬拼贴：宁可留 `gap`，不用 `border-r` 分隔

---

## 6. 布局规范（HomeView）

三列结构，同 Y 轴对齐，均为玻璃磨砂面板：

```
┌───────────┬──────────────────────────────┬────────────┐
│ 左侧栏     │ 导航按钮 + Tabs 条            │ 头像菜单    │
│ 素材库切换  │（激活 tab 连接胶囊）          │ + 窗口控制  │
│ 文件夹     ├──────────────────────────────┼────────────┤
│ 标签       │                              │ 图片详情    │
│ 搜索胶囊   │  中间内容区（图片列表）        │ 面板        │
│           │  底部：浮动分页栏 + 状态栏     │            │
└───────────┴──────────────────────────────┴────────────┘
```

- **对齐规则**：Tabs 条固定 `h-[56px]`（= 紧凑 Header 44px + 间距 12px），使中间内容面板顶与右侧详情面板顶严格对齐
- **Tabs 连接胶囊**：激活 tab `rounded-t-2xl border-b-0 -mb-px` 与内容面板同底色（`bg-white/30`）无缝连接；未激活 tab 为 `rounded-full` 胶囊，hover 时呈现与激活态一致的玻璃质感
- **Tabs 滚动条隐藏**：容器使用 `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
- **第三列**：紧凑 Header（导航 + 窗口控制，`w-fit ml-auto` 靠右）+ `w-72` 图片详情面板
- **不透明度阶梯**：内容区 `bg-white/30` < 侧栏/工具条/详情 `bg-white/40` < 状态栏 `bg-white/50` < 浮动操作栏 `bg-white/60`，全部 `backdrop-blur-xl`

### 6.1 紧凑 Header（HomeHeader，第三列顶部）

- 不再占满整行：`w-fit ml-auto` 靠右悬浮，仅含导航按钮（上一次 tab / 重开 tab / 侧栏定位）与窗口控制
- 玻璃配方 `bg-white/40`，按钮 `h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary`
- 素材库切换已移至侧栏顶部（`bg-primary/10 text-primary rounded-xl` 胶囊按钮）

### 6.2 左侧栏（HomeSidebar）

- 独立玻璃面板（`rounded-2xl`），与主区间用 `gap` 分隔，不用 `border-r`
- 分组标题弱化（`text-xs text-muted-foreground`），文件夹与标签各为一组
- 选中项：`bg-primary/10 text-primary rounded-lg`
- 底部搜索入口：胶囊按钮 `rounded-full bg-primary/10 text-primary`

### 6.3 中间内容区

- 搜索框：胶囊 `rounded-full`，玻璃底 `bg-white/40 backdrop-blur`
- 过滤器：ghost 图标按钮，激活态 `bg-primary/10 text-primary rounded-lg`
- 图片卡片：`rounded-xl overflow-hidden shadow-sm`，hover 抬升阴影 `group-hover:shadow-[0_12px_36px_rgba(99,102,241,0.15)]` + 过渡
- 列表行：hover `bg-primary/5`，选中 `bg-primary/10`；扩展名 chip `bg-primary/10 text-primary rounded-full`
- 底部分页：浮动胶囊栏 `rounded-full bg-white/60 backdrop-blur-xl`，当前页 `bg-primary text-primary-foreground`
- 底部状态栏：玻璃条 `bg-white/50 backdrop-blur-xl rounded-2xl`

### 6.4 第三列详情面板

- `w-72` 玻璃面板，位于紧凑 Header 下方，由全局 `mediaStore.showDetailSidebar` 控制显隐
- 标签/文件夹 chip：`bg-primary/10 text-primary`，预览图容器 `rounded-xl`

### 6.5 悬浮工具条（HomeToolbar，中区内右缘）

- 竖向玻璃胶囊面板，图标按钮等距排列，分隔用 `border-t border-border/60` 短线

---

## 7. 字体与图标

- 全局字号基准 `text-[13px]`；弱化信息 `text-xs`
- 标题 `font-medium`，避免 `font-bold` 大面积使用
- 图标：Material Icons，默认 `18px`，弱化色 `text-muted-foreground`

---

## 8. 暗色模式

- 所有玻璃面板提供 `dark:` 对应：`bg-muted/70`、`border-border`
- 阴影在暗色下可省略或降低不透明度
- 渐变底色暗色退化为纯 `muted`，不再使用彩色渐变
