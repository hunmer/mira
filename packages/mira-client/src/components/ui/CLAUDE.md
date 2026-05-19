# src/components/ui - shadcn/ui 组件库

[根目录](../../../CLAUDE.md) > **src/components/ui**

> 导航: [Renderer 模块](../../renderer/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 新建文档 | 首次创建，记录 shadcn/ui 组件库结构 |

## 模块职责

基于 shadcn/ui (radix-vue/reka-ui) 的 UI 基础组件库，提供 36 个组件分类、214 个文件。这些是底层 UI 原子组件，被 Volt 组件库和业务组件引用。

## 入口与启动

无独立入口，通过路径别名直接导入使用。

```vue
<script setup>
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
</script>
```

## 对外接口

### 组件分类 (36 个)

| 分类 | 组件 |
|------|------|
| `accordion` | Accordion, AccordionItem, AccordionTrigger, AccordionContent |
| `alert-dialog` | AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, ... |
| `alert` | Alert, AlertTitle, AlertDescription |
| `avatar` | Avatar, AvatarImage, AvatarFallback |
| `badge` | Badge |
| `button` | Button |
| `calendar` | Calendar, CalendarCell, CalendarGrid, CalendarHeader, ... |
| `card` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `checkbox` | Checkbox |
| `collapsible` | Collapsible, CollapsibleTrigger, CollapsibleContent |
| `command` | Command, CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, ... |
| `context-menu` | ContextMenu, ContextMenuItem, ContextMenuTrigger, ContextMenuContent, ... |
| `dialog` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, ... |
| `drawer` | Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, ... |
| `dropdown-menu` | DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, ... |
| `input` | Input |
| `label` | Label |
| `navigation-menu` | NavigationMenu, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, ... |
| `pagination` | Pagination, PaginationItem, PaginationPrevious, PaginationNext, ... |
| `popover` | Popover, PopoverTrigger, PopoverContent |
| `progress` | Progress |
| `radio-group` | RadioGroup, RadioGroupItem |
| `resizable` | ResizablePanelGroup, ResizableHandle |
| `scroll-area` | ScrollArea, ScrollBar |
| `select` | Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, ... |
| `separator` | Separator |
| `sheet` | Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, ... |
| `sonner` | Sonner (Toast 通知) |
| `stepper` | Stepper, StepperItem, StepperTrigger, StepperIndicator, StepperTitle, ... |
| `switch` | Switch |
| `table` | Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ... |
| `tabs` | Tabs, TabsList, TabsTrigger, TabsContent |
| `textarea` | Textarea |
| `toggle-group` | ToggleGroup, ToggleGroupItem |
| `toggle` | Toggle |
| `tooltip` | Tooltip, TooltipTrigger, TooltipContent, TooltipProvider |

## 关键依赖与配置

- `radix-vue` / `reka-ui`: 无头 UI 组件原语
- `class-variance-authority`: 样式变体管理
- `clsx` + `tailwind-merge`: CSS 类名合并 (`cn()` 工具在 `src/lib/utils.ts`)
- `vaul-vue`: Drawer 组件

## 数据模型

无独立数据模型。

## 测试与质量

无独立测试。

## 相关文件清单

36 个组件目录，每个目录包含 `index.ts` 导出文件和对应的 `.vue` 组件文件，共 214 个文件。
