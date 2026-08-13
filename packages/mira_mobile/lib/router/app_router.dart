import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../mira_sdk/mira_sdk.dart';
import '../src/widgets/glass/mira_ui.dart';
import '../src/models/server_config.dart';
import '../src/screens/home/main_shell_screen.dart';
import '../src/screens/dashboard_screen.dart';
import '../src/screens/file_preview_screen.dart';
import '../src/screens/image_preview_screen.dart';
import '../src/screens/item_detail_screen.dart';
import '../src/screens/library_item_list_screen.dart';
import '../src/screens/server_edit_screen.dart';
import '../src/screens/server_list_screen.dart';
import '../src/screens/settings/settings_screen.dart';
import '../src/screens/settings/about_settings_screen.dart';
import '../src/screens/settings/backup_settings_screen.dart';
import '../src/screens/settings/background_settings_screen.dart';
import '../src/screens/settings/download_settings_screen.dart';
import '../src/screens/tree_view/tree_view_screen.dart';
import '../src/screens/upload/upload_screen.dart';
import '../src/screens/video_preview_screen.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  // 定义所有可用的路由
  static final List<RouteInfo> routes = [
    RouteInfo('/', 'route.home', Icons.home),
    RouteInfo('/settings', 'route.settings', Icons.settings),
    RouteInfo('/server_list', 'route.serverList', Icons.dns),
    RouteInfo('/server_edit', 'route.serverEdit', Icons.edit),
    RouteInfo('/library_select', 'route.librarySelect', Icons.collections_bookmark),
    RouteInfo('/library_item_list', 'route.libraryItemList', Icons.photo_library),
    RouteInfo('/item_detail', 'route.itemDetail', Icons.info),
    RouteInfo('/tree_view', 'route.treeView', Icons.folder_copy_outlined),
    RouteInfo('/upload', 'route.upload', Icons.upload_file),
    RouteInfo('/backup_settings', 'route.backupSettings', Icons.backup),
    RouteInfo('/download_settings', 'route.downloadSettings', Icons.download),
    RouteInfo('/background_settings', 'route.backgroundSettings', Icons.auto_awesome),
    RouteInfo('/about_settings', 'route.aboutSettings', Icons.info_outline),
    RouteInfo('/image_preview', 'route.imagePreview', Icons.image),
    RouteInfo('/video_preview', 'route.videoPreview', Icons.videocam),
    RouteInfo('/file_preview', 'route.filePreview', Icons.insert_drive_file),
    RouteInfo('/dashboard', 'route.dashboard', Icons.dashboard_outlined),
  ];

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/':
        return MaterialPageRoute(
          builder: (_) => const MainShellScreen(),
        );
      case '/settings':
        return MaterialPageRoute(
          builder: (_) => const SettingsScreen(),
        );
      case '/server_list':
        return MaterialPageRoute(
          builder: (_) => const ServerListScreen(initialTab: 0),
        );
      case '/server_edit':
        final server = settings.arguments as ServerConfig?;
        return MaterialPageRoute(
          builder: (_) => ServerEditScreen(server: server),
        );
      case '/library_select':
        // 合并页：直接打开「素材库」Tab。
        return MaterialPageRoute(
          builder: (_) => const ServerListScreen(initialTab: 1),
        );
      case '/library_item_list':
        return MaterialPageRoute(
          builder: (_) {
            final isDark =
                WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                    Brightness.dark;
            return GlassScaffold(
              extendBody: true,
              statusBarStyle: GlassStatusBarStyle.auto,
              background: const GlassBackground(),
              appBar: GlassAppBar(
                leading: MiraIconButton(
                  icon: Icon(Icons.arrow_back_ios_new,
                      color: isDark ? Colors.white : Colors.black87),
                  onPressed: AppRouter.goBack,
                ),
                title: Text('gallery.title'.tr()),
              ),
              body: const Material(
                type: MaterialType.transparency,
                child: GalleryGrid(),
              ),
            );
          },
        );
      case '/item_detail':
        return MaterialPageRoute(
          builder: (_) => const ItemDetailScreen(),
        );
      case '/tree_view':
        return MaterialPageRoute(
          builder: (_) => const TreeViewScreen(),
        );
      case '/upload':
        return MaterialPageRoute(
          builder: (_) => const UploadScreen(),
        );
      case '/backup_settings':
        return MaterialPageRoute(
          builder: (_) => const BackupSettingsScreen(),
        );
      case '/download_settings':
        return MaterialPageRoute(
          builder: (_) => const DownloadSettingsScreen(),
        );
      case '/background_settings':
        return MaterialPageRoute(
          builder: (_) => const BackgroundSettingsScreen(),
        );
      case '/about_settings':
        return MaterialPageRoute(
          builder: (_) => const AboutSettingsScreen(),
        );
      case '/image_preview':
        final args = settings.arguments;
        return MaterialPageRoute(
          builder: (_) => ImagePreviewScreen(
            files: args is PreviewArgs ? args.files : const [],
            initialIndex: args is PreviewArgs ? args.initialIndex : 0,
            onFileChanged: args is PreviewArgs ? args.onFileChanged : null,
          ),
        );
      case '/video_preview':
        final args = settings.arguments;
        return MaterialPageRoute(
          builder: (_) => VideoPreviewScreen(
            files: args is PreviewArgs ? args.files : const [],
            initialIndex: args is PreviewArgs ? args.initialIndex : 0,
            onFileChanged: args is PreviewArgs ? args.onFileChanged : null,
          ),
        );
      case '/file_preview':
        final file = settings.arguments as FileData?;
        return _NoSwipeBackMaterialPageRoute(
          builder: (_) => FilePreviewScreen(file: file),
        );
      case '/dashboard':
        return MaterialPageRoute(
          builder: (_) => const DashboardScreen(),
        );
      default:
        return MaterialPageRoute(
          builder: (_) => const PlaceholderWidget(titleKey: 'route.notFound'),
        );
    }
  }

  static Future<dynamic> navigateTo(String routeName, {Object? arguments}) {
    return navigatorKey.currentState!.pushNamed(routeName, arguments: arguments);
  }

  static void goBack() {
    final navigator = navigatorKey.currentState;
    if (navigator?.canPop() ?? false) {
      navigator!.pop();
    }
  }

  static Future<dynamic> replaceWith(String routeName, {Object? arguments}) {
    return navigatorKey.currentState!.pushReplacementNamed(routeName, arguments: arguments);
  }

  static Future<dynamic> navigateAndClearStack(String routeName, {Object? arguments}) {
    return navigatorKey.currentState!.pushNamedAndRemoveUntil(
      routeName,
      (route) => false,
      arguments: arguments,
    );
  }
}

/// 保留显式返回操作，但关闭 iOS 的交互式侧滑返回。
class _NoSwipeBackMaterialPageRoute<T> extends MaterialPageRoute<T> {
  _NoSwipeBackMaterialPageRoute({required super.builder});

  @override
  bool get popGestureEnabled => false;
}

// 路由信息类
class RouteInfo {
  final String route;
  /// 路由标题的 i18n key（显示时 .tr()）。
  final String titleKey;
  final IconData icon;

  const RouteInfo(this.route, this.titleKey, this.icon);
}

/// 大图/视频预览的入参：当前文件列表 + 点击索引。
class PreviewArgs {
  final List<FileData> files;
  final int initialIndex;
  final ValueChanged<int>? onFileChanged;

  const PreviewArgs({
    required this.files,
    required this.initialIndex,
    this.onFileChanged,
  });
}

// 首页现由 MainShellScreen 提供（画廊 / 文件夹 / 设置 三个 Tab），
// 旧的导航网格首页已移除。

class PlaceholderWidget extends StatelessWidget {
  final String titleKey;

  const PlaceholderWidget({super.key, required this.titleKey});

  @override
  Widget build(BuildContext context) {
    final title = titleKey.tr();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        leading: MiraIconButton(
          icon: Icon(Icons.arrow_back_ios_new,
              color: isDark ? Colors.white : Colors.black87),
          onPressed: AppRouter.goBack,
        ),
        title: Text(title),
      ),
      body: Material(
        type: MaterialType.transparency,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              MiraButton(
                isPrimary: true,
                onPressed: () {
                  AppRouter.goBack();
                },
                child: Text('route.backHome'.tr()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
