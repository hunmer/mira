# mira-app-core

## 项目简单介绍

mira-app-core 是 pnpm monorepo（/Users/Zhuanz/Documents/mira）的核心库包，为 Mira TypeScript 项目提供不自动执行的共享基础能力。当前版本 **3.0.1**（name=mira-app-core，keywords=mira/core/library）。

技术栈：TypeScript（strict mode，target ES2020，module commonjs），构建用 tsc + Vite（SDK ESM bundle），测试用 vitest，依赖 axios、queue、sqlite3、ws。属于纯库模块，**不独立启动**，被 mira-app-server、mira-client、mira-scripts-core 等下游包依赖。

包含三大能力：事件管理器（EventManager，支持优先级与中断传播）、共享类型（User / Session / WebSocketMessage 等）、SQLite 存储层与 TypeScript SDK 客户端（MiraClient 暴露 17 个领域 Module 访问器，HTTP + WebSocket 双通道）。SDK 已覆盖 server 固定 JSON API 138 条中的 125 条（covered），详见根目录 `.audit/sdk-coverage-report.md`（2026-08-24 生成）。

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

- 更新时间：2026-08-25（增量，上次 2026-08-23；基线 2d1710c1 以来 15 个 src 文件变更）
- 扫描范围：package.json、`src/shared/sdk/`（17 模块 + contract 测试）、`src/storage/sqlite/mixins/`、根 `.audit/sdk-coverage-report.md` 统计、git log 聚合。
- 本次确认的变化（2.0.8 → 3.0.1）：
  - **SDK 模块仍 17 个**，新增能力：DeviceModule `createShareTicket`；UserModule `readFile`/`writeFile`；LibraryModule `importFrom`/导入进度/取消；FileSystemModule `scanDuplicates(matchMode)`；FileModule download 路径修正为 `/api/files/file/{lib}/{id}`；types 新增 PluginSource/ImportSource/LibraryImportProgress/ShareTicket/WebSocketClientOptions.url
  - **WebSocketClient 重构**：Node ws 与浏览器 WebSocket 统一适配（attachListener），支持完整 url、`sendBinary()`、`bufferedAmount`，binaryType=arraybuffer，二进制以 `binary` 事件分发
  - **FileImport 导入三模式重构**：copy 异步化且 `path=NULL`；move = 复制后源文件送系统回收站（Win PowerShell / mac osascript / Linux gio trash）；link = 符号链接（Windows EPERM 回退硬链接，EXDEV 给中文指引），`path` 存源路径
  - FileOperations：custom_fields 序列化（'[object Object]' 置 null）、硬删触发 `onFileDeleted` 钩子；LibraryServerDataSQLite 接线该钩子
  - Device/User 模块新增 contract 测试（mock HttpClient 断言 method+path+body）
- 未扫描：各 module / mixin 的完整实现体、dist/ 构建产物、node_modules/、上下游包的使用方式。
- 下一步建议：`claude/public-interfaces.md` 的 SDK 方法清单未随新增方法逐条重写，下次深扫补全。
