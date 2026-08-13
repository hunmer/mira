# 开发约定

> 更新：2026-08-09

## 命令

```bash
# 安装依赖
flutter pub get

# 跑 App（默认 debug）
flutter run

# 静态分析（根项目用 flutter_lints）
flutter analyze

# 跑 SDK 的测试（test/mira_sdk_api/ 对应 lib/mira_sdk/）
flutter test test/mira_sdk_api/

# 代码生成（当前 SDK 无 codegen，仅依赖里保留 build_runner）
flutter pub run build_runner build --delete-conflicting-outputs
```

> 当前仅 `test/mira_sdk_api/` 有 SDK 测试；UI/Provider 层无测试。详见 [testing-and-quality.md](testing-and-quality.md)。

## 代码风格

- Lint：`analysis_options.yaml` 继承 `package:flutter_lints/flutter.yaml`，未额外启用规则。
- 引号/分号/命名遵循 Flutter 默认（`flutter format`/`dart format`）。
- 注释与文档大量使用**中文**（与现有代码一致）；对外 SDK doc 注释可中英混用。
- 文档字符串（`///`）普遍用于 public API、Provider、Screen 类，说明用途与约束。

## 架构约定

### 状态管理
- **必须用 Riverpod**（`flutter_riverpod`），不要新增裸 `setState` 管全局态。
- `MiraClient` 实例**不做成 Provider**：通过 `ref.read(sessionProvider).client` 取（已确立的约定）。
- 切库时让数据 provider `watch(sessionProvider.select((s) => s.library?.id))` 自动失效重载。

### 导航
- 路由集中在 [lib/router/app_router.dart](../lib/router/app_router.dart) 的 `AppRouter.routes`。
- 命名路由 + `onGenerateRoute`（Navigator 1.0）；**不要**引入 go_router 或嵌套 Navigator。
- 跨页面跳转用 `AppRouter.navigateTo` / `replaceWith` / `navigateAndClearStack`，
  或单例 `RouterController`。

### SDK 访问后端
- 所有 HTTP 走 `lib/mira_sdk/` 的模块（`client.files()`, `client.libraries()` …），不要直接 `http.*`。
- 鉴权 URL（图片/视频直链）必须经 `client.getHttpClient().getUrl(path)` 拼 `?token=`。
- 后端响应会被 `MiraHttpClient` 自动剥壳（取 `data` 字段），模块里不要再手动剥。

### 持久化
- 仅服务器列表持久化，用 `ServerStorageService.instance`（单例 + SharedPreferences）。
- 不要新增长久态存储（如 DB）；当前需求未到。

## 设计规范

- 主题：Material 3（`ColorScheme.fromSeed(Colors.deepPurple)`）+ iOS26 玻璃态
  （`liquid_glass_widgets`）。深色判断用 `Theme.of(context).brightness`。
- 大标题：iOS26 风格的 `GlassLargeTitle` + 折叠，由外层 `ScrollController` 驱动。
- 画廊卡片按图片真实宽高比自适应（`SliverDynamicFlexbox`），视频用 4:3 兜底。

## 禁止事项

- ❌ 不要在 `CupertinoApp` 下再嵌 `MaterialApp`（会引入第二 Navigator 栈）。
- ❌ 不要让数据 provider 自己 new `MiraClient`；统一从 `sessionProvider` 取。
- ❌ 不要在 `main()` 之外做 `LiquidGlassWidgets.initialize()`（shader 预热只做一次）。

## 重要兼容性提醒

- Dart SDK `^3.10.0`；`flexbox_layout ^3.1.0` 需 Flutter ≥3.32 / Dart ≥3.8（满足）。
- `CupertinoApp` 下用 Material 组件（`RefreshIndicator`/`TextField`/`Chip`）需补
  Material localization delegates（已在 `main.dart` 配置）。
- 后端根文件夹 `parentId` 为 `null`（非 0）；`tags`/`folders` 的 `delete` 通过 **body** 传参。
- 非缩略图视频扩展名（mov/avi/mkv/…）走 HLS 转码端点（`/api/files/preview/.../index.m3u8`）。
