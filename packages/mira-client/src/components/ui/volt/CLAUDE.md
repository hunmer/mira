# src/volt - 自定义组件库

[根目录](../../CLAUDE.md) > **src/volt**

> 导航: [Renderer 模块](../renderer/CLAUDE.md)

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充完整组件清单、文件统计 |

## 模块职责

Volt 是项目的自定义 Vue 组件库，提供 58 个基础 UI 组件，作为 PrimeVue 和 shadcn/ui 的补充。包含基础表单、数据展示、导航、反馈等组件。

## 入口与启动

无独立入口，通过路径别名 `@volt/*` 直接导入使用。

```vue
<script setup>
import Button from '@volt/Button.vue'
</script>
```

## 对外接口

### 基础组件 (12 个)

| 组件 | 描述 |
|------|------|
| `Button.vue` | 按钮 (73 行) |
| `Card.vue` | 卡片 |
| `Checkbox.vue` | 复选框 |
| `CheckboxGroup.vue` | 复选框组 (71 行) |
| `Chip.vue` | 标签 |
| `Dialog.vue` | 对话框 (60 行) |
| `Dropdown.vue` | 下拉菜单 (270 行) |
| `InputText.vue` | 文本输入 |
| `InputNumber.vue` | 数字输入 (137 行) |
| `Password.vue` | 密码输入 (76 行) |
| `Textarea.vue` | 文本域 |
| `Select.vue` | 选择器 (70 行) |

### 布局组件 (4 个)

| 组件 | 描述 |
|------|------|
| `Drawer.vue` | 抽屉 (43 行) |
| `Splitter.vue` | 分割器 |
| `Divider.vue` | 分割线 |
| `Toolbar.vue` | 工具栏 |

### 数据展示组件 (11 个)

| 组件 | 描述 |
|------|------|
| `DataTable.vue` | 数据表格 |
| `DataView.vue` | 数据视图 |
| `Tree.vue` | 树形组件 (301 行) |
| `TreeNode.vue` | 树节点 (372 行) |
| `FilterTree.vue` | 过滤树 (342 行) |
| `FilterTreeNode.vue` | 过滤树节点 (144 行) |
| `Tag.vue` | 标签 |
| `Badge.vue` | 徽章 |
| `ProgressBar.vue` | 进度条 |
| `MeterGroup.vue` | 仪表组 |
| `FilterBar.vue` | 过滤栏 (591 行, 最大的组件) |

### 导航组件 (9 个)

| 组件 | 描述 |
|------|------|
| `Menu.vue` | 菜单 (96 行) |
| `Tabs.vue` | 标签页 |
| `Tab.vue` / `TabList.vue` / `TabPanel.vue` / `TabPanels.vue` | 标签页相关 |
| `Stepper.vue` / `Step*.vue` (5 个) | 步骤条 |

### 反馈组件 (3 个)

| 组件 | 描述 |
|------|------|
| `Toast.vue` | 吐司提示 |
| `Message.vue` | 消息 |
| `ConfirmDialog.vue` | 确认对话框 (54 行) |

### 表单组件 (5 个)

| 组件 | 描述 |
|------|------|
| `DatePicker.vue` | 日期选择器 (50 行) |
| `RadioButton.vue` | 单选按钮 |
| `SelectButton.vue` | 选择按钮 |
| `Toggleswitch.vue` | 开关 |
| `ToggleButton.vue` | 切换按钮 |

### 其他组件 (7 个)

| 组件 | 描述 |
|------|------|
| `Avatar.vue` | 头像 |
| `ContextMenu.vue` | 右键菜单 (77 行) |
| `Paginator.vue` | 分页器 |
| `IconField.vue` / `InputIcon.vue` | 图标字段 |
| `DangerButton.vue` / `SecondaryButton.vue` / `ContrastButton.vue` | 特殊按钮 |

### 工具文件

| 文件 | 描述 |
|------|------|
| `utils.ts` | 工具函数 (7 行) |
| `DatePicker.vue.d.ts` | DatePicker 类型声明 |

## 关键依赖与配置

- Vue 3 Composition API
- 路径别名: `@volt/*` -> `./src/volt/*`

## 数据模型

无独立数据模型。

## 测试与质量

无独立测试。

## 相关文件清单

全部 58 个组件文件（见上方组件清单）。
