# mira-scripts-core 总览

## 模块职责

Mira 脚本工具集，提供数据处理和迁移的命令行工具：

1. **convert (数据库转换)**: 从源 SQLite 数据库转换数据到目标目录，支持文件夹和标签过滤
2. **import (文件导入)**: 将指定路径的文件导入到素材库数据库中，支持 copy/move 模式

## 入口

- **入口文件**: `index.ts` -- CLI 入口，命令路由器
- **运行**: `ts-node index.ts <command> [options]` 或 `pnpm run script <command>`

## 命令路由

入口定义 `scripts` 映射表，根据命令名 spawn `ts-node` 子进程执行对应脚本。

```bash
pnpm run script convert -- --sourceDbPath=source.db --targetDir=./target
pnpm run script import -- --source=./files --target=library.db
```

## 依赖

- `mira-app-core` (workspace) -- 核心库
