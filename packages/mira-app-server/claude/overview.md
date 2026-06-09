# mira-app-server 总览

## 模块职责

Mira 独立服务端应用，提供完整的后端服务能力：

1. **HTTP REST API**: 基于 Express，15 个路由模块
2. **WebSocket 实时通信**: 基于 `ws`，按素材库分组管理连接
3. **多素材库管理**: 动态加载/卸载多个 SQLite 素材库，每个库独立 EventManager + PluginManager
4. **插件系统**: 加载/卸载/重载服务端插件，支持 HTTP Hook 拦截
5. **CLI 工具**: 基于 Commander.js，支持 start/version/health 子命令
6. **用户认证**: 基于 SQLite 的用户管理 (UserStorage)
7. **库文件监视**: LibraryWatcher 监视素材库目录变更
8. **缩略图服务**: 内置 ThumbnailService 支持扩展 Generator 注册
9. **设置管理**: SettingsManager 管理服务端全局配置

## 入口与启动

- **入口**: `src/index.ts` -- 导出并启动 MiraServer
- **CLI**: `src/cli.ts` -- bin 字段注册为 `mira-app-server`
- **构建**: `tsc` / `pnpm run build`
- **启动**: `node dist/index.js` 或 `pnpm run start`
- **开发**: `pnpm run dev` (ts-node + inspect)

## 构建命令

```bash
pnpm run build          # tsc 编译
pnpm run rebuild        # 同 build
pnpm run start          # node dist/index.js
pnpm run dev            # ts-node + inspect 开发模式
pnpm run cli:start      # CLI 方式启动
pnpm test               # Jest 测试
```

## 关键依赖

| 依赖 | 用途 |
|------|------|
| express | HTTP 服务器 |
| ws | WebSocket 服务器 |
| sqlite3 | 数据库驱动 |
| commander | CLI 框架 |
| multer | 文件上传 |
| chokidar | 文件监视 |
| fluent-ffmpeg | 缩略图生成 |
| yauzl | ZIP 解压 |
| socket.io | Socket.IO 支持 |
| cors | 跨域 |
