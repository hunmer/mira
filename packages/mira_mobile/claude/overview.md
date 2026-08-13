# 架构总览

> 更新：2026-08-09

## 这是什么

`mira_mobile` 是一个 Flutter 手机端 App（包名 `mira_mobile`，版本 `1.0.0+1`），
作为 **Mira App Server**（一个自托管的媒体/素材库后端，TypeScript）的移动客户端。

核心使用闭环：**编辑/连接服务器 → 登录认证 → 选择素材库 → 多选文件夹/标签过滤 →
瀑布流浏览图片/视频 → 大图/视频预览 → 上传文件**，全部接真实后端数据，UI 面向手机设计。

## 技术栈

- **Flutter / Dart** `sdk: ^3.10.0`，使用 `CupertinoApp` 作为唯一导航宿主（单一 Navigator 栈），
  底层为 Material 3。
- **状态管理**：`flutter_riverpod ^2.5.1`（`ProviderScope` 在 `main()`，无 overrides）。
- **HTTP**：`http ^1.6.0`（活跃 SDK `lib/mira_sdk/` 基于此）；`web_socket_channel ^2.4.0` 做实时。
- **媒体**：`cached_network_image`（缩略图缓存）、`photo_view`（大图缩放手势）、
  `video_player` + `chewie`（视频/HLS 播放）、`file_picker`（上传选择）。
- **布局**：`flexbox_layout ^3.1.0`（画廊瀑布流，`SliverDynamicFlexbox`，运行时惰性测量图片宽高）。
- **本地存储**：`shared_preferences ^2.3.3`（仅存服务器列表，JSON 数组，键 `mira_servers`）。
- **样式**：`liquid_glass_widgets ^0.29.2`（iOS26 玻璃态，`CupertinoApp` 包裹，需在 `main()` 预热 shader）。
- **序列化**：**手写** `toJson`/`fromJson`，未用 `freezed`；`json_annotation`/`json_serializable`
  仅 `dev_dependencies`（保留给打包 SDK，活跃 SDK 未启用 codegen）。

## 运行时形态（分层）

```
┌─────────────────────────────────────────────────────────┐
│ main.dart  →  ProviderScope  →  CupertinoApp            │  ← 入口/主题/玻璃态壳
│  预热 LiquidGlass shaders；注入 Material inherited        │
├─────────────────────────────────────────────────────────┤
│ router/  AppRouter (命名路由 onGenerateRoute, 12 路由)    │  ← 导航层
│          RouterController (单例, push/replace/清栈)       │
├─────────────────────────────────────────────────────────┤
│ src/screens/  (UI 层, 13 个页面, ConsumerWidget)          │
│   home/main_shell   3-Tab 壳 + 自动恢复会话               │
│   gallery / preview / upload / tree_view / settings      │
├─────────────────────────────────────────────────────────┤
│ src/providers/  (Riverpod 状态层)                         │
│   sessionProvider   ← 唯一持有 MiraClient + 当前库 + 用户 │
│   filesViewProvider ← 分页 + 过滤 + 多 folder 并发合并     │
│   fileFilter / folders / tags / libraries / serverList   │
├─────────────────────────────────────────────────────────┤
│ mira_sdk/  (活跃 SDK: client + models + modules)          │  ← 后端契约层
│   MiraClient  →  MiraHttpClient(自动剥壳/鉴权)            │
│              →  10 个 *Module (auth/user/library/file/...)│
│              →  MiraWebSocketClient(房间事件分发)          │
├─────────────────────────────────────────────────────────┤
│ src/services/  ServerStorageService (单例, SharedPreferences)│ ← 持久化
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
- 桌面/Web 的生产化（虽有 `web`/`macos`/`windows`/`linux` 平台目录，但未针对优化）。
