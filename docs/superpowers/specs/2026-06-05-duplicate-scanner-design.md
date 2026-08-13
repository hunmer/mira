# 重复文件扫描插件设计

> 日期: 2026-06-05
> 状态: 历史设计。2026-08-13 起功能已内置到 mira-app-server 和 Dashboard 数据库扫描卡片，原插件已移除。
> 状态: 设计已批准

## 概述

新建服务端插件 `mira_duplicate_scanner`，在单个素材库内扫描重复文件（文件名+文件大小一致），通过 Dashboard 动态路由注入前端页面，展示对比 UI 并支持批量删除。同时扩展 `window.MiraDashboardUI` 暴露更多 shadcn-vue 组件，提升插件 UI 开发能力。

## 技术方案

**路线**: 服务端插件 + Dashboard 前端页（方案 A）

复用现有 dashboard 插件动态加载机制：服务端插件通过 `registerRoutes()` 注册路由定义 → Dashboard `pluginRoutes.ts` 拉取并 `router.addRoute()` → 组件通过 `window.MiraDashboardUI` 获取 shadcn-vue 组件。

## 1. 服务端插件

### 1.1 目录结构

```
plugins/plugins/mira_duplicate_scanner/
├── index.ts                  # 插件入口，继承 ServerPlugin
├── DuplicateScanner.ts       # 核心扫描逻辑
├── routes.ts                 # HTTP 路由
├── components/
│   └── DuplicateScanner.js   # Dashboard 前端组件（IIFE）
└── package.json
```

### 1.2 API 端点

| 端点 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/duplicate/scan` | POST | `{ libraryId, mode: 'quick'\|'precise' }` | 启动扫描，返回 `{ scanId, groups }` |
| `/api/duplicate/result/:scanId` | GET | query: `libraryId` | 获取扫描结果 |
| `/api/duplicate/delete` | POST | `{ libraryId, fileIds: number[] }` | 批量删除文件 |

### 1.3 扫描逻辑

**quick 模式（默认）**:
```sql
SELECT title, size, COUNT(*) as cnt
FROM files
GROUP BY title, size
HAVING cnt > 1
```
再按分组查询完整文件记录，返回分组列表。

**precise 模式**:
在 quick 结果基础上，过滤仅保留 `hash` 字段相同（且非空）的文件。`FileData.hash` 字段在 SDK 类型中已定义。

扫描为同步 SQL 查询，直接返回结果，不需要异步任务队列。

### 1.4 路由注册

```typescript
const route: PluginRouteDefinition = {
  name: 'DuplicateScanner',
  group: '文件管理',
  path: '/tools/duplicate-scanner',
  component: 'components/DuplicateScanner.js',
  pluginName: 'mira_duplicate_scanner',
  meta: { title: '重复文件扫描', roles: ['super', 'admin', 'user'] }
}
```

### 1.5 plugins.json 注册

在素材库的 `plugins.json` 中添加:
```json
{
  "name": "mira_duplicate_scanner",
  "path": "mira_duplicate_scanner",
  "enabled": true
}
```

## 2. Dashboard 前端页面

### 2.1 组件规范

遵循 Dashboard 插件组件编写规范（IIFE，注册到 `window.MiraPluginComponents`）：

```javascript
(function () {
  if (!window.MiraPluginComponents) {
    window.MiraPluginComponents = {};
  }
  const ui = window.MiraDashboardUI || {};
  const Dashboard = window.MiraDashboard || {};

  const DuplicateScanner = {
    name: 'DuplicateScanner',
    components: {
      MiraButton: ui.Button,
      MiraCard: ui.Card,
      // ...按需注册
    },
    template: `<div>...</div>`,
    data() { return { ... } },
    methods: { ... }
  };

  window.MiraPluginComponents['mira_duplicate_scanner_components_DuplicateScanner_js'] = DuplicateScanner;
})();
```

### 2.2 UI 布局

```
┌─────────────────────────────────────────────┐
│ 重复文件扫描                                  │
├─────────────────────────────────────────────┤
│ [素材库选择 ▼]  [快速/精确 切换]  [开始扫描]    │
├─────────────────────────────────────────────┤
│ 扫描结果: 3 组重复，共 12 个文件               │
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐   │
│ │ 组 1: "photo.jpg" (2.4 MB × 3)      │   │
│ │ [缩略图1 □删] [缩略图2 □删] [缩略图3 ☑保] │   │
│ │ /photos/2024  /backup/old  /photos/2024│   │
│ └───────────────────────────────────────┘   │
│ ┌───────────────────────────────────────┐   │
│ │ 组 2: "report.pdf" (156 KB × 2)      │   │
│ │ ...                                   │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ [全选重复项]              [删除选中 (5个)]    │
└─────────────────────────────────────────────┘
```

### 2.3 交互流程

1. **选择素材库** — `Select` 下拉框，调用 `Dashboard.getLibraries()` 获取列表
2. **选择模式** — 默认 quick，可切换 precise
3. **点击扫描** — POST `/api/duplicate/scan`，显示 loading
4. **展示结果** — 按重复组展示（Card 容器），每组显示文件名、大小、重复数量
5. **展开对比** — 每组显示各文件缩略图 + 路径 + Checkbox 勾选
6. **批量删除** — 勾选文件 → 点击删除 → Dialog 确认 → POST `/api/duplicate/delete`
7. **空状态** — "未发现重复文件"
8. **错误状态** — 显示错误信息

### 2.4 使用的 UI 组件

| 组件 | 用途 |
|------|------|
| Card/CardContent/CardHeader/CardTitle | 分组容器、页面标题 |
| Button | 扫描、删除、模式切换 |
| Select/* | 素材库选择 |
| Checkbox | 文件勾选 |
| Badge | 重复数量标记 |
| Dialog/* | 删除确认对话框 |
| Table/* | 文件详情列表（备选） |
| ScrollArea | 结果滚动 |
| Separator | 分隔 |
| Input | 搜索过滤（可选） |
| Progress | 扫描进度（可选） |

### 2.5 API 请求

所有请求通过 `Dashboard.getApiBase()` 获取基础路径：
```javascript
const apiBase = Dashboard.getApiBase(); // '/api'
const res = await fetch(`${apiBase}/duplicate/scan`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ libraryId: this.selectedLibraryId, mode: this.scanMode })
});
```

### 2.6 样式约定

使用 Tailwind token 类名保持与 Dashboard 视觉一致：
- `text-muted-foreground` — 次要文字
- `bg-muted` — 次要背景
- `border` — 边框
- `hover:bg-accent` — 悬停效果
- `text-sm` / `text-lg` / `font-medium` — 字体

## 3. 插件 UI 基础设施扩展

### 3.1 扩展 `window.MiraDashboardUI`

在 `packages/mira-dashboard-next/src/pluginRuntime.ts` 中补充导出：

**已有组件**:
Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ScrollArea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator

**新增组件**:
- `Checkbox`
- `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter`
- `Table, TableHeader, TableRow, TableCell, TableBody, TableHead`
- `Tabs, TabsList, TabsTrigger, TabsContent`
- `Input`
- `Progress`

### 3.2 设计决策

**不在 `context.api` 上封装 UI 组件**。理由：
- `context.api` 属于客户端插件系统（`PluginService.createPluginContext()`）
- 本项目走服务端插件 + Dashboard 前端路线，前端组件通过 `window.MiraDashboardUI` 获取
- 这是两个独立的插件系统，不应混合
- Dashboard 的 `window.MiraDashboardUI` 机制已足够且可扩展

## 不做的事

- 跨素材库扫描（当前仅单库）
- 异步扫描任务队列（SQL 查询直接返回）
- 文件移动功能（仅对比查看 + 批量删除）
- 客户端 Electron 侧的 UI 封装
- 扫描结果持久化（每次实时扫描）

## 影响范围

| 文件/目录 | 变更类型 | 说明 |
|-----------|---------|------|
| `plugins/plugins/mira_duplicate_scanner/` | 新增 | 整个插件目录 |
| `packages/mira-dashboard-next/src/pluginRuntime.ts` | 修改 | 扩展 MiraDashboardUI 导出 |
| 对应素材库 `plugins.json` | 修改 | 注册新插件 |
