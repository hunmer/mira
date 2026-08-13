part of 'library_item_list_screen.dart';

/// 吸顶 header 的 PersistentHeaderDelegate。
class _FilterHeaderDelegate extends SliverPersistentHeaderDelegate {
  _FilterHeaderDelegate({required this.child});

  final Widget child;

  static const double _height = 60;

  @override
  double get minExtent => _height;
  @override
  double get maxExtent => _height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final content = SizedBox.expand(
      child: Align(alignment: Alignment.centerLeft, child: child),
    );
    if (!overlapsContent) {
      return SizedBox(height: _height, child: content);
    }

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: ColoredBox(
          color: Theme.of(
            context,
          ).scaffoldBackgroundColor.withValues(alpha: 0.55),
          child: SizedBox(height: _height, child: content),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(_FilterHeaderDelegate oldDelegate) =>
      child != oldDelegate.child;
}

/// 右下角浮动的「清空过滤器」按钮：玻璃风格圆形图标按钮。
class _ClearFilterFab extends StatelessWidget {
  const _ClearFilterFab({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Tooltip(
      message: 'filter.clear'.tr(),
      child: MiraIconButton(
        icon: Icon(Icons.filter_alt_off_outlined, color: primary),
        onPressed: onTap,
        size: 52,
        iconSize: 24,
        glowColor: primary.withValues(alpha: 0.5),
      ),
    );
  }
}

/// 过滤器单个切换按钮：复用 GlassButton，选中态 filled + 高亮，未选中 transparent。
///
/// [badge] > 0 时在图标右上角叠一个数字角标（对标桌面端 FilterBar 的 active count）。
class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  /// 激活过滤数量；>0 时显示角标。
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final showBadge = badge != null && badge! > 0;
    return GlassButton.custom(
      onTap: onTap,
      shape: const LiquidRoundedSuperellipse(borderRadius: 22),
      height: 44,
      width: null,
      style: selected ? GlassButtonStyle.filled : GlassButtonStyle.transparent,
      glowColor: primary.withValues(alpha: 0.5),
      glowOpacity: selected ? 0.9 : 0.0,
      stretch: 0.15,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 图标 + 可选角标
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? primary : theme.hintColor,
                ),
                if (showBadge)
                  Positioned(
                    top: -6,
                    right: -8,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 16),
                      height: 16,
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: primary,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          width: 1.5,
                        ),
                      ),
                      child: Text(
                        '${badge! > 99 ? '99+' : badge}',
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
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? primary : theme.hintColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
