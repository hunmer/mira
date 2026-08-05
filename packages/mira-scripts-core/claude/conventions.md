# conventions

## 包管理与脚本

- pnpm workspace 子包，依赖 `mira-app-core` 以 `workspace:*` 形式引入。
- `package.json` 的 `scripts` 字段（执行入口均落在 `ts-node index.ts` 或具体脚本）：
  - `dev` / `start` / `script` → `ts-node index.ts`
  - `help` → `ts-node index.ts --help`
  - `convert` → `ts-node scripts/convertLibraryData.ts`
  - `import` → `ts-node scripts/pathFilesToLibrary.ts`
  - `build` → `tsc`，`rebuild` → `pnpm run build`

## CLI 调用约定

- 直接执行：`ts-node index.ts <command> [options]`
- 经 npm/pnpm：`pnpm run script <command> [-- <args>]`（注意 `--` 分隔透传参数）
- 支持的全局选项：`--help` / `-h`（无参或带此选项打印用法）；对单个子命令带 `--help` 会打印该命令的示例。

## 入口实现约定

- 入口 `index.ts` 是**手写 argv 路由**（读取 `process.argv.slice(2)`），**未使用 commander / yargs 等框架**。
- 仅识别 `convert` 与 `import`；未知命令打印错误并展示用法、以退出码 1 退出。
- 命令通过 `child_process.spawn` 子进程执行，`stdio: 'inherit'`、`shell: true`，退出码透传回主进程。
- `require.main === module` 守卫，确保仅直接执行时运行；同时 `export { scripts, runScript, showUsage, showScriptHelp }` 供程序化调用。

## TypeScript 约定

- `tsconfig.json`：`strict: true`、`target: ES2020`、`module: commonjs`、`moduleResolution: node`、`esModuleInterop: true`、`declaration: true`。
- `include`：`*.ts` 及 `scripts/` 下两个脚本；`exclude`：`node_modules`、`dist`。
- 产物目录：`dist/`（未扫描）。

## 命名

- 子命令与 npm script 名使用小写；脚本文件名为 camelCase（`convertLibraryData.ts`、`pathFilesToLibrary.ts`）。
- 文档目录：`claude/`，本 AI 上下文文件统一使用小写 kebab-case。
