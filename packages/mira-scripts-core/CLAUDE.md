[根目录](../../CLAUDE.md) > [packages](..) > **mira-scripts-core**

# mira-scripts-core

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-25 | 增量更新 | 补充命令路由机制说明 |
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 脚本工具集，提供数据处理和迁移的命令行工具：

1. **convert (数据库转换)**: 从源 SQLite 数据库转换数据到目标目录，支持文件夹和标签过滤
2. **import (文件导入)**: 将指定路径的文件导入到素材库数据库中，支持 copy/move 模式

## 入口与启动

- **入口文件**: `index.ts` -- CLI 入口，命令路由器
- **脚本目录**: `scripts/`
- **运行方式**: `ts-node index.ts <command> [options]` 或 `pnpm run script <command>`
- **帮助**: `pnpm run help`

命令路由机制：入口文件定义 `scripts` 映射表，根据命令名 spawn `ts-node` 子进程执行对应脚本。

## 对外接口

### 命令

| 命令 | 脚本文件 | 说明 |
|------|----------|------|
| `convert` | `scripts/convertLibraryData.ts` | 数据库转换工具 |
| `import` | `scripts/pathFilesToLibrary.ts` | 文件导入工具 |

### 示例

```bash
# 数据库转换
pnpm run script convert -- --sourceDbPath=source.db --targetDir=./target
pnpm run script convert -- --targetFolders=1,2,3 --targetTags=5,6

# 文件导入
pnpm run script import -- --source=./files --target=library.db
pnpm run script import -- --importType=move --maxFolderDepth=3
```

## 关键依赖与配置

- **workspace 依赖**: `mira-storage-sqlite`, `mira-app-core`
- **运行方式**: ts-node（子进程 spawn）

## 数据模型

使用 `mira-storage-sqlite` 的 `ILibraryServerData` 接口进行数据操作。

## 测试与质量

当前无独立测试。

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `index.ts` | CLI 入口，命令路由器 (151 行) |
| `scripts/convertLibraryData.ts` | 数据库转换脚本 |
| `scripts/pathFilesToLibrary.ts` | 文件导入脚本 |
| `package.json` | 包配置 (v1.0.5) |
