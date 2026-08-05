# file-map

包根：`packages/mira-scripts-core/`

| 路径 | 类型 | 说明 | 扫描情况 |
|------|------|------|----------|
| `package.json` | 配置 | 包元数据、scripts、依赖 | 已全文扫描 |
| `index.ts` | 源码 | CLI 入口，手写 argv 路由 + spawn 子进程 | 已全文扫描 |
| `tsconfig.json` | 配置 | TypeScript 编译配置 | 已全文扫描 |
| `scripts/convertLibraryData.ts` | 源码 | 数据库转换脚本（源 SQLite → 目标目录） | 抽样前 50 行 |
| `scripts/pathFilesToLibrary.ts` | 源码 | 文件导入脚本（`PathFilesImporter`） | 抽样前 50 行 |
| `README.md` | 文档 | 仓库说明 | 未扫描 |
| `start.bat` | 脚本 | Windows 启动脚本（cmd） | 未扫描 |
| `start.ps1` | 脚本 | Windows 启动脚本（PowerShell） | 未扫描 |
| `dist/` | 产物 | `tsc` 构建输出 | 未扫描 |
| `node_modules/` | 依赖 | pnpm 软链接 / 依赖 | 未扫描 |
| `CLAUDE.md` | 文档 | AI 上下文轻量索引（本包根） | 已生成 |
| `claude/` | 文档 | AI 上下文详情目录 | 已生成 |

## claude/ 目录

| 文件 | 说明 |
|------|------|
| `claude/overview.md` | 模块总览 |
| `claude/conventions.md` | 约定（命令、CLI 调用、TS 配置） |
| `claude/entrypoints.md` | `index.ts` 入口与路由机制 |
| `claude/public-interfaces.md` | CLI 子命令与导出符号 |
| `claude/dependencies-and-config.md` | 依赖与配置 |
| `claude/file-map.md` | 本文件清单 |
| `claude/changelog.md` | 变更记录（倒序） |
