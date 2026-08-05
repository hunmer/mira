# mira-scripts-core

## 项目简单介绍

Mira 的 CLI 脚本工具包（pnpm monorepo 子包，`workspace` 协议）。基于 `ts-node` 的命令行入口，通过 `child_process.spawn` 拉起子进程执行数据处理脚本，目前提供数据库转换（convert）与文件导入（import）两类工具，底层复用 `mira-app-core` 的存储层。

## 约定的规则

- 包管理：pnpm workspace；依赖 `mira-app-core` 通过 `workspace:*` 引入。
- npm scripts（见 `package.json`）：
  - `dev` / `start` / `script`：`ts-node index.ts`（无参时打印用法）
  - `help`：`ts-node index.ts --help`
  - `convert`：`ts-node scripts/convertLibraryData.ts`
  - `import`：`ts-node scripts/pathFilesToLibrary.ts`
  - `build` / `rebuild`：`tsc`
- CLI 调用方式：`pnpm run script <command> [-- <args>]` 或 `ts-node index.ts <command> [options]`。
- 入口 `index.ts` 为手写 argv 路由（未使用 commander），仅识别 `convert` / `import` 两个子命令，以及 `--help` / `-h` 用法输出。
- 子进程执行：入口通过 `spawn('ts-node', [scriptPath, ...args], { stdio: 'inherit', shell: true })` 调用具体脚本，退出码透传。
- TypeScript：`strict: true`，目标 `ES2020`，`module: commonjs`，产物输出到 `dist/`。

## 文件索引

| 路径 | 说明 |
|------|------|
| `package.json` | 包元数据、scripts、依赖（仅 `mira-app-core`） |
| `index.ts` | CLI 入口，命令路由器（手写 argv 解析，非 commander） |
| `scripts/convertLibraryData.ts` | 数据库转换脚本：源 SQLite → 目标目录，支持文件夹/标签过滤 |
| `scripts/pathFilesToLibrary.ts` | 文件导入脚本：将路径下文件导入素材库，支持 copy/move |
| `tsconfig.json` | TypeScript 编译配置（strict, ES2020, commonjs） |
| `start.bat` / `start.ps1` | Windows 启动脚本（未扫描内容） |
| `README.md` | 仓库说明（未扫描内容） |
| `dist/` | `tsc` 构建产物（未扫描） |
| `claude/` | 本 AI 上下文文档目录 |

## 扫描状态

- 扫描日期：2026-08-05
- 包版本：1.0.5
- 已扫描：`package.json`、`index.ts`（全文）、`tsconfig.json`、`scripts/convertLibraryData.ts`（前 50 行）、`scripts/pathFilesToLibrary.ts`（前 50 行）
- 未扫描：`start.bat`、`start.ps1`、`README.md`、`dist/`、`node_modules/`、脚本文件剩余部分（参数解析与具体迁移逻辑细节）
- 测试：未发现测试文件 / 测试脚本
