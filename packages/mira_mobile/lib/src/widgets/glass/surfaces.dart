import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import 'feedback.dart';

// ───────────────────── 顶层 glass 容器 re-export ─────────────────────
// 这些是 main_shell / library_item_list / tree_view / settings_tab 已在用的
// 结构型 glass 组件，re-export 让调用方只 import 一个 barrel。

export 'package:liquid_glass_widgets/liquid_glass_widgets.dart' show
    GlassScaffold,
    GlassAppBar,
    GlassIconButton,
    GlassTabBar,
    GlassTabBarExtraButton,
    GlassTab,
    GlassLargeTitle,
    GlassLargeTitleController,
    GlassStatusBarStyle,
    GlassGroupedSection,
    LiquidGlassSettings,
    GlassButton,
    GlassButtonStyle,
    LiquidRoundedSuperellipse,
    LiquidShape,
    GlassSearchBarConfig;

/// 玻璃风格卡片，封装 [GlassCard]，替代 Material [Card]。
///
/// 可选 [onTap]：传入时整张卡变成可点击的玻璃容器（内部用透明 [Material] +
/// [InkWell] 承载 ripple，因为 GlassCard 不接受点击）。
/// 不传 [onTap] 时是纯展示容器。
class MiraCard extends StatelessWidget {
  const MiraCard({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.padding,
    this.margin,
    this.isLoading = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  /// 加载态：true 时降低内容透明度并叠加居中圆形指示器，
  /// 同时吞掉点击避免重复触发。用于卡片级的异步操作（如连接服务器）。
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    Widget card = GlassCard(
      padding: padding ?? const EdgeInsets.all(16),
      margin: margin,
      child: child,
    );
    if (onTap != null || onLongPress != null) {
      // 可点击：套透明 Material + InkWell 提供 ripple（GlassCard 自身不可点击）。
      card = Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(12),
          child: card,
        ),
      );
    }
    if (!isLoading) return card;
    // 加载态：内容降透明度，叠加居中指示器并吞掉点击。
    return Stack(
      children: [
        Opacity(opacity: 0.4, child: IgnorePointer(child: card)),
        const Positioned.fill(
          child: AbsorbPointer(
            child: Center(child: MiraCircularProgressIndicator()),
          ),
        ),
      ],
    );
  }
}

/// 玻璃风格分割线，封装 [GlassDivider]，替代 Material [Divider]。
class MiraDivider extends StatelessWidget {
  const MiraDivider({
    super.key,
    this.indent = 0.0,
    this.endIndent = 0.0,
    this.thickness = 0.5,
    this.color,
    this.height,
    this.axis = Axis.horizontal,
  });

  final double indent;
  final double endIndent;
  final double thickness;
  final Color? color;
  final double? height;
  final Axis axis;

  @override
  Widget build(BuildContext context) {
    return GlassDivider(
      indent: indent,
      endIndent: endIndent,
      thickness: thickness,
      color: color,
      height: height,
      axis: axis,
    );
  }
}
