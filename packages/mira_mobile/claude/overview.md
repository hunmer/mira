# 架构总览

> 更新：2026-08-20

## 这是什么

`mira_mobile` 是一个 Flutter 手机端 App（包名 `mira_mobile`，版本 `1.0.0+1`），
作为 **Mira App Server**（一个自托管的媒体/素材库后端，TypeScript）的移动客户端。

核心使用闭环：**编辑/连接服务器 → 登录认证 → 选择素材库 → 多选文件夹/标签过滤 →
瀑布流浏览图片/视频 → 大图/视频预览 → 上传/下载文件**，全部接真实后端数据，UI 面向手机设计。
另含相册自动备份（photo_manager）、本地通知（flutter_local_notifications）与 zh/en 国际化（easy_localization）。

## 技术栈

- **Flutter / Dart** `sdk: ^3.10.0`，使用 `CupertinoApp` 作为唯一导航宿主（单一 Navigator 栈），
  底层为 Material 3。
- **状态管理**：`flutter_riverpod ^2.5.1`（`ProviderScope` 在 `main()`，无 overrides）。
- **HTTP**：`http ^1.6.0`（活跃 SDK `lib/mira_sdk/` 基于此）；`web_socket_channel ^2.4.0` 做实时。
- **媒体**：`cached_network_image`（缩略图缓存）、`photo_view`（大图缩放手势）、
  `video_player` + `chewie`（视频/HLS 播放）、`file_picker`（上传选择）、
  `photo_manager`（相册资产，自动备份用）、`share_plus`（分享）。
- **布局**：`flexbox_layout ^3.1.0`（画廊瀑布流，`SliverDynamicFlexbox`，运行时惰性测量图片宽高）。
- **本地存储**：`shared_preferences ^2.3.3`。服务器列表存 `ServerStorageService`（键 `mira_servers`）；
  主题/语言/背景/过滤/下载等偏好由各 Provider/Service 自存键值。
- **样式**：`liquid_glass_widgets ^0.29.2`（iOS26 玻璃态，`CupertinoApp` 包裹，需在 `main()` 预热 shader）
  + 自建玻璃态组件库 `lib/src/widgets/glass/`（13 个文件：buttons/chips/inputs/sliders/surfaces/tiles/overlays 等）。
- **国际化**：`easy_localization ^3.0.7` + `flutter_localizations`（zh/en，JSON 翻译在 `assets/translations/`）。
- **序列化**：**手写** `toJson`/`fromJson`，未用 `freezed`；`json_annotation`/`json_serializable`
  仅在依赖中保留（活跃 SDK 未启用 codegen，lib 下无 `.g.dart`）。

## 运行时形态（分层）

```
┌─────────────────────────────────────────────────────────┐
│ main.dart  →  EasyLocalization → ProviderScope →        │  ← 入口/主题/玻璃态壳/i18n
│ CupertinoApp（预热 LiquidGlass shaders；Material scope）  │
├─────────────────────────────────────────────────────────┤
│ router/  AppRouter (命名路由 onGenerateRoute, 17 路由)    │  ← 导航层
│          RouterController (单例, push/replace/清栈)       │
├─────────────────────────────────────────────────────────┤
│ src/screens/  (UI 层, 24 个 dart 文件, ConsumerWidget)    │
│   home/main_shell   3-Tab 壳 + 自动恢复会话               │
│   gallery / preview×3 / upload / download / tree_view     │
│   settings 族×7 / dashboard / 服务器管理                   │
├─────────────────────────────────────────────────────────┤
│ src/providers/  (Riverpod 状态层, 14 个)                  │
│   sessionProvider   ← 唯一持有 MiraClient + 当前库 + 用户 │
│   filesViewProvider ← 分页 + 过滤 + 多 folder 并发合并     │
│   filter/sort/selection/download/upload/photo_backup      │
│   theme/color_theme/locale/background/server/library...  │
├─────────────────────────────────────────────────────────┤
│ mira_sdk/  (活跃 SDK: client + models + modules)          │  ← 后端契约层
│   MiraClient  →  MiraHttpClient(自动剥壳/鉴权)            │
│              →  10 个 *Module (auth/user/library/file/...)│
│              →  MiraWebSocketClient(房间事件分发)          │
├─────────────────────────────────────────────────────────┤
│ src/services/  ×6：server_storage(SharedPreferences 单例) │ ← 持久化/系统能力
│   download / upload / photo_backup(+collector) /          │
│   notification(flutter_local_notifications)               │
└─────────────────────────────────────────────────────────┘
```

## 关键设计取舍

1. **MiraClient 不是 Provider**：实例在 `SessionNotifier.connect` 内 `new`，挂在不可变
   `SessionState.client` 上；所有数据 provider 通过 `ref.read(sessionProvider).client`
   取它（服务定位器模式）。切库时各 provider `select(library?.id)` 自动重载。

2. **单一 Navigator**：`CupertinoApp` 是唯一导航宿主；`_MaterialInheritedScope` 只补
   `Theme`/`ScaffoldMessenger`/`DefaultTextStyle`，**不**嵌 `MaterialApp`（避免第二 Navigator 栈导致路由错乱）。

3. **HTTP 自动剥壳**：`MiraHttpClient._extract` 对含 `data` 字段的响应体自动取内层 `data`，
   兼容后端 4 种包裹风格（`{code,message,data}` / `{success,message,data}` / 裸数组对象 / 错误 `{error}`）。

4. **鉴权双通道**：API 请求用 header `Authorization: Bearer <token>`；图片/视频直链用 URL query `?token=`（`getUrl` 封装）。

5. **画廊瀑布流**：`FileData` 无宽高字段，靠 `flexbox_layout` 运行时惰性测量缩略图尺寸；
   视频缩略图无法解析尺寸 → 固定 4:3 兜底。详见
   [docs/superpowers/specs/2026-08-09-flexbox-masonry-gallery-design.md](../docs/superpowers/specs/2026-08-09-flexbox-masonry-gallery-design.md)。

## 边界（不属于本 App 职责）

- 后端服务（Mira App Server）—— App 只消费其 REST + WS API。
- 服务器端鉴权/存储/转码逻辑。
- 桌面/Web 的生产化（`web/` 目录已删除；`macos/`/`windows/`/`linux/` 平台目录存在但未针对优化）。
