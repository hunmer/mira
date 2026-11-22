# testing-and-quality

## 测试命令 (`package.json` scripts)

| 命令 | 执行 | 说明 |
|------|------|------|
| `pnpm test` | `jest --config sdk/jest.config.js` | ⚠️ 失效：`sdk/` 目录已不存在（git 全历史未跟踪） |
| `pnpm run test:watch` | `jest --config sdk/jest.config.js --watch` | ⚠️ 失效（同上） |
| `pnpm run test:coverage` | `jest --config sdk/jest.config.js --coverage` | ⚠️ 失效（同上） |
| `pnpm run test:integration` | `node sdk/scripts/test-and-fix.js` | ⚠️ 失效（同上） |
| `pnpm run test:paths` | `node --test -r ts-node/register` 跑 6 个测试文件（2026-08 新增，2026-11 扩容） | `src/sync/`（FilePathSet / ImportedFileEvents）+ `src/routes/FileAssociationResolver.test.ts` + `src/routes/UploadImportMode.test.ts` + `src/services/ThumbnailService.test.ts` + `src/services/MetadataService.test.ts` |
| `pnpm run build:sdk` | `tsc --project sdk/tsconfig.json` | ⚠️ 失效：`sdk/` 目录已不存在 |
| `pnpm run sdk:example` | `ts-node sdk/examples/usage-examples.ts` | ⚠️ 失效（同上） |

> 包内 jest 风格单测（当前无 runner 自动挂载）：`src/services/DuplicateScanner.test.ts`、`src/routes/FileRoutes.rename.test.ts`、`src/routes/LibraryRoutes.test.ts`、`src/services/LibraryRelocationService.test.ts`（2026-11 新增 3 个）与 `tests/MetadataService.test.ts`。SDK 本体的 vitest 测试在 `mira-app-core`（见该包文档）。

## Jest 配置

- 脚本引用 `sdk/jest.config.js`，但 `sdk/` 目录在工作区与 git 全历史中均不存在（2026-08 扫描时它是未跟踪的本地目录，现已不在）——所有 jest 入口脚本当前失效，实际可用的测试入口只有 `test:paths`（node --test，6 个文件）。
- 测试框架依赖仍在：`jest ^29.7.0` + `ts-jest ^29.1.1`（TypeScript 转译）、`@types/jest ^29.5.8`。
- 仓库内 jest 风格测试文件：`tests/MetadataService.test.ts`（包根 `tests/` 目录，git 跟踪）与 `src/**/*.test.ts` 中未列入 test:paths 的（FileRoutes.rename / LibraryRoutes / LibraryRelocationService / DuplicateScanner），当前无 runner 挂载它们。

## 质量工具

- TypeScript：`typescript ^5.3.3`，构建 = `copy-dashboard + copy-web + tsc`（无独立 lint 脚本）。
- 未发现 ESLint / Prettier / husky / lint-staged 配置（`package.json` 无对应脚本，根目录配置未扫描）。

## CI / Docker

- 存在 `Dockerfile`、`Dockerfile.optimized`、`docker-build.sh`、`docker-build.bat`，未读取具体内容，未发现 CI 工作流配置（如 `.github/workflows/`）。
