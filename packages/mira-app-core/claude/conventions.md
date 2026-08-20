# 命令与约定

## 脚本命令（来自 package.json）

| 命令 | 作用 |
|------|------|
| `pnpm run build` | `tsc` + `pnpm run build:sdk:esm`（完整构建） |
| `pnpm run build:ts` | 仅 tsc，输出到 dist/ |
| `pnpm run build:sdk:esm` | Vite 打包 SDK ESM bundle（mira-sdk.esm.mjs） |
| `pnpm run rebuild` | 等同 build |
| `pnpm run dev` | ts-node 跑 src/index.ts |
| `pnpm run start:ts` | 同 dev，ts-node 跑 src/index.ts |
| `pnpm run start` | `node dist/index.js`（需先 build） |
| `pnpm test` | `vitest run`（单元 + contract 测试） |
| `pnpm run test:watch` | `vitest` 监视模式 |
| `pnpm run test:integration` | 仅跑 `src/**/*.integration.test.ts` |

## 测试

vitest（配置 `vitest.config.ts`，devDependency）。测试与源码同目录放置：`*.test.ts`（单元/contract）、`*.integration.test.ts`（需本地服务）、`src/shared/sdk/test-helpers.ts` 为共享测试工具。当前共 27 个测试文件。

## TypeScript 约定

- tsconfig.json：`target: ES2020`、`module: commonjs`、`strict: true`、`esModuleInterop: true`、`declaration + declarationMap + sourceMap`。
- 输出目录 `dist/`，源根 `src/`，排除 node_modules 与 dist。
- SDK 通过单独的 Vite 配置（`vite.sdk.config.ts`）打包为 ES module bundle，library name `MiraSDK`，输出 `dist/shared/sdk/mira-sdk.esm.mjs`，target es2020，不 minify，开 sourcemap。

## 事件系统约定

- 使用 `EventManager.instance` 单例。
- `subscribe` 支持 priority（数字越大优先级越高）；处理器返回 `false` 中断传播链。
- `subscribeOnce` 自动取消订阅。

## 包发布

- license: ISC，author: hunmer。
- `publishConfig.access: public`。
- 注意：根目录 README.md 中"无 ws/数据库依赖"的描述已过时（package.json 实际依赖 sqlite3 与 ws），以 package.json 为准。
