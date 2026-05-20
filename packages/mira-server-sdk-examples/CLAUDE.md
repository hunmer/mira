[根目录](../../CLAUDE.md) > [packages](..) > **mira-server-sdk-examples**

# mira-server-sdk-examples

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira Server SDK 的示例代码和测试用例集合，帮助开发者快速了解 SDK 用法。包含认证、上传、基础/高级用法示例。

## 入口与启动

- **入口**: `run-examples.js` -- 示例运行器
- **示例目录**: `examples/`
- **测试目录**: `tests/`
- **运行**: `pnpm run example:all` 或 `pnpm run demo`

## 对外接口

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

## 测试与质量

- `pnpm test` -- 运行所有测试
- `pnpm run test:auth` -- 认证测试
- `pnpm run test:upload` -- 上传测试

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `run-examples.js` | 示例运行器 |
| `examples/` | 示例代码目录 |
| `tests/` | 测试目录 |
| `package.json` | 包配置 (v1.0.0, MIT) |
