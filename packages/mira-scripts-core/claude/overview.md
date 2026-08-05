# overview

## 模块定位

`mira-scripts-core` 是 pnpm monorepo 中的脚本工具包，为 Mira 提供命令行数据处理工具。它本身不实现核心业务逻辑，而是作为 CLI 路由层 + 可执行脚本集合，复用 `mira-app-core` 的存储能力完成一次性数据迁移 / 导入任务。

## 核心能力

1. **convert（数据库转换）**：从源 SQLite 数据库读取数据，转换并写入目标目录，支持按文件夹 ID、标签 ID 过滤以及 `move` 等导入类型。
2. **import（文件导入）**：扫描指定路径下的文件（支持目录递归与最大深度限制），将其导入素材库数据库，支持 `copy` / `move` 两种模式。

## 入口与运行

- 入口文件：`index.ts`（手写 argv 路由，**未使用 commander**）。
- 运行方式：
  - `ts-node index.ts <command> [options]`
  - `pnpm run script <command> [-- <args>]`
- 子命令仅 `convert` 与 `import`；`--help` / `-h` 或无参时打印用法。

## 架构要点

- 入口维护一张 `scripts` 映射表（`Record<string, ScriptInfo>`），每项含 `name` / `description` / `script` / `examples`。
- 真正执行时通过 `child_process.spawn('ts-node', [scriptPath, ...args], { stdio: 'inherit', shell: true })` 拉起子进程，主进程透传 stdio 与退出码。
- 两个脚本均直接 `import { LibraryServerDataSQLite } from 'mira-app-core/storage/sqlite'`，依赖 `mira-app-core` 提供的存储实现。

## 状态

- 版本：1.0.5，license ISC，author hunmer。
- 详细子命令接口见 `public-interfaces.md`；依赖与配置见 `dependencies-and-config.md`；文件清单见 `file-map.md`。
