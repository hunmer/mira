# mira-app-core

## 项目简单介绍

mira-app-core 是 pnpm monorepo（D:\mira_typescript）的核心库包，为 Mira TypeScript 项目提供不自动执行的共享基础能力。当前版本 **2.0.8**（name=mira-app-core，keywords=mira/core/library）。

技术栈：TypeScript（strict mode，target ES2020，module commonjs），构建用 tsc + Vite（SDK ESM bundle），测试用 vitest，依赖 axios、queue、sqlite3、ws。属于纯库模块，**不独立启动**，被 mira-app-server、mira-client、mira-scripts-core 等下游包依赖。

包含三大能力：事件管理器（EventManager，支持优先级与中断传播）、共享类型（User / Session / WebSocketMessage 等）、SQLite 存储层与 TypeScript SDK 客户端（MiraClient 暴露 17 个领域 Module 访问器，HTTP + WebSocket 双通道）。SDK 已覆盖 server 固定 JSON API 128 条中的 117 条（covered），详见根目录 `.audit/sdk-coverage-report.md`（2026-08-19 生成）。

## 约定的规则

- 构建：`pnpm run build`（tsc + `pnpm run build:sdk:esm`）；`pnpm run rebuild` 等同；`pnpm run build:ts` 仅 tsc。
- 开发/运行：`pnpm run dev` 或 `pnpm run start:ts` 用 ts-node 跑 `src/index.ts`；`pnpm run start` 跑 `node dist/index.js`（需先 build）。
- 测试：`pnpm test`（vitest run，含 contract/integration 测试，配置 `vitest.config.ts`）；`pnpm run test:watch` 监视模式；`pnpm run test:integration` 仅跑 `*.integration.test.ts`。
- 三个子导出路径：`.`（核心类型/事件/库列表）、`./storage/sqlite`（存储接口+实现）、`./shared/sdk`（SDK，import 指向 ESM bundle `mira-sdk.esm.mjs`）。
- EventManager 单例：`EventManager.instance`；处理器返回 `false` 会中断传播链；支持 priority 排序与 subscribeOnce。
- 不在 core 内自动执行业务逻辑，所有副作用交由调用方触发。

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 架构总览、模块边界 | 先看这个，了解全貌 |
| [claude/conventions.md](claude/conventions.md) | 命令、构建、编码约定 | 改代码/构建前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 子模块职责（按 src 目录） | 定位某块功能在哪 |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口与启动流程 | 看导出/如何接入 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 对外 API / SDK 接口 | 调用本库时 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖与配置文件 | 升级依赖/改 tsconfig |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 | 找具体文件 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 | 看历史 |

## 扫描状态

- 更新时间：2026-08-20（增量，上次全量 2026-08-05）
- 扫描范围：package.json（版本/脚本/依赖）、src/ 目录结构（63 个 .ts：36 个源文件 + 27 个测试文件）、src/shared/sdk/index.ts 与 client/MiraClient.ts 访问器清单、git log（2026-08-11 起 SDK 模块与测试大幅扩充）、根 `.audit/sdk-coverage-report.md` 统计。
- 本次确认的变化：版本 2.0.1 → 2.0.8；SDK Module 10 → 17（新增 Admin/CookieSite/Download/FileSystem/Settings/Statistics/Thumbnail）；新增 vitest 测试体系与 `test-helpers.ts`。
- 未扫描：各 module / mixin 的完整实现体、dist/ 构建产物、node_modules/、上下游包的使用方式。
