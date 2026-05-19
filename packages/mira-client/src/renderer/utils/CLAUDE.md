# src/renderer/utils - 工具函数

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **utils**

## 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 新建文档 | 首次创建，记录全部 8 个工具模块 |

## 模块职责

渲染进程通用工具函数库，提供存储、文件处理、错误处理、数据迁移等基础能力。

## 文件清单

| 文件 | 行数 | 导出 | 描述 |
|------|------|------|------|
| `index.ts` | 117 | `debounce`, `throttle`, `formatBytes`, `formatDuration`, `copyToClipboard`, `generateId`, `sleep`, `storage`, `environment`, `ConfigStorage` | 统一导出入口 + 环境检测 + 通用工具 |
| `helpers.ts` | 389 | `pinyinMatch`, `deepClone`, `formatDate`, `generateId`, `safeParseJSON`, `isEmpty`, `getBrowserInfo`, `copyToClipboard`, `highlightText`, `truncateText`, `uniqueArray`, `objectToQuery`, `queryToObject` | 通用工具函数（含拼音匹配） |
| `fileUtils.ts` | 341 | `formatFileSize`, `getFileExtension`, `getFileType`, `getFileTypeIcon`, `isFileTypeAllowed`, `getMimeType`, `downloadFile`, `readFileAsDataURL`, `readFileAsText`, `compressImage`, `validateFileSize`, `generateUniqueFilename`, `createVideoThumbnail`, `createFilePreviewUrl` | 文件处理（类型检测/压缩/缩略图） |
| `ConfigStorage.ts` | 262 | `ConfigStorage` (default) | localStorage 封装，生产环境特定 key 走文件存储 |
| `LibraryStorage.ts` | 142 | `LibraryStorage` | 按素材库 ID 隔离的存储（`{libraryId}_mira_{prefix}`） |
| `DataMigration.ts` | 110 | `DataMigration` | 旧格式数据迁移到素材库隔离格式 |
| `errorHandler.ts` | 142 | `createAppError`, `parseError`, `formatErrorMessage`, `setupGlobalErrorHandler`, `retryOperation`, `getErrorBoundaryMessage`, `ErrorCodes` | 错误处理与重试 |
| `mockData.ts` | ~220 | `MockDataGenerator` | 测试数据生成器（开发用） |

## 核心模块详解

### ConfigStorage

双层存储策略：
- **开发环境**: 全部使用 `localStorage`
- **生产环境**: `mira-servers`、`mira-settings` 走文件存储（`resources/configs/{key}.json`），其余走 `localStorage`
- 提供 `setJSON`/`getJSON` 便捷方法

### LibraryStorage

解决多素材库切换时数据隔离问题：
- Key 格式: `{libraryId}_mira_{prefix}`
- 支持 `migrateExistingData()` 从旧格式迁移

### environment 对象

```typescript
const environment = {
  isDevelopment: boolean,
  isProduction: boolean,
  isElectron: boolean,
  isMac: boolean,
  isWindows: boolean,
  isLinux: boolean
}
```

### 拼音匹配 (helpers.ts)

`pinyinMatch(text, query)` 支持三级匹配：
1. 直接包含
2. 全拼匹配（`zhongwen` 匹配 `中文`）
3. 首字母匹配（`zw` 匹配 `中文`）

内部使用 LRU 缓存（上限 1000 条）避免重复计算。

## 关键依赖

- `pinyin`: 中文拼音转换（helpers.ts）
- `ConfigStorage` 被 `PluginService`、`ShortcutService`、各 Store 广泛引用

## 测试与质量

无独立测试。
