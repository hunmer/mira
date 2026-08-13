# 模块职责

> 更新：2026-08-09

> 此处"模块"按目录职责划分，不是 pub 包。仓库为**单 Flutter 包**（非 monorepo）。

## 1. `lib/mira_sdk/` — 活跃 Mira SDK（后端契约层）

Dart/Flutter SDK，镜像 TypeScript 版 `mira-app-core`，链式调用风格。
**全 App 唯一引用的 SDK**。

| 子域 | 文件 | 职责 |
|------|------|------|
| 客户端 | `client/mira_client.dart` | `MiraClient` 主入口，持有 10 个模块 + 创建 WS 客户端 |
| HTTP | `client/http_client.dart` | `MiraHttpClient`：GET/POST/PUT/DELETE/download/getUrl，自动鉴权 + 剥壳 |
| WebSocket | `client/websocket_client.dart` | `MiraWebSocketClient`：query 鉴权，eventName 分发，断线重连 |
| 模型 | `models/*.dart`（10 个 + barrel） | 请求/响应 DTO，手写 `toJson`/`fromJson` |
| 模块 | `modules/*.dart`（10 个） | 按资源域封装 API：auth/user/library/file/folder/tag/plugin/database/device/system |

详见 [public-interfaces.md](public-interfaces.md) 与 [data-model.md](data-model.md)。

## 2. `lib/src/` — 应用层

| 子域 | 目录/文件 | 职责 |
|------|-----------|------|
| 路由 | `router/app_router.dart`, `router_controller.dart` | 命名路由表（12 条）+ 单例控制器 |
| 状态 | `providers/*.dart`（7 个） | Riverpod providers：会话/服务器列表/库/文件列表/过滤/文件夹/标签 |
| 页面 | `screens/*.dart`（13 个） | UI；3-Tab 壳、画廊、预览、上传、文件夹树、设置、服务器管理 |
| 服务 | `services/server_storage_service.dart` | 服务器列表持久化（SharedPreferences 单例） |
| 模型 | `models/server_config.dart` | 本地 `ServerConfig`（区别于 SDK 的后端 DTO） |
| 工具 | `utils/media_utils.dart` | 媒体分类（image/video/mp4/hls）+ URL 拼接 |
| 组件 | `widgets/mira_header.dart` | 共享玻璃态 AppBar |

## 3. `lib/main.dart` — 入口（单文件）

`main()` → 预热玻璃 shader → `ProviderScope` → `CupertinoApp`，注入 Material inherited scope。

## 4. 平台目录（脚手架默认）

`android/` `ios/` `macos/` `windows/` `linux/` `web/` —— 标准 Flutter 平台工程，无定制逻辑（按需扫）。

## 5. `test/` — 测试

`test/mira_sdk_api/` —— 对应 `lib/mira_sdk/`（活跃 SDK）。详见 [testing-and-quality.md](testing-and-quality.md)。
