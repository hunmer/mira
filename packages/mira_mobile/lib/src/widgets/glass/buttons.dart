import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import 'feedback.dart';

/// 玻璃风格按钮，封装 [GlassButton.custom]，对外沿用 Material 按钮习惯。
///
/// - [MiraButton]：通用按钮（文本 / 自定义 child）。
/// - [MiraButton.icon]：图标 + 文字便捷构造。
/// - [MiraButton.loading]：内置 loading 态（spinner 替换 child 并禁用点击）。
///
/// [isPrimary] = 主操作（蓝色 prominent 样式，≈ FilledButton）；
/// [isDestructive] = 危险操作（红色 glow，≈ 删除按钮）。
/// [onPressed] 为 null 时按钮禁用。
class MiraButton extends StatelessWidget {
  const MiraButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.isPrimary = false,
    this.isDestructive = false,
    this.expanded = false,
    this.height,
    this.padding,
  })  : icon = null,
        label = null,
        loading = false;

  /// 图标 + 文字按钮。
  const MiraButton.icon({
    super.key,
    required this.onPressed,
    required this.icon,
    required this.label,
    this.isPrimary = false,
    this.isDestructive = false,
    this.expanded = false,
    this.height,
    this.padding,
  })  : child = null,
        loading = false;

  /// 带 loading 态的按钮。
  ///
  /// [loading] = true 时 child 被替换为小号 [MiraCircularProgressIndicator]，
  /// 且 [onPressed] 被忽略（禁用）。
  const MiraButton.loading({
    super.key,
    required this.onPressed,
    required this.child,
    required this.loading,
    this.isPrimary = false,
    this.isDestructive = false,
    this.expanded = false,
    this.height,
    this.padding,
  })  : icon = null,
        label = null;

  final VoidCallback? onPressed;
  final Widget? child;
  final Widget? icon;
  final String? label;
  final bool isPrimary;
  final bool isDestructive;

  /// 是否撑满可用宽度（横向 CTA 场景）。
  final bool expanded;
  final double? height;

  /// 内容内边距。
  ///
  /// 默认左右各 16，避免文本贴边；纯图标/自定义无文本场景可传
  /// `EdgeInsets.zero` 关闭。
  final EdgeInsetsGeometry? padding;

  /// loading 态（仅 [MiraButton.loading] 构造可用）。
  final bool loading;

  GlassButtonStyle get _style => isPrimary
      ? GlassButtonStyle.prominent
      : (isDestructive ? GlassButtonStyle.filled : GlassButtonStyle.filled);

  Color? get _glow => isDestructive
      ? const Color(0x4DFF0000)
      : (isPrimary ? const Color(0x4D0000FF) : null);

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final effectiveOnTap = disabled || loading ? () {} : onPressed!;
    final effectivePadding =
        padding ?? const EdgeInsets.symmetric(horizontal: 16);
    final buttonChild = loading
        ? const MiraCircularProgressIndicator(size: 18, strokeWidth: 2.5)
        : (icon != null || label != null)
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[icon!, const SizedBox(width: 6)],
                  if (label != null)
                    Text(
                      label!,
                      style: TextStyle(
                        fontWeight: isPrimary ? FontWeight.bold : FontWeight.w600,
                        color: isDestructive ? Colors.red : null,
                      ),
                    ),
                ],
              )
            : child!;

    final btn = GlassButton.custom(
      onTap: effectiveOnTap,
      enabled: !(disabled || loading),
      height: height ?? 48,
      width: expanded ? double.infinity : null,
      shape: const LiquidRoundedSuperellipse(borderRadius: 12),
      style: _style,
      glowColor: _glow,
      alignment: expanded ? Alignment.center : Alignment.center,
      child: DefaultTextStyle.merge(
        style: TextStyle(
          fontWeight: isPrimary ? FontWeight.bold : FontWeight.w600,
          color: isDestructive ? Colors.red : null,
        ),
        child: Padding(
          padding: effectivePadding,
          child: buttonChild,
        ),
      ),
    );
    return expanded
        ? SizedBox(width: double.infinity, child: btn)
        : btn;
  }
}

/// 玻璃风格图标按钮，封装 [GlassIconButton]，替代 Material [IconButton]。
///
/// [onPressed] 为 null 时禁用。[tooltip] 仅用于无障碍语义（包内无长按 tooltip）。
class MiraIconButton extends StatelessWidget {
  const MiraIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.size = 44,
    this.iconSize,
    this.glowColor,
  });

  final Widget icon;
  final VoidCallback? onPressed;

  /// 无障碍标签（替代 Material IconButton.tooltip 的语义部分）。
  final String? tooltip;
  final double size;
  final double? iconSize;
  final Color? glowColor;

  @override
  Widget build(BuildContext context) {
    final btn = GlassIconButton(
      icon: icon,
      onPressed: onPressed,
      size: size,
      iconSize: iconSize,
      glowColor: glowColor,
    );
    if (tooltip != null) {
      return Semantics(
        label: tooltip,
        button: true,
        child: btn,
      );
    }
    return btn;
  }
}
