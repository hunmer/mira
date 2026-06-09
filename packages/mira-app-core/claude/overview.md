# mira-app-core 总览

## 模块职责

Mira 核心库，提供不自动执行的共享基础能力。被 `mira-app-server`、`mira-client`、`mira-scripts-core` 等模块依赖。

核心职责：
1. **事件管理器 (EventManager)**: 基于 Node.js EventEmitter 的事件系统，支持优先级排序
2. **库列表管理**: 读写 `librarys.json` 配置文件
3. **共享类型**: `User`、`Session`、`WebSocketMessage` 等跨模块类型
4. **SQLite 存储** (`src/storage/sqlite/`): 文件/文件夹/标签 CRUD、事务管理、统计数据
5. **TypeScript SDK** (`src/shared/sdk/`): 链式调用 API 客户端，10 个 API 模块 + WebSocket + HTTP 双通道

## 入口与启动

- **入口文件**: `src/index.ts` -- 导出 EventManager、getLibraries、saveLibraries、User、Session、WebSocketMessage
- **存储入口**: `src/storage/sqlite/index.ts` -- 导出 ILibraryServerData、LibraryServerDataSQLite
- **SDK 入口**: `src/shared/sdk/index.ts` -- 导出 MiraClient、WebSocketClient、10 个 Module
- **构建产物**: `dist/index.js` + `dist/index.d.ts`
- **本模块是纯库，不独立启动**

## 构建命令

```bash
pnpm run build          # tsc + vite build (SDK ESM)
pnpm run rebuild        # 同 build
pnpm run dev            # ts-node 开发模式
```

## 关键依赖

| 依赖 | 用途 |
|------|------|
| axios | HTTP 请求 (SDK) |
| queue | 队列管理 |
| sqlite3 | SQLite 驱动 (存储层) |
| ws | WebSocket 客户端 (SDK) |
