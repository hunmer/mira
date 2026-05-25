[根目录](../../CLAUDE.md) > [packages](..) > **mira-server-sdk-examples**

# mira-server-sdk-examples

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 补充示例文件清单和测试文件 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira Server SDK 的示例代码和测试用例集合，帮助开发者快速了解 SDK 用法。包含认证、上传、基础/高级用法示例。

## 入口与启动

- **入口**: `src/index.ts` -- 导出所有示例函数和 ExampleUtils 工具类
- **示例运行器**: `run-examples.js`
- **示例目录**: `examples/`
- **测试目录**: `tests/`
- **运行**: `pnpm run example:all` 或 `pnpm run demo`

## 对外接口

### 示例目录

| 目录 | 文件 | 说明 |
|------|------|------|
| `examples/auth/` | `login-example.ts` | 认证示例：basicLogin, chainedLogin, errorHandling, tokenManagement |
| `examples/files/` | `upload-example.ts` | 上传示例：basicUpload, batchUpload, advancedUpload, download |
| `examples/basic/` | `basic-usage.ts`, `basic-usage-fixed.ts` | 基础用法：quickStart, libraryManagement, userManagement, systemMonitoring |
| `examples/advanced/` | `chain-operations.ts`, `chain-operations-fixed.ts` | 高级用法：链式操作 |

### 测试文件

| 文件 | 说明 |
|------|------|
| `tests/auth.test.ts` | 认证测试 |
| `tests/upload.test.ts` | 上传测试 |
| `tests/setup.ts` | 测试设置 |

### ExampleUtils 工具类

```typescript
class ExampleUtils {
  static createTestFile(content, filename, type): File
  static formatFileSize(bytes): string
  static generateRandomFilename(extension): string
  static delay(ms): Promise<void>
  static retry<T>(fn, maxRetries, delayMs): Promise<T>
}
```

### 示例命令

| 命令 | 说明 |
|------|------|
| `pnpm run example:auth` | 认证示例 |
| `pnpm run example:upload` | 上传示例 |
| `pnpm run example:basic` | 基础用法 |
| `pnpm run example:advanced` | 高级用法 |
| `pnpm run example:all` | 运行所有示例 |

## 关键依赖与配置

- **workspace 依赖**: `mira-server-sdk`
- **运行时依赖**: `dotenv`, `chalk`, `form-data`
- **测试**: Jest (ts-jest)
- **Node**: >= 16.0.0

## 测试与质量

- `pnpm test` -- 运行所有测试
- `pnpm run test:auth` -- 认证测试
- `pnpm run test:upload` -- 上传测试
- `pnpm run test:coverage` -- 覆盖率报告

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口，导出所有示例和 ExampleUtils |
| `run-examples.js` | 示例运行器 |
| `examples/auth/login-example.ts` | 认证示例 |
| `examples/files/upload-example.ts` | 上传示例 |
| `examples/basic/basic-usage.ts` | 基础用法 |
| `examples/advanced/chain-operations.ts` | 高级用法 |
| `tests/auth.test.ts` | 认证测试 |
| `tests/upload.test.ts` | 上传测试 |
| `tests/setup.ts` | 测试设置 |
| `package.json` | 包配置 (v1.0.0, MIT) |
