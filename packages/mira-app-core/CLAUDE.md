# mira-app-core

## 项目简单介绍

mira-app-core 是 pnpm monorepo（/Users/Zhuanz/Documents/mira）的核心库包，为 Mira TypeScript 项目提供不自动执行的共享基础能力。当前版本 **3.0.2**（name=mira-app-core，keywords=mira/core/library）。

技术栈：TypeScript（strict mode，target ES2020，module commonjs），构建用 tsc + Vite（SDK ESM bundle），测试用 vitest，依赖 axios、queue、sqlite3、ws。属于纯库模块，**不独立启动**，被 mira-app-server、mira-client、mira-scripts-core 等下游包依赖。

包含三大能力：事件管理器（EventManager，支持优先级与中断传播）、共享类型（User / Session / WebSocketMessage 等）、SQLite 存储层与 TypeScript SDK 客户端（MiraClient 暴露 17 个领域 Module 访问器，HTTP + WebSocket 双通道）。SDK 覆盖 server 固定 JSON API 141 条中的 128 条（covered，2026-09-09 审计），详见根目录 `.audit/sdk-coverage-report.md`。SDK HttpClient 支持 401 自动重认证（`onUnauthorized` 回调取新 token 后重放一次）。

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

- 更新时间：2026-11-21（增量，上次 2026-08-25；基线 bc638a73 以来 22 个文件变更，提交信息全为 "fix"，经 diff 取证）
- 扫描范围：package.json、`src/shared/sdk/`（types/HttpClient/5 模块 + 新 contract 测试）、`src/storage/sqlite/`（mixins/重试工具/新测试）、`.audit/sdk-coverage-report.md`、git diff 聚合。
- 本次确认的变化（3.0.1 → 3.0.2）：
  - **SDK 模块仍 17 个**，新增方法：FileModule `importFilePath`（POST /api/files/import-path，本机路径导入）与 `checkDuplicates`（POST /api/files/checkDuplicates，重名检查）；LibraryModule `relocate`/`getRelocationProgress`（素材库物理迁移）；TagModule `setFileTagsBatch`（批量设标签）。类型放宽：folder/folderId/tags 普遍接受 ID 或名称（BatchImportOptions +tags）；FileFilters +imported_after/imported_before/ids；FileData +recycled；新类型 RelocateLibraryResponse/LibraryRelocationProgress
  - **HttpClient 401 自动重认证**：ClientConfig 新增 `onUnauthorized?: () => Promise<string | undefined>`；401 且非 login/非重放请求时单飞 reauthenticate() 取新 token 重放一次，失败抛原 401
  - **回收/恢复一致性**：deleteFile(回收) 与 recoverFile 同步 `name=path.basename`；rename/copy/unlink/recover 包 `retryFileOperation`（新 `storage/sqlite/retryFileOperation.ts`，仅 EBUSY/EPERM/EACCES 指数退避 5 次），失败回滚 DB 原值并清理目标文件
  - **skipSameName**：LibraryServerDataSQLite +skipSameName getter（customFields.skipSameName ?? false）；createFileFromPath 同文件夹同名（recycled=0）直接返回已有记录 `{...existing, duplicate:true}`
  - FileOperations.getFiles filters 新增 created_after/created_before/imported_after/imported_before（数字或 ISO 串）与 ids 数组（sort:'ids' 按传入顺序排）；新 `checkDuplicateNames(names)` 分块 500 查重
  - **copy 模式 path=NULL 适配**：FolderOperations 文件夹回收站改用 getItemFilePath 解析物理路径（同 server 侧 Metadata/Thumbnail 改法）
  - 新测试：FileOperations.recycle / MetadataImport / LibraryModule.contract / HttpClient.contract / FileModule.test（测试文件 27→29）
- 未扫描：各 module / mixin 的完整实现体、dist/ 构建产物、node_modules/、上下游包的使用方式。
- 下一步建议：`claude/public-interfaces.md` 的 SDK 方法清单已补 v3.0.2 新方法摘要，完整逐方法清单仍未生成。
