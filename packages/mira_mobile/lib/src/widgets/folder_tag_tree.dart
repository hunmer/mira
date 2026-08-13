import 'package:animate_do/animate_do.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import '../../mira_sdk/mira_sdk.dart';
import 'glass/mira_ui.dart';

/// 可展开树节点（文件夹/标签通用）。
///
/// 由 [buildFolderTree] / [buildTagTree] 客户端组装，叶子与分支共用此模型。
class TreeNode {
  final int id;
  final String title;
  final int? parentId;
  final int level;
  final int? count;
  List<TreeNode> children = const [];

  TreeNode({
    required this.id,
    required this.title,
    this.parentId,
    required this.level,
    this.count,
  });

  bool get hasChildren => children.isNotEmpty;
}

/// 选择模式。
enum SelectionMode {
  /// 不显示选择控件，点击行仅展开/收起。
  none,

  /// 单选：点击行选中该节点（再次点击同一节点不会取消）。
  single,

  /// 多选：左侧 Checkbox 切换选中。
  multi,
}

// ───────────────────── 树构建（客户端，按 parentId 组装） ─────────────────────

/// 由扁平 [Folder] 列表组装成树（root: parentId == null）。
List<TreeNode> buildFolderTree(List<Folder> folders) {
  final byParent = <int?, List<Folder>>{};
  for (final f in folders) {
    byParent.putIfAbsent(f.parentId, () => []).add(f);
  }
  List<TreeNode> build(int? parentId, int level) {
    final children = byParent[parentId] ?? const [];
    return children.map((f) {
      final node = TreeNode(
        id: f.id,
        title: f.title,
        parentId: f.parentId,
        level: level,
        count: f.fileCount,
      );
      node.children = build(f.id, level + 1);
      return node;
    }).toList();
  }

  return build(null, 0);
}

/// 由扁平 [Tag] 列表组装成树（root: parentId == null）。
List<TreeNode> buildTagTree(List<Tag> tags) {
  final byParent = <int?, List<Tag>>{};
  for (final t in tags) {
    byParent.putIfAbsent(t.parentId, () => []).add(t);
  }
  List<TreeNode> build(int? parentId, int level) {
    final children = byParent[parentId] ?? const [];
    return children.map((t) {
      final node = TreeNode(
        id: t.id,
        title: t.title,
        parentId: t.parentId,
        level: level,
        count: t.fileCount,
      );
      node.children = build(t.id, level + 1);
      return node;
    }).toList();
  }

  return build(null, 0);
}

/// 按展开集合深度优先扁平化树，返回当前可见的有序节点列表。
List<TreeNode> flattenTree(List<TreeNode> roots, Set<int> expanded) {
  final out = <TreeNode>[];
  void walk(List<TreeNode> nodes) {
    for (final n in nodes) {
      out.add(n);
      if (expanded.contains(n.id) && n.children.isNotEmpty) {
        walk(n.children);
      }
    }
  }

  walk(roots);
  return out;
}

// ───────────────────── 树组件 ─────────────────────

/// 文件夹/标签树组件。
///
/// 选择状态由父级控制（传入 [selectedIds]），展开状态内部管理。
/// 选择交互（单选替换 / 多选切换）由父级在 [onNodeSelected] 中实现，
/// 组件仅负责展示与触发回调。
///
/// [sliver] 为 true 时返回 Sliver 系列组件（用于嵌入 [CustomScrollView]），
/// 否则返回可滚动的 [ListView]。
class FolderTagTree extends StatefulWidget {
  const FolderTagTree({
    super.key,
    required this.nodes,
    this.selectedIds = const {},
    this.selectionMode = SelectionMode.none,
    this.onNodeSelected,
    this.onNodeLongPress,
    this.showTagIcon = false,
    this.sliver = false,
    this.padding,
    this.emptyPlaceholder,
    this.bottomPadding = 120,
    this.forceExpandIds,
  });

  /// 已构建的根节点列表。
  final List<TreeNode> nodes;

  /// 当前选中的节点 id 集合（受控）。
  final Set<int> selectedIds;

  /// 选择模式，决定左侧控件与点击行为。
  final SelectionMode selectionMode;

  /// 用户选中节点时回调，携带完整 [TreeNode]（可用其 id / title）。
  final ValueChanged<TreeNode>? onNodeSelected;

  /// 用户长按/右键节点时回调，携带完整 [TreeNode] 与触发的全局坐标。
  /// 典型用途：在坐标处弹出菜单（按精确点位定位）。
  /// 为 null 时该节点不启用长按。
  final void Function(TreeNode node, Offset globalPosition)? onNodeLongPress;

  /// true 显示标签图标，false 显示文件夹图标。
  final bool showTagIcon;

  /// 是否以 Sliver 形式渲染（嵌入 CustomScrollView 时设为 true）。
  final bool sliver;

  /// 列表内边距（sliver 模式下为 sliver 的 padding）。
  final EdgeInsets? padding;

  /// nodes 为空时显示的占位组件。
  final Widget? emptyPlaceholder;

  /// 列表底部留白，避免被浮动元素遮挡。
  final double bottomPadding;

  /// 强制展开的节点 id 集合（与内部 _expanded 取并集）。
  ///
  /// 用于搜索场景：把匹配节点的祖先链路自动展开显示。
  /// 为 null 时仅按用户手动展开渲染。
  final Set<int>? forceExpandIds;

  @override
  State<FolderTagTree> createState() => _FolderTagTreeState();
}

class _FolderTagTreeState extends State<FolderTagTree> {
  final Set<int> _expanded = {};

  void _toggleExpand(int id) {
    setState(() {
      if (!_expanded.add(id)) _expanded.remove(id);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.nodes.isEmpty) {
      final empty =
          widget.emptyPlaceholder ??
          TreeStatus(icon: Icons.inbox_outlined, message: 'common.noData'.tr());
      if (widget.sliver) {
        return SliverToBoxAdapter(child: empty);
      }
      return empty;
    }

    // forceExpandIds（搜索时祖先链路强制展开）与用户手动展开取并集。
    final effectiveExpanded = widget.forceExpandIds == null
        ? _expanded
        : {..._expanded, ...widget.forceExpandIds!};
    final flat = flattenTree(widget.nodes, effectiveExpanded);

    Widget itemBuilder(BuildContext context, int i) {
      final node = flat[i];
      final tile = FolderTagTile(
        node: node,
        selected: widget.selectedIds.contains(node.id),
        selectionMode: widget.selectionMode,
        showTagIcon: widget.showTagIcon,
        expanded: _expanded.contains(node.id),
        onExpand: () => _toggleExpand(node.id),
        onSelect: widget.onNodeSelected != null
            ? () => widget.onNodeSelected!(node)
            : null,
        onLongPress: widget.onNodeLongPress != null
            ? (position) => widget.onNodeLongPress!(node, position)
            : null,
      );
      // 仅给非根级子节点加入场动画：展开子树时这些节点是新出现的 widget，
      // animate_do 在其首次构建时自动播放，呈现「从父节点下方淡入滑下」的
      // 展开效果。根级节点（level==0）始终在列表中，不播放以避免整树初次
      // 加载时一起闪烁；同时用 key 锚定，避免 ListView 复用导致误播。
      if (node.level > 0) {
        return FadeInLeft(
          key: ValueKey('anim_${node.id}'),
          duration: const Duration(milliseconds: 180),
          child: tile,
        );
      }
      return tile;
    }

    if (widget.sliver) {
      return SliverPadding(
        padding: widget.padding ?? EdgeInsets.zero,
        sliver: SliverList.builder(
          itemCount: flat.length,
          itemBuilder: itemBuilder,
        ),
      );
    }

    return ListView.builder(
      padding: (widget.padding ?? EdgeInsets.zero).copyWith(
        bottom: widget.bottomPadding,
      ),
      itemCount: flat.length,
      itemBuilder: itemBuilder,
    );
  }
}

// ───────────────────── 行组件 ─────────────────────

/// 树的行组件（文件夹/标签通用）。
class FolderTagTile extends StatelessWidget {
  const FolderTagTile({
    super.key,
    required this.node,
    required this.selected,
    this.selectionMode = SelectionMode.none,
    this.showTagIcon = false,
    required this.expanded,
    required this.onExpand,
    this.onSelect,
    this.onLongPress,
  });

  final TreeNode node;

  /// 当前是否选中（决定 Checkbox/Radio 的状态）。
  final bool selected;
  final SelectionMode selectionMode;
  final bool showTagIcon;

  final bool expanded;

  /// 点击展开箭头（及多选模式下的行体）时回调。
  final VoidCallback onExpand;

  /// 选中回调（单选模式点击行 / 选择控件点击时触发）。
  final VoidCallback? onSelect;

  /// 长按/右键行回调，携带触发点的全局坐标（供上层把菜单定位到精确触发点）。
  /// 为 null 时禁用长按。
  final ValueChanged<Offset>? onLongPress;

  static const double _indentation = 22.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    // 单选模式：整行点击即选中；多选/无：仅可展开时点击行触发展开。
    final VoidCallback? rowTap;
    switch (selectionMode) {
      case SelectionMode.single:
        rowTap = onSelect;
        break;
      case SelectionMode.multi:
      case SelectionMode.none:
        rowTap = node.hasChildren ? onExpand : null;
        break;
    }

    return Padding(
      padding: EdgeInsets.only(left: _indentation * node.level, bottom: 6),
      child: GestureDetector(
        // 长按(移动端)/右键(桌面端)在本层捕获触发点坐标后回调；普通 onTap
        // 仍交给 MiraListTile 的 InkWell 处理。
        behavior: HitTestBehavior.opaque,
        onLongPressStart: onLongPress == null
            ? null
            : (d) => onLongPress!(d.globalPosition),
        onSecondaryTapUp: onLongPress == null
            ? null
            : (d) => onLongPress!(d.globalPosition),
        child: MiraListTile(
          // 整行内容放进 title（GlassListTile 的 leading 槽固定 32px 宽，放不下
          // 展开箭头+选择控件+图标，会溢出）。title 在 Expanded 列里，可自由排列。
          title: Row(
            children: [
              // 展开箭头：用纯图标（不套玻璃按钮，避免外边框）
              if (node.hasChildren)
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onExpand,
                  child: SizedBox(
                    width: 28,
                    child: Align(
                      child: Icon(
                        expanded
                            ? Icons.keyboard_arrow_down
                            : Icons.chevron_right,
                        color: Colors.grey[600],
                        size: 22,
                      ),
                    ),
                  ),
                )
              else
                const SizedBox(width: 28),
              // 选择控件
              _buildSelector(),
              // 文件夹/标签图标
              Icon(
                showTagIcon ? Icons.label_outline : Icons.folder_outlined,
                color: primaryColor,
                size: 22,
              ),
              const SizedBox(width: 10),
              // 标题
              Expanded(
                child: Text(
                  node.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          // 行尾：计数 pill
          trailing: node.count == null
              ? null
              : Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${node.count}',
                    style: TextStyle(
                      fontSize: 11,
                      color: primaryColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
          onTap: rowTap,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 6,
          ),
        ),
      ),
    );
  }

  /// 根据选择模式渲染左侧选择控件。
  Widget _buildSelector() {
    switch (selectionMode) {
      case SelectionMode.multi:
        return MiraCheckboxIndicator(
          value: selected,
          onChanged: onSelect == null ? null : (_) => onSelect!.call(),
        );
      case SelectionMode.single:
        // 单选：选中显示实心圆，未选中显示空心圆；点击由行 InkWell 统一处理。
        return SizedBox(
          width: 28,
          child: Icon(
            selected ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 22,
            color: selected ? null : Colors.grey,
          ),
        );
      case SelectionMode.none:
        return const SizedBox.shrink();
    }
  }
}

// ───────────────────── 状态占位 ─────────────────────

/// 通用空/错误状态占位（图标 + 文案 + 可选操作按钮）。
class TreeStatus extends StatelessWidget {
  const TreeStatus({
    super.key,
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
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            MiraButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
