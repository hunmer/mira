# mira_mobile

> AI 上下文索引。本文件只做导航；细节在 [`claude/`](claude/) 下。

`mira_mobile` 是一个 Flutter 手机端 App，作为 **Mira App Server**（自托管媒体/素材库后端，TypeScript）
的移动客户端。核心闭环：连接服务器 → 登录 → 选择素材库 → 多选文件夹/标签过滤 →
瀑布流浏览图片/视频 → 大图/视频预览（HLS 转码） → 上传文件。

技术栈：Flutter/Dart `^3.10.0`，状态管理 **Riverpod**，HTTP **`http`**，媒体用
`photo_view`/`video_player`+`chewie`/`cached_network_image`，画廊瀑布流用 **`flexbox_layout`**
（`SliverDynamicFlexbox`，运行时惰性测量），UI 走 iOS26 玻璃态（`liquid_glass_widgets` +
自建 `src/widgets/glass/` 组件库）。导航为 `CupertinoApp` 单 Navigator + 命名路由（17 条）。
国际化 `easy_localization`（zh/en）。序列化全手写（无 freezed）。

除浏览/上传外已具备：文件下载（`download_service` + 通知）、相册自动备份
（`photo_manager` + `photo_backup_service`）、主题/背景/语言个性化（多 Provider + SharedPreferences）。

唯一的 SDK 是 `lib/mira_sdk/`（基于 `http`，全 App 引用）。测试：`test/mira_sdk_api/`（SDK 集成）、
`test/mira_sdk/models/`（模型）、`test/src/{providers,services,utils}/`（应用层单测）。

## 约定（高优先级）

- **状态管理用 Riverpod**；`MiraClient` 不做成 Provider，统一经 `ref.read(sessionProvider).client` 取。
- **导航**：路由集中 `lib/router/app_router.dart`（命名路由，Navigator 1.0）；不要嵌 `MaterialApp` 或引入 go_router。
- **后端调用**走 `lib/mira_sdk/` 模块；图片/视频直链经 `client.getHttpClient().getUrl(path)` 拼 `?token=`。
- **本地存储**统一用 SharedPreferences（服务器列表走 `ServerStorageService`；主题/语言/背景/备份等偏好由各 Provider/Service 自存）；不要引入 DB。
- 改代码后自检：`flutter analyze` + `flutter test`（SDK 集成 + 模型 + 应用层单测均有）。
- 代码注释中英混用（以中文为主），与现有风格一致。

> 完整约定、命令、禁止事项见 [claude/conventions.md](claude/conventions.md)。

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 架构总览、分层、运行时形态、关键取舍 | 首次了解项目 |
| [claude/conventions.md](claude/conventions.md) | 命令、代码风格、架构/设计规范、禁止事项 | 动手改代码前 |
| [claude/module-responsibilities.md](claude/module-responsibilities.md) | 各目录职责划分 | 找功能归属 |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口、启动流程、会话自动恢复、构建 | 理解启动/初始化 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 路由表、SDK 接口、REST/WS 端点、本地存储接口 | 调后端/加路由/加页面 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖表、配置文件、环境变量、版本兼容 | 升级依赖/改配置 |
| [claude/data-model.md](claude/data-model.md) | SDK DTO、本地模型、Riverpod providers、状态流转 | 改数据/状态 |
| [claude/testing-and-quality.md](claude/testing-and-quality.md) | 测试命令、双 SDK 测试结构、CI、质量风险 | 写/跑测试 |
| [claude/file-map.md](claude/file-map.md) | 关键目录与文件清单 | 定位文件 |
| [claude/faq.md](claude/faq.md) | 常见问题与定位路径（两 SDK、CI、鉴权等） | 遇坑查证 |
| [claude/changelog.md](claude/changelog.md) | 本索引的生成/更新记录 | 查最近一次扫描范围 |

## 源码结构（单 Flutter 包，非 monorepo）

```
lib/
├── main.dart                 # 入口（EasyLocalization + 玻璃态 + CupertinoApp + Material scope）
├── router/                   # AppRouter 命名路由（17 条）+ RouterController 单例
├── mira_sdk/                 # ⭐ 活跃 SDK（http）：client + models + modules
└── src/
    ├── providers/            # Riverpod ×14（session 持有 MiraClient；files/filter/sort/selection/
    │                         #   download/upload/photo_backup/theme/color_theme/locale/background_effect）
    ├── screens/              # 24 个 dart 文件（home 壳/画廊/预览×3/上传/tree_view/下载队列/
    │                         #   服务器/设置族×7/dashboard）
    ├── services/             # ×6：server_storage / download / upload / photo_backup(+collector) / notification
    ├── models/               # 本地 ServerConfig
    ├── widgets/              # 共享组件 + glass/（13 个玻璃态基础组件）
    └── utils/                # media_utils（媒体分类 + token URL）
```

## 扫描状态

- **更新时间**：2026-08-20（上次 2026-08-11 核对时本包尚未入库当前形态，2026-08-11 后经 4 次提交整体新增 92 个 lib dart 文件）
- **已扫描**：`lib/main.dart`、`lib/router/*`、`lib/mira_sdk/*`（全部）、`lib/src/{providers,screens,services,models,utils,widgets}`（全部）、`pubspec.yaml`、`analysis_options.yaml`、`docs/*`、`test/`（全部 9 个 dart 文件）。
- **跳过**：平台目录（`android/` `ios/` `macos/` `windows/` `linux/`；`web/` 已删除）、`build/` `.dart_tool/` 等生成物。
- **覆盖率**：源码（lib/ 92 个 dart 文件）全覆盖；测试 9 文件（SDK 集成 5 + 模型 1 + 应用层 3）。
- **本次要点**：新增下载/相册自动备份/国际化/主题背景个性化能力；路由 12→17 条（删 `/profile`，增 settings 族/`/dashboard`/`/file_preview`）；`/library_select` 并入 `ServerListScreen(initialTab:1)`；`ItemDetailScreen` 仍为静态展示页。
- **下一步建议**：(1) screens 层仍无 widget 测试；(2) `ItemDetailScreen` 的 TODO（标签/文件夹编辑）待实现；(3) `android/`/`ios/` 发布签名配置。
