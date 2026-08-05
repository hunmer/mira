# dependencies-and-config

## 运行时依赖 (`dependencies`)

| 包 | 版本 | 用途 |
|----|------|------|
| express | ^4.18.2 | HTTP 服务器 |
| ws | ^8.18.3 | WebSocket（主用） |
| socket.io | ^4.7.4 | Socket.IO 兼容支持 |
| sqlite3 | ^5.1.7 | 数据库驱动（用户库 + 素材库） |
| commander | ^11.1.0 | CLI 框架 |
| multer | ^2.0.2 | 文件上传 |
| chokidar | ^5.0.0 | 文件监视（LibraryWatcher） |
| fluent-ffmpeg | ^2.1.3 | 媒体缩略图 |
| yauzl | ^3.2.0 | ZIP 解压（导入） |
| cors | ^2.8.5 | 跨域 |
| dotenv | ^16.3.1 | 环境变量 |
| axios | ^1.6.2 | HTTP 客户端（CLI health / 内部请求） |
| fast-glob | ^3.3.3 | 文件匹配 |
| which | ^7.0.0 | 可执行文件查找 |
| queue | ^7.0.0 | 任务队列 |
| mira-app-core | workspace:* | 核心类型与存储（同仓依赖） |
| @types/multer | ^2.0.0 | 类型（放在 dependencies） |
| @types/yauzl | ^2.10.3 | 类型（放在 dependencies） |

## 开发依赖 (`devDependencies`)

| 包 | 版本 |
|----|------|
| typescript | ^5.3.3 |
| ts-node | ^10.9.2 |
| jest | ^29.7.0 |
| ts-jest | ^29.1.1 |
| @types/jest | ^29.5.8 |
| @types/node | ^20.10.0 |
| @types/express | ^4.17.21 |
| @types/cors | ^2.8.17 |
| @types/fluent-ffmpeg | ^2.1.28 |
| @types/which | ^3.0.4 |
| @types/ws | ^8.18.1 |

> 注：`@types/multer`、`@types/yauzl` 错放在 `dependencies`（按惯例应在 devDependencies），未修正。

## 环境变量 (`.env.example`)

| 变量 | 默认 | 说明 |
|------|------|------|
| `HTTP_PORT` | 8081 | HTTP 端口（被 `MIRA_SERVER_HTTP_PORT` 覆盖） |
| `WS_PORT` | 8018 | WebSocket 端口（被 `MIRA_SERVER_WS_PORT` 覆盖） |
| `DATA_PATH` | `./data` | 数据目录 |
| `INITIAL_ADMIN_USERNAME` | admin | 初始管理员账号 |
| `INITIAL_ADMIN_PASSWORD` | admin123 | 初始管理员密码 |
| `SESSION_LIFETIME` | 86400000 | 会话有效期（ms） |
| `NODE_ENV` | development | 运行模式 |

加载顺序（`src/index.ts`）：先 `../../../.env`（仓库根），再本地 `.env`（覆盖）。

## 运行时配置/数据文件 (`data/`)

| 文件/目录 | 说明 |
|-----------|------|
| `data/librarys.json` | 素材库清单（见 `data-model.md`） |
| `data/settings.json` | 服务端设置（`SettingsManager`） |
| `data/users.db` | 用户/会话 SQLite（`UserStorage`） |
| `data/users/` | 用户相关附属文件（如头像） |
| `data/temp/` | 临时文件 |

## 插件配置

- `src/plugins/plugins.json` — 插件注册清单（`name` / `enabled` / `path` / 可选 `status`）。
- `src/plugins/package.json` — 插件依赖声明（独立 npm 依赖树）。
- 当前启用：`mira_duplicate_scanner`、`mira_eagle_extension`（node_modules 安装）。

## 构建产物

- `dist/` — `tsc` 输出（`main`、`types`、`bin` 均指向 `dist/`）。
- `files`：发布仅含 `dist/**/*` 与 `README.md`。

## 其他配置文件

- `tsconfig.json` — TypeScript 配置（存在，未读取具体内容）。
- `Dockerfile` / `Dockerfile.optimized` / `docker-build.bat` / `docker-build.sh` — 容器化（存在，未读取）。
- `.dockerignore` — 存在。
