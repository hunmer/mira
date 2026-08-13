import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_all/webview_all.dart';

import '../../router/app_router.dart';
import '../providers/session_provider.dart';
import '../widgets/glass/mira_ui.dart';

/// 服务器 Dashboard：以内置 WebView 打开 后端地址 + /dashboard。
///
/// 参照 [FilePreviewScreen] 的 WebView 接入方式，加载时覆盖 loading 指示，
/// 失败或未连接时展示对应文案。
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  WebViewController? _controller;
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  Future<void> _loadDashboard() async {
    final client = ref.read(sessionProvider).client;
    if (client == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final base = client.getHttpClient().config.baseUrl;
    final url = base.endsWith('/') ? '${base}dashboard' : '$base/dashboard';
    try {
      final controller = WebViewController();
      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != false && mounted) {
              setState(() => _error = error);
            }
          },
        ),
      );
      await controller.loadRequest(Uri.parse(url));
      if (mounted) {
        setState(() {
          _controller = controller;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: false,
      child: GlassScaffold(
        extendBody: true,
        statusBarStyle: GlassStatusBarStyle.auto,
        background: const GlassBackground(),
        appBar: GlassAppBar(
          padding: GlassLayout.appBarPadding,
          leading: MiraIconButton(
            icon: Icon(
              Icons.arrow_back_ios_new,
              color: isDark ? Colors.white : Colors.black87,
            ),
            onPressed: AppRouter.goBack,
          ),
        ),
        body: Material(
          type: MaterialType.transparency,
          child: SafeArea(child: _buildBody()),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_controller == null || _error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
          child: Text(
            _error != null
                ? 'dashboard.loadFailed'.tr()
                : 'dashboard.notConnected'.tr(),
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }
    return Stack(
      children: [
        Positioned.fill(child: WebViewWidget(controller: _controller!)),
        if (_loading) const Positioned.fill(child: MiraLoader()),
      ],
    );
  }
}
