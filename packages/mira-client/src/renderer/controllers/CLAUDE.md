# src/renderer/controllers - 控制器

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **controllers**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 架构扫描更新 | 补充面包屑导航 |

## 概述

控制器目录包含业务逻辑控制器，将复杂的业务逻辑从组件中分离。

## 目录结构

```
controllers/
├── HomeController/           # 首页控制器
│   ├── index.ts             # 入口 (296 行)
│   ├── stateManager.ts      # 视图状态管理 (350 行)
│   ├── dataManager.ts       # 数据获取管理 (247 行)
│   ├── fileOperations.ts    # 文件操作 (268 行)
│   ├── interactionHandler.ts # 交互处理 (439 行)
│   ├── utils.ts             # 工具函数 (46 行)
│   └── types.ts             # 类型定义 (24 行)
├── ImagePreviewController.ts # 图片预览控制器 (349 行)
└── VideoPreviewController.ts # 视频预览控制器 (171 行)
```

## HomeController 职责分离

| 模块 | 行数 | 职责 |
|------|------|------|
| `stateManager` | 350 | 管理视图状态（选中项、展开项、排序等） |
| `dataManager` | 247 | 数据获取、缓存、分页 |
| `fileOperations` | 268 | 文件操作（移动、复制、删除、重命名） |
| `interactionHandler` | 439 | 用户交互（点击、双击、右键菜单、分页） |

## 使用方式

```typescript
import { HomeController } from './controllers/HomeController'

const controller = new HomeController()
// 通过 controller.mediaItems, controller.filteredMediaItems 等访问数据
```
