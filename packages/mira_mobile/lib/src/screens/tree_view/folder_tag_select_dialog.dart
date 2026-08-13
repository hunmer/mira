import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/folder_provider.dart';
import '../../providers/tag_provider.dart';
import '../../widgets/folder_tag_tree.dart';
import '../../widgets/glass/mira_ui.dart';

/// 选择结果。单选时 [ids] 含一个元素；多选时含零到多个。
/// [titles] 与 [ids] 一一对应，方便调用方按 title 关联标签。
class FolderTagSelectResult {
  const FolderTagSelectResult({this.ids = const [], this.titles = const []});

  final List<int> ids;
  final List<String> titles;

  bool get isEmpty => ids.isEmpty;
  int? get singleId => ids.length == 1 ? ids.first : null;
  String? get singleTitle => titles.length == 1 ? titles.first : null;
}

/// 数据源类型。
enum _DataSource { folders, tags }

/// 文件夹/标签选择对话框。
///
/// 支持单选 ([multiSelect]=false) 与多选 ([multiSelect]=true)，
/// 内置文件夹/标签切换。点击确认后通过 [onConfirm] 回调返回选择结果，
/// 也可使用返回值 `Future<FolderTagSelectResult?>`。
///
/// 用法：
/// ```dart
/// final result = await showFolderTagSelectDialog(
///   context,
///   multiSelect: true,
///   initialShowTags: false,
///   onConfirm: (r) => print(r.titles),
/// );
/// ```
Future<FolderTagSelectResult?> showFolderTagSelectDialog(
  BuildContext context, {
  bool multiSelect = false,
  bool initialShowTags = false,
  Set<int> initialSelectedIds = const {},
  String title = 'tree.selectTitle',
  String confirmText = 'common.confirm',
  String cancelText = 'common.cancel',
  void Function(FolderTagSelectResult result)? onConfirm,
  /// 锁定数据源种类：null=显示「文件夹/标签」切换条；true=锁定标签；false=锁定文件夹。
  /// 锁定时隐藏切换条，仅展示对应树（用于「新建文件夹只能选文件夹做父节点」这类约束）。
  bool? lockIsTag,
}) {
  return showDialog<FolderTagSelectResult>(
    context: context,
    builder: (ctx) => _FolderTagSelectDialog(
      multiSelect: multiSelect,
      initialShowTags: initialShowTags,
      initialSelectedIds: initialSelectedIds,
      title: title,
      confirmText: confirmText,
      cancelText: cancelText,
      onConfirm: onConfirm,
      lockIsTag: lockIsTag,
    ),
  );
}

class _FolderTagSelectDialog extends ConsumerStatefulWidget {
  const _FolderTagSelectDialog({
    required this.multiSelect,
    required this.initialShowTags,
    required this.initialSelectedIds,
    required this.title,
    required this.confirmText,
    required this.cancelText,
    this.onConfirm,
    this.lockIsTag,
  });

  final bool multiSelect;
  final bool initialShowTags;
  final Set<int> initialSelectedIds;
  final String title;
  final String confirmText;
  final String cancelText;
  final void Function(FolderTagSelectResult result)? onConfirm;

  /// 见 [showFolderTagSelectDialog.lockIsTag]。
  final bool? lockIsTag;

  @override
  ConsumerState<_FolderTagSelectDialog> createState() =>
      _FolderTagSelectDialogState();
}

class _FolderTagSelectDialogState
    extends ConsumerState<_FolderTagSelectDialog> {
  /// 0 = 文件夹，1 = 标签。
  late int _tabIndex = widget.lockIsTag == true
      ? 1
      : (widget.initialShowTags ? 1 : 0);
  late final Set<int> _selected = {...widget.initialSelectedIds};

  _DataSource get _source =>
      _tabIndex == 0 ? _DataSource.folders : _DataSource.tags;

  @override
  Widget build(BuildContext context) {
    // 计数并入标题（仅多选）。
    final titleTr = widget.title.tr();
    final titleText = widget.multiSelect
        ? 'tree.selectCount'.tr(namedArgs: {'title': titleTr, 'count': '${_selected.length}'})
        : titleTr;

    return GlassDialog(
      settings: miraModalOverlaySettings(context),
      maxWidth: 360,
      title: titleText,
      content: Material(
        type: MaterialType.transparency,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 文件夹/标签切换（锁定种类时隐藏）
            if (widget.lockIsTag == null) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: GlassTabBar.inline(
                  tabs: [
                    GlassTab(label: 'folders.title'.tr()),
                    GlassTab(label: 'tags.title'.tr()),
                  ],
                  selectedIndex: _tabIndex,
                  onTabSelected: (i) => setState(() => _tabIndex = i),
                ),
              ),
              const SizedBox(height: 8),
            ],
            // 树：固定高度可滚动；IndexedStack 保活两个 Tab 的滚动/选中状态。
            SizedBox(
              height: 320,
              width: double.maxFinite,
              child: IndexedStack(
                index: _tabIndex,
                children: [
                  _buildFoldersTree(),
                  _buildTagsTree(),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        GlassDialogAction(
          label: widget.cancelText.tr(),
          onPressed: () => Navigator.of(context).pop(),
        ),
        GlassDialogAction(
          label: widget.confirmText.tr(),
          isPrimary: true,
          onPressed: _onConfirm,
        ),
      ],
    );
  }

  // ───────────────────── 树体 ─────────────────────
  Widget _buildFoldersTree() {
    final mode =
        widget.multiSelect ? SelectionMode.multi : SelectionMode.single;
    final foldersAsync = ref.watch(foldersProvider);
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
        final nodes = buildFolderTree(folders);
        return FolderTagTree(
          nodes: nodes,
          selectedIds: _selected,
          selectionMode: mode,
          showTagIcon: false,
          padding: const EdgeInsets.only(right: 16),
          onNodeSelected: _onNodeSelected,
        );
      },
    );
  }

  Widget _buildTagsTree() {
    final mode =
        widget.multiSelect ? SelectionMode.multi : SelectionMode.single;
    final tagsAsync = ref.watch(tagsProvider);
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
        final nodes = buildTagTree(tags);
        return FolderTagTree(
          nodes: nodes,
          selectedIds: _selected,
          selectionMode: mode,
          showTagIcon: true,
          padding: const EdgeInsets.only(right: 16),
          onNodeSelected: _onNodeSelected,
        );
      },
    );
  }

  // ───────────────────── 选中逻辑 ─────────────────────
  void _onNodeSelected(TreeNode node) {
    setState(() {
      if (widget.multiSelect) {
        if (!_selected.add(node.id)) _selected.remove(node.id);
      } else {
        // 单选：替换选中。
        _selected
          ..clear()
          ..add(node.id);
      }
    });
  }

  void _onConfirm() {
    // 收集 title：根据当前 source 从 provider 拿原始列表。
    List<String> titles = [];
    if (_source == _DataSource.folders) {
      final folders = ref.read(foldersProvider).valueOrNull ?? const [];
      final byId = {for (final f in folders) f.id: f.title};
      titles = _selected.map((id) => byId[id]).whereType<String>().toList();
    } else {
      final tags = ref.read(tagsProvider).valueOrNull ?? const [];
      final byId = {for (final t in tags) t.id: t.title};
      titles = _selected.map((id) => byId[id]).whereType<String>().toList();
    }

    final result = FolderTagSelectResult(
      ids: _selected.toList(),
      titles: titles,
    );
    widget.onConfirm?.call(result);
    Navigator.of(context).pop(result);
  }
}
