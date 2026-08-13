import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../router/app_router.dart';
import '../../providers/download_provider.dart';
import '../../providers/file_filter_provider.dart';
import '../../providers/session_provider.dart';
import '../../providers/upload_provider.dart';
import '../../services/server_storage_service.dart';
import '../../widgets/glass/mira_ui.dart';
import '../download/download_queue_sheet.dart';
import '../library_item_list_screen.dart';
import '../settings/settings_tab_screen.dart';
import '../tree_view/folder_tag_edit_dialog.dart';
import '../tree_view/tree_view_screen.dart';

/// The root app shell with a floating glass bottom tab bar.
///
/// Hosts three tabs — 画廊 / 文件夹 / 设置. 未连接/未选库时直接跳转服务器列表。
///
/// 架构：每个 tab 各自一个独立的 [GlassScaffold]（独立的 appBar / 大标题
/// controller / 滚动状态），通过 [_SlidingTabView] 保活并渐显切换。底部
/// [GlassTabBar] 在三个 Scaffold 里各渲染一份（共享 [_MainShellScreenState._index]
/// 与 [_onTabSelected]），这样每个 TabBar 都在自己的 [GlassPage] 子树里，
/// 能正确采样背景渲染真实玻璃；点击任一个都同步切换。渐显仅包裹各页的
/// appBar 和 body，底部 tab 栏始终保持固定且不参与动画。
class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen> {
  int _index = 0;

  /// 是否正在尝试自动恢复上次会话（用于显示 loading，避免白屏）。
  bool _autoRestoring = false;

  /// 本进程内只尝试自动恢复一次，避免退出登录后回到本页又触发重连。
  static bool _autoRestoreAttempted = false;

  @override
  void initState() {
    super.initState();
    // 首次进入：若未连接且本进程未恢复过，标记为"恢复中"并尝试恢复。
    // 关键：_autoRestoring 必须在首帧 build 之前置位，否则首帧会走导航分支、
    // 调度的 post-frame 导航会在恢复 await 让出时抢先执行，打断恢复。
    final session = ref.read(sessionProvider);
    if (!session.isConnected && !_autoRestoreAttempted) {
      _autoRestoring = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _tryAutoRestore();
      });
    }
  }

  /// 尝试自动恢复上次会话：找到当前服务器 → 登录 → 自动选上次库。
  /// 仅在本进程首次执行一次。
  Future<void> _tryAutoRestore() async {
    // 已连接或本进程已尝试过：不再恢复
    if (ref.read(sessionProvider).isConnected || _autoRestoreAttempted) {
      if (mounted) setState(() => _autoRestoring = false);
      return;
    }
    _autoRestoreAttempted = true;

    await ServerStorageService.instance.init();
    final server = ServerStorageService.instance.currentServer;

    // 无当前服务器或无凭据：回退到手动选择
    final hasCred =
        server != null &&
        ((server.token?.isNotEmpty ?? false) ||
            (server.username?.isNotEmpty ?? false));
    if (!hasCred) {
      if (mounted) setState(() => _autoRestoring = false);
      AppRouter.navigateAndClearStack('/server_list');
      return;
    }

    final restored = await ref
        .read(sessionProvider.notifier)
        .restoreLastSession(server);
    if (!mounted) return;
    setState(() => _autoRestoring = false);

    final s = ref.read(sessionProvider);
    if (restored && s.isConnected && s.library != null) {
      // 完整恢复，正常渲染主页
      return;
    }
    if (s.isConnected) {
      // 已连上但没选上库 → 让用户选库
      AppRouter.navigateAndClearStack('/library_select');
    } else {
      // 连接失败 → 服务器列表
      AppRouter.navigateAndClearStack('/server_list');
    }
  }

  void _onTabSelected(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);

    // 自动恢复中：显示加载页，避免白屏。
    // 必须用 GlassScaffold + GlassBackground：玻璃指示器（MiraLoader 内的
    // GlassProgressIndicator）需要采样动态背景纹理才能显出质感——裸 Scaffold
    // 的纯色背景会让指示器几乎不可见，表现为空白屏（即"没有加载页"）。
    if (_autoRestoring) {
      return GlassScaffold(
        extendBody: true,
        statusBarStyle: GlassStatusBarStyle.auto,
        background: const GlassBackground(),
        body: Center(child: MiraLoader(message: 'connection.connecting'.tr())),
      );
    }

    // 未连接或未选库：兜底跳转服务器列表。
    // 恢复期间已被上方 loading 分支挡住，不会在此误触发；
    // 恢复失败或运行中断开时作为最终兜底（与 _tryAutoRestore 的导航幂等）。
    if (!session.isConnected || session.library == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // MainShell 被其他页面覆盖时仍会因 provider 变化而 rebuild，不能让
        // 栈底页面抢走当前页面的导航控制权。
        if (!mounted || ModalRoute.of(context)?.isCurrent != true) return;

        final latestSession = ref.read(sessionProvider);
        if (latestSession.isConnected && latestSession.library != null) return;
        AppRouter.navigateAndClearStack(
          latestSession.isConnected ? '/library_select' : '/server_list',
        );
      });
      return const SizedBox.shrink();
    }

    // 每个 tab 各自一个 GlassScaffold；_SlidingTabView 始终挂载三个 tab
    // 保活其 State（大标题折叠 + 滚动位置各自保留），并在切换 index 时附带
    // 交叉渐显过渡。GlassTabBar 共享 _index/_onTabSelected，在三个 Scaffold 里
    // 各渲染一份，点击任一个同步切换。
    return _SlidingTabView(
      index: _index,
      children: [
        _GalleryTab(index: _index, onTabSelected: _onTabSelected),
        _TreeViewTab(index: _index, onTabSelected: _onTabSelected),
        _SettingsTab(index: _index, onTabSelected: _onTabSelected),
      ],
    );
  }
}

// ───────────────────────── 共享 helper ─────────────────────────

/// 三个 tab 顶部 + 底部 tab bar 的统一配置。
///
/// 用 getter 而非 const：标签文案需按当前语言 `.tr()` 渲染。
List<GlassTab> get _mainTabs => [
  GlassTab(
    icon: const Icon(Icons.photo_library_outlined),
    label: 'tabs.gallery'.tr(),
  ),
  GlassTab(
    icon: const Icon(Icons.folder_copy_outlined),
    label: 'tabs.folders'.tr(),
  ),
  GlassTab(
    icon: const Icon(Icons.settings_outlined),
    label: 'tabs.settings'.tr(),
  ),
];

// ───────────────────────── 渐显切换容器 ─────────────────────────

/// 通过 [IndexedStack] 始终挂载全部子页以保活 State（滚动位置、大标题折叠状态
/// 各自保留）；渐显由各子页内部的 [_TabContentFade] 负责。
class _SlidingTabView extends StatelessWidget {
  const _SlidingTabView({required this.index, required this.children});

  /// 当前展示的子页索引（动画终点）。
  final int index;

  /// 子页列表（始终保持挂载以保活）。
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return IndexedStack(
      index: index,
      sizing: StackFit.expand,
      children: children,
    );
  }
}

/// 仅让页面主要内容渐显，底部 tab bar 不使用此组件。
class _TabContentFade extends StatelessWidget {
  const _TabContentFade({required this.active, required this.child});

  final bool active;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: active ? 1 : 0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeIn,
      child: child,
    );
  }
}

// ───────────────────────── 各 tab 独立 Scaffold ─────────────────────────
//
// 每个 tab 持有自己的 GlassLargeTitleController（驱动大标题折叠 + 内联小标题
// 交叉淡入），切换 tab 时 State 保活、滚动位置与折叠状态各自保留。

class _GalleryTab extends ConsumerStatefulWidget {
  const _GalleryTab({required this.index, required this.onTabSelected});

  /// 当前选中的 tab 索引（驱动 bottomBar 高亮）。
  final int index;

  /// 点击底部 tab bar 的回调（由 MainShell 持有，切换 _index）。
  final ValueChanged<int> onTabSelected;

  @override
  ConsumerState<_GalleryTab> createState() => _GalleryTabState();
}

class _GalleryTabState extends ConsumerState<_GalleryTab> {
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();
  final TextEditingController _searchController = TextEditingController();
  bool _searching = false;

  @override
  void didUpdateWidget(covariant _GalleryTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 切走画廊 tab 时自动收起搜索栏并清空标题过滤（避免残留）。
    // clearTitle() 把 '' 设为 '' 时 FileFilterState 相等（已重写 ==），
    // 不会触发 filesProvider.reload()。
    if (widget.index != 0 && _searching) {
      _searching = false;
      _searchController.clear();
      ref.read(fileFilterProvider.notifier).clearTitle();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: _TabContentFade(
        active: widget.index == 0,
        child: GlassAppBar(
          // 画廊大标题随列表滚出后，顶部不保留内联 title。
        ),
      ),
      bottomBar: GlassTabBar.searchable(
        tabs: _mainTabs,
        selectedIndex: widget.index,
        onTabSelected: widget.onTabSelected,
        isSearchActive: _searching,
        searchConfig: GlassSearchBarConfig(
          hintText: 'gallery.searchTitle'.tr(),
          controller: _searchController,
          onChanged: (v) => ref.read(fileFilterProvider.notifier).setTitle(v),
          onSearchToggle: (v) {
            setState(() => _searching = v);
            if (!v) {
              _searchController.clear();
              // 标题本就为空时状态相等（已重写 ==），不会触发刷新。
              ref.read(fileFilterProvider.notifier).clearTitle();
            }
          },
        ),
      ),
      body: _TabContentFade(
        active: widget.index == 0,
        child: Material(
          type: MaterialType.transparency,
          child: GalleryGrid(
            scrollController: _titleController.scrollController,
            largeTitleText: 'gallery.title',
            largeTitleController: _titleController,
            // action 按钮作为大标题的 trailing，与大标题同行并随之淡出
            //（Apple Music / Podcasts 模式，参考 liquid_glass apple_music_demo），
            // 避免浮在 GlassAppBar 里贴着屏幕右上角。
            largeTitleTrailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 下载队列入口：有进行中任务时显示数量角标。
                _DownloadQueueButton(
                  onTap: () => showDownloadQueueSheet(context),
                ),
                _UploadQueueButton(
                  onTap: () => AppRouter.navigateTo('/upload'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TreeViewTab extends ConsumerStatefulWidget {
  const _TreeViewTab({required this.index, required this.onTabSelected});

  final int index;
  final ValueChanged<int> onTabSelected;

  @override
  ConsumerState<_TreeViewTab> createState() => _TreeViewTabState();
}

class _TreeViewTabState extends ConsumerState<_TreeViewTab> {
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();
  final TextEditingController _searchController = TextEditingController();
  // 文件夹/标签切换状态（受控地传给 TreeViewScreen），决定「新建」按钮创建哪种实体。
  bool _showTags = false;
  bool _searching = false;
  String _searchQuery = '';

  @override
  void didUpdateWidget(covariant _TreeViewTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 切走文件夹 tab 时自动收起搜索栏并清空搜索词（避免残留）。
    if (widget.index != 1 && _searching) {
      _searching = false;
      _searchQuery = '';
      _searchController.clear();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// 点击 appBar「新建」：弹新建对话框（父节点选择由对话框内部用 select dialog 完成）。
  Future<void> _onCreate() async {
    if (!mounted) return;
    await showFolderTagEditDialog(
      context,
      kind: _showTags ? FolderTagKind.tag : FolderTagKind.folder,
      action: 'entity.createAction'.tr(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: _TabContentFade(
        active: widget.index == 1,
        child: GlassAppBar(
          title: Text(_showTags ? 'tags.title'.tr() : 'folders.title'.tr()),
          largeTitleController: _titleController,
        ),
      ),
      bottomBar: GlassTabBar.searchable(
        tabs: _mainTabs,
        selectedIndex: widget.index,
        onTabSelected: widget.onTabSelected,
        isSearchActive: _searching,
        searchConfig: GlassSearchBarConfig(
          hintText: _showTags
              ? 'tags.searchTags'.tr()
              : 'folders.searchFolders'.tr(),
          controller: _searchController,
          onChanged: (v) => setState(() => _searchQuery = v),
          onSearchToggle: (v) {
            setState(() {
              _searching = v;
              if (!v) {
                _searchQuery = '';
                _searchController.clear();
              }
            });
          },
        ),
      ),
      body: _TabContentFade(
        active: widget.index == 1,
        child: Material(
          type: MaterialType.transparency,
          child: TreeViewScreen(
            embedded: true,
            scrollController: _titleController.scrollController,
            largeTitleText: _showTags ? 'tags.title' : 'folders.title',
            largeTitleController: _titleController,
            largeTitleTrailing: GlassIconButton(
              icon: const Icon(Icons.add),
              semanticLabel: _showTags
                  ? 'tags.createTag'.tr()
                  : 'folders.createFolder'.tr(),
              onPressed: _onCreate,
            ),
            showTags: _showTags,
            onToggleShowTags: () => setState(() => _showTags = !_showTags),
            searchQuery: _searchQuery,
          ),
        ),
      ),
    );
  }
}

class _SettingsTab extends ConsumerStatefulWidget {
  const _SettingsTab({required this.index, required this.onTabSelected});

  final int index;
  final ValueChanged<int> onTabSelected;

  @override
  ConsumerState<_SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends ConsumerState<_SettingsTab> {
  final GlassLargeTitleController _titleController =
      GlassLargeTitleController();

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  /// 退出登录：确认 → disconnect → 回服务器列表。
  Future<void> _onLogout() async {
    final confirmed = await showMiraConfirmDialog(
      context,
      title: 'settings.logoutConfirmTitle',
      message: 'settings.logoutConfirmMessage',
      confirmText: 'settings.logoutConfirmButton',
      isDestructive: true,
    );
    if (confirmed != true) return;
    await ref.read(sessionProvider.notifier).disconnect();
    if (mounted) {
      AppRouter.navigateAndClearStack('/server_list');
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: _TabContentFade(
        active: widget.index == 2,
        child: GlassAppBar(
          title: Text('settings.title'.tr()),
          largeTitleController: _titleController,
        ),
      ),
      bottomBar: GlassTabBar.bottom(
        tabs: _mainTabs,
        selectedIndex: widget.index,
        onTabSelected: widget.onTabSelected,
        extraButton: GlassTabBarExtraButton(
          icon: const Icon(Icons.dashboard_outlined),
          label: 'dashboard.title'.tr(),
          onTap: () => AppRouter.navigateTo('/dashboard'),
        ),
      ),
      body: _TabContentFade(
        active: widget.index == 2,
        child: Material(
          type: MaterialType.transparency,
          child: SettingsTabScreen(
            scrollController: _titleController.scrollController,
            largeTitleText: 'settings.title',
            largeTitleController: _titleController,
            largeTitleTrailing: GlassIconButton(
              icon: const Icon(Icons.logout),
              semanticLabel: 'settings.logout'.tr(),
              onPressed: _onLogout,
            ),
          ),
        ),
      ),
    );
  }
}

/// 画廊头部的下载队列入口按钮：有进行中任务时右上角显示数量角标。
class _DownloadQueueButton extends ConsumerWidget {
  const _DownloadQueueButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(downloadActiveCountProvider).valueOrNull ?? 0;
    if (count == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          GlassIconButton(
            icon: const Icon(Icons.download_outlined),
            semanticLabel: 'download.queueTitle'.tr(),
            onPressed: onTap,
          ),
          Positioned(
            top: 2,
            right: 2,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              height: 16,
              padding: const EdgeInsets.symmetric(horizontal: 3),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  width: 1.5,
                ),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  height: 1,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 画廊头部的上传入口按钮：有进行中任务时显示数量角标。
class _UploadQueueButton extends ConsumerWidget {
  const _UploadQueueButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(uploadActiveCountProvider).valueOrNull ?? 0;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        GlassIconButton(
          icon: const Icon(Icons.upload_file),
          semanticLabel: 'gallery.uploadFile'.tr(),
          onPressed: onTap,
        ),
        if (count > 0)
          Positioned(
            top: 2,
            right: 2,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              height: 16,
              padding: const EdgeInsets.symmetric(horizontal: 3),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  width: 1.5,
                ),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  height: 1,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
