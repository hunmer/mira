# HomeView 重构说明

## 📁 目录结构

```
HomeView/
├── index.vue                      # 主入口文件（模板 + 逻辑整合）
├── useHomeUIState.ts              # UI状态管理
├── useHomeTabManagement.ts        # Tab管理逻辑
├── useHomeLibraryManagement.ts    # 素材库管理逻辑
├── useHomeEventHandlers.ts        # 事件处理逻辑
├── useHomeInit.ts                 # 初始化逻辑
└── README.md                      # 本说明文档
```

## 🎯 重构目标

将原本1100+行的单文件组件拆分为多个功能模块,提高代码可维护性和可读性。

## 📦 模块说明

### 1. `index.vue` - 主入口文件
- **职责**: Vue组件模板 + 模块整合
- **内容**:
  - 完整的Vue模板结构
  - 所有UI组件的导入
  - 各功能模块的初始化和连接
  - 生命周期钩子管理

### 2. `useHomeUIState.ts` - UI状态管理
- **职责**: 管理对话框显示状态和环境检测
- **导出**:
  - 对话框状态: `showServerManagementDialog`, `showServerEditDialog`, `showShortcutDialog`, `showHotUpdateDialog`
  - 环境状态: `isProduction`, `editingServer`
  - 方法: `checkProductionEnvironment`, `handleShowHotUpdate`, `showLibraryManagement`

### 3. `useHomeTabManagement.ts` - Tab管理逻辑
- **职责**: 处理Tab的创建、切换、关闭等操作
- **导出**:
  - Tab状态: `activeTabs`, `currentTab`, `currentTabViewConfig`
  - Tab操作: `switchToTabWithCallback`, `closeTabWithCallback`, `handleActivateLastTab`, `handleReopenClosedTab`
  - 右键菜单: `tabContextMenuItems`, `handleTabContextMenu`
  - 分页管理: `getTabPaginationState`, `updateTabPaginationState`
  - 数据加载: `loadTabData`

### 4. `useHomeLibraryManagement.ts` - 素材库管理逻辑
- **职责**: 处理素材库的选择、创建、编辑等操作
- **导出**:
  - 状态: `showNoLibraryDialog`
  - 方法: `handleSelectCollection`, `handleEditServer`, `handleAddServer`, `handleServerSaved`, `handleCreateLibrary`, `initializeDefaultLibrary`

### 5. `useHomeEventHandlers.ts` - 事件处理逻辑
- **职责**: 处理文件夹、标签选择和刷新等事件
- **导出**:
  - 文件夹/标签: `handleFolderSelect`, `handleTagSelect`
  - 刷新操作: `handleRefreshFolders`, `handleRefreshTags`
  - 事件监听: `registerGlobalEvents`, `cleanupGlobalEvents`
  - 内部事件: `handleTagSelected`, `handleFolderSelected`

### 6. `useHomeInit.ts` - 初始化逻辑
- **职责**: 处理组件挂载时的初始化流程
- **导出**:
  - 模块初始化: `initializeHomeModules`
  - 素材库初始化: `initializeLibrary`
  - 完整初始化: `performInitialization`

## 🔄 数据流

```
index.vue (挂载)
    ↓
useHomeInit.ts (初始化)
    ↓
┌── useHomeLibraryManagement.ts (素材库初始化)
│
└── initializeHomeModules (路由处理器初始化)
    ↓
使用Tab管理和事件处理
    ↓
监听全局事件和快捷键
```

## ✨ 重构优势

### 1. **关注点分离**
- 每个文件专注于单一功能领域
- UI状态、Tab管理、素材库管理、事件处理各自独立

### 2. **代码复用性**
- 各个composable函数可以独立测试
- 功能模块可以在其他组件中复用

### 3. **可维护性提升**
- 减少单文件代码量,降低理解难度
- 按功能模块组织,易于定位和修改
- 清晰的依赖关系

### 4. **状态管理清晰**
- 每个模块有明确的输入和输出
- 状态的来源和流向一目了然

## ⚠️ 重要提示

### 状态同步
所有模块保持对原有状态的完整支持,包括:
- Tab级别的分页状态管理
- 全局状态与Tab状态的同步
- 路由参数的自动更新

### 事件处理
- 全局事件监听在组件挂载时注册
- 组件卸载时自动清理所有监听器
- 支持快捷键系统的事件响应

### 向后兼容
- 保留所有原有功能
- 不改变任何外部API
- 维持所有状态更新机制

## 🚀 使用方式

直接导入 `HomeView/index.vue` 即可使用,无需修改任何引用:

```typescript
import HomeView from '@renderer/views/HomeView'
// 或
import HomeView from '@renderer/views/HomeView/index.vue'
```

## 📝 维护指南

### 添加新功能
1. 确定功能所属模块(UI状态/Tab管理/素材库/事件/初始化)
2. 在对应的composable文件中添加逻辑
3. 在index.vue中连接新功能

### 修改现有功能
1. 定位功能所在的模块文件
2. 修改composable函数
3. 必要时更新index.vue中的连接代码

### 调试技巧
- 每个模块都有console.log记录关键操作
- 使用emoji标记不同类型的日志便于识别
- 关键状态变化都有详细日志输出
