# mira_mobile

> AI 上下文索引。本文件只做导航；细节在 [`claude/`](claude/) 下。

`mira_mobile` 是一个 Flutter 手机端 App，作为 **Mira App Server**（自托管媒体/素材库后端，TypeScript）
的移动客户端。核心闭环：连接服务器 → 登录 → 选择素材库 → 多选文件夹/标签过滤 →
瀑布流浏览图片/视频 → 大图/视频预览（HLS 转码） → 上传文件。

技术栈：Flutter/Dart `^3.10.0`，状态管理 **Riverpod**，HTTP **`http`**，媒体用
`photo_view`/`video_player`+`chewie`/`cached_network_image`，画廊瀑布流用 **`flexbox_layout`**
（`SliverDynamicFlexbox`，运行时惰性测量），UI 走 iOS26 玻璃态（`liquid_glass_widgets`）。
导航为 `CupertinoApp` 单 Navigator + 命名路由。序列化全手写（无 freezed）。

唯一的 SDK 是 `lib/mira_sdk/`（基于 `http`，全 App 引用）。SDK 测试在 `test/mira_sdk_api/`。

## 约定（高优先级）

- **状态管理用 Riverpod**；`MiraClient` 不做成 Provider，统一经 `ref.read(sessionProvider).client` 取。
- **导航**：路由集中 `lib/router/app_router.dart`（命名路由，Navigator 1.0）；不要嵌 `MaterialApp` 或引入 go_router。
- **后端调用**走 `lib/mira_sdk/` 模块；图片/视频直链经 `client.getHttpClient().getUrl(path)` 拼 `?token=`。
- **本地存储**只用 `ServerStorageService`（SharedPreferences）；不要引入 DB。
- 改代码后自检：`flutter analyze` + `flutter test test/mira_sdk_api/`（UI/Provider 层暂无测试）。
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
├── main.dart                 # 入口（CupertinoApp + 玻璃态 + Material scope）
├── router/                   # AppRouter 命名路由 + RouterController 单例
├── mira_sdk/                 # ⭐ 活跃 SDK（http）：client + models + modules
└── src/
    ├── providers/            # Riverpod（session 持有 MiraClient；files/folders/tags...）
    ├── screens/              # 13 个页面（home 壳 / 画廊 / 预览 / 上传 / tree_view / 设置 / 服务器）
    ├── services/             # ServerStorageService（SharedPreferences 单例）
    ├── models/               # 本地 ServerConfig
    └── utils/                # media_utils（媒体分类 + token URL）
```

## 扫描状态

- **更新时间**：2026-08-09
- **已扫描**：`lib/main.dart`、`lib/router/*`、`lib/mira_sdk/*`（全部）、`lib/src/{providers,screens,services,models,utils,widgets}`（全部）、`pubspec.yaml`、`analysis_options.yaml`、`docs/*`、`test/mira_sdk_api/`。
- **跳过**：平台目录（`android/` `ios/` `macos/` `windows/` `linux/` `web/`，均为脚手架默认）、`build/` `.dart_tool/` 等生成物。
- **覆盖率**：源码（lib/ 约 32 个 dart 文件）全覆盖；测试仅 `test/mira_sdk_api/`（4 文件）。
- **下一步建议**：(1) `android/`/`ios/` 发布签名配置；(2) 为 UI/Provider 层补测试（当前零覆盖）。
