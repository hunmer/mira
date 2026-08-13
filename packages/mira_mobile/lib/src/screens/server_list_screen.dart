import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../mira_sdk/mira_sdk.dart';
import '../../router/app_router.dart';
import '../models/server_config.dart';
import '../providers/library_provider.dart';
import '../providers/server_provider.dart';
import '../providers/session_provider.dart';
import '../widgets/glass/mira_ui.dart';

/// 服务器 / 素材库选择页：顶部两个 Tab——
///   1. 服务器：列出已保存服务器，点击发起连接。
///   2. 素材库：列出当前服务器所有库，点击进入主页 MainShell。
///
/// 连接成功后自动切换到「素材库」Tab，无需跳转新页面。
/// `/server_list` 默认打开服务器 Tab，`/library_select` 默认打开素材库 Tab。
class ServerListScreen extends ConsumerStatefulWidget {
  const ServerListScreen({super.key, this.initialTab = 0});

  /// 初始 Tab 索引：0 = 服务器，1 = 素材库。
  final int initialTab;

  @override
  ConsumerState<ServerListScreen> createState() => _ServerListScreenState();
}

class _ServerListScreenState extends ConsumerState<ServerListScreen> {
  /// 正在连接的服务器 id；非 null 表示有连接进行中（期间所有卡片禁用点击）。
  String? _connectingServerId;

  /// 当前激活的 Tab：0 = 服务器，1 = 素材库。
  late int _tabIndex = widget.initialTab.clamp(0, 1);

  Future<void> _goBack() async {
    // 返回前取消可能挂起的服务器切换，避免后台遗留连接。
    await ref.read(sessionProvider.notifier).cancelPendingServerSwitch();
    if (mounted) AppRouter.goBack();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;

    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        padding: GlassLayout.appBarPadding,
        leading: ModalRoute.of(context)?.canPop == true
            ? glassBackButton(context, onPressed: _goBack)
            : null,
        title: Text('connection.title'.tr(),
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          // 仅在「服务器」Tab 显示新增按钮。
          if (_tabIndex == 0)
            MiraIconButton(
              icon: const Icon(Icons.add),
              tooltip: 'server.add'.tr(),
              onPressed: _navigateToEdit,
            ),
        ],
      ),
      body: Material(
        type: MaterialType.transparency,
        child: _buildBody(isDarkMode, theme),
      ),
    );
  }

  Widget _buildBody(bool isDarkMode, ThemeData theme) {
    final topPad = MediaQuery.paddingOf(context).top;
    return Column(
      children: [
        // 顶部 spacer：让内容避开 GlassAppBar（状态栏 + 工具栏 8 + 44）。
        SizedBox(height: topPad + 52),
        // 顶部 Tab 控件：服务器 / 素材库。
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: GlassTabBar.inline(
            tabs: [
              GlassTab(label: 'server.tabLabel'.tr()),
              GlassTab(label: 'library.tabLabel'.tr()),
            ],
            selectedIndex: _tabIndex,
            onTabSelected: (i) => setState(() => _tabIndex = i),
          ),
        ),
        // 保活两个 Tab 的滚动状态。
        Expanded(
          child: IndexedStack(
            index: _tabIndex,
            children: [
              _buildServerTab(isDarkMode, theme),
              _buildLibraryTab(),
            ],
          ),
        ),
      ],
    );
  }

  // ───────────────────────── 服务器 Tab ─────────────────────────

  Widget _buildServerTab(bool isDarkMode, ThemeData theme) {
    final servers = ref.watch(serverListProvider);
    if (servers.isEmpty) return _buildEmptyState(isDarkMode);
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)
          .copyWith(bottom: 120),
      itemCount: servers.length,
      separatorBuilder: (_, _) => const SizedBox(height: 16),
      itemBuilder: (context, i) =>
          _buildServerCard(servers[i], isDarkMode, theme),
    );
  }

  Widget _buildEmptyState(bool isDarkMode) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.dns_outlined,
              size: 80,
              color: isDarkMode ? Colors.grey[600] : Colors.grey[400]),
          const SizedBox(height: 16),
          Text('server.empty'.tr(),
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  color: isDarkMode ? Colors.grey[400] : Colors.grey[600])),
          const SizedBox(height: 8),
          Text('server.emptyHint'.tr(),
              style: TextStyle(
                  fontSize: 14,
                  color: isDarkMode ? Colors.grey[500] : Colors.grey[500])),
        ],
      ),
    );
  }

  Widget _buildServerCard(ServerConfig server, bool isDarkMode, ThemeData theme) {
    final session = ref.watch(sessionProvider);
    final isCurrent = session.connectedServerId == server.id && session.isConnected;
    // 任意连接进行中时禁用全部卡片的操作；loader 仅显示在正在连接的那张卡上。
    final isConnecting = _connectingServerId != null;
    final connectingHere = _connectingServerId == server.id;

    return MiraCard(
      onTap: isConnecting ? null : () => _connect(server),
      isLoading: connectingHere,
      padding: const EdgeInsets.all(16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.dns,
              color: isCurrent ? theme.primaryColor : Colors.grey, size: 40),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(server.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 16)),
                    if (isCurrent) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text("common.connected".tr(),
                            style: const TextStyle(
                                color: Colors.green,
                                fontSize: 12,
                                fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(server.serverUrl,
                    style: TextStyle(
                        color:
                            isDarkMode ? Colors.grey[300] : Colors.grey[700],
                        fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                    'server.createdAt'
                        .tr(namedArgs: {'date': server.formattedCreatedAtDate}),
                    style: TextStyle(
                        color:
                            isDarkMode ? Colors.grey[400] : Colors.grey[500],
                        fontSize: 12)),
              ],
            ),
          ),
          Row(
            children: [
              MiraIconButton(
                icon: Icon(Icons.edit, color: Colors.grey[500]),
                onPressed: isConnecting
                    ? null
                    : () => _navigateToEdit(server: server),
              ),
              const SizedBox(width: 8),
              MiraIconButton(
                icon: Icon(Icons.delete, color: Colors.grey[500]),
                onPressed: isConnecting
                    ? null
                    : () => _deleteServer(server),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _navigateToEdit({ServerConfig? server}) async {
    final result =
        await AppRouter.navigateTo('/server_edit', arguments: server);
    if (result == true) {
      ref.read(serverListProvider.notifier).refresh();
    }
  }

  Future<void> _deleteServer(ServerConfig server) async {
    final confirmed = await showMiraConfirmDialog(
      context,
      title: 'server.confirmDelete',
      // message 带占位符，预翻译后传入。
      message: 'server.deleteMessage'.tr(namedArgs: {'name': server.name}),
      confirmText: 'common.delete',
      isDestructive: true,
    );
    if (confirmed == true) {
      await ref.read(serverListProvider.notifier).remove(server.id);
      if (mounted) {
        showMiraToast(
            context,
            message: 'server.deleted'.tr(namedArgs: {'name': server.name}),
            type: MiraToastType.success);
      }
    }
  }

  /// 连接服务器：登录成功后切换到「素材库」Tab 让用户选库。
  Future<void> _connect(ServerConfig server) async {
    setState(() => _connectingServerId = server.id);
    try {
      await ref.read(sessionProvider.notifier).connectToServer(server);
      // 标记为当前服务器，便于下次启动自动恢复
      await ref.read(serverListProvider.notifier).setCurrent(server.id);
      // 预读 libraries，确保 session 已就绪
      ref.invalidate(librariesProvider);
      if (mounted) {
        // 就地切换到素材库 Tab，不再跳转新页面。
        setState(() => _tabIndex = 1);
      }
    } catch (e) {
      if (mounted) {
        showMiraToast(
            context,
            message: 'server.connectFailed'.tr(namedArgs: {'error': '$e'}),
            type: MiraToastType.error);
      }
    } finally {
      if (mounted) setState(() => _connectingServerId = null);
    }
  }

  // ───────────────────────── 素材库 Tab ─────────────────────────

  Widget _buildLibraryTab() {
    final session = ref.watch(sessionProvider);
    // 未连接服务器：提示先去「服务器」Tab 连接。
    if (!session.isConnected) {
      return _Status(
        icon: Icons.cloud_off_outlined,
        message: 'library.notConnected'.tr(),
      );
    }
    final libsAsync = ref.watch(librariesProvider);
    return libsAsync.when(
      loading: () =>
          const Center(child: MiraCircularProgressIndicator()),
      error: (e, _) => _Status(
        icon: Icons.error_outline,
        message: 'library.loadFailed'.tr(namedArgs: {'error': '$e'}),
        actionLabel: 'common.retry'.tr(),
        onAction: () => ref.invalidate(librariesProvider),
      ),
      data: (libs) {
        if (libs.isEmpty) {
          return _Status(
            icon: Icons.folder_off_outlined,
            message: 'library.empty'.tr(),
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)
              .copyWith(bottom: 120),
          itemCount: libs.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final lib = libs[i];
            final isActive = lib.status == 'active';
            return _LibraryCard(
              library: lib,
              user: session.user,
              isActive: isActive,
              onTap: () async {
                ref.read(sessionProvider.notifier).selectLibrary(lib);
                // 持久化所选库，下次启动可自动恢复
                await _persistLastLibrary(
                  ref,
                  session.connectedServerId,
                  lib.id,
                );
                AppRouter.navigateAndClearStack('/');
              },
            );
          },
        );
      },
    );
  }

  /// 把所选库 id 写回当前服务器配置并持久化。
  static Future<void> _persistLastLibrary(
    WidgetRef ref,
    String? serverId,
    String libraryId,
  ) async {
    if (serverId == null) return;
    final servers = ref.read(serverListProvider);
    final server = servers.where((s) => s.id == serverId).firstOrNull;
    if (server == null) return;
    await ref
        .read(serverListProvider.notifier)
        .update(server.copyWith(lastLibraryId: libraryId));
  }
}

class _LibraryCard extends StatelessWidget {
  const _LibraryCard({
    required this.library,
    required this.onTap,
    required this.isActive,
    this.user,
  });

  final Library library;
  final VoidCallback onTap;
  final bool isActive;
  final UserInfo? user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return MiraCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.photo_library_outlined,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  library.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'library.fileCount'.tr(
                    namedArgs: {
                      'count': '${library.fileCount}',
                      'size': _formatSize(library.size),
                    },
                  ),
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: (isActive ? Colors.green : Colors.grey).withValues(
                alpha: 0.12,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              library.status,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isActive ? Colors.green : Colors.grey,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    final i = (bytes.bitLength - 1) ~/ 10;
    final idx = i < units.length ? i : units.length - 1;
    final size = bytes / (1 << (10 * idx));
    return '${size.toStringAsFixed(idx == 0 ? 0 : 1)} ${units[idx]}';
  }
}

class _Status extends StatelessWidget {
  const _Status({
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });
  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dimColor = isDark ? Colors.white54 : Colors.black54;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: dimColor),
            const SizedBox(height: 12),
            Text(
              message,
              style: TextStyle(color: dimColor),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 12),
              MiraButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
