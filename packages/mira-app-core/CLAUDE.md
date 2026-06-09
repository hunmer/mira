# mira-app-core

核心库，提供事件管理 (EventManager)、库列表管理、共享类型 (User, Session, WebSocketMessage)。内含 SQLite 存储实现 (`storage/sqlite/`) 和 TypeScript SDK (`shared/sdk/`)。纯库模块，不独立启动。被 mira-app-server、mira-client、mira-scripts-core 依赖。

## 约定

- TypeScript strict mode，目标 ES2020+
- 三个子导出路径：`.`、`./storage/sqlite`、`./shared/sdk`
- EventManager 支持优先级排序，处理器返回 `false` 中断传播链

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、入口、构建命令 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 核心导出、存储接口、SDK 接口 |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 (28 个 .ts 文件) |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 模块入口 |
| `src/event-manager.ts` | 事件管理器 |
| `src/storage/sqlite/` | SQLite 存储层 |
| `src/shared/sdk/` | TypeScript SDK |

## 扫描状态

- **版本**: 1.0.24
- **扫描时间**: 2026-06-09T11:59:31+08:00
- **测试**: 无独立测试
