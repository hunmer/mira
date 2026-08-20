# 入口与启动

> 更新：2026-08-20

## 应用入口

`lib/main.dart`（单文件，约 226 行）。

### `main()` 流程
1. `WidgetsFlutterBinding.ensureInitialized()`。
2. `await EasyLocalization.ensureInitialized()` —— 载入 zh/en JSON 翻译资源（`assets/translations/`）。
3. `await LiquidGlassWidgets.initialize()` —— **预热 Liquid Glass shader**，避免首帧玻璃态卡顿。
4. `runApp(EasyLocalization(child: ProviderScope(child: MyApp())))` —— Riverpod `ProviderScope`，**无 overrides**。

### `MyApp`（ConsumerWidget）— 根
- 用 `LiquidGlassWidgets.wrap(brightnessResolver: Theme.maybeBrightnessOf, ...)` 包裹。
- 内层是 **`CupertinoApp`**（唯一导航宿主）：
  - `navigatorKey: AppRouter.navigatorKey`，`onGenerateRoute: AppRouter.generateRoute`，`initialRoute: '/'`。
  - 主题：`CupertinoThemeData` 复用一份 `ThemeData(ColorScheme.fromSeed(deepPurple))`。
  - localization delegates：`easy_localization` 提供（已含 Material/Widgets/Cupertino）。
  - `supportedLocales: [Locale('zh'), Locale('en')]`；语言偏好非 system 时同步 `EasyLocalization` 切换。
- `builder` 注入 `_MaterialInheritedScope`：补 `Theme` + `ScaffoldMessenger` + `DefaultTextStyle`，
  **不开新 Navigator**。

### 会话自动恢复（运行时初始化的关键）
真正"启动业务"的逻辑在 [lib/src/screens/home/main_shell_screen.dart](../lib/src/screens/home/main_shell_screen.dart)：
- `MainShellScreen.initState` + postFrame `_tryAutoRestore`（每进程一次）：
  读 `ServerStorageService.instance.currentServer` → `sessionProvider.restoreLastSession(server)`。
- 成功且库仍存在 → 留在画廊；已连接但无库 → 跳 `/library_select`；失败 → 跳 `/server_list`。

## 构建流程

- 标准 Flutter：`flutter build apk` / `flutter build ios` 等（`flutter build web` 已不适用，`web/` 目录已删除）。
- 无自定义 build hook；无 flavor 配置（`android/` `ios/` 为默认）。
- `pubspec.yaml` `version: 1.0.0+1`（versionName + versionCode）。
- `dev_dependencies` 含 `build_runner`/`json_serializable`，但**当前 SDK 不用 codegen**
  （lib 下无 `.g.dart`）。

## 平台目录初始化

- `android/`、`ios/`：默认脚手架，包名/Bundle ID 为默认；iOS 端为标准 Flutter 工程。
- 其余平台（macos/windows/linux）为脚手架默认，未深扫；`web/` 已删除。

## 关键启动依赖

| 步骤 | 依赖/状态 | 失败行为 |
|------|-----------|----------|
| i18n 初始化 | `easy_localization`（assets/translations） | await 完成 |
| shader 预热 | `liquid_glass_widgets` | await，初始化完才进首帧 |
| ProviderScope | Riverpod | — |
| 路由 `/` | `MainShellScreen` | — |
| 会话恢复 | `ServerStorageService` + `sessionProvider` | 失败跳 `/server_list` |
| 取数据 | `sessionProvider.client`（恢复后才有） | 未连接 → 各 provider 返回空/loading |
