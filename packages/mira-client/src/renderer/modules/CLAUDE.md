# src/renderer/modules - 功能模块

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **modules**

> 导航: [首页模块](./home/CLAUDE.md)

## 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 新建文档 | 首次创建 |

## 模块职责

功能模块目录，将大型视图（如 HomeView）的复杂业务逻辑拆分为独立、可复用的处理器模块。

## 子模块

| 模块 | 路径 | 文件数 | 描述 |
|------|------|--------|------|
| **home** | `home/` | 4 | 首页路由/标签/文件夹处理器 |

## home 模块

将 HomeView.vue 的功能拆分为 3 个独立 composable：

| 文件 | 行数 | 导出 | 描述 |
|------|------|------|------|
| `index.ts` | 83 | `useHomeModules()` | 聚合入口，统一初始化/清理 |
| `routeHandler.ts` | 400 | `useHomeRouteHandler()` | URL 参数解析 -> Tab 切换（folder/tag/search） |
| `folderHandler.ts` | 287 | `useHomeFolderHandler()` | 文件夹 CRUD + 过滤 |
| `tagHandler.ts` | 241 | `useHomeTagHandler()` | 标签 CRUD + 过滤 |

### 通信机制

模块间通过 `CustomEvent` 通信，不直接耦合：
- `routeHandler` 解析 URL 后分发事件
- `folderHandler` / `tagHandler` 监听路由事件并响应

### 使用方式

```typescript
const { routeHandler, tagHandler, folderHandler, initializeAll } = useHomeModules()

onMounted(async () => {
  const cleanup = await initializeAll()
  onUnmounted(() => cleanup())
})
```

## 测试与质量

无独立测试。
