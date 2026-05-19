# Home Modules - 重构说明

## 📋 更新概述

`folderHandler.ts` 和 `tagHandler.ts` 已更新为使用 `fetchFilesForTab` 方法，而不是直接从 `mediaStore.files` 获取数据。

## 🚀 主要改进

### 1. 数据一致性
- ✅ 使用统一的 `fetchFilesForTab` API
- ✅ 支持服务端分页和懒加载
- ✅ 保持与主要数据流的一致性

### 2. 性能优化
- ✅ 按需加载数据，避免全量加载
- ✅ 支持分页，减少内存使用
- ✅ 更好的加载状态管理

### 3. 向后兼容
- ✅ 保留同步版本的方法（标记为 `@deprecated`）
- ✅ 新增异步版本，提供更好的性能

## 📖 使用方法

### FolderHandler 使用示例

```typescript
import { useHomeFolderHandler } from '@renderer/modules/home'

const folderHandler = useHomeFolderHandler()

// 🆕 新的异步方法（推荐）
const result = await folderHandler.getFolderFiles({
  libraryId: 'your-library-id',
  pagination: { limit: 50, offset: 0 }
})
console.log('文件:', result.files)
console.log('总数:', result.total)

// 获取文件数量
const count = await folderHandler.getCurrentFolderFileCount('your-library-id')

// ⚠️ 旧的同步方法（仍可用，但不推荐）
const files = folderHandler.getFolderFilesSync()
```

### TagHandler 使用示例

```typescript
import { useHomeTagHandler } from '@renderer/modules/home'

const tagHandler = useHomeTagHandler()

// 🆕 新的异步方法（推荐）
const result = await tagHandler.getTaggedFiles({
  libraryId: 'your-library-id',
  pagination: { limit: 50, offset: 0 }
})
console.log('文件:', result.files)
console.log('总数:', result.total)

// 获取文件数量
const count = await tagHandler.getCurrentTagFileCount('your-library-id')

// ⚠️ 旧的同步方法（仍可用，但不推荐）
const files = tagHandler.getTaggedFilesSync()
```

## 🔄 迁移指南

### 替换旧代码

**旧代码:**
```typescript
const files = folderHandler.getFolderFiles() // 同步，从 mediaStore.files 过滤
const count = files.length
```

**新代码:**
```typescript
const result = await folderHandler.getFolderFiles({ libraryId }) // 异步，使用 fetchFilesForTab
const count = result.total // 更准确的总数
```

### 分页支持

```typescript
// 获取第一页（50条记录）
const page1 = await folderHandler.getFolderFiles({
  libraryId: 'your-library-id',
  pagination: { limit: 50, offset: 0 }
})

// 获取第二页
const page2 = await folderHandler.getFolderFiles({
  libraryId: 'your-library-id',
  pagination: { limit: 50, offset: 50 }
})
```

## ⚡ 性能提升

1. **按需加载**: 只获取需要的数据，而不是全部文件
2. **分页支持**: 减少单次请求的数据量
3. **服务端筛选**: 在服务端进行筛选，减少网络传输
4. **统一缓存**: 与主要数据流共享缓存机制

## ⚠️ 注意事项

1. 新的方法是异步的，需要使用 `await` 或 `.then()`
2. 旧的同步方法仍然可用，但建议迁移到异步版本
3. 异步方法返回的是包含 `files` 和 `total` 的对象，而不是直接返回文件数组
4. 如果你的组件依赖于实时的文件数量显示，建议使用计算属性结合异步方法