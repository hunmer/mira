# 模块职责

> 更新：2026-08-20

> 此处"模块"按目录职责划分，不是 pub 包。仓库为**单 Flutter 包**（非 monorepo）。

## 1. `lib/mira_sdk/` — 活跃 Mira SDK（后端契约层）

Dart/Flutter SDK，镜像 TypeScript 版 `mira-app-core`，链式调用风格。
**全 App 唯一引用的 SDK**。

| 子域 | 文件 | 职责 |
|------|------|------|
| 客户端 | `client/mira_client.dart` | `MiraClient` 主入口，持有 10 个模块 + 创建 WS 客户端 |
| HTTP | `client/http_client.dart` | `MiraHttpClient`：GET/POST/PUT/DELETE/download/getUrl，自动鉴权 + 剥壳 |
| WebSocket | `client/websocket_client.dart` | `MiraWebSocketClient`：query 鉴权，eventName 分发，断线重连 |
| 模型 | `models/*.dart`（11 个 + barrel） | 请求/响应 DTO，手写 `toJson`/`fromJson` |
| 模块 | `modules/*.dart`（10 个） | 按资源域封装 API：auth/user/library/file/folder/tag/plugin/database/device/system |

详见 [public-interfaces.md](public-interfaces.md) 与 [data-model.md](data-model.md)。

## 2. `lib/src/` — 应用层

| 子域 | 目录/文件 | 职责 |
|------|-----------|------|
| 路由 | `router/app_router.dart`, `router_controller.dart` | 命名路由表（17 条）+ 单例控制器 |
| 状态 | `providers/*.dart`（14 个） | Riverpod providers：会话/服务器列表/库/文件列表/过滤/排序/多选/文件夹/标签/下载/上传/相册备份/主题/配色/语言/背景 |
| 页面 | `screens/*.dart`（24 个文件：顶层 10 + `home/` `download/` `upload/` 各 1 + `settings/` 7 + `tree_view/` 3） | UI；3-Tab 壳、画廊、预览×3、上传、下载队列、文件夹树、设置族、仪表盘、服务器管理 |
| 服务 | `services/*.dart`（6 个） | `server_storage`（服务器列表持久化）/ `download_service` / `upload_service` / `photo_backup_service`(+`_collector`) / `notification_service`（本地通知） |
| 模型 | `models/server_config.dart` | 本地 `ServerConfig`（区别于 SDK 的后端 DTO） |
| 工具 | `utils/media_utils.dart` | 媒体分类（image/video/mp4/hls）+ URL 拼接 |
| 组件 | `widgets/`（4 个共享组件）+ `widgets/glass/`（13 个） | `mira_header`/`file_info_sheet`/`filter_pickers`/`folder_tag_tree` + 自建玻璃态基础组件库（buttons/chips/inputs/sliders/surfaces/tiles/overlays/dialog/feedback 等） |

## 3. `lib/main.dart` — 入口（单文件）

`main()` → `EasyLocalization.ensureInitialized` → 预热玻璃 shader → `ProviderScope` →
`EasyLocalization(child: CupertinoApp)`，注入 Material inherited scope。

## 4. 平台目录（脚手架默认）

`android/` `ios/` `macos/` `windows/` `linux/` —— 标准 Flutter 平台工程，无定制逻辑（按需扫）。
（`web/` 目录已删除。）

## 5. `test/` — 测试

`test/mira_sdk_api/`（SDK 集成，5 文件）、`test/mira_sdk/models/`（模型单测）、
`test/src/{providers,services,utils}/`（应用层单测）。详见 [testing-and-quality.md](testing-and-quality.md)。
