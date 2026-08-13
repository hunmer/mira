import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';
import 'package:universal_back_gesture/universal_back_gesture.dart';
import 'router/app_router.dart';
import 'src/providers/color_theme_provider.dart';
import 'src/providers/file_filter_provider.dart';
import 'src/providers/background_effect_provider.dart';
import 'src/providers/locale_provider.dart';
import 'src/providers/photo_backup_provider.dart';
import 'src/providers/theme_provider.dart';
import 'src/services/download_service.dart';
import 'src/services/notification_service.dart';
import 'src/services/photo_backup_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // easy_localization：载入 JSON 翻译资源。
  await EasyLocalization.ensureInitialized();
  // Pre-warm Liquid Glass shaders so the first glass frame is jank-free.
  await LiquidGlassWidgets.initialize();
  // 载入相册自动备份配置与去重水位线（不请求权限，按需再请求）。
  await PhotoBackupService.instance.init();
  // 载入下载配置（保存路径、并行下载数）。
  await DownloadService.instance.init();
  // 初始化本地通知（下载进度前台服务通知）。
  await NotificationService.instance.init();

  // 预读主题模式，避免首帧按系统态渲染后再切换闪烁。
  final container = ProviderContainer();
  await container.read(themeModeProvider.notifier).init();
  // 预读玻璃颜色主题，避免首帧按库默认外观渲染后再切换闪烁。
  await container.read(colorThemeProvider.notifier).init();
  // 预读语言偏好，避免首帧按系统语言渲染后再切换闪烁。
  await container.read(localeModeProvider.notifier).init();
  // 恢复素材列表过滤条件。
  await container.read(fileFilterProvider.notifier).init();
  // 预读背景效果参数（速度/光斑数/模糊/帧率），避免首帧按默认值渲染后再切换。
  await container.read(backgroundEffectProvider.notifier).init();
  runApp(EasyLocalization(
    supportedLocales: const [Locale('zh', 'CN'), Locale('en', 'US')],
    path: 'assets/translations',
    fallbackLocale: const Locale('zh', 'CN'),
    // 默认中文；用户在设置页切换后由 MyApp 里的 setLocale 覆盖。
    startLocale: const Locale('zh', 'CN'),
    child: UncontrolledProviderScope(
      container: container,
      child: const MyApp(),
    ),
  ));
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  /// 按 (种子色, 亮度, 暗色主色覆盖) 缓存 [ThemeData]。切换颜色主题时
  /// 种子色变化，命中新的缓存项，从而让 `primaryColor` / `primaryContainer`
  /// 等与玻璃配色保持一致；同一组合只构建一次。
  static final Map<(Color, Brightness, Color?), ThemeData> _themeCache = {};

  /// 构建主题。
  ///
  /// [darkPrimaryOverride] 仅暗色模式下生效：M3 的 `ColorScheme.fromSeed`
  /// 在暗色下会把任何饱和种子色调亮成偏淡蓝紫，导致不同配色在暗色下都
  /// 褪成相近的紫色。传入该预设的满饱和原色即可显式覆盖 `primary` /
  /// `primaryContainer`，让暗色主色与玻璃发光色一致。`null` 表示沿用
  /// M3 派生（[ColorThemePreset.appDefault] 走这条，保持改动前行为）。
  static ThemeData _themeFor(
    Color seed,
    Brightness brightness, {
    Color? darkPrimaryOverride,
  }) {
    final key = (seed, brightness, darkPrimaryOverride);
    return MyApp._themeCache.putIfAbsent(key, () {
      // 统一的过渡 + 边缘滑动返回手势：所有 MaterialPageRoute 都会读取它。
      // parentTransitionBuilder 决定 push 的基础动画（iOS 风格整体右滑入），
      // BackGesturePageTransitionsBuilder 在其上叠加全平台可用的边缘滑动返回。
      final gestureBuilder = BackGesturePageTransitionsBuilder(
        parentTransitionBuilder: const CupertinoPageTransitionsBuilder(),
        config: BackGestureConfig(),
      );
      var colorScheme = ColorScheme.fromSeed(
        seedColor: seed,
        brightness: brightness,
      );
      // 暗色下绕开 M3 的调亮行为：用预设原色覆盖主色族。
      if (brightness == Brightness.dark && darkPrimaryOverride != null) {
        colorScheme = colorScheme.copyWith(
          primary: darkPrimaryOverride,
          primaryContainer: darkPrimaryOverride,
        );
      }
      return ThemeData(
        colorScheme: colorScheme,
        brightness: brightness,
        pageTransitionsTheme: PageTransitionsTheme(
          builders: {
            // 所有平台统一启用（iOS/Android/Windows/macOS/Linux/Web）。
            for (final platform in TargetPlatform.values) platform: gestureBuilder,
          },
        ),
      );
    });
  }

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

/// 监听 App 生命周期：回到前台时若启用了相册自动备份且已连接，触发一次同步。
class _MyAppState extends ConsumerState<MyApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // fire-and-forget：同步内部有 _syncing 互斥与连接态保护。
      maybeAutoSync(ref);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mode = ref.watch(themeModeProvider);
    // system 模式按平台亮度决定；light/dark 直接取对应主题。
    final isDark = mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    // 用户选择的玻璃颜色主题；appDefault → null（不覆盖库默认外观）。
    final colorTheme = ref.watch(colorThemeProvider);
    // 种子色随颜色主题变化 → primaryColor / colorScheme 派生色一起跟着变。
    // 暗色下额外用预设原色覆盖 primary，绕开 M3 把所有配色褪成淡紫的行为。
    final theme = MyApp._themeFor(
      seedColorFor(colorTheme),
      isDark ? Brightness.dark : Brightness.light,
      darkPrimaryOverride: primaryColorFor(colorTheme),
    );

    // 语言偏好：非 system 时同步到 easy_localization，驱动整树重建切换语言。
    final localeMode = ref.watch(localeModeProvider);
    final target = localeFromMode(localeMode);
    if (target != null && context.locale != target) {
      // 在 build 中触发 setLocale 会在下一帧重建子树，实现语言切换。
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.setLocale(target);
      });
    }

    return LiquidGlassWidgets.wrap(
      // glassThemeDataFor 返回 null 时不注入 GlassTheme，与改动前行为一致。
      theme: glassThemeDataFor(colorTheme),
      // 按官方文档传 brightnessResolver，保证玻璃明暗跟随注入的 Theme。
      brightnessResolver: Theme.maybeBrightnessOf,
      child: CupertinoApp(
        title: 'Mira',
        debugShowCheckedModeBanner: false,
        // CupertinoApp 会向下级联 Cupertino 默认文本样式——这正是修复
        // GlassAppBar 标题红色回退文字的关键（example 同款根结构）。
        theme: CupertinoThemeData(
          brightness: theme.brightness,
          primaryColor: theme.colorScheme.primary,
        ),
        navigatorKey: AppRouter.navigatorKey,
        onGenerateRoute: AppRouter.generateRoute,
        initialRoute: '/',
        // easy_localization 提供的 delegates 已包含 Material/Widgets/Cupertino
        // 全套 delegate（其内部正是上面的三个 Global* delegate），这里统一用
        // context.localizationDelegates 注入，保证 .tr() 能解析到当前语言。
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        // Material 兼容层：CupertinoApp 作为唯一的导航宿主（单一 Navigator），
        // builder 里只补 Theme / ScaffoldMessenger / DefaultTextStyle 等
        // inherited，**不**再开新的 Navigator 栈。视觉组件已迁到玻璃风格
        // （lib/src/widgets/glass/mira_ui.dart），但 Theme.of / ScaffoldMessenger
        // 等继承仍被各页依赖，这里统一注入。theme 随用户选择的主题模式变化。
        builder: (context, child) => _MaterialInheritedScope(
          theme: theme,
          child: child!,
        ),
      ),
    );
  }
}

/// 为 CupertinoApp 子树补上 Material 必需的 inherited，避免再嵌一层
/// MaterialApp（那会多出一个 Navigator 栈，导致路由错乱）。
///
/// 提供：
/// - [Theme] —— 让全项目 `Theme.of(context)` 可用；
/// - [ScaffoldMessenger] —— 让 `ScaffoldMessenger.of(context)` / `showSnackBar`
///   可用（CupertinoApp 不提供根级 ScaffoldMessenger）；
/// - [DefaultTextStyle] —— 让未被 Material 祖先包裹的裸 [Text] 也不会命中
///   调试回退（红色）样式。
class _MaterialInheritedScope extends StatelessWidget {
  const _MaterialInheritedScope({required this.theme, required this.child});

  final ThemeData theme;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: theme,
      child: ScaffoldMessenger(
        // child 即 CupertinoApp Navigator 渲染出的当前页面。
        child: DefaultTextStyle(
          style: theme.textTheme.bodyMedium ?? const TextStyle(),
          child: child,
        ),
      ),
    );
  }
}
