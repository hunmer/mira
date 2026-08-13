part of 'library_item_list_screen.dart';

/// 多选模式下卡片右上角的勾选指示器：选中实心带勾，未选中空心圆。
class _SelectionIndicator extends StatelessWidget {
  const _SelectionIndicator({required this.selected});
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? primary : Colors.black.withValues(alpha: 0.4),
        border: Border.all(color: Colors.white, width: 2),
      ),
      alignment: Alignment.center,
      child: selected
          ? const Icon(Icons.check, size: 16, color: Colors.white)
          : null,
    );
  }
}

/// 多选模式底部浮动操作条。
///
/// 展示已选数量 + 全选/取消全选 + 下载 + 删除 + 完成。
/// 用 MiraCard 玻璃容器承载，浮在画廊底部（避开浮动 TabBar）。
class _SelectionActionBar extends StatelessWidget {
  const _SelectionActionBar({
    required this.selectedCount,
    required this.total,
    required this.allSelected,
    required this.onSelectAll,
    required this.onDownload,
    required this.onDelete,
    required this.onClose,
    this.onRestore,
  });

  final int selectedCount;
  final int total;
  final bool allSelected;
  final VoidCallback onSelectAll;
  final VoidCallback onDownload;
  final VoidCallback onDelete;
  final VoidCallback onClose;

  /// 非空时表示当前处于回收站视图：用「恢复」按钮替代「下载」。
  final VoidCallback? onRestore;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: MiraCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            // 已选数量
            Expanded(
              child: Text(
                'select.selectedCount'.tr(
                  namedArgs: {'count': '$selectedCount'},
                ),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 8),
            // 全选/取消全选
            MiraIconButton(
              icon: Icon(
                allSelected
                    ? Icons.deselect_outlined
                    : Icons.select_all_outlined,
                size: 22,
              ),
              onPressed: onSelectAll,
            ),
            const SizedBox(width: 8),
            // 下载 / 恢复（回收站视图下用「恢复」替代「下载」）
            MiraIconButton(
              icon: Icon(
                onRestore != null
                    ? Icons.restore_outlined
                    : Icons.download_outlined,
                size: 22,
              ),
              onPressed: onRestore ?? onDownload,
            ),
            const SizedBox(width: 8),
            // 删除（红色）
            MiraIconButton(
              icon: Icon(
                Icons.delete_outline,
                size: 22,
                color: Theme.of(context).colorScheme.error,
              ),
              onPressed: onDelete,
            ),
            const SizedBox(width: 8),
            // 完成（打勾，退出多选）
            MiraIconButton(
              icon: Icon(
                Icons.check,
                size: 22,
                color: Theme.of(context).colorScheme.primary,
              ),
              onPressed: onClose,
            ),
          ],
        ),
      ),
    );
  }
}
