# 依赖与配置

> 更新：2026-08-20（依据 `pubspec.yaml` + `pubspec.lock`）

## 关键依赖（`dependencies`）

| 包 | 版本 | 用途 |
|----|------|------|
| `flutter` / `flutter_localizations` | sdk | 框架 + zh/en 本地化 |
| `easy_localization` / `intl` | ^3.0.7 / any | 应用层国际化（zh/en，JSON + `.tr()`） |
| `cupertino_icons` | ^1.0.8 | iOS 图标 |
| `flutter_riverpod` | ^2.5.1 | **状态管理**（核心） |
| `http` | ^1.6.0 | 活跃 SDK 的 HTTP 客户端 |
| `web_socket_channel` | ^2.4.0 | SDK 实时连接 |
| `json_annotation` | ^4.9.0 | JSON 注解（手写为主） |
| `http_parser` | ^4.0.0 | MIME 解析 |
| `package_info_plus` | ^9.0.1 | 版本信息（关于页） |
| `shared_preferences` | ^2.3.3 | 本地偏好/服务器列表存储 |
| `cached_network_image` | ^3.4.1 | 缩略图缓存 |
| `photo_view` | ^0.15.0 | 大图缩放/平移 |
| `video_player` | ^2.9.2 | 视频播放（原生支持 HLS） |
| `chewie` | ^1.8.5 | 视频播放 UI 皮肤 |
| `file_picker` | ^8.1.4 | 上传文件选择 |
| `path_provider` | ^2.1.5 | 本地路径（下载/备份） |
| `flexbox_layout` | ^3.1.0 | **画廊瀑布流** `SliverDynamicFlexbox` |
| `liquid_glass_widgets` | ^0.29.2 | iOS26 玻璃态 |
| `flutter_staggered_grid_view` | ^0.7.0 | （历史保留；画廊已改用 flexbox） |
| `photo_manager` | ^3.11.0 | 相册资产（自动备份，iOS/Android） |
| `flutter_local_notifications` | ^22.3.0 | 本地通知（下载/备份进度） |
| `share_plus` | ^12.0.2 | 系统分享 |
| `url_launcher` | ^6.3.0 | 打开外部链接（关于页） |
| `universal_back_gesture` | ^2.1.0 | 统一返回手势 |
| `animate_do` | ^5.1.0 | 动效 |
| `webview_all` | ^1.3.5 | 内嵌 WebView（文件预览） |
| `bokeh_lava_gradient` | ^1.0.9 | 背景特效 |
| `mockito` | ^5.6.1 | 测试 mock（放 dependencies 而非 dev） |

## 开发依赖（`dev_dependencies`）

| 包 | 版本 | 用途 |
|----|------|------|
| `flutter_test` | sdk | 测试框架 |
| `flutter_lints` | ^6.0.0 | lint 规则集（`analysis_options.yaml` 引用） |
| `json_serializable` | ^6.8.0 | codegen（**当前未启用**，序列化为手写，lib 无 `.g.dart`） |
| `build_runner` | ^2.4.12 | codegen 运行器 |

## 配置文件

| 文件 | 作用 |
|------|------|
| `pubspec.yaml` | 依赖与版本；`version: 1.0.0+1`；`environment.sdk: ^3.10.0`；assets：`assets/translations/`、`assets/images/` |
| `analysis_options.yaml` | 继承 `flutter_lints/flutter.yaml`，未额外规则 |
| `devtools_options.yaml` | DevTools 配置 |

## 环境变量

- **App 无环境变量**。
- `ClientConfig`：运行期注入 `baseUrl`、`timeout`（默认 60s）、`headers`、`token`/`getToken` 回调。

## 框架版本差异 / 兼容

- **Dart `^3.10.0`**（注意较新）；`flexbox_layout ^3.1.0` 要求 Flutter ≥3.32 / Dart ≥3.8 → 满足。

## pubspec 已知历史变更

- 移除：`infinite_scroll_pagination`（画廊改用 `flexbox_layout` + 手写触底加载，全局零引用）。
  详见 [docs/superpowers/plans/2026-08-09-flexbox-masonry-gallery.md](../docs/superpowers/plans/2026-08-09-flexbox-masonry-gallery.md)。
- 新增（按 IMPLEMENTATION_PLAN）：riverpod / cached_network_image / photo_view / video_player / chewie / file_picker。
- 新增（2026-08-11 后，下载/备份/个性化/国际化）：easy_localization、photo_manager、
  flutter_local_notifications、share_plus、url_launcher、universal_back_gesture、animate_do、
  webview_all、bokeh_lava_gradient、package_info_plus、path_provider。
