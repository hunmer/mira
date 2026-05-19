# Mira Web 状态管理文档

本文档描述了 Mira Web 应用的状态管理架构，基于 Pinia 实现。

## 架构概览

应用状态管理分为以下几个核心模块：

- **AuthStore** - 用户认证状态管理
- **LibraryStore** - 素材库状态管理
- **MediaStore** - 媒体文件状态管理
- **SettingsStore** - 应用设置状态管理
- **PluginStore** - 插件状态管理

## 核心特性

### 1. 状态持久化
所有 store 都支持状态持久化到 localStorage，应用重启后能自动恢复状态。

### 2. 乐观更新
支持乐观更新策略，操作立即反映在 UI 上，失败时自动回滚。

### 3. 错误处理与重试
内置错误处理机制和重试策略，提供稳定的用户体验。

### 4. TypeScript 支持
完整的 TypeScript 类型定义，提供良好的开发体验。

## 使用指南

### 初始化

```typescript
import { initializeStores } from '@/stores'

// 应用启动时初始化所有 store
const result = await initializeStores()
if (!result.success) {
  console.error('Store initialization failed:', result.error)
}
```

### 认证管理

```typescript
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()

// 登录
const result = await authStore.login({
  username: 'user@example.com',
  password: 'password'
})

if (result.success) {
  console.log('Login successful:', result.data)
} else {
  console.error('Login failed:', result.error)
}

// 登出
await authStore.logout()

// 检查登录状态
if (authStore.isLoggedIn) {
  console.log('User:', authStore.userDisplayName)
}
```

### 素材库管理

```typescript
import { useLibraryStore } from '@/stores'

const libraryStore = useLibraryStore()

// 获取所有集合
await libraryStore.fetchCollections()

// 创建新集合
const result = await libraryStore.createCollection('My Collection', 'Description')

// 设置当前集合
libraryStore.setCurrentCollection(collection)

// 添加文件到集合
await libraryStore.addFileToCollection(fileId, collectionId)
```

### 媒体文件管理

```typescript
import { useMediaStore } from '@/stores'

const mediaStore = useMediaStore()

// 获取文件列表
await mediaStore.fetchFiles(libraryId)

// 上传文件
const file = event.target.files[0]
const result = await mediaStore.uploadFile(file, libraryId, metadata)

// 删除文件
await mediaStore.deleteFile(libraryId, fileId)

// 搜索和过滤
mediaStore.setSearchQuery('keyword')
mediaStore.setFilterType('image')
mediaStore.setSorting('name', 'asc')

// 文件选择
mediaStore.selectFile(fileId)
mediaStore.selectAllFiles()
mediaStore.deselectAllFiles()
```

### 应用设置

```typescript
import { useSettingsStore } from '@/stores'

const settingsStore = useSettingsStore()

// 连接服务器
const result = await settingsStore.connectToServer()

// 更新设置
await settingsStore.updateSetting('theme', 'dark')
await settingsStore.updateSettings({
  theme: 'dark',
  language: 'en-US',
  gridSize: 'large'
})

// 重置设置
await settingsStore.resetSettings()

// 导出/导入设置
const config = settingsStore.exportSettings()
await settingsStore.importSettings(configJson)
```

### 插件管理

```typescript
import { usePluginStore } from '@/stores'

const pluginStore = usePluginStore()

// 获取插件列表
await pluginStore.fetchPlugins()

// 安装插件
const result = await pluginStore.installPlugin(pluginId)

// 卸载插件
await pluginStore.uninstallPlugin(pluginId)

// 执行插件
const result = await pluginStore.executePlugin(pluginId, args)

// 切换插件状态
pluginStore.togglePlugin(pluginId)
```

## 计算属性

每个 store 都提供了丰富的计算属性，用于派生状态：

### AuthStore
- `userDisplayName` - 用户显示名称
- `hasRole(role)` - 检查用户角色
- `isTokenExpired` - 令牌是否过期

### LibraryStore
- `totalCollections` - 总集合数
- `totalFiles` - 总文件数
- `collectionsByType` - 按类型分组的集合
- `getCollectionById(id)` - 根据ID获取集合

### MediaStore
- `totalFiles` - 总文件数
- `selectedFileCount` - 选中文件数
- `totalSize` - 总文件大小
- `filteredFiles` - 过滤后的文件列表
- `filesByType` - 按类型分组的文件

### SettingsStore
- `isDarkMode` - 是否暗色模式
- `formattedFileSize` - 格式化的文件大小
- `isHealthy` - 系统是否健康
- `connectionStatusText` - 连接状态文本

### PluginStore
- `installedPlugins` - 已安装插件
- `enabledPlugins` - 已启用插件
- `filteredPlugins` - 过滤后的插件列表

## 错误处理

所有异步操作都返回统一的结果格式：

```typescript
interface ApiResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
```

建议在 UI 中统一处理错误：

```typescript
const result = await store.someAsyncMethod()
if (!result.success) {
  // 显示错误信息
  showErrorMessage(result.error)
}
```

## 状态同步

Store 之间通过事件或直接调用进行状态同步：

```typescript
// 用户登出时清除所有状态
import { clearAllStores } from '@/stores'

await clearAllStores()
```

## 性能优化

### 缓存策略
- 数据缓存有效期：设置合理的缓存过期时间
- 增量更新：只更新变化的数据
- 懒加载：按需加载数据

### 乐观更新
- 操作立即反映在 UI 上
- 失败时自动回滚
- 提供加载状态指示

### 错误重试
- 网络错误自动重试
- 指数退避策略
- 最大重试次数限制

## 调试

### 开发工具
使用 Vue DevTools 的 Pinia 插件查看状态变化。

### 状态摘要
```typescript
import { getAppStateSummary } from '@/stores'

console.log(getAppStateSummary())
```

### 错误日志
所有错误都会输出到控制台，便于调试。

## 最佳实践

1. **总是使用 async/await** - 所有异步操作都应该正确处理
2. **检查操作结果** - 总是检查 `result.success` 
3. **显示加载状态** - 使用 `isLoading` 状态提供用户反馈
4. **处理错误状态** - 显示用户友好的错误信息
5. **清除错误状态** - 在适当的时候调用 `clearError()`
6. **使用计算属性** - 避免在模板中进行复杂计算
7. **状态归一化** - 保持状态结构扁平化

## 扩展指南

### 添加新的 Store
1. 创建新的 store 文件
2. 实现必要的状态和方法
3. 添加 TypeScript 类型定义
4. 实现状态持久化
5. 在 `stores/index.ts` 中导出
6. 在 `initializeStores` 中初始化

### 添加新的状态
1. 定义响应式状态
2. 创建相关的计算属性
3. 实现状态变更方法
4. 添加持久化支持
5. 编写测试用例

通过遵循这些指南，可以确保状态管理的一致性和可维护性。
