import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../mira_sdk/mira_sdk.dart';
import '../../providers/file_filter_provider.dart';
import '../../providers/folder_provider.dart';
import '../../providers/tag_provider.dart';
import '../../widgets/folder_tag_tree.dart';
import '../../widgets/glass/mira_ui.dart';
import 'folder_tag_edit_dialog.dart';

/// 文件夹/标签多选过滤页（嵌入 MainShell 的 Tab2）。
///
/// 数据源：foldersProvider/tagsProvider（getAll 客户端组树，不用 query）。
/// 多选写入 fileFilterProvider，画廊 Tab 自动刷新。
///
/// 嵌入时用 [CustomScrollView] 驱动 iOS26 大标题折叠：第一个 sliver 为
/// [GlassLargeTitle]，外层传入的 [scrollController] / [largeTitleController]
/// 与导航栏联动。
///
/// 树的展示与交互由可复用组件 [FolderTagTree] 提供。
class TreeViewScreen extends ConsumerStatefulWidget {
  /// When `true`, renders only the body (no Scaffold/AppBar) for embedding.
  const TreeViewScreen({
    super.key,
    this.embedded = false,
    this.scrollController,
    this.largeTitleText = 'folders.title',
    this.largeTitleController,
    this.largeTitleTrailing,
    this.showTags,
    this.onToggleShowTags,
    this.selectionMode = SelectionMode.none,
    this.searchQuery = '',
  });

  final bool embedded;

  /// 外层传入的滚动控制器（嵌入时来自 GlassLargeTitleController）。
  final ScrollController? scrollController;

  /// 大标题文本，需与导航栏小标题一致。
  final String largeTitleText;

  /// 协调大标题折叠动画的控制器。
  final GlassLargeTitleController? largeTitleController;

  /// 大标题行尾的 widget（如新建按钮），与大标题同行并随之淡出
  ///（Apple Music / Podcasts 模式，参考 liquid_glass apple_music_demo）。
  final Widget? largeTitleTrailing;

  /// 列表选择模式，透传给 [FolderTagTree]；默认不选择。
  final SelectionMode selectionMode;

  /// 受控的「文件夹/标签」切换状态。非 null 时由外层（Tab）控制，
  /// 用于让 Tab 的 appBar「新建」按钮知道当前在新建哪种实体。
  final bool? showTags;

  /// 受控模式下切换 文件夹/标签 的回调。
  final VoidCallback? onToggleShowTags;

  /// 客户端搜索关键词（非空时按节点名过滤树，匹配节点连同祖先链路展开）。
  final String searchQuery;

  @override
  ConsumerState<TreeViewScreen> createState() => _TreeViewScreenState();
}

class _TreeViewScreenState extends ConsumerState<TreeViewScreen> {
  // 非受控模式下的内部状态；受控模式（showTags != null）读 widget 值。
  bool _internalShowTags = false;

  bool get _showTags => widget.showTags ?? _internalShowTags;

  void _toggleShowTags() {
    if (widget.onToggleShowTags != null) {
      widget.onToggleShowTags!();
    } else {
      setState(() => _internalShowTags = !_internalShowTags);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.embedded) {
      final topPad = MediaQuery.paddingOf(context).top;
      return CustomScrollView(
        controller: widget.scrollController,
        slivers: [
          // 占位：状态栏 + 预留间距(24)，把大标题推到状态栏下方。
          if (widget.largeTitleController != null)
            SliverToBoxAdapter(child: SizedBox(height: topPad + 24)),
          // iOS26 大标题（第一个 sliver）。
          if (widget.largeTitleController != null)
            GlassLargeTitle(
              text: widget.largeTitleText.tr(),
              controller: widget.largeTitleController!,
              trailing: widget.largeTitleTrailing,
              padding: const EdgeInsetsDirectional.fromSTEB(24, 0, 24, 8),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _buildToggle(),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          // 文件夹/标签列表（sliver，参与主滚动）。
          if (_showTags) _buildTagSliver() else _buildFolderSliver(),
          // 底部留白，避免被浮动 tab bar 遮挡。
          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GlassScaffold(
      extendBody: true,
      statusBarStyle: GlassStatusBarStyle.auto,
      background: const GlassBackground(),
      appBar: GlassAppBar(
        leading: MiraIconButton(
          icon: Icon(
            Icons.arrow_back_ios_new,
            color: isDark ? Colors.white : Colors.black87,
          ),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text('folders.title'.tr()),
      ),
      body: Material(
        type: MaterialType.transparency,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _buildToggle(),
            ),
            const SizedBox(height: 8),
            Expanded(child: _showTags ? _buildTagList() : _buildFolderList()),
          ],
        ),
      ),
    );
  }

  // ───────────────────── 文件夹/标签切换 ─────────────────────
  Widget _buildToggle() {
    return GlassTabBar.inline(
      tabs: [
        GlassTab(label: 'folders.title'.tr()),
        GlassTab(label: 'tags.title'.tr()),
      ],
      selectedIndex: _showTags ? 1 : 0,
      onTabSelected: (i) {
        // 幂等：仅当前展示与目标不同时才切换。
        if ((i == 1) != _showTags) _toggleShowTags();
      },
    );
  }

  // ───────────────────── 文件夹列表 ─────────────────────
  Widget _buildFolderList() {
    final foldersAsync = ref.watch(foldersProvider);
    final selectedIds = ref.watch(
      fileFilterProvider.select((s) => s.selectedFolderIds),
    );
    return foldersAsync.when(
      loading: () => Center(child: MiraCircularProgressIndicator()),
      error: (e, _) => TreeStatus(
        icon: Icons.error_outline,
        message: 'folders.loadFailed'.tr(namedArgs: {'error': '$e'}),
        actionLabel: 'common.retry'.tr(),
        onAction: () => ref.invalidate(foldersProvider),
      ),
      data: (folders) {
        if (folders.isEmpty) {
          return TreeStatus(
            icon: Icons.folder_off_outlined,
            message: 'folders.empty'.tr(),
          );
        }
        return FolderTagTree(
          nodes: buildFolderTree(folders),
          selectedIds: selectedIds,
          selectionMode: widget.selectionMode,
          onNodeSelected: (node) =>
              ref.read(fileFilterProvider.notifier).toggleFolder(node.id),
          onNodeLongPress: (node, pos) =>
              _onFolderLongPress(context, node, folders, pos),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        );
      },
    );
  }

  // ───────────────────── 标签列表 ─────────────────────
  Widget _buildTagList() {
    final tagsAsync = ref.watch(tagsProvider);
    // fileFilter 用 title 关联标签，树用 id 选中，这里做 title→id 映射。
    final selectedTags = ref.watch(
      fileFilterProvider.select((s) => s.selectedTags),
    );
    return tagsAsync.when(
      loading: () => Center(child: MiraCircularProgressIndicator()),
      error: (e, _) => TreeStatus(
        icon: Icons.error_outline,
        message: 'tags.loadFailed'.tr(namedArgs: {'error': '$e'}),
        actionLabel: 'common.retry'.tr(),
        onAction: () => ref.invalidate(tagsProvider),
      ),
      data: (tags) {
        if (tags.isEmpty) {
          return TreeStatus(
            icon: Icons.label_off_outlined,
            message: 'tags.empty'.tr(),
          );
        }
        // title → id，得到当前选中的 id 集合。
        final titleToId = {for (final t in tags) t.title: t.id};
        final selectedIds = selectedTags
            .map((title) => titleToId[title])
            .whereType<int>()
            .toSet();
        return FolderTagTree(
          nodes: buildTagTree(tags),
          selectedIds: selectedIds,
          selectionMode: widget.selectionMode,
          showTagIcon: true,
          onNodeSelected: (node) =>
              ref.read(fileFilterProvider.notifier).toggleTag(node.title),
          onNodeLongPress: (node, pos) =>
              _onTagLongPress(context, node, tags, pos),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        );
      },
    );
  }

  // ───────────────────── sliver 列表（嵌入 CustomScrollView 时用） ──────────
  Widget _buildFolderSliver() {
    final foldersAsync = ref.watch(foldersProvider);
    final selectedIds = ref.watch(
      fileFilterProvider.select((s) => s.selectedFolderIds),
    );
    return foldersAsync.when(
      loading: () => SliverFillRemaining(
        hasScrollBody: false,
        child: Center(child: MiraCircularProgressIndicator()),
      ),
      error: (e, _) => SliverToBoxAdapter(
        child: TreeStatus(
          icon: Icons.error_outline,
          message: 'folders.loadFailed'.tr(namedArgs: {'error': '$e'}),
          actionLabel: 'common.retry'.tr(),
          onAction: () => ref.invalidate(foldersProvider),
        ),
      ),
      data: (folders) {
        if (folders.isEmpty) {
          return SliverToBoxAdapter(
            child: TreeStatus(
              icon: Icons.folder_off_outlined,
              message: 'folders.empty'.tr(),
            ),
          );
        }
        final filtered = _filterTreeByQuery(
          buildFolderTree(folders),
          widget.searchQuery,
        );
        if (filtered.roots.isEmpty) {
          return SliverToBoxAdapter(
            child: TreeStatus(
              icon: Icons.search_off,
              message: 'folders.noMatch'.tr(),
            ),
          );
        }
        return FolderTagTree(
          nodes: filtered.roots,
          selectedIds: selectedIds,
          selectionMode: widget.selectionMode,
          sliver: true,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          forceExpandIds: filtered.forceExpandIds,
          onNodeSelected: (node) =>
              ref.read(fileFilterProvider.notifier).toggleFolder(node.id),
          onNodeLongPress: (node, pos) =>
              _onFolderLongPress(context, node, folders, pos),
        );
      },
    );
  }

  Widget _buildTagSliver() {
    final tagsAsync = ref.watch(tagsProvider);
    final selectedTags = ref.watch(
      fileFilterProvider.select((s) => s.selectedTags),
    );
    return tagsAsync.when(
      loading: () => SliverFillRemaining(
        hasScrollBody: false,
        child: Center(child: MiraCircularProgressIndicator()),
      ),
      error: (e, _) => SliverToBoxAdapter(
        child: TreeStatus(
          icon: Icons.error_outline,
          message: 'tags.loadFailed'.tr(namedArgs: {'error': '$e'}),
          actionLabel: 'common.retry'.tr(),
          onAction: () => ref.invalidate(tagsProvider),
        ),
      ),
      data: (tags) {
        if (tags.isEmpty) {
          return SliverToBoxAdapter(
            child: TreeStatus(
              icon: Icons.label_off_outlined,
              message: 'tags.empty'.tr(),
            ),
          );
        }
        final filtered = _filterTreeByQuery(
          buildTagTree(tags),
          widget.searchQuery,
        );
        if (filtered.roots.isEmpty) {
          return SliverToBoxAdapter(
            child: TreeStatus(
              icon: Icons.search_off,
              message: 'tags.noMatch'.tr(),
            ),
          );
        }
        final titleToId = {for (final t in tags) t.title: t.id};
        final selectedIds = selectedTags
            .map((title) => titleToId[title])
            .whereType<int>()
            .toSet();
        return FolderTagTree(
          nodes: filtered.roots,
          selectedIds: selectedIds,
          selectionMode: widget.selectionMode,
          showTagIcon: true,
          sliver: true,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          forceExpandIds: filtered.forceExpandIds,
          onNodeSelected: (node) =>
              ref.read(fileFilterProvider.notifier).toggleTag(node.title),
          onNodeLongPress: (node, pos) =>
              _onTagLongPress(context, node, tags, pos),
        );
      },
    );
  }

  // ───────────────────── 长按：编辑 / 删除 ─────────────────────

  Future<void> _onFolderLongPress(
    BuildContext context,
    TreeNode node,
    List<Folder> folders,
    Offset position,
  ) async {
    final action = await _showNodeMenu(context, position);
    if (action == null) return;
    switch (action) {
      case _NodeMenuAction.edit:
        final target = folders.firstWhere(
          (f) => f.id == node.id,
          orElse: () =>
              Folder(id: node.id, title: node.title, parentId: node.parentId),
        );
        if (!mounted || !context.mounted) return;
        await showFolderTagEditDialog(
          context,
          kind: FolderTagKind.folder,
          action: 'entity.editAction'.tr(),
          editing: editingFromFolder(target),
        );
      case _NodeMenuAction.delete:
        if (!mounted || !context.mounted) return;
        await deleteFolderOrTag(
          context,
          ref: ref,
          kind: FolderTagKind.folder,
          id: node.id,
          title: node.title,
        );
    }
  }

  Future<void> _onTagLongPress(
    BuildContext context,
    TreeNode node,
    List<Tag> tags,
    Offset position,
  ) async {
    final action = await _showNodeMenu(context, position);
    if (action == null) return;
    switch (action) {
      case _NodeMenuAction.edit:
        final target = tags.firstWhere(
          (t) => t.id == node.id,
          orElse: () =>
              Tag(id: node.id, title: node.title, parentId: node.parentId),
        );
        if (!mounted || !context.mounted) return;
        await showFolderTagEditDialog(
          context,
          kind: FolderTagKind.tag,
          action: 'entity.editAction'.tr(),
          editing: editingFromTag(target),
        );
      case _NodeMenuAction.delete:
        if (!mounted || !context.mounted) return;
        await deleteFolderOrTag(
          context,
          ref: ref,
          kind: FolderTagKind.tag,
          id: node.id,
          title: node.title,
        );
    }
  }

  /// 在 [globalPosition] 处弹出液态玻璃「编辑/删除」菜单，返回选择的动作（或 null=取消）。
  ///
  /// 用一个 [OverlayEntry] 在精确触发点挂一个零尺寸 trigger 的 [GlassMenu]，
  /// 通过 [GlassMenuController] 打开；菜单本体由 GlassMenu 投射到 root overlay，
  /// 因此落点即触发点。选择某项（GlassMenu 自动收起）或点 barrier 关闭后移除 entry。
  Future<_NodeMenuAction?> _showNodeMenu(
    BuildContext context,
    Offset globalPosition,
  ) async {
    final completer = Completer<_NodeMenuAction?>();
    final controller = GlassMenuController();
    OverlayEntry? entry;
    var resolved = false;

    void resolve(_NodeMenuAction? action) {
      if (resolved) return;
      resolved = true;
      completer.complete(action);
    }

    entry = OverlayEntry(
      builder: (_) => Positioned(
        left: globalPosition.dx,
        top: globalPosition.dy,
        child: GlassMenu(
          controller: controller,
          morphFromZero: true,
          autoAdjustToScreen: true,
          settings: miraPopoverSettings(context),
          // 菜单收起（选中某项 → GlassMenu 自动关闭；或点 barrier）时触发。
          onClose: () {
            resolve(null);
            // 让收起动画跑完再移除 entry，避免在通知期间 dispose。
            Future.delayed(const Duration(milliseconds: 500), () {
              if (entry?.mounted == true) entry!.remove();
            });
          },
          triggerBuilder: (_, _) => const SizedBox.shrink(),
          items: [
            GlassMenuItem(
              title: 'common.edit'.tr(),
              icon: const Icon(Icons.edit_outlined),
              onTap: () => resolve(_NodeMenuAction.edit),
            ),
            GlassMenuItem(
              title: 'common.delete'.tr(),
              icon: const Icon(Icons.delete_outline),
              isDestructive: true,
              onTap: () => resolve(_NodeMenuAction.delete),
            ),
          ],
        ),
      ),
    );

    Overlay.of(context).insert(entry);
    // 等下一帧 trigger 落位后再 open，菜单从该点 morph 展开。
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (entry?.mounted == true) controller.open();
    });

    return completer.future;
  }
}

enum _NodeMenuAction { edit, delete }

/// 按节点名过滤树：保留自身或后代命中关键词的节点，并返回需强制展开的 id 集合
/// （被保留的祖先分支链路自动展开，使匹配节点立即可见）。
///
/// query 为空时返回原始树、forceExpand 为空集（不过滤）。
_TreeFilterResult _filterTreeByQuery(List<TreeNode> roots, String query) {
  final q = query.trim();
  if (q.isEmpty) {
    return _TreeFilterResult(roots: roots, forceExpandIds: const {});
  }
  final needle = q.toLowerCase();
  final forceExpandIds = <int>{};

  /// 递归：返回过滤后的子节点列表。
  List<TreeNode> build(List<TreeNode> nodes) {
    final out = <TreeNode>[];
    for (final n in nodes) {
      final filteredChildren = build(n.children);
      final selfMatch = n.title.toLowerCase().contains(needle);
      if (selfMatch || filteredChildren.isNotEmpty) {
        // 当前节点被保留：其下有匹配后代时强制展开，露出匹配链路。
        if (filteredChildren.isNotEmpty) forceExpandIds.add(n.id);
        out.add(
          TreeNode(
            id: n.id,
            title: n.title,
            parentId: n.parentId,
            level: n.level,
            count: n.count,
          )..children = filteredChildren,
        );
      }
    }
    return out;
  }

  return _TreeFilterResult(roots: build(roots), forceExpandIds: forceExpandIds);
}

/// 树过滤结果。
class _TreeFilterResult {
  const _TreeFilterResult({required this.roots, required this.forceExpandIds});
  final List<TreeNode> roots;
  final Set<int> forceExpandIds;
}
