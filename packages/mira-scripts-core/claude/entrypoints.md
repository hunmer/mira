# entrypoints

## 主入口：`index.ts`

- 位置：包根目录 `index.ts`（约 150 行）。
- shebang：`#!/usr/bin/env ts-node`，可直接以可执行脚本方式运行。
- 运行守卫：`if (require.main === module) { main().catch(console.error); }`。
- 导出：`{ scripts, runScript, showUsage, showScriptHelp }`，便于程序化使用。

## argv 解析流程（`main()`）

1. `const args = process.argv.slice(2);`
2. 无参，或首个参数为 `--help` / `-h` → 调用 `showUsage()` 打印总用法后返回。
3. `command = args[0]`，`scriptArgs = args.slice(1)`。
4. 若 `scriptArgs` 含 `--help` / `-h` → 调用 `showScriptHelp(command)` 打印该命令示例。
5. 否则 `await runScript(command, scriptArgs)`。

## 命令路由表（`scripts`）

入口中维护的 `Record<string, ScriptInfo>`：

| 命令 | 描述 | 脚本路径 |
|------|------|----------|
| `convert` | 数据库转换工具：源 SQLite → 目标目录，支持文件夹/标签过滤 | `scripts/convertLibraryData.ts` |
| `import`  | 文件导入工具：将路径下文件导入素材库数据库 | `scripts/pathFilesToLibrary.ts` |

> 说明：用户任务描述中提到的子命令 `script/help/convert/import` 中，`script` 与 `help` 实际是 `package.json` 的 npm script 名（`pnpm run script` / `pnpm run help`），真正被 `index.ts` 识别的子命令只有 `convert` 与 `import`。

## 子进程执行（`runScript`）

- 计算脚本绝对路径：`path.join(__dirname, script.script)`。
- `spawn('ts-node', [scriptPath, ...args], { stdio: 'inherit', shell: true })`。
- 监听 `close`：`code === 0` 打印成功，否则打印失败并以 `code || 1` 退出。
- 监听 `error`：打印错误信息，退出码 1。

## 用法输出（`showUsage` / `showScriptHelp`）

- `showUsage()`：枚举 `scripts` 表打印命令名、说明，并提示使用 `--help` 查看具体命令。
- `showScriptHelp(name)`：打印该命令的中文名、描述与 `examples` 数组，并给出 `ts-node <script> --help` 的进一步提示。

## 其他可执行入口（npm script 直连）

以下 npm script 绕过 `index.ts` 路由，直接调用脚本：

- `pnpm run convert` → `ts-node scripts/convertLibraryData.ts`
- `pnpm run import` → `ts-node scripts/pathFilesToLibrary.ts`
