# src/components/ui - shadcn-vue 组件库

[根目录](../../../CLAUDE.md) > **src/components/ui**

> 导航: [Renderer 模块](../../renderer/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-23 | 增量更新 | 组件目录 52→53:+chart(@unovis/vue 图表封装,配合 Dashboard 统计卡片) |
| 2026-08-20 | 增量更新 | 组件目录 34→52:v2.x 新增 carousel/chapter-scrubber/color-picker 系列/command(回归)/expandable-gallery/file-card/file-icon/file-system/folder/form/glowing-*/input-group/notification-list/skeleton/collapsible(回归) 等 18 个 |
| 2026-08-05 | 架构迁移 | 统一到 shadcn-vue `new-york-v4` 默认样式；删除自定义 `volt/` 组件库与未引用组件；清理 mira-* 自定义样式系统。详见仓库根 `task_plan.md` / `progress.md`。 |
| 2026-05-12 | 新建文档 | 首次创建 |

## 模块职责

基于 shadcn-vue（底层 reka-ui）的 UI 基础组件库，样式基线为 **new-york-v4**。
通过 `components.json` 配置，可用 `npx shadcn-vue@latest add <name>` 增量添加。
应用代码统一经 `@/components/ui/<name>` 别名导入；**不直接 import reka-ui**。

## 入口与启动

无独立入口，通过路径别名直接导入：

```vue
<script setup>
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
</script>
```

## 对外接口

### 组件目录（53 个，08-20 后新增 chart）

| 分类 | 组件 |
|------|------|
| `alert` | Alert, AlertTitle, AlertDescription |
| `alert-dialog` | AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, ... |
| `avatar` | Avatar, AvatarImage, AvatarFallback |
| `badge` | Badge |
| `button` | Button |
| `calendar` | Calendar, CalendarCell, CalendarGrid, CalendarHeader, ...（被 `date-picker` 复用） |
| `card` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction |
| `carousel` | Carousel（v2.x 新增） |
| `checkbox` | Checkbox |
| `collapsible` | Collapsible 系列（v2.x 回归） |
| `color-picker` | ColorPicker（v2.x 新增，业务复合） |
| `color-slider` / `color-swatch` | 色板/色块（v2.x 新增，配合 color-picker） |
| `command` | Command 系列（v2.x 回归，命令面板） |
| `context-menu` | ContextMenu, ContextMenuItem, ContextMenuTrigger, ContextMenuContent, ... |
| `date-picker` | DatePicker（本地组合：Input + Popover + Calendar；从原 volt 迁入） |
| `dialog` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, ... |
| `dropdown-menu` | DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, ... |
| `empty` | Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle |
| `expandable-gallery` | 可展开画廊（v2.x 新增，业务复合） |
| `file-card` | 文件卡片（v2.x 新增，业务复合） |
| `file-icon` | 文件类型图标（v2.x 新增，配合 public/icons） |
| `file-system` | 文件系统选择（v2.x 新增，业务复合） |
| `folder` | 文件夹展示（v2.x 新增，业务复合） |
| `form` | Form 系列（v2.x 新增） |
| `glowing-button` / `glowing-shadow` | 发光按钮/阴影（v2.x 新增，动效） |
| `hover-card` | HoverCard, HoverCardTrigger, HoverCardContent |
| `input` | Input |
| `input-group` | InputGroup（v2.x 新增） |
| `label` | Label |
| `native-select` | NativeSelect, NativeSelectOption（calendar 内部用） |
| `notification-list` | 通知列表（v2.x 新增，业务复合） |
| `popover` | Popover, PopoverTrigger, PopoverContent, PopoverAnchor |
| `progress` | Progress |
| `radio-group` | RadioGroup, RadioGroupItem |
| `resizable` | ResizablePanelGroup, ResizableHandle, ResizablePanel |
| `scrollbar` | Scrollbar（酷滚动条：形态机 + 波纹悬停 + 标注点，2026-09 移植 scrollbar-but-cooler 并合并 ChapterScrubber） |
| `select` | Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, ... |
| `separator` | Separator |
| `sheet` | Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, ... |
| `skeleton` | Skeleton（v2.x 新增） |
| `slider` | Slider |
| `sonner` | Toaster（导出名 `Toaster`，源文件 Sonner.vue） |
| `stepper` | Stepper, StepperItem, StepperTrigger, StepperIndicator, StepperTitle, ... |
| `switch` | Switch |
| `table` | Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableEmpty, ... |
| `tabs` | Tabs, TabsList, TabsTrigger, TabsContent |
| `textarea` | Textarea |
| `toggle` | Toggle |
| `toggle-group` | ToggleGroup, ToggleGroupItem |
| `tooltip` | Tooltip, TooltipTrigger, TooltipContent, TooltipProvider |

> v2.x 新增的 18 个:carousel、chapter-scrubber、collapsible、color-picker、color-slider、color-swatch、command、expandable-gallery、file-card、file-icon、file-system、folder、form、glowing-button、glowing-shadow、input-group、notification-list、skeleton。其中带「业务复合」标记的不是 shadcn 官方目录,而是本地扩展(同早期 date-picker 的做法)。

## 关键依赖与配置

- `reka-ui`: 无头 UI 组件原语（shadcn-vue 底层）
- `@lucide/vue`: new-york-v4 默认图标库（`components.json` 的 `iconLibrary: lucide`）
- `@internationalized/date`: calendar 日期工具
- `@tanstack/vue-table`: table（高级用法）
- `class-variance-authority`: 样式变体管理
- `clsx` + `tailwind-merge`: CSS 类名合并（`cn()` 在 `src/lib/utils.ts`）
- `vue-sonner`: Toast 通知

## 已移除（迁移说明）

- **`volt/`** 自定义组件库已整体删除；业务消费方迁至 `@/components/ui`（Chip→Badge、DataTable→Table、Dropdown→Popover/Select、IconField→内联、DatePicker→`ui/date-picker`、FilterBar→`@/components/business/FilterBar`）。
- 已删除未引用的组件目录：accordion、drawer、navigation-menu、pagination、scroll-area（collapsible、command 曾在此列,v2.x 已按需加回）。
- 自定义 `--mira-*` / `--surface-*` 样式系统已删除，统一用 shadcn 语义 token（`bg-background`、`text-muted-foreground` 等）。

## 数据模型

无独立数据模型。

## 测试与质量

无独立测试；以 `pnpm run build`（renderer + main + preload 三段构建）作为回归门禁。

状态组件的 `v-model` 协议与旧版 radix-vue 不同，修改 Switch、Checkbox 等组件前先阅读 [Reka UI 状态绑定陷阱](../../../docs/reka-ui-binding-pitfalls.md)。
