# 文件地图

> 更新：2026-08-09。仅列关键文件；平台目录与脚手架默认文件省略。

## 入口 / 配置

| 文件 | 说明 |
|------|------|
| `lib/main.dart` | 入口；预热玻璃 shader → ProviderScope → CupertinoApp |
| `pubspec.yaml` | 依赖、版本 `1.0.0+1`、Dart `^3.10.0` |
| `analysis_options.yaml` | lint ← flutter_lints |

## 路由

| 文件 | 说明 |
|------|------|
| `lib/router/app_router.dart` | `AppRouter`：12 路由表 + `generateRoute` + 跳转 API；`PreviewArgs` |
| `lib/router/router_controller.dart` | `RouterController` 单例；封装导航 + SnackBar/确认框 |

## 活跃 SDK — `lib/mira_sdk/`

| 文件 | 说明 |
|------|------|
| `mira_sdk.dart` | barrel，导出 client/models/modules |
| `client/mira_client.dart` | `MiraClient` 主客户端（10 模块 + WS） |
| `client/http_client.dart` | `MiraHttpClient`：自动鉴权 + 剥壳 + 4 种后端包裹兼容 |
| `client/websocket_client.dart` | `MiraWebSocketClient`：query 鉴权、事件分发、重连 |
| `models/models.dart` | models barrel |
| `models/{common,auth,user,library,file,folder,tag,plugin,database,device,system}.dart` | DTO（手写序列化） |
| `modules/{auth,user,library,file,folder,tag,plugin,database,device,system}_module.dart` | 各资源域 API |

## 应用层 — `lib/src/`

| 文件 | 说明 |
|------|------|
| `models/server_config.dart` | 本地 `ServerConfig` |
| `services/server_storage_service.dart` | 服务器列表持久化（SharedPreferences 单例） |
| `utils/media_utils.dart` | 媒体分类 + 带 token 的 URL 拼接 |
| `widgets/mira_header.dart` | 共享玻璃态 AppBar |
| `providers/session_provider.dart` ⭐ | 会话/认证/当前库；**唯一持有 MiraClient** |
| `providers/server_provider.dart` | `serverListProvider` |
| `providers/library_provider.dart` | `librariesProvider` |
| `providers/files_provider.dart` ⭐ | `filesViewProvider` 分页+过滤+多folder合并 |
| `providers/file_filter_provider.dart` | 文件夹/标签多选 + 特殊过滤 |
| `providers/folder_provider.dart` / `tag_provider.dart` | 全量文件夹/标签 |
| `screens/home/main_shell_screen.dart` ⭐ | 3-Tab 壳 + 会话自动恢复 |
| `screens/library_item_list_screen.dart` ⭐ | 画廊瀑布流（SliverDynamicFlexbox）+ 触底加载 |
| `screens/library_select_screen.dart` | 选库 |
| `screens/server_list_screen.dart` / `server_edit_screen.dart` | 服务器管理/编辑（含测试连接） |
| `screens/item_detail_screen.dart` | ⚠️ 静态占位 |
| `screens/tree_view/tree_view_screen.dart` | 文件夹/标签多选过滤页（Tab2） |
| `screens/image_preview_screen.dart` / `video_preview_screen.dart` | 大图(photo_view)/视频(chewie+HLS)预览 |
| `screens/upload/upload_screen.dart` | 上传（file_picker → multipart） |
| `screens/settings/settings_screen.dart` / `settings_tab_screen.dart` | 设置（Tab3）/ 独立设置页 |

## 测试

| 文件 | 说明 |
|------|------|
| `test/mira_sdk_api/*` | SDK 测试（`auth_system_library_test.dart`、`tag_folder_file_user_test.dart`、`database_device_test.dart`、`test_helper.dart`） |

## 文档

| 文件 | 说明 |
|------|------|
| `docs/IMPLEMENTATION_PLAN.md` | 核心浏览功能实现计划（状态管理/依赖/端点决策） |
| `docs/superpowers/specs/2026-08-09-flexbox-masonry-gallery-design.md` | 画廊瀑布流设计 |
| `docs/superpowers/plans/2026-08-09-flexbox-masonry-gallery.md` | 画廊瀑布流实施计划 |
| `README.md` | 默认脚手架（内容极少） |

## 平台工程（脚手架）

`android/` `ios/` `macos/` `windows/` `linux/` `web/` —— 标准 Flutter，未深扫。
