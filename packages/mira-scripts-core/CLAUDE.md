# mira-scripts-core

数据转换和导入脚本工具集。提供 convert (数据库转换) 和 import (文件导入) 两个命令。

## 约定

- 命令通过 spawn 子进程执行，不直接运行脚本
- 使用 `mira-app-core` 的存储层操作数据

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、命令、依赖 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | CLI 入口，命令路由器 (151 行) |
| `scripts/convertLibraryData.ts` | 数据库转换脚本 |
| `scripts/pathFilesToLibrary.ts` | 文件导入脚本 |

## 扫描状态

- **版本**: 1.0.5
- **扫描时间**: 2026-06-09T11:59:31+08:00
- **测试**: 无
