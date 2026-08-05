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

```
┌──────────────────────────────────────────────────┐
│ 顶部悬浮栏：素材库 · Tab 多标签页 · 窗口控制        │
├────────┬──────────────────────────────┬──────────┤
│ 左侧栏  │  中间内容区                    │ 右侧悬浮  │
│ 文件夹  │  搜索 / 过滤器 / 图片列表 /     │ 工具条    │
│ 标签    │  右侧图片信息 / 底部分页        │ (上传等)  │
└────────┴──────────────────────────────┴──────────┘
```

### 6.1 顶部悬浮栏（HomeHeader）

- 整体为一条玻璃面板：`rounded-2xl` + 玻璃配方，四周浮于底色之上
- Tab 容器：`rounded-xl bg-secondary-100/70 p-1`，激活 Tab `bg-white shadow-sm text-primary`
- 素材库选择器、导航按钮：图标按钮 `rounded-lg hover:bg-muted`

### 6.2 左侧栏（HomeSidebar）

- 独立玻璃面板（`rounded-2xl`），与主区间用 `gap` 分隔，不用 `border-r`
- 分组标题弱化（`text-xs text-muted-foreground`），文件夹与标签各为一组
- 选中项：`bg-primary/10 text-primary rounded-lg`
- 底部搜索入口：胶囊按钮 `rounded-full bg-primary/10 text-primary`

### 6.3 中间内容区

- 搜索框：胶囊 `rounded-full`，玻璃底 `bg-white/70 backdrop-blur`
- 过滤器：chip 样式 `rounded-full bg-white/60`，激活态 `bg-primary/10 text-primary`
- 图片卡片：`rounded-xl overflow-hidden shadow-sm`，hover 抬升阴影 + 图片 `hover:scale-105 transition`
- 右侧图片信息面板：玻璃面板，字段用「弱化标签 + 正文值」两行式
- 底部分页：胶囊按钮组 `rounded-full`，当前页 `bg-primary text-primary-foreground`

### 6.4 右侧悬浮工具条（HomeToolbar）

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
