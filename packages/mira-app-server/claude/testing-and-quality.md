# testing-and-quality

## 测试命令 (`package.json` scripts)

| 命令 | 执行 | 说明 |
|------|------|------|
| `pnpm test` | `jest --config sdk/jest.config.js` | 单元测试（必须指定 `sdk/jest.config.js`） |
| `pnpm run test:watch` | `jest --config sdk/jest.config.js --watch` | 监视模式 |
| `pnpm run test:coverage` | `jest --config sdk/jest.config.js --coverage` | 覆盖率报告 |
| `pnpm run test:integration` | `node sdk/scripts/test-and-fix.js` | 集成测试脚本 |
| `pnpm run test:paths` | `node --test -r ts-node/register src/sync/*.test.ts`（2026-08 新增） | `src/sync/` 下用 node:test 跑的测试（FilePathSet / ImportedFileEvents） |
| `pnpm run build:sdk` | `tsc --project sdk/tsconfig.json` | 构建 SDK（独立 tsconfig） |
| `pnpm run sdk:example` | `ts-node sdk/examples/usage-examples.ts` | 运行 SDK 使用示例 |

> 另有 `src/services/DuplicateScanner.test.ts`（jest 风格，随 `pnpm test` 跑）。SDK 本体的 vitest 测试在 `mira-app-core`（见该包文档）。

## Jest 配置

- 配置文件：`sdk/jest.config.js`（**不在包根**）。
- 测试框架：`jest ^29.7.0` + `ts-jest ^29.1.1`（TypeScript 转译）。
- 类型：`@types/jest ^29.5.8`。

> 未发现：`sdk/jest.config.js` 的具体内容（testMatch / moduleNameMapper / coverage 阈值 / 转发到 ts-jest 的 tsconfig 等）—— 当前会话未读取 `sdk/` 目录任何文件。`sdk/scripts/test-and-fix.js` 的修复逻辑也未读取。

## 质量工具

- TypeScript：`typescript ^5.3.3`，构建 = `copy-dashboard + copy-web + tsc`（无独立 lint 脚本）。
- 未发现 ESLint / Prettier / husky / lint-staged 配置（`package.json` 无对应脚本，根目录配置未扫描）。

## CI / Docker

- 存在 `Dockerfile`、`Dockerfile.optimized`、`docker-build.sh`、`docker-build.bat`，未读取具体内容，未发现 CI 工作流配置（如 `.github/workflows/`）。
