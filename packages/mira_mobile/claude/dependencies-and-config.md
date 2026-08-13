# 依赖与配置

> 更新：2026-08-09（依据 `pubspec.yaml` + `pubspec.lock`）

## 关键依赖（`dependencies`）

| 包 | 版本 | 用途 |
|----|------|------|
| `flutter` / `flutter_localizations` | sdk | 框架 + zh/en Material 本地化（CupertinoApp 下补 Material delegates） |
| `cupertino_icons` | ^1.0.8 | iOS 图标 |
| `flutter_riverpod` | ^2.5.1 | **状态管理**（核心） |
| `http` | ^1.6.0 | 活跃 SDK 的 HTTP 客户端 |
| `web_socket_channel` | ^2.4.0 | SDK 实时连接 |
| `json_annotation` | ^4.9.0 | JSON 注解（手写为主） |
| `http_parser` | ^4.0.0 | MIME 解析 |
| `shared_preferences` | ^2.3.3 | 服务器列表本地存储 |
| `cached_network_image` | ^3.4.1 | 缩略图缓存 |
| `photo_view` | ^0.15.0 | 大图缩放/平移 |
| `video_player` | ^2.9.2 | 视频播放（原生支持 HLS） |
| `chewie` | ^1.8.5 | 视频播放 UI 皮肤 |
| `file_picker` | ^8.1.4 | 上传文件选择 |
| `flexbox_layout` | ^3.1.0 | **画廊瀑布流** `SliverDynamicFlexbox` |
| `liquid_glass_widgets` | ^0.29.2 | iOS26 玻璃态 |
| `flutter_staggered_grid_view` | ^0.7.0 | （历史保留；画廊已改用 flexbox） |
| `mockito` | ^5.6.1 | 测试 mock（放 dependencies 而非 dev） |

## 开发依赖（`dev_dependencies`）

| 包 | 版本 | 用途 |
|----|------|------|
| `flutter_test` | sdk | 测试框架 |
| `flutter_lints` | ^6.0.0 | lint 规则集（`analysis_options.yaml` 引用） |
| `json_serializable` | ^6.8.0 | codegen（**当前 SDK 未启用**，序列化为手写） |
| `build_runner` | ^2.4.12 | codegen 运行器 |

## 配置文件

| 文件 | 作用 |
|------|------|
| `pubspec.yaml` | 依赖与版本；`version: 1.0.0+1`；`environment.sdk: ^3.10.0` |
| `analysis_options.yaml` | 继承 `flutter_lints/flutter.yaml`，未额外规则 |
| `.metadata` | Flutter 项目元数据 |
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
