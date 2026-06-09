# mira-app-server

独立服务端应用。Express HTTP + WebSocket 服务，15 个路由模块，CLI 工具，用户认证，内置 ThumbnailService 和 SettingsManager。提供认证、用户、素材库、插件、文件、数据库、设备、标签、文件夹、缩略图、统计等 RESTful 接口。

## 约定

- 路由可继承 `BaseRouter` 基类统一请求处理
- WebSocket 路由分发到 Handler 类处理
- 插件通过 `ServerPluginManager` 加载，支持 HTTP Hook 拦截
- 权限中间件 `permission.ts` 基于角色 (super/admin/user)
- 环境变量：`MIRA_SERVER_HTTP_PORT`(8081), `MIRA_SERVER_WS_PORT`(8018), `DATA_PATH`

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、入口、构建命令、依赖 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | HTTP 路由、WebSocket 协议、核心类、导出 |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 (35 个 .ts) |
| [claude/faq.md](claude/faq.md) | 常见问题 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 扫描状态

- **版本**: 1.0.25
- **扫描时间**: 2026-06-09T11:59:31+08:00
- **测试**: Jest (`sdk/` 目录)
